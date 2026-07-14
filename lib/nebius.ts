import OpenAI from "openai";
import type { Draft, FounderProfile, Mission, SourceEvidence, Target } from "./types";
import type { BandScoutBrief } from "./band";
import type { AccountProspect } from "./nimble-accounts";
import { newId, now } from "./store";
import { playbooks } from "./playbooks";

interface GeneratedTarget {
  name: string;
  company: string;
  role: string;
  score: "High" | "Medium" | "Low";
  rationale: string;
  sourceUrls: string[];
  subject: string;
  body: string;
}

interface GeneratedPayload {
  targets: GeneratedTarget[];
}

interface GeneratedReply {
  body: string;
  needsHuman: boolean;
  reason: string;
}

const client = process.env.NEBIUS_API_KEY
  ? new OpenAI({
      apiKey: process.env.NEBIUS_API_KEY,
      baseURL: "https://api.tokenfactory.nebius.com/v1/"
    })
  : null;

export async function generateTargetsAndDrafts(
  founder: FounderProfile,
  mission: Mission,
  sources: SourceEvidence[],
  scoutBriefs: BandScoutBrief[] = [],
  accounts: AccountProspect[] = []
): Promise<{ targets: Target[]; drafts: Draft[] }> {
  const generated = await callNebius(founder, sources, scoutBriefs, accounts).catch(() => fallbackGeneration(founder, sources));
  if (accounts.length) return materializeAccountTargets(founder, mission, accounts, generated.targets);
  const limited = generated.targets.slice(0, 10);

  const targets: Target[] = limited.map((item, index) => {
    const matched = sources.filter((source) => item.sourceUrls?.includes(source.url));
    const source = matched[0] || sources[index % sources.length];
    const evidence = matched.length ? matched.slice(0, 3) : [source, ...sources.filter((candidate) => candidate.domain === source.domain && candidate.url !== source.url).slice(0, 2)];
    return {
      id: newId("target"),
      missionId: mission.id,
      type: playbooks[founder.stage].targetType,
      name: item.name,
      company: item.company,
      role: item.role,
      url: source.url,
      sourceDomain: source.domain,
      score: item.score,
      rationale: trimLine(item.rationale),
      evidence,
      createdAt: now()
    };
  });

  const drafts: Draft[] = targets.map((target, index) => {
    const item = limited[index];
    return {
      id: newId("draft"),
      missionId: mission.id,
      targetId: target.id,
      channel: founder.stage === "Idea" || founder.stage === "Beta" ? "DM" : "Email",
      subject: trimSubject(item.subject || `Quick question for ${target.company}`),
      body: trimDraft(item.body, founder.stage === "Idea" ? 55 : founder.stage === "Beta" ? 80 : 120),
      status: "draft",
      createdAt: now(),
      updatedAt: now()
    };
  });

  return { targets, drafts };
}

export async function generateConversationReply(input: {
  founder: FounderProfile;
  company: string;
  subject: string;
  messages: Array<{ direction: "inbound" | "outbound"; body: string }>;
}): Promise<GeneratedReply> {
  const fallback: GeneratedReply = {
    body: `Thanks for getting back to me. I appreciate the context. Would you be open to a short conversation so I can understand your workflow better?`,
    needsHuman: false,
    reason: "General reply"
  };
  if (!client) return fallback;
  try {
    const response = await client.chat.completions.create({
      model: process.env.NEBIUS_MODEL || "deepseek-ai/DeepSeek-R1-0528",
      response_format: { type: "json_object" },
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: "Return strict JSON only. Draft a concise founder reply under 90 words. Mark needsHuman true for pricing, contracts, legal, security, medical, financial, hiring, data access, a complaint, an opt-out, or any promise. Never invent product capabilities, deadlines, customers, or commitments."
        },
        {
          role: "user",
          content: JSON.stringify({
            startup: input.founder.startup,
            description: input.founder.description,
            audience: input.founder.audience,
            company: input.company,
            subject: input.subject,
            history: input.messages.slice(-8).map((message) => ({ direction: message.direction, body: message.body.slice(0, 1200) })),
            requiredShape: { body: "reply", needsHuman: false, reason: "short reason" }
          })
        }
      ]
    });
    const parsed = JSON.parse(response.choices[0]?.message?.content || "{}") as Partial<GeneratedReply>;
    if (!parsed.body || typeof parsed.needsHuman !== "boolean") return fallback;
    return {
      body: trimDraft(parsed.body, 90),
      needsHuman: parsed.needsHuman,
      reason: trimLine(parsed.reason || "Conversation reply")
    };
  } catch {
    return fallback;
  }
}

