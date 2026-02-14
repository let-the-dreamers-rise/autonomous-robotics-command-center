const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// GET /api/simulations — List recent runs (optional ?warehouse_id= filter)
router.get('/', async (req, res) => {
    const { warehouse_id } = req.query;
    try {
        let query = `SELECT sr.*, s.name as scenario_name, s.difficulty,
              m.efficiency_score, m.completed_tasks, m.total_tasks,
              w.name as warehouse_name
       FROM simulation_runs sr
       LEFT JOIN scenarios s ON sr.scenario_id = s.id
       LEFT JOIN metrics m ON m.run_id = sr.id
       LEFT JOIN warehouses w ON sr.warehouse_id = w.id`;
        const params = [];
        if (warehouse_id) {
            query += ' WHERE sr.warehouse_id = $1';
            params.push(warehouse_id);
        }
        query += ' ORDER BY sr.start_time DESC LIMIT 20';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/simulations/start — Start a new run
router.post('/start', async (req, res) => {
    const { scenario_id, strategy, warehouse_id } = req.body;
    try {
        // Get run count for this scenario
        const countResult = await pool.query(
            'SELECT COUNT(*) as cnt FROM simulation_runs WHERE scenario_id = $1', [scenario_id]
        );
        const runNumber = parseInt(countResult.rows[0].cnt) + 1;

        const result = await pool.query(
            `INSERT INTO simulation_runs (scenario_id, warehouse_id, status, strategy_json, run_number)
       VALUES ($1, $2, 'running', $3, $4) RETURNING *`,
            [scenario_id, warehouse_id || null, strategy || '{}', runNumber]
        );

        // Reset robots to idle (scoped to warehouse if provided)
        if (warehouse_id) {
            await pool.query("UPDATE robots SET status = 'idle', battery_level = 100.0 WHERE warehouse_id = $1", [warehouse_id]);
        } else {
            await pool.query("UPDATE robots SET status = 'idle', battery_level = 100.0");
        }

        res.json({ run: result.rows[0], message: `Run #${runNumber} started` });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/simulations/:id/stop — End a run
router.post('/:id/stop', async (req, res) => {
    const { id } = req.params;
    const { final_score } = req.body;
    try {
        const result = await pool.query(
            `UPDATE simulation_runs SET status = 'completed', end_time = NOW(), final_score = $1
       WHERE id = $2 RETURNING *`,
            [final_score || 0, id]
        );
        // Reset robots
        await pool.query("UPDATE robots SET status = 'idle', current_task_id = NULL");
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/simulations/:id — Single run details
router.get('/:id', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT sr.*, s.name as scenario_name, s.config_json as scenario_config
       FROM simulation_runs sr
       LEFT JOIN scenarios s ON sr.scenario_id = s.id
       WHERE sr.id = $1`, [req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Run not found' });
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
