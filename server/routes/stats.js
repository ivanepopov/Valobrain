const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const AdmZip = require("adm-zip");
const rateLimit = require("express-rate-limit");
const mapService = require("../services/map-service");
const matchDataService = require("../services/match-data-service");

const router = express.Router();

// Rate limit: 10 requests per minute (downloads are heavy)
const statsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: "Too many requests, please wait a minute" },
});

router.use(statsLimiter);

// --- Helper Functions ---

// Make sure the match_data folder exists


// Look for a cached .jsonl file for this series


// Validate seriesId format
const isValidSeriesId = (seriesId) => {
  return /^\d{5,10}$/.test(seriesId);
};



// Track a kill or death at a map location
const trackZoneKill = (zoneStats, mapName, position, type) => {
  if (!position || position.x === undefined || position.y === undefined) return;

  const callout = mapService.getCallout(mapName, position.x, position.y);
  if (!zoneStats[callout]) {
    zoneStats[callout] = { kills: 0, deaths: 0 };
  }
  zoneStats[callout][type]++;
};

// Create or update a player's stats
const updatePlayerStats = (players, player, teamName, mapName, eventType) => {
  if (!players[player.id]) {
    players[player.id] = {
      name: player.name,
      teamName: teamName,
      damageDealt: 0,
      damageTaken: 0,
      kills: 0,
      deaths: 0,
      assists: 0,
      firstKills: 0,
      firstDeaths: 0,
      lastCallout: "Unknown",
    };
  }

  const stats = players[player.id];

  // Update their last known position
  if (player.position?.x !== undefined && player.position?.y !== undefined) {
    stats.lastCallout = mapService.getCallout(
      mapName,
      player.position.x,
      player.position.y,
    );
  }

  // Add damage at end of round
  if (eventType === "game-ended-round") {
    stats.damageDealt += player.damageDealt || 0;
    stats.damageTaken += player.damageTaken || 0;
  }

  // GRID gives cumulative stats, so take the max
  stats.kills = Math.max(stats.kills, player.kills || 0);
  stats.deaths = Math.max(stats.deaths, player.deaths || 0);
  stats.assists = Math.max(stats.assists, player.killAssistsGiven || 0);
};

// Get player positions at round start (for default detection later)
const extractStartingPositions = (teams, mapName) => {
  const positions = { attackers: [], defenders: [] };

  if (!teams) return positions;

  for (const team of teams) {
    const side = team.side; // 'attacker' or 'defender'
    const targetArray =
      side === "attacker" ? positions.attackers : positions.defenders;

    for (const player of team.players || []) {
      if (
        player.position?.x !== undefined &&
        player.position?.y !== undefined
      ) {
        targetArray.push({
          playerId: player.id,
          playerName: player.name,
          team: team.name,
          x: player.position.x,
          y: player.position.y,
          callout: mapService.getCallout(
            mapName,
            player.position.x,
            player.position.y,
          ),
        });
      }
    }
  }

  return positions;
};

// Figure out how the round was won
const getWinType = (bombPlanted, bombDetonated, bombDefused, winnerSide) => {
  if (bombDetonated) return "Detonation";
  if (bombDefused) return "Defusal";
  if (bombPlanted && winnerSide === "defender") return "Time";
  return "Elimination";
};

// --- Main Parser ---

