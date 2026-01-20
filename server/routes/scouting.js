/**
 * Scouting Routes
 *
 * Endpoints for generating AI-powered scouting reports.
 *
 * Pipeline: JSONL Events → Zone-State Engine → Pattern Detector → AI Writer → Report
 */

const express = require("express");
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const axios = require("axios");
const AdmZip = require("adm-zip");
const rateLimit = require("express-rate-limit");

const zoneEngine = require("../services/zone-state-engine");
const patternDetector = require("../services/pattern-detector");
const aiWriter = require("../services/ai-writer");

const router = express.Router();

// Where we store downloaded match files
const MATCH_DATA_DIR = path.resolve(__dirname, "../match_data");
const GRID_FILE_URL = "https://cdn-cf.grid.gg/file-download/events/grid/series";

// Rate limit: 5 reports per minute (AI calls are expensive)
const scoutingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: "Too many scouting requests, please wait a minute" },
});

router.use(scoutingLimiter);

// Initialize zone engine on module load
zoneEngine.initialize();

// ================== HELPERS ==================

// Ensure match_data directory exists
const ensureDataDir = () => {
  if (!fs.existsSync(MATCH_DATA_DIR)) {
    fs.mkdirSync(MATCH_DATA_DIR, { recursive: true });
  }
};

// Find cached JSONL file
const findCachedFile = (seriesId) => {
  const files = fs.readdirSync(MATCH_DATA_DIR);
  return files.find((f) => f.includes(seriesId) && f.endsWith(".jsonl"));
};

// Validate seriesId format
const isValidSeriesId = (seriesId) => {
  return /^\d{5,10}$/.test(seriesId);
};

// Download and extract match data
const downloadAndExtract = async (seriesId) => {
  const zipPath = path.join(MATCH_DATA_DIR, `${seriesId}.zip`);
  const url = `${GRID_FILE_URL}/${seriesId}`;

  console.log(`Scouting: Downloading match ${seriesId}...`);

  const response = await axios.get(url, {
    headers: { "x-api-key": process.env.API_KEY },
    responseType: "arraybuffer",
    timeout: 30000,
  });

  fs.writeFileSync(zipPath, response.data);
  console.log("Scouting: Download complete. Extracting...");

  const zip = new AdmZip(zipPath);
  zip.extractAllTo(MATCH_DATA_DIR, true);

  return findCachedFile(seriesId);
};

// ================== JSONL PROCESSING ==================

/**
 * Process JSONL file through zone-state engine
 * @param {string} filename - JSONL filename
 * @returns {Object} Processed data with rounds, players, mapName
 */
