const { request, gql } = require('graphql-request');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const SORARE_API_URL = 'https://api.sorare.com/graphql';

const PLAYER_STATS_QUERY = gql`
  query PlayerStats($slug: String!, $startDate: ISO8601DateTime!, $endDate: ISO8601DateTime!) {
    football {
      player(slug: $slug) {
        displayName
        slug
        position
        activeInjuries {
          active
        }
        activeSuspensions {
          active
          reason
        }
        so5Scores(last: 15) {
          score
        }
        activeClub {
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
  }
`;

const SEARCH_PLAYERS_QUERY = gql`
  query SearchPlayers($query: String!) {
    searchPlayers(query: $query, pageSize: 10, advancedFilters: "sport:football") {
      commonPlayerHits {
        anyPlayer {
          slug
          displayName
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

// Optimized for complexity limits (1000 max)
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
            position
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

async function fetchPlayerStats(playerSlug, retries = 2) {
  const endDate = new Date().toISOString();
  const startDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
  const variables = { slug: playerSlug, startDate, endDate };
  try {
    const data = await request(SORARE_API_URL, PLAYER_STATS_QUERY, variables, commonHeaders);
    return data.football.player;
  } catch (error) {
    if (retries > 0 && error.message && error.message.includes('fetch failed')) {
      console.warn(`Transient fetch failed for ${playerSlug}, retrying... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, 500));
      return fetchPlayerStats(playerSlug, retries - 1);
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
    club: hit.anyPlayer.activeClub ? hit.anyPlayer.activeClub.name : 'Sin equipo'
  }));
}

module.exports = {
  fetchPlayerStats,
  fetchClubPlayers,
  searchPlayer
};
