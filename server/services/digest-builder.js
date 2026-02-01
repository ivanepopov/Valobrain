/**
 * Digest Builder Service
 * 
 * Compresses raw JSONL events into a high-density "Match Digest" JSON 
 * suitable for LLM context windows.
 */

const zoneEngine = require('./zone-state-engine');

/**
 * Fuzzy match a target team name against teams found in the JSONL data.
 * Handles cases where Statistics API has "Cloud9" but JSONL has "Cloud9 Blue".
 * @param {string} targetTeam - Team name from Statistics API
 * @param {Object} players - Players object with team info { playerName: { agent, teamName } }
 * @param {Array} rounds - Array of round objects with winInfo
 * @returns {string} - Best matching team name from JSONL data, or original if no match found
 */
function resolveTeamName(targetTeam, players, rounds) {
  if (!targetTeam) return targetTeam;
  
  // 1. Collect all unique team names from JSONL data
  const teamsInData = new Set();
  
  // From players roster
  for (const playerInfo of Object.values(players)) {
    if (typeof playerInfo === 'object' && playerInfo.teamName) {
      teamsInData.add(playerInfo.teamName);
    }
  }
  
  // From round win info
  for (const round of rounds) {
    if (round.winInfo?.winner) {
      teamsInData.add(round.winInfo.winner);
    }
  }
  
  const teamsArray = Array.from(teamsInData);
  
  if (teamsArray.length === 0) {
    console.warn(`[Digest] No teams found in JSONL data, using original: "${targetTeam}"`);
    return targetTeam;
  }
  
  // Check for exact match (case-insensitive)
  const exactMatch = teamsArray.find(t => t.toLowerCase() === targetTeam.toLowerCase());
  if (exactMatch) return exactMatch;
  
  // Check if target team is a substring of any JSONL team (e.g., "Cloud9" matches "Cloud9 Blue")
  const substringMatch = teamsArray.find(t => 
    t.toLowerCase().includes(targetTeam.toLowerCase()) ||
    targetTeam.toLowerCase().includes(t.toLowerCase())
  );
  if (substringMatch) return substringMatch;
  
  // 4. Try normalizing common variations
  const normalizeTeamName = (name) => {
    return name
      .toLowerCase()
      .replace(/\s+(esports|gaming|team|e-sports|club)$/i, '')  // Remove common suffixes
      .replace(/\s+/g, '')  // Remove spaces
      .replace(/[^a-z0-9]/g, '');  // Remove special chars
  };
  
  const normalizedTarget = normalizeTeamName(targetTeam);
  const normalizedMatch = teamsArray.find(t => 
    normalizeTeamName(t) === normalizedTarget ||
    normalizeTeamName(t).includes(normalizedTarget) ||
    normalizedTarget.includes(normalizeTeamName(t))
  );
  if (normalizedMatch) return normalizedMatch;
  
  // 5. Check word overlap (e.g., "Team Liquid" vs "Liquid")
  const targetWords = targetTeam.toLowerCase().split(/\s+/);
  let bestMatch = null;
  let bestOverlap = 0;
  
  for (const team of teamsArray) {
    const teamWords = team.toLowerCase().split(/\s+/);
    const overlap = targetWords.filter(w => teamWords.some(tw => tw.includes(w) || w.includes(tw))).length;
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      bestMatch = team;
    }
  }
  
  if (bestMatch && bestOverlap > 0) return bestMatch;
  
  // No match found - warn and use original
  console.warn(`[Digest] No fuzzy match found for "${targetTeam}". Available: [${teamsArray.join(', ')}]`);
  return targetTeam;
}

/**
 * Build a compact match digest from raw processed rounds
 * @param {Object} matchData - Output from processing JSONL (rounds, players, mapName)
 * @param {string} targetTeam - Team to focus analysis on
 */
