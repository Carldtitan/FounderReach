import type { FounderProfile, ResearchLane, Stage } from "./types";

export interface Playbook {
  name: string;
  targetType: string;
  draftStyle: string;
}

export interface ResearchLanePlan {
  id: ResearchLane;
  purpose: string;
  queries: string[];
}

export const playbooks: Record<Stage, Playbook> = {
  Idea: {
    name: "Problem interviews",
    targetType: "Interview",
    draftStyle: "curious, non-salesy, asks for 10 minutes"
  },
  Beta: {
    name: "Beta invites",
    targetType: "Beta",
    draftStyle: "founder-led, feedback-first, no hard sell"
  },
  "First customers": {
    name: "Buying signals",
    targetType: "Customer",
    draftStyle: "concise, mentions one public signal, clear ask"
  },
  Growth: {
    name: "Growth channels",
    targetType: "Partner",
    draftStyle: "partnership-focused, specific fit, concrete offer"
  }
};

export function buildResearchLanes(profile: FounderProfile): ResearchLanePlan[] {
  const pain = profile.description || profile.startup;
  const industry = profile.startup || profile.audience;
  const region = profile.region || profile.market;

  const byStage: Record<Stage, Record<ResearchLane, string[]>> = {
    Idea: {
      "Pain signals": [
        `"${pain}" "how do I"`,
        `"${pain}" "looking for a tool"`,
        `site:reddit.com "${pain}"`
      ],
      "Buyer signals": [
        `"${profile.audience}" "${pain}"`,
        `"${industry}" "manual process"`,
        `"${pain}" forum community`
      ],
      "Channel targets": [
        `"${profile.audience}" community ${region}`,
        `"${industry}" meetup ${region}`,
        `"${industry}" newsletter`
      ]
    },
    Beta: {
      "Pain signals": [
        `"${pain}" "tool recommendations"`,
        `"${pain}" alternative`,
        `"${profile.audience}" "spreadsheet" "${pain}"`
      ],
      "Buyer signals": [
        `"${profile.audience}" "${pain}" workflow`,
        `"${industry}" "manual process"`,
        `"${pain}" "early access"`
      ],
      "Channel targets": [
        `"${profile.audience}" community`,
        `"${industry}" beta testers`,
        `"${industry}" founder community ${region}`
      ]
    },
    "First customers": {
      "Pain signals": [
        `"${pain}" "hiring"`,
        `"${pain}" "new locations"`,
        `"${profile.audience}" "${pain}"`
      ],
      "Buyer signals": [
        `"${industry}" hiring ${region}`,
        `"${industry}" "new location" ${region}`,
        `"${profile.audience}" "pricing" "${pain}"`
      ],
      "Channel targets": [
        `"${industry}" association ${region}`,
        `"${industry}" events ${region}`,
        `"${industry}" partner program`
      ]
    },
    Growth: {
      "Pain signals": [
        `"${industry}" customer stories`,
        `"${industry}" audience pain points`,
        `"${industry}" trends 2026`
      ],
      "Buyer signals": [
        `"${industry}" integrations`,
        `"${industry}" partner program`,
        `"${industry}" sponsors`
      ],
      "Channel targets": [
        `"${industry}" newsletter sponsors`,
        `"${industry}" podcast sponsors`,
        `"${profile.audience}" conference speakers`
      ]
    }
  };

  return (["Pain signals", "Buyer signals", "Channel targets"] as ResearchLane[]).map((id) => ({
    id,
    purpose:
      id === "Pain signals"
        ? "Find public evidence that the problem is real."
        : id === "Buyer signals"
          ? "Find public evidence of urgency or active change."
          : "Find communities and repeatable ways to reach the audience.",
    queries: byStage[profile.stage][id]
  }));
}
