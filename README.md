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

## EMTizzle's onboard co-pilot — multi-turn generative beta

**Home page:** EMTizzle's original human voice recording is unchanged. **Inside Drop Zone:** the floating robot Co-Pilot is a separate AI assistant with a synthetic browser voice. It provides encouragement and can recommend real music and comfortable, optional movement ideas. It does not provide diagnoses, treatment or emergency services.

**Live architecture:** GitHub Pages hosts the browser UI. Its `index.html` points to `https://pantry-goblin.vercel.app/api/dropzone-copilot`, a new serverless function in the separate `EMTizzleAI/pantry-goblin` repository. The function calls Vercel AI Gateway with the explicitly free **`nvidia/nemotron-3.5-lightning-free`** chat model and no paid fallback. Vercel's OIDC token or a server-side Gateway key is required; no secret is embedded in public frontend files. A Vercel deployment succeeding does not guarantee live inference is authorized; check actual POST responses.

**User experience:** multi-turn chat with a rolling 12-message context window, unlimited *sequential* conversation turns while the tab stays open, optional text-to-speech, music and gentle movement chips, and an offline prewritten fallback if inference is unavailable. It does not save transcripts or remember people between browser visits. The visible "GENERATIVE AI ACTIVE" indicator appears only after an actual model-generated response. Clicking CLEAR CHAT forgets current context. Never interpret "never-ending" as guaranteed uptime or unlimited paid requests.

**Costs and abuse:** Gateway's free models and promotions can change. The API hardcodes the verified free model ID, has no paid fallback and includes a temporary per-instance 35-requests/hour cap. Before expanding access, add a durable gateway/user budget, a durable rate limiter and monitoring so a publicly accessible endpoint can't create uncontrolled spend or resource exhaustion. The old `drop-zone/api/pep-talk.js` is a disabled prototype and is NOT the connected runtime backend.

**Privacy and safety:** Public visitors should avoid entering sensitive information. Messages and a rolling subset of conversation history are sent to NVIDIA via Vercel AI Gateway, whose provider may retain submitted content. No conversation is stored by Drop Zone. The Co-Pilot must not give medical advice or replace appropriate local emergency services; in U.S. mental health emergencies the safety message mentions 988.

**Manual smoke test:** Check `/api/dropzone-copilot` returns JSON health information, then send a harmless POST with `{ "message": "Suggest an uplifting song and a gentle activity.", "history": [] }` from the GitHub Pages origin, and confirm `mode:"live"` before advertising generative responses. If it returns 503, confirm Vercel OIDC authentication, AI Gateway account eligibility, and model access. Test the original recording, the Co-Pilot on mobile, and the Pantry Goblin link.
