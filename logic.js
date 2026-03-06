const { fetchPlayerStats, searchPlayer, fetchClubPlayers } = require('./sorareClient');

const LA_LIGA_CLUBS = [
    'real-madrid-madrid', 'barcelona-barcelona', 'atletico-madrid-madrid',
    'real-sociedad-donostia-san-sebastian', 'athletic-club-bilbao',
    'villarreal-villarreal', 'valencia-valencia', 'getafe-getafe-madrid',
    'celta-de-vigo-vigo', 'mallorca-palma-de-mallorca',
    'las-palmas-las-palmas-de-gran-canaria', 'girona-girona',
    'sevilla-sevilla-1890', 'rayo-vallecano-madrid', 'deportivo-alaves-vitoria-gasteiz',
    'real-betis-sevilla', 'osasuna-pamplona-irunea', 'real-valladolid-valladolid'
];


/**
 * Calculates a 'Fantasy Potential Score' for a player.
 * @param {Object} player - The player data from Sorare.
 * @returns {number} - The calculated score.
 */
function calculateScore(player) {
    if (!player || !player.so5Scores) return 0;

    const stats = player.so5Scores;
    const l5 = stats.slice(0, 5);
    const l15 = stats.slice(0, 10);

    const avgL5 = l5.length > 0 ? l5.reduce((sum, s) => sum + s.score, 0) / l5.length : 0;
    const avgL15 = l15.length > 0 ? l15.reduce((sum, s) => sum + s.score, 0) / l15.length : 0;

    // Weighting: 60% Form (L5), 40% Stability (L15)
    const score = (avgL5 * 0.6) + (avgL15 * 0.4);

    return parseFloat(score.toFixed(2));
}

/**
 * Calculates a 'Value Score' for a player (Bargain detection).
 * High performance + High Stability = High Value.
 * @param {Object} player - The player data.
 * @param {number} potentialScore - The previously calculated potential score.
 * @returns {number}
 */
function calculateValueScore(player, potentialScore) {
    if (!player || !player.so5Scores) return 0;

    // Heuristic: Value is higher if the player has a high L15 average relative to L5 (Stability)
    // and if they are currently "Fit".
    const l15 = player.so5Scores;
    const avgL15 = l15.length > 0 ? (l15.reduce((s, x) => s + x.score, 0) / l15.length) : 0;

    const isFit = !(player.activeSuspensions && player.activeSuspensions.length > 0) &&
        !(player.activeInjuries && player.activeInjuries.length > 0);

    // Efficiency Index: (Potential Score * Stability Factor)
    const stabilityFactor = avgL15 > 0 ? (potentialScore / avgL15) : 1;
    let valueScore = potentialScore * stabilityFactor;

    if (!isFit) valueScore *= 0.5; // Penalize non-fit players in value rank

    return parseFloat(valueScore.toFixed(2));
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

    const getPlayerStatus = (p) => {
        if (!p) return null;
        if (p.activeSuspensions && p.activeSuspensions.length > 0) return 'Suspended';
        if (p.activeInjuries && p.activeInjuries.length > 0) return 'Injured';
        return 'Fit';
    };


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
                status: getPlayerStatus(p),
                score: calculateScore(p),
                valueScore: calculateValueScore(p, calculateScore(p)),
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


/**
 * Fetches and ranks the top 10 bargain players from the entire league.
 */
async function getGlobalBargains() {
    let allPlayersData = [];
    console.log(`Fetching global bargains from ${LA_LIGA_CLUBS.length} clubs...`);

    for (const clubSlug of LA_LIGA_CLUBS) {
        try {
            const players = await fetchClubPlayers(clubSlug);
            if (players && players.length > 0) {
                console.log(`[OK] ${clubSlug}: ${players.length} players`);
                allPlayersData.push(...players);
            } else {
                console.log(`[EMPTY] ${clubSlug}: No players found`);
            }
        } catch (error) {
            console.error(`[ERROR] ${clubSlug}:`, error.message);
        }
    }

    if (allPlayersData.length === 0) {
        console.warn('NO PLAYERS FETCHED IN GLOBAL BARGAINS');
        return [];
    }

    const getPlayerStatus = (p) => {
        if (!p) return null;
        if (p.activeSuspensions && p.activeSuspensions.length > 0) return 'Suspended';
        if (p.activeInjuries && p.activeInjuries.length > 0) return 'Injured';
        return 'Fit';
    };

    const ranked = allPlayersData.map(p => {
        const potentialScore = calculateScore(p);
        return {
            name: p.displayName,
            slug: p.slug,
            position: p.position,
            status: getPlayerStatus(p),
            score: potentialScore,
            valueScore: calculateValueScore(p, potentialScore),
            l5: p.so5Scores ? (p.so5Scores.slice(0, 5).reduce((s, x) => s + x.score, 0) / Math.max(1, p.so5Scores.slice(0, 5).length)).toFixed(1) : '0',
            l15: p.so5Scores ? (p.so5Scores.reduce((s, x) => s + x.score, 0) / Math.max(1, p.so5Scores.length)).toFixed(1) : '0'
        };
    })
        .sort((a, b) => b.valueScore - a.valueScore) // Sort by Value (Bargains)
        .slice(0, 10); // Only return Top 10

    return ranked;
}

module.exports = { calculateScore, getRankings, getBestXI, getGlobalBargains };