// Read through the match file and pull out all the stats
const parseMatchFile = async (filename) => {
  const filePath = path.join(MATCH_DATA_DIR, filename);
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  const players = {};
  const rounds = [];
  const zoneStats = {};

  let mapName = "Unknown";
  let currentRound = 0;
  let bombPlanted = false;
  let bombDetonated = false;
  let bombDefused = false;

  // Track first blood each round
  let firstBloodThisRound = null;
  let startingPositions = null;

  // Timing data for tempo analysis
  let roundStartTime = null;
  let firstContactTime = null;
  let plantTime = null;

  for await (const line of rl) {
    if (!line.trim()) continue;

    let wrapper;
    try {
      wrapper = JSON.parse(line);
    } catch (e) {
      console.warn("Skipping bad line in match file");
      continue;
    }

    if (!wrapper.events) continue;

    // Timestamp is on the wrapper, not individual events
    const eventTime = wrapper.occurredAt ? new Date(wrapper.occurredAt).getTime() : null;

    for (const event of wrapper.events) {
      const type = event.type;

      // Get the map name when game starts
      if (type === "series-started-game") {
        const name = event.target?.state?.map?.name;
        if (name) {
          mapName = name.charAt(0).toUpperCase() + name.slice(1);
        }
      }

      // Track where kills happen
      if (type === "player-killed-player") {
        trackZoneKill(
          zoneStats,
          mapName,
          event.actor?.state?.game?.position,
          "kills",
        );
        trackZoneKill(
          zoneStats,
          mapName,
          event.target?.state?.game?.position,
          "deaths",
        );

        // Track first blood (first kill of the round)
        if (!firstBloodThisRound) {
          const killerId = event.actor?.id;
          const victimId = event.target?.id;
          const weapon = event.actor?.state?.game?.weapon?.id || "Unknown";

          firstBloodThisRound = {
            killerId,
            killerName: event.actor?.state?.name || "Unknown",
            victimId,
            victimName: event.target?.state?.name || "Unknown",
            weapon,
            killerPosition: event.actor?.state?.game?.position,
            victimPosition: event.target?.state?.game?.position,
          };

          // Update player FK/FD stats
          if (killerId && players[killerId]) {
            players[killerId].firstKills++;
          }
          if (victimId && players[victimId]) {
            players[victimId].firstDeaths++;
          }

          // Record time of first contact
          if (!firstContactTime && eventTime) {
            firstContactTime = eventTime;
          }
        }
      }

      // Reset state at start of each round
      if (type === "game-started-round") {
        currentRound = event.target?.state?.sequenceNumber || currentRound + 1;
        bombPlanted = false;
        bombDetonated = false;
        bombDefused = false;
        firstBloodThisRound = null;
        firstContactTime = null;
        plantTime = null;

        // Grab player positions for default detection
        const roundTeams = event.target?.state?.teams;
        startingPositions = extractStartingPositions(roundTeams, mapName);
      }

      // Start timing from when freeze time ends (when combat begins)
      if (type === "round-ended-freezetime") {
        roundStartTime = eventTime;
      }

      // Track bomb events
      if (type === "player-completed-plantBomb") {
        bombPlanted = true;
        if (eventTime) {
          plantTime = eventTime;
        }
      }
      if (type === "player-completed-explodeBomb") bombDetonated = true;
      if (type === "player-completed-defuseBomb") bombDefused = true;

      // Record round result when it ends
      if (type === "game-ended-round") {
        const teams = event.target?.state?.teams;
        const winner = teams?.find((t) => t.won);
        if (winner) {
          rounds.push({
            roundNumber: currentRound || rounds.length + 1,
            mapName: mapName, // Ensure mapName is attached to every round
            winner: winner.name,
            winType: getWinType(
              bombPlanted,
              bombDetonated,
              bombDefused,
              winner.side,
            ),
            side: winner.side,
            firstBlood: firstBloodThisRound,
            startingPositions: startingPositions,
            // Timing data (in seconds from round start)
            timing: {
              roundStartTime,
              timeToFirstContact: (roundStartTime && firstContactTime)
                ? Math.round((firstContactTime - roundStartTime) / 1000)
                : null,
              timeToPlant: (roundStartTime && plantTime)
                ? Math.round((plantTime - roundStartTime) / 1000)
                : null,
            },
          });
        }
      }

      // Update player stats from any event with team data
      const teams = event.target?.state?.teams;
      if (teams) {
        for (const team of teams) {
          for (const player of team.players || []) {
            updatePlayerStats(players, player, team.name, mapName, type);
          }
        }
      }
    }
  }

  console.log(
    `Parsed ${Object.keys(zoneStats).length} zones, ${rounds.length} rounds`,
  );

  // Calculate FK%/FD% for each player
  const totalRounds = rounds.length;
  const playersWithPercentages = Object.values(players).map(player => ({
    ...player,
    // FK% = first kills / rounds played (as percentage)
    fkPercent: totalRounds > 0 ? Math.round((player.firstKills / totalRounds) * 100) : 0,
    // FD% = first deaths / rounds played (as percentage)
    fdPercent: totalRounds > 0 ? Math.round((player.firstDeaths / totalRounds) * 100) : 0,
    // FK/FD differential
    fkFdDiff: player.firstKills - player.firstDeaths,
  }));

  return {
    players: playersWithPercentages,
    rounds,
    zoneStats,
  };
};

