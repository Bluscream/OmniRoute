import { NextRequest, NextResponse } from "next/server";
import { requireManagementAuth } from "@/lib/api/requireManagementAuth";
import fs from "fs";
import path from "path";
import os from "os";

export async function POST(request: NextRequest) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const target = body.target; // "zoo_vscodium" | "antigravity_ide"
    const baseUrl = body.baseUrl || "http://127.0.0.1:20128";
    const apiKey = body.apiKey || "sk-omniroute";
    const defaultModel = body.defaultModel || "claude-3-7-sonnet";

    if (target === "zoo_vscodium") {
      const settingsPath = path.join(os.homedir(), ".config", "VSCodium", "User", "settings.json");
      let currentSettings: any = {};

      if (fs.existsSync(settingsPath)) {
        try {
          const raw = fs.readFileSync(settingsPath, "utf-8");
          currentSettings = JSON.parse(raw);
        } catch {
          // ignore corrupted or empty JSON
        }
      } else {
        fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
      }

      currentSettings["zed.ai.baseUrl"] = `${baseUrl}/v1`;
      currentSettings["zed.ai.apiKey"] = apiKey;
      currentSettings["zed.ai.defaultModel"] = defaultModel;

      fs.writeFileSync(settingsPath, JSON.stringify(currentSettings, null, 2), "utf-8");
      return NextResponse.json({ success: true, path: settingsPath });
    }

    if (target === "antigravity_ide") {
      const configPath = path.join(os.homedir(), ".gemini", "config", "mcp_config.json");
      let currentConfig: any = { mcpServers: {} };

      if (fs.existsSync(configPath)) {
        try {
          const raw = fs.readFileSync(configPath, "utf-8");
          currentConfig = JSON.parse(raw);
          if (!currentConfig.mcpServers) currentConfig.mcpServers = {};
        } catch {
          // ignore
        }
      } else {
        fs.mkdirSync(path.dirname(configPath), { recursive: true });
      }

      currentConfig.mcpServers["omniroute-hub"] = {
        url: `${baseUrl}/api/mcp/hub/sse`,
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      };

      fs.writeFileSync(configPath, JSON.stringify(currentConfig, null, 2), "utf-8");
      return NextResponse.json({ success: true, path: configPath });
    }

    return NextResponse.json({ error: "Unsupported target" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
