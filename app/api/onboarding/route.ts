import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { createFounderMission } from "@/lib/store";
import { playbooks } from "@/lib/playbooks";
import type { ApprovalMode, Goal, Market, Stage, Tone } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
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
      },
      user.id
    );

    return NextResponse.json(mission);
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return NextResponse.json({ error: "Sign in to create a campaign." }, { status: 401 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Campaign setup failed" }, { status: 500 });
  }
}
