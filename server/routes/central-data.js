const express = require('express');
const router = express.Router();
const axios = require('axios');
const matchDataService = require('../services/match-data-service'); // Added for backend util

const centralDataAPI = 'https://api-op.grid.gg/central-data/graphql';
const apiKey = process.env.API_KEY;

/**
 * Fetch a list of teams matching the given search query
 */
router.get('/teams/:contains', (req, res) => {
    const contains = req.params.contains;
    const teamsQuery = `
      query GetTeams {
        teams(first: 50, filter: { titleId: 6, name: { contains: "${contains}" } }) {
          edges {
            node {
                id
                name
                colorPrimary
                colorSecondary
                logoUrl
            }
          }
        }
      }
    `;

    axios.post(centralDataAPI, { query: teamsQuery }, {
        headers: { 'x-api-key': apiKey }
    })
    .then(response => res.json(response.data))
    .catch(error => {
        console.error('Error fetching teams:', error);
        res.status(500).json({ error: 'Failed to fetch teams' });
    });
});

/**
 * Fetch a team's data matching their id
 */
router.get('/team/:id', (req, res) => {
    const id = req.params.id;
    const teamQuery = `
      query GetTeam {
        team(id: "${id}") {
          id
          name
          colorPrimary
          colorSecondary
          logoUrl
        }
      }
    `;

    axios.post(centralDataAPI, { query: teamQuery }, {
        headers: { 'x-api-key': apiKey }
    })
    .then(response => res.json(response.data))
    .catch(error => {
        console.error('Error fetching team:', error);
        res.status(500).json({ error: 'Failed to fetch team' });
    });
});

/**
 * Fetch a team's roster
 */
router.get('/team/:id/roster', (req, res) => {
    const id = req.params.id;
    const rosterQuery = `
      query GetTeamRoster {
        players(filter: {teamIdFilter: {id: "${id}"}}) {
          edges {
            node {
                id
                nickname
            }
          }
        }
      }
    `;

    axios.post(centralDataAPI, { query: rosterQuery }, {
        headers: { 'x-api-key': apiKey }
    })
    .then(response => res.json(response.data))
    .catch(error => {
        console.error('Error fetching roster:', error);
        res.status(500).json({ error: 'Failed to fetch roster' });
    });
});

// --- BACKEND UTILITIES (Extensions) ---

/**
 * GET /api/central/download/:seriesId
 * Trigger manual download/cache of a series (Internal Only)
 */
router.get('/download/:seriesId', async (req, res) => {
    try {
        const { seriesId } = req.params;
        const filePath = await matchDataService.getMatchData(seriesId);
        res.json({ success: true, path: filePath });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/central/cache/:seriesId
 * Check if a digest exists (Internal Only)
 */
router.get('/cache/:seriesId', (req, res) => {
    const { seriesId } = req.params;
    const digest = matchDataService.loadDigest(seriesId);
    if (digest) {
        res.json({ cached: true, digest });
    } else {
        res.json({ cached: false });
    }
});

module.exports = router;
