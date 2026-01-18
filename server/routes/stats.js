const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const AdmZip = require('adm-zip');
const rateLimit = require('express-rate-limit');
const mapService = require('../services/map-service');

const router = express.Router();

// Where we store downloaded match files
const MATCH_DATA_DIR = path.resolve(__dirname, '../match_data');
const GRID_FILE_URL = 'https://cdn-cf.grid.gg/file-download/events/grid/series';

// Rate limit: 10 requests per minute (downloads are heavy)
const statsLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { error: 'Too many requests, please wait a minute' }
});

router.use(statsLimiter);

// Request timeout for downloads (30 seconds)
const DOWNLOAD_TIMEOUT_MS = 30000;

// --- Helper Functions ---

// Make sure the match_data folder exists
const ensureDataDir = () => {
    if (!fs.existsSync(MATCH_DATA_DIR)) {
        fs.mkdirSync(MATCH_DATA_DIR, { recursive: true });
    }
};

// Look for a cached .jsonl file for this series
const findCachedFile = (seriesId) => {
    const files = fs.readdirSync(MATCH_DATA_DIR);
    return files.find(f => f.includes(seriesId) && f.endsWith('.jsonl'));
};

// Validate seriesId format
const isValidSeriesId = (seriesId) => {
    return /^\d{5,10}$/.test(seriesId);
};

// Download the match ZIP from GRID and extract it
const downloadAndExtract = async (seriesId) => {
    const zipPath = path.join(MATCH_DATA_DIR, `${seriesId}.zip`);
    const url = `${GRID_FILE_URL}/${seriesId}`;

    console.log(`Downloading match ${seriesId}...`);

    const response = await axios.get(url, {
        headers: { 'x-api-key': process.env.API_KEY },
        responseType: 'arraybuffer',
        timeout: DOWNLOAD_TIMEOUT_MS
    });

    fs.writeFileSync(zipPath, response.data);
    console.log('Download complete. Extracting...');

    const zip = new AdmZip(zipPath);
    zip.extractAllTo(MATCH_DATA_DIR, true);

    console.log('Extraction complete.');
    return findCachedFile(seriesId);
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
            firstKills: 0,    // NEW: First blood kills
            firstDeaths: 0,   // NEW: First blood deaths
            lastCallout: 'Unknown'
        };
    }

    const stats = players[player.id];

    // Update their last known position
    if (player.position?.x !== undefined && player.position?.y !== undefined) {
        stats.lastCallout = mapService.getCallout(mapName, player.position.x, player.position.y);
    }

    // Add damage at end of round
    if (eventType === 'game-ended-round') {
        stats.damageDealt += player.damageDealt || 0;
        stats.damageTaken += player.damageTaken || 0;
    }

    // GRID gives cumulative stats, so take the max
    stats.kills = Math.max(stats.kills, player.kills || 0);
    stats.deaths = Math.max(stats.deaths, player.deaths || 0);
    stats.assists = Math.max(stats.assists, player.killAssistsGiven || 0);
};

// NEW: Extract player positions from team data
const extractStartingPositions = (teams, mapName) => {
    const positions = { attackers: [], defenders: [] };
    
    if (!teams) return positions;
    
    for (const team of teams) {
        const side = team.side; // 'attacker' or 'defender'
        const targetArray = side === 'attacker' ? positions.attackers : positions.defenders;
        
        for (const player of team.players || []) {
            if (player.position?.x !== undefined && player.position?.y !== undefined) {
                targetArray.push({
                    playerId: player.id,
                    playerName: player.name,
                    team: team.name,
                    x: player.position.x,
                    y: player.position.y,
                    callout: mapService.getCallout(mapName, player.position.x, player.position.y)
                });
            }
        }
    }
    
    return positions;
};

// Figure out how the round was won
const getWinType = (bombPlanted, bombDetonated, bombDefused, winnerSide) => {
    if (bombDetonated) return 'Detonation';
    if (bombDefused) return 'Defusal';
    if (bombPlanted && winnerSide === 'defender') return 'Time';
    return 'Elimination';
};

// --- Main Parser ---

