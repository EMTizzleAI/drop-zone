/* DROP ZONE // FIELD HOSPITAL SITE TRAFFIC
   Counts anonymous browsers and pageviews, not real medical patients.
   Never collects names, health details, chat messages, IP addresses or URL query parameters. */
(() => {
  'use strict';
  const count = document.getElementById('dzPatientCount');
  const badge = document.getElementById('dzPatientTicker');
  if (!count || !badge) return;
  const endpoint = 'https://ysthtzcjgtakuwvodbff.supabase.co/functions/v1/dropzone-traffic';
  const localKey = 'dropzone-anonymous-visitor-v1';
  // Never contact telemetry from local previews, localhost, forks or unrelated domains.
  if (location.hostname !== 'emtizzleai.github.io') {
    count.textContent = '—';
    badge.title = 'Visitor tracking is active on the published Drop Zone site only.';
    return;
  }
  function browserKey() {
    try {
      let key = localStorage.getItem(localKey);
      if (key && /^[a-f0-9]{32}$/.test(key)) return key;
      if (!crypto?.getRandomValues) return null;
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      key = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
      localStorage.setItem(localKey, key);
      return key;
    } catch (_) { return null; }
  }
  function safeReferrer() {
    try {
      if (!document.referrer) return '';
      const host = new URL(document.referrer).hostname.toLowerCase();
      return host === location.hostname ? '' : host.slice(0, 120);
    } catch (_) { return ''; }
  }
  function render(data) {
    if (!data || typeof data.patientCheckins !== 'number') throw Error('Invalid count');
    count.textContent = Intl.NumberFormat('en-US').format(Math.max(0,data.patientCheckins));
    badge.title = `Since Nov 7, 2026: ${data.patientCheckins} approximate unique browsers and ${data.pageviews || 0} page views. These are visitors, not actual medical patients.`;
  }
  async function refresh() {
    const key = browserKey();
    const payload = key ? JSON.stringify({ browserKey: key, path: location.pathname, referrerDomain: safeReferrer() }) : null;
    const opts = payload ? { method:'POST', headers:{'Content-Type':'application/json'}, body:payload, cache:'no-store' } : { cache:'no-store' };
    const response = await fetch(endpoint, opts);
    if (!response.ok) throw Error('Could not load traffic');
    render(await response.json());
  }
  refresh().catch(() => {
    count.textContent = '—';
    badge.title = 'Visitor count is temporarily unavailable. No number is shown until it is verified.';
  });
})();
