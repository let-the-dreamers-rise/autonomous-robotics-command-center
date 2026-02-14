// ============================================
// SELF-IMPROVING LOOP
// Compares runs → learns → applies better strategy
// ============================================

const { pool } = require('../config/db');
const aiEngine = require('./aiEngine');

async function improveStrategy(scenarioId) {
    // 1. Get all runs for this scenario, ordered
    const runs = await pool.query(
        `SELECT sr.*, m.efficiency_score, m.throughput, m.completed_tasks, m.total_tasks,
            m.avg_battery_usage, m.avg_ai_latency_ms
     FROM simulation_runs sr
     LEFT JOIN metrics m ON m.run_id = sr.id
     WHERE sr.scenario_id = $1
     ORDER BY sr.run_number ASC`,
        [scenarioId]
    );

    if (runs.rows.length < 1) {
        return { message: 'Need at least 1 completed run to generate improvements' };
    }

    // 2. Build performance trend
    const trend = runs.rows.map(r => ({
        run: r.run_number,
        score: r.final_score,
        efficiency: r.efficiency_score,
        throughput: r.throughput,
        completion_rate: r.total_tasks > 0 ? (r.completed_tasks / r.total_tasks * 100) : 0,
        battery_usage: r.avg_battery_usage
    }));

    // 3. Ask AI for strategy improvement
    const latestRun = runs.rows[runs.rows.length - 1];
    const analysis = await aiEngine.analyzeRun(latestRun.id);

    // 4. Generate improved strategy for next run
    const improvedStrategy = {
        version: runs.rows.length + 1,
        based_on_runs: runs.rows.length,
        trend,
        ai_recommendations: analysis.analysis?.recommendations || [],
        predicted_improvement: analysis.analysis?.predicted_gain_percent || 0,
        routing: runs.rows.length > 2 ? 'dynamic-adaptive' : 'nearest-first',
        battery_threshold: Math.max(20, 30 - runs.rows.length * 2),
        task_batching: runs.rows.length > 3,
        generated_at: new Date().toISOString()
    };

    return {
        runs_analyzed: runs.rows.length,
        performance_trend: trend,
        improved_strategy: improvedStrategy,
        ai_source: analysis.source
    };
}

module.exports = { improveStrategy };