function buildMatchDigest(matchData, targetTeam) {
  const { rounds, players } = matchData;
  let mapName = matchData.mapName;
  
  // 0. Resolve target team name against JSONL data (handles "Cloud9" vs "Cloud9 Blue" mismatches)
  const resolvedTeam = resolveTeamName(targetTeam, players, rounds);
  if (resolvedTeam !== targetTeam) {
    console.log(`[Digest] Using resolved team name: "${resolvedTeam}" (original: "${targetTeam}")`);
  }
  
  // 0b. Auto-Detect Map if Unknown
  if (!mapName || mapName === 'Unknown') {
      mapName = detectMap(rounds);
      console.log(`[Digest] Auto-Detected Map: ${mapName}`);
  }

  // 1. Convert each round into a dense summary FIRST
  const roundSummaries = [];
  for (const round of rounds) {
    roundSummaries.push(summarizeRound(round, resolvedTeam, mapName));
  }

  // 2. Build stats using the summaries (for trade aggregation) and raw rounds (for wins)
  const stats = buildTeamStats(rounds, roundSummaries, resolvedTeam);

  // Normalize roster to include team info and filter to target team's players
  const normalizedRoster = {};
  const targetTeamRoster = {};
  for (const [playerName, playerInfo] of Object.entries(players)) {
    // Handle both old format (string) and new format (object with agent and teamName)
    if (typeof playerInfo === 'object' && playerInfo.agent) {
      normalizedRoster[playerName] = playerInfo;
      // Filter target team's roster (use resolvedTeam for matching)
      if (playerInfo.teamName?.toLowerCase() === resolvedTeam?.toLowerCase()) {
        targetTeamRoster[playerName] = playerInfo.agent;
      }
    } else {
      // Old format - just agent name
      normalizedRoster[playerName] = { agent: playerInfo, teamName: 'Unknown' };
    }
  }

  const digest = {
    meta: {
      map: mapName,
      targetTeam: resolvedTeam,  // Use resolved name so it matches throughout
      originalTeam: targetTeam,  // Keep original for reference
      tournament: matchData.tournamentName || 'Unknown Tournament',
      date: matchData.seriesDate || new Date().toISOString(),
      roster: targetTeamRoster, // Target team's Name -> Agent map (simplified)
      fullRoster: normalizedRoster, // All players with team info
      totalRounds: rounds.length,
      generatedAt: new Date().toISOString()
    },
    stats: stats,
    rounds: roundSummaries
  };

  return digest;
}

function detectMap(rounds) {
    const knownMaps = ['Ascent', 'Bind', 'Haven', 'Split', 'Icebox', 'Breeze', 'Fracture', 'Pearl', 'Lotus', 'Sunset', 'Abyss'];
    const samplePoints = [];
    
    // Collect sample points (kills & abilities)
    for (const r of rounds) {
        if (r.abilityCasts) r.abilityCasts.forEach(a => { if(a.pos) samplePoints.push(a.pos); });
        // Also check kills if available in raw format, but abilityCasts is reliable enough usually
        // If needed, we can pass kills too, but let's stick to abilityCasts for simplicity if populated
        // OR leverage the fact that we process kills inside summarizeRound...
        // Let's grab some kill positions too if possible, but raw rounds usually have 'kills' with positions?
        // Wait, parser puts raw kills in `r.events` or `r.kills`. My parser update puts positions in `r.kills`.
        if (r.kills) r.kills.forEach(k => {
             if (k.killerPos) samplePoints.push(k.killerPos);
             if (k.victimPos) samplePoints.push(k.victimPos);
        });
        if (samplePoints.length > 50) break; // Enough samples
    }

    if (samplePoints.length === 0) return 'Ascent'; // Fallback

    let bestMap = 'Ascent';
    let maxHits = -1;

    for (const map of knownMaps) {
        let hits = 0;
        for (const p of samplePoints) {
            if (zoneEngine.getZone(map, p.x, p.y)) hits++;
        }
        if (hits > maxHits) {
            maxHits = hits;
            bestMap = map;
        }
    }
    
    return bestMap;
}

