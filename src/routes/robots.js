const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// GET /api/robots — List all robots (optional ?warehouse_id= filter)
router.get('/', async (req, res) => {
    const { warehouse_id } = req.query;
    try {
        let query = `SELECT r.*, t.type as current_task_type, t.priority as current_task_priority,
              w.name as warehouse_name
       FROM robots r
       LEFT JOIN tasks t ON r.current_task_id = t.id
       LEFT JOIN warehouses w ON r.warehouse_id = w.id`;
        const params = [];
        if (warehouse_id) {
            query += ' WHERE r.warehouse_id = $1';
            params.push(warehouse_id);
        }
        query += ' ORDER BY r.name ASC';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/robots/:id — Single robot
router.get('/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM robots WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Robot not found' });
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/robots/:id — Update robot state
router.patch('/:id', async (req, res) => {
    const { status, battery_level, position_x, position_y } = req.body;
    try {
        const result = await pool.query(
            `UPDATE robots SET
         status = COALESCE($1, status),
         battery_level = COALESCE($2, battery_level),
         position_x = COALESCE($3, position_x),
         position_y = COALESCE($4, position_y),
         last_seen = NOW()
       WHERE id = $5 RETURNING *`,
            [status, battery_level, position_x, position_y, req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
