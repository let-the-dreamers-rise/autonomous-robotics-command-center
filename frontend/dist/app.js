// ============================================
// ARCC — Frontend Application v2.1
// AI Copilot + Enhanced Dashboard
// ============================================

const API = window.location.origin + '/api';
let currentPage = 'dashboard';
let currentRunId = null;
let copilotOpen = false;

// ============================================
// NAVIGATION
// ============================================

document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', e => {
        e.preventDefault();
        switchPage(link.dataset.page);
    });
});

function switchPage(page) {
    currentPage = page;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${page}`).classList.add('active');
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelector(`[data-page="${page}"]`).classList.add('active');
    const titles = {
        dashboard: 'Command Center', fleet: 'Fleet Status', metrics: 'Performance Metrics',
        ai: 'AI Decision Log', scenarios: 'God Mode', compare: 'Self-Improvement Loop',
        replay: 'Run Replay', alerts: 'System Alerts', warehouses: 'Warehouse Management'
    };
    document.getElementById('page-title').textContent = titles[page] || page;
    loadPageData(page);
}

// ============================================
// API
// ============================================

async function api(path, opts = {}) {
    try {
        const res = await fetch(`${API}${path}`, {
            headers: { 'Content-Type': 'application/json' },
            ...opts,
            body: opts.body ? JSON.stringify(opts.body) : undefined
        });
        return await res.json();
    } catch (err) { console.error('API Error:', err); return null; }
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
        case 'scenarios': loadScenarios(); break;
        case 'compare': await loadComparison(); break;
        case 'replay': await loadReplayOptions(); break;
        case 'alerts': await loadAlerts(); break;
        case 'warehouses': await loadWarehouses(); break;
    }
}

async function loadDashboard() {
    const stats = await api('/metrics/dashboard');
    if (stats) {
        setText('stat-active-runs', stats.runs?.active_runs || 0);
        setText('stat-total-runs', `Total: ${stats.runs?.total_runs || 0}`);
        setText('stat-active-robots', stats.robots?.active_robots || 0);
        setText('stat-avg-battery', `Avg Battery: ${Math.round(stats.robots?.avg_battery || 0)}%`);
        setText('stat-completed-tasks', stats.tasks?.completed || 0);
        setText('stat-failed-tasks', `Failed: ${stats.tasks?.failed || 0}`);
        setText('stat-ai-decisions', stats.ai?.total_decisions || 0);
        setText('stat-ai-latency', `Avg Latency: ${Math.round(stats.ai?.avg_latency || 0)}ms`);
    }

    const runs = await api('/simulations');
    const tbody = document.getElementById('runs-table-body');
    if (runs?.length) {
        tbody.innerHTML = runs.map(r => `
      <tr>
        <td><strong>#${r.run_number || '—'}</strong></td>
        <td>${r.scenario_name || '—'}</td>
        <td><span class="badge badge-${r.status}">${r.status}</span></td>
        <td>${r.final_score ? r.final_score.toFixed(1) : '—'}</td>
        <td>${r.efficiency || '—'}</td>
        <td>${timeAgo(r.start_time)}</td>
      </tr>
    `).join('');
        currentRunId = runs.find(r => r.status === 'running')?.id || runs[0]?.id;
    } else {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted)">No runs. Click "Generate Demo Data" in the sidebar.</td></tr>';
    }
}

async function loadFleet() {
    const robots = await api('/robots');
    const tbody = document.getElementById('fleet-table-body');
    if (robots?.length) {
        tbody.innerHTML = robots.map(r => {
            const bc = r.battery_level > 60 ? 'var(--accent-green)' : r.battery_level > 25 ? 'var(--accent-orange)' : 'var(--accent-red)';
            return `<tr>
        <td><strong>${r.name}</strong></td>
        <td>${r.type}</td>
        <td><span class="badge badge-${r.status}">${r.status}</span></td>
        <td>${Math.round(r.battery_level)}% <div class="battery-bar"><div class="battery-fill" style="width:${r.battery_level}%;background:${bc}"></div></div></td>
        <td>(${(r.position_x || 0).toFixed(1)}, ${(r.position_y || 0).toFixed(1)})</td>
        <td>${r.current_task_type || '—'}</td>
      </tr>`;
        }).join('');
    }
}

async function loadMetrics() {
    const metrics = await api('/metrics/runs');
    const tbody = document.getElementById('metrics-table-body');
    if (metrics?.length) {
        tbody.innerHTML = metrics.map(m => `
      <tr>
        <td>#${m.run_number || '—'}</td>
        <td>${m.scenario_name || '—'}</td>
        <td>${m.total_tasks || 0}</td>
        <td>${m.completed_tasks || 0}</td>
        <td>${m.failed_tasks || 0}</td>
        <td>${m.throughput ? m.throughput.toFixed(2) : '—'}</td>
        <td style="color:var(--accent-green);font-weight:700">${m.efficiency_score ? m.efficiency_score.toFixed(1) + '%' : '—'}</td>
      </tr>
    `).join('');
        drawChart('metrics-chart', metrics.slice().reverse(), 'efficiency_score', 'Efficiency Score (%)');
    }
}

async function loadAIDecisions() {
    const decisions = await api('/ai/decisions');
    const tbody = document.getElementById('ai-table-body');
    if (decisions?.length) {
        tbody.innerHTML = decisions.map(d => `
      <tr>
        <td>${timeAgo(d.timestamp)}</td>
        <td><span class="badge badge-${d.decision_type}">${d.decision_type.replace(/_/g, ' ')}</span></td>
        <td>${d.confidence ? (d.confidence * 100).toFixed(0) + '%' : '—'}</td>
        <td>${d.latency_ms || '—'}ms</td>
        <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis"><code>${JSON.stringify(d.decision_output).substring(0, 100)}</code></td>
      </tr>
    `).join('');
    }
}

function loadScenarios() {
    const scenarios = [
        { id: 'demand_spike', name: 'Demand Spike x5', desc: 'Flood the system with 5x normal task volume', icon: '📈', severity: 'high' },
        { id: 'robot_failure', name: '30% Robots Fail', desc: 'Random robots go offline immediately', icon: '💥', severity: 'critical' },
        { id: 'battery_shortage', name: 'Battery Shortage', desc: 'All batteries drop 40% instantly', icon: '🔋', severity: 'high' },
        { id: 'emergency_order', name: 'Emergency Order', desc: 'Priority-10 urgent task injected', icon: '🚨', severity: 'critical' },
        { id: 'blocked_path', name: 'Blocked Path', desc: 'Grid zones become impassable', icon: '🚧', severity: 'medium' }
    ];

    document.getElementById('scenario-buttons').innerHTML = scenarios.map(s => `
    <button class="scenario-btn" data-scenario="${s.id}">
      <span class="scenario-severity severity-${s.severity}">${s.severity}</span>
      <div class="scenario-icon">${s.icon}</div>
      <div class="scenario-name">${s.name}</div>
      <div class="scenario-desc">${s.desc}</div>
    </button>
  `).join('');

    document.querySelectorAll('.scenario-btn').forEach(btn => {
        btn.addEventListener('click', () => triggerScenario(btn.dataset.scenario));
    });
}

async function loadComparison() {
    const data = await api('/metrics/compare');
    if (data?.length) {
        // Calculate improvement stats
        const sorted = data.slice().sort((a, b) => (a.run_number || 0) - (b.run_number || 0));
        const first = sorted[0];
        const last = sorted[sorted.length - 1];

        const effDelta = ((last.efficiency_score || 0) - (first.efficiency_score || 0)).toFixed(1);
        const failDelta = ((first.failed_tasks || 0) - (last.failed_tasks || 0));
        const throughDelta = ((last.throughput || 0) - (first.throughput || 0)).toFixed(2);

        document.getElementById('improvement-stats').innerHTML = `
      <div class="imp-stat">
        <div class="imp-label">Efficiency</div>
        <div class="imp-value">${(last.efficiency_score || 0).toFixed(1)}%</div>
        <div class="imp-delta ${effDelta >= 0 ? 'imp-up' : 'imp-down'}">
          ${effDelta >= 0 ? '↑' : '↓'} ${Math.abs(effDelta)}% from Run #${first.run_number || 1}
        </div>
      </div>
      <div class="imp-stat">
        <div class="imp-label">Failures</div>
        <div class="imp-value">${last.failed_tasks || 0}</div>
        <div class="imp-delta ${failDelta >= 0 ? 'imp-up' : 'imp-down'}">
          ${failDelta >= 0 ? '↓' : '↑'} ${Math.abs(failDelta)} fewer failures
        </div>
      </div>
      <div class="imp-stat">
        <div class="imp-label">Throughput</div>
        <div class="imp-value">${(last.throughput || 0).toFixed(1)}</div>
        <div class="imp-delta ${throughDelta >= 0 ? 'imp-up' : 'imp-down'}">
          ${throughDelta >= 0 ? '↑' : '↓'} ${Math.abs(throughDelta)} tasks/min
        </div>
      </div>
    `;

        // Draw multi-metric chart
        drawMultiChart('compare-chart', sorted);
    } else {
        document.getElementById('improvement-stats').innerHTML =
            '<p style="color:var(--text-muted);text-align:center;padding:20px">No runs yet. Generate demo data to see improvement.</p>';
    }
}

async function loadReplayOptions() {
    const runs = await api('/simulations');
    const select = document.getElementById('replay-select');
    if (runs?.length) {
        select.innerHTML = runs.map(r =>
            `<option value="${r.id}">Run #${r.run_number || '?'} — ${r.scenario_name || 'unknown'} (${r.status})</option>`
        ).join('');
    }
}

