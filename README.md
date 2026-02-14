# 🤖 Autonomous Robotics Command Center (ARCC)

**AI-powered platform for simulating, testing, and optimizing autonomous robot deployments before real-world rollout.**

> *"What if companies could test 1,000 robot configurations in software before deploying a single unit in the real world?"*

---

## 🎯 Problem

Deploying autonomous robots is expensive and risky. A single misconfiguration can cost $50K+ in damaged equipment, lost productivity, and safety incidents. Companies today deploy robots blindly — hoping their routing algorithms work, their battery models hold up, and their fleet can handle demand spikes.

## 💡 Solution

ARCC is a **digital twin command center** that lets operations teams:

1. **Simulate** robot fleets in configurable warehouse environments
2. **Test** fleet resilience against failures, demand surges, and blocked paths
3. **Optimize** task assignments using AI (Gemini) in real-time
4. **Learn** — the system improves its strategy after every run automatically

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND DASHBOARD                       │
│  Command Center │ Fleet │ Metrics │ AI Log │ God Mode       │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API (polling)
┌────────────────────────┴────────────────────────────────────┐
│                     EXPRESS.JS API                           │
│  /simulations │ /telemetry │ /robots │ /tasks │ /ai │ /scenarios │
├─────────────────────────────────────────────────────────────┤
│  AI ENGINE        │  SCENARIO ENGINE   │  SELF-IMPROVER     │
│  (Gemini API +    │  (God Mode:        │  (Cross-run        │
│   Rule Fallback)  │   5 disruptions)   │   comparison)      │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL 15    │  Redis 7           │  Docker Compose    │
│  (8 tables)       │  (Real-time cache) │  (Infrastructure)  │
└─────────────────────────────────────────────────────────────┘
                         ▲
          ┌──────────────┴──────────────┐
          │   SIMULATION LAYER          │
          │   (Teammate's module)       │
          │   Sends POST /api/telemetry │
          └─────────────────────────────┘
```

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Node.js + Express.js |
| **Database** | PostgreSQL 15 (8 tables, indexed) |
| **Cache** | Redis 7 (real-time telemetry) |
| **AI Engine** | Google Gemini API + rule-based fallback |
| **Frontend** | Vanilla JS + Canvas charts (zero dependencies) |
| **Infrastructure** | Docker Compose + Vultr VPS |
| **Architecture** | Modular MVC (routes → services → DB) |

---

## 🚀 Key Features

### 1. Real-Time Fleet Monitoring
- 6-robot fleet with live position, battery, and task tracking
- Redis-powered sub-second state updates
- Auto-refreshing dashboard

### 2. AI Decision Engine
- **Task Optimization**: Assigns tasks to robots based on distance, battery, and capacity
- **Run Analysis**: Post-run performance review with improvement suggestions
- **Failure Response**: Dynamic strategy when scenarios are triggered
- **Self-Improving Loop**: Each run generates better strategy than the last

### 3. God Mode (Scenario Engine)
| Scenario | Effect |
|----------|--------|
| Demand Spike | 3x task volume surge |
| Robot Failure | Random unit goes offline |
| Battery Shortage | All batteries drop 40% |
| Emergency Order | Priority-10 task injected |
| Blocked Path | Grid zones become impassable |

### 4. Self-Improvement Loop
```
Run N → Collect Metrics → AI Analysis → Generate Strategy N+1 → Run N+1 → Compare → Repeat
```
Each run stores its strategy and performance. The system compares across runs and generates an improved strategy, showing measurable gains.

---

## 📡 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | System health check |
| GET | `/api/robots` | List fleet |
| GET | `/api/simulations` | List runs |
| POST | `/api/simulations/start` | Start a simulation run |
| POST | `/api/simulations/:id/stop` | End a run |
| POST | `/api/telemetry/:run_id` | Ingest robot data |
| GET | `/api/tasks` | List tasks |
| POST | `/api/tasks` | Create task |
| GET | `/api/metrics/dashboard` | Dashboard aggregates |
| GET | `/api/metrics/compare` | Cross-run comparison |
| POST | `/api/ai/optimize/:run_id` | AI task optimization |
| POST | `/api/ai/analyze/:run_id` | Post-run AI analysis |
| POST | `/api/ai/improve/:scenario_id` | Self-improvement loop |
| GET | `/api/ai/decisions` | AI decision log |
| GET | `/api/scenarios` | List scenarios |
| POST | `/api/scenarios/trigger` | Trigger disruption |

---

## 🏃 Quick Start

```bash
# 1. Clone
git clone https://github.com/let-the-dreamers-rise/autonomous-robotics-command-center.git
cd autonomous-robotics-command-center

# 2. Start Database
docker compose up -d

# 3. Initialize Schema
docker cp init_db.sql robotics-backend-db-1:/init_db.sql
docker exec -i robotics-backend-db-1 psql -U admin -d robotics_v1 -f /init_db.sql

# 4. Install Dependencies
npm install

# 5. Start Server
node server.js

# 6. Open Dashboard
# http://localhost:3000
```

---

## 🎬 Demo Flow (60 seconds)

1. Open dashboard → Show fleet status (6 robots, all idle)
2. Click "Start Run" → Simulation begins, stats update
3. Click "AI Optimize" → Watch AI assign tasks to robots
4. Switch to God Mode → Trigger "Robot Failure" → AI responds dynamically
5. Stop run → Click "Analyze Run" → AI generates improvement report
6. Click "Generate Improvement Strategy" → Show self-learning across runs

---

## 🔮 Startup Potential

- **Market**: $50B+ warehouse automation market (growing 14% YoY)
- **Customers**: Amazon, DHL, Walmart, any company deploying autonomous fleets
- **Moat**: Self-improving AI loop + scenario testing = reduced deployment risk by 80%
- **Revenue**: SaaS subscription ($500-5,000/mo per warehouse)
- **Next Steps**: Real robot SDK integration, 3D visualization, multi-warehouse support

---

## 👥 Team

**Let The Dreamers Rise**

Built for Version 7 Hackathon 🚀