// Read through the match file and pull out all the stats
const parseMatchFile = async (filename) => {
    const filePath = path.join(MATCH_DATA_DIR, filename);
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    const players = {};
    const rounds = [];
    const zoneStats = {};

    let mapName = 'Unknown';
    let currentRound = 0;
    let bombPlanted = false;
    let bombDetonated = false;
    let bombDefused = false;
    
    // NEW: First blood and position tracking per round
    let firstBloodThisRound = null;  // { killer, victim, weapon, timestamp }
    let startingPositions = null;     // { attackers: [], defenders: [] }

    for await (const line of rl) {
        if (!line.trim()) continue;

        let wrapper;
        try {
            wrapper = JSON.parse(line);
        } catch (e) {
            console.warn('Skipping bad line in match file');
            continue;
        }

        if (!wrapper.events) continue;

        for (const event of wrapper.events) {
            const type = event.type;

            // Get the map name when game starts
            if (type === 'series-started-game') {
                const name = event.target?.state?.map?.name;
                if (name) {
                    mapName = name.charAt(0).toUpperCase() + name.slice(1);
                }
            }

            // Track where kills happen
            if (type === 'player-killed-player') {
                trackZoneKill(zoneStats, mapName, event.actor?.state?.game?.position, 'kills');
                trackZoneKill(zoneStats, mapName, event.target?.state?.game?.position, 'deaths');
                
                // NEW: Track first blood
                if (!firstBloodThisRound) {
                    const killerId = event.actor?.id;
                    const victimId = event.target?.id;
                    const weapon = event.actor?.state?.game?.weapon?.id || 'Unknown';
                    
                    firstBloodThisRound = {
                        killerId,
                        killerName: event.actor?.state?.name || 'Unknown',
                        victimId,
                        victimName: event.target?.state?.name || 'Unknown',
                        weapon,
                        killerPosition: event.actor?.state?.game?.position,
                        victimPosition: event.target?.state?.game?.position
                    };
                    
                    // Update player FK/FD stats
                    if (killerId && players[killerId]) {
                        players[killerId].firstKills++;
                    }
                    if (victimId && players[victimId]) {
                        players[victimId].firstDeaths++;
                    }
                }
            }

            // Reset state at start of each round
            if (type === 'game-started-round') {
                currentRound = event.target?.state?.sequenceNumber || currentRound + 1;
                bombPlanted = false;
                bombDetonated = false;
                bombDefused = false;
                firstBloodThisRound = null;  // Reset first blood
                
                // NEW: Capture starting positions for default detection
                const roundTeams = event.target?.state?.teams;
                startingPositions = extractStartingPositions(roundTeams, mapName);
            }

            // Track bomb events
            if (type === 'player-completed-plantBomb') bombPlanted = true;
            if (type === 'player-completed-explodeBomb') bombDetonated = true;
            if (type === 'player-completed-defuseBomb') bombDefused = true;

            // Record round result when it ends
            if (type === 'game-ended-round') {
                const teams = event.target?.state?.teams;
                const winner = teams?.find(t => t.won);
                if (winner) {
                    rounds.push({
                        roundNumber: currentRound || rounds.length + 1,
                        winner: winner.name,
                        winType: getWinType(bombPlanted, bombDetonated, bombDefused, winner.side),
                        side: winner.side,
                        // NEW: Include first blood and starting positions
                        firstBlood: firstBloodThisRound,
                        startingPositions: startingPositions
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

    console.log(`Parsed ${Object.keys(zoneStats).length} zones, ${rounds.length} rounds`);

    return {
        players: Object.values(players),
        rounds,
        zoneStats
    };
};

// --- Analysis ---

// Generate some insights about the match
const generateAnalysis = (players, rounds) => {
    const insights = [];

    // Count win types
    const winTypes = rounds.reduce((acc, r) => {
        acc[r.winType] = (acc[r.winType] || 0) + 1;
        return acc;
    }, {});

    const bombRounds = (winTypes.Detonation || 0) + (winTypes.Defusal || 0);
    const elimRounds = winTypes.Elimination || 0;

    // Playstyle insight
    insights.push({
        category: 'Playstyle',
        title: bombRounds > elimRounds ? 'Tactical Specialist' : 'Aggressive & Explosive',
        description: bombRounds > elimRounds
            ? `Objective-focused match. ${bombRounds} rounds ended via bomb.`
            : `High elimination rate (${elimRounds} rounds). Teams prioritized aim duels.`
    });

    // MVP by damage
    const mvp = [...players].sort((a, b) => b.damageDealt - a.damageDealt)[0];
    if (mvp) {
        insights.push({
            category: 'Key Player',
            title: `The Carry: ${mvp.name}`,
            description: `${mvp.name} dealt ${mvp.damageDealt.toLocaleString()} damage.`
        });
    }

    // --- NEW: First Blood Analysis ---
    
    // Opening Duel King (highest FK)
    const fkLeader = [...players].sort((a, b) => b.firstKills - a.firstKills)[0];
    if (fkLeader && fkLeader.firstKills > 0) {
        const fkFdDiff = fkLeader.firstKills - fkLeader.firstDeaths;
        insights.push({
            category: 'Opening Duels',
            title: `Opening Duel King: ${fkLeader.name}`,
            description: `${fkLeader.name} secured ${fkLeader.firstKills} first bloods (FK/FD: ${fkFdDiff >= 0 ? '+' : ''}${fkFdDiff}).`
        });
    }
    
    // Weak Link Target (highest FD - exploitable player)
    const fdLeader = [...players].sort((a, b) => b.firstDeaths - a.firstDeaths)[0];
    if (fdLeader && fdLeader.firstDeaths > 0 && fdLeader.name !== fkLeader?.name) {
        const fkFdDiff = fdLeader.firstKills - fdLeader.firstDeaths;
        insights.push({
            category: 'Target Priority',
            title: `Weak Link: ${fdLeader.name}`,
            description: `${fdLeader.name} died first ${fdLeader.firstDeaths} times (FK/FD: ${fkFdDiff >= 0 ? '+' : ''}${fkFdDiff}). Exploit this player.`
        });
    }
    
    // First Blood Dependency Analysis (Team Tendency from Strategies.md)
    const roundsWithFB = rounds.filter(r => r.firstBlood);
    if (roundsWithFB.length > 0) {
        // Group rounds by team that got first blood & if they won
        const fbStats = {};
        roundsWithFB.forEach(round => {
            const fbPlayer = players.find(p => 
                p.name === round.firstBlood?.killerName || 
                (round.firstBlood?.killerId && p.id === round.firstBlood.killerId)
            );
            if (fbPlayer) {
                const team = fbPlayer.teamName;
                if (!fbStats[team]) fbStats[team] = { gotFB: 0, wonAfterFB: 0 };
                fbStats[team].gotFB++;
                if (round.winner === team) fbStats[team].wonAfterFB++;
            }
        });
        
        // Find most FB-dependent team
        const teams = Object.entries(fbStats);
        if (teams.length > 0) {
            const [bestTeam, stats] = teams.sort((a, b) => b[1].gotFB - a[1].gotFB)[0];
            const winRate = stats.gotFB > 0 ? Math.round((stats.wonAfterFB / stats.gotFB) * 100) : 0;
            
            if (stats.gotFB >= 3) {
                insights.push({
                    category: 'Team Tendency',
                    title: winRate >= 70 ? 'First Blood Dependent' : 'Struggles to Convert FBs',
                    description: `${bestTeam} got ${stats.gotFB} first bloods and won ${winRate}% of those rounds.`
                });
            }
        }
    }

    // How close was the match?
    const teamWins = rounds.reduce((acc, r) => {
        acc[r.winner] = (acc[r.winner] || 0) + 1;
        return acc;
    }, {});

    const scores = Object.values(teamWins);
    if (scores.length >= 2) {
        const diff = Math.abs(scores[0] - scores[1]);
        insights.push({
            category: 'Match Flow',
            title: diff < 3 ? 'Neck and Neck' : 'One-Sided Affair',
            description: diff < 3
                ? 'This series was extremely close.'
                : 'One team controlled the economy and tempo.'
        });
    }

    return insights;
};

// --- Route ---

// GET /api/advanced-stats/:seriesId
// Returns player stats, round results, zone heatmap data, and match insights
router.get('/:seriesId', async (req, res) => {
    try {
        const { seriesId } = req.params;

        // Validate seriesId format
        if (!isValidSeriesId(seriesId)) {
            return res.status(400).json({
                error: 'Invalid seriesId format',
                hint: 'SeriesId should be 5-10 digits'
            });
        }

        ensureDataDir();

        // Check if we already have this match cached
        let jsonlFile = findCachedFile(seriesId);
        let source = 'cache';

        // If not, download it
        if (!jsonlFile) {
            jsonlFile = await downloadAndExtract(seriesId);
            source = 'download';

            if (!jsonlFile) {
                return res.status(404).json({ error: 'Match file not found after download' });
            }
        }

        console.log(`Using ${source}: ${jsonlFile}`);

        // Parse the file and generate insights
        const data = await parseMatchFile(jsonlFile);
        const analysis = generateAnalysis(data.players, data.rounds);

        res.json({
            source,
            stats: data.players,
            rounds: data.rounds,
            zoneStats: data.zoneStats,
            analysis
        });

    } catch (error) {
        // Handle specific error types
        if (error.code === 'ECONNABORTED') {
            return res.status(504).json({ error: 'Download timed out, try again' });
        }
        if (error.response?.status === 404) {
            return res.status(404).json({ error: 'Match not found in GRID' });
        }
        if (error.response?.status === 401 || error.response?.status === 403) {
            return res.status(500).json({ error: 'API key issue, check server config' });
        }

        console.error('Error:', error.message);
        res.status(500).json({
            error: error.message,
            hint: 'Check if the seriesId is valid'
        });
    }
});

module.exports = router;
