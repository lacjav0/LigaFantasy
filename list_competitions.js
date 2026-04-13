const { request, gql } = require('graphql-request');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const SORARE_API_URL = 'https://api.sorare.com/graphql';

const ALL_COMPETITIONS_QUERY = gql`
  query AllCompetitions {
    football {
      competitions {
        slug
        displayName
        country { name }
      }
    }
  }
`;

async function test() {
    try {
        console.log('Fetching all competitions...');
        const data = await request(SORARE_API_URL, ALL_COMPETITIONS_QUERY);
        const filtered = data.football.competitions.filter(c =>
            c.displayName.toLowerCase().includes('liga') ||
            (c.country && c.country.name === 'Spain')
        );
        console.log('Found Competitions:', JSON.stringify(filtered, null, 2));
    } catch (error) {
        console.error('Query Failed:', error.message);
    }
}

test();