function materializeAccountTargets(
  founder: FounderProfile,
  mission: Mission,
  accounts: AccountProspect[],
  generated: GeneratedTarget[]
): { targets: Target[]; drafts: Draft[] } {
  const targets = accounts.slice(0, 30).map((account) => {
    const generatedMatch = generated.find((item) => item.company.toLowerCase() === account.company.toLowerCase());
    const source = account.evidence[0];
    return {
      id: newId("target"),
      missionId: mission.id,
      type: playbooks[founder.stage].targetType,
      name: account.company,
      company: account.company,
      role: account.role,
      url: source.url,
      sourceDomain: source.domain,
      score: account.score,
      rationale: trimLine(generatedMatch?.rationale || account.rationale),
      contact: account.contact,
      evidence: account.evidence,
      createdAt: now()
    } satisfies Target;
  });

  const drafts = targets.map((target) => {
    const generatedMatch = generated.find((item) => item.company.toLowerCase() === target.company.toLowerCase());
    const fallback = accountDraft(founder, target.company, target.contact?.address);
    return {
      id: newId("draft"),
      missionId: mission.id,
      targetId: target.id,
      channel: target.contact?.email ? "Email" : target.contact?.phone ? "Call" : "Email",
      subject: trimSubject(generatedMatch?.subject || fallback.subject),
      body: trimDraft(generatedMatch?.body || fallback.body, founder.stage === "Idea" ? 55 : founder.stage === "Beta" ? 80 : 120),
      status: "draft",
      createdAt: now(),
      updatedAt: now()
    } satisfies Draft;
  });
  return { targets, drafts };
}

async function callNebius(
  founder: FounderProfile,
  sources: SourceEvidence[],
  scoutBriefs: BandScoutBrief[],
  accounts: AccountProspect[] = []
): Promise<GeneratedPayload> {
  if (!client) return fallbackGeneration(founder, sources);

  const response = await client.chat.completions.create({
    model: process.env.NEBIUS_MODEL || "deepseek-ai/DeepSeek-R1-0528",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Return strict JSON only. Create concise, source-grounded founder outreach targets. Do not invent people, companies, private emails, or private LinkedIn access. Every target must copy one or more exact source URLs supplied by the user. If accounts are supplied, write one draft for each supplied company only: preserve the exact company name, do not omit accounts, and do not invent a contact person."
      },
      {
        role: "user",
        content: JSON.stringify({
          founder,
          playbook: playbooks[founder.stage],
          sources: sources.map((source) => ({
            ...source,
            snippet: source.snippet.slice(0, 700)
          })),
          scoutBriefs: scoutBriefs.map((brief) => ({
            agent: brief.agent,
            lane: brief.lane,
            recommendation: brief.content
          })),
          accounts: accounts.map((account) => ({
            company: account.company,
            role: account.role,
            score: account.score,
            publicContact: account.contact,
            sourceUrls: account.evidence.map((evidence) => evidence.url)
          })),
          requiredShape: {
            targets: [
              {
                name: "person or segment name",
                company: "company/community/source",
                role: "likely role",
                score: "High|Medium|Low",
                rationale: "one short reason grounded in source",
                sourceUrls: ["exact URLs copied from the supplied sources"],
                subject: "short subject",
                body: "short outreach draft"
              }
            ]
          }
        })
      }
    ],
    temperature: 0.35
  });

  const content = response.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(content) as GeneratedPayload;
  if (!Array.isArray(parsed.targets) || !parsed.targets.length) {
    return fallbackGeneration(founder, sources);
  }
  return parsed;
}

