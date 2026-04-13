const { request, gql } = require('graphql-request');
const fs = require('fs');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const SORARE_API_URL = 'https://api.sorare.com/graphql';

const PLAYER_CLUB = gql`
  query PlayerClub($slug: String!) {
    football {
      player(slug: $slug) {
        displayName
        activeClub {
          slug
          name
        }
      }
    }
  }
`;

const CURRENT_PLAYERS = [
    'cristhian-stuani', // Girona
    'youssef-en-nesyri', // Sevilla
    'david-garcia-zubiria', // Osasuna
    'inigo-martinez-berridi', // Barca
    'jose-luis-morales-nogales', // Villarreal
    'mikel-merino-zazon', // Real Sociedad
    'antonio-raillo-arenas', // Mallorca
    'isi-palazon-camacho', // Rayo (Wait, this failed before, let me try a different one)
    'oscar-trejo', // Rayo
    'jonathan-viera-ramos', // Las Palmas
    'luis-javier-suarez-charris', // Almeria (Wait, Almeria is 2nd div now?)
    'gerard-moreno-balaguero', // Villarreal
];

async function test() {
    let results = [];
    for (const slug of CURRENT_PLAYERS) {
        try {
            const data = await request(SORARE_API_URL, PLAYER_CLUB, { slug });
            if (data.football.player && data.football.player.activeClub) {
                results.push({
                    player: data.football.player.displayName,
                    club: data.football.player.activeClub
                });
            }
        } catch (e) { }
    }
    fs.writeFileSync('more_clubs.json', JSON.stringify(results, null, 2));
    console.log('Results saved');
}

test();
