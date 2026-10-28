# DROP ZONE

**Built for the bad day, not the perfect one.**

DROP ZONE is a mobile-first, mission-based survival and recovery guide for the moment life goes sideways. Instead of dumping a giant directory on someone in crisis, it turns immediate needs into the next achievable objective.

## EMTizzle // Field Medic Guide

EMTizzle appears when the operator needs her and otherwise sends concise field transmissions. The tone is practical, nonjudgmental and agency-first: stabilize tonight, protect infrastructure, then build an extraction plan.

## Current MVP

- Crisis-first triage
- Safe-place-tonight pathway
- Car mode
- Bike mode
- Income and essentials pathways
- Immediate-safety pathway
- Cash runway input
- Mobility and circumstance flags
- Mission completion states
- EMTizzle `CALL THE MEDIC` transmission
- Local browser persistence
- Mobile responsive UI

## Resource architecture

This prototype intentionally does **not** claim live shelter, parking, benefit, food, medical, or transportation availability. Production resource cards should be backed by verified government/nonprofit sources and display the source plus a last-verified timestamp. AI should sequence and explain verified resources, not invent them.

## Run locally

Open `index.html` in a browser, or serve this directory with any static web server.

## Publish with GitHub Pages

Repository **Settings → Pages → Deploy from a branch → `main` → `/ (root)`**.

## EMTizzle's onboard co-pilot — Cloudflare Workers AI

**Live website:** GitHub Pages still serves Drop Zone and EMTizzle's original recorded homepage greeting. On the interior pages, the robotic Co-Pilot can offer motivational conversations, music recommendations, and comfortable optional movement ideas. Its voice is the visitor's synthetic browser voice, NOT EMTizzle's recording.

**Migration status (October 2026):** The old Vercel AI Gateway backend was removed from the frontend configuration because the Vercel account could not pass verification. The new Cloudflare Worker is committed under [`cloudflare-copilot/`](cloudflare-copilot/) but **is not live until it is deployed to a Cloudflare account**. `copilot-config.js` deliberately has an empty Worker URL rather than an invented endpoint. Until it is connected, Co-Pilot transparently uses its existing offline scripted encouragement.

### Activate Cloudflare Workers AI (one-time setup)

**Simplest from a browser: Cloudflare's Git repository integration**
1. Log in or create a **Cloudflare Workers Free** account; do not upgrade to Workers Paid just to deploy this app.
2. Go to **Workers & Pages**, create a Worker, then choose **Import a repository**. Authorize GitHub if prompted and select `EMTizzleAI/drop-zone`.
3. Select the **root directory `cloudflare-copilot`** for this Worker, and name the Worker `emtizzle-dropzone-copilot` to match the checked-in `wrangler.toml`. Deployment command: `npx wrangler deploy`; no build command is needed.
4. Cloudflare deploys the Worker to your account and shows its exact **`https://...workers.dev` URL**.
5. Edit `copilot-config.js` in the repo to set `window.DROPZONE_COPILOT_ENDPOINT = 'https://YOUR-ACTUAL-WORKER-URL.workers.dev';` (use the exact deployed URL, not this example). GitHub Pages republishes the changed file automatically.
6. Test from Drop Zone: open Co-Pilot, then submit a harmless music or pep talk question. Only the label **GENERATIVE AI ACTIVE** confirms a successful model request.

**Alternative: GitHub Actions manual deployment.** Once your Cloudflare account has its real account ID, add *repository secrets* `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` with permission to edit Workers. Then run **Actions → Deploy Co-Pilot to Cloudflare Workers → Run workflow**. The action prints the deployed Worker URL in the run summary. Never put tokens, credentials, or account secrets in a public repository file or a chat.

**No third-party model key is needed:** `cloudflare-copilot/wrangler.toml` binds `env.AI` to Cloudflare's Workers AI. The model is `@cf/meta/llama-3.1-8b-instruct-fp8-fast`. Each turn sends up to 12 recent messages for context. The UI doesn't persist transcripts across browser reloads, nor does the Worker save them. Workers AI may process message contents according to Cloudflare's policies, so visitors should avoid entering sensitive data.

**Usage and safety:** Cloudflare Workers AI on the Free plan includes 10,000 free neurons/day (subject to current Cloudflare terms). Free usage stops at its quota; stay on Free to avoid paid overages. This Worker uses approximate Cloudflare-native rate limit bindings (60 requests/minute in an edge location, eight/minute per visitor IP) to discourage abuse; these are not globally strict. The Co-Pilot is for encouragement, not diagnosis, medical advice, emergency triage, or professional care. It switches back to prewritten messages when the model is unavailable.

**Unaffected components:** Drop Zone's triage/mission pages, EMTizzle's recorded audio, and the Pantry Goblin link are unchanged. The earlier Vercel prototype under `api/pep-talk.js` is unused legacy code.
