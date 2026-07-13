import { NextResponse, type NextRequest } from "next/server";
import { requireMissionOwner } from "@/lib/authorization";
import { addEvent, getMissionBundle, updateDraftContent } from "@/lib/store";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; draftId: string } }
) {
  const access = await requireMissionOwner(request, params.id).catch((error) => error);
  if (access instanceof Error) {
    const status = access.message === "AUTH_REQUIRED" ? 401 : access.message === "AUTH_FORBIDDEN" ? 403 : 404;
    return NextResponse.json({ error: access.message }, { status });
  }
  try {
    const body = await request.json();
    const subject = String(body.subject || "").trim().slice(0, 70);
    const text = String(body.body || "").replace(/\s+/g, " ").trim();
    if (!subject || !text) {
      return NextResponse.json({ error: "Subject and body are required" }, { status: 400 });
    }

    const draft = await updateDraftContent(params.id, params.draftId, {
      subject,
      body: text.split(" ").slice(0, 120).join(" ")
    });

    await addEvent({
      missionId: params.id,
      agent: "Human Approver",
      eventType: "approval",
      message: "Draft edited",
      tool: "FounderReach"
    });

    return NextResponse.json({ draft, bundle: await getMissionBundle(params.id) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Draft save failed" }, { status: 500 });
  }
}
