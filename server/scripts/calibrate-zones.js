/**
 * Zone Calibration Script
 * 
 * Extracts kill positions from cached JSONL files to calibrate zone polygons.
 * Run with: node scripts/calibrate-zones.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const MATCH_DATA_DIR = path.resolve(__dirname, '../match_data');
const OUTPUT_FILE = path.resolve(__dirname, '../data/zone-calibration-data.json');

// Stats per map
const mapStats = {};

// Process a single JSONL file
async function processFile(filename) {
  const filePath = path.join(MATCH_DATA_DIR, filename);
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let mapName = 'Unknown';
  const kills = [];

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
      // Get map name
      if (event.type === 'series-started-game') {
        const name = event.target?.state?.map?.name;
        if (name) {
          mapName = name.charAt(0).toUpperCase() + name.slice(1);
        }
      }

      // Extract kill positions
      if (event.type === 'player-killed-player') {
        const killerPos = event.actor?.state?.game?.position;
        const victimPos = event.target?.state?.game?.position;
        const killerSide = event.actor?.state?.side;
        const victimSide = event.target?.state?.side;

        if (killerPos) {
          kills.push({
            x: killerPos.x,
            y: killerPos.y,
            side: killerSide || 'unknown',
            role: 'killer'
          });
        }
        if (victimPos) {
          kills.push({
            x: victimPos.x,
            y: victimPos.y,
            side: victimSide || 'unknown',
            role: 'victim'
          });
        }
      }
    }
  }

  return { mapName, kills };
}

// Compute statistics for positions
function computeStats(positions) {
  if (positions.length === 0) return null;

  const xs = positions.map(p => p.x);
  const ys = positions.map(p => p.y);

  return {
    count: positions.length,
    x: {
      min: Math.min(...xs),
      max: Math.max(...xs),
      avg: Math.round(xs.reduce((a, b) => a + b, 0) / xs.length)
    },
    y: {
      min: Math.min(...ys),
      max: Math.max(...ys),
      avg: Math.round(ys.reduce((a, b) => a + b, 0) / ys.length)
    }
  };
}

// Find clusters in positions (simple grid-based clustering)
function findClusters(positions, gridSize = 2000) {
  const grid = {};

  for (const pos of positions) {
    const gx = Math.floor(pos.x / gridSize) * gridSize;
    const gy = Math.floor(pos.y / gridSize) * gridSize;
    const key = `${gx},${gy}`;

    if (!grid[key]) {
      grid[key] = { count: 0, minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
    }

    grid[key].count++;
    grid[key].minX = Math.min(grid[key].minX, pos.x);
    grid[key].maxX = Math.max(grid[key].maxX, pos.x);
    grid[key].minY = Math.min(grid[key].minY, pos.y);
    grid[key].maxY = Math.max(grid[key].maxY, pos.y);
  }

  // Convert to array and sort by count
  return Object.entries(grid)
    .map(([key, data]) => {
      const [gx, gy] = key.split(',').map(Number);
      return {
        gridCenter: { x: gx + gridSize / 2, y: gy + gridSize / 2 },
        ...data
      };
    })
    .sort((a, b) => b.count - a.count);
}

// Main execution
async function main() {
  console.log('Zone Calibration: Extracting positions from cached matches...\n');

  const files = fs.readdirSync(MATCH_DATA_DIR).filter(f => f.endsWith('.jsonl'));
  console.log(`Found ${files.length} JSONL files\n`);

  for (const file of files) {
    console.log(`Processing: ${file}`);
    const { mapName, kills } = await processFile(file);

    if (!mapStats[mapName]) {
      mapStats[mapName] = { positions: [], files: [] };
    }

    mapStats[mapName].positions.push(...kills);
    mapStats[mapName].files.push(file);
    console.log(`  Map: ${mapName}, Kills extracted: ${kills.length}`);
  }

  // Compute final stats per map
  const results = {};

  for (const [mapName, data] of Object.entries(mapStats)) {
    const attackerKills = data.positions.filter(p => p.side === 'attacker');
    const defenderKills = data.positions.filter(p => p.side === 'defender');

    results[mapName] = {
      filesAnalyzed: data.files.length,
      totalPositions: data.positions.length,
      overall: computeStats(data.positions),
      attackerKills: computeStats(attackerKills),
      defenderKills: computeStats(defenderKills),
      clusters: findClusters(data.positions, 1500).slice(0, 15), // Top 15 kill zones
      suggestedBounds: data.positions.length > 0 ? {
        minX: Math.floor(Math.min(...data.positions.map(p => p.x)) / 1000) * 1000,
        maxX: Math.ceil(Math.max(...data.positions.map(p => p.x)) / 1000) * 1000,
        minY: Math.floor(Math.min(...data.positions.map(p => p.y)) / 1000) * 1000,
        maxY: Math.ceil(Math.max(...data.positions.map(p => p.y)) / 1000) * 1000
      } : null
    };
  }

  // Write results
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));

  console.log('\n=== CALIBRATION SUMMARY ===\n');

  for (const [mapName, stats] of Object.entries(results)) {
    console.log(`${mapName}:`);
    console.log(`  Files: ${stats.filesAnalyzed}, Positions: ${stats.totalPositions}`);
    if (stats.suggestedBounds) {
      console.log(`  Bounds: X[${stats.suggestedBounds.minX}, ${stats.suggestedBounds.maxX}] Y[${stats.suggestedBounds.minY}, ${stats.suggestedBounds.maxY}]`);
    }
    console.log(`  Top kill zone: ${stats.clusters[0]?.count || 0} kills at (${stats.clusters[0]?.gridCenter.x || 'N/A'}, ${stats.clusters[0]?.gridCenter.y || 'N/A'})`);
    console.log();
  }

  console.log(`\nCalibration data saved to: ${OUTPUT_FILE}`);
}

main().catch(console.error);
