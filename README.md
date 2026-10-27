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

## EMTizzle's onboard co-pilot — new beta

**The existing personal homepage voice recording is unchanged.** The co-pilot deliberately uses a separate, synthetic device voice. On the other screens, click the floating robot co-pilot button to open a small chat panel. The co-pilot is a separate assistant, not EMTizzle herself. A visitor can type a request, use prompt chips, receive an uplifting response, and optionally hear it through **their device's built-in text-to-speech voice** (not a synthesized clone of EMTizzle).

**Two distinct states:**
- **OFFLINE ENCOURAGEMENT MODE:** prewritten, varied encouragement; runs on GitHub Pages without a server or user account. This is **not** generative AI. If no authenticated live endpoint exists, the interface clearly identifies offline mode.
- **GENERATIVE AI ACTIVE:** optional backend `api/pep-talk.js`, deployed separately on Vercel and protected by server-side AI Gateway authentication. Its prompt prohibits medical diagnoses, medication suggestions, pretending to be a therapist, or invented live resources. Critical safety requests receive a fixed response directing the user toward human help.

**Enable live generation only when spending and abuse controls are in place.**
1. Deploy this repo as a separate Vercel project (the main public site can stay on GitHub Pages). Configure Vercel AI Gateway and set an explicit low spending cap in the account dashboard. The endpoint is intentionally **off by default**.
2. Set `DROPZONE_AI_ENABLED=true` in the Vercel server environment, and configure secure AI Gateway authentication with Vercel OIDC or `AI_GATEWAY_API_KEY`. Never put credentials into client-side JavaScript, Git, or the HTML.
3. Set `data-endpoint="https://YOUR-VERCEL-DEPLOYMENT.vercel.app/api/pep-talk"` on `#dzCoachPanel` in `index.html` after confirming the deployment's actual URL.
4. Test from the published GitHub Pages origin. Keep the production endpoint disabled until you implement a durable per-user request quota/rate limiter; the serverless in-memory counter is only a best-effort backup.
5. Verify the UI labels "GENERATIVE AI ACTIVE" only on a real model response. With missing configuration, it automatically reverts to an honest offline motivational response.

**Privacy:** The site does not persist chat transcripts. When live AI is enabled, submitted messages are sent to the provider through the configured server backend. Visitors should avoid sensitive personal data. This is motivational support, not a medical or emergency service.
