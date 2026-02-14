// ============================================
// ARCC — Frontend Application Logic
// ============================================

const API_BASE = window.location.origin + '/api';
let currentPage = 'dashboard';
let currentRunId = null;
let pollInterval = null;

// ============================================
// NAVIGATION
// ============================================

document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.dataset.page;
        switchPage(page);
    });
});

function switchPage(page) {
    currentPage = page;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${page}`).classList.add('active');
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelector(`[data-page="${page}"]`).classList.add('active');

    const titles = {
        dashboard: 'Command Center',
        fleet: 'Fleet Status',
        metrics: 'Performance Metrics',
        ai: 'AI Decision Log',
        scenarios: 'God Mode',
        compare: 'Run Comparison'
    };
    document.getElementById('page-title').textContent = titles[page] || page;

    // Load page data
    loadPageData(page);
}

// ============================================
// API HELPERS
// ============================================

async function api(path, options = {}) {
    try {
        const res = await fetch(`${API_BASE}${path}`, {
            headers: { 'Content-Type': 'application/json' },
            ...options,
            body: options.body ? JSON.stringify(options.body) : undefined
        });
        return await res.json();
    } catch (err) {
        console.error('API Error:', err);
        return null;
    }
}

// ============================================
// DATA LOADERS
// ============================================

async function loadPageData(page) {
    switch (page) {
        case 'dashboard': await loadDashboard(); break;
        case 'fleet': await loadFleet(); break;
        case 'metrics': await loadMetrics(); break;
        case 'ai': await loadAIDecisions(); break;
        case 'scenarios': await loadScenarios(); break;
        case 'compare': await loadComparison(); break;
    }
}

async function loadDashboard() {
    // Stats
    const stats = await api('/metrics/dashboard');
    if (stats) {
        document.getElementById('stat-active-runs').textContent = stats.runs?.active_runs || 0;
        document.getElementById('stat-total-runs').textContent = `Total: ${stats.runs?.total_runs || 0}`;
        document.getElementById('stat-active-robots').textContent = stats.robots?.active_robots || 0;
        document.getElementById('stat-avg-battery').textContent = `Avg Battery: ${Math.round(stats.robots?.avg_battery || 0)}%`;
        document.getElementById('stat-completed-tasks').textContent = stats.tasks?.completed || 0;
        document.getElementById('stat-failed-tasks').textContent = `Failed: ${stats.tasks?.failed || 0}`;
        document.getElementById('stat-ai-decisions').textContent = stats.ai?.total_decisions || 0;
        document.getElementById('stat-ai-latency').textContent = `Avg Latency: ${Math.round(stats.ai?.avg_latency || 0)}ms`;
    }

    // Runs table
    const runs = await api('/simulations');
    const tbody = document.getElementById('runs-table-body');
    if (runs && runs.length) {
        tbody.innerHTML = runs.map(r => `
      <tr>
        <td><strong>#${r.run_number || '—'}</strong></td>
        <td>${r.scenario_name || '—'}</td>
        <td><span class="badge badge-${r.status}">${r.status}</span></td>
        <td>${r.final_score ? r.final_score.toFixed(1) : '—'}</td>
        <td>${new Date(r.start_time).toLocaleTimeString()}</td>
      </tr>
    `).join('');
        currentRunId = runs.find(r => r.status === 'running')?.id || runs[0]?.id;
    } else {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">No runs yet. Start one!</td></tr>';
    }
}

async function loadFleet() {
    const robots = await api('/robots');
    const tbody = document.getElementById('fleet-table-body');
    if (robots && robots.length) {
        tbody.innerHTML = robots.map(r => {
            const batteryColor = r.battery_level > 60 ? 'var(--accent-green)' :
                r.battery_level > 25 ? 'var(--accent-orange)' : 'var(--accent-red)';
            return `
        <tr>
          <td><strong>${r.name}</strong></td>
          <td>${r.type}</td>
          <td><span class="badge badge-${r.status}">${r.status}</span></td>
          <td>
            ${Math.round(r.battery_level)}%
            <div class="battery-bar">
              <div class="battery-fill" style="width:${r.battery_level}%;background:${batteryColor}"></div>
            </div>
          </td>
          <td>(${r.position_x?.toFixed(1)}, ${r.position_y?.toFixed(1)})</td>
          <td>${r.current_task_type || '—'}</td>
        </tr>
      `;
        }).join('');
    }
}

async function loadMetrics() {
    const metrics = await api('/metrics/runs');
    const tbody = document.getElementById('metrics-table-body');
    if (metrics && metrics.length) {
        tbody.innerHTML = metrics.map(m => `
      <tr>
        <td>#${m.run_number || '—'}</td>
        <td>${m.scenario_name || '—'}</td>
        <td>${m.total_tasks || 0}</td>
        <td>${m.completed_tasks || 0}</td>
        <td>${m.throughput ? m.throughput.toFixed(2) : '—'}</td>
        <td>${m.efficiency_score ? m.efficiency_score.toFixed(1) + '%' : '—'}</td>
      </tr>
    `).join('');

        // Draw chart
        drawChart('metrics-chart', metrics.reverse(), 'efficiency_score', 'Efficiency Score');
    }
}

async function loadAIDecisions() {
    const decisions = await api('/ai/decisions');
    const tbody = document.getElementById('ai-table-body');
    if (decisions && decisions.length) {
        tbody.innerHTML = decisions.map(d => `
      <tr>
        <td>${new Date(d.timestamp).toLocaleTimeString()}</td>
        <td><span class="badge badge-active">${d.decision_type}</span></td>
        <td>${d.confidence ? (d.confidence * 100).toFixed(0) + '%' : '—'}</td>
        <td>${d.latency_ms || '—'}ms</td>
        <td><code>${JSON.stringify(d.decision_output).substring(0, 80)}...</code></td>
      </tr>
    `).join('');
    }
}

async function loadScenarios() {
    const scenarios = await api('/scenarios');
    const container = document.getElementById('scenario-buttons');
    if (scenarios && scenarios.length) {
        const icons = { demand_spike: '📈', robot_failure: '💥', battery_shortage: '🔋', emergency_order: '🚨', blocked_path: '🚧' };
        container.innerHTML = scenarios.map(s => `
      <button class="scenario-btn" data-scenario="${s.id}">
        <div class="scenario-name">${icons[s.id] || '⚡'} ${s.name}</div>
        <div class="scenario-desc">${s.description}</div>
      </button>
    `).join('');

        container.querySelectorAll('.scenario-btn').forEach(btn => {
            btn.addEventListener('click', () => triggerScenario(btn.dataset.scenario));
        });
    }
}

async function loadComparison() {
    const data = await api('/metrics/compare');
    if (data && data.length) {
        drawChart('compare-chart', data, 'efficiency_score', 'Efficiency Across Runs');
    }
}

// ============================================
// ACTIONS
// ============================================

document.getElementById('btn-start-run').addEventListener('click', async () => {
    const scenarios = await api('/metrics/scenarios');
    if (!scenarios || !scenarios.length) return;
    const scenarioId = scenarios[0].id;
    const result = await api('/simulations/start', { method: 'POST', body: { scenario_id: scenarioId } });
    if (result?.run?.id) {
        currentRunId = result.run.id;
        showOutput('action-output', result);
        loadDashboard();
    }
});

document.getElementById('btn-stop-run').addEventListener('click', async () => {
    if (!currentRunId) return;
    const result = await api(`/simulations/${currentRunId}/stop`, {
        method: 'POST', body: { final_score: Math.random() * 40 + 60 }
    });
    showOutput('action-output', result);
    loadDashboard();
});

document.getElementById('btn-optimize').addEventListener('click', async () => {
    if (!currentRunId) return;
    const out = document.getElementById('action-output');
    out.textContent = '⏳ Running AI optimization...';
    const result = await api(`/ai/optimize/${currentRunId}`, { method: 'POST' });
    showOutput('action-output', result);
});

document.getElementById('btn-analyze').addEventListener('click', async () => {
    if (!currentRunId) return;
    const out = document.getElementById('action-output');
    out.textContent = '⏳ Analyzing run performance...';
    const result = await api(`/ai/analyze/${currentRunId}`, { method: 'POST' });
    showOutput('action-output', result);
});

document.getElementById('btn-improve').addEventListener('click', async () => {
    const scenarios = await api('/metrics/scenarios');
    if (!scenarios?.length) return;
    const out = document.getElementById('improve-output');
    out.textContent = '⏳ Generating self-improvement strategy...';
    const result = await api(`/ai/improve/${scenarios[0].id}`, { method: 'POST' });
    showOutput('improve-output', result);
});

async function triggerScenario(type) {
    if (!currentRunId) {
        showOutput('scenario-output', { error: 'No active run. Start a run first!' });
        return;
    }
    const out = document.getElementById('scenario-output');
    out.textContent = `⚡ Triggering ${type}...`;
    const result = await api('/scenarios/trigger', {
        method: 'POST', body: { run_id: currentRunId, scenario_type: type }
    });
    showOutput('scenario-output', result);
    loadDashboard();
    loadFleet();
}

// ============================================
// CHART DRAWING (Lightweight Canvas)
// ============================================

function drawChart(canvasId, data, field, label) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width = canvas.parentElement.clientWidth - 32;
    const H = canvas.height = 300;
    const padding = { top: 30, right: 20, bottom: 40, left: 50 };

    ctx.clearRect(0, 0, W, H);

    const values = data.map(d => d[field] || 0);
    if (values.length === 0) return;

    const max = Math.max(...values, 1) * 1.1;
    const plotW = W - padding.left - padding.right;
    const plotH = H - padding.top - padding.bottom;
    const stepX = values.length > 1 ? plotW / (values.length - 1) : plotW;

    // Grid lines
    ctx.strokeStyle = 'rgba(42, 54, 84, 0.5)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = padding.top + (plotH / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(W - padding.right, y);
        ctx.stroke();

        ctx.fillStyle = '#596578';
        ctx.font = '11px JetBrains Mono';
        ctx.textAlign = 'right';
        ctx.fillText((max - (max / 4) * i).toFixed(0), padding.left - 8, y + 4);
    }

    // Line
    ctx.beginPath();
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';

    values.forEach((v, i) => {
        const x = padding.left + i * stepX;
        const y = padding.top + plotH - (v / max) * plotH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Area gradient
    const gradient = ctx.createLinearGradient(0, padding.top, 0, H - padding.bottom);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.2)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');

    ctx.lineTo(padding.left + (values.length - 1) * stepX, H - padding.bottom);
    ctx.lineTo(padding.left, H - padding.bottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Dots
    values.forEach((v, i) => {
        const x = padding.left + i * stepX;
        const y = padding.top + plotH - (v / max) * plotH;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#3b82f6';
        ctx.fill();
        ctx.strokeStyle = '#0a0e1a';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Label
        ctx.fillStyle = '#8b95a8';
        ctx.font = '10px JetBrains Mono';
        ctx.textAlign = 'center';
        ctx.fillText(`#${data[i].run_number || i + 1}`, x, H - padding.bottom + 18);
    });

    // Title
    ctx.fillStyle = '#e8ecf4';
    ctx.font = '13px Inter';
    ctx.textAlign = 'left';
    ctx.fillText(label, padding.left, 18);
}

// ============================================
// UTILITIES
// ============================================

function showOutput(elementId, data) {
    const el = document.getElementById(elementId);
    el.textContent = JSON.stringify(data, null, 2);
}

// Clock
function updateClock() {
    document.getElementById('clock').textContent = new Date().toLocaleTimeString();
}
setInterval(updateClock, 1000);
updateClock();

// System status check
async function checkHealth() {
    const health = await api('/health');
    const el = document.getElementById('system-status-text');
    if (health?.status === 'active') {
        el.textContent = 'System Online';
        el.style.color = 'var(--accent-green)';
    } else {
        el.textContent = 'Offline';
        el.style.color = 'var(--accent-red)';
    }
}

// Auto-refresh
function startPolling() {
    pollInterval = setInterval(() => {
        if (currentPage === 'dashboard') loadDashboard();
        if (currentPage === 'fleet') loadFleet();
    }, 5000);
}

// INIT
checkHealth();
loadDashboard();
startPolling();
