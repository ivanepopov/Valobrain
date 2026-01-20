/**
 * Pattern Detector v2
 * 
 * Generates claims from zone-state data with full evidence.
 * Works with kill-based zone detection since GRID doesn't provide continuous positions.
 */

const zoneEngine = require('./zone-state-engine');

// ================== CLAIM SCHEMA ==================

function createClaim({
  pattern,
  category,
  description,
  recommendation,
  rounds = [],
  count = 0,
  denominator = 0,
  phases = [],
  zones = [],
  timestamps = [],
  exampleEvents = [],
  additionalData = {}
}) {
  const percentage = denominator > 0 ? Math.round((count / denominator) * 100) : 0;
  const confidence = computeConfidence({ count, denominator, rounds });
  
  return {
    id: `${pattern}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    pattern,
    category,
    confidence: confidence.score,
    confidenceFactors: confidence.factors,
    evidence: {
      rounds,
      count,
      denominator,
      percentage,
      phases,
      zones,
      timestamps,
      exampleEvents
    },
    description,
    recommendation,
    ...additionalData
  };
}

// ================== CONFIDENCE SCORING ==================

function computeConfidence({ count, denominator, rounds, totalRounds = null }) {
  const n = Math.max(denominator, rounds?.length || 0, 1);
  const frequency = count / n;
  const sampleFactor = Math.min(1.0, n / 8);
  const consistency = computeConsistency(rounds || []);
  const recency = computeRecency(rounds || [], totalRounds || Math.max(...(rounds || [1]), 1));
  
  const score = (frequency * 0.4) + (sampleFactor * 0.25) + (consistency * 0.2) + (recency * 0.15);
  
  return {
    score: Math.round(score * 100) / 100,
    factors: {
      frequency: Math.round(frequency * 100) / 100,
      sampleSize: n,
      sampleFactor: Math.round(sampleFactor * 100) / 100,
      consistency: Math.round(consistency * 100) / 100,
      recency: Math.round(recency * 100) / 100
    },
    label: score >= 0.8 ? 'high' : score >= 0.6 ? 'moderate' : score >= 0.4 ? 'low' : 'insufficient'
  };
}

function computeConsistency(rounds) {
  if (!rounds || rounds.length < 2) return 1.0;
  const sorted = [...rounds].sort((a, b) => a - b);
  const gaps = [];
  for (let i = 1; i < sorted.length; i++) {
    gaps.push(sorted[i] - sorted[i - 1]);
  }
  const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const variance = gaps.reduce((sum, g) => sum + Math.pow(g - avgGap, 2), 0) / gaps.length;
  return Math.max(0, 1 - (variance / 100));
}

function computeRecency(rounds, totalRounds) {
  if (!rounds || rounds.length === 0 || totalRounds === 0) return 0.5;
  const avgRound = rounds.reduce((a, b) => a + b, 0) / rounds.length;
  return avgRound / totalRounds;
}

// ================== TEMPO DETECTION ==================

function detectTempo(roundsData, teamName) {
  const claims = [];
  const tempoData = [];
  
  for (const round of roundsData) {
    if (round.overrides?.roundTakesForm !== null && round.overrides?.roundTakesForm !== undefined) {
      tempoData.push({
        round: round.roundNumber,
        timeToContact: round.overrides.roundTakesForm,
        timeToPlant: round.plantTime || null,
        isRush: round.overrides.rushDetected,
        firstContactZone: round.firstContactZone
      });
    }
  }
  
  if (tempoData.length < 4) return claims;
  
  const avgTimeToContact = tempoData.reduce((sum, d) => sum + d.timeToContact, 0) / tempoData.length;
  const rushRounds = tempoData.filter(d => d.isRush).map(d => d.round);
  const slowRounds = tempoData.filter(d => d.timeToContact > 40).map(d => d.round);
  
  let tempoClass, tempoDesc, tempoRec;
  
  if (avgTimeToContact < 15) {
    tempoClass = 'aggressive';
    tempoDesc = `Aggressive tempo. Average time to first contact: ${Math.round(avgTimeToContact)}s`;
    tempoRec = 'Setup early. Use delay utility on chokes. They will push dry into angles.';
  } else if (avgTimeToContact < 30) {
    tempoClass = 'balanced';
    tempoDesc = `Balanced tempo. Average time to first contact: ${Math.round(avgTimeToContact)}s`;
    tempoRec = 'Standard setup. Be ready for both early aggression and late execute.';
  } else {
    tempoClass = 'slow_default';
    tempoDesc = `Slow default tempo. Average time to first contact: ${Math.round(avgTimeToContact)}s`;
    tempoRec = 'Do NOT waste utility early. Hold angles. They execute with 0:30 remaining.';
  }
  
  claims.push(createClaim({
    pattern: `tempo_${tempoClass}`,
    category: 'attack_macro',
    description: tempoDesc,
    recommendation: tempoRec,
    rounds: tempoData.map(d => d.round),
    count: tempoData.length,
    denominator: roundsData.length,
    phases: ['early', 'mid'],
    timestamps: tempoData.map(d => ({
      round: d.round,
      time: d.timeToContact,
      eventType: 'first_contact'
    })),
    additionalData: {
      avgTimeToContact: Math.round(avgTimeToContact),
      rushRoundCount: rushRounds.length,
      slowRoundCount: slowRounds.length
    }
  }));
  
  if (rushRounds.length >= 3) {
    claims.push(createClaim({
      pattern: 'rush_tendency',
      category: 'attack_macro',
      description: `Rush tendency detected. ${rushRounds.length} rounds with contact under 12 seconds.`,
      recommendation: 'If early contact → Expect full commit. Fall back, use delay utility, trade.',
      rounds: rushRounds,
      count: rushRounds.length,
      denominator: roundsData.length,
      phases: ['early']
    }));
  }
  
  return claims;
}

// ================== FIRST BLOOD DETECTION ==================

function detectFirstBlood(roundsData, playerStats) {
  const claims = [];
  const players = Object.values(playerStats || {});
  const totalRounds = roundsData.length;
  
  if (totalRounds < 4 || players.length === 0) return claims;
  
  const sortedByFD = [...players].sort((a, b) => (b.firstDeaths || 0) - (a.firstDeaths || 0));
  const weakLink = sortedByFD[0];
  
  if (weakLink && weakLink.firstDeaths >= 4) {
    const fdPercent = Math.round((weakLink.firstDeaths / totalRounds) * 100);
    claims.push(createClaim({
      pattern: 'weak_link',
      category: 'player_tendency',
      description: `${weakLink.name} dies first in ${fdPercent}% of rounds (${weakLink.firstDeaths}/${totalRounds})`,
      recommendation: `Target Priority: ${weakLink.name}. Execute toward their position. High probability of opening kill.`,
      rounds: [],
      count: weakLink.firstDeaths,
      denominator: totalRounds,
      additionalData: {
        playerName: weakLink.name,
        playerId: weakLink.id,
        fkFdDiff: (weakLink.firstKills || 0) - weakLink.firstDeaths
      }
    }));
  }
  
  const sortedByFK = [...players].sort((a, b) => (b.firstKills || 0) - (a.firstKills || 0));
  const fkLeader = sortedByFK[0];
  
  if (fkLeader && fkLeader.firstKills >= 4) {
    const fkPercent = Math.round((fkLeader.firstKills / totalRounds) * 100);
    claims.push(createClaim({
      pattern: 'opening_duel_king',
      category: 'player_tendency',
      description: `${fkLeader.name} secures first blood in ${fkPercent}% of rounds (${fkLeader.firstKills}/${totalRounds})`,
      recommendation: `Watch for ${fkLeader.name} aggressive peeks. Double swing or flash before engaging.`,
      rounds: [],
      count: fkLeader.firstKills,
      denominator: totalRounds,
      additionalData: {
        playerName: fkLeader.name,
        playerId: fkLeader.id,
        fkFdDiff: fkLeader.firstKills - (fkLeader.firstDeaths || 0)
      }
    }));
  }
  
  return claims;
}

// ================== SITE BIAS DETECTION ==================

function detectSiteBias(roundsData) {
  const claims = [];
  const plantSites = {};
  
  for (const round of roundsData) {
    const site = round.plantInfo?.site;
    if (site) {
      plantSites[site] = plantSites[site] || [];
      plantSites[site].push(round.roundNumber);
    }
  }
  
  const totalPlants = Object.values(plantSites).reduce((sum, arr) => sum + arr.length, 0);
  
  if (totalPlants < 4) return claims;
  
  for (const [site, rounds] of Object.entries(plantSites)) {
    const percentage = Math.round((rounds.length / totalPlants) * 100);
    
    if (percentage >= 60 && rounds.length >= 4) {
      claims.push(createClaim({
        pattern: `site_bias_${site.toLowerCase()}`,
        category: 'attack_macro',
        description: `${site}-Site bias detected. ${percentage}% of plants (${rounds.length}/${totalPlants}) go to ${site}.`,
        recommendation: `Stack ${site}-Site or use aggressive utility. They will avoid weak side.`,
        rounds,
        count: rounds.length,
        denominator: totalPlants,
        zones: [`${site}-Site`]
      }));
    }
  }
  
  return claims;
}

// ================== FIRST CONTACT ZONE DETECTION ==================

function detectFirstContactPatterns(roundsData) {
  const claims = [];
  const zoneContacts = {};
  
  for (const round of roundsData) {
    const zone = round.firstContactZone;
    if (zone) {
      zoneContacts[zone] = zoneContacts[zone] || [];
      zoneContacts[zone].push(round.roundNumber);
    }
  }
  
  const totalContacts = Object.values(zoneContacts).reduce((sum, arr) => sum + arr.length, 0);
  
  if (totalContacts < 4) return claims;
  
  for (const [zone, rounds] of Object.entries(zoneContacts)) {
    const percentage = Math.round((rounds.length / totalContacts) * 100);
    
    if (percentage >= 40 && rounds.length >= 4) {
      // Determine if attack or defend side based on zone type
      const isMid = zone.toLowerCase().includes('mid');
      const isLobby = zone.toLowerCase().includes('lobby') || zone.toLowerCase().includes('main');
      
      let recommendation;
      if (isMid) {
        recommendation = `Expect mid control plays. Contest mid early or concede and stack sites.`;
      } else if (isLobby) {
        recommendation = `Expect ${zone.replace('-Lobby', '').replace('-Main', '')} aggression. Setup utility early at ${zone}.`;
      } else {
        recommendation = `First contact often at ${zone}. Adjust positioning accordingly.`;
      }
      
      claims.push(createClaim({
        pattern: `first_contact_${zone.toLowerCase().replace(/[- ]/g, '_')}`,
        category: 'attack_macro',
        description: `First contact at ${zone} in ${percentage}% of rounds (${rounds.length}/${totalContacts}).`,
        recommendation,
        rounds,
        count: rounds.length,
        denominator: totalContacts,
        zones: [zone]
      }));
    }
  }
  
  return claims;
}

// ================== KILL ZONE PATTERNS ==================

function detectKillZonePatterns(roundsData) {
  const claims = [];
  const zoneKillTotals = {};
  const attackerZoneKills = {};
  const defenderZoneKills = {};
  
  for (const round of roundsData) {
    for (const kill of (round.kills || [])) {
      const zone = kill.victim?.zone;
      if (!zone) continue;
      
      zoneKillTotals[zone] = (zoneKillTotals[zone] || 0) + 1;
      
      if (kill.killer?.side === 'attacker') {
        attackerZoneKills[zone] = (attackerZoneKills[zone] || 0) + 1;
      } else {
        defenderZoneKills[zone] = (defenderZoneKills[zone] || 0) + 1;
      }
    }
  }
  
  const totalKills = Object.values(zoneKillTotals).reduce((sum, c) => sum + c, 0);
  
  if (totalKills < 10) return claims;
  
  // Find dominant zones for each side
  const sortedAttacker = Object.entries(attackerZoneKills).sort((a, b) => b[1] - a[1]);
  const sortedDefender = Object.entries(defenderZoneKills).sort((a, b) => b[1] - a[1]);
  
  // Attacker kill zone
  if (sortedAttacker.length > 0) {
    const [zone, kills] = sortedAttacker[0];
    const attackerTotalKills = Object.values(attackerZoneKills).reduce((s, c) => s + c, 0);
    const percentage = Math.round((kills / attackerTotalKills) * 100);
    
    if (percentage >= 25 && kills >= 5) {
      claims.push(createClaim({
        pattern: `attacker_kill_zone_${zone.toLowerCase().replace(/[- ]/g, '_')}`,
        category: 'attack_macro',
        description: `Attack secures ${percentage}% of kills in ${zone} (${kills}/${attackerTotalKills} kills).`,
        recommendation: `They execute through ${zone}. Stack defense there or use utility to delay.`,
        rounds: [],
        count: kills,
        denominator: attackerTotalKills,
        zones: [zone]
      }));
    }
  }
  
  // Defender kill zone
  if (sortedDefender.length > 0) {
    const [zone, kills] = sortedDefender[0];
    const defenderTotalKills = Object.values(defenderZoneKills).reduce((s, c) => s + c, 0);
    const percentage = Math.round((kills / defenderTotalKills) * 100);
    
    if (percentage >= 25 && kills >= 5) {
      claims.push(createClaim({
        pattern: `defender_kill_zone_${zone.toLowerCase().replace(/[- ]/g, '_')}`,
        category: 'defense_macro',
        description: `Defense secures ${percentage}% of kills in ${zone} (${kills}/${defenderTotalKills} kills).`,
        recommendation: `Avoid ${zone} or overwhelm with numbers. They have strong angles there.`,
        rounds: [],
        count: kills,
        denominator: defenderTotalKills,
        zones: [zone]
      }));
    }
  }
  
  return claims;
}

// ================== PISTOL ROUND DETECTION ==================

function detectPistolPatterns(roundsData) {
  const claims = [];
  const pistolRounds = [1, 13]; // First round of each half
  
  const pistolData = roundsData.filter(r => pistolRounds.includes(r.roundNumber));
  
  if (pistolData.length < 2) return claims;
  
  // Analyze pistol round tempo
  const pistolTempo = pistolData.map(r => ({
    round: r.roundNumber,
    timeToContact: r.overrides?.roundTakesForm,
    planted: !!r.plantInfo,
    plantTime: r.plantTime
  }));
  
  // Check for aggressive pistol pattern
  const aggressivePistols = pistolTempo.filter(p => p.timeToContact && p.timeToContact < 15);
  
  if (aggressivePistols.length >= 1) {
    claims.push(createClaim({
      pattern: 'pistol_aggressive',
      category: 'attack_macro',
      description: `Aggressive pistol rounds. ${aggressivePistols.length}/${pistolData.length} pistols have contact under 15s.`,
      recommendation: 'Expect early aggression on pistol. Setup crossfires at chokes. Use abilities to delay.',
      rounds: aggressivePistols.map(p => p.round),
      count: aggressivePistols.length,
      denominator: pistolData.length,
      phases: ['early']
    }));
  }
  
  // Check for default pistol pattern
  const slowPistols = pistolTempo.filter(p => p.timeToContact && p.timeToContact > 30);
  
  if (slowPistols.length >= 1) {
    claims.push(createClaim({
      pattern: 'pistol_default',
      category: 'attack_macro',
      description: `Default pistol rounds. ${slowPistols.length}/${pistolData.length} pistols play slow.`,
      recommendation: 'On pistol, save utility. They will execute late. Use smokes on retake.',
      rounds: slowPistols.map(p => p.round),
      count: slowPistols.length,
      denominator: pistolData.length,
      phases: ['mid', 'late']
    }));
  }
  
  return claims;
}

// ================== ECO ROUND DETECTION ==================

// Eco thresholds for Valorant (approximate loadout values)
const ECO_THRESHOLD = 2000; // Low spending rounds
const FORCE_THRESHOLD = 5000; // Mid spending
const FULL_BUY_THRESHOLD = 10000; // Full buy

function detectEcoPatterns(roundsData) {
  const claims = [];
  
  // Track round outcomes by buy type
  const ecoRounds = [];
  const forceRounds = [];
  
  for (const round of roundsData) {
    // Estimate buy type from kill-death ratio and tempo
    // Since we don't have loadout data directly, we use heuristics:
    // - Eco: Fast deaths, low trades (team gets eliminated quickly)
    // - Force: Mixed results
    // - Full buy: Slower rounds, more trades
    
    const kills = round.kills || [];
    const attackerKills = kills.filter(k => k.killer?.side === 'attacker').length;
    const defenderKills = kills.filter(k => k.killer?.side === 'defender').length;
    
    // Quick elimination (eco indicator): one side has 4+ kills and round ends under 60s
    const roundDuration = round.checkpoints?.final?.time || 100;
    const quickElim = (attackerKills >= 4 || defenderKills >= 4) && roundDuration < 50;
    
    if (quickElim) {
      if (attackerKills >= 4) {
        ecoRounds.push({ round: round.roundNumber, side: 'defender_eco', duration: roundDuration });
      } else {
        ecoRounds.push({ round: round.roundNumber, side: 'attacker_eco', duration: roundDuration });
      }
    }
  }
  
  // Analyze eco aggression
  const attackerEcos = ecoRounds.filter(e => e.side === 'attacker_eco');
  const defenderEcos = ecoRounds.filter(e => e.side === 'defender_eco');
  
  if (attackerEcos.length >= 3) {
    claims.push(createClaim({
      pattern: 'anti_eco_strong',
      category: 'defense_macro',
      description: `Defense dominates eco rounds. ${attackerEcos.length} rounds where attack eliminated quickly.`,
      recommendation: 'On eco, expect disciplined defense. Play for picks, don\'t dry peek.',
      rounds: attackerEcos.map(e => e.round),
      count: attackerEcos.length,
      denominator: roundsData.length
    }));
  }
  
  if (defenderEcos.length >= 3) {
    claims.push(createClaim({
      pattern: 'eco_vulnerable',
      category: 'attack_macro',
      description: `Attack dominates eco rounds. ${defenderEcos.length} rounds where defense eliminated quickly.`,
      recommendation: 'Push eco rounds hard. They struggle defending with limited utility.',
      rounds: defenderEcos.map(e => e.round),
      count: defenderEcos.length,
      denominator: roundsData.length
    }));
  }
  
  return claims;
}

// ================== CLUTCH DETECTION ==================

function detectClutchPatterns(roundsData, playerStats) {
  const claims = [];
  const clutchSituations = [];
  const playerClutches = {};
  
  for (const round of roundsData) {
    const kills = round.kills || [];
    
    // Track alive players through the round
    let attackersAlive = 5;
    let defendersAlive = 5;
    
    for (let i = 0; i < kills.length; i++) {
      const kill = kills[i];
      const victimSide = kill.victim?.side;
      
      if (victimSide === 'attacker') attackersAlive--;
      if (victimSide === 'defender') defendersAlive--;
      
      // Clutch situation: 1vX where X >= 1
      const is1vX = (attackersAlive === 1 && defendersAlive >= 1) || 
                    (defendersAlive === 1 && attackersAlive >= 1);
      
      if (is1vX) {
        const clutchSide = attackersAlive === 1 ? 'attacker' : 'defender';
        const opponents = clutchSide === 'attacker' ? defendersAlive : attackersAlive;
        
        // Find remaining player (last killer from clutch side before this point)
        const lastClutchKiller = kills
          .slice(0, i + 1)
          .reverse()
          .find(k => k.killer?.side === clutchSide);
        
        const clutcher = lastClutchKiller?.killer?.name || 'unknown';
        
        // Check if they won (planted/defused or eliminated opponents)
        const remainingKills = kills.slice(i + 1);
        const opponentsKilled = remainingKills.filter(k => k.killer?.side === clutchSide).length;
        const clutchWon = opponentsKilled >= opponents || 
                          (clutchSide === 'attacker' && round.plantInfo);
        
        clutchSituations.push({
          round: round.roundNumber,
          clutchSide,
          opponents,
          clutcher,
          won: clutchWon
        });
        
        if (clutchWon && clutcher !== 'unknown') {
          playerClutches[clutcher] = (playerClutches[clutcher] || 0) + 1;
        }
        
        break; // Only count first clutch situation per round
      }
    }
  }
  
  if (clutchSituations.length < 3) return claims;
  
  const totalClutches = clutchSituations.length;
  const wonClutches = clutchSituations.filter(c => c.won);
  const winRate = Math.round((wonClutches.length / totalClutches) * 100);
  
  if (wonClutches.length >= 2) {
    claims.push(createClaim({
      pattern: 'clutch_proficiency',
      category: 'player_tendency',
      description: `Won ${wonClutches.length}/${totalClutches} clutch situations (${winRate}% win rate).`,
      recommendation: 'Dangerous in clutches. Don\'t give 1v1s. Trade effectively.',
      rounds: wonClutches.map(c => c.round),
      count: wonClutches.length,
      denominator: totalClutches
    }));
  }
  
  // Find clutch master
  const sortedClutchers = Object.entries(playerClutches).sort((a, b) => b[1] - a[1]);
  if (sortedClutchers.length > 0 && sortedClutchers[0][1] >= 2) {
    const [name, count] = sortedClutchers[0];
    claims.push(createClaim({
      pattern: 'clutch_master',
      category: 'player_tendency',
      description: `${name} is a clutch specialist. Won ${count} clutch situations.`,
      recommendation: `Target ${name} early. Don't let them reach 1vX situations.`,
      rounds: [],
      count,
      denominator: totalClutches,
      additionalData: { playerName: name, clutchWins: count }
    }));
  }
  
  return claims;
}

