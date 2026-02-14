const express = require('express');
const router = express.Router();
const { pool, redisClient } = require('../config/db');

// POST /api/telemetry/:run_id — High-frequency robot data ingestion
router.post('/:run_id', async (req, res) => {
    const { run_id } = req.params;
    const { robot_id, x, y, velocity, battery, sensors, event_type } = req.body;

    try {
        // 1. Write to Redis for real-time dashboard (expires in 60s)
        const stateKey = `robot:${robot_id || 'unknown'}`;
        await redisClient.set(stateKey, JSON.stringify({
            run_id, x, y, velocity, battery, sensors, event_type,
            timestamp: new Date().toISOString()
        }), { EX: 60 });

        // 2. Update robot position in DB
        if (robot_id) {
            await pool.query(
                `UPDATE robots SET position_x = $1, position_y = $2, battery_level = $3,
         status = 'active', last_seen = NOW() WHERE id = $4`,
                [x, y, battery, robot_id]
            );
        }

        // 3. Persist telemetry log (async, non-blocking)
        pool.query(
            `INSERT INTO telemetry_logs (run_id, robot_id, position_x, position_y, velocity, battery_level, sensor_data, event_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [run_id, robot_id, x, y, velocity, battery, sensors || {}, event_type || 'heartbeat']
        );

        res.json({ status: 'ok' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/telemetry/:run_id/history — Get telemetry trail for a run
router.get('/:run_id/history', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM telemetry_logs WHERE run_id = $1 ORDER BY timestamp ASC LIMIT 500`,
            [req.params.run_id]
        );
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
