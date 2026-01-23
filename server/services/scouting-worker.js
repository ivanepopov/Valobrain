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
 * Reuses logic from legacy scouting.js.
 */
async function parseMatchFile(filePath) {
    console.log(`[Parser] Reading file: ${filePath}`);
    if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        console.log(`[Parser] File size: ${stats.size} bytes`);
        fs.appendFileSync('worker-debug.log', `[Parser] Reading ${filePath} (${stats.size} bytes)\n`);
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
                    if (!startTime && event.type === 'game-started-round' && event.roundNumber === 1) {
                        startTime = new Date(eventTimeVal).getTime();
                    }

                    // Series / Tournament Meta
                    if (event.type === 'tournament-started-series') {
                        if (event.tournament?.name) matchData.tournamentName = event.tournament.name;
                        if (event.series?.startedAt) matchData.seriesDate = event.series.startedAt;
                    }
                    
                    // Map Info & Game 2 Detection
                    if (event.type === 'series-started-game') {
                        const gameState = event.target?.state;
                        
                        // Capture Date from Series State (Reliable)
                        if (event.seriesState?.startedAt) {
                            matchData.seriesDate = event.seriesState.startedAt;
                        }

                        // Check for Game 2+
                        if (gameState?.sequenceNumber > 1) {
                            console.log(`[Parser] Detected Game ${gameState.sequenceNumber}. Stopping parse to isolate Game 1.`);
                            fileStream.destroy();
                            rl.close();
                            return;
                        }

                        if (gameState?.map?.name) {
                             // Capitalize: split -> Split
                             mapName = gameState.map.name.charAt(0).toUpperCase() + gameState.map.name.slice(1);
                             console.log(`[Parser] Explicit Map Detected: ${mapName}`);
                        }
                    }

                    if (event.type === 'map-started' || event.type === 'game-started') {
                        // Fallback map detection
                        if (event.map?.name && mapName === 'Unknown') {
                             mapName = event.map.name.charAt(0).toUpperCase() + event.map.name.slice(1);
                        }
                    }

                    // Round Start - Capture Players & Agents
                    if (event.type === 'game-started-round') {
                        // ROUND 1 CHECK REMOVED (Replaced by Sequence Number check above) --
                        // actually, keeping a safety check effectively isn't bad, but let's rely on Sequence Number 
                        // as it's cleaner. If Sequence check fails (no event), we might mix data.
                        // But Grid data is reliable with structure.

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
                            // Map players from event
                            for (const p of team.players || []) {
                                if (p.name && p.character?.name) {
                                    players[p.name] = p.character.name;
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


                            const kPos = event.actor?.state?.game?.position;
                            const vPos = event.target?.state?.game?.position;

                            const kill = {
                                time: new Date(eventTimeVal).getTime() - currentRoundObj.startTime,
                                killer: { name: killerName, teamName: resolvedKillerTeam, agent: players[killerName] || 'Unknown' },
                                victim: { name: victimName, teamName: resolvedVictimTeam, agent: players[victimName] || 'Unknown' }, 
                                weapon: event.actor?.state?.inventory?.find(i => i.equipped)?.name || 'Unknown',
                                killerPos: kPos,
                                victimPos: vPos
                            };
                            currentRoundObj.kills.push(kill);
                            
                            // Also keep strict event log if needed, but for now digest uses kills array
                        }

                        // Ability Usage (New)
                        if (event.type === 'player-used-ability') {
                            const agent = players[event.actor?.state?.name] || 'Unknown';
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
                            currentRoundObj.plantInfo = {
                                site: 'Unknown', 
                                time: new Date(event.occurredAt).getTime() - currentRoundObj.startTime,
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
            
            fs.appendFileSync('worker-debug.log', `[Parser] Finished. Rounds: ${rounds.length}\n`);
            
            resolve({ 
                rounds, 
                players, 
                mapName,
                tournamentName: matchData.tournamentName,
                seriesDate: matchData.seriesDate
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
        console.log(`[Worker] Starting job ${jobId} for ${job.teamName}`);
        reportQueue.updateJob(jobId, { status: reportQueue.JOB_STATUS.PROCESSING, progress: 10 });

        // 0. Check for Cached Digest
        let digest = matchDataService.loadDigest(job.seriesId);
        let matchData = null; // Only needed if no digest

        if (digest) {
            console.log(`[Worker] Using cached DIGEST for ${job.seriesId}. Skipping Download/Parse.`);
            reportQueue.updateJob(jobId, { 
                progress: 50, 
                stages: { ...job.stages, digest: 'completed', analyst: 'processing' },
                intermediate: { digest }
            });
        } else {
            // 1. Get/Download Data
            const filePath = await getMatchData(job.seriesId);
            reportQueue.updateJob(jobId, { progress: 20 });

            // 2. Parse Data
            matchData = await parseMatchFile(filePath);
            reportQueue.updateJob(jobId, { progress: 30 });

            // 3. Build Digest
            reportQueue.updateJob(jobId, { stages: { ...job.stages, digest: 'processing' } });
            digest = digestBuilder.buildMatchDigest(matchData, job.teamName);
            
            // SAVE DIGEST TO CACHE
            matchDataService.saveDigest(job.seriesId, digest);

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
            tournament: digest.meta.tournament
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