// --- Analysis ---

// Generate some insights about the match
const generateAnalysis = (allPlayers, rounds, teamName = null) => {
  const insights = [];

  // Filter players and rounds to target team if specified
  const players = teamName 
    ? allPlayers.filter(p => p.teamName?.toLowerCase() === teamName.toLowerCase())
    : allPlayers;

  const filteredRounds = teamName
    ? rounds.filter(r => r.winner?.toLowerCase() === teamName.toLowerCase())
    : rounds;

  if (players.length === 0) return insights;

  // Count win types (Only for the target team)
  const winTypes = filteredRounds.reduce((acc, r) => {
    acc[r.winType] = (acc[r.winType] || 0) + 1;
    return acc;
  }, {});

  const bombRounds = (winTypes.Detonation || 0) + (winTypes.Defusal || 0);
  const elimRounds = winTypes.Elimination || 0;

  // Playstyle insight
  insights.push({
    category: "Playstyle",
    title:
      bombRounds > elimRounds
        ? "Tactical Specialist"
        : "Aggressive & Explosive",
    description:
      bombRounds > elimRounds
        ? `Objective-focused match. ${bombRounds} rounds ended via bomb.`
        : `High elimination rate (${elimRounds} rounds). Teams prioritized aim duels.`,
  });

  // MVP by damage
  const mvp = [...players].sort((a, b) => b.damageDealt - a.damageDealt)[0];
  if (mvp) {
    insights.push({
      category: "Key Player",
      title: `The Carry: ${mvp.name}`,
      description: `${mvp.name} dealt ${mvp.damageDealt.toLocaleString()} damage.`,
    });
  }

  // --- NEW: First Blood Analysis ---

  // Opening Duel King (highest FK)
  const fkLeader = [...players].sort((a, b) => b.firstKills - a.firstKills)[0];
  if (fkLeader && fkLeader.firstKills > 0) {
    const fkFdDiff = fkLeader.firstKills - fkLeader.firstDeaths;
    insights.push({
      category: "Opening Duels",
      title: `Opening Duel King: ${fkLeader.name}`,
      description: `${fkLeader.name} secured ${fkLeader.firstKills} first bloods (FK/FD: ${fkFdDiff >= 0 ? "+" : ""}${fkFdDiff}).`,
    });
  }

  // Weak Link Target (highest FD - exploitable player)
  const fdLeader = [...players].sort(
    (a, b) => b.firstDeaths - a.firstDeaths,
  )[0];
  if (
    fdLeader &&
    fdLeader.firstDeaths > 0 &&
    fdLeader.name !== fkLeader?.name
  ) {
    const fkFdDiff = fdLeader.firstKills - fdLeader.firstDeaths;
    insights.push({
      category: "Target Priority",
      title: `Weak Link: ${fdLeader.name}`,
      description: `${fdLeader.name} died first ${fdLeader.firstDeaths} times (FK/FD: ${fkFdDiff >= 0 ? "+" : ""}${fkFdDiff}). Exploit this player.`,
    });
  }

  // First Blood Dependency Analysis
    const roundsWithFB = rounds.filter((r) => r.firstBlood); // Look at ALL rounds with a FB
    if (roundsWithFB.length > 0) {
        const fbStats = {};
        roundsWithFB.forEach((round) => {
          // Find if the killer belongs to the target team
          const killerName = round.firstBlood?.killerName;
          const killerTeam = allPlayers.find(p => p.name === killerName)?.teamName;
          
          if (killerTeam && (!teamName || killerTeam.toLowerCase() === teamName.toLowerCase())) {
            if (!fbStats[killerTeam]) fbStats[killerTeam] = { gotFB: 0, wonAfterFB: 0 };
            fbStats[killerTeam].gotFB++;
            if (round.winner === killerTeam) fbStats[killerTeam].wonAfterFB++;
          }
        });

        const teams = Object.entries(fbStats);
        if (teams.length > 0) {
          const [targetTeam, stats] = teams[0]; // Since we filtered by teamName, there's only one
          const winRate = stats.gotFB > 0 ? Math.round((stats.wonAfterFB / stats.gotFB) * 100) : 0;

          if (stats.gotFB >= 2) {
            insights.push({
              category: "Team Tendency",
              title: winRate >= 70 ? "First Blood Dependent" : "Struggles to Convert FBs",
              description: `${targetTeam} secured ${stats.gotFB} first bloods in this series and won ${winRate}% of those rounds.`,
            });
          }
        }
    }

  // How close was the match?
  const teamWins = filteredRounds.reduce((acc, r) => {
    acc[r.winner] = (acc[r.winner] || 0) + 1;
    return acc;
  }, {});

  const scores = Object.values(teamWins);
  if (scores.length >= 2) {
    const diff = Math.abs(scores[0] - scores[1]);
    insights.push({
      category: "Match Flow",
      title: diff < 3 ? "Neck and Neck" : "One-Sided Affair",
      description:
        diff < 3
          ? "This series was extremely close."
          : "One team controlled the economy and tempo.",
    });
  }

  return insights;
};

