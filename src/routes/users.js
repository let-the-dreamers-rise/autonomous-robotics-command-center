const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// GET /api/users — List all users (admin only in production)
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, username, role, created_at FROM users ORDER BY created_at DESC'
        );
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/users/:id — Single user
router.get('/:id', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, username, role, created_at FROM users WHERE id = $1', [req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/users — Create a user
router.post('/', async (req, res) => {
    const { username, role } = req.body;
    if (!username) return res.status(400).json({ error: 'username is required' });
    try {
        const result = await pool.query(
            `INSERT INTO users (username, role) VALUES ($1, $2) RETURNING id, username, api_key, role, created_at`,
            [username, role || 'viewer']
        );
        res.json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ error: 'Username already exists' });
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/users/:id — Update user role
router.patch('/:id', async (req, res) => {
    const { role } = req.body;
    try {
        const result = await pool.query(
            'UPDATE users SET role = COALESCE($1, role) WHERE id = $2 RETURNING id, username, role, created_at',
            [role, req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/users/:id — Delete user
router.delete('/:id', async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id, username', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json({ message: 'User deleted', user: result.rows[0] });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/users/auth — Authenticate via API key
router.post('/auth', async (req, res) => {
    const { api_key } = req.body;
    if (!api_key) return res.status(400).json({ error: 'api_key is required' });
    try {
        const result = await pool.query(
            'SELECT id, username, role FROM users WHERE api_key = $1', [api_key]
        );
        if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid API key' });
        res.json({ authenticated: true, user: result.rows[0] });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
