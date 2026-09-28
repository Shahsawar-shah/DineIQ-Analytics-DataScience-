-- DineIQ Analytics - PostgreSQL schema (application database)
--
-- The analytical data (orders, menu, customers, ...) lives in CSV / Parquet
-- and is processed by Spark; PostgreSQL stores users, the audit trail and
-- application metadata.
--
-- Apply with:  psql "$DATABASE_URL" -f database/schema.sql
-- The API also creates/extends audit_logs on startup (backend/models/audit.py).

CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(255) NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,          -- bcrypt hash, never plain text
    -- Admin | Restaurant Manager | Inventory Manager | Cashier | Customer | analyst
    role          VARCHAR(50) DEFAULT 'analyst',
    is_active     BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMP DEFAULT NOW()
);

-- One row per API request, login attempt and admin action (SRS lxiii)
CREATE TABLE IF NOT EXISTS audit_logs (
    id           SERIAL PRIMARY KEY,
    user_id      INTEGER REFERENCES users(id),
    action       VARCHAR(120),
    details      TEXT,
    created_at   TIMESTAMP DEFAULT NOW(),
    user_email   VARCHAR(255),
    user_role    VARCHAR(50),
    event_type   VARCHAR(20),        -- auth | view | crud | ml | data | system
    method       VARCHAR(10),
    endpoint     VARCHAR(255),
    status_code  INTEGER,
    result       VARCHAR(20),        -- success | failure
    duration_ms  DOUBLE PRECISION,
    ip_address   VARCHAR(64)
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);

CREATE TABLE IF NOT EXISTS recommendations (
    id               SERIAL PRIMARY KEY,
    item_id          INTEGER,
    item_name        VARCHAR(255),
    action           VARCHAR(255),
    priority         VARCHAR(20),
    evidence         TEXT,
    estimated_impact VARCHAR(255),
    created_at       TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS model_versions (
    id         SERIAL PRIMARY KEY,
    model_name VARCHAR(255),
    model_type VARCHAR(100),
    accuracy   DOUBLE PRECISION,
    f1_score   DOUBLE PRECISION,
    trained_at TIMESTAMP DEFAULT NOW(),
    is_active  BOOLEAN DEFAULT TRUE
);
