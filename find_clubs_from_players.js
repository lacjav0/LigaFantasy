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

const PLAYERS = [
    'vinicius-jose-paixao-de-oliveira-junior',
    'robert-lewandowski',
    'antoine-griezmann',
    'takefusa-kubo',
    'inaki-williams-arthuer',
    'gerard-moreno-balaguero',
    'mikel-oyarzabal-ugarte',
    'aleix-garcia-serrano',
    'ivan-rakitic',
    'jose-luis-gaya-pena',
    'david-garcia-zubiria',
    'borja-mayoral-moya',
    'iago-aspas-juncal',
    'vedat-muriqi',
    'sergi-canos-tenes',
    'isi-palazon-camacho',
    'alberto-moleiro-gonzalez'
];

async function test() {
    let results = [];
    for (const slug of PLAYERS) {
        try {
            const data = await request(SORARE_API_URL, PLAYER_CLUB, { slug });
            if (data.football.player && data.football.player.activeClub) {
                results.push({
                    player: data.football.player.displayName,
                    club: data.football.player.activeClub
                });
            }
        } catch (e) {
            console.error(`Error for ${slug}:`, e.message);
        }
    }
    fs.writeFileSync('found_clubs.json', JSON.stringify(results, null, 2));
    console.log('Results saved to found_clubs.json');
}

test();
