-- Cloudflare D1: create before enabling transcribe. Store counters only, never raw audio/text.
CREATE TABLE IF NOT EXISTS transcription_quota (
 quota_key TEXT NOT NULL,
 quota_date TEXT NOT NULL,
 used INTEGER NOT NULL DEFAULT 0 CHECK(used >= 0),
 PRIMARY KEY (quota_key,quota_date)
);
CREATE INDEX IF NOT EXISTS idx_transcription_quota_date ON transcription_quota(quota_date);
-- Operator may periodically delete records older than retention policy:
-- DELETE FROM transcription_quota WHERE quota_date < date('now','-35 days');