// ================== CONDITIONING DETECTION ==================

function detectConditioningPatterns(roundsData) {
  const claims = [];
  
  if (roundsData.length < 6) return claims;
  
  // Track tempo changes (slow default → rush pattern)
  const tempoSequences = [];
  let consecutiveSlow = 0;
  let rushAfterSlow = 0;
  
  for (let i = 0; i < roundsData.length; i++) {
    const round = roundsData[i];
    const timeToContact = round.overrides?.roundTakesForm;
    
    if (timeToContact === null || timeToContact === undefined) continue;
    
    const isSlow = timeToContact > 35;
    const isRush = timeToContact < 12;
    
    if (isSlow) {
      consecutiveSlow++;
    } else if (isRush && consecutiveSlow >= 2) {
      // Rush after 2+ slow rounds = conditioning
      rushAfterSlow++;
      tempoSequences.push({
        round: round.roundNumber,
        slowRounds: consecutiveSlow,
        rushTime: timeToContact
      });
      consecutiveSlow = 0;
    } else {
      consecutiveSlow = 0;
    }
  }
  
  if (rushAfterSlow >= 2) {
    claims.push(createClaim({
      pattern: 'conditioning_slow_to_rush',
      category: 'conditioning',
      description: `Conditioning detected. ${rushAfterSlow}x rushed after playing slow for 2+ rounds.`,
      recommendation: 'After 2 slow rounds, expect rush. Pre-aim and use quick utility.',
      rounds: tempoSequences.map(s => s.round),
      count: rushAfterSlow,
      denominator: roundsData.length,
      additionalData: { sequences: tempoSequences }
    }));
  }
  
  // Track site switching after failed attempts
  const siteSequences = [];
  let lastSite = null;
  let consecutiveFailsOnSite = 0;
  
  for (const round of roundsData) {
    if (!round.plantInfo?.site) continue;
    
    const site = round.plantInfo.site;
    const won = round.winInfo?.side === 'attacker';
    
    if (site === lastSite && !won) {
      consecutiveFailsOnSite++;
    } else if (lastSite && consecutiveFailsOnSite >= 2 && site !== lastSite) {
      // Switched site after 2+ failed attempts
      siteSequences.push({
        round: round.roundNumber,
        fromSite: lastSite,
        toSite: site,
        failedAttempts: consecutiveFailsOnSite
      });
    } else {
      consecutiveFailsOnSite = 0;
    }
    
    lastSite = site;
  }
  
  if (siteSequences.length >= 2) {
    claims.push(createClaim({
      pattern: 'conditioning_site_switch',
      category: 'conditioning',
      description: `Site switching after failures. ${siteSequences.length}x switched sites after 2+ failed attempts.`,
      recommendation: 'After 2 failed executes, rotate heavy to opposite site.',
      rounds: siteSequences.map(s => s.round),
      count: siteSequences.length,
      denominator: roundsData.length,
      additionalData: { sequences: siteSequences }
    }));
  }
  
  return claims;
}

