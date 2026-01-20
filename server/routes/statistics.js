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

/**
 * Fetch player statistics for a given time frame
 */
router.get('/player/:playerId/:timeFrame', (req, res) => {
    const playerId = req.params.playerId;
    const timeFrame = req.params.timeFrame;
    const playerQuery = `
      query getPlayerStatisticsForTimeFrame {
        playerStatistics(playerId: "${playerId}", filter: { timeWindow: ${timeFrame} }) {
          id
          game {
            count
            won {
              value
              count
              percentage
            }
          }
          segment {
            type
            count
            kills {
              sum
              min
              max
              avg
            }
            deaths {
              sum
              min
              max
              avg
            }
            killAssistsGiven {
              sum
              min
              max
              avg
            }
            firstKill {
              value
              count
              percentage
            }
          }
        }
      }
    `;

    axios.post(statisticsAPI, { query: playerQuery }, {
        headers: { 'x-api-key': apiKey }
    })
    .then(response => res.json(response.data))
    .catch(error => {
        console.error('Error fetching player statistics:', error);
        res.status(500).json({ error: 'Failed to fetch player statistics' });
    });
});

module.exports = router;