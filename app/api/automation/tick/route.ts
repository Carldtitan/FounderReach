import { NextResponse, type NextRequest } from "next/server";
import { syncAllAutopilots } from "@/lib/autopilot";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const secret = process.env.AUTOMATION_CRON_SECRET;
  if (!secret || request.headers.get("x-founderreach-cron") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(await syncAllAutopilots());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Autopilot tick failed" }, { status: 500 });
  }
}
