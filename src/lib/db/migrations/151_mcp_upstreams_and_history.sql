-- Migration 151: MCP Upstream Servers and Conversation History Schema

CREATE TABLE IF NOT EXISTS mcp_upstreams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    transport TEXT NOT NULL DEFAULT 'stdio', -- 'stdio' | 'sse' | 'http'
    command TEXT,                           -- for stdio: binary (e.g. node, npx, python)
    args TEXT,                              -- JSON array of arguments
    env TEXT,                               -- JSON object of environment variables
    url TEXT,                               -- for sse/http
    headers TEXT,                           -- JSON object of request headers
    token TEXT,                             -- Bearer token / auth credential
    prefix TEXT,                            -- namespace prefix for tools (e.g. 'hass', 'ssh')
    enabled INTEGER NOT NULL DEFAULT 1,
    auto_instruct INTEGER NOT NULL DEFAULT 0, -- inject instructions into clients when used
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mcp_upstreams_enabled ON mcp_upstreams(enabled);

CREATE TABLE IF NOT EXISTS conversation_history (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    api_key_id TEXT,
    user_id TEXT,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    title TEXT,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    total_tokens INTEGER DEFAULT 0,
    source TEXT DEFAULT 'proxy', -- 'proxy' | 'auto_import' | 'manual'
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_conversations_api_key ON conversation_history(api_key_id);
CREATE INDEX IF NOT EXISTS idx_conversations_session ON conversation_history(session_id);
CREATE INDEX IF NOT EXISTS idx_conversations_provider ON conversation_history(provider);
CREATE INDEX IF NOT EXISTS idx_conversations_started_at ON conversation_history(started_at);

CREATE TABLE IF NOT EXISTS conversation_turns (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    turn_index INTEGER NOT NULL,
    role TEXT NOT NULL,         -- 'system' | 'user' | 'assistant' | 'tool'
    content TEXT,
    tool_calls TEXT,           -- JSON array or compressed blob
    tool_results TEXT,         -- JSON array or compressed blob
    compressed_payload BLOB,   -- optional zlib/gzip payload for heavy turn content
    tokens INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY(conversation_id) REFERENCES conversation_history(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_turns_conversation ON conversation_turns(conversation_id, turn_index);

CREATE TABLE IF NOT EXISTS conversation_tags (
    conversation_id TEXT NOT NULL,
    tag TEXT NOT NULL,
    PRIMARY KEY(conversation_id, tag),
    FOREIGN KEY(conversation_id) REFERENCES conversation_history(id) ON DELETE CASCADE
);
