const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// Converts (x, y) coordinates to map callouts like "A Site", "Mid", etc.
class MapService {
    constructor() {
        this.maps = {}; // { "Ascent": [{name: "A Site", x: 11000, y: 0}, ...] }
        this.initialized = false;
    }

    // Load callout coordinates from the Excel file
    initialize(filePath) {
        try {
            const absolutePath = path.resolve(filePath);
            if (!fs.existsSync(absolutePath)) {
                console.error(`MapService: File not found at ${absolutePath}`);
                return;
            }

            console.log(`MapService: Loading coordinates from ${absolutePath}`);
            const workbook = XLSX.readFile(absolutePath);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(sheet);

            // Group callouts by map name
            data.forEach(row => {
                const mapName = row.map || row.Map;
                const callout = row.callout || row.Callout;
                const x = row.x || row.X;
                const y = row.y || row.Y;

                if (mapName && callout && x !== undefined && y !== undefined) {
                    if (!this.maps[mapName]) {
                        this.maps[mapName] = [];
                    }
                    this.maps[mapName].push({
                        name: callout,
                        x: parseFloat(x),
                        y: parseFloat(y)
                    });
                }
            });

            this.initialized = true;
            console.log(`MapService: Loaded ${data.length} callouts for maps: ${Object.keys(this.maps).join(', ')}`);

        } catch (error) {
            console.error('MapService Error:', error);
        }
    }

    // Find the closest callout to the given coordinates
    getCallout(mapName, x, y) {
        if (!this.initialized || !mapName || !this.maps[mapName]) {
            return 'Unknown';
        }

        const points = this.maps[mapName];
        let closestCallout = 'Unknown';
        let minDistance = Infinity;

        // Check distance to each callout point, pick the closest
        for (const p of points) {
            const dist = Math.sqrt(Math.pow(p.x - x, 2) + Math.pow(p.y - y, 2));
            if (dist < minDistance) {
                minDistance = dist;
                closestCallout = p.name;
            }
        }

        return closestCallout;
    }
}

module.exports = new MapService();