// Break down how rounds were won (bomb vs eliminations)
// Can filter to a specific team if teamName is provided
const generateWinConditions = (rounds, teamName = null) => {
  // Only count this team's rounds if specified
  const filteredRounds = teamName
    ? rounds.filter(r => r.winner?.toLowerCase() === teamName.toLowerCase())
    : rounds;

  const winConditions = {
    team: teamName || 'all',
    attack: { detonation: 0, elimination: 0, time: 0, total: 0 },
    defense: { defusal: 0, elimination: 0, time: 0, total: 0 },
    overall: { detonation: 0, defusal: 0, elimination: 0, time: 0, total: 0 },
  };

  filteredRounds.forEach((round) => {
    const side = round.side; // 'attacker' or 'defender'
    const winType = round.winType?.toLowerCase() || "elimination";

    // Update overall counts
    winConditions.overall.total++;
    if (winType === "detonation") winConditions.overall.detonation++;
    else if (winType === "defusal") winConditions.overall.defusal++;
    else if (winType === "time") winConditions.overall.time++;
    else winConditions.overall.elimination++;

    // Update side-specific counts
    if (side === "attacker") {
      winConditions.attack.total++;
      if (winType === "detonation") winConditions.attack.detonation++;
      else if (winType === "time") winConditions.attack.time++;
      else winConditions.attack.elimination++;
    } else if (side === "defender") {
      winConditions.defense.total++;
      if (winType === "defusal") winConditions.defense.defusal++;
      else if (winType === "time") winConditions.defense.time++;
      else winConditions.defense.elimination++;
    }
  });

  // Calculate percentages
  const calcPercentages = (obj) => {
    if (obj.total === 0) return obj;
    return {
      ...obj,
      detonationPct: obj.detonation
        ? Math.round((obj.detonation / obj.total) * 100)
        : undefined,
      defusalPct: obj.defusal
        ? Math.round((obj.defusal / obj.total) * 100)
        : undefined,
      eliminationPct: obj.elimination
        ? Math.round((obj.elimination / obj.total) * 100)
        : undefined,
      timePct: obj.time ? Math.round((obj.time / obj.total) * 100) : undefined,
    };
  };

  return {
    team: winConditions.team,
    attack: calcPercentages(winConditions.attack),
    defense: calcPercentages(winConditions.defense),
    overall: calcPercentages(winConditions.overall),
  };
};

