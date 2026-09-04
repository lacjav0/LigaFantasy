const { request, gql } = require('graphql-request');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const SORARE_API_URL = 'https://api.sorare.com/graphql';

// Updated query for new Sorare API schema (2026 season)
// - `football.player(slug)` replaced by root `players(slugs:[])`
// - `position` replaced by `anyPositions`
// - `so5Scores(last:N)` replaced by `averageScore(type:...)` at root level
// - `games` cannot be nested inside `players` list; fetched separately via `football.club`
const PLAYER_STATS_QUERY = gql`
  query PlayerStats($slugs: [String!]!) {
    players(slugs: $slugs) {
      displayName
      slug
      anyPositions
      l5: averageScore(type: LAST_FIVE_SO5_AVERAGE_SCORE)
      l15: averageScore(type: LAST_FIFTEEN_SO5_AVERAGE_SCORE)
      activeInjuries {
        active
      }
      activeSuspensions {
        active
        reason
      }
      activeClub {
        name
        slug
      }
    }
  }
`;

const CLUB_GAMES_QUERY = gql`
  query ClubGames($slug: String!, $startDate: ISO8601DateTime!, $endDate: ISO8601DateTime!) {
    football {
      club(slug: $slug) {
        name
        games(startDate: $startDate, endDate: $endDate, last: 5) {
          nodes {
            homeTeam { name }
            awayTeam { name }
            homeGoals
            awayGoals
          }
        }
      }
    }
  }
`;

const SEARCH_PLAYERS_QUERY = gql`
  query SearchPlayers($query: String!) {
    searchPlayers(query: $query, pageSize: 10, advancedFilters: "sport:football") {
      commonPlayerHits {
        anyPlayer {
          slug
          displayName
          anyPositions
          activeClub {
            name
          }
          activeInjuries {
            active
          }
          activeSuspensions {
            active
          }
        }
      }
    }
  }
`;

// Club players query still uses football.club.activePlayers which supports so5Scores
const CLUB_PLAYERS_QUERY = gql`
  query ClubPlayers($slug: String!, $startDate: ISO8601DateTime!, $endDate: ISO8601DateTime!) {
    football {
      club(slug: $slug) {
        name
        games(startDate: $startDate, endDate: $endDate, last: 5) {
          nodes {
            homeTeam { name }
            awayTeam { name }
            homeGoals
            awayGoals
          }
        }
        activePlayers(first: 25) {
          nodes {
            displayName
            slug
            anyPositions
            activeInjuries {
              active
            }
            activeSuspensions {
              active
            }
            so5Scores(last: 4) {
              score
            }
          }
        }
      }
    }
  }
`;

const commonHeaders = {
  'Connection': 'close',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
};

/**
 * Fetches stats for one or more players using the new root `players` query.
 * Returns an array of player objects with l5/l15 averageScores.
 */
async function fetchPlayerStats(playerSlug, retries = 2) {
  const variables = { slugs: [playerSlug] };
  try {
    const data = await request(SORARE_API_URL, PLAYER_STATS_QUERY, variables, commonHeaders);
    const player = data.players && data.players.length > 0 ? data.players[0] : null;
    if (player) {
      // Normalize: convert anyPositions array to single position string
      player.position = player.anyPositions && player.anyPositions.length > 0 ? player.anyPositions[0] : 'Unknown';
      // Create so5Scores-compatible structure from averageScore values
      // l5 and l15 are single averages, create synthetic so5Scores for compatibility
      player.so5Scores = [];
      if (player.l5 !== null && player.l5 !== undefined) {
        // Create 5 synthetic scores with L5 average for compatibility
        for (let i = 0; i < 5; i++) {
          player.so5Scores.push({ score: player.l5 });
        }
      }
      if (player.l15 !== null && player.l15 !== undefined) {
        // Add 10 more synthetic scores representing L6-L15 to fill 15 entries
        const l6to15avg = player.l15; // best approximation
        for (let i = 0; i < 10; i++) {
          player.so5Scores.push({ score: l6to15avg });
        }
      }
    }
    return player;
  } catch (error) {
    if (retries > 0 && error.message && error.message.includes('fetch failed')) {
      console.warn(`Transient fetch failed for ${playerSlug}, retrying... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, 500));
      return fetchPlayerStats(playerSlug, retries - 1);
    }
    throw error;
  }
}

/**
 * Fetches last 5 games for a club (used for team form factor).
 */
async function fetchClubGames(clubSlug, retries = 2) {
  const endDate = new Date().toISOString();
  const startDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
  const variables = { slug: clubSlug, startDate, endDate };
  try {
    const data = await request(SORARE_API_URL, CLUB_GAMES_QUERY, variables, commonHeaders);
    return data.football.club;
  } catch (error) {
    if (retries > 0 && error.message && error.message.includes('fetch failed')) {
      console.warn(`Transient fetch failed for club ${clubSlug}, retrying... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, 500));
      return fetchClubGames(clubSlug, retries - 1);
    }
    throw error;
  }
}

async function fetchClubPlayers(clubSlug) {
  const endDate = new Date().toISOString();
  const startDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
  const variables = { slug: clubSlug, startDate, endDate };
  const data = await request(SORARE_API_URL, CLUB_PLAYERS_QUERY, variables, commonHeaders);
  
  const club = data.football.club;
  if (!club || !club.activePlayers) return [];
  
  const players = club.activePlayers.nodes;
  players.forEach(p => {
    // Normalize position
    p.position = p.anyPositions && p.anyPositions.length > 0 ? p.anyPositions[0] : 'Unknown';
    p.activeClub = {
      name: club.name,
      games: club.games
    };
  });
  return players;
}

async function searchPlayer(query) {
  const variables = { query };
  const data = await request(SORARE_API_URL, SEARCH_PLAYERS_QUERY, variables, commonHeaders);
  return data.searchPlayers.commonPlayerHits.map(hit => ({
    slug: hit.anyPlayer.slug,
    displayName: hit.anyPlayer.displayName,
    position: hit.anyPlayer.anyPositions && hit.anyPlayer.anyPositions.length > 0 ? hit.anyPlayer.anyPositions[0] : 'Unknown',
    club: hit.anyPlayer.activeClub ? hit.anyPlayer.activeClub.name : 'Sin equipo'
  }));
}

module.exports = {
  fetchPlayerStats,
  fetchClubGames,
  fetchClubPlayers,
  searchPlayer
};
