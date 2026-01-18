const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv/config');

// Import routes
const gridRoutes = require('./routes/grid');
const statsRoutes = require('./routes/stats');

// Import services
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

/* API Endpoints */
const centralDataAPI = 'https://api-op.grid.gg/central-data/graphql'
const seriesStateAPI = 'https://api-op.grid.gg/live-data-feed/series-state/graphql'
const statisticsAPI = 'https://api-op.grid.gg/statistics-feed/graphql'

/* API Key */
const apiKey = process.env.API_KEY;

/* API Testing */
app.get('/api/test', (req, res) => {
  res.json({ message: 'Hello from the server!' });
});

// Health check endpoint (migrated from backend)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'ValoScout AI Backend is running' });
});

/* Mount Routes (migrated from backend) */
app.use('/api/grid', gridRoutes);
app.use('/api/advanced-stats', statsRoutes);

/* Central Data API */
/**
 * Fetch a list of teams matching the given search query
 *
 * @param contains The search query to filter teams by
 */
app.get('/api/teams/:contains', (req, res) => {
    const contains = req.params.contains;

    const teamsQuery = `
      query GetTeams {
        teams(first: 5, filter: { titleId: 6, name: { contains: "${contains}" } }) {
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
    `
  axios.post(centralDataAPI, {
    query: teamsQuery
  }, {
    headers: {
      'x-api-key': apiKey
    }
  })
  .then(response => {
    res.json(response.data);
  })
  .catch(error => {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  });
});

/* Central Data API */
/**
 * Fetch a team's data matching their id
 *
 * @param id The id of the team to fetch
 */
app.get('/api/team/:id', (req, res) => {
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
    `
  axios.post(centralDataAPI, {
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
        console.error('Error fetching teams:', error);
        res.status(500).json({ error: 'Failed to fetch teams' });
      });
});

/**
 * Fetch a team's roster
 *
 * @param teamId The id of the team to fetch a roster for
 */
  app.get('/api/team/:id/roster', (req, res) => {
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
  `

  axios.post(centralDataAPI, {
    query: rosterQuery
  }, {
    headers: {
      'x-api-key': apiKey
    }
  })
  .then(response => {
    res.json(response.data);
  })
  .catch(error => {
    console.error('Error fetching roster:', error);
    res.status(500).json({ error: 'Failed to fetch roster' });
  });
});

/* Series State API */
/**
 * Fetch the state of a series
 *
 * @param seriesId The id of the series to fetch
 */
app.get('/api/series/:seriesId', (req, res) => {
  const seriesId = req.params.seriesId;

  const seriesQuery = `
    query getSeriesStats {
      seriesState(id: "${seriesId}") {
        format
        teams {
          id
          name
          won
        }
        games {
          id
          sequenceNumber
          duration
          map {
            name
          }
          teams {
            name
            won
            players {
              name
              character {
                name
              }
              kills
              deaths
              killAssistsGiven
            }
          }
        }
      }
    }
  `
  axios.post(seriesStateAPI, {
    query: seriesQuery
  }, {
    headers: {
      'x-api-key': apiKey
    }
  })
  .then(response => {
    res.json(response.data);
  })
  .catch(error => {
    console.error('Error fetching series state:', error);
    res.status(500).json({ error: 'Failed to fetch series state' });
  });
});


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

/**
 * Fetch player statistics for a given time frame
 *
 * @param playerId The id of the player to fetch statistics for
 * @param timeFrame The time frame to fetch statistics for
 */
app.get('/api/player/:playerId/:timeFrame', (req, res) => {
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
  `

  axios.post(statisticsAPI, {
    query: playerQuery
  }, {
    headers: {
      'x-api-key': apiKey
    }
  })
  .then(response => {
    res.json(response.data);
  })
  .catch(error => {
    console.error('Error fetching player statistics:', error);
    res.status(500).json({ error: 'Failed to fetch player statistics' });
  });
});

app.listen(8080, () => console.log('Server listening on port 8080!'));
