-- Additive: old code can continue reading the existing tables.
CREATE TABLE IF NOT EXISTS identity_revocations(provider TEXT NOT NULL,subject_hash TEXT NOT NULL,revoked_at INTEGER NOT NULL,expires INTEGER NOT NULL,PRIMARY KEY(provider,subject_hash));
CREATE TABLE IF NOT EXISTS unlink_jobs(id TEXT PRIMARY KEY,provider TEXT NOT NULL,subject_hash TEXT NOT NULL,target_user_id TEXT,status TEXT NOT NULL,created_at INTEGER NOT NULL,expires INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS unlink_job_status ON unlink_jobs(status,created_at);
INSERT OR IGNORE INTO schema_version VALUES(2);
CREATE TABLE IF NOT EXISTS request_metrics(request_id TEXT PRIMARY KEY REFERENCES reservations(id) ON DELETE CASCADE,latency_ms INTEGER NOT NULL,retry_count INTEGER NOT NULL DEFAULT 0);