// ================== ECONOMY/BUY ROUND DETECTION ==================

// Valorant economy thresholds (approximate team loadout values)
const ECONOMY_THRESHOLDS = {
  ECO: 3000,      // Under 3k team loadout = eco
  FORCE: 12000,   // Under 12k = force/half buy
  FULL_BUY: 25000 // 25k+ = full buy
};

function detectEconomyBuyPatterns(roundsData) {
  const claims = [];
  
  // Pistol rounds are 1 and 13 (after side switch)
  const pistolRounds = [1, 13];
  const pistolLossRounds = [];
  const forceAfterLoss = [];
  
  for (let i = 0; i < roundsData.length; i++) {
    const round = roundsData[i];
    const roundNum = round.roundNumber;
    
    // Detect pistol round losses (for force buy analysis)
    if (pistolRounds.includes(roundNum)) {
      const lost = round.winInfo?.side === 'defender'; // Attacker POV
      if (lost) {
        pistolLossRounds.push(roundNum);
      }
    }
    
    // Check round after pistol loss
    if (pistolLossRounds.includes(roundNum - 1) && i + 1 < roundsData.length) {
      const nextRound = roundsData[i];
      const timeToContact = nextRound?.overrides?.roundTakesForm;
      
      // Fast contact after pistol loss = force buy aggression
      if (timeToContact && timeToContact < 20) {
        forceAfterLoss.push({
          round: nextRound.roundNumber,
          timeToContact
        });
      }
    }
  }
  
  if (forceAfterLoss.length >= 1) {
    claims.push(createClaim({
      pattern: 'economy_force_post_pistol',
      category: 'attack_macro',
      description: `Forces after pistol loss. ${forceAfterLoss.length}x aggressive with early contact (<20s).`,
      recommendation: 'After winning pistol, expect force buy aggression. Hold angles, don\'t overpeek.',
      rounds: forceAfterLoss.map(f => f.round),
      count: forceAfterLoss.length,
      denominator: pistolLossRounds.length || 1
    }));
  }
  
  // Detect eco round patterns (less aggressive, saving)
  const ecoRounds = [];
  const fullBuyRounds = [];
  
  for (const round of roundsData) {
    const timeToContact = round.overrides?.roundTakesForm;
    const kills = round.kills || [];
    const attackerKills = kills.filter(k => k.killer?.side === 'attacker').length;
    const defenderKills = kills.filter(k => k.killer?.side === 'defender').length;
    
    // Heuristic: Eco round = fast elimination of attackers (4+ defender kills, quick)
    if (defenderKills >= 4 && kills.length > 0) {
      const lastKillTime = kills[kills.length - 1]?.time || 100;
      if (lastKillTime < 60) {
        ecoRounds.push(round.roundNumber);
      }
    }
    
    // Full buy = close rounds with trades
    if (attackerKills >= 3 && defenderKills >= 3) {
      fullBuyRounds.push(round.roundNumber);
    }
  }
  
  if (ecoRounds.length >= 3) {
    claims.push(createClaim({
      pattern: 'economy_eco_struggles',
      category: 'attack_macro',
      description: `Struggles on eco rounds. ${ecoRounds.length} rounds with quick attacker elimination.`,
      recommendation: 'On eco rounds, play for picks. Don\'t dry peek - they struggle without util.',
      rounds: ecoRounds,
      count: ecoRounds.length,
      denominator: roundsData.length
    }));
  }
  
  return claims;
}

