require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const redis = require('redis');
const cors = require('cors');
const bodyParser = require('body-parser');

// 1. Setup Express
const app = express();
const port = 3000;
app.use(cors());
app.use(bodyParser.json());

// 2. Setup Database Connection
const pool = new Pool({
  user: 'admin',
  host: 'localhost',
  database: 'robotics_v1',
  password: 'securepassword123',
  port: 5432,
});

// 3. Setup Redis (Caching/Realtime)
const redisClient = redis.createClient();
redisClient.connect().catch(console.error);

// --- API ENDPOINTS ---

// Health Check
app.get('/', (req, res) => {
  res.json({ status: 'active', system: 'robotics-backend', time: new Date() });
});

// A. Create Simulation Run
app.post('/api/simulations/start', async (req, res) => {
  const { scenario_id, username } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO simulation_runs (scenario_id, status) VALUES (\$1, 'running') RETURNING id",
      [scenario_id]
    );
    res.json({ run_id: result.rows[0].id, status: 'started' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// B. Ingest Telemetry (High Frequency)
app.post('/api/telemetry/:run_id', async (req, res) => {
  const { run_id } = req.params;
  const { x, y, velocity, battery, sensors } = req.body;
  
  // Fast write to Redis for Dashboard (Real-time)
  await redisClient.set(`robot_state:${run_id}`, JSON.stringify(req.body), { EX: 60 });

  // Async write to DB (Persist)
  pool.query(
    "INSERT INTO telemetry_logs (run_id, position_x, position_y, velocity, battery_level, sensor_data) VALUES (\$1, \$2, \$3, \$4, \$5, \$6)",
    [run_id, x, y, velocity, battery, sensors]
  );
  
  res.json({ status: 'ok' });
});

// C. Get Dashboard Metrics
app.get('/api/metrics/runs', async (req, res) => {
  const result = await pool.query("SELECT * FROM simulation_runs ORDER BY start_time DESC LIMIT 10");
  res.json(result.rows);
});

// Start Server
app.listen(port, () => {
  console.log(`🚀 Robotics Backend running on Port ${port}`);
});
