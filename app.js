let crisis='sleep';const plans={sleep:[['SECURE TONIGHT','Find one legal, reasonably safe place for the next 12 hours. Do not solve next month yet. Call before traveling when possible.'],['LOCK IN FOOD + WATER','Get enough for tonight and tomorrow morning. Protect cash for shelter and transport.'],['BUILD A 72-HOUR BRIDGE','Line up the next three nights, benefits calls, and one income action.']],car:[['ESTABLISH BASE CAMP','Identify a legal overnight option or verified safe-parking resource. Never sleep with the engine running in an enclosed area.'],['PROTECT THE VEHICLE','Fuel, keys, documents, phone power and a morning relocation plan. The car is infrastructure now.'],['SET YOUR RANGE','Cluster tomorrow’s calls and stops. Do not burn fuel crossing the county for something you can confirm by phone.']],bike:[['SECURE THE BIKE','Find secure overnight storage and use the strongest lock strategy available. Losing mobility makes every other mission harder.'],['CHECK RANGE + LIGHT','Tires, brakes, lights, weather and realistic round-trip distance. Plan the return, not just the destination.'],['BUILD THE ROUTE','Cluster food, charging, services and appointments inside your actual riding range.']],money:[['STOP THE BLEED','List only unavoidable spending for the next 72 hours: shelter, food, medication, transport and phone.'],['OPEN BENEFIT CHANNELS','Identify emergency cash, food and local assistance you may qualify for. Verify eligibility with the source.'],['RESTORE INCOME','Choose one action today: recruiter call, shift, application, gig or benefits appointment.']],food:[['EAT TODAY','Locate the closest verified food option you can realistically reach. Call first if hours or eligibility are uncertain.'],['WATER + HYGIENE','Secure drinking water and a bathroom plan. Add charging and laundry only if needed today.'],['PROTECT TOMORROW','Get enough essentials to prevent another emergency run in the morning.']],unsafe:[['MOVE TOWARD SAFETY','If danger is immediate, contact emergency services or move to a staffed public place if you can do so safely.'],['GET A HUMAN ON THE LINE','Contact a trusted person or an appropriate local crisis/support service. Do not handle immediate danger through this demo app.'],['RE-TRIAGE FROM SAFETY','Once immediate danger is reduced, rebuild the plan around shelter, transport and essentials.']]};function show(id){document.querySelectorAll('main>section').forEach(x=>x.classList.add('hidden'));document.getElementById(id).classList.remove('hidden');scrollTo(0,0)}function pick(x){crisis=x;show('status')}function toggle(x){x.classList.toggle('on')}function build(){cashStat.textContent='$'+cash.value;list.innerHTML='';plans[crisis].forEach((m,i)=>{let d=document.createElement('div');d.className='mission';d.innerHTML=`<em>MISSION 0${i+1}</em><h3>${m[0]}</h3><p>${m[1]}</p>${crisis==='food'&&i===0?'<a class="resource-link" href="https://pantry-goblin.vercel.app/" target="_blank" rel="noopener noreferrer" aria-label="Open Pantry Goblin in a new tab">🥫 OPEN PANTRY GOBLIN ↗</a>':''}<button onclick="complete(this)">MARK OBJECTIVE COMPLETE ✓</button>`;list.appendChild(d)});localStorage.setItem('dropzone',JSON.stringify({crisis,cash:cash.value}));show('missions')}function complete(b){b.parentElement.classList.toggle('done');b.textContent=b.parentElement.classList.contains('done')?'OBJECTIVE COMPLETE ✓':'MARK OBJECTIVE COMPLETE ✓';if(document.querySelectorAll('.mission.done').length===3){state.textContent='STABILIZING → RECOVERY';tx.innerHTML='<b>📡 EMTIZZLE → OPERATOR</b><p>Look at that. Three objectives down. You have a plan now. Keep moving.</p>'}}function medic(){const d=document.getElementById('medicContact');if(d && typeof d.showModal==='function'){if(!d.open)d.showModal();}else{window.location.href="mailto:sudo.codebabe@proton.me?subject=DROP%20ZONE%20%2F%2F%20FIELD%20TRANSMISSION&body=Hey%20EMTizzle%2C%0A%0AI'm%20reaching%20out%20from%20Drop%20Zone.%0A%0A";}}function closeMedicContact(){const d=document.getElementById('medicContact');if(d && d.open)d.close();}window.onload=()=>{let s=JSON.parse(localStorage.getItem('dropzone')||'null');if(s){crisis=s.crisis||'sleep'}cash.value=0;cashOut.value=0;};function gearData(){try{return JSON.parse(localStorage.getItem('dropzoneGear')||'[]')}catch(e){return[]}}function saveGear(g){localStorage.setItem('dropzoneGear',JSON.stringify(g))}function addGear(){let name=gearName.value.trim();if(!name)return;let g=gearData();g.push({cat:gearCat.value,name,state:gearState.value,loc:gearLoc.value.trim()});saveGear(g);gearName.value='';gearLoc.value='';renderGear()}function removeGear(i){let g=gearData();g.splice(i,1);saveGear(g);renderGear()}function renderGear(){let g=gearData();gearList.innerHTML=g.length?'':'<p class="emptygear">MANIFEST EMPTY // ADD WHAT YOU ALREADY HAVE.</p>';g.forEach((x,i)=>{let d=document.createElement('div');d.className='gearitem';d.innerHTML='<div><em>'+esc(x.cat)+'</em><h3>'+esc(x.name)+'</h3><p>'+esc(x.state)+(x.loc?' // '+esc(x.loc):'')+'</p></div><button onclick="removeGear('+i+')">REMOVE</button>';gearList.appendChild(d)})}function esc(s){let d=document.createElement('div');d.textContent=s;return d.innerHTML}function sirenChirp(){try{const A=window.AudioContext||window.webkitAudioContext,a=new A(),g=a.createGain(),o=a.createOscillator();o.type='sawtooth';o.connect(g);g.connect(a.destination);let t=a.currentTime;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.07,t+.02);o.frequency.setValueAtTime(620,t);o.frequency.linearRampToValueAtTime(980,t+.18);o.frequency.linearRampToValueAtTime(650,t+.38);o.frequency.linearRampToValueAtTime(1050,t+.58);g.gain.setValueAtTime(.07,t+.58);g.gain.exponentialRampToValueAtTime(.0001,t+.72);o.start(t);o.stop(t+.74);setTimeout(()=>a.close(),900)}catch(e){}}function openScene(){let p=document.getElementById('scenePopup');p.classList.remove('hidden');p.classList.remove('scene-popup');void p.offsetWidth;p.classList.add('scene-popup');document.body.style.overflow='hidden';sirenChirp()}function closeScene(){document.getElementById('scenePopup').classList.add('hidden');document.body.style.overflow=''}document.addEventListener('keydown',e=>{if(e.key==='Escape')closeScene()});

