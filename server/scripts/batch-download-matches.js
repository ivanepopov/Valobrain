require('dotenv/config');
const fs = require('fs');
const path = require('path');
const matchDataService = require('../services/match-data-service');

const MATCH_LIST_FILE = path.resolve(__dirname, '../vct_americas_stage1_matches.json');

async function main() {
  if (!fs.existsSync(MATCH_LIST_FILE)) {
    console.error(`Match list file not found: ${MATCH_LIST_FILE}`);
    return;
  }

  const matches = JSON.parse(fs.readFileSync(MATCH_LIST_FILE, 'utf8'));
  console.log(`Loaded ${matches.length} matches to process.`);

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    console.log(`\n[${i+1}/${matches.length}] Processing ${m.teams} (${m.id})...`);
    
    try {
        await matchDataService.getMatchData(m.id);
        console.log(`[${m.id}] Success.`);
    } catch (err) {
        console.error(`[${m.id}] FAILED: ${err.message}`);
    }
    
    // Wait 1s between downloads to be nice to API
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('\nBatch download complete!');
}

main();