// ================== RETAKE PATTERN DETECTION ==================

function detectRetakePatterns(roundsData) {
  const claims = [];
  const retakeAttempts = [];
  
  for (const round of roundsData) {
    if (!round.plantInfo || !round.overrides?.postPlant) continue;
    
    // Find post-plant kills
    const postPlantKills = (round.kills || []).filter(k => {
      return k.phase === 'post_plant' || 
             (round.plantInfo?.time && k.time > round.plantInfo.time);
    });
    
    if (postPlantKills.length === 0) continue;
    
    const defenderPostPlantKills = postPlantKills.filter(k => k.killer?.side === 'defender');
    const attackerPostPlantKills = postPlantKills.filter(k => k.killer?.side === 'attacker');
    
    const retakeSuccess = round.winInfo?.side === 'defender';
    const defenderWonFights = defenderPostPlantKills.length > attackerPostPlantKills.length;
    
    retakeAttempts.push({
      round: round.roundNumber,
      site: round.plantInfo?.site || 'unknown',
      defenderKills: defenderPostPlantKills.length,
      attackerKills: attackerPostPlantKills.length,
      success: retakeSuccess,
      wonFights: defenderWonFights,
      retakeZones: [...new Set(defenderPostPlantKills.map(k => k.killer?.zone).filter(Boolean))]
    });
  }
  
  if (retakeAttempts.length < 3) return claims;
  
  const successfulRetakes = retakeAttempts.filter(r => r.success);
  const retakeWinRate = Math.round((successfulRetakes.length / retakeAttempts.length) * 100);
  
  // Retake proficiency
  if (retakeWinRate >= 50 && successfulRetakes.length >= 3) {
    claims.push(createClaim({
      pattern: 'retake_proficiency',
      category: 'defense_macro',
      description: `Strong retakes. ${retakeWinRate}% win rate on ${retakeAttempts.length} retake situations.`,
      recommendation: 'Don\'t give up post-plant. Their retakes are strong - play time, don\'t peek.',
      rounds: successfulRetakes.map(r => r.round),
      count: successfulRetakes.length,
      denominator: retakeAttempts.length
    }));
  }
  
  // Weak retakes
  if (retakeWinRate < 40 && retakeAttempts.length >= 4) {
    claims.push(createClaim({
      pattern: 'retake_weak',
      category: 'attack_macro',
      description: `Weak retakes. Only ${retakeWinRate}% win rate on ${retakeAttempts.length} retake situations.`,
      recommendation: 'Plant and hold. They struggle retaking - play safe post-plant.',
      rounds: retakeAttempts.filter(r => !r.success).map(r => r.round),
      count: retakeAttempts.length - successfulRetakes.length,
      denominator: retakeAttempts.length
    }));
  }
  
  // Identify retake zones
  const retakeZoneCounts = {};
  for (const attempt of successfulRetakes) {
    for (const zone of attempt.retakeZones) {
      retakeZoneCounts[zone] = (retakeZoneCounts[zone] || 0) + 1;
    }
  }
  
  const sortedRetakeZones = Object.entries(retakeZoneCounts).sort((a, b) => b[1] - a[1]);
  if (sortedRetakeZones.length > 0 && sortedRetakeZones[0][1] >= 2) {
    const [zone, count] = sortedRetakeZones[0];
    claims.push(createClaim({
      pattern: `retake_zone_${zone.toLowerCase().replace(/[- ]/g, '_')}`,
      category: 'defense_macro',
      description: `Retakes from ${zone}. ${count}x got kills retaking from this position.`,
      recommendation: `Clear ${zone} during post-plant. They retake from there frequently.`,
      rounds: [],
      count,
      denominator: successfulRetakes.length,
      zones: [zone]
    }));
  }
  
  return claims;
}

