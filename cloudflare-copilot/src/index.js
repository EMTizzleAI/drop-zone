// EMTizzle AI // Drop Zone Co-Pilot — Cloudflare Workers AI
// Serves chat via Cloudflare's native AI binding. No Vercel, no provider key.
// Never writes conversation transcripts to storage or logs their content.
const ORIGIN = 'https://emtizzleai.github.io';
const MODEL = '@cf/meta/llama-3.1-8b-instruct-fp8-fast';

const SYSTEM = `You are the Onboard Co-Pilot of Drop Zone, created by EMTizzle AI. You are an AI system separate from the human EMTizzle and her recorded voice. Speak directly and warmly with witty, grounded, mildly cyberpunk personality. Your purpose is motivational conversation, encouragement, a small achievable next step, and recognition of real victories. Refer to users as operator occasionally but avoid repetitive gimmicks.
Converse naturally: answer details from the latest message, remember recent conversation provided, and ask one relevant follow-up when helpful. Be supportive without empty promises, shame, or claiming to know private facts. Aim for 55-110 words, vary length naturally.
Music: if asked, suggest specific real songs or artists to fit the user's desired mood and ask their preferences. Never claim to play music, fabricate links, or quote lyrics.
Movement: if asked for exercise, offer optional, gentle, accessible movement for enjoyment (a little dancing, stretching, or short walk only if comfortable). Don't prescribe exercise plans, promise health outcomes, or pressure users to move through pain, injury, dizziness, or illness. Mention stopping if uncomfortable. Do not make physical-ability assumptions.
Boundaries: This is motivational support, NOT a medical professional, therapist, emergency service, legal or financial advisor. Never diagnose, give medication dosages or treatment instructions. For immediate threats or self-harm, direct people to trusted humans, appropriate local emergency help, and 988 for U.S. crisis support. Don't invent available food, shelter, jobs, phone numbers, or other live resource facts. Do not solicit sensitive information. Do not pretend to be the human EMTizzle or promise unlimited access.`;

const CRISIS = /\b(?:suicid\w*|kill myself|end my life|self[ -]?harm|hurt myself|want to die|take my life|overdos\w*|not safe right now|about to kill myself)\b/i;
const HEALTH = /\b(?:diagnos\w*|medication dosage|medicine dose|prescription dose|what (?:drug|medication) should i take|chest pain|can't breathe|medical advice|treat my illness)\b/i;
const CRISIS_REPLY = "Operator, I'm glad you said something. This needs human support, not just a pep talk. If you're in immediate danger, contact local emergency services (911 in the U.S.). In the U.S. you can call or text 988 for crisis support. If you can, reach someone you trust or get to a staffed, safer place. You deserve real help.";
const HEALTH_REPLY = "Your health deserves a qualified professional, operator. I'm here for encouragement, not diagnosis, treatment, or medication guidance. If symptoms are serious or danger is immediate, please contact local emergency services. We can still talk about a manageable next step.";

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers }
  });
}

function corsHeaders(request) {
  const origin = request.headers.get('origin');
  return origin === ORIGIN
    ? { 'Access-Control-Allow-Origin': ORIGIN,
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        Vary: 'Origin' }
    : {};
}

