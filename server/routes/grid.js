const express = require('express');
const axios = require('axios');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// GRID API endpoints
const GRID_CENTRAL_URL = 'https://api-op.grid.gg/central-data/graphql';
const GRID_LIVE_URL = 'https://api-op.grid.gg/live-data-feed/series-state/graphql';

// Rate limit: 30 requests per minute per IP
const gridLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: { error: 'Too many requests, please wait a minute' }
});

router.use(gridLimiter);

// Request timeout (10 seconds)
const TIMEOUT_MS = 10000;

// Send a GraphQL query to GRID
const queryGridApi = async (url, query, variables = {}) => {
    const response = await axios.post(
        url,
        { query, variables },
        {
            headers: { 'x-api-key': process.env.API_KEY },
            timeout: TIMEOUT_MS
        }
    );
    return response.data;
};

// Validate request body
const validateRequest = (req, res) => {
    if (!req.body || !req.body.query) {
        res.status(400).json({ error: 'Missing query in request body' });
        return false;
    }
    if (typeof req.body.query !== 'string') {
        res.status(400).json({ error: 'Query must be a string' });
        return false;
    }
    if (req.body.query.length > 10000) {
        res.status(400).json({ error: 'Query too large (max 10000 chars)' });
        return false;
    }
    return true;
};

// POST /api/grid/central
// Proxy for GRID Central Data API (teams, players, tournaments)
router.post('/central', async (req, res) => {
    if (!validateRequest(req, res)) return;

    try {
        const { query, variables } = req.body;
        const data = await queryGridApi(GRID_CENTRAL_URL, query, variables);
        res.json(data);
    } catch (error) {
        if (error.code === 'ECONNABORTED') {
            return res.status(504).json({ error: 'Request timed out' });
        }
        console.error('GRID Central API Error:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json({
            error: 'Failed to fetch from GRID Central API',
            details: error.response?.data?.errors || error.message
        });
    }
});

// POST /api/grid/live
// Proxy for GRID Live Data Feed (real-time match state)
router.post('/live', async (req, res) => {
    if (!validateRequest(req, res)) return;

    try {
        const { query, variables } = req.body;
        const data = await queryGridApi(GRID_LIVE_URL, query, variables);
        res.json(data);
    } catch (error) {
        if (error.code === 'ECONNABORTED') {
            return res.status(504).json({ error: 'Request timed out' });
        }
        console.error('GRID Live API Error:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json({
            error: 'Failed to fetch from GRID Live API',
            details: error.response?.data?.errors || error.message
        });
    }
});

module.exports = router;
