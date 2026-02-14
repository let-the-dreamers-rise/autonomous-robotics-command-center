const express = require('express');
const router = express.Router();
const scenarioEngine = require('../services/scenarioEngine');

// GET /api/scenarios — List available scenario triggers
router.get('/', (req, res) => {
    res.json(scenarioEngine.listScenarios());
});

// POST /api/scenarios/trigger — Trigger a scenario
router.post('/trigger', async (req, res) => {
    const { run_id, scenario_type } = req.body;
    if (!run_id || !scenario_type) {
        return res.status(400).json({ error: 'run_id and scenario_type are required' });
    }
    try {
        const result = await scenarioEngine.triggerScenario(run_id, scenario_type);
        res.json(result);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
