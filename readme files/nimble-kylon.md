🧑‍💼 The GTM AI Employee Challenge
Hosted by GrowthMasters · Powered by Kylon & Nimble

The Challenge
Every startup needs a go-to-market engine — most can’t afford one. Your challenge: build an AI employee that does real go-to-market work.
Think of an autonomous teammate that can find prospects, research accounts, write outreach, monitor competitors, generate content, or qualify leads — an agent a founder would actually “hire.”
Build it in Kylon — an agentic workspace where your AI employee lives and works — and give it live web superpowers with the Nimble API.
This track is brought to you by GrowthMasters — the AI GTM agency with an agentic personal brand engine as its core service, plus ads and RevOps automation. 250+ LinkedIn personal brand clients with 500M+ views generated for startup founders and investors. We’ve built AI employees for lead enrichment, content creation, hiring, and outreach. Now it’s your turn.

Your Toolkit
Kylon — The Agent Workspace
Kylon is an AI-native workspace where humans and AI agents collaborate as teammates. Your agents live in channels, own tasks, use tools, and ship real work — not just chat responses.
What makes it powerful for this challenge: - Agents are workspace members — they join channels, read context, and act autonomously - Built-in tools — web search, file management, data tables, workflows, and connections to external services - Persistent memory — your agent remembers context across conversations - Workflows & automations — schedule recurring tasks, react to data changes, trigger on webhooks - Connected accounts — plug in Gmail, Slack, LinkedIn, CRMs, and more
Getting started with Kylon: 1. Go to kylon.io and create your workspace 2. You’ll get a default AI agent in your workspace immediately 3. Create a channel for your hackathon project (e.g., #sdr-agent or #competitor-watch) 4. Start telling your agent what to build — it writes code, creates workflows, and sets up automations right in the workspace 5. Your agent can store its Nimble API key as a secret and use it in scripts and workflows
Kylon credits for the hackathon: $200 worth of credits for each workspace registered through the link: https://app.kylon.io/c/q_rBaZ_kIMG8yUdV2FpiISm-rfosOZkj 



Nimble — Web Search for Agents
Nimble is the web search for your agents — delivering the most accurate and relevant answers from the live web — just API calls.
Getting started with Nimble:
Step 1: Sign up → Go to nimbleway.com - Enter your name, email, and company - You’ll get 5,000 free trial credits immediately — no credit card required
Step 2: Create an API key → Go to Account Settings → API Keys - Click “Create key”, name it (e.g., “Hackathon”), and copy the key immediately - ⚠️ Save the key right away — it won’t be shown again
Step 3: Store the key in Kylon → In your Kylon workspace, tell your agent: > “Help me store a secret called NIMBLE_API_KEY” - wait for it to give you a secret chat window to input the key.
Your agent will securely store it and can use it in all scripts and workflows.
Step 4: Start making API calls → Your agent can now use Nimble. Here’s what’s available:
The Nimble APIs
API
What it does
Best for
Credit cost
Search
Real-time web search with ranked results
Prospect research, market research, competitive intelligence
~1 credit/query
Extract
Pull clean HTML or markdown from any URL
Scraping pricing pages, job boards, company profiles
~1 credit/URL
Map
Discover all URLs on a website
Site structure analysis, finding product/blog/team pages
~1 credit/domain
Crawl
Extract data from entire websites
Large-scale collection from directories, docs, listings
~1 credit/page
Agents
Pre-built scrapers for popular sites
Structured data from Amazon, Google, Facebook, TikTok, etc.
~1 credit/run

With 5,000 credits you can make ~5,000 API calls — more than enough for a full day of building.
Need more credits during the hackathon? Email robd@nimbleway.com for a top-up.
Quick Test — Verify Your Setup Works
Tell your Kylon agent:
“Use the Nimble API to search for ‘top AI startups in San Francisco 2026’ and show me the results.”
Or for a more advanced test:
“Use the Nimble Extract API to pull the pricing page from apollo.io in markdown format and summarize the plans.”
Your agent will write a script, run it, and show you the results — all inside the workspace.

Code Examples
Install the Python SDK:
pip install nimble_python
Search the web (prospect/market research):
from nimble_python import Nimble
import os

nimble = Nimble(api_key=os.environ["NIMBLE_API_KEY"])

result = nimble.search(
    query="Series A AI startups San Francisco 2026",
    focus="general",
    search_depth="lite",
    max_results=10,
)

for r in result.results:
    print(f"{r.title} — {r.url}")
    print(f"  {r.description}\n")
Extract clean markdown from any URL (competitor analysis, lead research):
result = nimble.extract(
    url="https://www.apollo.io/pricing",
    formats=["markdown"]
)

markdown = result.to_dict()["data"]["markdown"]
print(markdown)
Discover all pages on a site (competitor mapping):
result = nimble.map(url="https://www.competitor.com")

for link in result.links:
    print(link.url)
Lead research — find info about a person:
# Search by name + location
result = nimble.search(
    query='"Jane Smith" San Francisco CTO',
    focus="general",
    search_depth="lite",
    max_results=5,
)

# Find their LinkedIn
result = nimble.search(
    query='site:linkedin.com "Jane Smith" CTO',
    focus="general",
    search_depth="lite",
    max_results=3,
)
cURL (if you prefer direct API calls):
# Search
curl -X POST 'https://sdk.nimbleway.com/v1/search' \
  -H "Authorization: Bearer $NIMBLE_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"query": "best CRM tools for startups", "focus": "general", "search_depth": "lite", "max_results": 5}'

# Extract
curl -X POST 'https://sdk.nimbleway.com/v1/extract' \
  -H "Authorization: Bearer $NIMBLE_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"url": "https://example.com", "formats": ["markdown"]}'
⚠️ Tips & Gotchas
Extract returns raw HTML by default. Always use formats=["markdown"] to get clean, readable text.
The AI Answer feature (include_answer=True) requires an enterprise account — it won’t work on the free trial. Use the standard search results instead and have your Kylon agent synthesize the answer.
For JavaScript-heavy pages (SPAs, React sites), add render=True in Extract — it costs a few more credits but handles dynamic content.
Nimble API Playground at online.nimbleway.com/playground/search lets you test queries in your browser before coding.
Pre-built agents exist for Amazon, Google, Facebook, TikTok, Pinterest, Reddit, YouTube, and more — check the Agent Gallery.

💡 Challenge Ideas
Pick one, remix one, or invent your own. The best projects will demonstrate a real GTM workflow end-to-end.
1. 🔍 The SDR / Lead Research Agent
Build an agent that finds, researches, and qualifies prospects automatically. - Use Nimble Search to find companies matching an ICP description - Use Nimble Extract to pull company websites, team pages, job postings - Use site:linkedin.com searches to find decision-makers - Have the agent score leads and draft personalized outreach - Bonus: Connect Gmail to send emails, or build a Kylon table to track the pipeline
Tested & proven: Nimble Search can find LinkedIn profiles, employer info, university affiliations, and public contact info from just a name + location. Your agent’s job is to synthesize these signals into a lead profile.
2. 📰 The LinkedIn Content Agent
Build an agent that monitors your industry and drafts LinkedIn content. - Use Nimble Search to find trending news, competitor announcements, and industry conversations - Use Nimble Extract to pull full article content from the top results - Have your Kylon agent summarize the news and draft a LinkedIn post in your voice - Set up a Kylon workflow to run this daily — wake up to fresh content drafts every morning
Why this works: We tested this live — Nimble Search finds real-time news and competitor moves (e.g., “HubSpot new features July 2026”), Extract pulls the full article, and the Kylon agent writes the post. The full pipeline: search → extract → summarize → draft → schedule.
3. 🏢 The Competitor Watch Agent
Build an agent that monitors your competitors and briefs you daily. - Use Nimble Map to discover all pages on competitor sites - Use Nimble Extract to pull pricing pages, changelogs, blog posts, job postings - Set up a Kylon workflow to run this on schedule - Agent diffs the changes and posts a summary to your channel
4. 📊 The Market Research Agent
Build an agent that turns a one-line ICP into a full market analysis. - User describes their ideal customer in plain English - Agent uses Nimble Search to find matching companies - Agent uses Extract to pull detailed company profiles and pricing - Outputs a ranked prospect list with research notes and competitive landscape
5. 🎯 Build Your Own
Have a different GTM problem? Build whatever agent a founder would pay for. The judging criteria reward usefulness and ambition equally.

Prizes 🏆
50,000 Nimble credits + $250 Amazon gift card for the winning project (from Nimble)
$300 cash prize (from Kylon) 
Judging Criteria

Criterion
What we’re looking for
Does it work?
A live demo of the agent completing a real GTM task end-to-end
Would someone hire it?
Real-world usefulness — would a founder actually pay for this?
Tool depth
Smart use of Kylon’s workspace primitives and Nimble’s live web data
Wow factor
Ambition, polish, and creativity


Need Help?
Eva Reder & Juan Campos (GrowthMasters) and Quinn (Kylon) will be walking the floor from 11 AM
Nimble credit top-ups: Email robd@nimbleway.com
Kylon docs: kylon.io
Nimble docs: docs.nimbleway.com
Nimble API Playground: online.nimbleway.com/playground/search

Event Details
Event: Bay Builders Hackathon
Date: Monday, July 13, 2026
Location: AWS Builder Loft, 525 Market St, San Francisco
Registration: luma.com/9zhqvqc7


Appendix: Kylon Use cases


App building: Mission control





App building: CRM 





