const express = require('express');
const cors = require('cors');
const { getRankings } = require('./logic');
const fs = require('fs');
const path = require('path');

const SAVED_LIST_PATH = path.join(__dirname, 'players_list.json');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.post('/api/rankings', async (req, res) => {
    try {
        const { slugs, formation } = req.body;
        console.log('RANKINGS REQUEST:', { slugsCount: slugs ? slugs.length : 'none', formation });
        if (!slugs || !Array.isArray(slugs)) {
            return res.status(400).json({ error: 'Invalid slugs list' });
        }

        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        const response = await getRankings(slugs, formation);
        console.log('RANKINGS SUCCESS:', { ranked: response.ranked.length, bestXI: response.bestXI.length });
        res.json(response);
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Failed to fetch rankings', details: error.message });
    }
});

app.post('/api/search', async (req, res) => {
    try {
        const { query } = req.body;
        if (!query) return res.status(400).json({ error: 'Query required' });

        const results = await require('./sorareClient').searchPlayer(query);
        res.json(results);
    } catch (error) {
        console.error('Search API Error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

app.get('/api/load', (req, res) => {
    try {
        if (fs.existsSync(SAVED_LIST_PATH)) {
            const data = fs.readFileSync(SAVED_LIST_PATH, 'utf8');
            return res.json(JSON.parse(data));
        }
        res.json({ slugs: [] });
    } catch (error) {
        console.error('Load Error:', error);
        res.status(500).json({ error: 'Failed to load list' });
    }
});

app.post('/api/save', (req, res) => {
    try {
        const { slugs } = req.body;
        if (!slugs || !Array.isArray(slugs)) {
            return res.status(400).json({ error: 'Invalid slugs' });
        }
        fs.writeFileSync(SAVED_LIST_PATH, JSON.stringify({ slugs }, null, 2));
        res.json({ success: true });
    } catch (error) {
        console.error('Save Error:', error);
        res.status(500).json({ error: 'Failed to save list' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
