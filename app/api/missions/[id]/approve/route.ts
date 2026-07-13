import { NextResponse } from "next/server";
import { addEvent, getMissionBundle, setDraftDecision, updateMission } from "@/lib/store";
import { ensureBandRoom, sendBandEvent } from "@/lib/band";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const draftId = String(body.draftId || "");
    const decision = body.decision === "rejected" ? "rejected" : "approved";
    const approval = await setDraftDecision(params.id, draftId, decision);
    const bundle = await getMissionBundle(params.id);
    const room = await ensureBandRoom(bundle.mission, bundle.founder);
    if (room.roomId && room.roomId !== bundle.mission.bandChatId) {
      await updateMission(params.id, { bandChatId: room.roomId });
    }
    const event = await addEvent({
      missionId: params.id,
      agent: "Human Approver",
      eventType: "approval",
      message: decision === "approved" ? "Draft approved" : "Draft rejected",
      tool: "BAND"
    });
    await sendBandEvent(event, room.roomId || bundle.mission.bandChatId);
    return NextResponse.json({ approval, bundle: await getMissionBundle(params.id) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Approval failed" }, { status: 500 });
  }
}
