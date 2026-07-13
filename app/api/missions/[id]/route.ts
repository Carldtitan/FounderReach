import { NextResponse, type NextRequest } from "next/server";
import { requireMissionOwner } from "@/lib/authorization";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { bundle } = await requireMissionOwner(request, params.id);
    return NextResponse.json(bundle);
  } catch (error) {
    const status = error instanceof Error && error.message === "AUTH_REQUIRED" ? 401 : error instanceof Error && error.message === "AUTH_FORBIDDEN" ? 403 : 404;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Campaign not found" }, { status });
  }
}
