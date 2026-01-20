/**
 * Zone-State Engine v2
 * 
 * Transforms JSONL events into zone activity data.
 * NOTE: GRID API only provides positions in kill/damage events, not continuous tracking.
 * This version focuses on extractable data: kill zones, first contact, site plants.
 */

const fs = require('fs');
const path = require('path');

// Load zone definitions
const ZONE_DEFS_PATH = path.join(__dirname, '../data/zone-definitions.json');
let zoneDefinitions = null;

/**
 * Initialize the zone definitions from JSON
 */
function initialize() {
  try {
    const data = fs.readFileSync(ZONE_DEFS_PATH, 'utf8');
    zoneDefinitions = JSON.parse(data);
    console.log('ZoneStateEngine: Loaded zone definitions for', Object.keys(zoneDefinitions).filter(k => k !== 'version' && k !== 'coordSystem' && k !== 'notes'));
    return true;
  } catch (error) {
    console.error('ZoneStateEngine: Failed to load zone definitions:', error.message);
    return false;
  }
}

// ================== GEOMETRY HELPERS ==================

/**
 * Point-in-polygon test using ray casting algorithm
 */
function pointInPolygon(x, y, polygon, buffer = 0) {
  let inside = false;
  const n = polygon.length;
  
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  
  if (!inside && buffer > 0) {
    inside = distanceToPolygon(x, y, polygon) <= buffer;
  }
  
  return inside;
}

function distanceToPolygon(x, y, polygon) {
  let minDist = Infinity;
  const n = polygon.length;
  
  for (let i = 0; i < n; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % n];
    const dist = pointToLineDistance(x, y, p1.x, p1.y, p2.x, p2.y);
    minDist = Math.min(minDist, dist);
  }
  
  return minDist;
}