async function processMatchFile(filename) {
  const filePath = path.join(MATCH_DATA_DIR, filename);
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  const roundEvents = {}; // Group events by round
  const players = {};
  let mapName = "Unknown";
  let currentRound = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;

    let wrapper;
    try {
      wrapper = JSON.parse(line);
    } catch (e) {
      continue;
    }

    if (!wrapper.events) continue;

    for (const event of wrapper.events) {
      const type = event.type;

      // Get map name
      if (type === "series-started-game") {
        const name = event.target?.state?.map?.name;
        if (name) {
          mapName = name.charAt(0).toUpperCase() + name.slice(1);
        }
      }

      // Track round starts
      if (type === "game-started-round") {
        currentRound = event.target?.state?.sequenceNumber || currentRound + 1;
      }

      // Group events by round
      if (!roundEvents[currentRound]) {
        roundEvents[currentRound] = [];
      }
      roundEvents[currentRound].push({
        ...wrapper,
        events: [event],
      });

      // Extract character data from series-started-game
      if (type === "series-started-game") {
        const gameTeams = event.target?.state?.teams;
        if (gameTeams) {
          for (const team of gameTeams) {
            for (const player of team.players || []) {
              if (player.character?.name) {
                if (!players[player.id]) {
                  players[player.id] = {
                    id: player.id,
                    name: player.name,
                    teamName: team.name,
                    character: player.character.name,
                    kills: 0,
                    deaths: 0,
                    assists: 0,
                    firstKills: 0,
                    firstDeaths: 0,
                    damageDealt: 0,
                  };
                } else {
                  players[player.id].character = player.character.name;
                }
              }
            }
          }
        }
      }

      // Update player stats
      const teams = event.target?.state?.teams;
      if (teams) {
        for (const team of teams) {
          for (const player of team.players || []) {
            if (!players[player.id]) {
              players[player.id] = {
                id: player.id,
                name: player.name,
                teamName: team.name,
                character: player.character?.name || null,
                kills: 0,
                deaths: 0,
                assists: 0,
                firstKills: 0,
                firstDeaths: 0,
                damageDealt: 0,
              };
            }
            // Update cumulative stats
            const p = players[player.id];
            p.kills = Math.max(p.kills, player.kills || 0);
            p.deaths = Math.max(p.deaths, player.deaths || 0);
            p.assists = Math.max(p.assists, player.killAssistsGiven || 0);
            p.damageDealt +=
              event.type === "game-ended-round" ? player.damageDealt || 0 : 0;
            // Update character if found
            if (player.character?.name && !p.character) {
              p.character = player.character.name;
            }
          }
        }
      }

      // Track first bloods
      if (type === "player-killed-player") {
        const killerId = event.actor?.id;
        const victimId = event.target?.id;

        // Check if this is first kill of the round
        const roundKills =
          roundEvents[currentRound]?.filter((e) =>
            e.events?.some((ev) => ev.type === "player-killed-player"),
          ).length || 0;

        if (roundKills === 1) {
          // This is the first kill
          if (killerId && players[killerId]) players[killerId].firstKills++;
          if (victimId && players[victimId]) players[victimId].firstDeaths++;
        }
      }
    }
  }

  // Process each round through zone-state engine
  const processedRounds = [];
  for (const [roundNum, events] of Object.entries(roundEvents)) {
    const roundData = zoneEngine.processRound(
      events,
      mapName,
      parseInt(roundNum),
    );
    processedRounds.push(roundData);
  }

  console.log(
    `Scouting: Processed ${processedRounds.length} rounds for ${mapName}`,
  );

  return {
    mapName,
    rounds: processedRounds,
    players,
    totalRounds: processedRounds.length,
  };
}

// ================== ROUTES ==================

/**
 * GET /api/scouting/:seriesId
 *
 * Returns structured claims without AI generation.
 * Query params:
 *   - team: Team name to focus analysis on
 */
router.get("/:seriesId", async (req, res) => {
  try {
    const { seriesId } = req.params;
    const teamFilter = req.query.team || null;

    if (!isValidSeriesId(seriesId)) {
      return res.status(400).json({
        error: "Invalid seriesId format",
        hint: "SeriesId should be 5-10 digits",
      });
    }

    ensureDataDir();

    // Check cache or download
    let jsonlFile = findCachedFile(seriesId);
    let source = "cache";

    if (!jsonlFile) {
      jsonlFile = await downloadAndExtract(seriesId);
      source = "download";

      if (!jsonlFile) {
        return res
          .status(404)
          .json({ error: "Match file not found after download" });
      }
    }

    console.log(`Scouting: Using ${source}: ${jsonlFile}`);

    // Process through pipeline
    const matchData = await processMatchFile(jsonlFile);
    const claims = patternDetector.detectAllPatterns(
      matchData.rounds,
      matchData.players,
      teamFilter,
    );

    // Count total claims
    const totalClaims = Object.values(claims).reduce(
      (sum, arr) => sum + arr.length,
      0,
    );

    res.json({
      success: true,
      source,
      team: teamFilter || "all",
      mapName: matchData.mapName,
      totalRounds: matchData.totalRounds,
      totalClaims,
      claims,
    });
  } catch (error) {
    console.error("Scouting Error:", error);

    if (error.code === "ECONNABORTED") {
      return res.status(504).json({ error: "Download timed out, try again" });
    }
    if (error.response?.status === 404) {
      return res.status(404).json({ error: "Match not found in GRID" });
    }

    res.status(500).json({
      error: error.message,
      hint: "Check if the seriesId is valid",
    });
  }
});

/**
 * POST /api/scouting/:seriesId/report
 *
 * Generates full AI-written scouting report.
 * Query params:
 *   - team: Team name to focus analysis on (REQUIRED)
 */
