import { NextRequest, NextResponse } from "next/server";
import { requireManagementAuth } from "@/lib/api/requireManagementAuth";
import {
  generateZooVscodiumConfig,
  generateClaudeCodeConfig,
  generateAntigravityConfig,
  generateCursorConfig,
  generateClineConfig,
  type SetupOptions,
} from "@/lib/setup/generators";

export async function POST(request: NextRequest) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const options: SetupOptions = {
      baseUrl: body.baseUrl || "http://127.0.0.1:20128",
      apiKey: body.apiKey || "sk-omniroute",
      defaultModel: body.defaultModel,
      includeMcpHub: body.includeMcpHub ?? true,
    };

    const configs = {
      zooVscodium: generateZooVscodiumConfig(options),
      claudeCode: generateClaudeCodeConfig(options),
      antigravity: generateAntigravityConfig(options),
      cursor: generateCursorConfig(options),
      cline: generateClineConfig(options),
    };

    return NextResponse.json({ configs });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