async function loadAlerts() {
    const alerts = await api('/ai/alerts');
    const container = document.getElementById('alerts-list');
    if (alerts?.length) {
        const icons = { critical: '🔴', warning: '🟡', info: '🔵' };
        container.innerHTML = alerts.map(a => `
      <div class="alert-item alert-${a.level}">
        <div class="alert-icon">${icons[a.level] || '🔵'}</div>
        <div class="alert-body">
          <div class="alert-title">${a.title}</div>
          <div class="alert-message">${a.message}</div>
        </div>
        <div class="alert-time">${timeAgo(a.timestamp)}</div>
      </div>
    `).join('');
    } else {
        container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px">No alerts. Run a health check.</p>';
    }
}

async function loadWarehouses() {
    const warehouses = await api('/warehouses');
    const tbody = document.getElementById('warehouse-table-body');
    if (warehouses?.length) {
        tbody.innerHTML = warehouses.map(w => {
            const statusColor = w.status === 'active' ? 'var(--accent-green)' : 'var(--accent-red)';
            return `<tr>
        <td><strong>${w.name}</strong></td>
        <td>${w.location || '—'}</td>
        <td>${w.grid_width}×${w.grid_height}</td>
        <td>${w.robot_count || 0}</td>
        <td>${w.run_count || 0}</td>
        <td><span class="badge" style="background:${statusColor}">${w.status}</span></td>
      </tr>`;
        }).join('');
    } else {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted)">No warehouses found.</td></tr>';
    }
}