function fallbackGeneration(founder: FounderProfile, sources: SourceEvidence[]): GeneratedPayload {
  const base = sources.length ? sources : [];
  const targets = Array.from({ length: Math.max(8, base.length) }).map((_, index) => {
    const source = base[index % Math.max(1, base.length)] || {
      title: founder.audience,
      domain: "public web",
      snippet: founder.description
    };
    const company = source.domain || source.title || founder.audience;
    const stageCopy = stageCopyFor(founder.stage);
    return {
      name: source.title?.split("|")[0]?.slice(0, 42) || `${founder.audience} lead ${index + 1}`,
      company,
      role: stageCopy.role,
      score: index < 3 ? "High" : index < 7 ? "Medium" : "Low",
      rationale: `${stageCopy.reason} Source: ${source.snippet}`.slice(0, 170),
      sourceUrls: source.url ? [source.url] : [],
      subject: stageCopy.subject,
      body: stageCopy.body(founder, company)
    } satisfies GeneratedTarget;
  });
  return { targets };
}

function accountDraft(founder: FounderProfile, company: string, address?: string) {
  const location = address ? ` in ${address}` : "";
  if (founder.stage === "Idea") {
    return {
      subject: `Quick question for ${company}`,
      body: `I am researching ${founder.description} for ${founder.audience}. ${company}${location} looked close to the problem. Could I ask two short questions this week?`
    };
  }
  if (founder.stage === "Beta") {
    return {
      subject: `Early access for ${company}`,
      body: `I am testing ${founder.startup} for ${founder.audience}. ${company}${location} looks like a relevant early team. Would you try it and give blunt feedback?`
    };
  }
  return {
    subject: `Quick idea for ${company}`,
    body: `I built ${founder.startup} for ${founder.audience}. I found ${company}${location} through a public listing and thought the workflow may be relevant. Open to a short conversation?`
  };
}

function stageCopyFor(stage: FounderProfile["stage"]) {
  switch (stage) {
    case "Idea":
      return {
        role: "Potential interviewee",
        reason: "They appear close to the problem and are useful for discovery.",
        subject: "Quick question",
        body: (founder: FounderProfile, company: string) =>
          `Saw your work around ${company}. I am exploring ${founder.description}. Could I ask you 2 questions this week?`
      };
    case "Beta":
      return {
        role: "Beta tester",
        reason: "They match the audience and may be using manual or imperfect workflows.",
        subject: "Early access?",
        body: (founder: FounderProfile, company: string) =>
          `I am testing ${founder.startup || "a new tool"} for ${founder.audience}. ${company} looked relevant. Want early access in exchange for blunt feedback?`
      };
    case "First customers":
      return {
        role: "Likely buyer",
        reason: "The source suggests a timely buying signal for this audience.",
        subject: "Worth comparing notes?",
        body: (founder: FounderProfile, company: string) =>
          `Noticed ${company} may be dealing with ${founder.description}. Founder of ${founder.startup || "FounderReach"} here. Worth a quick chat this week?`
      };
    default:
      return {
        role: "Partner",
        reason: "They look like a possible repeatable channel or audience owner.",
        subject: "Partner idea",
        body: (founder: FounderProfile, company: string) =>
          `${company} reaches the kind of people ${founder.startup || "we"} helps. Open to a simple collaboration idea for ${founder.audience}?`
      };
  }
}

function trimLine(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 180);
}

function trimSubject(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 70);
}

function trimDraft(value: string, maxWords: number) {
  const words = value.replace(/\s+/g, " ").trim().split(" ");
  return words.slice(0, maxWords).join(" ");
}
