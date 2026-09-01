/**
 * Upstream MCP Manager & Multiplexer Engine
 *
 * Connects to upstream MCP servers (stdio subprocesses and remote SSE endpoints),
 * discovers tools dynamically, merges namespaces with prefixes, and routes tool calls.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { getEnabledMcpUpstreams, McpUpstream } from "../../src/lib/db/mcpUpstreams.ts";

export interface ProxiedTool {
  upstreamId: string;
  upstreamName: string;
  originalName: string;
  namespacedName: string;
  description?: string;
  inputSchema: any;
}

class UpstreamManager {
  private clients: Map<string, { client: Client; transport: any; upstream: McpUpstream }> = new Map();
  private tools: Map<string, ProxiedTool> = new Map();
  private initializing = false;

  async init() {
    if (this.initializing) return;
    this.initializing = true;
    try {
      const upstreams = getEnabledMcpUpstreams();
      for (const upstream of upstreams) {
        await this.connectUpstream(upstream);
      }
    } catch (err) {
      console.error("[UpstreamManager] Initialization error:", err);
    } finally {
      this.initializing = false;
    }
  }

  async connectUpstream(upstream: McpUpstream) {
    try {
      this.disconnectUpstream(upstream.id);

      let transport: any;
      if (upstream.transport === "stdio" && upstream.command) {
        transport = new StdioClientTransport({
          command: upstream.command,
          args: upstream.args || [],
          env: {
            ...process.env,
            ...(upstream.env || {}),
          },
        });
      } else if (upstream.transport === "sse" && upstream.url) {
        const headers: Record<string, string> = { ...(upstream.headers || {}) };
        if (upstream.token) {
          headers["Authorization"] = upstream.token.startsWith("Bearer ") ? upstream.token : `Bearer ${upstream.token}`;
        }
        transport = new SSEClientTransport(new URL(upstream.url), {
          eventSourceInit: {
            headers,
          },
          requestInit: {
            headers,
          },
        });
      } else {
        return;
      }

      const client = new Client({
        name: `omniroute-hub-client-${upstream.name}`,
        version: "1.0.0",
      });

      await client.connect(transport);
      this.clients.set(upstream.id, { client, transport, upstream });

      // Discover tools
      const response = await client.listTools();
      const prefix = upstream.prefix ? `${upstream.prefix}__` : "";

      for (const t of response.tools) {
        const namespacedName = `${prefix}${t.name}`;
        this.tools.set(namespacedName, {
          upstreamId: upstream.id,
          upstreamName: upstream.name,
          originalName: t.name,
          namespacedName,
          description: `[From ${upstream.name}] ${t.description || ""}`,
          inputSchema: t.inputSchema,
        });
      }

      console.log(`[UpstreamManager] Connected to "${upstream.name}", registered ${response.tools.length} tool(s).`);
    } catch (err) {
      console.error(`[UpstreamManager] Failed to connect to "${upstream.name}":`, err);
    }
  }

  disconnectUpstream(id: string) {
    const existing = this.clients.get(id);
    if (existing) {
      try {
        existing.client.close();
      } catch {}
      this.clients.delete(id);

      // Remove tools
      for (const [key, tool] of Array.from(this.tools.entries())) {
        if (tool.upstreamId === id) {
          this.tools.delete(key);
        }
      }
    }
  }

  getAllTools(): ProxiedTool[] {
    return Array.from(this.tools.values());
  }

  async executeTool(namespacedName: string, args: any): Promise<any> {
    const tool = this.tools.get(namespacedName);
    if (!tool) {
      throw new Error(`Tool "${namespacedName}" not found on any upstream MCP server.`);
    }

    const conn = this.clients.get(tool.upstreamId);
    if (!conn) {
      throw new Error(`Upstream server "${tool.upstreamName}" is not connected.`);
    }

    const result = await conn.client.callTool({
      name: tool.originalName,
      arguments: args,
    });

    return result;
  }
}

export const upstreamManager = new UpstreamManager();
