# BAND Research Brief

Research date: 2026-07-13

## Hack scope

- Use because it has a direct cash track: Best Use of BAND is listed as a $500 cash prize.
- User access scope: BAND Pro plan.
- Best role in the project: human/agent collaboration, agent coordination, auditability, and live rooms.

## What it is

BAND is interaction infrastructure for distributed AI agents. The product gives agents and humans shared rooms where agents can discover each other, talk, delegate, route work with mentions, and keep a replayable activity trail.

Plain English: BAND is useful when the demo has more than one worker/agent, or when a human needs to watch/approve work instead of trusting a black-box automation.

## Product surfaces that matter for this hack

- Shared rooms: humans and agents work in the same conversation context.
- Agent identity: agents have stable profiles/handles instead of anonymous tool calls.
- `@mention` routing: only mentioned agents process a message, which keeps context cleaner.
- Contacts/discovery: permission-controlled connections between users and agents.
- WebSocket SDK: agents receive messages/events in real time without polling.
- Platform tools: send messages, send events, add/remove participants, list participants, look up peers.
- Multi-agent observability: messages, tool calls, thoughts, errors, and task progress can land in a room-scoped log.
- Framework adapters: docs list adapters for LangGraph, Anthropic SDK, Claude Agent SDK, Pydantic AI, CrewAI, OpenAI, Codex, Gemini, Google ADK, Parlant, Letta, and custom adapters.
- Jam: a BAND-backed desktop workflow for coordinating local coding agents around tasks, rooms, work items, swimlanes, status, usage, and decisions.

## Recent and beta-like features

Verified recent platform updates:

- July 8, 2026: agent-initiated chatroom rename through `set_chat_title` or REST API.
- June 29, 2026: onboarding wizard with skill self-registration.
- June 23, 2026: attention events for human-in-the-loop questions, assumptions, failures, and review requests; profile handles for display and mention flows.
- June 16, 2026: markdown tables in chat, handle-based addressing, and mention kinds.
- June 12, 2026: remote-agent interrupt/stop/play controls plus live working indicator.
- June 9, 2026: passwordless auth and Pro-tier chat export.

Verified experimental item:

- The Codex adapter supports a WebSocket transport mode marked experimental. Default stdio mode is the safer path.

## What to build with it

Use BAND if the demo has a visible multi-agent workflow:

- a research/data agent using Nimble
- a builder/backend agent using InsForge
- a GTM/operator agent connected through Kylon
- a human reviewer who approves risky actions

The best BAND demo is not "chat with an agent." It is "watch agents coordinate in a room, route work, surface approvals, and leave an audit trail."

Good hack pattern:

1. Create a BAND room for the project workflow.
2. Register two or three agents with distinct roles.
3. Route tasks with mentions.
4. Show attention events, tool call events, progress, and final output in the shared room.
5. Export or replay the room as proof of coordination.

## Risks and constraints

- Jam Desktop docs list macOS and Linux as prerequisites and explicitly say Windows is not supported yet. Since this workspace is on Windows, avoid relying on Jam Desktop unless you have a supported machine/WSL path that the BAND team confirms.
- BAND is only worth the integration if agent collaboration is visible in the product. If everything is one backend job, BAND becomes forced prize-bait.
- Pro chat export is useful for judging evidence, but it is not the core product by itself.

## Sources

- Official site: https://www.band.ai/
- BAND docs / Jam: https://docs.band.ai/jam
- Hacker guide: https://www.band.ai/hacker-guide
- Platform changelog: https://docs.band.ai/changelog/changelog/platform
- Codex adapter docs: https://docs.band.ai/integrations/sdks/tutorials/codex
- MCP tools docs: https://docs.band.ai/integrations/mcp/reference

