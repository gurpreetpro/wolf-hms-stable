CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    room VARCHAR(50) NOT NULL DEFAULT 'global',
    sender_id INTEGER NOT NULL REFERENCES users(id),
    sender_name VARCHAR(100),
    message_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Index for fast retrieval of room history
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_time ON chat_messages(room, created_at DESC);