-- One-time setup: read-only login for Power BI.
-- Run on the VPS as superuser:
--   sudo -u postgres psql -d dineiq_analytics -v pw="'ChangeMe_Strong#2026'" -f powerbi/create_reader.sql
CREATE ROLE powerbi_reader LOGIN PASSWORD :pw;
GRANT CONNECT ON DATABASE dineiq_analytics TO powerbi_reader;
CREATE SCHEMA IF NOT EXISTS bi AUTHORIZATION dineiq_user;
GRANT USAGE ON SCHEMA bi TO powerbi_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA bi TO powerbi_reader;
ALTER DEFAULT PRIVILEGES FOR ROLE dineiq_user IN SCHEMA bi GRANT SELECT ON TABLES TO powerbi_reader;
