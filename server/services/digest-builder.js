/**
 * Digest Builder Service
 * 
 * Compresses raw JSONL events into a high-density "Match Digest" JSON 
 * suitable for LLM context windows.
 */

const zoneEngine = require('./zone-state-engine');

/**
 * Build a compact match digest from raw processed rounds
 * @param {Object} matchData - Output from processing JSONL (rounds, players, mapName)
 * @param {string} targetTeam - Team to focus analysis on
 */
function buildMatchDigest(matchData, targetTeam) {
  const { rounds, players } = matchData;
  let mapName = matchData.mapName;
  
  // 0. Auto-Detect Map if Unknown
  if (!mapName || mapName === 'Unknown') {
      mapName = detectMap(rounds);
      console.log(`[Digest] Auto-Detected Map: ${mapName}`);
  }

  // 1. Convert each round into a dense summary FIRST
  const roundSummaries = [];
  for (const round of rounds) {
    roundSummaries.push(summarizeRound(round, targetTeam, mapName));
  }

  // 2. Build stats using the summaries (for trade aggregation) and raw rounds (for wins)
  const stats = buildTeamStats(rounds, roundSummaries, targetTeam);

  const digest = {
    meta: {
      map: mapName,
      targetTeam,
      roster: players, // Name -> Agent map
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
  const wins = rounds.filter(r => r.winInfo?.winner === targetTeam).length;
  
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
  
  return {
    targetTeam,
    totalRounds: rounds.length,
    wins,
    winRate: Math.round((wins / rounds.length) * 100),
    tradeEfficiency: `${tradeEfficiency}% (${totalTraded}/${totalDeaths})`,
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

  const result = round.winInfo?.winner === targetTeam ? 'WIN' : 'LOSS';
  const winType = round.winInfo?.type || 'elimination';

  const kills = (round.kills || []).sort((a, b) => a.time - b.time);
  const firstBlood = kills[0] ? {
    killer: kills[0].killer?.name,
    killerAgent: kills[0].killer?.agent, 
    victim: kills[0].victim?.name,
    victimAgent: kills[0].victim?.agent, 
    killerTeam: kills[0].killer?.teamName,
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

  return {
    round: round.roundNumber,
    side: targetSide,
    result,
    type: winType,
    buy: buyType,       // "Full Buy"
    loadoutVal: loadoutVal, // Team Total
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
