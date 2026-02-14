const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// GET /api/tasks?run_id=xxx — List tasks for a run
router.get('/', async (req, res) => {
    const { run_id } = req.query;
    try {
        let query = `SELECT t.*, r.name as robot_name FROM tasks t
                 LEFT JOIN robots r ON t.robot_id = r.id`;
        const params = [];
        if (run_id) {
            query += ' WHERE t.run_id = $1';
            params.push(run_id);
        }
        query += ' ORDER BY t.priority DESC, t.created_at DESC LIMIT 50';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/tasks — Create a task
router.post('/', async (req, res) => {
    const { run_id, robot_id, type, priority, origin_x, origin_y, destination_x, destination_y } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO tasks (run_id, robot_id, type, priority, origin_x, origin_y, destination_x, destination_y, status, assigned_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'assigned', NOW()) RETURNING *`,
            [run_id, robot_id, type || 'delivery', priority || 5, origin_x, origin_y, destination_x, destination_y]
        );
        // Update robot's current task
        if (robot_id) {
            await pool.query('UPDATE robots SET current_task_id = $1, status = $2 WHERE id = $3',
                [result.rows[0].id, 'working', robot_id]);
        }
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/tasks/:id — Update task status
router.patch('/:id', async (req, res) => {
    const { status } = req.body;
    try {
        const updates = { status };
        if (status === 'completed') updates.completed_at = new Date();
        const result = await pool.query(
            `UPDATE tasks SET status = $1, completed_at = $2 WHERE id = $3 RETURNING *`,
            [status, updates.completed_at || null, req.params.id]
        );
        // Free robot if completed
        if (status === 'completed' && result.rows[0]?.robot_id) {
            await pool.query("UPDATE robots SET status = 'idle', current_task_id = NULL WHERE id = $1",
                [result.rows[0].robot_id]);
        }
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
