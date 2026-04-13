const { request, gql } = require('graphql-request');
const fs = require('fs');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const SORARE_API_URL = 'https://api.sorare.com/graphql';

const SEARCH_CLUB = gql`
  query SearchClub($query: String!) {
    football {
      clubs(query: $query) {
        slug
        displayName
      }
    }
  }
`;

const CLUBS_TO_SEARCH = [
    'Real Madrid', 'Barcelona', 'Atletico Madrid', 'Real Sociedad', 'Villarreal',
    'Athletic Club', 'Girona', 'Betis', 'Sevilla', 'Valencia',
    'Osasuna', 'Getafe', 'Celta', 'Mallorca', 'Alaves', 'Rayo Vallecano', 'Las Palmas'
];

async function test() {
    let results = [];
    for (const name of CLUBS_TO_SEARCH) {
        try {
            const data = await request(SORARE_API_URL, SEARCH_CLUB, { query: name });
            if (data.football.clubs && data.football.clubs.length > 0) {
                results.push({ query: name, match: data.football.clubs[0] });
            }
        } catch (e) { }
    }
    fs.writeFileSync('correct_slugs.json', JSON.stringify(results, null, 2));
    console.log('Results saved to correct_slugs.json');
}

test();