// ================== AGENT-SPECIFIC DETECTION ==================

// Valorant agent roles
const AGENT_ROLES = {
  // Duelists
  jett: 'duelist', reyna: 'duelist', raze: 'duelist', phoenix: 'duelist', 
  yoru: 'duelist', neon: 'duelist', iso: 'duelist',
  // Initiators
  sova: 'initiator', breach: 'initiator', skye: 'initiator', 
  kayo: 'initiator', fade: 'initiator', gekko: 'initiator',
  // Controllers
  brimstone: 'controller', omen: 'controller', viper: 'controller', 
  astra: 'controller', harbor: 'controller', clove: 'controller',
  // Sentinels
  sage: 'sentinel', cypher: 'sentinel', killjoy: 'sentinel', 
  chamber: 'sentinel', deadlock: 'sentinel', vyse: 'sentinel'
};

function detectAgentPatterns(roundsData, playerStats) {
  const claims = [];
  const players = Object.values(playerStats || {});
  const totalRounds = roundsData.length;
  
  if (totalRounds < 4 || players.length === 0) return claims;
  
  // Analyze each player with agent data
  for (const player of players) {
    if (!player.character) continue;
    
    const agent = player.character.toLowerCase();
    const role = AGENT_ROLES[agent] || 'unknown';
    const agentDisplay = agent.charAt(0).toUpperCase() + agent.slice(1);
    
    // Duelist entry analysis
    if (role === 'duelist') {
      const fkRate = totalRounds > 0 ? (player.firstKills || 0) / totalRounds : 0;
      const fdRate = totalRounds > 0 ? (player.firstDeaths || 0) / totalRounds : 0;
      
      // Aggressive duelist (high FK rate)
      if (fkRate >= 0.25 && player.firstKills >= 4) {
        claims.push(createClaim({
          pattern: `agent_aggressive_${agent}`,
          category: 'player_tendency',
          description: `${player.name} on ${agentDisplay} is aggressive entry. First blood ${Math.round(fkRate * 100)}% of rounds.`,
          recommendation: `Expect ${agentDisplay} early aggression. Pre-aim common angles, use flashes before engaging.`,
          rounds: [],
          count: player.firstKills,
          denominator: totalRounds,
          additionalData: { playerName: player.name, agent, role, fkRate }
        }));
      }
      
      // Passive/lurking duelist (low FK, but gets kills)
      if (fkRate < 0.15 && player.kills >= 15 && role === 'duelist') {
        claims.push(createClaim({
          pattern: `agent_lurk_${agent}`,
          category: 'player_tendency',
          description: `${player.name} on ${agentDisplay} plays passive/lurk. Only ${Math.round(fkRate * 100)}% first bloods but ${player.kills} kills.`,
          recommendation: `Watch flank from ${agentDisplay}. They lurk instead of entry - clear lurk spots.`,
          rounds: [],
          count: player.kills,
          denominator: totalRounds,
          additionalData: { playerName: player.name, agent, role, style: 'lurk' }
        }));
      }
    }
    
    // Sentinel anchor analysis
    if (role === 'sentinel') {
      const fdRate = totalRounds > 0 ? (player.firstDeaths || 0) / totalRounds : 0;
      
      // Sentinel that dies often (weak anchor)
      if (fdRate >= 0.20 && player.firstDeaths >= 4) {
        claims.push(createClaim({
          pattern: `agent_weak_anchor_${agent}`,
          category: 'player_tendency',
          description: `${player.name} on ${agentDisplay} is vulnerable. Dies first ${Math.round(fdRate * 100)}% of rounds.`,
          recommendation: `Attack toward ${agentDisplay}'s site. Their utility won't stop you if they die early.`,
          rounds: [],
          count: player.firstDeaths,
          denominator: totalRounds,
          additionalData: { playerName: player.name, agent, role, fdRate }
        }));
      }
      
      // Strong sentinel (rarely dies first)
      if (fdRate < 0.10 && player.kills >= 10) {
        claims.push(createClaim({
          pattern: `agent_strong_anchor_${agent}`,
          category: 'player_tendency',
          description: `${player.name} on ${agentDisplay} is reliable anchor. Only ${Math.round(fdRate * 100)}% first deaths.`,
          recommendation: `${agentDisplay}'s site is well-held. Use utility to clear traps/setups before entry.`,
          rounds: [],
          count: player.kills,
          denominator: totalRounds,
          additionalData: { playerName: player.name, agent, role, style: 'anchor' }
        }));
      }
    }
    
    // Controller smoke analysis
    if (role === 'controller' && player.deaths >= 10) {
      const kdRatio = player.kills / Math.max(player.deaths, 1);
      
      if (kdRatio < 0.8) {
        claims.push(createClaim({
          pattern: `agent_vulnerable_controller_${agent}`,
          category: 'player_tendency',
          description: `${player.name} on ${agentDisplay} is weak. ${player.kills}/${player.deaths} K/D.`,
          recommendation: `Push through ${agentDisplay}'s smokes. They're not getting kills to stop you.`,
          rounds: [],
          count: player.deaths,
          denominator: totalRounds,
          additionalData: { playerName: player.name, agent, role, kd: kdRatio }
        }));
      }
    }
    
    // Initiator info gathering
    if (role === 'initiator' && player.firstKills >= 3) {
      claims.push(createClaim({
        pattern: `agent_fragging_initiator_${agent}`,
        category: 'player_tendency',
        description: `${player.name} on ${agentDisplay} frags as initiator. ${player.firstKills} first bloods.`,
        recommendation: `${agentDisplay} plays aggressive. Expect early util + swing. Don't give free duels.`,
        rounds: [],
        count: player.firstKills,
        denominator: totalRounds,
        additionalData: { playerName: player.name, agent, role }
      }));
    }
  }
  
  return claims;
}

