# FounderReach

**Who to contact. What to say. Then keep doing it.**

[Live app](https://4devu967.insforge.site)

FounderReach is an SDR autopilot for early founders. It finds public accounts, explains the fit, writes concise outreach, and can keep the pipeline moving on a schedule.

## What It Does

1. A founder selects stage, goal, market, audience, and tone.
2. Nimble runs recurring discovery across pain, buyer, and channel lanes, maps company sites, and extracts public contact paths.
3. BAND routes each qualified batch to three internal scouts in parallel: Pain, Buyer, and Channel.
4. Nebius ranks sourced prospects and writes evidence-grounded messages.
5. The **SDR Autopilot** creates three persistent Nimble Jobs, one per lane, with six focused search queries and a configurable lead-pool target.
6. InsForge persists every lead, deduplicates future runs, applies filters, queues outreach, records delivery, conversations, and runs the ingestion cron.

## Sponsor Build

- **InsForge** is the product backbone: password auth, server-owned session cookies, ownership checks, Postgres migrations, persistent leads, outbox, delivery history, built-in email, deployment, and an InsForge scheduler calling the protected automation endpoint.
- **Nimble** is the recurring research workforce: three scheduled Jobs run independently, their Job Run and Artifact Preview outputs are ingested idempotently, and each candidate is enriched through `Map` then `Extract` before an email is eligible. The initial mission uses parallel Google Maps agent batches.
- **BAND** is the multi-agent control room: the authenticated `Codex_connect` coordinator gives every discovered batch to Pain, Buyer, and Channel scouts concurrently. They receive focused `@mention` tasks, return room-scoped advice, and leave a replayable campaign trail. Inbound replies are also sent to the Buyer and Pain scouts for intent and objection triage.
- **Nebius** produces structured, source-grounded target selection, outreach copy, and guarded conversation-reply drafts.

## Autopilot Guardrails

- Public contact paths only. FounderReach never fabricates people or email addresses.
- Persistent deduplication prevents a business from entering the pipeline twice.
- Filters: minimum Google reviews, public-email-only mode, and excluded domains.
- Auto-send and auto-reply are off by default. Auto-send requires a reply-to inbox and obeys a 1-50 daily cap.
- InsForge handles unsubscribe suppression; skipped recipients remain visible in the outbox.
- Conversation replies involving opt-out, pricing, contracts, legal, security, medical, financial, or data-access requests are held for a human.

## Reply Handling

FounderReach exposes a signed inbound-email endpoint at `POST /api/email/inbound`. An email provider forwards `{ from, subject, text, messageId }` with the `x-founderreach-inbound` secret. The app matches the sender to a public lead, stores the conversation in InsForge, runs BAND reply triage, drafts with Nebius, and either holds the message for review or sends a bounded reply through InsForge Email.

The repository does not pretend it owns a mailbox: a real inbound provider or mailbox webhook still needs to forward replies to that endpoint.

## Run Locally

From `C:\Users\Mr. Paul\Downloads\Bay Builder Hack`:

```powershell
npm install
npm run dev
```

Required variables: InsForge URL/anon key/API key, `NIMBLE_API_KEY`, `NEBIUS_API_KEY`, and `BAND_API_KEY`.

## Verify

```powershell
npm run typecheck
npm run build
```
