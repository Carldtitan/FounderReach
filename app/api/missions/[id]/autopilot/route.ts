import { NextResponse, type NextRequest } from "next/server";
import {
  createMissionAutopilot,
  manuallyRunAutopilot,
  setMissionAutopilotActive,
  updateMissionAutopilot,
  type AutopilotSetup
} from "@/lib/autopilot";
import { getAutopilotSnapshot } from "@/lib/autopilot-store";
import { requireMissionOwner } from "@/lib/authorization";

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Autopilot request failed";
  const status = message === "AUTH_REQUIRED" ? 401 : message === "AUTH_FORBIDDEN" ? 403 : message.includes("not found") ? 404 : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireMissionOwner(request, params.id);
    return NextResponse.json(await getAutopilotSnapshot(params.id));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { bundle } = await requireMissionOwner(request, params.id);
    const current = await getAutopilotSnapshot(params.id);
    if (current.autopilot) return NextResponse.json({ error: "Autopilot already exists for this campaign." }, { status: 409 });
    const input = (await request.json().catch(() => ({}))) as AutopilotSetup;
    await createMissionAutopilot(bundle.founder, bundle.mission, input);
    return NextResponse.json(await getAutopilotSnapshot(params.id), { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireMissionOwner(request, params.id);
    const snapshot = await getAutopilotSnapshot(params.id);
    if (!snapshot.autopilot) return NextResponse.json({ error: "Autopilot not found" }, { status: 404 });
    const body = (await request.json().catch(() => ({}))) as AutopilotSetup & { action?: "pause" | "resume" | "run" };
    if (body.action === "pause" || body.action === "resume") {
      await setMissionAutopilotActive(snapshot.autopilot, body.action === "resume");
    } else if (body.action === "run") {
      await manuallyRunAutopilot(snapshot.autopilot);
    } else {
      await updateMissionAutopilot(snapshot.autopilot, body);
    }
    return NextResponse.json(await getAutopilotSnapshot(params.id));
  } catch (error) {
    return errorResponse(error);
  }
}