router.post("/:seriesId/report", async (req, res) => {
  try {
    const { seriesId } = req.params;
    const teamFilter = req.query.team;

    if (!teamFilter) {
      return res.status(400).json({
        error: "Team name required",
        hint: "Add ?team=TeamName to the request",
      });
    }

    if (!isValidSeriesId(seriesId)) {
      return res.status(400).json({
        error: "Invalid seriesId format",
        hint: "SeriesId should be 5-10 digits",
      });
    }

    ensureDataDir();

    // Check cache or download
    let jsonlFile = findCachedFile(seriesId);

    if (!jsonlFile) {
      jsonlFile = await downloadAndExtract(seriesId);

      if (!jsonlFile) {
        return res
          .status(404)
          .json({ error: "Match file not found after download" });
      }
    }

    // Process through pipeline
    const matchData = await processMatchFile(jsonlFile);
    const claims = patternDetector.detectAllPatterns(
      matchData.rounds,
      matchData.players,
      teamFilter,
    );

    // Generate report with AI writer
    const reportResult = await aiWriter.generateReport(claims, teamFilter);

    if (!reportResult.success) {
      // Return fallback report if AI failed
      return res.json({
        success: true,
        warning: "AI generation failed, using fallback report",
        team: teamFilter,
        mapName: matchData.mapName,
        report: reportResult.fallback,
        claims,
      });
    }

    // Validate the report
    const validation = aiWriter.validateReport(reportResult.report, claims);

    res.json({
      success: true,
      team: teamFilter,
      mapName: matchData.mapName,
      report: reportResult.report,
      metadata: reportResult.metadata,
      validation,
      claims,
    });
  } catch (error) {
    console.error("Scouting Report Error:", error);

    res.status(500).json({
      error: error.message,
      hint: "Check if the seriesId is valid and team name is correct",
    });
  }
});

/**
 * GET /api/scouting/:seriesId/zones
 *
 * Returns zone-state data for debugging/visualization.
 */