function buildTeamStats(rounds, roundSummaries, targetTeam) {
  // Aggregate high-level stats (Win rate, pistol WR, etc)
  // Use case-insensitive comparison to handle team name variations
  const wins = rounds.filter(r =>
    r.winInfo?.winner?.toLowerCase() === targetTeam?.toLowerCase()
  ).length;
  
  // Warn if no wins detected (likely a team name resolution issue)
  if (wins === 0 && rounds.length > 0) {
    const allWinners = [...new Set(rounds.map(r => r.winInfo?.winner).filter(Boolean))];
    console.warn(`[Digest] WARNING: 0 wins for "${targetTeam}". Winners in data: [${allWinners.join(', ')}]`);
  }
  
  // 1. Site Conditioning (Attack Side)
  const siteSequence = rounds
    .sort((a, b) => a.roundNumber - b.roundNumber)
    .map(r => r.plantInfo?.site || 'No Plant')
    .filter(s => s !== 'No Plant');

  // 2. Trade Efficiency Aggregation
  let totalDeaths = 0;
  let totalTraded = 0;
  
  for (const summary of roundSummaries) {
      if (summary.trades) {
          totalDeaths += summary.trades.opportunities;
          totalTraded += summary.trades.executed;
      }
  }

  const tradeEfficiency = totalDeaths > 0 ? Math.round((totalTraded / totalDeaths) * 100) : 0;
  
  // 3. Tempo & Pacing Aggregation
  let totalPlantTime = 0;
  let plantCount = 0;
  let totalTTFK = 0;
  let ttfkCount = 0;

  for (const s of roundSummaries) {
      if (s.metrics?.plantTime !== null && s.metrics?.plantTime !== undefined) {
          totalPlantTime += s.metrics.plantTime;
          plantCount++;
      }
      if (s.metrics?.ttfk) {
          totalTTFK += s.metrics.ttfk;
          ttfkCount++;
      }
  }

  const avgPlantTime = plantCount > 0 ? Math.round(totalPlantTime / plantCount) : 0;
  const avgTTFK = ttfkCount > 0 ? Math.round(totalTTFK / ttfkCount) : 0;

  let pacingStyle = 'Balanced';
  if (avgPlantTime > 0) {
      if (avgPlantTime < 50) pacingStyle = 'Blitz / Fast';
      else if (avgPlantTime > 80) pacingStyle = 'Slow / Control';
      else pacingStyle = 'Standard Default';
  }

  // 4. Role Aggregation (Lurk & Anchor)
  const lurkCounts = {};
  const anchorCounts = {}; // { PlayerName: { A: 2, B: 5, Mid: 1 } }
  
  for (const s of roundSummaries) {
      if (s.metrics?.lurker) {
          const p = s.metrics.lurker.player;
          lurkCounts[p] = (lurkCounts[p] || 0) + 1;
      }
      
      if (s.metrics?.anchors) {
          Object.entries(s.metrics.anchors).forEach(([player, site]) => {
              if (!anchorCounts[player]) anchorCounts[player] = { total: 0 };
              anchorCounts[player][site] = (anchorCounts[player][site] || 0) + 1;
              anchorCounts[player].total++;
          });
      }
  }
  
  let topLurker = 'None';
  let maxLurks = 0;
  Object.entries(lurkCounts).forEach(([player, count]) => {
      if (count > maxLurks) {
          maxLurks = count;
          topLurker = player;
      }
  });
  
  // Resolve Anchors
  const roles = {
      lurker: maxLurks >= 2 ? topLurker : 'None',
      lurkRounds: maxLurks,
      anchors: {}
  };
  
  Object.entries(anchorCounts).forEach(([player, sites]) => {
      if (sites.total < 3) return; // Need at least 3 defense rounds detected
      
      let maxSite = 'Flex';
      let maxCount = 0;
      
      ['A', 'B', 'C', 'Mid'].forEach(site => {
          const count = sites[site] || 0;
          if (count > maxCount) {
              maxCount = count;
              maxSite = site;
          }
      });
      
      const pct = maxCount / sites.total;
      if (pct >= 0.6) {
          roles.anchors[player] = `${maxSite}-Anchor`;
      } else {
          roles.anchors[player] = 'Rotator/Flex';
      }
  });

  // Resolve Weak Link (Most First Deaths on Defense)
  const fdCounts = {};
  for (const s of roundSummaries) {
      if (s.metrics?.openingDeath) {
          const p = s.metrics.openingDeath;
          fdCounts[p] = (fdCounts[p] || 0) + 1;
      }
  }
  
  let weakLink = 'None';
  let maxFD = 0;
  Object.entries(fdCounts).forEach(([player, count]) => {
      if (count > maxFD) {
          maxFD = count;
          weakLink = player;
      }
  });
  
  roles.weakLink = maxFD >= 2 ? weakLink : 'None';
  roles.defenseFDs = maxFD;

  // 7. Site Success Rate (Where do they win?) & Opening Duel Strength
  const siteStats = { A: {w:0, t:0}, B: {w:0, t:0}, C: {w:0, t:0} };
  const openingWins = {};

  for (const s of roundSummaries) {
      if (s.metrics.openingKiller) {
          const k = s.metrics.openingKiller;
          openingWins[k] = (openingWins[k] || 0) + 1;
      }
      
      // Check Plant Site Success
      if (s.keyEvents?.plant?.site) {
          const site = s.keyEvents.plant.site; // "A" or "B"
          if (siteStats[site]) {
              siteStats[site].t++;
              if (s.result === 'WIN') siteStats[site].w++;
          }
      }
  }

  // Format Site Success
  const siteSuccess = {};
  Object.keys(siteStats).forEach(site => {
      if (siteStats[site].t > 0) {
          const winPct = Math.round((siteStats[site].w / siteStats[site].t) * 100);
          siteSuccess[site] = `${winPct}% (${siteStats[site].w}/${siteStats[site].t})`;
      }
  });

  // Format Opening Win Leaders (Top 2)
  const duelLeaders = Object.entries(openingWins)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 2)
      .map(([p, c]) => `${p}: ${c} First Kills`);

  const losses = rounds.length - wins;
  return {
    targetTeam,
    totalRounds: rounds.length,
    wins,
    losses,
    roundScore: `${wins}-${losses}`,  // Pre-calculated score for AI (e.g., "13-10")
    tradeEfficiency: `${tradeEfficiency}% (${totalTraded}/${totalDeaths})`,
    pacing: {
        style: pacingStyle,
        avgPlantTime: `${avgPlantTime}s`,
        avgFirstContact: `${avgTTFK}s`
    },
    roles: roles,
    siteSuccess: siteSuccess, // NEW
    openingDuelWins: duelLeaders, // NEW
    pistolRounds: rounds.filter(r => [1, 13].includes(r.roundNumber))
      .map(r => ({ round: r.roundNumber, winner: r.winInfo?.winner })),
    siteSequence // ["A", "A", "B", ...]
  };
}

