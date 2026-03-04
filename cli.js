const fs = require('fs');
const path = require('path');
const { getRankings } = require('./logic');

async function main() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    const inputPath = path.join(__dirname, 'players.txt');

    if (!fs.existsSync(inputPath)) {
        console.log('Please create a players.txt file with one player slug per line.');
        // Create a sample one
        fs.writeFileSync(inputPath, 'jude-bellingham\nrobert-lewandowski\nantoine-griezmann\nvinicius-jose-paixao-de-oliveira-junior');
        console.log('Sample players.txt created.');
    }

    const content = fs.readFileSync(inputPath, 'utf8');
    const slugs = content.split('\n').map(s => s.trim()).filter(s => s.length > 0);

    console.log(`\n--- Sorare Fantasy Optimizer ---`);
    console.log(`Ranking ${slugs.length} players...\n`);

    const rankings = await getRankings(slugs);

    console.table(rankings);

    console.log('\nTop Recommendation:');
    if (rankings.length > 0) {
        const top = rankings[0];
        console.log(`${top.name} (${top.position}) with a potential score of ${top.score}`);
    }
}

main();
