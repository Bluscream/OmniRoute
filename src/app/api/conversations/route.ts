import { NextRequest, NextResponse } from "next/server";
import { requireManagementAuth } from "@/lib/api/requireManagementAuth";
import { getConversations, getConversationWithTurns } from "@/lib/db/conversations";

export async function GET(request: NextRequest) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const provider = searchParams.get("provider") || undefined;
    const apiKeyId = searchParams.get("api_key_id") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 50;

    if (id) {
      const conv = getConversationWithTurns(id);
      if (!conv) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      }
      return NextResponse.json({ conversation: conv });
    }

    const list = getConversations({ provider, apiKeyId, limit });
    return NextResponse.json({ conversations: list });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
