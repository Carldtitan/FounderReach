# Nimble Research Brief

Research date: 2026-07-13

## Hack scope

- Use because it is part of the GTM AI Employee Challenge prize track with Kylon.
- User credit scope: 5,000 Nimble credits.
- Best role in the project: live web data, structured web extraction, lead/company/customer/market intelligence.

## What it is

Nimble is web data infrastructure for agents. Its current product push is Web Search Agents: agents that search, extract, and structure real-time information from websites.

Plain English: Nimble is the one web-data/search layer for this hack. Do not also add You.com or Tavily unless the sponsor list changes.

## Product surfaces that matter for this hack

- `/search`: live web search with structured, agent-ready results.
- `/extract`: fetch and parse a URL with JavaScript rendering and anti-bot handling.
- `/agent`: run pre-built or custom Web Search Agents for specific domains.
- `/crawl`: crawl a section of a site for broader extraction.
- `/map`: discover URLs and site structure before scraping.
- SERP API: structured Google Search, Google Images, Google News, Google Maps, and Google AIO results.
- Agent gallery: pre-built agents for popular websites, maintained by Nimble.
- Custom agent creation: generate custom extraction agents from a natural-language description and sample URL.
- Nimble Studio: no-code path for creating Web Search Agents.
- Agent Skills / plugin: lets AI coding assistants search, extract, map, crawl, and run/create agents.
- MCP server: exposes Nimble web-data tools to MCP-compatible clients.

## Recent features and release notes

Verified recent product updates:

- May 2026: Domain Knowledge API to recommend driver tier, detected anti-bot systems, and JavaScript-rendering requirements before running at scale.
- May 2026: Media Download API for images, video, audio, and documents, with realtime and async modes.
- May 2026: Jobs for managed recurring Web Search Agent workloads with CSV, Parquet, or JSON inputs, scheduling, retries, output files, and run monitoring.
- May 2026: Azure MCP Center integration with OAuth 2.1 / PKCE and one-click VS Code installation.
- May 2026: SERP API for structured search engine results.
- April 2026: verticalized web search skills for business research, marketing, productivity, and SEO.
- April 2026: Agents API pagination support.
- April 2026: Custom agent creation via REST API, Python/Node SDKs, and CLI.
- April 2026: Databricks Marketplace integration.
- March 2026: batch endpoints for Agents and Extract APIs.
- January 2026: Search, Extract, Agent, Map, and Crawl APIs documented as core new features.

## What to build with it

Use Nimble for the part of the demo that proves the app sees the real world:

- find target companies/leads
- enrich companies with current website, product, pricing, hiring, or funding signals
- monitor competitors
- collect ecommerce or marketplace data
- pull local business data
- build a GTM pipeline from live sources

Good hack pattern:

1. Use `/search` for discovery.
2. Use `/extract` or `/agent` for structured details from selected pages.
3. Store cleaned results in InsForge.
4. Let Kylon/BAND show the operator workflow around the data.
5. Use Jobs only if recurring monitoring is central to the product.

## Credit discipline

With 5,000 credits, do not run broad crawls blindly.

- Start with `lite` search where possible.
- Use Domain Knowledge API before scaling to difficult websites.
- Cache results in InsForge.
- Prefer specific domains and small batches during the hack.
- Use custom agents only for sources that repeat in the demo.

## Sources

- Official site: https://www.nimbleway.com/
- Docs overview: https://docs.nimbleway.com/nimble-sdk/getting-started/overview
- Search docs: https://docs.nimbleway.com/nimble-sdk/web-tools/search
- Web Search Agents docs: https://docs.nimbleway.com/nimble-sdk/agentic/agents
- Agent Skills docs: https://docs.nimbleway.com/nimble-sdk/sdks/skills
- Nimble MCP Server docs: https://docs.nimbleway.com/integrations/mcp-server/mcp-server
- Agent Builder docs: https://docs.nimbleway.com/integrations/agent-skills/web-tools-skills/nimble-agent-builder
- Changelog: https://docs.nimbleway.com/changelog/release-notes
- Nimble Skills launch post: https://www.nimbleway.com/blog/introducing-nimble-skills-web-expert-agent-builder