// ============================================
// ACTIONS
// ============================================

document.getElementById('btn-start-run').addEventListener('click', async () => {
    const scenarios = await api('/metrics/scenarios');
    if (!scenarios?.length) return showOutput('action-output', { error: 'No scenarios in DB. Generate demo data first.' });
    const result = await api('/simulations/start', { method: 'POST', body: { scenario_id: scenarios[0].id } });
    if (result?.run?.id) { currentRunId = result.run.id; showOutput('action-output', result); loadDashboard(); }
});

document.getElementById('btn-stop-run').addEventListener('click', async () => {
    if (!currentRunId) return;
    const result = await api(`/simulations/${currentRunId}/stop`, { method: 'POST', body: { final_score: 60 + Math.random() * 35 } });
    showOutput('action-output', result);
    loadDashboard();
});

document.getElementById('btn-optimize').addEventListener('click', async () => {
    if (!currentRunId) return;
    showOutput('action-output', '⏳ Running AI optimization...');
    const result = await api(`/ai/optimize/${currentRunId}`, { method: 'POST' });
    showOutput('action-output', result);
});

document.getElementById('btn-auto-optimize').addEventListener('click', async () => {
    showOutput('action-output', '⚡ Auto-optimizing task assignments...');
    const result = await api('/ai/auto-optimize', { method: 'POST' });
    showOutput('action-output', result);
    loadFleet();
});

