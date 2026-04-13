const { request, gql } = require('graphql-request');
const fs = require('fs');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const SORARE_API_URL = 'https://api.sorare.com/graphql';

const ALL_COMPS = gql`
  query AllComps {
    football {
      competitions {
        slug
        displayName
      }
    }
  }
`;

async function test() {
    try {
        const data = await request(SORARE_API_URL, ALL_COMPS);
        const results = data.football.competitions.map(c => `${c.slug}: ${c.displayName}`);
        fs.writeFileSync('all_comps.txt', results.join('\n'));
        console.log('Saved all comps to all_comps.txt');
    } catch (error) {
        console.error('Query Failed:', error.message);
    }
}

test();
