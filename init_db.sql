-- Drop tables if they exist (for clean reset)
DROP TABLE IF EXISTS ai_decisions;
DROP TABLE IF EXISTS telemetry_logs;
DROP TABLE IF EXISTS simulation_runs;
DROP TABLE IF EXISTS scenarios;
DROP TABLE IF EXISTS users;

-- Create Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    api_key VARCHAR(100) UNIQUE NOT NULL,
    role VARCHAR(20) DEFAULT 'viewer'
);

-- Create Scenarios
CREATE TABLE scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    config_json JSONB NOT NULL,
    difficulty INT DEFAULT 1
);

-- Create Simulation Runs
CREATE TABLE simulation_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scenario_id UUID REFERENCES scenarios(id),
    status VARCHAR(20) DEFAULT 'pending',
    start_time TIMESTAMP DEFAULT NOW(),
    end_time TIMESTAMP,
    final_score FLOAT
);

-- Create Telemetry Logs (Time-Series)
CREATE TABLE telemetry_logs (
    id BIGSERIAL PRIMARY KEY,
    run_id UUID REFERENCES simulation_runs(id),
    timestamp TIMESTAMP DEFAULT NOW(),
    position_x FLOAT,
    position_y FLOAT,
    velocity FLOAT,
    battery_level FLOAT,
    sensor_data JSONB
);
CREATE INDEX idx_telemetry_run_id ON telemetry_logs(run_id);
CREATE INDEX idx_telemetry_timestamp ON telemetry_logs(timestamp);

-- Create AI Decisions
CREATE TABLE ai_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID REFERENCES simulation_runs(id),
    timestamp TIMESTAMP DEFAULT NOW(),
    input_state JSONB,
    decision_output JSONB,
    latency_ms INT
);
