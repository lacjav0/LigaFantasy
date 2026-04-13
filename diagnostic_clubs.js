const { fetchClubPlayers } = require('./sorareClient');
const fs = require('fs');

const LA_LIGA_CLUBS = [
    'real-madrid-madrid', 'barcelona-barcelona', 'atletico-madrid-madrid',
    'real-sociedad-donostia-san-sebastian', 'athletic-club-bilbao',
    'villarreal-villarreal', 'valencia-valencia', 'getafe-getafe-madrid',
    'celta-de-vigo-vigo', 'mallorca-palma-de-mallorca',
    'las-palmas-las-palmas-de-gran-canaria', 'girona-girona',
    'sevilla-sevilla-1890', 'rayo-vallecano-madrid', 'deportivo-alaves-vitoria-gasteiz',
    'real-betis-sevilla', 'osasuna-pamplona-irunea', 'real-valladolid-valladolid'
];

async function test() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    let diagnostic = {};
    for (const slug of LA_LIGA_CLUBS) {
        try {
            const players = await fetchClubPlayers(slug);
            diagnostic[slug] = { status: 'OK', count: players.length };
        } catch (e) {
            diagnostic[slug] = { status: 'ERROR', message: e.message.split('\n')[0] };
        }
    }
    fs.writeFileSync('clubs_diagnostic.json', JSON.stringify(diagnostic, null, 2));
    console.log('Diagnostic finished.');
}

test();