function pointToLineDistance(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;
  
  if (lengthSq === 0) {
    return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
  }
  
  let t = ((px - x1) * dx + (py - y1) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  
  const nearestX = x1 + t * dx;
  const nearestY = y1 + t * dy;
  
  return Math.sqrt((px - nearestX) ** 2 + (py - nearestY) ** 2);
}

// ================== ZONE DETECTION ==================

/**
 * Get the zone a position is in
 */
function getZone(mapName, x, y) {
  if (!zoneDefinitions || !zoneDefinitions[mapName]) {
    return null;
  }
  
  const mapZones = zoneDefinitions[mapName].zones;
  
  for (const [zoneName, zoneDef] of Object.entries(mapZones)) {
    if (pointInPolygon(x, y, zoneDef.polygon, zoneDef.buffer || 0)) {
      return zoneName;
    }
  }
  
  return null;
}

/**
 * Get zone metadata
 */
function getZoneInfo(mapName, zoneName) {
  if (!zoneDefinitions || !zoneDefinitions[mapName]) return null;
  return zoneDefinitions[mapName].zones[zoneName] || null;
}

// ================== CHECKPOINT SYSTEM ==================

const CHECKPOINT_TIMES = {
  POST_FREEZE: 0,
  EARLY: 20,
  MID: 50,
  LATE: 80
};

function getPhase(secondsElapsed, overrides = {}) {
  if (overrides.postPlant) return 'post_plant';
  if (overrides.rushDetected) return 'rush';
  
  if (secondsElapsed < CHECKPOINT_TIMES.EARLY) return 'early';
  if (secondsElapsed < CHECKPOINT_TIMES.MID) return 'mid';
  return 'late';
}

// ================== ROUND PROCESSING ==================

/**
 * Process a round's events and extract zone-based data
 * Focuses on extractable data: kills, first contact, plants
 * 
 * @param {Array} events - Array of parsed JSONL events for this round
 * @param {string} mapName - Map name
 * @param {number} roundNumber - Round number
 * @returns {Object} Round zone state data
 */
function processRound(events, mapName, roundNumber) {
  const roundData = {
    roundNumber,
    mapName,
    kills: [],           // All kills with zone info
    firstContact: null,  // First contact event
    plantInfo: null,     // Plant event info
    winInfo: null,       // Round win info
    phases: {            // Kills by phase
      early: [],
      mid: [],
      late: [],
      post_plant: []
    },
    zoneKills: {},       // Kill count per zone
    overrides: {
      rushDetected: false,
      postPlant: false,
      roundTakesForm: null
    },
    // Legacy compatibility
    checkpoints: {},
    transitions: []
  };
  
  let roundStartTime = null;
  let firstContactTime = null;
  let plantTime = null;
  let killCount = 0;
  
  // Sort events by timestamp
  events.sort((a, b) => new Date(a.occurredAt) - new Date(b.occurredAt));
  
  for (const wrapper of events) {
    const eventTime = wrapper.occurredAt ? new Date(wrapper.occurredAt).getTime() : null;
    
    for (const event of (wrapper.events || [])) {
      const type = event.type;
      
      // Track round start (freeze time end)
      if (type === 'round-ended-freezetime') {
        roundStartTime = eventTime;
      }
      
      // Track kills with position data
      if (type === 'player-killed-player') {
        killCount++;
        const elapsed = eventTime && roundStartTime ? (eventTime - roundStartTime) / 1000 : 0;
        const phase = getPhase(elapsed, roundData.overrides);
        
        // Extract killer info
        const killer = {
          id: event.actor?.id,
          name: event.actor?.state?.name,
          teamId: event.actor?.state?.teamId,
          side: event.actor?.state?.side,
          position: event.actor?.state?.game?.position,
          zone: null
        };
        
        // Extract victim info  
        const victim = {
          id: event.target?.id,
          name: event.target?.state?.name,
          teamId: event.target?.state?.teamId,
          side: event.target?.state?.side,
          position: event.target?.state?.game?.position,
          zone: null
        };
        
        // Assign zones
        if (killer.position) {
          killer.zone = getZone(mapName, killer.position.x, killer.position.y);
        }
        if (victim.position) {
          victim.zone = getZone(mapName, victim.position.x, victim.position.y);
        }
        
        const killInfo = {
          killNumber: killCount,
          time: elapsed,
          phase,
          killer,
          victim,
          isFirstBlood: killCount === 1,
          weapon: Object.keys(event.actor?.state?.game?.weaponKills || {})[0] || 'unknown'
        };
        
        roundData.kills.push(killInfo);
        roundData.phases[phase]?.push(killInfo);
        
        // Track kills by zone
        if (victim.zone) {
          roundData.zoneKills[victim.zone] = (roundData.zoneKills[victim.zone] || 0) + 1;
        }
        
        // First contact detection
        if (!firstContactTime && roundStartTime) {
          firstContactTime = eventTime;
          const delta = (firstContactTime - roundStartTime) / 1000;
          roundData.overrides.roundTakesForm = delta;
          
          if (delta < 12) {
            roundData.overrides.rushDetected = true;
          }
          
          roundData.firstContact = {
            time: delta,
            killerZone: killer.zone,
            victimZone: victim.zone,
            killInfo
          };
        }
      }
      
      // Track plant
      if (type === 'player-completed-plantBomb') {
        plantTime = eventTime;
        roundData.overrides.postPlant = true;
        
        const elapsed = roundStartTime ? (plantTime - roundStartTime) / 1000 : null;
        const planterPos = event.actor?.state?.game?.position;
        
        roundData.plantInfo = {
          time: elapsed,
          planterId: event.actor?.id,
          planterName: event.actor?.state?.name,
          zone: planterPos ? getZone(mapName, planterPos.x, planterPos.y) : null,
          site: null // Will try to infer from zone
        };
        
        // Infer site from zone
        if (roundData.plantInfo.zone) {
          if (roundData.plantInfo.zone.includes('A-Site')) {
            roundData.plantInfo.site = 'A';
          } else if (roundData.plantInfo.zone.includes('B-Site')) {
            roundData.plantInfo.site = 'B';
          } else if (roundData.plantInfo.zone.includes('C-Site')) {
            roundData.plantInfo.site = 'C';
          }
        }
      }
      
      // Track round end
      if (type === 'game-ended-round') {
        const winningTeam = event.target?.state?.teams?.find(t => t.won);
        if (winningTeam) {
          roundData.winInfo = {
            teamId: winningTeam.id,
            teamName: winningTeam.name,
            side: winningTeam.side
          };
        }
      }
    }
  }
  
  // Populate legacy checkpoints with available data
  roundData.checkpoints.post_freeze = {
    time: 0,
    kills: roundData.phases.early.length,
    firstContact: roundData.firstContact
  };
  
  roundData.checkpoints.final = {
    time: roundData.kills.length > 0 ? roundData.kills[roundData.kills.length - 1].time : 0,
    totalKills: roundData.kills.length,
    plantInfo: roundData.plantInfo,
    winInfo: roundData.winInfo
  };
  
  // Add firstContactZone for backward compatibility
  roundData.firstContactZone = roundData.firstContact?.victimZone || roundData.firstContact?.killerZone || null;
  roundData.plantTime = roundData.plantInfo?.time || null;
  
  return roundData;
}

// ================== EXPORTS ==================

module.exports = {
  initialize,
  getZone,
  getZoneInfo,
  getPhase,
  processRound,
  CHECKPOINT_TIMES,
  pointInPolygon
};
