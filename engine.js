const { fetchPlayerStats } = require('./sorareClient');

/**
 * Main function to process a list of players and compare their stats.
 * @param {string[]} playerSlugs - Array of player slugs.
 */
async function analyzePlayers(playerSlugs) {
    console.log(`Analyzing ${playerSlugs.length} players...`);

    const results = [];

    for (const slug of playerSlugs) {
        const player = await fetchPlayerStats(slug);
        if (player && player.so5Scores) {
            const stats = player.so5Scores;
            const l5 = stats.slice(0, 5);
            const avgL5 = l5.length > 0
                ? l5.reduce((sum, s) => sum + s.score, 0) / l5.length
                : 0;

            const l15 = stats.slice(0, 15);
            const avgL15 = l15.length > 0
                ? l15.reduce((sum, s) => sum + s.score, 0) / l15.length
                : 0;

            results.push({
                name: player.displayName,
                slug: player.slug,
                pos: player.position,
                avgL5: avgL5.toFixed(2),
                avgL15: avgL15.toFixed(2),
                totalGamesFound: stats.length
            });
        }
    }

    // Sort by average L5 score
    results.sort((a, b) => b.avgL5 - a.avgL5);

    console.table(results);
}

// Initial test slugs - we can replace these with user-provided list
const testPlayers = [
    'jude-bellingham',
    'robert-lewandowski',
    'vinicius-jose-paixao-de-oliveira-junior',
    'antoine-griezmann'
];

if (require.main === module) {
    analyzePlayers(testPlayers);
}

module.exports = { analyzePlayers };
