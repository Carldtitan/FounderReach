import { NextResponse } from "next/server";
import { createFounderMission } from "@/lib/store";
import { playbooks } from "@/lib/playbooks";
import type { ApprovalMode, Goal, Market, Stage, Tone } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const stage = body.stage as Stage;
    const goal = body.goal as Goal;
    const mission = await createFounderMission(
      {
        startup: String(body.startup || "Untitled startup"),
        description: String(body.description || body.startup || ""),
        stage,
        goal,
        audience: String(body.audience || "early users"),
        market: (body.market || "US") as Market,
        region: String(body.region || ""),
        tone: (body.tone || "Founder-led") as Tone,
        approvalMode: (body.approvalMode || "Ask first") as ApprovalMode
      },
      {
        goal,
        stage,
        playbook: playbooks[stage].name
      }
    );

    return NextResponse.json(mission);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Campaign setup failed" }, { status: 500 });
  }
}