router.get("/:seriesId/zones", async (req, res) => {
  try {
    const { seriesId } = req.params;

    if (!isValidSeriesId(seriesId)) {
      return res.status(400).json({ error: "Invalid seriesId format" });
    }

    ensureDataDir();

    let jsonlFile = findCachedFile(seriesId);
    if (!jsonlFile) {
      jsonlFile = await downloadAndExtract(seriesId);
      if (!jsonlFile) {
        return res.status(404).json({ error: "Match file not found" });
      }
    }

    const matchData = await processMatchFile(jsonlFile);

    // Return detailed zone data per round
    res.json({
      success: true,
      mapName: matchData.mapName,
      totalRounds: matchData.totalRounds,
      rounds: matchData.rounds.map((r) => ({
        roundNumber: r.roundNumber,
        checkpoints: r.checkpoints,
        transitions: r.transitions,
        overrides: r.overrides,
        firstContactZone: r.firstContactZone,
        plantTime: r.plantTime,
      })),
    });
  } catch (error) {
    console.error("Zone Data Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ================== CACHING ==================

// In-memory cache for claims and reports (TTL: 1 hour)
const claimsCache = new Map();
const reportsCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function getCacheKey(seriesId, team) {
  return `${seriesId}:${team || "all"}`;
}

function setCache(cache, key, value) {
  cache.set(key, { value, timestamp: Date.now() });
}

function getCache(cache, key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

// ================== MULTI-MATCH AGGREGATION ==================

/**
 * POST /api/scouting/aggregate
 *
 * Aggregates claims across multiple series for deeper pattern detection.
 * Body: { seriesIds: ["123456", "789012"], team: "TeamName" }
 */
router.post("/aggregate", async (req, res) => {
  try {
    const { seriesIds, team } = req.body;

    if (!seriesIds || !Array.isArray(seriesIds) || seriesIds.length < 2) {
      return res.status(400).json({
        error: "At least 2 seriesIds required",
        hint: 'Body: { "seriesIds": ["1234", "5678"], "team": "TeamName" }',
      });
    }

    if (seriesIds.length > 10) {
      return res.status(400).json({ error: "Maximum 10 series at once" });
    }

    // Validate all series IDs
    for (const sid of seriesIds) {
      if (!isValidSeriesId(sid)) {
        return res.status(400).json({ error: `Invalid seriesId: ${sid}` });
      }
    }

    ensureDataDir();

    // Process each series
    const allClaims = [];
    const seriesResults = [];

    for (const seriesId of seriesIds) {
      let jsonlFile = findCachedFile(seriesId);

      if (!jsonlFile) {
        try {
          jsonlFile = await downloadAndExtract(seriesId);
        } catch (err) {
          console.log(`Scouting: Failed to download ${seriesId}:`, err.message);
          continue;
        }
      }

      if (!jsonlFile) continue;

      const matchData = await processMatchFile(jsonlFile);
      const claims = patternDetector.detectAllPatterns(
        matchData.rounds,
        matchData.players,
        team,
      );

      seriesResults.push({
        seriesId,
        mapName: matchData.mapName,
        totalRounds: matchData.totalRounds,
      });

      // Flatten claims
      for (const category of Object.keys(claims)) {
        for (const claim of claims[category]) {
          allClaims.push({ ...claim, seriesId, mapName: matchData.mapName });
        }
      }
    }

    // Aggregate similar patterns
    const aggregated = aggregatePatterns(allClaims, seriesIds.length);

    res.json({
      success: true,
      team: team || "all",
      seriesAnalyzed: seriesResults.length,
      series: seriesResults,
      aggregatedClaims: aggregated,
    });
  } catch (error) {
    console.error("Aggregation Error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Aggregate patterns across multiple matches
 */
function aggregatePatterns(allClaims, seriesCount) {
  const patternGroups = {};

  // Group by pattern name
  for (const claim of allClaims) {
    const key = claim.pattern;
    if (!patternGroups[key]) {
      patternGroups[key] = [];
    }
    patternGroups[key].push(claim);
  }

  const aggregated = [];

  for (const [pattern, claims] of Object.entries(patternGroups)) {
    if (claims.length < 2) continue; // Only aggregate patterns seen in 2+ matches

    // Compute aggregated confidence (weighted by recency and match count)
    const avgConfidence =
      claims.reduce((s, c) => s + c.confidence, 0) / claims.length;
    const matchCoverage = claims.length / seriesCount;
    const aggregatedConfidence = avgConfidence * 0.7 + matchCoverage * 0.3;

    // Collect evidence
    const allRounds = [];
    const allZones = new Set();
    let totalCount = 0;
    let totalDenom = 0;

    for (const claim of claims) {
      allRounds.push(...(claim.evidence?.rounds || []));
      (claim.evidence?.zones || []).forEach((z) => allZones.add(z));
      totalCount += claim.evidence?.count || 0;
      totalDenom += claim.evidence?.denominator || 0;
    }

    aggregated.push({
      pattern,
      category: claims[0].category,
      confidence: Math.round(aggregatedConfidence * 100) / 100,
      matchesFound: claims.length,
      matchesTotal: seriesCount,
      coverage: Math.round(matchCoverage * 100) + "%",
      evidence: {
        totalCount,
        totalDenom,
        percentage:
          totalDenom > 0 ? Math.round((totalCount / totalDenom) * 100) : 0,
        zones: [...allZones],
        maps: [...new Set(claims.map((c) => c.mapName))],
      },
      description: claims[0].description,
      recommendation: claims[0].recommendation,
    });
  }

  // Sort by confidence
  return aggregated.sort((a, b) => b.confidence - a.confidence);
}

// ================== PLAYER-SPECIFIC SCOUTING ==================

/**
 * GET /api/scouting/player/:playerName
 *
 * Analyzes a specific player across multiple matches.
 * Query params:
 *   - seriesIds: comma-separated series IDs (required)
 */
router.get("/player/:playerName", async (req, res) => {
  try {
    const { playerName } = req.params;
    const seriesIdsParam = req.query.seriesIds;

    if (!playerName) {
      return res.status(400).json({ error: "Player name required" });
    }

    if (!seriesIdsParam) {
      return res.status(400).json({
        error: "Series IDs required",
        hint: "Add ?seriesIds=123456,789012",
      });
    }

    const seriesIds = seriesIdsParam
      .split(",")
      .filter((id) => isValidSeriesId(id));

    if (seriesIds.length === 0) {
      return res.status(400).json({ error: "No valid series IDs provided" });
    }

    ensureDataDir();

    // Collect player data across matches
    const playerData = {
      playerName,
      matchesAnalyzed: 0,
      totalRounds: 0,
      kills: 0,
      deaths: 0,
      assists: 0,
      firstKills: 0,
      firstDeaths: 0,
      damageDealt: 0,
      clutchWins: 0,
      clutchAttempts: 0,
      killsByRound: [],
      performances: [],
    };

    for (const seriesId of seriesIds) {
      let jsonlFile = findCachedFile(seriesId);

      if (!jsonlFile) {
        try {
          jsonlFile = await downloadAndExtract(seriesId);
        } catch (err) {
          console.log(`Player scout: Failed to download ${seriesId}`);
          continue;
        }
      }

      if (!jsonlFile) continue;

      const matchData = await processMatchFile(jsonlFile);

      // Find the player
      const player = Object.values(matchData.players).find(
        (p) => p.name.toLowerCase() === playerName.toLowerCase(),
      );

      if (!player) continue;

      playerData.matchesAnalyzed++;
      playerData.totalRounds += matchData.totalRounds;
      playerData.kills += player.kills || 0;
      playerData.deaths += player.deaths || 0;
      playerData.assists += player.assists || 0;
      playerData.firstKills += player.firstKills || 0;
      playerData.firstDeaths += player.firstDeaths || 0;
      playerData.damageDealt += player.damageDealt || 0;

      // Track per-match performance
      playerData.performances.push({
        seriesId,
        mapName: matchData.mapName,
        rounds: matchData.totalRounds,
        kda: `${player.kills}/${player.deaths}/${player.assists}`,
        fkFd: `${player.firstKills}/${player.firstDeaths}`,
        adr:
          matchData.totalRounds > 0
            ? Math.round((player.damageDealt || 0) / matchData.totalRounds)
            : 0,
      });

      // Analyze clutches for this player
      for (const round of matchData.rounds) {
        const kills = round.kills || [];
        let playerAlive = true;
        let teammatesAlive = 5;
        let opponentsAlive = 5;

        for (const kill of kills) {
          if (kill.victim?.name?.toLowerCase() === playerName.toLowerCase()) {
            playerAlive = false;
          }
          if (kill.killer?.name?.toLowerCase() === playerName.toLowerCase()) {
            // Player got a kill
          }
          // Simplified clutch tracking
        }
      }
    }

    if (playerData.matchesAnalyzed === 0) {
      return res.status(404).json({
        error: `Player "${playerName}" not found in provided matches`,
      });
    }

    // Calculate aggregated stats
    const kd =
      playerData.deaths > 0
        ? (playerData.kills / playerData.deaths).toFixed(2)
        : playerData.kills;
    const fkFdDiff = playerData.firstKills - playerData.firstDeaths;
    const adr =
      playerData.totalRounds > 0
        ? Math.round(playerData.damageDealt / playerData.totalRounds)
        : 0;

    // Generate player-specific claims
    const claims = [];

    if (
      playerData.firstKills >= 5 &&
      playerData.firstKills > playerData.firstDeaths
    ) {
      claims.push({
        pattern: "player_entry_fragger",
        description: `${playerName} has strong entry stats: ${playerData.firstKills} FK / ${playerData.firstDeaths} FD (+${fkFdDiff}).`,
        recommendation: `Watch for ${playerName} on entry. They will take early duels aggressively.`,
      });
    }

    if (
      playerData.firstDeaths >= 5 &&
      playerData.firstDeaths > playerData.firstKills
    ) {
      claims.push({
        pattern: "player_vulnerable_entry",
        description: `${playerName} dies first frequently: ${playerData.firstDeaths} FD vs ${playerData.firstKills} FK.`,
        recommendation: `Target ${playerName} early. They are often caught out of position.`,
      });
    }

    if (adr >= 150) {
      claims.push({
        pattern: "player_high_impact",
        description: `${playerName} has high impact: ${adr} ADR across ${playerData.totalRounds} rounds.`,
        recommendation: `${playerName} is a carry threat. Focus utility and trades on them.`,
      });
    }

    res.json({
      success: true,
      player: playerName,
      matchesAnalyzed: playerData.matchesAnalyzed,
      totalRounds: playerData.totalRounds,
      stats: {
        kills: playerData.kills,
        deaths: playerData.deaths,
        assists: playerData.assists,
        kd,
        firstKills: playerData.firstKills,
        firstDeaths: playerData.firstDeaths,
        fkFdDiff,
        adr,
      },
      performances: playerData.performances,
      claims,
    });
  } catch (error) {
    console.error("Player Scout Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ================== REPORT EXPORT ==================

const REPORTS_DIR = path.resolve(__dirname, "../reports");

/**
 * POST /api/scouting/:seriesId/export
 *
 * Exports scouting report to markdown file.
 * Query params:
 *   - team: Team name (required)
 *   - format: 'markdown' or 'json' (default: markdown)
 */
router.post("/:seriesId/export", async (req, res) => {
  try {
    const { seriesId } = req.params;
    const teamFilter = req.query.team;
    const format = req.query.format || "markdown";

    if (!teamFilter) {
      return res.status(400).json({ error: "Team name required" });
    }

    if (!isValidSeriesId(seriesId)) {
      return res.status(400).json({ error: "Invalid seriesId format" });
    }

    ensureDataDir();

    // Ensure reports directory exists
    if (!fs.existsSync(REPORTS_DIR)) {
      fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }

    let jsonlFile = findCachedFile(seriesId);
    if (!jsonlFile) {
      jsonlFile = await downloadAndExtract(seriesId);
      if (!jsonlFile) {
        return res.status(404).json({ error: "Match file not found" });
      }
    }

    // Process and generate report
    const matchData = await processMatchFile(jsonlFile);
    const claims = patternDetector.detectAllPatterns(
      matchData.rounds,
      matchData.players,
      teamFilter,
    );

    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `scouting_${teamFilter.replace(/\s+/g, "_")}_${seriesId}_${timestamp}`;

    if (format === "json") {
      const jsonPath = path.join(REPORTS_DIR, `${filename}.json`);
      fs.writeFileSync(
        jsonPath,
        JSON.stringify(
          {
            team: teamFilter,
            seriesId,
            mapName: matchData.mapName,
            totalRounds: matchData.totalRounds,
            generatedAt: new Date().toISOString(),
            claims,
          },
          null,
          2,
        ),
      );

      return res.json({
        success: true,
        format: "json",
        path: jsonPath,
        filename: `${filename}.json`,
      });
    }

    // Generate markdown report
    const reportResult = await aiWriter.generateReport(claims, teamFilter);
    let report = reportResult.success
      ? reportResult.report
      : reportResult.fallback;

    // Add header
    const markdown = `# Scouting Report: ${teamFilter}

**Series ID**: ${seriesId}  
**Map**: ${matchData.mapName}  
**Rounds Analyzed**: ${matchData.totalRounds}  
**Generated**: ${new Date().toLocaleString()}

---

${report}

---

*Generated by ValoScout AI Pipeline*
`;

    const mdPath = path.join(REPORTS_DIR, `${filename}.md`);
    fs.writeFileSync(mdPath, markdown);

    res.json({
      success: true,
      format: "markdown",
      path: mdPath,
      filename: `${filename}.md`,
      preview: markdown.substring(0, 500) + "...",
    });
  } catch (error) {
    console.error("Export Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ================== UTILITY TRACKING ==================

/**
 * GET /api/scouting/:seriesId/utility
 *
 * Extracts utility usage data from match events.
 * Note: GRID event availability varies.
 */
router.get("/:seriesId/utility", async (req, res) => {
  try {
    const { seriesId } = req.params;

    if (!isValidSeriesId(seriesId)) {
      return res.status(400).json({ error: "Invalid seriesId format" });
    }

    ensureDataDir();

    let jsonlFile = findCachedFile(seriesId);
    if (!jsonlFile) {
      jsonlFile = await downloadAndExtract(seriesId);
      if (!jsonlFile) {
        return res.status(404).json({ error: "Match file not found" });
      }
    }

    const filePath = path.join(MATCH_DATA_DIR, jsonlFile);
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    const utilityEvents = [];
    const abilityUsage = {};
    const smokesThrown = [];
    const flashesThrown = [];

    for await (const line of rl) {
      if (!line.trim()) continue;

      let wrapper;
      try {
        wrapper = JSON.parse(line);
      } catch (e) {
        continue;
      }

      if (!wrapper.events) continue;

      for (const event of wrapper.events) {
        const type = event.type;

        // Track ability usage events
        if (type.includes("ability") || type.includes("damageDealt")) {
          utilityEvents.push({
            type,
            actorName: event.actor?.state?.name,
            timestamp: wrapper.occurredAt,
          });
        }

        // Track smoke/flash events if available
        if (type === "player-used-ability") {
          const abilityName = event.action || "unknown";
          const playerName = event.actor?.state?.name || "unknown";

          if (!abilityUsage[playerName]) {
            abilityUsage[playerName] = {};
          }
          abilityUsage[playerName][abilityName] =
            (abilityUsage[playerName][abilityName] || 0) + 1;
        }
      }
    }

    res.json({
      success: true,
      seriesId,
      totalUtilityEvents: utilityEvents.length,
      note:
        utilityEvents.length === 0
          ? "GRID event data does not include detailed ability usage for this match"
          : "Utility data extracted",
      abilityUsage,
      sampleEvents: utilityEvents.slice(0, 10),
    });
  } catch (error) {
    console.error("Utility Error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
