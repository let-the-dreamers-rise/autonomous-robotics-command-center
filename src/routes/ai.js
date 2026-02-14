const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const aiEngine = require('../services/aiEngine');
const selfImprover = require('../services/selfImprover');

// POST /api/ai/optimize/:run_id — Optimize task assignments
router.post('/optimize/:run_id', async (req, res) => {
    try {
        const result = await aiEngine.optimizeTasks(req.params.run_id);
        res.json(result);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/ai/analyze/:run_id — Post-run analysis
router.post('/analyze/:run_id', async (req, res) => {
    try {
        const result = await aiEngine.analyzeRun(req.params.run_id);
        res.json(result);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/ai/improve/:scenario_id — Self-improvement loop
router.post('/improve/:scenario_id', async (req, res) => {
    try {
        const result = await selfImprover.improveStrategy(req.params.scenario_id);
        res.json(result);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/ai/decisions — List recent AI decisions
router.get('/decisions', async (req, res) => {
    const { run_id, limit } = req.query;
    try {
        let query = 'SELECT * FROM ai_decisions';
        const params = [];
        if (run_id) {
            query += ' WHERE run_id = $1';
            params.push(run_id);
        }
        query += ' ORDER BY timestamp DESC LIMIT $' + (params.length + 1);
        params.push(parseInt(limit) || 20);
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
