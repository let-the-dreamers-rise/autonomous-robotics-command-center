// ============================================
// SCENARIO ENGINE — "GOD MODE"
// Triggers real-time disruptions for testing
// ============================================

const { pool } = require('../config/db');
const aiEngine = require('./aiEngine');

const SCENARIOS = {
    demand_spike: {
        name: 'Demand Spike',
        description: '3x surge in delivery orders',
        apply: async (runId) => {
            // Generate 15 new high-priority tasks
            const robots = await pool.query('SELECT id FROM robots LIMIT 6');
            const tasks = [];
            for (let i = 0; i < 15; i++) {
                const result = await pool.query(
                    `INSERT INTO tasks (run_id, type, priority, origin_x, origin_y, destination_x, destination_y, status)
           VALUES ($1, 'delivery', $2, $3, $4, $5, $6, 'pending') RETURNING *`,
                    [runId, 7 + Math.floor(Math.random() * 3),
                        Math.random() * 100, Math.random() * 100,
                        Math.random() * 100, Math.random() * 100]
                );
                tasks.push(result.rows[0]);
            }
            const aiResponse = await aiEngine.handleFailure(runId, 'demand_spike');
            return { tasks_created: tasks.length, ai_response: aiResponse };
        }
    },

    robot_failure: {
        name: 'Robot Failure',
        description: 'Random robot goes offline',
        apply: async (runId) => {
            // Pick a random active robot and take it offline
            const robot = await pool.query(
                "SELECT * FROM robots WHERE status != 'offline' ORDER BY RANDOM() LIMIT 1"
            );
            if (robot.rows.length === 0) return { error: 'No robots available' };

            const failedRobot = robot.rows[0];
            await pool.query("UPDATE robots SET status = 'offline' WHERE id = $1", [failedRobot.id]);

            // Reassign its tasks
            if (failedRobot.current_task_id) {
                await pool.query("UPDATE tasks SET status = 'pending', robot_id = NULL WHERE id = $1",
                    [failedRobot.current_task_id]);
            }

            const aiResponse = await aiEngine.handleFailure(runId, 'robot_failure');
            return { failed_robot: failedRobot.name, ai_response: aiResponse };
        }
    },

    battery_shortage: {
        name: 'Battery Shortage',
        description: 'All robots lose 40% battery',
        apply: async (runId) => {
            await pool.query(
                "UPDATE robots SET battery_level = GREATEST(battery_level - 40, 5) WHERE status != 'offline'"
            );
            // Robots with <20% battery go to charging
            await pool.query(
                "UPDATE robots SET status = 'charging' WHERE battery_level < 20 AND status != 'offline'"
            );
            const robots = await pool.query('SELECT name, battery_level, status FROM robots');
            const aiResponse = await aiEngine.handleFailure(runId, 'battery_shortage');
            return { robots_affected: robots.rows, ai_response: aiResponse };
        }
    },

    emergency_order: {
        name: 'Emergency Priority Order',
        description: 'Critical delivery injected — must be completed first',
        apply: async (runId) => {
            const result = await pool.query(
                `INSERT INTO tasks (run_id, type, priority, origin_x, origin_y, destination_x, destination_y, status)
         VALUES ($1, 'emergency', 10, 50, 50, 95, 95, 'pending') RETURNING *`,
                [runId]
            );
            // Downgrade all other task priorities
            await pool.query(
                "UPDATE tasks SET priority = GREATEST(priority - 2, 1) WHERE run_id = $1 AND type != 'emergency'",
                [runId]
            );
            const aiResponse = await aiEngine.handleFailure(runId, 'emergency_order');
            return { emergency_task: result.rows[0], ai_response: aiResponse };
        }
    },

    blocked_path: {
        name: 'Blocked Path',
        description: 'Grid zones 40-60 become impassable',
        apply: async (runId) => {
            // Slow down robots in the blocked zone
            await pool.query(
                `UPDATE robots SET status = 'rerouting'
         WHERE position_x BETWEEN 40 AND 60 AND position_y BETWEEN 40 AND 60
         AND status != 'offline'`
            );
            const affected = await pool.query(
                "SELECT name, position_x, position_y FROM robots WHERE status = 'rerouting'"
            );
            const aiResponse = await aiEngine.handleFailure(runId, 'blocked_path');
            return {
                blocked_zone: { x_min: 40, x_max: 60, y_min: 40, y_max: 60 },
                robots_affected: affected.rows,
                ai_response: aiResponse
            };
        }
    }
};

async function triggerScenario(runId, scenarioType) {
    const scenario = SCENARIOS[scenarioType];
    if (!scenario) throw new Error(`Unknown scenario: ${scenarioType}`);
    return {
        scenario: scenario.name,
        description: scenario.description,
        result: await scenario.apply(runId)
    };
}

function listScenarios() {
    return Object.entries(SCENARIOS).map(([key, s]) => ({
        id: key, name: s.name, description: s.description
    }));
}

module.exports = { triggerScenario, listScenarios };
