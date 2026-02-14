require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

// Import routes
const simulationRoutes = require('./src/routes/simulations');
const telemetryRoutes = require('./src/routes/telemetry');
const robotRoutes = require('./src/routes/robots');
const taskRoutes = require('./src/routes/tasks');
const metricRoutes = require('./src/routes/metrics');
const aiRoutes = require('./src/routes/ai');
const scenarioRoutes = require('./src/routes/scenarios');
const warehouseRoutes = require('./src/routes/warehouses');
const userRoutes = require('./src/routes/users');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname, 'frontend', 'dist')));

// Health Check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'active',
        system: 'Autonomous Robotics Command Center',
        version: '2.0.0',
        uptime: process.uptime(),
        timestamp: new Date()
    });
});

// Mount Routes
app.use('/api/simulations', simulationRoutes);
app.use('/api/telemetry', telemetryRoutes);
app.use('/api/robots', robotRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/metrics', metricRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/scenarios', scenarioRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/users', userRoutes);

// Catch-all: serve frontend for non-API routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
});

// Start
app.listen(port, () => {
    console.log(`🤖 Autonomous Robotics Command Center running on Port ${port}`);
    console.log(`   API:       http://localhost:${port}/api/health`);
    console.log(`   Dashboard: http://localhost:${port}`);
});
