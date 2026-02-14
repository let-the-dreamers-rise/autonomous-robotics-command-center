const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// GET /api/metrics/runs — Aggregated run metrics for dashboard
router.get('/runs', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT m.*, sr.run_number, sr.status as run_status, sr.start_time, sr.end_time,
              s.name as scenario_name
       FROM metrics m
       JOIN simulation_runs sr ON m.run_id = sr.id
       LEFT JOIN scenarios s ON sr.scenario_id = s.id
       ORDER BY sr.start_time DESC LIMIT 20`
        );
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/metrics/compare — Compare metrics across runs (Self-Improvement view)
router.get('/compare', async (req, res) => {
    const { scenario_id } = req.query;
    try {
        let query = `
      SELECT m.*, sr.run_number, sr.strategy_json, sr.final_score, sr.improvement_notes,
             s.name as scenario_name
      FROM metrics m
      JOIN simulation_runs sr ON m.run_id = sr.id
      LEFT JOIN scenarios s ON sr.scenario_id = s.id
    `;
        const params = [];
        if (scenario_id) {
            query += ' WHERE sr.scenario_id = $1';
            params.push(scenario_id);
        }
        query += ' ORDER BY sr.run_number ASC LIMIT 50';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/metrics — Store metrics for a run
router.post('/', async (req, res) => {
    const { run_id, total_tasks, completed_tasks, failed_tasks, avg_completion_time_ms,
        throughput, avg_battery_usage, ai_decisions_count, avg_ai_latency_ms, efficiency_score } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO metrics (run_id, total_tasks, completed_tasks, failed_tasks, avg_completion_time_ms,
       throughput, avg_battery_usage, ai_decisions_count, avg_ai_latency_ms, efficiency_score)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (run_id) DO UPDATE SET
         total_tasks = EXCLUDED.total_tasks, completed_tasks = EXCLUDED.completed_tasks,
         failed_tasks = EXCLUDED.failed_tasks, throughput = EXCLUDED.throughput,
         efficiency_score = EXCLUDED.efficiency_score
       RETURNING *`,
            [run_id, total_tasks, completed_tasks, failed_tasks, avg_completion_time_ms,
                throughput, avg_battery_usage, ai_decisions_count, avg_ai_latency_ms, efficiency_score]
        );
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/metrics/dashboard — Aggregate stats for dashboard cards
router.get('/dashboard', async (req, res) => {
    try {
        const [runs, robots, tasks, ai] = await Promise.all([
            pool.query(`SELECT COUNT(*) as total_runs,
                         COUNT(*) FILTER (WHERE status = 'running') as active_runs,
                         AVG(final_score) as avg_score
                  FROM simulation_runs`),
            pool.query(`SELECT COUNT(*) as total_robots,
                         COUNT(*) FILTER (WHERE status = 'active') as active_robots,
                         AVG(battery_level) as avg_battery
                  FROM robots`),
            pool.query(`SELECT COUNT(*) as total_tasks,
                         COUNT(*) FILTER (WHERE status = 'completed') as completed,
                         COUNT(*) FILTER (WHERE status = 'failed') as failed
                  FROM tasks`),
            pool.query(`SELECT COUNT(*) as total_decisions, AVG(latency_ms) as avg_latency,
                         AVG(confidence) as avg_confidence
                  FROM ai_decisions`)
        ]);
        res.json({
            runs: runs.rows[0],
            robots: robots.rows[0],
            tasks: tasks.rows[0],
            ai: ai.rows[0]
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/metrics/scenarios — List available scenarios
router.get('/scenarios', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM scenarios ORDER BY difficulty ASC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