document.getElementById('btn-improve').addEventListener('click', async () => {
    const scenarios = await api('/metrics/scenarios');
    if (!scenarios?.length) return;
    showOutput('improve-output', '⏳ Generating next strategy...');
    const result = await api(`/ai/improve/${scenarios[0].id}`, { method: 'POST' });
    showOutput('improve-output', result);
});

document.getElementById('btn-demo-mode').addEventListener('click', async () => {
    document.getElementById('btn-demo-mode').textContent = '⏳ Generating...';
    const result = await api('/ai/demo/full', { method: 'POST' });
    document.getElementById('btn-demo-mode').textContent = '🎬 Generate Demo Data';
    if (result) { loadDashboard(); alert(`✅ ${result.message}`); }
});

document.getElementById('btn-load-replay').addEventListener('click', async () => {
    const runId = document.getElementById('replay-select').value;
    if (!runId) return;
    const data = await api(`/ai/replay/${runId}`);
    if (data) {
        const timeline = [];
        timeline.push(`═══ RUN REPLAY: ${data.run.scenario_name || 'Unknown'} (Run #${data.run.run_number}) ═══\n`);
        timeline.push(`Status: ${data.run.status} | Score: ${data.run.final_score || '—'}`);
        timeline.push(`Events: ${data.total_events} | Tasks: ${data.tasks.length}\n`);

        data.ai_decisions.forEach(d => {
            timeline.push(`[AI] ${d.decision_type} (${(d.confidence * 100).toFixed(0)}% conf, ${d.latency_ms}ms)`);
        });

        data.tasks.slice(0, 10).forEach(t => {
            timeline.push(`[TASK] ${t.type} — ${t.status} (priority ${t.priority})`);
        });

        timeline.push(`\nMetrics: Efficiency ${data.metrics.efficiency_score?.toFixed(1) || '—'}% | Throughput ${data.metrics.throughput?.toFixed(2) || '—'}`);
        if (data.run.improvement_notes) {
            timeline.push(`\nImprovement Notes: ${data.run.improvement_notes}`);
        }

        document.getElementById('replay-timeline').textContent = timeline.join('\n');
    }
});

document.getElementById('btn-check-health').addEventListener('click', async () => {
    const result = await api('/ai/alerts/check', { method: 'POST' });
    if (result) { loadAlerts(); }
});

document.getElementById('btn-add-warehouse').addEventListener('click', async () => {
    const name = document.getElementById('wh-name').value.trim();
    const location = document.getElementById('wh-location').value.trim();
    if (!name) return alert('Please enter a warehouse name');
    const result = await api('/warehouses', { method: 'POST', body: { name, location } });
    if (result?.id) {
        document.getElementById('wh-name').value = '';
        document.getElementById('wh-location').value = '';
        loadWarehouses();
    }
});

async function triggerScenario(type) {
    if (!currentRunId) {
        showOutput('scenario-output', '⚠ No active run. Start a run or generate demo data first.');
        return;
    }
    const status = document.getElementById('godmode-status');
    status.innerHTML = `<span class="badge badge-running">⚡ Triggering ${type}...</span>`;
    const result = await api('/scenarios/trigger', { method: 'POST', body: { run_id: currentRunId, scenario_type: type } });
    status.innerHTML = `<span class="badge badge-completed">✓ ${type} triggered — AI responded</span>`;
    showOutput('scenario-output', result);
    setTimeout(() => { loadDashboard(); loadFleet(); }, 500);
}

// ============================================
// AI COPILOT
// ============================================

