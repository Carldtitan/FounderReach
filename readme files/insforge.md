# InsForge Research Brief

Research date: 2026-07-13

## Hack scope

- Use because it has the most direct cash track in the hackathon: Best Use of InsForge has three placements.
- User credit scope: $25.
- Best role in the project: core app/backend infrastructure.

## What it is

InsForge is an open-source backend platform aimed at agentic coding workflows. Its public repo describes it as a backend for coding agents with database, auth, storage, compute, hosting, and AI gateway capabilities.

The important point: this is not just an LLM wrapper. It is the place to put the actual app backend if the demo needs users, tables, files, auth, server functions, deployment, or persisted state.

## Product surfaces that matter for this hack

- Database: CRUD, schema design, RLS policies, triggers, raw SQL, imports/exports.
- Auth: sign-up/sign-in flows, OAuth, sessions, email verification, PKCE support.
- Storage: file uploads, downloads, buckets, bucket metadata.
- Edge/serverless functions: deploy, invoke, inspect, and view logs.
- Realtime: WebSocket subscriptions and event publishing.
- Deployment/hosting: frontend app deployment through InsForge hosting.
- Payments: Stripe Checkout/Billing Portal and Razorpay Orders/Subscriptions are documented in the InsForge skill registry, though this is probably not needed unless the demo has a billing loop.
- MCP server: exposes InsForge backend operations as tools an MCP-compatible coding agent can call.
- CLI + Skills: cloud-oriented path for agents to manage projects from the terminal.
- Templates: Next.js and React starters plus app templates for chatbot, CRM, and e-commerce.

## Recent features and release notes

I did not find a current official source calling these "beta" features. These are verified recent releases/features:

- v2.2.6, released July 5, 2026: added a What's New sidebar entry for cloud-hosting mode.
- v2.2.5, released July 4, 2026: added JWKS-verifiable RS256 login tokens with HS256 fallback; also shipped dashboard fixes and backend advisor/telemetry tweaks.
- v2.2.4, released June 29, 2026: added advisor scan, OSS database advisor work, Apify data source integration, storage RLS upload fix, and Deno pre-deploy checks for functions.
- JS SDK v1.1.6 includes realtime module work, refresh token support, auth PKCE, AI chat endpoint plugins, embeddings, and function tool calling.

## What to build with it

Use InsForge as the source of truth for the product:

- app users and sessions
- lead/customer/project tables
- uploaded files or generated reports
- server-side orchestration endpoints
- frontend deployment if the app needs a public URL

Good hack pattern:

1. Put the user-facing app on InsForge auth + database.
2. Store Nimble/Kylon/BAND outputs in InsForge tables.
3. Use edge functions for anything that needs server-side keys or background actions.
4. Show judges the live database/state changing during the demo.

## Risks and constraints

- Do not spend time on every InsForge feature. Use auth + database + one function/deployment path.
- The AI gateway can be useful, but do not route through extra sponsor products outside the approved five-sponsor list unless explicitly approved.
- Payments are probably not worth implementing unless the product itself is about billing or monetization.

## Sources

- Official repo: https://github.com/InsForge/insforge
- Official releases: https://github.com/InsForge/InsForge/releases
- InsForge SDK releases: https://github.com/InsForge/InsForge-sdk-js/releases
- InsForge Skills registry: https://github.com/InsForge/insforge-skills
- InsForge CLI repo: https://github.com/InsForge/CLI
- InsForge MCP repo: https://github.com/InsForge/insforge-mcp
- InsForge templates: https://github.com/InsForge/insforge-templates

