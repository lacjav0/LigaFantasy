const { request, gql } = require('graphql-request');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const SORARE_API_URL = 'https://api.sorare.com/graphql';

// Major La Liga clubs to sample from
const LA_LIGA_CLUBS = [
    'real-madrid', 'barcelona', 'atletico-madrid', 'real-sociedad', 'villarreal',
    'real-betis', 'athletic-club', 'girona', 'sevilla', 'valencia',
    'osasuna', 'getafe', 'celta-vigo', 'granada', 'las-palmas',
    'mallorca', 'alaves', 'cadiz', 'rayo-vallecano', 'almeria'
];

const CLUB_PLAYERS_QUERY = gql`
  query ClubPlayers($slug: String!) {
    football {
      club(slug: $slug) {
        displayName
        activePlayers {
            displayName
            slug
            position
            activeInjuries { active }
            activeSuspensions { active }
            so5Scores(last: 15) {
              score
            }
        }
      }
    }
  }
`;

async function getAllPlayers() {
    let allPlayers = [];
    console.log('Fetching players from major La Liga clubs...');

    for (const clubSlug of LA_LIGA_CLUBS) {
        try {
            const data = await request(SORARE_API_URL, CLUB_PLAYERS_QUERY, { slug: clubSlug });
            if (data.football.club && data.football.club.activePlayers) {
                console.log(`- Fetched ${data.football.club.activePlayers.length} players from ${data.football.club.displayName}`);
                allPlayers.push(...data.football.club.activePlayers);
            }
        } catch (error) {
            console.error(`Failed to fetch ${clubSlug}:`, error.message);
        }
        // Limit to avoid rate limits during testing
        if (allPlayers.length > 200) break;
    }

    console.log(`Total players fetched: ${allPlayers.length}`);
    return allPlayers;
}

getAllPlayers();