// ================== MAIN DETECTION ==================

function detectAllPatterns(roundsData, playerStats, teamName) {
  const bundles = {
    attack_macro: [],
    defense_macro: [],
    conditioning: [],
    player_tendency: [],
    counter_strat: []
  };
  
  // Run all detectors
  const tempoClaims = detectTempo(roundsData, teamName);
  const fbClaims = detectFirstBlood(roundsData, playerStats);
  const siteBiasClaims = detectSiteBias(roundsData);
  const firstContactClaims = detectFirstContactPatterns(roundsData);
  const killZoneClaims = detectKillZonePatterns(roundsData);
  const pistolClaims = detectPistolPatterns(roundsData);
  const ecoClaims = detectEcoPatterns(roundsData);
  const clutchClaims = detectClutchPatterns(roundsData, playerStats);
  const agentClaims = detectAgentPatterns(roundsData, playerStats);
  const conditioningClaims = detectConditioningPatterns(roundsData);
  const economyClaims = detectEconomyBuyPatterns(roundsData);
  const retakeClaims = detectRetakePatterns(roundsData);
  
  // Categorize attack macro claims
  for (const claim of [...tempoClaims, ...siteBiasClaims, ...firstContactClaims, ...pistolClaims]) {
    if (claim.confidence >= 0.4) {
      bundles.attack_macro.push(claim);
    }
  }
  
  for (const claim of killZoneClaims) {
    if (claim.confidence >= 0.4) {
      if (claim.category === 'defense_macro') {
        bundles.defense_macro.push(claim);
      } else {
        bundles.attack_macro.push(claim);
      }
    }
  }
  
  for (const claim of ecoClaims) {
    if (claim.confidence >= 0.4) {
      if (claim.category === 'defense_macro') {
        bundles.defense_macro.push(claim);
      } else {
        bundles.attack_macro.push(claim);
      }
    }
  }
  
  for (const claim of [...fbClaims, ...clutchClaims, ...agentClaims]) {
    if (claim.confidence >= 0.4) {
      bundles.player_tendency.push(claim);
    }
  }
  
  // Add conditioning claims
  for (const claim of conditioningClaims) {
    if (claim.confidence >= 0.4) {
      bundles.conditioning.push(claim);
    }
  }
  
  // Add economy and retake claims
  for (const claim of [...economyClaims, ...retakeClaims]) {
    if (claim.confidence >= 0.4) {
      if (claim.category === 'defense_macro') {
        bundles.defense_macro.push(claim);
      } else {
        bundles.attack_macro.push(claim);
      }
    }
  }
  
  // Generate counter-strats
  bundles.counter_strat = generateCounterStrats(bundles);
  
  return bundles;
}

