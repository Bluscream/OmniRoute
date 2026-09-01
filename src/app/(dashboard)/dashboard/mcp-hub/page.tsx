"use client";

import { useState, useEffect } from "react";
import { Card } from "@/shared/components";
import { copyToClipboard } from "@/shared/utils/clipboard";

interface McpUpstream {
  id?: string;
  name: string;
  transport: "stdio" | "sse" | "http";
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  token?: string;
  prefix?: string;
  enabled: boolean;
  auto_instruct: boolean;
}

export default function McpHubPage() {
  const [upstreams, setUpstreams] = useState<McpUpstream[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<McpUpstream | null>(null);
  const [name, setName] = useState("");
  const [transport, setTransport] = useState<"stdio" | "sse">("stdio");
  const [command, setCommand] = useState("");
  const [argsStr, setArgsStr] = useState("");
  const [envStr, setEnvStr] = useState("");
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [prefix, setPrefix] = useState("");
  const [copied, setCopied] = useState(false);

  const fetchUpstreams = async () => {
    try {
      const res = await fetch("/api/mcp/upstreams");
      const data = await res.json();
      if (data.upstreams) setUpstreams(data.upstreams);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpstreams();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      name,
      transport,
      command: transport === "stdio" ? command : undefined,
      args: transport === "stdio" && argsStr ? argsStr.split(" ").filter(Boolean) : [],
      env: transport === "stdio" && envStr ? parseEnv(envStr) : {},
      url: transport === "sse" ? url : undefined,
      token: token || undefined,
      prefix: prefix || undefined,
      enabled: true,
      auto_instruct: false,
    };

    if (editing?.id) {
      payload.id = editing.id;
      await fetch("/api/mcp/upstreams", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/mcp/upstreams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    resetForm();
    fetchUpstreams();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this MCP server?")) return;
    await fetch(`/api/mcp/upstreams?id=${id}`, { method: "DELETE" });
    fetchUpstreams();
  };

  const handleToggle = async (s: McpUpstream) => {
    await fetch("/api/mcp/upstreams", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: s.id, enabled: !s.enabled }),
    });
    fetchUpstreams();
  };

  const resetForm = () => {
    setEditing(null);
    setName("");
    setTransport("stdio");
    setCommand("");
    setArgsStr("");
    setEnvStr("");
    setUrl("");
    setToken("");
    setPrefix("");
  };

  const parseEnv = (str: string) => {
    const res: Record<string, string> = {};
    str.split("\n").forEach((line) => {
      const parts = line.split("=");
      if (parts.length >= 2) res[parts[0].trim()] = parts.slice(1).join("=").trim();
    });
    return res;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">MCP Hub & Gateway</h1>
        <p className="text-sm text-gray-400">
          Multiplex and inject local & remote MCP services into a single, unified endpoint.
        </p>
      </div>

      <Card className="p-4 bg-gray-900 border border-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-green-400">Universal Hub SSE Endpoint</div>
            <code className="text-xs text-gray-300">/api/mcp/hub/sse</code>
          </div>
          <button
            onClick={() => {
              copyToClipboard(window.location.origin + "/api/mcp/hub/sse");
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-xs rounded border border-gray-700"
          >
            {copied ? "Copied!" : "Copy Full URL"}
          </button>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold">Configured Upstream Servers ({upstreams.length})</h2>
          {loading ? (
            <p className="text-sm text-gray-500">Loading servers...</p>
          ) : upstreams.length === 0 ? (
            <Card className="p-6 text-center text-gray-500">No MCP servers registered yet.</Card>
          ) : (
            upstreams.map((s) => (
              <Card key={s.id} className="p-4 flex items-center justify-between bg-gray-900/60 border border-gray-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{s.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-300">
                      {s.transport.toUpperCase()}
                    </span>
                    {s.prefix && (
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-900/40 text-blue-300">
                        prefix: {s.prefix}__
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 font-mono">
                    {s.transport === "stdio" ? `${s.command} ${(s.args || []).join(" ")}` : s.url}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggle(s)}
                    className={`px-2.5 py-1 text-xs rounded font-medium ${
                      s.enabled ? "bg-green-900/40 text-green-300 border border-green-700/50" : "bg-gray-800 text-gray-400"
                    }`}
                  >
                    {s.enabled ? "Enabled" : "Disabled"}
                  </button>
                  <button
                    onClick={() => handleDelete(s.id!)}
                    className="px-2.5 py-1 text-xs rounded bg-red-900/30 text-red-400 hover:bg-red-900/50"
                  >
                    Delete
                  </button>
                </div>
              </Card>
            ))
          )}
        </div>

        <div>
          <Card className="p-5 bg-gray-900 border border-gray-800 space-y-4">
            <h2 className="text-lg font-semibold">{editing ? "Edit Server" : "Add MCP Upstream"}</h2>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Server Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. hass-lite, ssh, mqtt"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Transport</label>
                <select
                  value={transport}
                  onChange={(e: any) => setTransport(e.target.value)}
                  className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm"
                >
                  <option value="stdio">stdio (Command / Subprocess)</option>
                  <option value="sse">SSE (HTTP / Remote URL)</option>
                </select>
              </div>

              {transport === "stdio" ? (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Command Binary</label>
                    <input
                      type="text"
                      placeholder="node, npx, python"
                      value={command}
                      onChange={(e) => setCommand(e.target.value)}
                      className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Arguments (Space separated)</label>
                    <input
                      type="text"
                      placeholder="/path/to/server.js --flag"
                      value={argsStr}
                      onChange={(e) => setArgsStr(e.target.value)}
                      className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Environment Variables (KEY=VAL)</label>
                    <textarea
                      rows={2}
                      placeholder={"HASS_SERVER=http://192.168.2.4:8123\nHASS_TOKEN=..."}
                      value={envStr}
                      onChange={(e) => setEnvStr(e.target.value)}
                      className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-xs font-mono"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">SSE / HTTP URL</label>
                    <input
                      type="url"
                      placeholder="http://192.168.2.4:8123/api/mcp"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Bearer Token / Auth Header</label>
                    <input
                      type="password"
                      placeholder="eyJhbG..."
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Tool Prefix (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. hass, ssh (prepends hass__)"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-500 font-medium rounded text-sm"
                >
                  {editing ? "Update Server" : "Add Server"}
                </button>
                {editing && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-sm"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
