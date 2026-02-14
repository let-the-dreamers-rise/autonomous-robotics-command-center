const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const aiEngine = require('../services/aiEngine');
const selfImprover = require('../services/selfImprover');
const copilot = require('../services/copilot');
const demoMode = require('../services/demoMode');
const alerting = require('../services/alerting');

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

// ============================================
// AI COPILOT
// ============================================

// POST /api/ai/copilot — Chat with AI Operations Copilot
router.post('/copilot', async (req, res) => {
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: 'question is required' });
    try {
        const result = await copilot.chat(question);
        res.json(result);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/ai/auto-optimize — AI auto-assigns tasks
router.post('/auto-optimize', async (req, res) => {
    try {
        const result = await copilot.autoOptimize();
        res.json(result);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================
// DEMO MODE
// ============================================

// POST /api/ai/demo — Generate one demo run
router.post('/demo', async (req, res) => {
    try {
        const result = await demoMode.generateDemoRun();
        res.json(result);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/ai/demo/full — Generate 3 runs showing self-improvement
router.post('/demo/full', async (req, res) => {
    try {
        const result = await demoMode.generateFullDemo();
        res.json(result);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================
// ALERTING
// ============================================

// GET /api/ai/alerts — Get recent alerts
router.get('/alerts', async (req, res) => {
    res.json(alerting.getAlertLog());
});

// POST /api/ai/alerts/check — Run health check + fire alerts
router.post('/alerts/check', async (req, res) => {
    try {
        const alerts = await alerting.checkFleetHealth();
        res.json({ alerts_fired: alerts.length, alerts });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================
// REPLAY
// ============================================

// GET /api/ai/replay/:run_id — Get full run replay data
router.get('/replay/:run_id', async (req, res) => {
    try {
        const [run, telemetry, tasks, decisions, metrics] = await Promise.all([
            pool.query(`SELECT sr.*, s.name as scenario_name FROM simulation_runs sr
                  LEFT JOIN scenarios s ON sr.scenario_id = s.id WHERE sr.id = $1`, [req.params.run_id]),
            pool.query('SELECT * FROM telemetry_logs WHERE run_id = $1 ORDER BY timestamp ASC', [req.params.run_id]),
            pool.query('SELECT * FROM tasks WHERE run_id = $1 ORDER BY created_at ASC', [req.params.run_id]),
            pool.query('SELECT * FROM ai_decisions WHERE run_id = $1 ORDER BY timestamp ASC', [req.params.run_id]),
            pool.query('SELECT * FROM metrics WHERE run_id = $1', [req.params.run_id])
        ]);

        res.json({
            run: run.rows[0] || {},
            telemetry: telemetry.rows,
            tasks: tasks.rows,
            ai_decisions: decisions.rows,
            metrics: metrics.rows[0] || {},
            total_events: telemetry.rows.length + decisions.rows.length
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