const WEAPON_COSTS = {
    'Vandal': 2900, 'Phantom': 2900, 'Operator': 4700, 'Odin': 3200, 'Judge': 1850,
    'Spectre': 1600, 'Ares': 1600, 'Bulldog': 2050, 'Guardian': 2250, 'Marshal': 950,
    'Sheriff': 800, 'Ghost': 500, 'Frenzy': 450, 'Shorty': 150, 'Bucky': 850, 'Stinger': 1100,
    'Classic': 0, 'Melee': 0,
    // ID-based / Lowercase Fallbacks
    'vandal': 2900, 'phantom': 2900, 'operator': 4700, 'odin': 3200, 'judge': 1850,
    'spectre': 1600, 'ares': 1600, 'bulldog': 2050, 'guardian': 2250, 'marshal': 950,
    'sheriff': 800, 'ghost': 500, 'frenzy': 450, 'shorty': 150, 'bucky': 850, 'stinger': 1100,
    'classic': 0, 'melee': 0, 'knife': 0
};

/**
 * Heuristic Economy Detection
 * Checks weapons used in kills to guess the buy type AND estimates value.
 */
function deriveEconomy(kills, targetTeam) {
    const teamKills = kills.filter(k => k.killer?.teamName === targetTeam);
    
    // 1. Calculate Est. Loadout Value (of active killers)
    let totalValue = 0;
    let counted = 0;
    
    for (const k of teamKills) {
        const w = k.weapon;
        if (WEAPON_COSTS[w] !== undefined) {
            totalValue += WEAPON_COSTS[w];
            counted++;
        }
    }
    
    const avgValue = counted > 0 ? Math.round(totalValue / counted) : 0;
    
    // 2. Classify based on Average Weapon Value
    let type = 'Unknown';
    if (avgValue >= 2900) type = 'Full Buy';
    else if (avgValue >= 1800) type = 'Force Buy'; // Guardian/Bulldog territory
    else if (avgValue >= 800) type = 'Half Buy';   // Sheriff/Spectre
    else type = 'Eco';

    return { type, avgValue };
}

