const { request, gql } = require('graphql-request');
const fs = require('fs');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const SORARE_API_URL = 'https://api.sorare.com/graphql';

const PLAYER_COMPETITION_QUERY = gql`
  query PlayerComp($slug: String!) {
    football {
      player(slug: $slug) {
        displayName
        activeClub {
            name
            slug
            competitions {
                slug
                displayName
            }
        }
      }
    }
  }
`;

async function test() {
    try {
        const data = await request(SORARE_API_URL, PLAYER_COMPETITION_QUERY, { slug: 'vinicius-jose-paixao-de-oliveira-junior' });
        fs.writeFileSync('comp_results.json', JSON.stringify(data, null, 2));
        console.log('Results saved to comp_results.json');
    } catch (error) {
        console.error('Query Failed:', error.message);
    }
}

test();
