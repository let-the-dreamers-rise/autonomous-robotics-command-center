// ============================================
// DEMO MODE — Auto-generates realistic data
// So the dashboard works without live simulation
// ============================================

const { pool } = require('../config/db');

async function generateDemoRun() {
    // 1. Pick a random scenario
    const scenarios = await pool.query('SELECT * FROM scenarios LIMIT 4');
    if (scenarios.rows.length === 0) return { error: 'No scenarios found. Run init_db.sql first.' };
    const scenario = scenarios.rows[Math.floor(Math.random() * scenarios.rows.length)];

    // 2. Get run count
    const countResult = await pool.query(
        'SELECT COUNT(*) as cnt FROM simulation_runs WHERE scenario_id = $1', [scenario.id]);
    const runNumber = parseInt(countResult.rows[0].cnt) + 1;

    // 3. Create run
    const run = await pool.query(
        `INSERT INTO simulation_runs (scenario_id, status, run_number, strategy_json)
     VALUES ($1, 'completed', $2, $3) RETURNING *`,
        [scenario.id, runNumber, JSON.stringify({
            version: runNumber,
            routing: runNumber > 2 ? 'zone-optimized' : 'nearest-first',
            battery_threshold: Math.max(15, 35 - runNumber * 5)
        })]
    );
    const runId = run.rows[0].id;

    // 4. Reset + randomize robots
    const robots = await pool.query('SELECT * FROM robots');
    for (const robot of robots.rows) {
        const battery = 30 + Math.random() * 70;
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        await pool.query(
            `UPDATE robots SET position_x = $1, position_y = $2, battery_level = $3,
       status = $4, last_seen = NOW() WHERE id = $5`,
            [x, y, battery, Math.random() > 0.15 ? 'active' : 'idle', robot.id]
        );
    }

    // 5. Generate tasks
    const taskCount = 8 + Math.floor(Math.random() * 12);
    let completedCount = 0;
    let failedCount = 0;
    for (let i = 0; i < taskCount; i++) {
        const robotIdx = Math.floor(Math.random() * robots.rows.length);
        const priority = Math.floor(Math.random() * 10) + 1;
        const status = Math.random() > 0.12 ? 'completed' : (Math.random() > 0.5 ? 'failed' : 'pending');
        if (status === 'completed') completedCount++;
        if (status === 'failed') failedCount++;

        await pool.query(
            `INSERT INTO tasks (run_id, robot_id, type, priority, status, origin_x, origin_y, destination_x, destination_y, assigned_at, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10)`,
            [runId, robots.rows[robotIdx].id,
                ['delivery', 'pickup', 'emergency', 'inspection'][Math.floor(Math.random() * 4)],
                priority, status,
                Math.random() * 100, Math.random() * 100,
                Math.random() * 100, Math.random() * 100,
                status === 'completed' ? new Date() : null]
        );
    }

    // 6. Generate telemetry logs (30 per run)
    for (let i = 0; i < 30; i++) {
        const robotIdx = Math.floor(Math.random() * robots.rows.length);
        await pool.query(
            `INSERT INTO telemetry_logs (run_id, robot_id, position_x, position_y, velocity, battery_level, sensor_data, event_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [runId, robots.rows[robotIdx].id,
                Math.random() * 100, Math.random() * 100,
                1 + Math.random() * 5, 20 + Math.random() * 80,
                JSON.stringify({ temp: 22 + Math.random() * 8, obstacle_nearby: Math.random() > 0.7 }),
                ['heartbeat', 'task_start', 'task_complete', 'warning'][Math.floor(Math.random() * 4)]]
        );
    }

    // 7. Generate progressively improving metrics
    const baseEfficiency = 45 + runNumber * 12 + Math.random() * 8;
    const efficiency = Math.min(baseEfficiency, 97);
    const throughput = (2 + runNumber * 0.8 + Math.random() * 0.5);

    await pool.query(
        `INSERT INTO metrics (run_id, total_tasks, completed_tasks, failed_tasks, avg_completion_time_ms,
     throughput, avg_battery_usage, ai_decisions_count, avg_ai_latency_ms, efficiency_score)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (run_id) DO UPDATE SET efficiency_score = EXCLUDED.efficiency_score`,
        [runId, taskCount, completedCount, failedCount,
            800 - runNumber * 80 + Math.random() * 100,
            throughput, 15 + Math.random() * 20,
            2 + Math.floor(Math.random() * 5), 50 + Math.random() * 100,
            efficiency]
    );

    // 8. Generate AI decisions
    const decisionTypes = ['task_optimization', 'run_analysis', 'failure_response', 'auto_optimize'];
    for (let i = 0; i < 3; i++) {
        await pool.query(
            `INSERT INTO ai_decisions (run_id, decision_type, input_state, decision_output, confidence, latency_ms)
       VALUES ($1, $2, $3, $4, $5, $6)`,
            [runId, decisionTypes[Math.floor(Math.random() * decisionTypes.length)],
                { robots: robots.rows.length, tasks: taskCount },
                {
                    summary: `AI optimization pass ${i + 1}: Reassigned ${1 + Math.floor(Math.random() * 3)} tasks, efficiency +${(3 + Math.random() * 8).toFixed(1)}%`,
                    recommendations: ['Reduce idle time', 'Optimize charging schedule', 'Batch nearby deliveries']
                },
                0.7 + Math.random() * 0.25,
                30 + Math.floor(Math.random() * 150)]
        );
    }

    // 9. Close the run with a score
    const finalScore = 40 + runNumber * 15 + Math.random() * 10;
    await pool.query(
        `UPDATE simulation_runs SET end_time = NOW(), final_score = $1,
     improvement_notes = $2 WHERE id = $3`,
        [Math.min(finalScore, 98),
        `Run #${runNumber}: ${efficiency.toFixed(1)}% efficiency. ${completedCount}/${taskCount} tasks completed.`,
            runId]
    );

    return {
        run_id: runId,
        run_number: runNumber,
        scenario: scenario.name,
        tasks_generated: taskCount,
        completed: completedCount,
        failed: failedCount,
        efficiency: efficiency.toFixed(1) + '%',
        final_score: Math.min(finalScore, 98).toFixed(1),
        message: `Demo run #${runNumber} generated with progressively improving metrics`
    };
}

// Generate 3 runs to show self-improvement
async function generateFullDemo() {
    const results = [];
    for (let i = 0; i < 3; i++) {
        const result = await generateDemoRun();
        results.push(result);
        await new Promise(r => setTimeout(r, 100)); // small delay
    }
    return {
        message: '3 demo runs generated showing self-improvement trajectory',
        runs: results
    };
}

module.exports = { generateDemoRun, generateFullDemo };
