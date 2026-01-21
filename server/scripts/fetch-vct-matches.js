require('dotenv/config');
const axios = require('axios');
const fs = require('fs');

const API_KEY = process.env.API_KEY;
const CENTRAL_URL =   

async function queryGrid(query, variables = {}) {
  try {
    const res = await axios.post(CENTRAL_URL, { query, variables }, {
      headers: { 'x-api-key': API_KEY }
    });
    if (res.data.errors) {
      console.error('GraphQL Errors:', JSON.stringify(res.data.errors, null, 2));
      return null;
    }
    return res.data.data;
  } catch (err) {
    console.error('Request failed:', err.message);
    return null;
  }
}

async function findTournament(name) {
  console.log(`Searching for tournament: "${name}"...`);
  const query = `
    query FindTournament($name: String!) {
      tournaments(filter: { name: { contains: $name }, titleId: 6 }, first: 20) {
        edges {
          node {
            id
            name
            startDate
          }
        }
      }
    }
  `;
  const data = await queryGrid(query, { name });
  return data?.tournaments?.edges?.map(e => e.node) || [];
}

async function getTournamentSeries(tournamentId) {
  console.log(`Fetching series for tournament ${tournamentId}...`);
  // Correct query based on GRID docs: allSeries with nested filter
  const query = `
    query GetSeries($tournamentId: ID!) {
      allSeries(
        filter: {
          tournament: {
            id: { in: [$tournamentId] }
          }
        }
        first: 50
      ) {
        edges {
          node {
            id
            startTimeScheduled
            teams {
              baseInfo {
                id
                name
              }
            }
          }
        }
      }
    }
  `;
  const data = await queryGrid(query, { tournamentId });
  return data?.allSeries?.edges?.map(e => e.node) || [];
}

async function main() {
  // 1. Broader search for ALL VCT Americas events (2023-2024)
  const tournaments = await findTournament('VCT Americas');
  
  if (tournaments.length === 0) {
    console.log('No tournaments found.');
    return;
  }

  console.log(`Found ${tournaments.length} tournaments:`);
  tournaments.forEach(t => console.log(`- ${t.name} (ID: ${t.id})`));

  let allMatches = [];

  // 2. Fetch matches from ALL found tournaments
  for (const t of tournaments) {
    const matches = await getTournamentSeries(t.id);
    console.log(`  Found ${matches.length} matches in ${t.name}`);
    allMatches = [...allMatches, ...matches];
  }

  // Deduplicate by ID
  const uniqueMatches = Array.from(new Map(allMatches.map(m => [m.id, m])).values());

  const seriesList = uniqueMatches.map(m => ({
    id: m.id,
    date: m.startTimeScheduled,
    teams: m.teams?.map(t => t.baseInfo?.name).join(' vs ') || 'Unknown Teams'
  }));

  console.log(`\nTotal Unique Matches: ${seriesList.length}`);
  if (seriesList.length > 0) {
    console.log('First 5 matches:');
    seriesList.slice(0, 5).forEach(m => console.log(`[${m.id}] ${m.teams}`));
  }

  // Save to file
  fs.writeFileSync('vct_americas_stage1_matches.json', JSON.stringify(seriesList, null, 2));
  console.log('\nSaved list to vct_americas_stage1_matches.json');
}

main();
