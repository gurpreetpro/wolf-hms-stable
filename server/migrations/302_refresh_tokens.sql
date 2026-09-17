-- Migration 302: Hardened Refresh Token Store with SHA-256 Hash Storage & Family Revocation
-- Part of Wolf HMS Phase 3 Hardening Program

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    device VARCHAR(255) DEFAULT 'web',
    family_id UUID DEFAULT gen_random_uuid(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- Drift tolerance: prod may already have refresh_tokens from schema migrations without full column set
ALTER TABLE IF EXISTS refresh_tokens ADD COLUMN IF NOT EXISTS token_hash TEXT;
ALTER TABLE IF EXISTS refresh_tokens ADD COLUMN IF NOT EXISTS device VARCHAR(255) DEFAULT 'web';
ALTER TABLE IF EXISTS refresh_tokens ADD COLUMN IF NOT EXISTS family_id UUID DEFAULT gen_random_uuid();
ALTER TABLE IF EXISTS refresh_tokens ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS refresh_tokens ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS refresh_tokens ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE IF EXISTS refresh_tokens ADD COLUMN IF NOT EXISTS user_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family ON refresh_tokens(family_id);
