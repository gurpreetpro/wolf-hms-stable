-- Migration: Add nfc_tag_id to security_checkpoints table
-- This allows linking a physical NFC tag ID to a logical checkpoint location.
ALTER TABLE security_checkpoints
ADD COLUMN IF NOT EXISTS nfc_tag_id TEXT UNIQUE;
-- Add index on nfc_tag_id for faster lookups during scans
CREATE INDEX IF NOT EXISTS idx_security_checkpoints_nfc_tag_id ON security_checkpoints(nfc_tag_id);