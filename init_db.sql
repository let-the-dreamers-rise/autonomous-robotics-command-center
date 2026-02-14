-- ============================================
-- AUTONOMOUS ROBOTICS COMMAND CENTER
-- Database Schema v2.1 (Multi-Warehouse)
-- ============================================

-- Clean slate
DROP TABLE IF EXISTS ai_decisions CASCADE;
DROP TABLE IF EXISTS metrics CASCADE;
DROP TABLE IF EXISTS telemetry_logs CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS simulation_runs CASCADE;
DROP TABLE IF EXISTS robots CASCADE;
DROP TABLE IF EXISTS scenarios CASCADE;
DROP TABLE IF EXISTS warehouses CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================
-- MULTI-WAREHOUSE SUPPORT
-- ============================================

CREATE TABLE warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    location VARCHAR(200),
    grid_width INT DEFAULT 100,
    grid_height INT DEFAULT 100,
    status VARCHAR(20) DEFAULT 'active',
    config JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- CORE TABLES
-- ============================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    api_key VARCHAR(100) UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
    role VARCHAR(20) DEFAULT 'viewer',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    config_json JSONB NOT NULL DEFAULT '{}',
    difficulty INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE robots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID REFERENCES warehouses(id),
    name VARCHAR(50) NOT NULL,
    type VARCHAR(30) DEFAULT 'delivery',
    status VARCHAR(20) DEFAULT 'idle',
    battery_level FLOAT DEFAULT 100.0,
    position_x FLOAT DEFAULT 0.0,
    position_y FLOAT DEFAULT 0.0,
    payload_capacity FLOAT DEFAULT 10.0,
    current_task_id UUID,
    last_seen TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE simulation_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scenario_id UUID REFERENCES scenarios(id),
    warehouse_id UUID REFERENCES warehouses(id),
    status VARCHAR(20) DEFAULT 'pending',
    strategy_json JSONB DEFAULT '{}',
    start_time TIMESTAMP DEFAULT NOW(),
    end_time TIMESTAMP,
    final_score FLOAT,
    improvement_notes TEXT,
    run_number INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- OPERATIONAL TABLES
-- ============================================

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID REFERENCES simulation_runs(id),
    robot_id UUID REFERENCES robots(id),
    type VARCHAR(30) DEFAULT 'delivery',
    priority INT DEFAULT 5,
    status VARCHAR(20) DEFAULT 'pending',
    origin_x FLOAT,
    origin_y FLOAT,
    destination_x FLOAT,
    destination_y FLOAT,
    assigned_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE telemetry_logs (
    id BIGSERIAL PRIMARY KEY,
    run_id UUID REFERENCES simulation_runs(id),
    robot_id UUID REFERENCES robots(id),
    timestamp TIMESTAMP DEFAULT NOW(),
    position_x FLOAT,
    position_y FLOAT,
    velocity FLOAT,
    battery_level FLOAT,
    sensor_data JSONB,
    event_type VARCHAR(30) DEFAULT 'heartbeat'
);

CREATE TABLE metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID REFERENCES simulation_runs(id) UNIQUE,
    total_tasks INT DEFAULT 0,
    completed_tasks INT DEFAULT 0,
    failed_tasks INT DEFAULT 0,
    avg_completion_time_ms FLOAT,
    throughput FLOAT,
    avg_battery_usage FLOAT,
    ai_decisions_count INT DEFAULT 0,
    avg_ai_latency_ms FLOAT,
    efficiency_score FLOAT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- AI & SCENARIO TABLES
-- ============================================

CREATE TABLE ai_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID REFERENCES simulation_runs(id),
    decision_type VARCHAR(50) NOT NULL,
    input_state JSONB,
    decision_output JSONB,
    confidence FLOAT,
    latency_ms INT,
    applied BOOLEAN DEFAULT false,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_telemetry_run_id ON telemetry_logs(run_id);
CREATE INDEX idx_telemetry_robot_id ON telemetry_logs(robot_id);
CREATE INDEX idx_telemetry_timestamp ON telemetry_logs(timestamp);
CREATE INDEX idx_tasks_run_id ON tasks(run_id);
CREATE INDEX idx_tasks_robot_id ON tasks(robot_id);
CREATE INDEX idx_ai_decisions_run_id ON ai_decisions(run_id);
CREATE INDEX idx_metrics_run_id ON metrics(run_id);

-- ============================================
-- SEED DATA: Default Scenario + Robot Fleet
-- ============================================

INSERT INTO scenarios (name, description, config_json, difficulty) VALUES
    ('Warehouse Alpha', 'Standard warehouse with 20 delivery points', '{"grid_size": 100, "obstacles": 5, "delivery_points": 20}', 1),
    ('High Demand Surge', 'Peak hour simulation with 3x order volume', '{"grid_size": 100, "obstacles": 8, "delivery_points": 60, "surge_multiplier": 3}', 3),
    ('Failure Recovery', 'Random robot failures during operation', '{"grid_size": 100, "failure_rate": 0.3, "delivery_points": 25}', 4),
    ('Urban Navigation', 'Complex urban environment with blocked paths', '{"grid_size": 200, "obstacles": 30, "delivery_points": 40}', 5);

INSERT INTO robots (name, type, status, battery_level, position_x, position_y) VALUES
    ('ALPHA-01', 'delivery', 'idle', 100.0, 5.0, 5.0),
    ('ALPHA-02', 'delivery', 'idle', 100.0, 10.0, 5.0),
    ('ALPHA-03', 'delivery', 'idle', 100.0, 15.0, 5.0),
    ('BRAVO-01', 'heavy_lift', 'idle', 100.0, 5.0, 15.0),
    ('BRAVO-02', 'heavy_lift', 'idle', 100.0, 10.0, 15.0),
    ('RECON-01', 'scout', 'idle', 100.0, 50.0, 50.0);

INSERT INTO users (username, role) VALUES
    ('admin', 'admin'),
    ('dashboard', 'viewer');

-- Warehouse seed data
INSERT INTO warehouses (name, location, grid_width, grid_height, config) VALUES
    ('Warehouse Alpha', 'San Francisco, CA', 100, 100, '{"zones": 4, "charging_stations": 3}'),
    ('Warehouse Beta', 'Austin, TX', 150, 80, '{"zones": 6, "charging_stations": 4}'),
    ('Warehouse Gamma', 'Berlin, DE', 200, 120, '{"zones": 8, "charging_stations": 6}');
