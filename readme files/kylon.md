# Kylon Research Brief

Research date: 2026-07-13

## Hack scope

- Use because Kylon is part of the GTM AI Employee Challenge prize track with Nimble.
- User access scope: Kylon workspace access/credits.
- Best role in the project: GTM/operator workspace, agent team, business workflow, lead table, approvals, and internal app/dashboard surface.

## What it is

Kylon is an AI-native workspace where agents act as team members. The public site says agents join channels, understand business context, connect to tools, and execute work. The developer docs frame it as a workspace + CLI + proxy surface for agents.

Plain English: Kylon is the "AI employee / workspace" layer. It is useful if the demo has an operator workflow: leads, tasks, approvals, channels, tables, docs, follow-ups, or dashboards.

## Product surfaces that matter for this hack

- Workspace: collaboration boundary for humans, agents, channels, files, tables, workflows, and connected tools.
- Agents: workspace members that can receive work, use connected tools, and act through CLI/API.
- Channels and threads: the context where work happens.
- Tables/files/workflows/web projects: structured workspace resources agents can read/write.
- Kylon CLI gateway: connects local providers such as Codex, Claude Code, or custom runtimes to a Kylon workspace.
- Workspace CLI: lets agents/operators search channels/messages/tables/files, create/update tables and rows, manage files, trigger workflows, deploy web projects, and submit issues.
- Tools API: proxy surface for connected integrations; agents can list connections, search toolkits, authorize, inspect, execute, and proxy provider-native requests.
- Model Proxy APIs: Kylon documents OpenAI-compatible, Anthropic-compatible, Gemini-compatible, Cerebras, OpenRouter, and ElevenLabs-compatible routes. For this hack, treat that as product capability research, not permission to add outside sponsor services; prefer Nebius for model/compute work unless you explicitly approve another provider.
- App connection endpoints: intended for generated Kylon Apps that need source-agent connections.

## Recent and alpha features

Kylon is not just beta; the public homepage says it is in private alpha.

Verified current/product direction:

- Public site: agents work from team chat, share context, and turn conversations into output.
- Public site: structured data lives in the workspace through apps/workflows that agents can read, write, and act on.
- Public site: native integrations claim GitHub, Notion, Gmail, Slack, X, and 1,000+ services.
- Public site: trust controls include scoped permissions, human-in-the-loop approval, role-based access, "never trained on your data," SOC 2 Type II in progress, and GDPR compliance.
- July 13, 2026 blog: Kylon emphasizes structured agent outputs such as cards/tables, attention management, cross-workspace memory, flexible permissions, access to many models through a proxy layer, and native database apps.
- Developer docs: CLI gateway, workspace CLI, proxy tools, and model proxy APIs are the concrete build surfaces.

## What to build with it

Use Kylon as the visible business operating layer for the GTM story:

- Nimble finds live prospects/companies/signals.
- InsForge stores app state and source data.
- Kylon turns that into a GTM workspace: lead table, outreach tasks, approvals, campaign summaries, and agent work.
- BAND can show agent coordination if multiple agents are collaborating.
- Nebius can run model calls or heavier processing.

Good hack pattern:

1. Create a Kylon workspace/channel for the GTM workflow.
2. Put Nimble-sourced leads into a Kylon table or app.
3. Have a Kylon agent draft next actions or outreach.
4. Require human approval before sending or changing external systems.
5. Show the dashboard/app/table as the final operator surface.

## Risks and constraints

- Kylon is private alpha, so docs and access may be less stable than mature infra tools.
- Do not make claims beyond what you can show live in the workspace.
- The product is strongest when it is the business workflow UI, not when it is hidden behind the app.
- If the hackathon Kylon team gives a specific track rubric or QR workspace flow, follow that over generic docs.

## Sources

- Official site: https://kylon.io/
- Developer docs: https://docs.kylon.io/introduction
- Quickstart: https://docs.kylon.io/quickstart
- Core concepts: https://docs.kylon.io/concepts
- CLI overview: https://docs.kylon.io/cli/overview
- Gateway run docs: https://docs.kylon.io/cli/gateway-run
- Workspace CLI docs: https://docs.kylon.io/cli/workspace
- Tools API docs: https://docs.kylon.io/proxy/tools-api
- Model Proxy APIs: https://docs.kylon.io/proxy/model-apis
- Kylon vs Claude Tag blog: https://kylon.io/blog/kylon-vs-claude-tag
- Why we built Kylon blog: https://kylon.io/blog/why-we-built-kylon

## Raw event notes

I can't always look at Claude Code. It's a little bit too much looking at the terminal, but when you look at and you can have all of your integrations right there. Now, Quinn prepped a little bit here, so I wanna show you guys as well. Not only are we chat-based, but within Kylon, you can actually build custom apps. Think a mission control dashboard like this. This is what Quinn lives on this every single day. He built this himself, oh my god.

You can also build your own CRM, and this lives within Kylon. Either you can have it as a website, or you can see it natively within Kylon as well. If you're like me and you're filming a bunch of videos, I built my own project management dashboard, and it connects with a bunch of different integrations. Kylon is highly customizable to the team and to the workspace.

You guys are like, "But how do we get started? What do we do?" That's what I wanna show you guys here as I wrap up. As you guys are building today, I hope that you guys give Kylon not a chance just because it's $1,000, okay, but I hope you guys give it a chance because this is the new way that folks are gonna be building AI agents.

Guys, scan this QR code right here in the back. Can you guys see it? Oh, you guys have your QR codes. Scan away. When you guys are building today 
