const express = require('express');
const router = express.Router();
const axios = require('axios');

const seriesStateAPI = 'https://api-op.grid.gg/live-data-feed/series-state/graphql';
const apiKey = process.env.API_KEY;

/**
 * Fetch the state of a series
 */
router.get('/:seriesId', (req, res) => {
    const seriesId = req.params.seriesId;
    const seriesQuery = `
      query getSeriesStats {
        seriesState(id: "${seriesId}") {
          startedAt
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
            segments {
              id
              teams {
                ...segmentTeamState
              }
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
      fragment segmentTeamState on SegmentTeamStateValorant {
        name
        won
        side
        objectives {
          id
        }
        players {
          ...playerState    
        }
      }
  
      fragment playerState on SegmentPlayerStateValorant {
        name
        firstKill
        damageDealt
      }
    `;

    axios.post(seriesStateAPI, { query: seriesQuery }, {
        headers: { 'x-api-key': apiKey }
    })
    .then(response => res.json(response.data))
    .catch(error => {
        console.error('Error fetching series state:', error);
        res.status(500).json({ error: 'Failed to fetch series state' });
    });
});

module.exports = router;