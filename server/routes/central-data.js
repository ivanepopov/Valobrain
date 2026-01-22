const express = require('express');
const router = express.Router();
const axios = require('axios');

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

module.exports = router;