function extractReply(response) {
  if (typeof response?.response === 'string') return response.response;
  const choice = response?.choices?.[0]?.message?.content;
  if (typeof choice === 'string') return choice;
  if (Array.isArray(choice)) return choice.filter(c => c?.type === 'text').map(c => c.text).join('\n');
  return '';
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;
    const origin = request.headers.get('origin');
    const cors = corsHeaders(request);

    if (method === 'OPTIONS') {
      if (origin !== ORIGIN) return json({ code: 'ORIGIN_REJECTED', error: 'Origin not allowed.' }, 403);
      return new Response(null, { status: 204, headers: { ...cors, 'cache-control': 'no-store' } });
    }
    if (origin && origin !== ORIGIN) return json({ code: 'ORIGIN_REJECTED', error: 'Origin not allowed.' }, 403);
    if (!['/', '/chat', '/health'].includes(url.pathname))
      return json({ code: 'NOT_FOUND', error: 'Unknown endpoint.' }, 404, cors);

    if (method === 'GET') {
      return json({
        service: 'Drop Zone Co-Pilot', provider: 'Cloudflare Workers AI',
        configured: Boolean(env.AI), model: MODEL,
        connection: env.AI ? 'ai-binding-present-unverified' : 'ai-binding-missing',
        note: 'Health checks do not perform inference. Send a POST to verify generation.'
      }, 200, cors);
    }

    if (method !== 'POST' || url.pathname === '/health')
      return json({ code: 'METHOD_NOT_ALLOWED', error: 'POST /chat required.' }, 405, cors);
    // A browser Origin header is not authentication. Limits and free quota are defense in depth.
    if (origin !== ORIGIN)
      return json({ code: 'ORIGIN_REQUIRED', error: 'Open this chat through Drop Zone.' }, 403, cors);
    if (!env.AI || !env.COPILOT_GLOBAL_RATE || !env.COPILOT_VISITOR_RATE)
      return json({ code: 'CLOUDFLARE_SETUP_INCOMPLETE', error: 'AI or rate limiting binding is missing from the deployed Worker.' }, 503, cors);

    const length = Number(request.headers.get('content-length') || 0);
    if (length > 12000)
      return json({ code: 'REQUEST_TOO_LARGE', error: 'This message is too large.' }, 413, cors);

    let body;
    try { body = await request.json(); } catch {
      return json({ code: 'BAD_JSON', error: 'Please send a valid message.' }, 400, cors);
    }
    if (!body || typeof body !== 'object' || Array.isArray(body))
      return json({ code: 'BAD_BODY', error: 'Invalid chat message.' }, 400, cors);
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!message || message.length > 700)
      return json({ code: 'BAD_MESSAGE', error: 'Messages must be 1–700 characters.' }, 400, cors);

    if (CRISIS.test(message)) return json({ reply: CRISIS_REPLY, mode: 'safety' }, 200, cors);
    if (HEALTH.test(message)) return json({ reply: HEALTH_REPLY, mode: 'safety' }, 200, cors);

    // Cloudflare rate limit bindings count approximately per edge location.
    // The daily Workers AI free-tier quota is the ultimate usage ceiling on Free.
    try {
      const global = await env.COPILOT_GLOBAL_RATE.limit({ key: 'dropzone-co-pilot' });
      if (!global.success)
        return json({ code: 'GLOBAL_RATE_LIMIT', error: 'Too many operators are chatting at once. Try again later.' }, 429, cors);
      const visitorKey = request.headers.get('cf-connecting-ip') || 'unknown';
      const visitor = await env.COPILOT_VISITOR_RATE.limit({ key: visitorKey });
      if (!visitor.success)
        return json({ code: 'VISITOR_RATE_LIMIT', error: 'Co-Pilot needs a short cooldown. Try again in a minute.' }, 429, cors);
    } catch {
      return json({ code: 'RATE_LIMIT_UNAVAILABLE', error: 'Chat controls are temporarily unavailable; offline support still works.' }, 503, cors);
    }

    const previous = Array.isArray(body.history) ? body.history.slice(-12) : [];
    const turns = previous.filter(x => x && ['user', 'assistant'].includes(x.role) && typeof x.content === 'string')
      .map(x => ({ role: x.role, content: x.content.slice(0, 700) }));
    try {
      const output = await env.AI.run(MODEL, {
        messages: [{ role: 'system', content: SYSTEM }, ...turns, { role: 'user', content: message }],
        max_tokens: 320,
        temperature: 0.78
      });
      const generated = extractReply(output).trim();
      if (!generated) return json({ code: 'NO_MODEL_REPLY', error: 'Model returned an empty response. Offline support is available.' }, 503, cors);
      return json({ reply: generated.slice(0, 2400), mode: 'live', model: MODEL, provider: 'Cloudflare Workers AI' }, 200, cors);
    } catch {
      // Do not leak API internals or user's text into public error responses.
      return json({ code: 'CLOUDFLARE_AI_UNAVAILABLE', error: 'Cloudflare Workers AI is temporarily unavailable or the free daily allowance has been reached.' }, 503, cors);
    }
  }
};
