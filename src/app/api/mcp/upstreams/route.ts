import { NextRequest, NextResponse } from "next/server";
import { requireManagementAuth } from "@/lib/api/requireManagementAuth";
import {
  getAllMcpUpstreams,
  createMcpUpstream,
  updateMcpUpstream,
  deleteMcpUpstream,
} from "@/lib/db/mcpUpstreams";

export async function GET(request: NextRequest) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  try {
    const upstreams = getAllMcpUpstreams();
    return NextResponse.json({ upstreams });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ error: "Server name is required" }, { status: 400 });
    }

    const created = createMcpUpstream(body);
    return NextResponse.json({ upstream: created }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: "Server ID is required" }, { status: 400 });
    }

    const updated = updateMcpUpstream(body.id, body);
    if (!updated) {
      return NextResponse.json({ error: "Server not found" }, { status: 404 });
    }
    return NextResponse.json({ upstream: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Server ID is required" }, { status: 400 });
    }

    const deleted = deleteMcpUpstream(id);
    return NextResponse.json({ success: deleted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
