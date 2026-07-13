import { NextResponse, type NextRequest } from "next/server";
import { requireMissionOwner } from "@/lib/authorization";
import { addEvent, getMissionBundle, replaceMissionResults, updateMission } from "@/lib/store";
import { runNimbleResearch, type NimbleResearchProgress } from "@/lib/nimble";
import { generateTargetsAndDrafts } from "@/lib/nebius";
import {
  addBandScouts,
  completeBandTask,
  createCampaignBoard,
  delegateEvidenceToScouts,
  ensureBandRoom,
  getBandScouts,
  sendBandEvent,
  startBandTask,
  type CampaignBoard,
  type CampaignTaskKey,
  waitForScoutBriefs
} from "@/lib/band";
import type { AgentEvent } from "@/lib/types";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireMissionOwner(request, params.id).catch((error) => error);
  if (access instanceof Error) {
    const status = access.message === "AUTH_REQUIRED" ? 401 : access.message === "AUTH_FORBIDDEN" ? 403 : 404;
    return NextResponse.json({ error: access.message }, { status });
  }

  try {
    const initial = access.bundle;
    await updateMission(params.id, { status: "running", currentStep: "Research" });
    const room = await ensureBandRoom(initial.mission, initial.founder);
    const roomId = room.roomId || initial.mission.bandChatId;
    if (room.roomId && room.roomId !== initial.mission.bandChatId) {
      await updateMission(params.id, { bandChatId: room.roomId });
    }

    const board = await createCampaignBoard(roomId, initial.founder);
    await recordCampaignEvent(params.id, roomId, {
      agent: "Campaign coordinator",
      eventType: "status",
      message: board.roomId ? "BAND board created: three research lanes, verification, and drafts" : "Campaign started",
      tool: "BAND"
    });

    const research = await runNimbleResearch(initial.founder, (progress) =>
      reportNimbleProgress(params.id, roomId, board, progress)
    );

    const scouts = await getBandScouts();
    const scoutJoin = await addBandScouts(roomId, scouts);
    await recordCampaignEvent(params.id, roomId, {
      agent: "Campaign coordinator",
      eventType: "status",
      message: scouts.length
        ? `Added ${scoutJoin.added}/${scouts.length} BAND scouts to review separate research lanes`
        : "No BAND scouts were available; continuing with verified Nimble evidence",
      tool: "BAND"
    });

    for (const scout of scouts) {
      await startBandTask(roomId, board.tasks[scout.lane], `Delegating verified ${scout.lane.toLowerCase()} to ${scout.name}`);
    }
    const delegation = await delegateEvidenceToScouts(roomId, scouts, research.sources);
    for (const scout of delegation.delegated) {
      await recordCampaignEvent(params.id, roomId, {
        agent: "Campaign coordinator",
        eventType: "status",
        message: `${scout.name} received a dedicated Nimble evidence packet for ${scout.lane.toLowerCase()}`,
        tool: "BAND"
      });
    }
    const scoutBriefs = await waitForScoutBriefs(roomId, delegation.delegated);
    for (const brief of scoutBriefs) {
      await completeBandTask(roomId, board.tasks[brief.lane], `${brief.agent} returned a ranked evidence brief.`);
      await recordCampaignEvent(params.id, roomId, {
        agent: brief.agent,
        eventType: "tool_result",
        message: `${brief.agent} returned ranked ${brief.lane.toLowerCase()} evidence to the coordinator`,
        tool: "BAND + Nebius"
      });
    }
    if (delegation.delegated.length && scoutBriefs.length < delegation.delegated.length) {
      await recordCampaignEvent(params.id, roomId, {
        agent: "Campaign coordinator",
        eventType: "status",
        message: `${scoutBriefs.length}/${delegation.delegated.length} BAND scout briefs returned before drafting; Nimble evidence remains the source of truth`,
        tool: "BAND"
      });
    }

    await updateMission(params.id, { currentStep: "Score" });
    await recordCampaignEvent(params.id, roomId, {
      agent: "Campaign coordinator",
      eventType: "tool_call",
      message: `Nebius is scoring ${research.sources.length} verified source packets with ${scoutBriefs.length} BAND scout briefs`,
      tool: "Nebius"
    });

    await updateMission(params.id, { currentStep: "Draft" });
    await startBandTask(roomId, board.tasks["Outreach drafts"], "Writing concise, evidence-based outreach");
    const generated = await generateTargetsAndDrafts(initial.founder, initial.mission, research.sources, scoutBriefs);
    await replaceMissionResults(params.id, generated.targets, generated.drafts);
    await completeBandTask(roomId, board.tasks["Outreach drafts"], `Completed ${generated.drafts.length} sourced drafts.`);
    await recordCampaignEvent(params.id, roomId, {
      agent: "Campaign coordinator",
      eventType: "tool_result",
      message: `Nebius ranked ${generated.targets.length} targets and drafted ${generated.drafts.length} messages`,
      tool: "Nebius"
    });

    await updateMission(params.id, { status: "complete", currentStep: "Review" });
    await recordCampaignEvent(params.id, roomId, {
      agent: "You",
      eventType: "status",
      message: "Ready for review and approval",
      tool: "FounderReach"
    });

    return NextResponse.json(await getMissionBundle(params.id));
  } catch (error) {
    await updateMission(params.id, {
      status: "error",
      currentStep: "Idle",
      error: error instanceof Error ? error.message : "Run failed"
    }).catch(() => null);
    await addEvent({
      missionId: params.id,
      agent: "Campaign coordinator",
      eventType: "error",
      message: error instanceof Error ? error.message : "Run failed",
      tool: "FounderReach"
    }).catch(() => null);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Run failed" }, { status: 500 });
  }
}

async function reportNimbleProgress(
  missionId: string,
  roomId: string | undefined,
  board: CampaignBoard,
  progress: NimbleResearchProgress
) {
  const taskKey = progress.lane || "Evidence verification";
  const taskId = board.tasks[taskKey as CampaignTaskKey];
  const starts = progress.phase === "search-start" || progress.phase === "extract-start" || progress.phase === "map-start";
  const finishes = progress.phase === "map-complete";

  if (starts) {
    await startBandTask(roomId, taskId, progress.message);
  }

  await recordCampaignEvent(missionId, roomId, {
    agent: "Campaign coordinator",
    eventType: starts ? "tool_call" : "tool_result",
    message: progress.message,
    tool: "Nimble"
  });

  if (finishes) {
    await completeBandTask(roomId, taskId, progress.message);
  }
}

async function recordCampaignEvent(
  missionId: string,
  roomId: string | undefined,
  event: Omit<AgentEvent, "id" | "missionId" | "createdAt">
) {
  const saved = await addEvent({ missionId, ...event });
  await sendBandEvent(saved, roomId);
  return saved;
}
