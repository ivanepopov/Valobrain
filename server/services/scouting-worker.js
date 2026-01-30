const fs = require('fs');
const path = require('path');
const readline = require('readline');
const events = require('events');

const reportQueue = require('./report-queue');
const digestBuilder = require('./digest-builder');
const aiAnalyst = require('./ai-analyst');
const aiWriter = require('./ai-writer');
const zoneEngine = require('./zone-state-engine'); 
const matchDataService = require('./match-data-service');

// Ensure Zone Engine is initialized
zoneEngine.initialize();

/**
 * Downloads and extracts specific series data
 * Delegates to centralized service
 */
async function getMatchData(seriesId) {
    return await matchDataService.getMatchData(seriesId);
}

/**
 * Parses JSONL into structured Rounds/Players object.
 * @param {string} filePath - Path to the JSONL file
 * @param {string|null} targetMap - Specific map to parse (null = Game 1 only)
 * Reuses logic from legacy scouting.js.
 */
async function parseMatchFile(filePath, targetMap = null) {
    console.log(`[Parser] Reading file: ${filePath}${targetMap ? ` (targeting map: ${targetMap})` : ''}`);
    if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        console.log(`[Parser] File size: ${stats.size} bytes`);
        fs.appendFileSync('worker-debug.log', `[Parser] Reading ${filePath} (${stats.size} bytes)${targetMap ? ` [Map: ${targetMap}]` : ''}\n`);
    } else {
        console.error(`[Parser] File does not exist: ${filePath}`);
        fs.appendFileSync('worker-debug.log', `[Parser] File missing: ${filePath}\n`);
        return { rounds: [], players: {}, mapName: "Unknown" };
    }

    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    const rounds = [];
    const players = {};
    const teamIdMap = {}; // { '99': 'Cloud9' } - Persist across lines
    let mapName = "Unknown";
    let matchData = { tournamentName: "Unknown", seriesDate: null };

    // Temp storage for current round
    let currentRoundObj = null;
    let startTime = null;

    // Track which game we're currently parsing
    let currentGameSequence = 0;
    let isParsingTargetGame = false;
    let foundTargetMap = false;

    return new Promise((resolve, reject) => {
        rl.on('line', (line) => {
            try {
                const lineJson = JSON.parse(line);

                // Handle case where line is a wrapper containing 'events' array
                const events = Array.isArray(lineJson.events) ? lineJson.events : [lineJson];
                const seriesState = lineJson.seriesState; // Capture Wrapper State
                const lineTime = lineJson.occurredAt; // Capture Wrapper Timestamp

                // let teamIdMap = {}; // REMOVED: Moved to outer scope

                for (const event of events) {
                    if (!event || !event.type) continue;

                    const eventTimeVal = event.occurredAt || lineTime;

                    // Normalize Timestamp
                    if (!startTime && event.type === 'game-started-round' && event.roundNumber === 1 && isParsingTargetGame) {
                        startTime = new Date(eventTimeVal).getTime();
                    }

                    // Series / Tournament Meta
                    if (event.type === 'tournament-started-series') {
                        if (event.tournament?.name) matchData.tournamentName = event.tournament.name;
                        if (event.series?.startedAt) matchData.seriesDate = event.series.startedAt;
                    }

                    // Map Info & Game Detection
                    if (event.type === 'series-started-game') {
                        const gameState = event.target?.state;
                        const gameSequence = gameState?.sequenceNumber || 1;
                        const gameMapName = gameState?.map?.name;

                        // Capture Date from Series State (Reliable)
                        if (event.seriesState?.startedAt) {
                            matchData.seriesDate = event.seriesState.startedAt;
                        }

                        // If we were parsing a game and hit a new one, check if we should stop
                        if (currentGameSequence > 0 && gameSequence > currentGameSequence) {
                            if (isParsingTargetGame) {
                                // We finished parsing our target game
                                console.log(`[Parser] Finished parsing target game ${currentGameSequence}. Stopping.`);
                                fileStream.destroy();
                                rl.close();
                                return;
                            }
                        }

                        currentGameSequence = gameSequence;

                        // Determine if this is the game we want to parse
                        if (targetMap) {
                            // Targeting a specific map - check if this game's map matches
                            const normalizedTarget = targetMap.toLowerCase();
                            const normalizedGameMap = (gameMapName || '').toLowerCase();

                            if (normalizedGameMap === normalizedTarget) {
                                console.log(`[Parser] Found target map "${targetMap}" at Game ${gameSequence}`);
                                isParsingTargetGame = true;
                                foundTargetMap = true;
                                mapName = gameMapName.charAt(0).toUpperCase() + gameMapName.slice(1);
                                // Reset for this game
                                rounds.length = 0;
                                Object.keys(players).forEach(k => delete players[k]);
                                currentRoundObj = null;
                                startTime = null;
                            } else {
                                isParsingTargetGame = false;
                                console.log(`[Parser] Game ${gameSequence} map "${gameMapName}" doesn't match target "${targetMap}", skipping`);
                            }
                        } else {
                            // No target map specified - default behavior (Game 1 only)
                            if (gameSequence > 1) {
                                console.log(`[Parser] Detected Game ${gameSequence}. Stopping parse to isolate Game 1.`);
                                fileStream.destroy();
                                rl.close();
                                return;
                            }
                            isParsingTargetGame = true;

                            if (gameMapName) {
                                mapName = gameMapName.charAt(0).toUpperCase() + gameMapName.slice(1);
                                console.log(`[Parser] Explicit Map Detected: ${mapName}`);
                            }
                        }
                    }

                    if (event.type === 'map-started' || event.type === 'game-started') {
                        // Fallback map detection
                        if (isParsingTargetGame && event.map?.name && mapName === 'Unknown') {
                             mapName = event.map.name.charAt(0).toUpperCase() + event.map.name.slice(1);
                        }
                    }

                    // Skip events if we're not parsing the target game
                    if (!isParsingTargetGame) continue;

                    // Round Start - Capture Players & Agents
                    if (event.type === 'game-started-round') {
                        if (currentRoundObj) rounds.push(currentRoundObj);
                        currentRoundObj = {
                            roundNumber: event.roundNumber || (rounds.length + 1),
                            startTime: new Date(eventTimeVal).getTime(),
                            kills: [],
                            plantInfo: null,
                            defuseInfo: null,
                            winInfo: null,
                            abilityCasts: [] 
                        };

                        // Extract Rosters (Name -> Agent) AND Side Logic
                        const teams = event.actor?.state?.teams || [];
                        // console.log(`[Parser] Round ${event.roundNumber} - Teams found: ${teams.length}`); 
                        
                        // New: Capture Side AND Economy
                        const teamSides = {}; 
                        const teamEconomy = {};

                        // 1. Get Side from Event AND Build map
                        for (const team of teams) {
                            if (team.name && team.id) {
                                teamIdMap[team.id] = team.name;
                            }
                            if (team.name && team.side) {
                                teamSides[team.name] = team.side;
                            }
                            // Map players from event - include team info to avoid cross-team name collisions
                            for (const p of team.players || []) {
                                if (p.name && p.character?.name) {
                                    players[p.name] = {
                                        agent: p.character.name,
                                        teamName: team.name
                                    };
                                }
                            }
                        }

                        // 2. Get Economy from SeriesState (Wrapper) - Pre-Buy
                        if (seriesState && seriesState.games && seriesState.games[0] && seriesState.games[0].teams) {
                             const stateTeams = seriesState.games[0].teams;
                             for (const t of stateTeams) {
                                  if (teamIdMap[t.id]) {
                                      teamEconomy[teamIdMap[t.id]] = t.loadoutValue;
                                  }
                             }
                        }

                        // Attach to round object
                        currentRoundObj.teamSides = teamSides;
                        currentRoundObj.teamEconomy = teamEconomy;
                        
                        // console.log(`[Parser] Round ${event.roundNumber} Eco (Start): ${JSON.stringify(teamEconomy)}`);
                    }

                    // Refine Economy at Round Start (Barrier Drop)
                    if (event.type === 'round-ended-freezetime' && currentRoundObj && seriesState && seriesState.games) {
                         // Overwrite/Update Economy with post-buy values
                         const stateTeams = seriesState.games[0]?.teams;
                         if (stateTeams) {
                             const teamEconomy = currentRoundObj.teamEconomy || {};
                             for (const t of stateTeams) {
                                  if (teamIdMap[t.id]) {
                                      teamEconomy[teamIdMap[t.id]] = t.loadoutValue;
                                  }
                             }
                             currentRoundObj.teamEconomy = teamEconomy;
                             // console.log(`[Parser] Round ${currentRoundObj.roundNumber} Eco (Post-Buy): ${JSON.stringify(teamEconomy)}`);
                         }
                    }

                    // Round End / Team Won
                    if (event.type === 'team-won-round' && currentRoundObj) {
                        currentRoundObj.winInfo = {
                            winner: event.team?.name,
                            reason: event.reason || 'elimination',
                            type: event.reason
                        };
                    }

                    if (currentRoundObj) {
                        // Kills
                        if (event.type === 'player-killed-player') {
                            const killerName = event.actor?.state?.name || event.actor?.id; 
                            const victimName = event.target?.state?.name || event.target?.id;
                            const killerTeamID = event.actor?.state?.teamId;
                            const victimTeamID = event.target?.state?.teamId;
                            
                            
                            const resolvedKillerTeam = teamIdMap[killerTeamID] || killerTeamID || 'Unknown';
                            const resolvedVictimTeam = teamIdMap[victimTeamID] || victimTeamID || 'Unknown';

                            // DEBUG: Check for full team state
                            console.log(`[Parser] Kill State Keys: ${Object.keys(event.actor?.state || {})}`); 
                            if (event.actor?.state?.teams) {
                                console.log(`[Parser] FULL TEAM DATA AVAILABLE IN KILL!`);
                            }


                            const kPos = event.actor?.state?.game?.position;
                            const vPos = event.target?.state?.game?.position;

                            // Extract agent from players object (now includes team info)
                            const killerInfo = players[killerName];
                            const victimInfo = players[victimName];
                            const killerAgent = typeof killerInfo === 'object' ? killerInfo.agent : (killerInfo || 'Unknown');
                            const victimAgent = typeof victimInfo === 'object' ? victimInfo.agent : (victimInfo || 'Unknown');

                            const kill = {
                                time: new Date(eventTimeVal).getTime() - currentRoundObj.startTime,
                                killer: { name: killerName, teamName: resolvedKillerTeam, agent: killerAgent },
                                victim: { name: victimName, teamName: resolvedVictimTeam, agent: victimAgent },
                                weapon: event.actor?.state?.inventory?.find(i => i.equipped)?.name || 'Unknown',
                                killerPos: kPos,
                                victimPos: vPos
                            };
                            currentRoundObj.kills.push(kill);
                            
                            // Also keep strict event log if needed, but for now digest uses kills array
                        }

                        // Ability Usage (New)
                        if (event.type === 'player-used-ability') {
                            const playerInfo = players[event.actor?.state?.name];
                            const agent = typeof playerInfo === 'object' ? playerInfo.agent : (playerInfo || 'Unknown');
                            const ability = event.target?.state?.name || 'Unknown';
                            const time = new Date(event.occurredAt).getTime() - currentRoundObj.startTime;
                            const pos = event.actor?.state?.game?.position; // {x, y}

                            currentRoundObj.abilityCasts.push({
                                time: time,
                                agent: agent,
                                ability: ability,
                                pos: pos // Capture position
                            });
                        }

                        // Plant
                        if (event.type === 'team-completed-plantBomb' || event.type === 'player-completed-plantBomb') {
                            // console.log(`[Parser] Plant Detected Round ${currentRoundObj.roundNumber} by ${event.actor?.state?.name}`);
                            currentRoundObj.plantInfo = {
                                site: 'Unknown', 
                                time: new Date(eventTimeVal).getTime() - currentRoundObj.startTime,
                                player: event.actor?.state?.name
                            };
                        }

                        // Defuse
                        if (event.type === 'team-completed-defuseBomb' || event.type === 'player-completed-defuseBomb') {
                            currentRoundObj.defuseInfo = {
                                time: new Date(event.occurredAt).getTime() - currentRoundObj.startTime,
                                player: event.actor?.state?.name
                            };
                        }
                    }
                }
            } catch (e) {
                fs.appendFileSync('worker-debug.log', `[Error] Parse failed: ${e.message}\n`);
            }
        });

        rl.on('close', () => {
            if (currentRoundObj) rounds.push(currentRoundObj);

            // Check if we found the target map (when one was specified)
            if (targetMap && !foundTargetMap) {
                fs.appendFileSync('worker-debug.log', `[Parser] Target map "${targetMap}" not found in series!\n`);
                console.log(`[Parser] Warning: Target map "${targetMap}" not found in series`);
            }

            fs.appendFileSync('worker-debug.log', `[Parser] Finished. Rounds: ${rounds.length}, Map: ${mapName}\n`);

            resolve({
                rounds,
                players,
                mapName,
                tournamentName: matchData.tournamentName,
                seriesDate: matchData.seriesDate,
                targetMapFound: targetMap ? foundTargetMap : true
            });
        });

        rl.on('error', (err) => {
             fs.appendFileSync('worker-debug.log', `[Error] Stream error: ${err.message}\n`);
             reject(err);
        });
    });
}