function summarizeRound(round, targetTeam, mapName) {
  const isTargetN = round.roundNumber;
  
  // Identify key events (existing)
  const plant = round.plantInfo ? {
    site: round.plantInfo.site,
    time: round.plantInfo.time,
    planter: round.plantInfo.player
  } : null;

  const defuse = round.defuseInfo ? {
    time: round.defuseInfo.time,
    player: round.defuseInfo.player
  } : null;

  // ROBUST SIDE DETECTION
  // Use the explicit side extracted by parser, or fallback to heuristics if missing (old data)
  let targetSide = 'unknown';
  if (round.teamSides && round.teamSides[targetTeam]) {
      targetSide = round.teamSides[targetTeam];
  } else {
      // Fallback (Legacy)
      const sampleKill = (round.kills || []).find(k => k.killer?.teamName === targetTeam || k.victim?.teamName === targetTeam);
      targetSide = sampleKill 
        ? (sampleKill.killer?.teamName === targetTeam ? sampleKill.killer.side : sampleKill.victim.side)
        : 'unknown';
  }

  // Use case-insensitive comparison for team name matching
  const result = round.winInfo?.winner?.toLowerCase() === targetTeam?.toLowerCase() ? 'WIN' : 'LOSS';
  const winType = round.winInfo?.type || 'elimination';

  const kills = (round.kills || []).sort((a, b) => a.time - b.time);
  
  // METRIC: Time To First Kill (TTFK)
  const ttfk = kills.length > 0 ? Math.round(kills[0].time / 1000) : null;
  const plantTime = round.plantInfo ? Math.round(round.plantInfo.time / 1000) : null;

  const firstBlood = kills[0] ? {
    killer: kills[0].killer?.name,
    killerAgent: kills[0].killer?.agent, 
    victim: kills[0].victim?.name,
    victimAgent: kills[0].victim?.agent, 
    killerTeam: kills[0].killer?.teamName,
    victimTeam: kills[0].victim?.teamName, // ADDED THIS
    time: kills[0].time,
    zone: kills[0].victim?.zone
  } : null;

  const tradeEvents = analyzeTrades(kills, targetTeam);

  // New: Economy & Ability Summary
  // const economy = deriveEconomy(kills, targetTeam); // Deprecated heuristic
  
  let loadoutVal = 0;
  let buyType = 'Unknown';
  
  if (round.teamEconomy && round.teamEconomy[targetTeam] !== undefined) {
      loadoutVal = round.teamEconomy[targetTeam];
      // Classification based on Team Total (5 players)
      // Full Buy: ~20k+ (4k avg)
      // Force: ~12k+ (2.4k avg)
      // Eco: < 10k (<2k avg)
      if (loadoutVal >= 19000) buyType = 'Full Buy';
      else if (loadoutVal >= 10000) buyType = 'Force/Half Buy';
      else buyType = 'Eco';
  } else {
      // Fallback if data missing
      const economy = deriveEconomy(kills, targetTeam);
      buyType = economy.type;
      loadoutVal = economy.avgValue * 5; // Approx team total
  }

  const abilities = (round.abilityCasts || []).map(a => {
      let z = 'Unknown';
      if (a.pos) z = zoneEngine.getZone(mapName, a.pos.x, a.pos.y) || 'Unknown';
      return {
        t: Math.round(a.time / 1000), 
        agt: a.agent, 
        ab: a.ability,
        z: z
      };
  });

  // 4. Lurk Detection (Event Cluster Logic)
  let lurkerInfo = null;
  const teamEvents = []; // { player, x, y }

  // Collect Kills
  (round.kills || []).forEach(k => {
      if (k.killer?.teamName === targetTeam && k.killerPos) {
          teamEvents.push({ player: k.killer.name, x: k.killerPos.x, y: k.killerPos.y });
      }
  });

  // Collect Abilities
  (round.abilityCasts || []).forEach(a => {
      // Ability casts don't always have teamName attached directly in my current parser object (just agent/player name)
      // I need to filter by targetTeam players.
      // Since I don't have a fast roster map here, I'll rely on the fact that `abilityCasts` usually filtered effectively or I check roster map in digest?
      // Actually, `summarizeRound` doesn't strictly know if `a.agent` belongs to targetTeam easily without checking roster.
      // BUT `round.teamSides` map might help if I map Player -> Team.
      // Use `players` map passed or derived?
      // The parser `players` map is Name->Agent.
      // Let's assume for now we trust `kills` most, and maybe skip abilities if ambiguous, OR rely on `teamIdMap` if I passed it.
      // Simplified: Just use Kills + Plant for now to be safe, as Kills have explicit TeamName.
      // Wait, I can try to match player name against `round.teamSides`? No, that's Team->Side.
      // Let's stick to Kills + Plant for high confidence.
  });
  
  // Collect Plant
  if (round.plantInfo && round.plantInfo.player && round.plantInfo.site) { // If *we* planted? 
     // We don't know the team of the planter explicitly in round.plantInfo? It just has player name.
     // But usually we can assume if we won by bomb or if we are Attack side...
     // Let's safe check: if `targetSide` is Attack, then the planter is likely us (unless defuse... wait defuse is separate).
     // Actually, let's keep it simple: Kills are the strongest signal of "Fighting".
  }

  // Calculate Centroid
  if (teamEvents.length >= 2) {
      const avgX = teamEvents.reduce((s, e) => s + e.x, 0) / teamEvents.length;
      const avgY = teamEvents.reduce((s, e) => s + e.y, 0) / teamEvents.length;
      
      const playerDists = {}; // { PlayerName: [distances] }
      
      teamEvents.forEach(e => {
          const dist = Math.sqrt(Math.pow(e.x - avgX, 2) + Math.pow(e.y - avgY, 2));
           if (!playerDists[e.player]) playerDists[e.player] = [];
           playerDists[e.player].push(dist);
      });

      // Find Max Outlier
      let maxAvgDist = 0;
      let maxPlayer = null;

      Object.keys(playerDists).forEach(p => {
          const dists = playerDists[p];
          const typeAvg = dists.reduce((a, b) => a + b, 0) / dists.length;
          if (typeAvg > maxAvgDist) {
              maxAvgDist = typeAvg;
              maxPlayer = p;
          }
      });

      // Threshold: 5500 units (~55m)
      if (maxAvgDist > 5500 && maxPlayer) {
          lurkerInfo = { player: maxPlayer, dist: Math.round(maxAvgDist) };
      }
  }


  // 5. Defense Anchoring (Site Hold)
  let anchors = {}; // { PlayerName: "A" }
  if (targetSide === 'defender') {
      // Find where each player played this round
      // Priority 1: First Kill/Death (Engagement)
      // Priority 2: First Ability Cast (Setup)
      
      const playersSeen = new Set();
      
      // Check Kills
      (round.kills || []).forEach(k => {
          // If Target Team Player was Killer
          if (k.killer?.teamName === targetTeam && !playersSeen.has(k.killer.name)) {
             const z = k.killerPos ? zoneEngine.getZone(mapName, k.killerPos.x, k.killerPos.y) : null;
             if (z) {
                 anchors[k.killer.name] = zoneEngine.getMacroSite(z);
                 playersSeen.add(k.killer.name);
             }
          }
          // If Target Team Player was Victim (died holding)
          if (k.victim?.teamName === targetTeam && !playersSeen.has(k.victim.name)) {
             const z = k.victimPos ? zoneEngine.getZone(mapName, k.victimPos.x, k.victimPos.y) : null;
             if (z) {
                 anchors[k.victim.name] = zoneEngine.getMacroSite(z);
                 playersSeen.add(k.victim.name);
             }
          }
      });

      // Check Abilities (for those not seen in kills)
      (round.abilityCasts || []).forEach(a => {
          // We assume ability actor is player name.
          // We need to filter by team, but `summarizeRound` lacks roster.
          // Heuristic: If we haven't seen this player in kills (likely meaning alive or no contact), 
          // and name matches a known player from `round` roster...
          // For now, let's just leniently accept if we haven't seen them.
          if (!playersSeen.has(a.agent)) { // a.agent is Name or Agent? 
             // Parser line 236: agent: agent (Name -> Agent map value). 
             // Actually parser line 236: `agent: agent` WHERE `agent` was looked up from `players`.
             // Wait, `scouting-worker.js`: `const agent = players[event.actor.state.name] || 'Unknown'`.
             // So `a.agent` is 'Jett'. `a.agent` is NOT the player name.
             // This is a problem. Code says `a.agent` is agent name.
             // But `round.abilityCasts` (line 234 parser) pushes `{ agent: agent, ability: ability }`. It does NOT push player name.
             // ERROR IN PARSER logic if I want to track by Player Name.
             
             // BUT `round.kills` has player name.
             // I can map Agent -> PlayerName using `digest.meta.roster`? No, digest is being built.
             // `matchData.players` has Name->Agent. I can reverse it if 1:1.
             // But typically duplicate agents are impossible in Pro play.
             // So Agent Name is a proxy key.
             
             // Let's stick to KILLS for now (Engagement Anchoring). It's safer.
             // Ability anchoring requires fixing parser to include Player Name in abilityCasts.
          }
      });
  }



  // 6. First Blood Vulnerability (Defense) & Opening Duel Strength
  let openingDeath = null;
  let openingKiller = null;
  
  if (firstBlood) {
      if (firstBlood.victimTeam === targetTeam && targetSide === 'defender') {
          openingDeath = firstBlood.victim; // Weak Link (Died first on Defense)
      }
      if (firstBlood.killerTeam === targetTeam) {
          openingKiller = firstBlood.killer; // Star Player (Got first kill)
      }
  }

  return {
    round: round.roundNumber,
    side: targetSide,
    result,
    type: winType,
    buy: buyType,       // "Full Buy"
    loadoutVal: loadoutVal, // Team Total
    metrics: { ttfk, plantTime, lurker: lurkerInfo, anchors: anchors, openingDeath, openingKiller }, // NEW: Opponent Killer
    keyEvents: {
      fb: firstBlood,
      plant,
      defuse,
      abilities
    },
    killFlow: kills.map(k => {
        let kz = 'Unknown';
        let vz = 'Unknown';
        if (k.killerPos) kz = zoneEngine.getZone(mapName, k.killerPos.x, k.killerPos.y) || 'Unknown';
        if (k.victimPos) vz = zoneEngine.getZone(mapName, k.victimPos.x, k.victimPos.y) || 'Unknown';
        
        return {
          t: Math.round(k.time / 1000),
          k: k.killer?.name,
          ka: k.killer?.agent,
          kz: kz,
          v: k.victim?.name,
          va: k.victim?.agent,
          vz: vz,
          w: k.weapon || 'gun'
        };
    }),
    trades: tradeEvents
  };
}

function analyzeTrades(kills, targetTeam) {
    let opportunities = 0;
    let executed = 0;
    const TRADE_WINDOW = 5000; // 5 seconds

    const relevantDeaths = kills.filter(k => k.victim?.teamName === targetTeam);
    
    for (const death of relevantDeaths) {
        opportunities++;
        const deathTime = death.time;
        // Check if killer died within window
        const tradeKill = kills.find(k => 
            k.victim?.name === death.killer?.name && // Killer becomes victim
            k.time > deathTime &&
            k.time <= deathTime + TRADE_WINDOW
        );
        if (tradeKill) executed++;
    }

    return {
        opportunities,
        executed
    };
}

module.exports = {
  buildMatchDigest
};
