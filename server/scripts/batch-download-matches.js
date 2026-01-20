require('dotenv/config');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const MATCH_DATA_DIR = path.resolve(__dirname, '../match_data');
const MATCH_LIST_FILE = path.resolve(__dirname, '../vct_americas_stage1_matches.json');
const GRID_FILE_URL = "https://cdn-cf.grid.gg/file-download/events/grid/series";
const API_KEY = process.env.API_KEY;

// Ensure output dir exists
if (!fs.existsSync(MATCH_DATA_DIR)) {
  fs.mkdirSync(MATCH_DATA_DIR, { recursive: true });
}

async function downloadMatch(seriesId) {
  const cachedFile = fs.readdirSync(MATCH_DATA_DIR).find(f => f.includes(seriesId) && f.endsWith('.jsonl'));
  if (cachedFile) {
    console.log(`[${seriesId}] Already cached as ${cachedFile}. Skipping.`);
    return;
  }

  const zipPath = path.join(MATCH_DATA_DIR, `${seriesId}.zip`);
  const url = `${GRID_FILE_URL}/${seriesId}`;

  console.log(`[${seriesId}] Downloading...`);
  try {
    const response = await axios.get(url, {
      headers: { "x-api-key": API_KEY },
      responseType: "arraybuffer",
      timeout: 60000, // 1 min timeout
    });

    fs.writeFileSync(zipPath, response.data);
    console.log(`[${seriesId}] Zip saved. Extracting...`);

    const zip = new AdmZip(zipPath);
    zip.extractAllTo(MATCH_DATA_DIR, true);
    
    // Cleanup zip
    fs.unlinkSync(zipPath); 
    console.log(`[${seriesId}] Done.`);
  } catch (err) {
    console.error(`[${seriesId}] FAILED: ${err.message}`);
  }
}

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
    await downloadMatch(m.id);
    
    // Wait 2s between downloads to be nice to API
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log('\nBatch download complete!');
}

main();
