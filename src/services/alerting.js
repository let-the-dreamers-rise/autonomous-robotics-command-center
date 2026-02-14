// ============================================
// ALERTING SERVICE — Discord Webhooks
// ============================================

const { pool } = require('../config/db');

const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK_URL || null;

async function sendAlert(level, title, message, data = {}) {
    // Store alert in memory for API access
    alertLog.push({
        level, title, message, data,
        timestamp: new Date().toISOString()
    });
    if (alertLog.length > 50) alertLog.shift();

    // Send to Discord if configured
    if (DISCORD_WEBHOOK) {
        const colors = { critical: 0xFF0000, warning: 0xFFA500, info: 0x3B82F6 };
        try {
            await fetch(DISCORD_WEBHOOK, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    embeds: [{
                        title: `🤖 ARCC Alert: ${title}`,
                        description: message,
                        color: colors[level] || colors.info,
                        fields: Object.entries(data).map(([k, v]) => ({
                            name: k, value: String(v), inline: true
                        })),
                        timestamp: new Date().toISOString()
                    }]
                })
            });
        } catch (err) { console.error('Discord webhook error:', err.message); }
    }

    return { sent: !!DISCORD_WEBHOOK, alert: { level, title, message } };
}

// Check fleet health and fire alerts
async function checkFleetHealth() {
    const robots = await pool.query('SELECT * FROM robots');
    const alerts = [];

    for (const robot of robots.rows) {
        if (robot.battery_level < 15) {
            alerts.push(await sendAlert('critical', 'Critical Battery',
                `${robot.name} battery at ${robot.battery_level.toFixed(0)}% — immediate charging required`,
                { robot: robot.name, battery: robot.battery_level.toFixed(0) + '%' }
            ));
        } else if (robot.battery_level < 30) {
            alerts.push(await sendAlert('warning', 'Low Battery',
                `${robot.name} battery at ${robot.battery_level.toFixed(0)}%`,
                { robot: robot.name, battery: robot.battery_level.toFixed(0) + '%' }
            ));
        }

        if (robot.status === 'offline') {
            alerts.push(await sendAlert('critical', 'Robot Offline',
                `${robot.name} is offline — tasks may need reassignment`,
                { robot: robot.name, last_seen: robot.last_seen }
            ));
        }
    }

    // Check for failed tasks
    const failedTasks = await pool.query(
        "SELECT COUNT(*) as cnt FROM tasks WHERE status = 'failed' AND created_at > NOW() - INTERVAL '1 hour'"
    );
    if (parseInt(failedTasks.rows[0].cnt) > 3) {
        alerts.push(await sendAlert('warning', 'High Task Failure Rate',
            `${failedTasks.rows[0].cnt} tasks failed in the last hour`,
            { failed_count: failedTasks.rows[0].cnt }
        ));
    }

    return alerts;
}

const alertLog = [];
function getAlertLog() { return alertLog.slice(-20).reverse(); }

module.exports = { sendAlert, checkFleetHealth, getAlertLog };
