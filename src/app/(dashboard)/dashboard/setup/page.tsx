"use client";

import { useState, useEffect } from "react";
import { Card } from "@/shared/components";
import { copyToClipboard } from "@/shared/utils/clipboard";

export default function SetupGeneratorPage() {
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("sk-omniroute");
  const [defaultModel, setDefaultModel] = useState("claude-3-7-sonnet");
  const [configs, setConfigs] = useState<any>(null);
  const [selectedClient, setSelectedClient] = useState("zooVscodium");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);

  useEffect(() => {
    setBaseUrl(window.location.origin);
  }, []);

  const generate = async () => {
    if (!baseUrl) return;
    try {
      const res = await fetch("/api/setup-scripts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseUrl, apiKey, defaultModel }),
      });
      const data = await res.json();
      if (data.configs) setConfigs(data.configs);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (baseUrl) generate();
  }, [baseUrl, apiKey, defaultModel]);

  const handleApplyLocal = async (target: string) => {
    setApplying(true);
    setApplySuccess(false);
    try {
      const res = await fetch("/api/setup-scripts/apply-local", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, baseUrl, apiKey, defaultModel }),
      });
      const data = await res.json();
      if (data.success) {
        setApplySuccess(true);
        setTimeout(() => setApplySuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setApplying(false);
    }
  };

  const copy = (text: string, key: string) => {
    copyToClipboard(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const current = configs ? configs[selectedClient] : null;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Client Setup & Config Generator</h1>
        <p className="text-sm text-gray-400">
          Generate ready-to-run setup scripts and configuration snippets for your IDEs, CLI tools, and extensions.
        </p>
      </div>

      <Card className="p-4 bg-gray-900 border border-gray-800 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1">OmniRoute Base URL</label>
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1">OmniRoute API Key</label>
          <input
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1">Default Model</label>
          <input
            type="text"
            value={defaultModel}
            onChange={(e) => setDefaultModel(e.target.value)}
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm font-mono"
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Supported Clients</h2>
          {[
            { id: "zooVscodium", label: "Zoo (VSCodium)", tag: "IDE Extension" },
            { id: "claudeCode", label: "Claude Code", tag: "CLI Tool" },
            { id: "antigravity", label: "Antigravity IDE", tag: "IDE / Hub" },
            { id: "cursor", label: "Cursor", tag: "AI Editor" },
            { id: "cline", label: "Cline / RooCode", tag: "VS Code" },
          ].map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedClient(c.id)}
              className={`w-full text-left p-3 rounded-lg border transition-all flex items-center justify-between ${
                selectedClient === c.id
                  ? "bg-blue-900/30 border-blue-600 text-white"
                  : "bg-gray-900/60 border-gray-800 text-gray-400 hover:bg-gray-800/60"
              }`}
            >
              <div className="font-medium text-sm">{c.label}</div>
              <div className="text-xs text-gray-500">{c.tag}</div>
            </button>
          ))}
        </div>

        <div className="lg:col-span-3 space-y-4">
          {current ? (
            <Card className="p-6 bg-gray-900 border border-gray-800 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">{current.name}</h2>
                  <div className="text-xs text-gray-400">{current.category}</div>
                </div>
                {selectedClient === "zooVscodium" && (
                  <button
                    onClick={() => handleApplyLocal("zoo_vscodium")}
                    disabled={applying}
                    className="px-4 py-2 bg-green-600 hover:bg-green-500 font-semibold text-xs rounded-md shadow flex items-center gap-2"
                  >
                    {applySuccess ? "✅ Applied to VSCodium!" : applying ? "Applying..." : "⚡ Apply Directly to VSCodium"}
                  </button>
                )}
              </div>

              {current.linuxBashOneLiner && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-gray-300">Linux / macOS One-Liner (Bash/Zsh)</div>
                    <button
                      onClick={() => copy(current.linuxBashOneLiner, "bash")}
                      className="text-xs text-blue-400 hover:underline"
                    >
                      {copiedKey === "bash" ? "Copied!" : "Copy One-Liner"}
                    </button>
                  </div>
                  <pre className="p-3 bg-black/60 border border-gray-800 rounded text-xs font-mono overflow-x-auto text-green-400 whitespace-pre-wrap">
                    {current.linuxBashOneLiner}
                  </pre>
                </div>
              )}

              {current.winPowerShellOneLiner && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-gray-300">Windows PowerShell One-Liner</div>
                    <button
                      onClick={() => copy(current.winPowerShellOneLiner, "ps")}
                      className="text-xs text-blue-400 hover:underline"
                    >
                      {copiedKey === "ps" ? "Copied!" : "Copy One-Liner"}
                    </button>
                  </div>
                  <pre className="p-3 bg-black/60 border border-gray-800 rounded text-xs font-mono overflow-x-auto text-blue-300 whitespace-pre-wrap">
                    {current.winPowerShellOneLiner}
                  </pre>
                </div>
              )}

              {current.jsonSnippet && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-gray-300">Configuration JSON Snippet</div>
                    <button
                      onClick={() => copy(current.jsonSnippet, "json")}
                      className="text-xs text-blue-400 hover:underline"
                    >
                      {copiedKey === "json" ? "Copied!" : "Copy JSON"}
                    </button>
                  </div>
                  <pre className="p-3 bg-black/60 border border-gray-800 rounded text-xs font-mono overflow-x-auto text-gray-300">
                    {current.jsonSnippet}
                  </pre>
                </div>
              )}
            </Card>
          ) : (
            <Card className="p-6 text-center text-gray-500">Select a client on the left to view setup instructions.</Card>
          )}
        </div>
      </div>
    </div>
  );
}
