"use client";

import { useState, useEffect } from "react";
import { Card } from "@/shared/components";

export default function HistoryPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConv, setSelectedConv] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/conversations");
      const data = await res.json();
      if (data.conversations) setConversations(data.conversations);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadDetails = async (id: string) => {
    try {
      const res = await fetch(`/api/conversations?id=${id}`);
      const data = await res.json();
      if (data.conversation) setSelectedConv(data.conversation);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Conversation History</h1>
        <p className="text-sm text-gray-400">
          Persistent, asynchronous conversation storage and turn-by-turn inspector.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Logged Sessions ({conversations.length})
          </h2>
          {loading ? (
            <p className="text-xs text-gray-500">Loading history...</p>
          ) : conversations.length === 0 ? (
            <Card className="p-6 text-center text-xs text-gray-500">
              No conversations logged yet. Requests made through /v1 will appear here.
            </Card>
          ) : (
            conversations.map((c) => (
              <Card
                key={c.id}
                onClick={() => loadDetails(c.id)}
                className={`p-3 cursor-pointer transition-all border ${
                  selectedConv?.id === c.id
                    ? "bg-blue-900/20 border-blue-600"
                    : "bg-gray-900/60 border-gray-800 hover:bg-gray-800/60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-white">{c.provider}</span>
                  <span className="text-[10px] text-gray-500 font-mono">
                    {new Date(c.started_at).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-xs text-gray-400 font-mono truncate">{c.model}</div>
              </Card>
            ))
          )}
        </div>

        <div className="lg:col-span-2">
          {selectedConv ? (
            <Card className="p-5 bg-gray-900 border border-gray-800 space-y-4">
              <div className="border-b border-gray-800 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base">{selectedConv.title || "Conversation Session"}</h3>
                  <div className="text-xs text-gray-400 font-mono">
                    {selectedConv.provider} • {selectedConv.model} • {selectedConv.total_tokens || 0} tokens
                  </div>
                </div>
                <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-300">
                  {selectedConv.source || "proxy"}
                </span>
              </div>

              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {(selectedConv.turns || []).map((t: any, idx: number) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg text-xs font-mono whitespace-pre-wrap ${
                      t.role === "user"
                        ? "bg-blue-950/40 border border-blue-800/40 text-blue-200"
                        : t.role === "assistant"
                        ? "bg-gray-800/50 border border-gray-700/50 text-gray-200"
                        : "bg-purple-950/30 border border-purple-800/30 text-purple-200"
                    }`}
                  >
                    <div className="font-bold text-[10px] uppercase opacity-75 mb-1">[{t.role}]</div>
                    <div>{t.content}</div>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <Card className="p-12 text-center text-gray-500">
              Select a conversation on the left to inspect turns and payloads.
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
