const fs = require('fs');
const path = require('path');
const axios = require('axios');
const AdmZip = require('adm-zip');
const { pipeline } = require('stream/promises');

// Configuration
const MATCH_DATA_DIR = path.resolve(__dirname, "../match_data");
const DIGEST_DIR = path.join(MATCH_DATA_DIR, "digests");
const GRID_API_BASE = "https://api.grid.gg/file-download";
const GRID_FILE_URL = process.env.GRID_FILE_URL || `${GRID_API_BASE}/events/grid/series`;
const DOWNLOAD_TIMEOUT_MS = 60000; // 60s timeout for large files

class MatchDataService {
    constructor() {
        this.ensureDataDir();
        this._inFlight = new Map(); // seriesId -> Promise<string>
    }

    /**
     * Ensure the data directories exist.
     */
    ensureDataDir() {
        if (!fs.existsSync(MATCH_DATA_DIR)) {
            fs.mkdirSync(MATCH_DATA_DIR, { recursive: true });
        }
        if (!fs.existsSync(DIGEST_DIR)) {
            fs.mkdirSync(DIGEST_DIR, { recursive: true });
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
     * Load a cached digest if it exists.
     * @param {string} seriesId 
     * @returns {Object|null}
     */
    loadDigest(seriesId) {
        const p = path.join(DIGEST_DIR, `${seriesId}_digest.json`);
        if (fs.existsSync(p)) {
            console.log(`[MatchDataService] Cache Hit: Digest found for ${seriesId}`);
            return JSON.parse(fs.readFileSync(p, 'utf8'));
        }
        return null;
    }

    /**
     * Save a digest to cache.
     * @param {string} seriesId
     * @param {Object} digest
     */
    saveDigest(seriesId, digest) {
        // Ensure digest directory exists before writing
        if (!fs.existsSync(DIGEST_DIR)) {
            fs.mkdirSync(DIGEST_DIR, { recursive: true });
        }
        const p = path.join(DIGEST_DIR, `${seriesId}_digest.json`);
        fs.writeFileSync(p, JSON.stringify(digest, null, 2));
        console.log(`[MatchDataService] Digest saved for ${seriesId}`);
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

        // Prevent concurrent downloads/extractions for the same seriesId
        if (this._inFlight.has(seriesId)) {
            return this._inFlight.get(seriesId);
        }

        const p = this.downloadAndExtract(seriesId)
            .finally(() => this._inFlight.delete(seriesId));

        this._inFlight.set(seriesId, p);
        return p;
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
            } finally {
                if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
            }
        }

        // Validate the downloaded file looks like a ZIP before attempting to extract
        this._assertZipLooksValid(zipPath, seriesId);

        // 3. Extract
        console.log(`[MatchDataService] Extracting ${seriesId}...`);
        try {
            const zip = new AdmZip(zipPath);
            zip.extractAllTo(MATCH_DATA_DIR, true);
        } catch (zipError) {
            throw new Error(`Failed to unzip file for ${seriesId}: ${zipError.message}`);
        } finally {
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
        const response = await axios({
            method: 'get',
            url: url,
            headers: {
                "x-api-key": apiKey,
                "Accept": "application/zip, application/octet-stream",
                "User-Agent": "Valobrain-Scouter/1.0"
            },
            responseType: 'stream',
            timeout: DOWNLOAD_TIMEOUT_MS,
            validateStatus: status => status >= 200 && status < 300
        });

        const contentType = String(response.headers?.['content-type'] || '').toLowerCase();
        if (contentType && !contentType.includes('zip') && !contentType.includes('octet-stream')) {
            // Often means HTML/JSON error body got downloaded instead of a zip
            throw new Error(`Unexpected content-type "${contentType}" from ${url}`);
        }

        // Write atomically to reduce risk of partially-written files being read
        const tmpPath = `${destPath}.tmp`;
        const writer = fs.createWriteStream(tmpPath);

        try {
            await pipeline(response.data, writer);
            fs.renameSync(tmpPath, destPath);
        } catch (e) {
            try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch {}
            throw e;
        }
    }

    _assertZipLooksValid(zipPath, seriesId) {
        if (!fs.existsSync(zipPath)) {
            throw new Error(`Downloaded file missing for ${seriesId}`);
        }

        const stat = fs.statSync(zipPath);
        if (stat.size < 8) {
            throw new Error(`Downloaded file too small to be a zip for ${seriesId} (${stat.size} bytes)`);
        }

        const fd = fs.openSync(zipPath, 'r');
        try {
            const header = Buffer.alloc(4);
            fs.readSync(fd, header, 0, 4, 0);
            const sig = header.toString('binary');
            // ZIP local file header signature: PK\x03\x04
            if (sig !== 'PK\u0003\u0004') {
                throw new Error(`Downloaded content is not a ZIP (bad signature) for ${seriesId}`);
            }
        } finally {
            fs.closeSync(fd);
        }
    }

    /**
     * Delete raw ZIP and JSONL files to save space.
     * @param {string} seriesId 
     */
    deleteRawData(seriesId) {
        try {
            const files = fs.readdirSync(MATCH_DATA_DIR);
            const targets = files.filter(f => f.includes(seriesId) && (f.endsWith('.jsonl') || f.endsWith('.zip')));
            
            for (const file of targets) {
                const p = path.join(MATCH_DATA_DIR, file);
                fs.unlinkSync(p);
                console.log(`[MatchDataService] Deleted raw file: ${file}`);
            }
        } catch (e) {
            console.error(`[MatchDataService] Failed to cleanup raw files for ${seriesId}: ${e.message}`);
        }
    }
}

module.exports = new MatchDataService();