document.getElementById('btn-toggle-copilot').addEventListener('click', toggleCopilot);
document.getElementById('btn-close-copilot').addEventListener('click', toggleCopilot);

function toggleCopilot() {
    copilotOpen = !copilotOpen;
    document.getElementById('copilot-panel').classList.toggle('copilot-closed', !copilotOpen);
}

document.getElementById('btn-send-copilot').addEventListener('click', sendCopilotMessage);
document.getElementById('copilot-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') sendCopilotMessage();
});

document.querySelectorAll('.suggestion-chip').forEach(chip => {
    chip.addEventListener('click', () => {
        document.getElementById('copilot-input').value = chip.dataset.q;
        sendCopilotMessage();
    });
});

async function sendCopilotMessage() {
    const input = document.getElementById('copilot-input');
    const question = input.value.trim();
    if (!question) return;
    input.value = '';

    const messages = document.getElementById('copilot-messages');

    // Add user message
    messages.innerHTML += `
    <div class="copilot-msg user">
      <div class="msg-sender">You</div>
      <div class="msg-text">${escapeHtml(question)}</div>
    </div>
  `;

    // Add typing indicator
    messages.innerHTML += `
    <div class="copilot-msg bot" id="typing-msg">
      <div class="msg-sender">ARCC Copilot</div>
      <div class="typing-indicator"><span></span><span></span><span></span></div>
    </div>
  `;
    messages.scrollTop = messages.scrollHeight;

    // Call API
    const result = await api('/ai/copilot', { method: 'POST', body: { question } });

    // Remove typing indicator
    const typingMsg = document.getElementById('typing-msg');
    if (typingMsg) typingMsg.remove();

    // Add response
    const response = result?.response || 'Unable to reach copilot. Please check server connection.';
    messages.innerHTML += `
    <div class="copilot-msg bot">
      <div class="msg-sender">ARCC Copilot <span style="font-size:8px;color:var(--text-muted)">${result?.source || ''} • ${result?.latency || 0}ms</span></div>
      <div class="msg-text">${formatCopilotResponse(response)}</div>
    </div>
  `;
    messages.scrollTop = messages.scrollHeight;
}

function formatCopilotResponse(text) {
    return escapeHtml(text)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/•/g, '<span style="color:var(--accent-cyan)">•</span>')
        .replace(/(\d+)%/g, '<span style="color:var(--accent-green);font-weight:700">$1%</span>');
}

function escapeHtml(text) {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
}

// ============================================
// CHARTS
// ============================================

