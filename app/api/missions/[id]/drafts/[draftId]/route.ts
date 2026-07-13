import { NextResponse } from "next/server";
import { addEvent, getMissionBundle, updateDraftContent } from "@/lib/store";

export async function POST(
  request: Request,
  { params }: { params: { id: string; draftId: string } }
) {
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