/**
 * Main Worker Function to process a job
 */
async function processJob(jobId) {
    const job = reportQueue.getJob(jobId);
    if (!job) return;

    try {
        const targetMap = job.targetMap; // null for all maps (Game 1), or specific map name
        console.log(`[Worker] Starting job ${jobId} for ${job.teamName}${targetMap ? ` (Map: ${targetMap})` : ''}`);
        reportQueue.updateJob(jobId, { status: reportQueue.JOB_STATUS.PROCESSING, progress: 10 });

        // Create cache key that includes map for per-map digests
        const cacheKey = targetMap ? `${job.seriesId}_${targetMap}` : job.seriesId;

        // 0. Check for Cached Digest
        let digest = matchDataService.loadDigest(cacheKey);
        let matchData = null; // Only needed if no digest

        if (digest) {
            console.log(`[Worker] Using cached DIGEST for ${cacheKey}. Skipping Download/Parse.`);
            reportQueue.updateJob(jobId, {
                progress: 50,
                stages: { ...job.stages, digest: 'completed', analyst: 'processing' },
                intermediate: { digest }
            });
        } else {
            // 1. Get/Download Data
            const filePath = await getMatchData(job.seriesId);
            reportQueue.updateJob(jobId, { progress: 20 });

            // 2. Parse Data (pass targetMap to parse specific game)
            matchData = await parseMatchFile(filePath, targetMap);
            reportQueue.updateJob(jobId, { progress: 30 });

            // Check if target map was found
            if (targetMap && !matchData.targetMapFound) {
                throw new Error(`Map "${targetMap}" not found in this series`);
            }

            // 3. Build Digest
            reportQueue.updateJob(jobId, { stages: { ...job.stages, digest: 'processing' } });
            digest = digestBuilder.buildMatchDigest(matchData, job.teamName);

            // SAVE DIGEST TO CACHE (with map-specific key)
            matchDataService.saveDigest(cacheKey, digest);

            reportQueue.updateJob(jobId, {
                stages: { ...job.stages, digest: 'completed', analyst: 'processing' },
                progress: 50,
                intermediate: { digest } // Save formatted digest
            });
        }

        // 4. AI Analyst (Pass 1)
        const analysis = await aiAnalyst.analyzeMatch(digest);
        reportQueue.updateJob(jobId, { 
            stages: { ...job.stages, analyst: 'completed', writer: 'processing' },
            progress: 75
        });

        // 5. AI Writer (Pass 2)
        const report = await aiWriter.generateReport(analysis, {
            targetTeam: job.teamName,
            map: matchData ? matchData.mapName : digest.meta.map, // Use digest map if matchData is null
            date: digest.meta.date ? new Date(digest.meta.date).toLocaleDateString() : new Date().toLocaleDateString(),
            tournament: digest.meta.tournament,
            roster: digest.meta.roster,
            roundScore: digest.stats.roundScore // Pass the correct round score to writer
        });

        // 6. Complete
        reportQueue.updateJob(jobId, { 
            status: reportQueue.JOB_STATUS.COMPLETED,
            stages: { ...job.stages, writer: 'completed' },
            progress: 100,
            result: {
                reportMarkdown: report,
                analysisJson: analysis // Store intermediate JSON too if user wants to see it
            }
        });
        
        // 7. Optional Cleanup
        if (process.env.KEEP_RAW_FILES === 'false') {
            console.log(`[Worker] KEEP_RAW_FILES=false. Deleting raw data for ${job.seriesId}.`);
            matchDataService.deleteRawData(job.seriesId);
        }

        console.log(`[Worker] Job ${jobId} completed successfully.`);

    } catch (error) {
        console.error(`[Worker] Job ${jobId} failed:`, error);
        reportQueue.updateJob(jobId, { 
            status: reportQueue.JOB_STATUS.FAILED,
            error: error.message
        });
    }
}

module.exports = {
    processJob
};
