const fs = require('fs');
const path = require('path');
const axios = require('axios');
const AdmZip = require('adm-zip');

// Configuration
const MATCH_DATA_DIR = path.resolve(__dirname, "../match_data");
const GRID_API_BASE = "https://api.grid.gg/file-download";
const GRID_FILE_URL = process.env.GRID_FILE_URL || `${GRID_API_BASE}/events/grid/series`;
const DOWNLOAD_TIMEOUT_MS = 60000; // 60s timeout for large files

class MatchDataService {
    constructor() {
        this.ensureDataDir();
    }

    /**
     * Ensure the data directory exists.
     */
    ensureDataDir() {
        if (!fs.existsSync(MATCH_DATA_DIR)) {
            fs.mkdirSync(MATCH_DATA_DIR, { recursive: true });
        }
    }

    /**
     * Find a cached JSONL file for a series.
     * @param {string} seriesId 
     * @returns {string|null} Absolute path to file or null
     */
    findCachedFile(seriesId) {
        if (!fs.existsSync(MATCH_DATA_DIR)) return null;
        
        const files = fs.readdirSync(MATCH_DATA_DIR);
        const cached = files.find(f => f.includes(seriesId) && f.endsWith('.jsonl'));
        
        return cached ? path.join(MATCH_DATA_DIR, cached) : null;
    }

    /**
     * Main entry point: Get match data file path.
     * Downloads if not cached.
     * @param {string} seriesId 
     * @returns {Promise<string>} Absolute path to JSONL file
     */
    async getMatchData(seriesId) {
        // 1. Check Cache
        const cachedPath = this.findCachedFile(seriesId);
        if (cachedPath) {
            return cachedPath;
        }

        // 2. Download
        return await this.downloadAndExtract(seriesId);
    }

    /**
     * Downloads ZIP, extracts, returns path to JSONL.
     * Implements fallback logic (Direct -> List API).
     */
    async downloadAndExtract(seriesId) {
        console.log(`[MatchDataService] Downloading match ${seriesId}...`);
        
        const zipPath = path.join(MATCH_DATA_DIR, `${seriesId}.zip`);
        const apiKey = process.env.API_KEY;

        try {
            // Strategy A: Direct Download
            const url = `${GRID_API_BASE}/events/grid/series/${seriesId}`;
            await this._downloadFile(url, zipPath, apiKey);
        } catch (error) {
            console.warn(`[MatchDataService] Direct download failed for ${seriesId} (${error.message}). Attempting 'list' lookup...`);
            
            // Strategy B: List Lookup (Fallback)
            try {
               const listUrl = `${GRID_API_BASE}/list/${seriesId}`;
               const listRes = await axios.get(listUrl, { headers: { "x-api-key": apiKey } });
               const fileInfo = listRes.data.files?.find(f => f.id === "events-grid-compressed");
               
               if (!fileInfo || !fileInfo.fullURL) {
                   throw new Error("No compressed event file found in list response.");
               }
               
               console.log(`[MatchDataService] Found file via list: ${fileInfo.fullURL}`);
               await this._downloadFile(fileInfo.fullURL, zipPath, apiKey);

            } catch (fallbackError) {
                console.error(`[MatchDataService] All download attempts failed for ${seriesId}`);
                throw new Error(`Failed to download match ${seriesId}: ${fallbackError.message}`);
            }
        }

        // 3. Extract
        console.log(`[MatchDataService] Extracting ${seriesId}...`);
        try {
            const zip = new AdmZip(zipPath);
            zip.extractAllTo(MATCH_DATA_DIR, true);
        } catch (zipError) {
            throw new Error(`Failed to unzip file for ${seriesId}: ${zipError.message}`);
        } finally {
            // Cleanup ZIP
            if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
        }

        // 4. Return new file
        const newPath = this.findCachedFile(seriesId);
        if (!newPath) {
            throw new Error(`Extraction succeeded but no JSONL file found for ${seriesId}`);
        }

        console.log(`[MatchDataService] Ready: ${newPath}`);
        return newPath;
    }

    /**
     * Helper to perform the actual HTTP stream download
     */
    async _downloadFile(url, destPath, apiKey) {
        const writer = fs.createWriteStream(destPath);
        
        const response = await axios({
            method: 'get',
            url: url,
            headers: { 
                "x-api-key": apiKey,
                "Accept": "application/zip, application/octet-stream",
                "User-Agent": "Valobrain-Scouter/1.0"
            },
            responseType: 'stream',
            timeout: DOWNLOAD_TIMEOUT_MS
        });

        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    }
}

module.exports = new MatchDataService();
