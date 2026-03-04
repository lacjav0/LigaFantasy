const { fetchPlayerStats, searchPlayer } = require('./sorareClient');

/**
 * Calculates a 'Fantasy Potential Score' for a player.
 * @param {Object} player - The player data from Sorare.
 * @returns {number} - The calculated score.
 */
function calculateScore(player) {
    if (!player || !player.so5Scores) return 0;

    const stats = player.so5Scores;
    const l5 = stats.slice(0, 5);
    const l15 = stats.slice(0, 15);

    const avgL5 = l5.length > 0 ? l5.reduce((sum, s) => sum + s.score, 0) / l5.length : 0;
    const avgL15 = l15.length > 0 ? l15.reduce((sum, s) => sum + s.score, 0) / l15.length : 0;

    // Weighting: 60% Form (L5), 40% Stability (L15)
    const score = (avgL5 * 0.6) + (avgL15 * 0.4);

    return parseFloat(score.toFixed(2));
}

/**
 * Selects the best 11 players based on a given formation.
 * @param {Array} rankedPlayers - Array of ranked player objects.
 * @param {string} formation - The tactical formation (e.g., '4-4-2').
 * @returns {Array} - The best 11 players.
 */
function getBestXI(rankedPlayers, formation) {
    const [def, mid, fwd] = formation.split('-').map(Number);
    const requirements = {
        'Goalkeeper': 1,
        'Defender': def,
        'Midfielder': mid,
        'Forward': fwd
    };

    const bestXI = [];
    const playersByPos = {
        'Goalkeeper': rankedPlayers.filter(p => p.position === 'Goalkeeper'),
        'Defender': rankedPlayers.filter(p => p.position === 'Defender'),
        'Midfielder': rankedPlayers.filter(p => p.position === 'Midfielder'),
        'Forward': rankedPlayers.filter(p => p.position === 'Forward')
    };

    // Pick players for each position based on requirements
    for (const pos in requirements) {
        const needed = requirements[pos];
        const available = playersByPos[pos] || [];
        bestXI.push(...available.slice(0, needed));
    }

    return bestXI.sort((a, b) => {
        const order = { 'Goalkeeper': 1, 'Defender': 2, 'Midfielder': 3, 'Forward': 4 };
        return order[a.position] - order[b.position];
    });
}

/**
 * Analyzes and ranks a list of players.
 * @param {string[]} slugs - Array of player slugs.
 * @param {string} [formation] - Optional formation for Best XI calculation.
 */
async function getRankings(slugs, formation) {
    const failedSlugs = [];

    // Fallback mapping for common players with complex slugs
    const commonMapping = {
        'tsygankov': 'viktor-tsygankov',
        'unai simon': 'unai-simon-mendibil',
        'bellingham': 'jude-bellingham',
        'lewandowski': 'robert-lewandowski',
        'griezmann': 'antoine-griezmann',
        'vinicius': 'vinicius-jose-paixao-de-oliveira-junior'
    };

    const playersData = await Promise.all(slugs.map(async (input) => {
        const cleanInput = input.trim().toLowerCase();

        // 1. Try direct slug match
        let p = await fetchPlayerStats(cleanInput);

        // 2. Try common mapping
        if (!p && commonMapping[cleanInput]) {
            p = await fetchPlayerStats(commonMapping[cleanInput]);
        }

        // 3. Fallback to search query
        if (!p) {
            const foundSlug = await searchPlayer(input);
            if (foundSlug) {
                p = await fetchPlayerStats(foundSlug);
            }
        }

        if (!p) failedSlugs.push(input);
        return p;
    }));

    const ranked = playersData
        .filter(p => p !== null && p !== undefined)
        .map(p => {
            const scores = p.so5Scores || [];
            const l5Raw = scores.slice(0, 5);
            const avgL5 = l5Raw.length > 0 ? (l5Raw.reduce((s, x) => s + x.score, 0) / l5Raw.length) : 0;
            const avgL15 = scores.length > 0 ? (scores.reduce((s, x) => s + x.score, 0) / scores.length) : 0;

            return {
                name: p.displayName,
                slug: p.slug,
                position: p.position,
                score: calculateScore(p),
                l5: avgL5.toFixed(1),
                l15: avgL15.toFixed(1)
            };
        })
        .sort((a, b) => b.score - a.score);

    let bestXI = [];
    if (formation) {
        console.log(`Calculating Best XI for formation: ${formation}`);
        bestXI = getBestXI(ranked, formation);
        console.log(`Best XI calculated: ${bestXI.length} players`);
    }

    return { ranked, bestXI, failedSlugs };
}

module.exports = { calculateScore, getRankings, getBestXI };
