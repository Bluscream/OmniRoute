/**
 * High-performance conversation and turn logging repository.
 * Uses SQLite with async batching and optional zlib/gzip compression
 * for heavy tool returns/diffs.
 */
import { v4 as uuidv4 } from "uuid";
import { getDbInstance } from "./core";
import zlib from "zlib";

export interface ConversationRecord {
  id?: string;
  sessionId?: string | null;
  apiKeyId?: string | null;
  userId?: string | null;
  provider: string;
  model: string;
  title?: string | null;
  startedAt?: string;
  endedAt?: string | null;
  totalTokens?: number;
  source?: string;
}

export interface ConversationTurnRecord {
  id?: string;
  conversationId: string;
  turnIndex: number;
  role: "system" | "user" | "assistant" | "tool";
  content?: string | null;
  toolCalls?: any | null;
  toolResults?: any | null;
  tokens?: number;
}

// In-memory async write queue to ensure 0ms latency impact on proxy
const queue: Array<() => void> = [];
let isFlushing = false;

function scheduleFlush() {
  if (isFlushing || queue.length === 0) return;
  isFlushing = true;
  setImmediate(() => {
    try {
      const db = getDbInstance();
      db.transaction(() => {
        while (queue.length > 0) {
          const task = queue.shift();
          if (task) task();
        }
      })();
    } catch (err) {
      console.error("[ConversationLogger] Error flushing queue:", err);
    } finally {
      isFlushing = false;
      if (queue.length > 0) scheduleFlush();
    }
  });
}

export function logConversationAsync(conv: ConversationRecord, turns: ConversationTurnRecord[]) {
  queue.push(() => {
    const db = getDbInstance();
    const convId = conv.id || uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO conversation_history
        (id, session_id, api_key_id, user_id, provider, model, title, started_at, ended_at, total_tokens, source, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        ended_at = excluded.ended_at,
        total_tokens = excluded.total_tokens
    `).run(
      convId,
      conv.sessionId || null,
      conv.apiKeyId || null,
      conv.userId || null,
      conv.provider,
      conv.model,
      conv.title || null,
      conv.startedAt || now,
      conv.endedAt || now,
      conv.totalTokens || 0,
      conv.source || "proxy",
      now
    );

    const insertTurn = db.prepare(`
      INSERT INTO conversation_turns
        (id, conversation_id, turn_index, role, content, tool_calls, tool_results, compressed_payload, tokens, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const turn of turns) {
      const turnId = turn.id || uuidv4();
      let compressedBlob: Buffer | null = null;
      let rawContent = turn.content || "";

      // Compress if payload is heavy (> 4KB)
      if (rawContent.length > 4096) {
        try {
          compressedBlob = zlib.gzipSync(Buffer.from(rawContent, "utf-8"));
          rawContent = "[COMPRESSED_PAYLOAD]";
        } catch {
          // fallback to uncompressed
        }
      }

      insertTurn.run(
        turnId,
        convId,
        turn.turnIndex,
        turn.role,
        rawContent,
        turn.toolCalls ? JSON.stringify(turn.toolCalls) : null,
        turn.toolResults ? JSON.stringify(turn.toolResults) : null,
        compressedBlob,
        turn.tokens || 0,
        now
      );
    }
  });

  scheduleFlush();
}

export function getConversations(filter: {
  apiKeyId?: string;
  provider?: string;
  limit?: number;
  offset?: number;
}) {
  const db = getDbInstance();
  const where: string[] = [];
  const params: any[] = [];

  if (filter.apiKeyId) {
    where.push("api_key_id = ?");
    params.push(filter.apiKeyId);
  }
  if (filter.provider) {
    where.push("provider = ?");
    params.push(filter.provider);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const limit = filter.limit || 50;
  const offset = filter.offset || 0;

  return db
    .prepare(
      `SELECT * FROM conversation_history ${whereClause} ORDER BY started_at DESC LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset);
}

export function getConversationWithTurns(id: string) {
  const db = getDbInstance();
  const conv = db.prepare("SELECT * FROM conversation_history WHERE id = ?").get(id) as any;
  if (!conv) return null;

  const turns = db
    .prepare("SELECT * FROM conversation_turns WHERE conversation_id = ? ORDER BY turn_index ASC")
    .all(id) as any[];

  const formattedTurns = turns.map((t) => {
    let content = t.content;
    if (t.compressed_payload && content === "[COMPRESSED_PAYLOAD]") {
      try {
        content = zlib.gunzipSync(t.compressed_payload).toString("utf-8");
      } catch {
        content = "[ERROR_DECOMPRESSING]";
      }
    }
    return {
      ...t,
      content,
      tool_calls: t.tool_calls ? JSON.parse(t.tool_calls) : null,
      tool_results: t.tool_results ? JSON.parse(t.tool_results) : null,
    };
  });

  return {
    ...conv,
    turns: formattedTurns,
  };
}
