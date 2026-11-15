/* DROP ZONE // ONBOARD RADIO
   Original instrumental dark synth loop, generated with Web Audio.
   No audio download, external streaming, autoplay-on-first-visit or tracking.
   Soundtrack preferences carry across Drop Zone pages. A browser may require
   another tap after navigation because autoplay permission is per document. */
(() => {
  'use strict';
  if (document.getElementById('dzSoundtrackDock')) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  const KEY = 'dz-soundtrack-v1';
  const BEAT = 60 / 118;
  const STEP = BEAT / 2; // eighth notes
  let setting = { enabled: false, volume: 20, tick: 0 };
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY) || '{}');
    setting.enabled = saved.enabled === true;
    setting.volume = Number.isFinite(+saved.volume) ? Math.max(0, Math.min(100, +saved.volume)) : 20;
    setting.tick = Number.isFinite(+saved.tick) ? Math.max(0, +saved.tick) : 0;
  } catch (_) {}
  let ctx = null, master = null, timer = null, noise = null;
  let nextStep = setting.tick, nextAt = 0, playing = false, startedAt = 0;
  let duckTimer = 0, duckFactor = 1, startAttempt = 0;

  const css = document.createElement('style');
  css.textContent = [
    '.dz-soundtrack{position:fixed;z-index:44;left:max(9px,env(safe-area-inset-left));bottom:max(10px,env(safe-area-inset-bottom));display:flex;align-items:center;gap:7px;max-width:calc(100vw - 155px);padding:7px;border:1px solid #00eaff8a;border-radius:14px;background:#080d19ef;box-shadow:0 5px 25px #000a,0 0 15px #00eaff15;font-family:"IBM Plex Mono",monospace;backdrop-filter:blur(9px)}',
    '.dz-soundtrack button{min-height:41px;border:1px solid #ff39aa8a;border-radius:9px;background:#1e0e24;color:#ffabd9;padding:8px 10px;font:800 10px/1.1 "IBM Plex Mono",monospace;letter-spacing:.04em;white-space:nowrap;cursor:pointer}',
    '.dz-soundtrack button[data-playing="true"]{background:#3a1030;border-color:#ff77c5;color:#fff}',
    '.dz-soundtrack button:focus-visible,.dz-soundtrack input:focus-visible{outline:3px solid #d9ffb0;outline-offset:3px}',
    '.dz-soundtrack label{display:flex;align-items:center;gap:5px;color:#00eaff;font-size:13px}',
    '.dz-soundtrack input{width:49px;accent-color:#ff39aa;cursor:pointer}',
    '.dz-soundtrack .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}',
    '@media(max-width:370px){.dz-soundtrack{gap:4px;padding:5px}.dz-soundtrack button{padding:7px 8px;font-size:9px}.dz-soundtrack input{width:35px}}'
  ].join('\n');
  document.head.appendChild(css);

  const dock = document.createElement('div');
  dock.id = 'dzSoundtrackDock';
  dock.className = 'dz-soundtrack';
  dock.setAttribute('role', 'group');
  dock.setAttribute('aria-label', 'Drop Zone background soundtrack');
  dock.innerHTML = '<button type="button" id="dzSoundToggle" aria-pressed="false" title="Play or pause original Drop Zone synth soundtrack">♫ MIX OFF</button>' +
    '<label for="dzSoundVolume" title="Soundtrack volume">🔊<span class="sr-only">Soundtrack volume</span><input id="dzSoundVolume" type="range" min="0" max="100" step="1" value="20" aria-label="Soundtrack volume"></label>' +
    '<span class="sr-only" role="status" aria-live="polite" id="dzSoundStatus"></span>';
  document.body.appendChild(dock);
  const toggle = dock.querySelector('#dzSoundToggle');
  const volume = dock.querySelector('#dzSoundVolume');
  const status = dock.querySelector('#dzSoundStatus');
  volume.value = String(setting.volume);

  function save() {
    setting.tick = playing ? Math.max(0, nextStep - Math.max(0, (nextAt - ctx.currentTime) / STEP)) : setting.tick;
    try { sessionStorage.setItem(KEY, JSON.stringify(setting)); } catch (_) {}
  }
  function label(note) {
    toggle.dataset.playing = String(playing);
    toggle.setAttribute('aria-pressed', String(playing));
    toggle.textContent = playing ? '♫ MIX ON · ❚❚' : setting.enabled ? '♫ RESUME ▶' : '♫ MIX OFF ▶';
    toggle.title = 'Original instrumental techno soundtrack · 118 BPM. Tap to ' + (playing ? 'pause' : 'play') + '.';
    if (note) status.textContent = note;
  }
  function applyGain() {
    if (!ctx || !master) return;
    const v = Math.pow(setting.volume / 100, 1.3) * duckFactor;
    master.gain.setTargetAtTime(v, ctx.currentTime, .08);
  }
  function makeNoise() {
    const length = Math.ceil(ctx.sampleRate * .3);
    noise = ctx.createBuffer(1, length, ctx.sampleRate);
    const a = noise.getChannelData(0);
    for (let i = 0; i < length; i++) a[i] = Math.random() * 2 - 1;
  }
  function tone(freq, kind, amount, time, duration, cutoff) {
    const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = kind;
    o.frequency.setValueAtTime(freq, time);
    f.type = 'lowpass';
    f.frequency.value = cutoff;
    g.gain.setValueAtTime(.00001, time);
    g.gain.exponentialRampToValueAtTime(amount, time + .018);
    g.gain.exponentialRampToValueAtTime(.00001, time + duration);
    o.connect(f); f.connect(g); g.connect(master);
    o.start(time); o.stop(time + duration + .025);
  }
  function kick(t) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(130, t);
    o.frequency.exponentialRampToValueAtTime(49, t + .15);
    g.gain.setValueAtTime(.00001, t);
    g.gain.exponentialRampToValueAtTime(.3, t + .006);
    g.gain.exponentialRampToValueAtTime(.00001, t + .24);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + .25);
  }
  function hiss(t, amount, duration, highpass) {
    const o = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.buffer = noise; f.type = 'highpass'; f.frequency.value = highpass;
    g.gain.setValueAtTime(.00001, t);
    g.gain.exponentialRampToValueAtTime(amount, t + .005);
    g.gain.exponentialRampToValueAtTime(.00001, t + duration);
    o.connect(f); f.connect(g); g.connect(master);
    o.start(t); o.stop(t + duration + .01);
  }
  const roots = [55, 58.27, 43.65, 49]; // A minor / Bb / F / G-ish low register
  const chords = [
    [220, 261.63, 329.63],
    [233.08, 293.66, 349.23],
    [174.61, 220, 261.63],
    [196, 246.94, 293.66]
  ];
  function step(s, at) {
    const eighth = s % 8;
    const chord = Math.floor(s / 16) % 4;
    if (eighth % 2 === 0) kick(at);
    if (eighth % 2 === 1) hiss(at, .055, .095, 4400);
    if (eighth === 2 || eighth === 6) hiss(at, .062, .12, 1750);
    if ([0, 3, 5].includes(eighth)) {
      const root = roots[chord];
      tone(root * (eighth === 3 ? 2 : 1), 'sawtooth', .081, at, .2, 410);
    }
    if (eighth === 0 && s % 16 === 0) {
      for (const freq of chords[chord]) tone(freq, 'sine', .017, at, STEP * 6.5, 1000);
    }
    if (eighth === 3 || eighth === 7) {
      const notes = chords[chord];
      tone(notes[(Math.floor(s / 8) + (eighth === 7 ? 1 : 0)) % 3] * 2, 'triangle', .018, at, .28, 2400);
    }
  }
  function pump() {
    if (!playing || ctx.state !== 'running') return;
    const edge = ctx.currentTime + .24;
    let guard = 0;
    while (nextAt < edge && guard++ < 8) {
      step(nextStep++, nextAt);
      nextAt += STEP;
    }
  }
  async function start() {
    if (!AC) { label('Audio is not supported in this browser.'); return; }
    if (playing) return;
    try {
      if (!ctx) {
        ctx = new AC();
        master = ctx.createGain();
        const limiter = ctx.createDynamicsCompressor();
        limiter.threshold.value = -16;
        limiter.ratio.value = 2.5;
        master.connect(limiter); limiter.connect(ctx.destination);
        makeNoise();
      }
      // On mobile an autoplay-blocked resume() can remain pending until a tap.
      // Expire that attempt, but let a new user gesture retry without racing it.
      const attempt = ++startAttempt;
      await Promise.race([
        ctx.resume().catch(() => {}),
        new Promise(resolve => setTimeout(resolve, 450))
      ]);
      if (attempt !== startAttempt || playing) return;
      if (ctx.state !== 'running') {
        label('Tap to resume the soundtrack after navigation.');
        return;
      }
      playing = true;
      setting.enabled = true;
      nextStep = Math.max(0, Math.round(setting.tick));
      nextAt = ctx.currentTime + .06;
      startedAt = ctx.currentTime;
      applyGain();
      pump();
      timer = setInterval(pump, 90);
      label('Drop Zone instrumental soundtrack playing.');
      save();
    } catch (_) {
      playing = false;
      label('Tap to resume soundtrack. Your browser may block autoplay.');
    }
  }
  function pause() {
    if (!playing) { setting.enabled = false; save(); label('Soundtrack off.'); return; }
    // Save beat position before stopping, so next page can resume its place.
    setting.tick = Math.floor(nextStep - Math.max(0, (nextAt - ctx.currentTime) / STEP));
    playing = false;
    setting.enabled = false;
    if (timer) clearInterval(timer);
    timer = null;
    if (ctx) ctx.suspend().catch(() => {});
    save();
    label('Soundtrack paused.');
  }
  toggle.addEventListener('click', () => playing ? pause() : start());
  volume.addEventListener('input', () => {
    setting.volume = Number(volume.value);
    applyGain();
    save();
  });
  window.addEventListener('pagehide', () => {
    if (playing) {
      setting.tick = Math.floor(nextStep - Math.max(0, (nextAt - ctx.currentTime) / STEP));
      try { sessionStorage.setItem(KEY, JSON.stringify(setting)); } catch (_) {}
    }
    if (timer) clearInterval(timer);
    timer = null;
  });
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    if (playing && ctx && ctx.state === 'running' && !timer) {
      nextAt = ctx.currentTime + .06;
      timer = setInterval(pump, 90);
    } else if (setting.enabled && !playing) {
      start();
    }
  });
  // Lower the music while a recorded greeting or other spoken instruction plays.
  window.dzSoundtrackDuck = (duration = 20000) => {
    if (!playing) return;
    duckFactor = .18;
    applyGain();
    clearTimeout(duckTimer);
    duckTimer = setTimeout(() => { duckFactor = 1; applyGain(); }, duration);
  };
  // Browser autoplay policies usually disallow playing in a newly loaded document
  // without another tap. Best-effort resume; display an explicit RESUME control.
  if (setting.enabled && AC) start();
  else label('Soundtrack off. Tap to play.');
})();