/* Spoken only after a deliberate tap; no autoplay or external voice service. */
const EMTIZZLE_GREETING = "Hey. This is EMTizzle. I see you're in a rough spot. We're gonna get you out. You're in the Drop Zone. Let's get you moving.";
let emtizzleAudio = null;
function speakEmtizzleFallback() {
  if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') return;
  try {
    window.speechSynthesis.cancel();
    const message = new SpeechSynthesisUtterance(EMTIZZLE_GREETING);
    message.lang = 'en-US';
    message.rate = 1.08;
    message.pitch = 1.13;
    const voices = window.speechSynthesis.getVoices();
    message.voice = voices.find(v => /^en[-_]US$/i.test(v.lang) && /Samantha|Ava|Allison|Jenny|Aria|Joanna|Zira|Google US English/i.test(v.name))
      || voices.find(v => /^en[-_]US$/i.test(v.lang))
      || voices.find(v => /^en/i.test(v.lang)) || null;
    window.speechSynthesis.speak(message);
  } catch (e) { /* Visible transcript remains available. */ }
}
// Original low-volume hacker-techno bed, generated locally in the browser.
// No third-party track, autoplay, external requests, or licensing dependencies.
// Original upbeat melodic-techno backing for the EMTizzle greeting (128 BPM).
// Synthesized on-device; no copyrighted recording or external service.
let dzMusic = null;
function stopGreetingMusic(trailSeconds = 0) {
  if (!dzMusic) return;
  const m = dzMusic; dzMusic = null;
  if (m.stopTimer) clearTimeout(m.stopTimer);
  const tail = Math.max(0, trailSeconds);
  try {
    const t = m.ctx.currentTime;
    m.master.gain.cancelScheduledValues(t);
    m.master.gain.setValueAtTime(m.master.gain.value, t);
    if (tail) {
      // Keep the groove audible after the voice, then fade across the last 3 seconds.
      m.master.gain.setValueAtTime(m.master.gain.value, t + Math.max(0,tail-3));
      m.master.gain.linearRampToValueAtTime(0, t+tail);
    } else {
      m.master.gain.linearRampToValueAtTime(0, t+.12);
    }
  } catch(e) {}
  m.stopTimer = setTimeout(() => {
    clearInterval(m.timer);
    m.ctx.close().catch(()=>{});
  }, (tail+.25)*1000);
}
function startGreetingMusic() {
  stopGreetingMusic();
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC(), master = ctx.createGain();
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.ratio.value = 3;
    master.gain.value = 0;
    master.connect(compressor); compressor.connect(ctx.destination);
    // Prominent but still behind the spoken recording.
    master.gain.setTargetAtTime(1.6,ctx.currentTime,.4);
    const bassNotes=[55,55,65.41,55,73.42,65.41,49,65.41];
    const leadNotes=[220,261.63,329.63,293.66,220,392,329.63,261.63];
    const synth=(frequency,type,volume,duration,cutoff=2400)=>{
      const t=ctx.currentTime, osc=ctx.createOscillator(),env=ctx.createGain(),lp=ctx.createBiquadFilter();
      osc.type=type;osc.frequency.setValueAtTime(frequency,t);
      lp.type='lowpass';lp.frequency.value=cutoff;
      env.gain.setValueAtTime(.0001,t);
      env.gain.exponentialRampToValueAtTime(volume,t+.012);
      env.gain.exponentialRampToValueAtTime(.0001,t+duration);
      osc.connect(lp);lp.connect(env);env.connect(master);
      osc.start(t);osc.stop(t+duration+.02);
    };
    let step=0;
    const pulse=()=>{
      const s=step%16;
      // Driving four-on-the-floor kick, offbeat hats, syncopated bass.
      if(s%2===0){
        const t=ctx.currentTime, o=ctx.createOscillator(),g=ctx.createGain();
        o.type='sine';o.frequency.setValueAtTime(135,t);o.frequency.exponentialRampToValueAtTime(48,t+.12);
        g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.32,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+.22);
        o.connect(g);g.connect(master);o.start(t);o.stop(t+.24);
      } else {
        synth(6200,'triangle',.014,.075,6800);
      }
      if(s%2===1 || s===0) synth(bassNotes[(step>>1)%8],'sawtooth',.075,.19,540);
      if(s%4===2) synth(leadNotes[(step>>2)%8],'triangle',.055,.29,2100);
      step++;
    };
    pulse();
    const timer=setInterval(pulse,234.375); // 128 BPM eighth notes
    dzMusic={ctx,master,timer,stopTimer:null};
    ctx.resume().catch(()=>{});
  } catch(e) {stopGreetingMusic();}
}

