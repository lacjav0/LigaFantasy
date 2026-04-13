const { request, gql } = require('graphql-request');
const fs = require('fs');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const SORARE_API_URL = 'https://api.sorare.com/graphql';

const SEARCH = gql`
  query Search($query: String!) {
    football {
      clubs(query: $query) {
        slug
        displayName
      }
    }
  }
`;

async function test() {
    try {
        const data = await request(SORARE_API_URL, SEARCH, { query: 'Osasuna' });
        fs.writeFileSync('osasuna_result.json', JSON.stringify(data.football.clubs, null, 2));
    } catch (e) { }
}

test();