function drawChart(canvasId, data, field, label) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width = canvas.parentElement.clientWidth - 28;
    const H = canvas.height = 280;
    const pad = { top: 30, right: 15, bottom: 35, left: 45 };

    ctx.clearRect(0, 0, W, H);

    const values = data.map(d => d[field] || 0);
    if (!values.length) return;
    const max = Math.max(...values, 1) * 1.1;
    const plotW = W - pad.left - pad.right;
    const plotH = H - pad.top - pad.bottom;
    const stepX = values.length > 1 ? plotW / (values.length - 1) : plotW;

    // Grid
    ctx.strokeStyle = 'rgba(42, 54, 84, 0.5)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = pad.top + (plotH / 4) * i;
        ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
        ctx.fillStyle = '#596578'; ctx.font = '10px JetBrains Mono'; ctx.textAlign = 'right';
        ctx.fillText((max - (max / 4) * i).toFixed(0), pad.left - 6, y + 3);
    }

    // Line + Area
    ctx.beginPath(); ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
    values.forEach((v, i) => {
        const x = pad.left + i * stepX;
        const y = pad.top + plotH - (v / max) * plotH;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    const grad = ctx.createLinearGradient(0, pad.top, 0, H - pad.bottom);
    grad.addColorStop(0, 'rgba(59, 130, 246, 0.2)');
    grad.addColorStop(1, 'rgba(59, 130, 246, 0)');
    ctx.lineTo(pad.left + (values.length - 1) * stepX, H - pad.bottom);
    ctx.lineTo(pad.left, H - pad.bottom);
    ctx.closePath(); ctx.fillStyle = grad; ctx.fill();

    // Dots + labels
    values.forEach((v, i) => {
        const x = pad.left + i * stepX;
        const y = pad.top + plotH - (v / max) * plotH;
        ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#3b82f6'; ctx.fill();
        ctx.strokeStyle = '#0a0e1a'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#8b95a8'; ctx.font = '9px JetBrains Mono'; ctx.textAlign = 'center';
        ctx.fillText(`#${data[i].run_number || i + 1}`, x, H - pad.bottom + 14);
    });

    ctx.fillStyle = '#e8ecf4'; ctx.font = '12px Inter'; ctx.textAlign = 'left';
    ctx.fillText(label, pad.left, 16);
}

function drawMultiChart(canvasId, data) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width = canvas.parentElement.clientWidth - 28;
    const H = canvas.height = 280;
    const pad = { top: 30, right: 15, bottom: 35, left: 45 };
    ctx.clearRect(0, 0, W, H);

    if (!data.length) return;

    const plotW = W - pad.left - pad.right;
    const plotH = H - pad.top - pad.bottom;
    const stepX = data.length > 1 ? plotW / (data.length - 1) : plotW;

    // Draw multiple metrics — efficiency (blue), throughput (green), failures inverted (red)
    const metrics = [
        { field: 'efficiency_score', color: '#3b82f6', label: 'Efficiency %', max: 100 },
        { field: 'throughput', color: '#10b981', label: 'Throughput', max: Math.max(...data.map(d => d.throughput || 0), 1) * 1.2 },
    ];

    // Grid
    ctx.strokeStyle = 'rgba(42, 54, 84, 0.4)'; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = pad.top + (plotH / 4) * i;
        ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
    }

    metrics.forEach(m => {
        const values = data.map(d => d[m.field] || 0);
        ctx.beginPath(); ctx.strokeStyle = m.color; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
        values.forEach((v, i) => {
            const x = pad.left + i * stepX;
            const y = pad.top + plotH - (v / m.max) * plotH;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Dots
        values.forEach((v, i) => {
            const x = pad.left + i * stepX;
            const y = pad.top + plotH - (v / m.max) * plotH;
            ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2);
            ctx.fillStyle = m.color; ctx.fill();
        });
    });

    // X labels
    data.forEach((d, i) => {
        const x = pad.left + i * stepX;
        ctx.fillStyle = '#8b95a8'; ctx.font = '9px JetBrains Mono'; ctx.textAlign = 'center';
        ctx.fillText(`Run #${d.run_number || i + 1}`, x, H - pad.bottom + 14);
    });

    // Legend
    ctx.font = '11px Inter'; ctx.textAlign = 'left';
    metrics.forEach((m, i) => {
        const lx = pad.left + i * 120;
        ctx.fillStyle = m.color;
        ctx.fillRect(lx, 8, 12, 3);
        ctx.fillText(m.label, lx + 16, 14);
    });
}

// ============================================
// UTILITIES
// ============================================

function setText(id, val) { document.getElementById(id).textContent = val; }

function showOutput(id, data) {
    const el = document.getElementById(id);
    el.textContent = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
}

function timeAgo(ts) {
    if (!ts) return '—';
    const diff = (Date.now() - new Date(ts).getTime()) / 1000;
    if (diff < 60) return `${Math.floor(diff)}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(ts).toLocaleDateString();
}

function updateClock() {
    document.getElementById('clock').textContent = new Date().toLocaleTimeString();
}
setInterval(updateClock, 1000);
updateClock();

async function checkHealth() {
    const h = await api('/health');
    const el = document.getElementById('system-status-text');
    if (h?.status === 'active') {
        el.textContent = 'System Online';
        el.style.color = 'var(--accent-green)';
    } else {
        el.textContent = 'Offline';
        el.style.color = 'var(--accent-red)';
    }
}

// Auto-refresh
setInterval(() => {
    if (currentPage === 'dashboard') loadDashboard();
    if (currentPage === 'fleet') loadFleet();
}, 5000);

// INIT
checkHealth();
loadDashboard();
loadScenarios();