let captionAnimation = 0;
function emtizzleGreeting() {
 const caption=document.getElementById('emtizzleGreetingCaption');
 cancelAnimationFrame(captionAnimation);
 const words="EMTizzle, operator. I heard you're in a rough spot. That's all right. Sometimes life can take you sideways. We're gonna get you out.";
 if(caption){caption.hidden=false;caption.textContent='';caption.setAttribute('aria-label',words)}
 if('speechSynthesis' in window)window.speechSynthesis.cancel();
 if(emtizzleAudio){emtizzleAudio.pause();emtizzleAudio.currentTime=0}
 else{emtizzleAudio=new Audio('EMTizzle_Operator_Timelapse_Radio_Drop.mp3');emtizzleAudio.preload='none'}
 const cues=[[0.5,"EMTizzle, operator."],[2.7," I heard you're in a rough spot."],[5.6," That's all right."],[7.5," Sometimes life can take you sideways."],[11.1," We're gonna get you out."]];
 function draw(){
  if(!caption)return;
  const t=emtizzleAudio.currentTime;let out='';
  for(let i=0;i<cues.length;i++){
   const [at,part]=cues[i];if(t<at)break;
   const until=i+1<cues.length?cues[i+1][0]-.2:14.2;
   const fraction=Math.max(0,Math.min(1,(t-at)/(until-at)));
   out+=part.slice(0,Math.floor(part.length*fraction));
   if(fraction<1)break;
  }
  caption.textContent=out;
  if(!emtizzleAudio.paused&&!emtizzleAudio.ended)captionAnimation=requestAnimationFrame(draw);
 }
 const fallback=()=>{cancelAnimationFrame(captionAnimation);if(caption)caption.textContent=words;speakEmtizzleFallback()};
 emtizzleAudio.onerror=fallback;
 emtizzleAudio.onended=()=>{cancelAnimationFrame(captionAnimation);if(caption)caption.textContent=words};
 stopGreetingMusic();
 try{const p=emtizzleAudio.play();if(p&&typeof p.then==='function')p.then(()=>captionAnimation=requestAnimationFrame(draw)).catch(fallback);else captionAnimation=requestAnimationFrame(draw)}catch(e){fallback()}
}
