const { request, gql } = require('graphql-request');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const SORARE_API_URL = 'https://api.sorare.com/graphql';

const PLAYER_STATS_QUERY = gql`
  query PlayerStats($slug: String!) {
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
  query ClubPlayers($slug: String!) {
    football {
      club(slug: $slug) {
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

async function fetchPlayerStats(playerSlug) {
  const variables = { slug: playerSlug };
  const data = await request(SORARE_API_URL, PLAYER_STATS_QUERY, variables);
  return data.football.player;
}

async function fetchClubPlayers(clubSlug) {
  const variables = { slug: clubSlug };
  const data = await request(SORARE_API_URL, CLUB_PLAYERS_QUERY, variables);
  return data.football.club && data.football.club.activePlayers ? data.football.club.activePlayers.nodes : [];
}

async function searchPlayer(query) {
  const variables = { query };
  const data = await request(SORARE_API_URL, SEARCH_PLAYERS_QUERY, variables);
  return data.searchPlayers.commonPlayerHits.map(hit => ({
    slug: hit.anyPlayer.slug,
    displayName: hit.anyPlayer.displayName
  }));
}

module.exports = {
  fetchPlayerStats,
  fetchClubPlayers,
  searchPlayer
};
