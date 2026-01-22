const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv/config');
const { rateLimit } = require("express-rate-limit");

/* Import routes */
const advancedStatsRoutes = require('./routes/advanced-stats');
const scoutingRoutes = require('./routes/scouting');
const centralDataRoutes = require('./routes/central-data');
const seriesStateRoutes = require('./routes/series-state');
const statisticsRoutes = require('./routes/statistics');

/* Import services */
const mapService = require('./services/map-service');

/* Create Express Server */
const app = express();
const corsOptions = {
  origin: 'http://localhost:5173',
};

app.use(cors(corsOptions));
app.use(express.json());

/* Initialize Map Service */
const calloutPath = path.join(__dirname, 'data', 'callout_coords.xlsx');
mapService.initialize(calloutPath);

/* Ensure match_data directory exists */
const matchDataDir = path.join(__dirname, 'match_data');
if (!fs.existsSync(matchDataDir)) {
  fs.mkdirSync(matchDataDir, { recursive: true });
}

/* API Testing */
app.get('/api/test', (req, res) => {
  res.json({ message: 'Hello from the server!' });
});

/* Health check endpoint (migrated from backend) */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'ValoScout AI Backend is running' });
});

const advancedStatsLimiter = rateLimit({
  windowMs: 30 * 1000,
  max: 10,
  message: { error: "Too many requests, please wait" },
});

/* Mount Routes (migrated from backend) */
app.use('/api/advanced-stats', advancedStatsLimiter, advancedStatsRoutes);
app.use('/api/scouting', scoutingRoutes);
app.use('/api/central', centralDataRoutes);
app.use('/api/series', seriesStateRoutes);
app.use('/api/stats', statisticsRoutes);

app.listen(8080, () => console.log('Server listening on port 8080!'));