const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv/config');

/* Create Express Server */
const app = express();
const corsOptions = {
  origin: 'http://localhost:5173',
};
app.use(cors(corsOptions));

/* API Endpoints */
const centralDataAPI = 'https://api-op.grid.gg/central-data/graphql'
const seriesStateAPI = 'https://api-op.grid.gg/live-data-feed/series-state/graphql'
const statisticsAPI = 'https://api-op.grid.gg/statistics-feed/graphql'

/* API Key */
const apiKey = process.env.API_KEY;

/* API Testing */
app.get('/api/test', (req, res) => {
  res.json({ message: 'Hello from the server!' });
})

/* Statistics API */
/**
 * Fetch team statistics for a given time frame
 *
 * @param teamId The id of the team to fetch statistics for
 * @param timeFrame The time frame to fetch statistics for
 */
app.get('/api/teams/:teamId/:timeFrame', (req, res) => {
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
   `

  axios.post(statisticsAPI, {
    query: teamQuery
  }, {
    headers: {
      'x-api-key': apiKey
    }
  })
    .then(response => {
      res.json(response.data);
    })
    .catch(error => {
      console.error('Error fetching statistics:', error);
      res.status(500).json({ error: 'Failed to fetch statistics' });
    });
});

app.listen(8080, () => console.log('Server listening on port 8080!'));