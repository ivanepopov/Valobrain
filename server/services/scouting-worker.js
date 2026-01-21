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
    let mapName = "Unknown";
    
    // Temp storage for current round
    let currentRoundObj = null;

    return new Promise((resolve, reject) => {
        rl.on('line', (line) => {
            try {
                const lineJson = JSON.parse(line);
                
                // Handle case where line is a wrapper containing 'events' array
                const eventsToProcess = Array.isArray(lineJson.events) ? lineJson.events : [lineJson];

                for (const event of eventsToProcess) {
                    if (!event || !event.type) continue;
                    
                    // Map Info
                    if (event.type === 'map-started' || event.type === 'game-started') {
                        if (event.map?.name) mapName = event.map.name;
                    }

                    // Round Start - Capture Players & Agents
                    if (event.type === 'game-started-round') {
                        if (currentRoundObj) rounds.push(currentRoundObj);
                        currentRoundObj = {
                            roundNumber: event.roundNumber || (rounds.length + 1),
                            startTime: new Date(event.occurredAt).getTime(),
                            events: [],
                            kills: [],
                            plantInfo: null,
                            defuseInfo: null,
                            winInfo: null,
                            abilityCasts: [] // New: Track abilities
                        };

                        // Extract Rosters (Name -> Agent)
                        const teams = event.actor?.state?.teams || [];
                        console.log(`[Parser] Round ${event.roundNumber} - Teams found: ${teams.length}`); // DEBUG
                        for (const team of teams) {
                            for (const p of team.players || []) {
                                if (p.name && p.character?.name) {
                                    players[p.name] = p.character.name;
                                    // console.log(`[Parser] Mapped ${p.name} -> ${p.character.name}`); // DEBUG
                                }
                            }
                        }
                        console.log(`[Parser] Total Players Mapped: ${Object.keys(players).length}`); // DEBUG
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
                            const killerTeam = event.actor?.state?.teamID || 'Unknown'; 
                            
                            const kPos = event.actor?.state?.game?.position;
                            const vPos = event.target?.state?.game?.position;

                            const kill = {
                                time: new Date(event.occurredAt).getTime() - currentRoundObj.startTime,
                                killer: { name: killerName, teamName: killerTeam, agent: players[killerName] || 'Unknown' },
                                victim: { name: victimName, teamName: 'Unknown', agent: players[victimName] || 'Unknown' }, 
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
            
            resolve({ rounds, players, mapName });
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

        // 1. Get/Download Data
        const filePath = await getMatchData(job.seriesId);
        reportQueue.updateJob(jobId, { progress: 20 });

        // 2. Parse Data
        const matchData = await parseMatchFile(filePath);
        reportQueue.updateJob(jobId, { progress: 30 });

        // 3. Build Digest
        reportQueue.updateJob(jobId, { stages: { ...job.stages, digest: 'processing' } });
        const digest = digestBuilder.buildMatchDigest(matchData, job.teamName);
        reportQueue.updateJob(jobId, { 
            stages: { ...job.stages, digest: 'completed', analyst: 'processing' },
            progress: 50,
            intermediate: { digest } // Save formatted digest
        });

        // 4. AI Analyst (Pass 1)
        const analysis = await aiAnalyst.analyzeMatch(digest);
        reportQueue.updateJob(jobId, { 
            stages: { ...job.stages, analyst: 'completed', writer: 'processing' },
            progress: 75
        });

        // 5. AI Writer (Pass 2)
        const report = await aiWriter.generateReport(analysis, {
            targetTeam: job.teamName,
            map: matchData.mapName,
            date: new Date().toLocaleDateString() // approximate
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
