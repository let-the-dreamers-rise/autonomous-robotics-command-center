const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// GET /api/warehouses — List all warehouses
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT w.*,
              (SELECT COUNT(*) FROM robots WHERE warehouse_id = w.id) as robot_count,
              (SELECT COUNT(*) FROM simulation_runs WHERE warehouse_id = w.id) as run_count
       FROM warehouses w ORDER BY w.created_at DESC`
        );
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/warehouses/:id — Single warehouse with details
router.get('/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM warehouses WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Warehouse not found' });

        // Get robots in this warehouse
        const robots = await pool.query('SELECT * FROM robots WHERE warehouse_id = $1', [req.params.id]);

        res.json({ ...result.rows[0], robots: robots.rows });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/warehouses — Create a warehouse
router.post('/', async (req, res) => {
    const { name, location, grid_width, grid_height, config } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    try {
        const result = await pool.query(
            `INSERT INTO warehouses (name, location, grid_width, grid_height, config)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [name, location || null, grid_width || 100, grid_height || 100, config || '{}']
        );
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/warehouses/:id — Update warehouse
router.patch('/:id', async (req, res) => {
    const { name, location, grid_width, grid_height, status, config } = req.body;
    try {
        const result = await pool.query(
            `UPDATE warehouses SET
         name = COALESCE($1, name),
         location = COALESCE($2, location),
         grid_width = COALESCE($3, grid_width),
         grid_height = COALESCE($4, grid_height),
         status = COALESCE($5, status),
         config = COALESCE($6, config)
       WHERE id = $7 RETURNING *`,
            [name, location, grid_width, grid_height, status, config, req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Warehouse not found' });
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/warehouses/:id — Delete warehouse
router.delete('/:id', async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM warehouses WHERE id = $1 RETURNING *', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Warehouse not found' });
        res.json({ message: 'Warehouse deleted', warehouse: result.rows[0] });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
