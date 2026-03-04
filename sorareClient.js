const { request, gql } = require('graphql-request');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const SORARE_API_URL = 'https://api.sorare.com/graphql';

/**
 * GraphQL query to fetch player stats by their slug.
 */
const PLAYER_STATS_QUERY = gql`
  query PlayerStats($slug: String!) {
    football {
      player(slug: $slug) {
        displayName
        slug
        position
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
        }
      }
    }
  }
`;

/**
 * Fetches statistics for a specific player by their slug.
 * @param {string} playerSlug - The unique identifier slug for the player on Sorare.
 * @returns {Promise<Object>} - The player data or null if not found.
 */
async function fetchPlayerStats(playerSlug) {
  try {
    const variables = { slug: playerSlug };
    const data = await request(SORARE_API_URL, PLAYER_STATS_QUERY, variables);
    return data.football.player;
  } catch (error) {
    console.error(`Error fetching stats for player ${playerSlug}:`, error.message);
    return null;
  }
}

/**
 * Searches for players by name to find their correct slugs.
 * @param {string} query - The search query (player name).
 * @returns {Promise<Array>} - List of player objects { slug, displayName }.
 */
async function searchPlayer(query) {
  try {
    const variables = { query };
    const data = await request(SORARE_API_URL, SEARCH_PLAYERS_QUERY, variables);
    return data.searchPlayers.commonPlayerHits.map(hit => ({
      slug: hit.anyPlayer.slug,
      displayName: hit.anyPlayer.displayName
    }));
  } catch (error) {
    console.error(`Error searching for player ${query}:`, error.message);
    return [];
  }
}

module.exports = {
  fetchPlayerStats,
  searchPlayer
};
