/* Drop Zone // Field Intel loot celebration.
   Cosmetic virtual gear only. No new tracking or network requests. */
(()=>{
  'use strict';
  const layer=document.getElementById('lootDropLayer');
  const bag=document.getElementById('lootBagButton');
  const counter=document.getElementById('lootBagCount');
  const soundButton=document.getElementById('lootSoundToggle');
  const soundIcon=document.getElementById('lootSoundIcon');
  const soundLabel=document.getElementById('lootSoundLabel');
  if(!layer||!bag||!counter)return;

  const SOUND_KEY='dz-field-intel-sfx-v1';
  const reduceMotion=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true;
  let soundOn=true,ctx=null,activeTimers=[],flyer=null;
  try{soundOn=localStorage.getItem(SOUND_KEY)!=='off';}catch(_){}

  function soundUI(){
    if(!soundButton)return;
    soundButton.setAttribute('aria-pressed',String(soundOn));
    soundButton.setAttribute('aria-label',soundOn?'Mute loot sounds':'Turn on loot sounds');
    soundButton.title=soundOn?'Loot chimes on. Tap to mute.':'Loot chimes muted. Tap to turn on.';
    if(soundIcon)soundIcon.textContent=soundOn?'🔊':'🔇';
    if(soundLabel)soundLabel.textContent=soundOn?'SOUND ON':'SOUND OFF';
  }
  soundUI();
  if(soundButton)soundButton.addEventListener('click',()=>{
    soundOn=!soundOn;
    try{localStorage.setItem(SOUND_KEY,soundOn?'on':'off');}catch(_){}
    soundUI();
    if(soundOn)chime();
  });
  function chime(){
    if(!soundOn)return;
    try{
      const Audio=window.AudioContext||window.webkitAudioContext;
      if(!Audio)return;
      ctx=ctx||new Audio();
      if(ctx.state==='suspended')ctx.resume().catch(()=>{});
      // Low-volume synthesized four-note victory chime. No media downloads.
      const now=ctx.currentTime;
      [523.25,659.26,783.99,1046.5].forEach((hz,i)=>{
        const at=now+i*.095;
        const osc=ctx.createOscillator(),gain=ctx.createGain();
        osc.type=i===3?'sine':'triangle';
        osc.frequency.setValueAtTime(hz,at);
        gain.gain.setValueAtTime(.0001,at);
        gain.gain.exponentialRampToValueAtTime(i===3?.065:.038,at+.018);
        gain.gain.exponentialRampToValueAtTime(.0001,at+(i===3?.67:.31));
        osc.connect(gain);gain.connect(ctx.destination);
        osc.start(at);osc.stop(at+(i===3?.7:.33));
      });
    }catch(_){/* Optional sound; the game works without Web Audio. */}
  }

  function timer(fn,delay){
    const id=setTimeout(fn,delay);
    activeTimers.push(id);
    return id;
  }
  function clearEffects(){
    activeTimers.forEach(clearTimeout);
    activeTimers=[];
    layer.replaceChildren();
    flyer?.remove();flyer=null;
    document.querySelectorAll('.loot-toast').forEach(node=>node.remove());
    bag.classList.remove('loot-bag-burst');
  }
  function el(tag,cls,value){
    const node=document.createElement(tag);node.className=cls;
    if(value!==undefined)node.textContent=value;
    return node;
  }

  function refreshBag(amount){
    const number=Math.max(0,Math.min(999,Number(amount)||0));
    counter.textContent=String(number);
    bag.setAttribute('aria-label','Open Intel Manifest: '+number+' virtual gear '+(number===1?'item':'items')+' collected');
    bag.title=number+' virtual gear items // tap to open Intel Manifest';
  }

  function scrollToInventory(){
    const panel=document.getElementById('inventoryPanel');
    if(!panel)return;
    panel.scrollIntoView({behavior:reduceMotion()?'auto':'smooth',block:'start'});
    const title=document.getElementById('inventorytitle');
    if(title)title.focus({preventScroll:true});
    panel.classList.remove('loot-target-highlight');
    void panel.offsetWidth;
    panel.classList.add('loot-target-highlight');
    timer(()=>panel.classList.remove('loot-target-highlight'),1700);
  }
  bag.addEventListener('click',scrollToInventory);

  function landing(){
    bag.classList.remove('loot-bag-burst');
    void bag.offsetWidth;
    bag.classList.add('loot-bag-burst');
    const toast=el('div','loot-toast','✓ GEAR SECURED // MANIFEST UPDATED');
    toast.setAttribute('aria-hidden','true');
    document.body.append(toast);
    timer(()=>toast.remove(),1000);
    timer(()=>bag.classList.remove('loot-bag-burst'),650);
  }

  function fly(icon,card){
    const sprite=card.querySelector('.loot-drop-icon');
    if(!sprite){landing();return;}
    const start=sprite.getBoundingClientRect();
    const end=bag.getBoundingClientRect();
    const size=82;
    flyer=el('div','loot-flying-icon',icon);
    flyer.setAttribute('aria-hidden','true');
    const sx=start.left+start.width/2-size/2;
    const sy=start.top+start.height/2-size/2;
    const dx=end.left+end.width/2-(sx+size/2);
    const dy=end.top+end.height/2-(sy+size/2);
    flyer.style.left=sx+'px';flyer.style.top=sy+'px';
    layer.append(flyer);
    card.classList.add('loot-card-exit');
    const currentFlyer=flyer;
    let completed=false;
    const finish=()=>{
      if(completed)return;
      completed=true;
      currentFlyer.remove();
      if(flyer===currentFlyer)flyer=null;
      card.remove();
      landing();
    };
    if(typeof currentFlyer.animate==='function'){
      const motion=currentFlyer.animate([
        {transform:'translate(0,0) scale(1.06) rotate(-12deg)',opacity:1,offset:0},
        {transform:'translate('+(dx*.40)+'px,'+(dy*.12-75)+'px) scale(1.25) rotate(8deg)',opacity:1,offset:.36},
        {transform:'translate('+dx+'px,'+dy+'px) scale(.25) rotate(24deg)',opacity:.45,offset:1}
      ],{duration:790,easing:'cubic-bezier(.25,.08,.18,.96)',fill:'forwards'});
      motion.onfinish=finish;
      timer(finish,950);
    }else{
      // Legacy browser: instant manifest update, no stuck animation.
      finish();
    }
  }

  function reward(item,options){
    if(!item||typeof item.name!=='string')return;
    const xp=options?.xp??25,streak=options?.streak??0;
    clearEffects();
    const icon=String(item.gear||'🎒');
    const card=el('div','loot-drop-card');
    const kicker=el('div','loot-drop-kicker','✦ ✦  NEW LOOT ACQUIRED  ✦ ✦');
    const sigil=el('div','loot-drop-icon',icon);
    sigil.setAttribute('aria-hidden','true');
    const name=el('div','loot-drop-name',item.name);
    const points=el('div','loot-drop-xp','+'+Math.max(0,Number(xp)||0)+' XP');
    const note=el('div','loot-drop-note','VIRTUAL COLLECTIBLE → GEAR BAG');
    card.append(kicker,sigil,name,points,note);
    if(streak>=3){
      const combo=el('div','loot-drop-streak','🥤 REFRESHMENT BUFF // '+streak+'-ANSWER STREAK');
      card.append(combo);
    }
    for(let i=0;i<4;i++){
      const star=el('span','loot-drop-star','✦');
      star.setAttribute('aria-hidden','true');
      card.append(star);
    }
    layer.append(card);
    chime();
    if(reduceMotion()){
      timer(()=>{card.remove();landing();},1050);
    }else{
      timer(()=>fly(icon,card),1180);
    }
  }
  window.DZIntelLoot={reward,refreshBag};
})();
