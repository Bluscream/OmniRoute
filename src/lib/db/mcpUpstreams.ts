/**
 * Database access layer for MCP Upstream Servers
 */
import { v4 as uuidv4 } from "uuid";
import { getDbInstance } from "./core";

export interface McpUpstream {
  id: string;
  name: string;
  transport: "stdio" | "sse" | "http";
  command?: string | null;
  args?: string[] | null;
  env?: Record<string, string> | null;
  url?: string | null;
  headers?: Record<string, string> | null;
  token?: string | null;
  prefix?: string | null;
  enabled: boolean;
  auto_instruct: boolean;
  created_at: string;
  updated_at: string;
}

export function getAllMcpUpstreams(): McpUpstream[] {
  const db = getDbInstance();
  const rows = db.prepare("SELECT * FROM mcp_upstreams ORDER BY name ASC").all() as any[];
  return rows.map(formatRow);
}

export function getEnabledMcpUpstreams(): McpUpstream[] {
  const db = getDbInstance();
  const rows = db.prepare("SELECT * FROM mcp_upstreams WHERE enabled = 1 ORDER BY name ASC").all() as any[];
  return rows.map(formatRow);
}

export function getMcpUpstreamById(id: string): McpUpstream | null {
  const db = getDbInstance();
  const row = db.prepare("SELECT * FROM mcp_upstreams WHERE id = ?").get(id) as any;
  return row ? formatRow(row) : null;
}

export function createMcpUpstream(data: Omit<McpUpstream, "id" | "created_at" | "updated_at">): McpUpstream {
  const db = getDbInstance();
  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO mcp_upstreams
      (id, name, transport, command, args, env, url, headers, token, prefix, enabled, auto_instruct, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.name,
    data.transport || "stdio",
    data.command || null,
    data.args ? JSON.stringify(data.args) : null,
    data.env ? JSON.stringify(data.env) : null,
    data.url || null,
    data.headers ? JSON.stringify(data.headers) : null,
    data.token || null,
    data.prefix || null,
    data.enabled ? 1 : 0,
    data.auto_instruct ? 1 : 0,
    now,
    now
  );

  return {
    id,
    ...data,
    created_at: now,
    updated_at: now,
  };
}

export function updateMcpUpstream(id: string, data: Partial<McpUpstream>): McpUpstream | null {
  const db = getDbInstance();
  const existing = getMcpUpstreamById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const merged = { ...existing, ...data, updated_at: now };

  db.prepare(`
    UPDATE mcp_upstreams SET
      name = ?, transport = ?, command = ?, args = ?, env = ?,
      url = ?, headers = ?, token = ?, prefix = ?, enabled = ?,
      auto_instruct = ?, updated_at = ?
    WHERE id = ?
  `).run(
    merged.name,
    merged.transport,
    merged.command || null,
    merged.args ? JSON.stringify(merged.args) : null,
    merged.env ? JSON.stringify(merged.env) : null,
    merged.url || null,
    merged.headers ? JSON.stringify(merged.headers) : null,
    merged.token || null,
    merged.prefix || null,
    merged.enabled ? 1 : 0,
    merged.auto_instruct ? 1 : 0,
    now,
    id
  );

  return merged;
}

export function deleteMcpUpstream(id: string): boolean {
  const db = getDbInstance();
  const result = db.prepare("DELETE FROM mcp_upstreams WHERE id = ?").run(id);
  return result.changes > 0;
}

function formatRow(row: any): McpUpstream {
  return {
    id: row.id,
    name: row.name,
    transport: row.transport,
    command: row.command,
    args: row.args ? safeParseJson(row.args, []) : [],
    env: row.env ? safeParseJson(row.env, {}) : {},
    url: row.url,
    headers: row.headers ? safeParseJson(row.headers, {}) : {},
    token: row.token,
    prefix: row.prefix,
    enabled: Boolean(row.enabled),
    auto_instruct: Boolean(row.auto_instruct),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function safeParseJson<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}
