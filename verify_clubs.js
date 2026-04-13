const { request, gql } = require('graphql-request');
const fs = require('fs');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const SORARE_API_URL = 'https://api.sorare.com/graphql';

const CLUB_EXIST = gql`
  query Club($slug: String!) {
    football {
      club(slug: $slug) {
        name
      }
    }
  }
`;

const SLUGS_TO_TEST = [
    'real-madrid-madrid', 'barcelona-barcelona', 'atletico-madrid-madrid',
    'real-sociedad-donostia-san-sebastian', 'athletic-club-bilbao',
    'villarreal-villarreal', 'valencia-valencia', 'getafe-getafe-madrid',
    'celta-de-vigo-vigo', 'mallorca-palma-de-mallorca',
    'las-palmas-las-palmas-de-gran-canaria', 'girona-girona',
    'sevilla-sevilla', 'osasuna-pamplona', 'rayo-vallecano-madrid',
    'deportivo-alaves-vitoria-gasteiz', 'granada-granada', 'cadiz-cadiz', 'almeria-almeria',
    'real-betis-sevilla'
];

async function test() {
    let valid = [];
    for (const slug of SLUGS_TO_TEST) {
        try {
            const data = await request(SORARE_API_URL, CLUB_EXIST, { slug });
            if (data.football.club) {
                valid.push(slug);
                console.log(`VALID: ${slug}`);
            } else {
                console.log(`INVALID: ${slug}`);
            }
        } catch (e) {
            console.log(`FAILED: ${slug} (${e.message})`);
        }
    }
    fs.writeFileSync('valid_clubs.json', JSON.stringify(valid, null, 2));
}

test();
