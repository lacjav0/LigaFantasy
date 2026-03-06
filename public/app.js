document.addEventListener('DOMContentLoaded', () => {
    const optimizeBtn = document.getElementById('optimize-btn');
    const slugsInput = document.getElementById('slugs-input');
    const resultsSection = document.getElementById('results-section');
    const rankingsGrid = document.getElementById('rankings-grid');
    const loader = document.getElementById('loader');

    const playerSearch = document.getElementById('player-search');
    const searchResults = document.getElementById('search-results');
    const saveBtn = document.getElementById('save-btn');
    const globalBargainsBtn = document.getElementById('global-bargains-btn');

    // Auto-load saved list on startup
    async function loadSavedList() {
        try {
            const response = await fetch('/api/load');
            const data = await response.json();
            if (data.slugs && data.slugs.length > 0) {
                slugsInput.value = data.slugs.join('\n');
            } else {
                // Default fallback if no saved list
                slugsInput.value = "jude-bellingham\nrobert-lewandowski\nantoine-griezmann\nvinicius-jose-paixao-de-oliveira-junior";
            }
        } catch (error) {
            console.error('Failed to load saved list:', error);
        }
    }
    loadSavedList();

    saveBtn.addEventListener('click', async () => {
        const text = slugsInput.value.trim();
        const slugs = text.split('\n').map(s => s.trim()).filter(s => s.length > 0);

        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="ph ph-circle-notch"></i> Guardando...';

        try {
            const response = await fetch('/api/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slugs })
            });

            if (response.ok) {
                saveBtn.innerHTML = '<i class="ph ph-check-circle"></i> ¡Guardado!';
                saveBtn.style.color = 'var(--success)';
            } else {
                throw new Error('Save failed');
            }
        } catch (error) {
            console.error('Error saving list:', error);
            saveBtn.innerHTML = '<i class="ph ph-x-circle"></i> Error';
            saveBtn.style.color = 'var(--danger)';
        } finally {
            setTimeout(() => {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="ph ph-floppy-disk"></i> Guardar Lista';
                saveBtn.style.color = '';
            }, 2000);
        }
    });

    // Sample data for quick testing if user wants it (Moved to loadSavedList)

    // Search logic with debounce
    let searchTimeout;
    playerSearch.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        const query = playerSearch.value.trim();

        if (query.length < 2) {
            searchResults.classList.add('hidden');
            return;
        }

        searchTimeout = setTimeout(async () => {
            try {
                const response = await fetch('/api/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query })
                });
                const results = await response.json();
                renderSearchResults(results);
            } catch (error) {
                console.error('Search error:', error);
            }
        }, 300);
    });

    function renderSearchResults(results) {
        searchResults.innerHTML = '';
        if (results.length === 0) {
            searchResults.innerHTML = '<div class="search-item">No se encontraron jugadores</div>';
        } else {
            results.forEach(p => {
                const item = document.createElement('div');
                item.className = 'search-item';
                item.innerHTML = `
                    <span>${p.displayName}</span>
                    <span class="add-btn">Añadir</span>
                `;
                item.onclick = () => {
                    addSlug(p.slug);
                    playerSearch.value = '';
                    searchResults.classList.add('hidden');
                };
                searchResults.appendChild(item);
            });
        }
        searchResults.classList.remove('hidden');
    }

    function addSlug(slug) {
        const current = slugsInput.value.trim();
        const slugs = current ? current.split('\n') : [];
        if (!slugs.includes(slug)) {
            slugs.push(slug);
            slugsInput.value = slugs.join('\n');
            // Flash effect
            slugsInput.style.borderColor = 'var(--accent)';
            setTimeout(() => slugsInput.style.borderColor = '', 500);
        }
    }

    // Close search results when clicking outside
    document.addEventListener('click', (e) => {
        if (!playerSearch.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.classList.add('hidden');
        }
    });

    let currentRankings = [];
    let currentFailedSlugs = [];

    optimizeBtn.addEventListener('click', async () => {
        const text = slugsInput.value.trim();
        const formation = document.getElementById('formation-select').value;
        if (!text) {
            alert('Por favor, introduce al menos un slug de jugador.');
            return;
        }

        const slugs = text.split('\n').map(s => s.trim()).filter(s => s.length > 0);

        showLoader(true);

        try {
            const response = await fetch('/api/rankings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slugs, formation })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.details || 'Error desconocido en el servidor');
            }

            const data = await response.json();
            currentRankings = data.ranked;
            currentFailedSlugs = data.failedSlugs;

            // Ensure Best XI container is visible for regular optimization
            document.getElementById('best-xi-container').classList.remove('hidden');

            renderBestXI(data.bestXI);
            applySortingAndRender();
            resultsSection.classList.remove('hidden');
        } catch (error) {
            console.error(error);
            alert(`Hubo un error al obtener los datos: ${error.message}`);
        } finally {
            showLoader(false);
        }
    });

    const sortSelect = document.getElementById('sort-select');
    sortSelect.addEventListener('change', () => {
        applySortingAndRender();
    });

    function applySortingAndRender() {
        const sortBy = sortSelect.value;
        const sorted = [...currentRankings].sort((a, b) => {
            if (sortBy === 'value') return b.valueScore - a.valueScore;
            return b.score - a.score;
        });
        renderRankings(sorted, currentFailedSlugs);
    }

    globalBargainsBtn.addEventListener('click', async () => {
        showLoader(true);
        try {
            const response = await fetch('/api/bargains/global');
            if (!response.ok) throw new Error('Error al obtener chollos globales');

            const data = await response.json();
            currentRankings = data;
            currentFailedSlugs = [];

            // Hide the Best XI since this is a global list, not a team selection
            document.getElementById('best-xi-container').classList.add('hidden');

            // Adjust results title
            document.querySelector('#all-rankings-container h3').innerHTML = '<i class="ph ph-fire"></i> Top 10 Chollos de La Liga';

            renderRankings(data, []);
            resultsSection.classList.remove('hidden');

            // Auto-sort to value
            document.getElementById('sort-select').value = 'value';

            // Scroll to results
            resultsSection.scrollIntoView({ behavior: 'smooth' });
        } catch (error) {
            console.error(error);
            alert(`Error: ${error.message}`);
        } finally {
            showLoader(false);
        }
    });

    function renderBestXI(players) {
        const bestXIGrid = document.getElementById('best-xi-grid');
        bestXIGrid.innerHTML = '';

        if (!players || players.length === 0) {
            bestXIGrid.innerHTML = '<p class="empty-msg">No hay suficientes jugadores para esta formación.</p>';
            return;
        }

        players.forEach((p, index) => {
            const card = createPlayerCard(p, index);
            bestXIGrid.appendChild(card);
        });
    }

    function renderRankings(rankings, failedSlugs) {
        rankingsGrid.innerHTML = '';

        if (failedSlugs && failedSlugs.length > 0) {
            const warning = document.createElement('div');
            warning.className = 'warning-box';
            warning.innerHTML = `
                <i class="ph ph-warning-circle"></i>
                <p>No se encontraron datos para: <strong>${failedSlugs.join(', ')}</strong>. 
                Asegúrate de usar los slugs correctos (ej: 'viktor-tsygankov' en vez de 'Tsygankov').</p>
            `;
            rankingsGrid.appendChild(warning);
        }

        if (rankings.length === 0 && (!failedSlugs || failedSlugs.length === 0)) {
            rankingsGrid.innerHTML = '<p class="empty-msg">No se han procesado jugadores.</p>';
            return;
        }

        rankings.forEach((p, index) => {
            const card = createPlayerCard(p, index);
            rankingsGrid.appendChild(card);
        });
    }

    function createPlayerCard(p, index) {
        const card = document.createElement('div');
        card.className = 'player-card';
        if (p.status && p.status !== 'Fit') {
            card.classList.add(`status-${p.status.toLowerCase()}`);
        }
        card.style.animationDelay = `${index * 0.1}s`;

        const statusLabel = p.status && p.status !== 'Fit' ? `<span class="player-status-badge">${p.status}</span>` : '';

        card.innerHTML = `
            <div class="rank-badge">#${index + 1}</div>
            <div class="player-main">
                <div class="player-info-row">
                    <span class="player-pos">${translatePosition(p.position)}</span>
                    ${statusLabel}
                </div>
                <span class="player-name">${p.name}</span>
            </div>
            <div class="player-stats">
                <div class="stat-box">
                    <span class="stat-label">FORM (L5)</span>
                    <span class="stat-value">${p.l5}</span>
                </div>
                <div class="stat-box">
                    <span class="stat-label">STAB (L15)</span>
                    <span class="stat-value">${p.l15}</span>
                </div>
                <div class="stat-box">
                    <span class="stat-label">POTENCIAL</span>
                    <span class="stat-value potential">${p.score}</span>
                </div>
                <div class="stat-box">
                    <span class="stat-label">VALOR</span>
                    <span class="stat-value value">${p.valueScore}</span>
                </div>
            </div>
        `;
        return card;
    }

    function translatePosition(pos) {
        const dict = {
            'Forward': 'Delantero',
            'Midfielder': 'Centrocampista',
            'Defender': 'Defensa',
            'Goalkeeper': 'Portero'
        };
        return dict[pos] || pos;
    }

    function showLoader(show) {
        if (show) loader.classList.remove('hidden');
        else loader.classList.add('hidden');
    }
});
