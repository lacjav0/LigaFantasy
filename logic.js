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
 * Calculates a form factor based on the team's last 5 games.
 * @param {Object} activeClub - The club object containing games.
 * @returns {number} - Multiplier between 0.9 and 1.1
 */
function calculateTeamFormFactor(activeClub) {
    if (!activeClub || !activeClub.games || !activeClub.games.nodes || activeClub.games.nodes.length === 0) {
        return 1.0;
    }

    let points = 0;
    let validGames = 0;

    for (const game of activeClub.games.nodes) {
        if (game.homeGoals !== null && game.awayGoals !== null && game.homeTeam && game.awayTeam) {
            const isHome = game.homeTeam.name === activeClub.name;
            const clubGoals = isHome ? game.homeGoals : game.awayGoals;
            const oppGoals = isHome ? game.awayGoals : game.homeGoals;
            
            if (clubGoals > oppGoals) {
                points += 3;
            } else if (clubGoals === oppGoals) {
                points += 1;
            }
            validGames += 1;
        }
    }

    if (validGames === 0) return 1.0;

    const maxPoints = validGames * 3;
    // Scale from 0.9 to 1.1 based on points / maxPoints
    const formFactor = 0.9 + (points / maxPoints) * 0.2;
    return formFactor;
}
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
    let score = (avgL5 * 0.6) + (avgL15 * 0.4);

    // Apply Team Form Factor
    const teamFormFactor = calculateTeamFormFactor(player.activeClub);
    score = score * teamFormFactor;

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
    const fitPlayers = rankedPlayers.filter(p => !p.status || p.status === 'Fit');
    const playersByPos = {
        'Goalkeeper': fitPlayers.filter(p => p.position === 'Goalkeeper'),
        'Defender': fitPlayers.filter(p => p.position === 'Defender'),
        'Midfielder': fitPlayers.filter(p => p.position === 'Midfielder'),
        'Forward': fitPlayers.filter(p => p.position === 'Forward')
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
async function getRankings(slugsWithMeta, formation) {
    const failedSlugs = [];

    const getPlayerStatus = (p) => {
        if (!p) return null;
        if (p.activeSuspensions && p.activeSuspensions.length > 0) return 'Suspended';
        if (p.activeInjuries && p.activeInjuries.length > 0) return 'Injured';
        return 'Fit';
    };

    // Fallback mapping for common players
    const commonMapping = {
        'tsygankov': 'viktor-tsygankov',
        'unai simon': 'unai-simon-mendibil',
        'bellingham': 'jude-bellingham',
        'lewandowski': 'robert-lewandowski',
        'griezmann': 'antoine-griezmann',
        'vinicius': 'vinicius-jose-paixao-de-oliveira-junior'
    };

    const playersData = [];
    
    // Process strictly sequentially (chunkSize = 1) to avoid ECONNRESET and rate limits from Sorare GraphQL
    for (let i = 0; i < slugsWithMeta.length; i++) {
        const playerMeta = slugsWithMeta[i];
        const input = playerMeta.slug || playerMeta; // Support both object and string for backward compatibility
        const cleanInput = (typeof input === 'string' ? input : input.slug).trim().toLowerCase();

        let p = null;
        try {
            // 1. Try direct slug match
            p = await fetchPlayerStats(cleanInput);

            // 2. Try common mapping
            if (!p && commonMapping[cleanInput]) {
                p = await fetchPlayerStats(commonMapping[cleanInput]);
            }
        } catch (error) {
            console.error(`Error fetching data for ${cleanInput}: ${error.message}`);
        }

        if (!p) {
            failedSlugs.push(cleanInput);
        } else {
            // Attach metadata for the next map
            p.club = playerMeta.club || 'Desconocido';
            p.customPosition = playerMeta.customPosition;
            playersData.push(p);
        }
        
        // Very short delay between requests
        if (i < slugsWithMeta.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }

    const ranked = playersData
        .filter(p => p !== null && p !== undefined)
        .map(p => {
            const potentialScore = calculateScore(p);
            // Override position if provided
            const finalPosition = p.customPosition || p.position;

            return {
                name: p.displayName,
                slug: p.slug,
                club: p.club,
                position: finalPosition,
                status: getPlayerStatus(p),
                score: potentialScore,
                valueScore: calculateValueScore(p, potentialScore),
                l5: p.so5Scores[0] ? p.so5Scores[0].score.toFixed(1) : '0',
                l15: p.so5Scores[0] ? p.so5Scores[0].score.toFixed(1) : '0'
            };
        })
        .sort((a, b) => b.score - a.score);

    let bestXI = [];
    let detectedFormation = formation;

    if (formation === 'auto') {
        const ALL_FORMATIONS = ['4-4-2', '4-3-3', '3-5-2', '4-5-1', '5-3-2', '5-4-1'];
        let maxScore = -1;

        for (const form of ALL_FORMATIONS) {
            const tempXI = getBestXI(ranked, form);
            // Solo considerar formaciones que se pueden completas (11 jugadores)
            if (tempXI.length === 11) {
                const currentScore = tempXI.reduce((sum, p) => sum + p.score, 0);
                if (currentScore > maxScore) {
                    maxScore = currentScore;
                    bestXI = tempXI;
                    detectedFormation = form;
                }
            }
        }

        // Fallback por si ninguna formación tiene 11 jugadores
        if (bestXI.length === 0) {
            for (const form of ALL_FORMATIONS) {
                const tempXI = getBestXI(ranked, form);
                if (tempXI.length > bestXI.length) {
                    bestXI = tempXI;
                    detectedFormation = form;
                }
            }
        }
        console.log(`Auto-detected best formation: ${detectedFormation} with score: ${maxScore}`);
    } else if (formation) {
        console.log(`Calculating Best XI for formation: ${formation}`);
        bestXI = getBestXI(ranked, formation);
        console.log(`Best XI calculated: ${bestXI.length} players`);
    }

    return { ranked, bestXI, failedSlugs, detectedFormation };
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

module.exports = { calculateScore, calculateTeamFormFactor, getRankings, getBestXI, getGlobalBargains };