// Calculate tempo/timing averages across rounds
const generateTempoStats = (rounds, teamName = null) => {
  // Filter to team's attack rounds if specified (tempo is most relevant on attack)
  const attackRounds = rounds.filter(r => {
    const isAttack = r.side === 'attacker';
    const isTeam = teamName ? r.winner?.toLowerCase() === teamName.toLowerCase() : true;
    return isAttack && isTeam && r.timing;
  });

  // Collect timing data
  const firstContactTimes = attackRounds
    .map(r => r.timing?.timeToFirstContact)
    .filter(t => t !== null && t !== undefined);

  const plantTimes = attackRounds
    .map(r => r.timing?.timeToPlant)
    .filter(t => t !== null && t !== undefined);

  // Calculate averages
  const avg = (arr) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
  const avgFirstContact = avg(firstContactTimes);
  const avgPlantTime = avg(plantTimes);

  // Determine tempo style
  let tempoStyle = 'Unknown';
  if (avgFirstContact !== null) {
    if (avgFirstContact < 20) tempoStyle = 'Aggressive';
    else if (avgFirstContact < 40) tempoStyle = 'Balanced';
    else tempoStyle = 'Slow/Methodical';
  }

  return {
    team: teamName || 'all',
    roundsAnalyzed: attackRounds.length,
    avgTimeToFirstContact: avgFirstContact,
    avgTimeToPlant: avgPlantTime,
    tempoStyle,
    // Raw data for charts
    firstContactDistribution: firstContactTimes,
    plantTimeDistribution: plantTimes,
  };
};

// Filter players to only include those from a specific team
const filterPlayersByTeam = (players, teamName) => {
  if (!teamName) return players;
  return players.filter(p => p.teamName?.toLowerCase() === teamName.toLowerCase());
};

// --- Route ---

// GET /api/advanced-stats/:seriesId
// Returns player stats, round results, zone heatmap data, and match insights
router.get("/:seriesId", async (req, res) => {
  try {
    const { seriesId } = req.params;

    // Validate seriesId format
    if (!isValidSeriesId(seriesId)) {
      return res.status(400).json({
        error: "Invalid seriesId format",
        hint: "SeriesId should be 5-10 digits",
      });
    }

    // Use Service to get Data
    const jsonlFile = await matchDataService.getMatchData(seriesId);
    console.log(`[StatsRoute] Processing: ${jsonlFile}`);

    // Parse the file and generate insights
    const data = await parseMatchFile(path.basename(jsonlFile));

    // Optional team filter from query param
    const teamFilter = req.query.team || null;

    const analysis = generateAnalysis(data.players, data.rounds, teamFilter);
    const winConditions = generateWinConditions(data.rounds, teamFilter);
    const tempo = generateTempoStats(data.rounds, teamFilter);

    // Filter player stats to specific team if requested
    const filteredStats = teamFilter
      ? data.players.filter(p => p.teamName?.toLowerCase() === teamFilter.toLowerCase())
      : data.players;

    res.json({
      source: "service",
      team: teamFilter || 'all',
      stats: filteredStats,
      rounds: data.rounds,
      zoneStats: data.zoneStats,
      winConditions,
      tempo,
      analysis,
    });
  } catch (error) {
    // Handle specific error types
    if (error.code === "ECONNABORTED") {
      return res.status(504).json({ error: "Download timed out, try again" });
    }
    if (error.message.includes("not found")) {
        return res.status(404).json({ error: "Match not found in GRID or Cache" });
    }

    console.error("Error:", error.message);
    res.status(500).json({
      error: error.message,
      hint: "Check if the seriesId is valid",
    });
  }
});

// GET /api/advanced-stats/:seriesId/win-conditions
// Returns just the win condition breakdown for a series
// Optional query param: ?team=TeamName to filter to that team's wins
router.get("/:seriesId/win-conditions", async (req, res) => {
  try {
    const { seriesId } = req.params;
    const teamFilter = req.query.team || null;

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

    const data = await parseMatchFile(jsonlFile);
    const winConditions = generateWinConditions(data.rounds, teamFilter);

    res.json(winConditions);
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/advanced-stats/:seriesId/tempo
// Returns timing/tempo analysis for attack rounds
// Optional query param: ?team=TeamName to filter to that team
router.get("/:seriesId/tempo", async (req, res) => {
  try {
    const { seriesId } = req.params;
    const teamFilter = req.query.team || null;

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

    const data = await parseMatchFile(jsonlFile);
    const tempo = generateTempoStats(data.rounds, teamFilter);

    res.json(tempo);
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
