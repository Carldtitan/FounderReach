# FounderReach

**Who to contact. What to say.**

[Live app](https://4devu967.insforge.site)

FounderReach is an AI outreach employee for early founders. A short onboarding flow chooses a stage-specific playbook, finds public accounts worth contacting, drafts the first message, and keeps the founder in control of every approval.

## What happens in a customer mission

1. Nimble dispatches three Google Maps searches in one asynchronous agent batch.
2. FounderReach deduplicates and retains up to 30 legitimate public businesses.
3. Nimble maps the top 12 sites and extracts public contact pages and emails where available.
4. Three BAND scouts review separate evidence lanes in a shared room and return ranked briefs.
5. Nebius scores the sourced accounts and writes short, evidence-grounded drafts.
6. InsForge stores the founder, mission, targets, drafts, approvals, events, and contact routes.

## Sponsor systems

- **InsForge**: password auth, HTTP-only session cookies, campaign ownership checks, Postgres persistence, schema migrations, and the deployed Next.js app.
- **Nimble**: `google_maps_search` agent batches for account discovery, then `Map` and `Extract` for public contact-route enrichment. It never invents an email address or private contact.
- **BAND**: a campaign room, task board, and three actual parallel internal scouts: Pain Scout, Buyer Scout, and Channel Scout. Each receives its own Nimble evidence packet and reports a ranked brief back to the coordinator.
- **Nebius**: turns Nimble evidence plus BAND scout briefs into structured target ranking and concise outreach copy.

## Safety

FounderReach only exposes public phone numbers, public emails, and public contact pages found by Nimble. `Email` opens the founder's mail client with an approved draft; the app does not silently bulk-send unsolicited messages.

## Local run

From `C:\Users\Mr. Paul\Downloads\Bay Builder Hack`:

```powershell
npm install
npm run dev
```

Required local variables are the InsForge URL/anon key/API key, `NIMBLE_API_KEY`, `NEBIUS_API_KEY`, and `BAND_API_KEY`.

## Verification

```powershell
npm run typecheck
npm run build
npm run visual:check
```