function generateCounterStrats(bundles) {
  const counterStrats = [];
  
  const slowClaim = bundles.attack_macro.find(c => c.pattern === 'tempo_slow_default');
  if (slowClaim) {
    counterStrats.push(createClaim({
      pattern: 'counter_early_aggression',
      category: 'counter_strat',
      description: 'Counter: Push early to disrupt slow default.',
      recommendation: 'Take early map control. Force them to react before setup complete.',
      rounds: slowClaim.evidence.rounds,
      count: slowClaim.evidence.count,
      denominator: slowClaim.evidence.denominator,
      additionalData: { basedOn: slowClaim.pattern }
    }));
  }
  
  const siteBias = bundles.attack_macro.find(c => c.pattern.startsWith('site_bias_'));
  if (siteBias) {
    const site = siteBias.evidence.zones?.[0] || 'preferred site';
    counterStrats.push(createClaim({
      pattern: 'counter_stack_site',
      category: 'counter_strat',
      description: `Counter: Heavy stack ${site} to deny their preferred play.`,
      recommendation: `3+ defenders on ${site}. Leave 1-2 on weak side for rotate.`,
      rounds: siteBias.evidence.rounds,
      count: siteBias.evidence.count,
      denominator: siteBias.evidence.denominator,
      additionalData: { basedOn: siteBias.pattern }
    }));
  }
  
  // Counter for aggressive pistols
  const aggroPistol = bundles.attack_macro.find(c => c.pattern === 'pistol_aggressive');
  if (aggroPistol) {
    counterStrats.push(createClaim({
      pattern: 'counter_pistol_stack',
      category: 'counter_strat',
      description: 'Counter: 5-stack on pistol to stop early aggression.',
      recommendation: 'On pistol, play 5 together at expected aggression point. Get trades.',
      rounds: aggroPistol.evidence.rounds,
      count: aggroPistol.evidence.count,
      denominator: aggroPistol.evidence.denominator,
      additionalData: { basedOn: aggroPistol.pattern }
    }));
  }
  
  return counterStrats;
}

// ================== EXPORTS ==================

module.exports = {
  createClaim,
  computeConfidence,
  detectTempo,
  detectFirstBlood,
  detectSiteBias,
  detectFirstContactPatterns,
  detectKillZonePatterns,
  detectPistolPatterns,
  detectEcoPatterns,
  detectClutchPatterns,
  detectAgentPatterns,
  detectConditioningPatterns,
  detectEconomyBuyPatterns,
  detectRetakePatterns,
  detectAllPatterns,
  generateCounterStrats,
  AGENT_ROLES,
  ECONOMY_THRESHOLDS
};

