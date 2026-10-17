CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE TABLE IF NOT EXISTS folio_tombstones(owner text PRIMARY KEY,complete integer NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS folio_owners (id text PRIMARY KEY, kind text NOT NULL CHECK (kind IN ('demo','owner')), created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS folio_workspaces (owner text PRIMARY KEY REFERENCES folio_owners(id) ON DELETE CASCADE, data jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS folio_previews(id text PRIMARY KEY,owner text NOT NULL REFERENCES folio_owners(id) ON DELETE CASCADE,data jsonb NOT NULL,expires bigint NOT NULL);
CREATE TABLE IF NOT EXISTS folio_sessions (hash text PRIMARY KEY, owner text NOT NULL REFERENCES folio_owners(id) ON DELETE CASCADE, expires bigint NOT NULL);
CREATE TABLE IF NOT EXISTS folio_shares (id text PRIMARY KEY,owner text NOT NULL REFERENCES folio_owners(id) ON DELETE CASCADE,hash text UNIQUE NOT NULL,snapshot jsonb NOT NULL,expires bigint NOT NULL,revoked integer NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS folio_source_registry (owner text NOT NULL REFERENCES folio_owners(id) ON DELETE CASCADE,record_id text NOT NULL,record_date date NOT NULL,source_id text NOT NULL,PRIMARY KEY(owner,record_id));
CREATE TABLE IF NOT EXISTS folio_transactions (owner text NOT NULL,record_id text NOT NULL,record_date date NOT NULL,amount bigint NOT NULL,currency text NOT NULL,category text NOT NULL,source_id text NOT NULL,status text NOT NULL,PRIMARY KEY(owner,record_id,record_date));
SELECT create_hypertable('folio_transactions',by_range('record_date'),if_not_exists=>true);
CREATE INDEX IF NOT EXISTS folio_tx_owner_date ON folio_transactions(owner,record_date DESC);
CREATE TABLE IF NOT EXISTS folio_sources (owner text NOT NULL REFERENCES folio_owners(id) ON DELETE CASCADE,id text NOT NULL,data jsonb NOT NULL,PRIMARY KEY(owner,id));
CREATE TABLE IF NOT EXISTS folio_assessments (owner text NOT NULL REFERENCES folio_owners(id) ON DELETE CASCADE,revision integer NOT NULL,data jsonb NOT NULL,PRIMARY KEY(owner,revision));
CREATE TABLE IF NOT EXISTS folio_scorecards (version text PRIMARY KEY,data jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS folio_audit (id text PRIMARY KEY,owner text NOT NULL REFERENCES folio_owners(id) ON DELETE CASCADE,event text NOT NULL,at timestamptz NOT NULL DEFAULT now());
CREATE MATERIALIZED VIEW IF NOT EXISTS folio_daily_cashflow WITH (timescaledb.continuous) AS
SELECT owner,currency,time_bucket(INTERVAL '1 day',record_date) AS bucket,
sum(CASE WHEN category='income' AND amount>0 AND status='posted' THEN amount ELSE 0 END) AS income,
sum(CASE WHEN category='expense' AND amount<0 AND status='posted' THEN -amount ELSE 0 END) AS spending,
sum(CASE WHEN category='refund' AND amount>0 AND status='posted' THEN amount ELSE 0 END) AS refunds
FROM folio_transactions GROUP BY owner,currency,bucket WITH NO DATA;
ALTER MATERIALIZED VIEW folio_daily_cashflow SET (timescaledb.materialized_only=false);

CREATE TABLE IF NOT EXISTS folio_provider_limits(owner TEXT NOT NULL REFERENCES folio_owners(id) ON DELETE CASCADE,scope TEXT NOT NULL,window_start BIGINT NOT NULL,count INTEGER NOT NULL,PRIMARY KEY(owner,scope));
