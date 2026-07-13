import { NextResponse } from "next/server";
import { ensureBandRoom, sendBandEvent } from "@/lib/band";
import { addEvent, getMissionBundle, updateMission } from "@/lib/store";
import type { AgentEvent } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const missionId = String(body.missionId || "");
    const bundle = await getMissionBundle(missionId);
    const room = await ensureBandRoom(bundle.mission, bundle.founder);
    if (room.roomId && room.roomId !== bundle.mission.bandChatId) {
      await updateMission(missionId, { bandChatId: room.roomId });
    }
    const event = await addEvent({
      missionId,
      agent: (body.agent || "System") as AgentEvent["agent"],
      eventType: (body.eventType || "status") as AgentEvent["eventType"],
      message: String(body.message || "FounderReach update"),
      tool: (body.tool || "BAND") as AgentEvent["tool"]
    });
    const result = await sendBandEvent(event, room.roomId || bundle.mission.bandChatId);
    return NextResponse.json({ event, ...result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "BAND event failed" }, { status: 500 });
  }
}
