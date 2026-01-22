const express = require('express');
const router = express.Router();
const axios = require('axios');

const statisticsAPI = 'https://api-op.grid.gg/statistics-feed/graphql';
const apiKey = process.env.API_KEY;

/**
 * Fetch team statistics for a given time frame
 */
router.get('/teams/:teamId/:timeFrame', (req, res) => {
    const teamId = req.params.teamId;
    const timeFrame = req.params.timeFrame;
    const teamQuery = `
      query getTeamStatisticsForTimeFrame {
        teamStatistics(teamId: "${teamId}", filter: { timeWindow: ${timeFrame} }) {
          id
          aggregationSeriesIds
          series {
            count
          }
          game {
            count
            won {
              value
              count
              percentage
              streak {
                min
                max
                current
              }
            }
          }
        }
      }
     `;

    axios.post(statisticsAPI, { query: teamQuery }, {
        headers: { 'x-api-key': apiKey }
    })
    .then(response => res.json(response.data))
    .catch(error => {
        console.error('Error fetching team statistics:', error);
        res.status(500).json({ error: 'Failed to fetch team statistics' });
    });
});

module.exports = router;