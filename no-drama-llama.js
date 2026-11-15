/* No Drama Llama // Comfort Quest 2.0.
   Learning only: no sensitive prompts, persistence, analytics, requests, or audio.
   Rewards are cosmetic and never gate emergency/hotline services. */
(()=>{
  'use strict';
  const $=id=>document.getElementById(id);
  const roamer=$('llamaRoamer'),game=$('noDramaLlama'),closeBtn=$('llamaClose');
  const ask=$('llamaAsk'),fact=$('llamaFact'),say=$('llamaSay');
  const bag=$('llamaBag'),bagCount=$('llamaBagCount');
  const charms=$('llamaCharms'),inventory=$('llamaKit');
  const xp=$('llamaXP'),count=$('llamaCounter'),rank=$('llamaRank');
  const progress=$('llamaProgress'),bar=$('llamaProgressBar');
  const layer=$('llamaLootLayer'),heading=$('llamaTitle');
  if(!roamer||!game||!closeBtn||!ask||!fact||!bag||!charms||!layer)return;

  const facts=[
    {id:'boundary',name:'BOUNDARY SHIELD',icon:'🛡️',title:'Abuse is not only physical.',
     body:'Threats, isolation, humiliation, intimidation, and controlling behavior can also be abuse. A person does not need visible injuries to seek support.',
     url:'https://www.thehotline.org/resources/types-of-abuse/',link:'LEARN ABOUT TYPES OF ABUSE'},
    {id:'teddy',name:'TEDDY OF TRUST',icon:'🧸',title:'Support can start with being heard.',
     body:'If someone you trust is safe to talk to, you can tell them what you are comfortable sharing. Listening without judgment and respecting a survivor’s decisions are important kinds of support.',
     url:'https://www.thehotline.org/support-others/ways-to-support-a-domestic-violence-survivor/',link:'HOW TRUSTED PEOPLE CAN HELP'},
    {id:'blanket',name:'PRIVACY BLANKET',icon:'🛏️',title:'Your devices may leave digital footprints.',
     body:'Phone use, browsing history, and messages may be monitored. Quick Exit and private browsing cannot guarantee privacy. If monitoring is a concern, use a safer device when possible.',
     url:'https://www.thehotline.org/plan-for-safety/internet-safety/',link:'INTERNET SAFETY GUIDE'},
    {id:'advocate',name:'ADVOCATE AMULET',icon:'💗',title:'You can ask about your options without first reporting to police.',
     body:'A domestic violence advocate can help you explore safety planning and local resources, including when you are not ready to leave. Ask about privacy and confidentiality limits before sharing sensitive details.',
     url:'https://www.thehotline.org/get-help/',link:'CONTACT A TRAINED ADVOCATE'},
    {id:'map',name:'SAFETY MAP CHARM',icon:'🗺️',title:'A safety plan can begin right where you are.',
     body:'A personalized safety plan might identify safer places, trusted contacts, and options for urgent help. Your circumstances matter; an advocate can help make a plan that fits.',
     url:'https://www.thehotline.org/plan-for-safety/',link:'EXPLORE SAFETY PLANNING'},
    {id:'key',name:'EXIT KEY',icon:'🔑',title:'Preparing to leave can involve practical details.',
     body:'When it is safe to plan ahead, consider access to identification, important documents, medicines, keys, money, and emergency contacts. Leaving can increase danger; talk through timing and safer options with an advocate.',
     url:'https://www.thehotline.org/resources/leaving-an-abusive-relationship/',link:'SAFER LEAVING CHECKLIST'},
    {id:'ribbon',name:'CODE WORD RIBBON',icon:'🎀',title:'A trusted signal may help someone know you need support.',
     body:'Some safety plans include a code word agreed upon with someone trusted, so they know when to follow a prearranged plan for seeking help. Only use this if it fits your situation and can be kept safe.',
     url:'https://www.thehotline.org/resources/safety-planning-with-children/',link:'READ ABOUT SAFETY SIGNALS'},
    {id:'compass',name:'CALM COMPASS',icon:'🧭',title:'You can explore options at your own pace.',
     body:'Different people face different risks when considering police involvement or leaving. An advocate can help you weigh choices. If anyone is in immediate danger, contact emergency services.',
     url:'https://www.thehotline.org/resources/reporting-to-police-options-tips-for-being-prepared/',link:'LEARN ABOUT REPORTING OPTIONS'},
    {id:'phone',name:'PHONE SHIELD',icon:'📱',title:'Technology can be used for surveillance and control.',
     body:'Location sharing, device access, online accounts, and tracking devices can be misused. Abrupt changes to a monitored device can sometimes increase risk; get safety-planning advice from a trusted device.',
     url:'https://www.thehotline.org/plan-for-safety/internet-safety/',link:'DIGITAL SAFETY STEPS'},
    {id:'money',name:'MONEY MOON POUCH',icon:'🌙',title:'Financial control can be abuse.',
     body:'Preventing someone from working, controlling their income, or blocking access to necessities can be financial abuse. Advocates can help people explore safer financial options and support.',
     url:'https://www.thehotline.org/resources/financialabuse/',link:'RECOGNIZE FINANCIAL ABUSE'},
    {id:'kids',name:'KID CLOUD CHARM',icon:'☁️',title:'Children can be included in age-appropriate safety planning.',
     body:'A plan may help children identify safe adults, places to go, and how to contact help. Children should not be expected to physically intervene in violence.',
     url:'https://www.thehotline.org/resources/safety-planning-with-children/',link:'SAFETY PLANNING WITH CHILDREN'},
    {id:'pets',name:'PET PROTECTOR PAW',icon:'🐾',title:'Pets can be included in a safety plan.',
     body:'Planning for an animal companion may involve records, medicines, supplies, a trusted caretaker, or asking about pet-friendly shelter options. Help is available to explore alternatives.',
     url:'https://www.thehotline.org/resources/safety-planning-with-pets/',link:'SAFETY PLANNING WITH PETS'},
    {id:'care',name:'CARE LANTERN',icon:'🏮',title:'Medical care and emotional support both matter.',
     body:'Medical professionals can assess injuries and document symptoms. Pressure to the neck or strangulation requires urgent medical evaluation even without visible marks. Ask about reporting and privacy rules when safe to do so.',
     url:'https://medlineplus.gov/intimatepartnerviolence.html',link:'MEDICAL SUPPORT INFORMATION'},
    {id:'hope',name:'HOPE STAR',icon:'⭐',title:'Help is available even if you are not ready to leave.',
     body:'The National Domestic Violence Hotline offers support for exploring options and safety planning. You do not need a police report or a completed quest to reach out. You decide what information to share.',
     url:'https://www.thehotline.org/get-help/',link:'NATIONAL DOMESTIC VIOLENCE HOTLINE'}
  ];

  // No localStorage, sessionStorage or backend: even reading topics can be sensitive.
  const unlocked=new Set();
  let reviewIndex=0;
  let timers=[],flying=null;
  const reduced=()=>!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const el=(tag,cls,txt)=>{
    const node=document.createElement(tag);
    if(cls)node.className=cls;
    if(txt!==undefined)node.textContent=txt;
    return node;
  };
  function later(fn,ms){const id=setTimeout(fn,ms);timers.push(id);return id;}
  function clearLoot(){
    timers.forEach(clearTimeout);timers=[];
    layer.replaceChildren();
    flying?.remove();flying=null;
    bag.classList.remove('llama-bag-bounce');
  }
  function updateStatus(){
    const n=unlocked.size;
    count.textContent=n+' / '+facts.length+' safety facts learned';
    xp.textContent=n*25+' XP';
    rank.textContent=n===14?'COMFORT LEGEND':n>=10?'CHARM GUARDIAN':n>=5?'SHIELD KEEPER':'FLUFF SCOUT';
    bagCount.textContent=String(n);
    bag.setAttribute('aria-label','Open Comfort Kit, '+n+' of 14 virtual charms unlocked');
    progress.setAttribute('aria-valuenow',String(n));
    bar.style.width=n/facts.length*100+'%';
    ask.textContent=n===14?'🦙 REVIEW A SAFETY FACT ↺':'🛡️ LEARN A FACT + COLLECT CHARM →';
  }
  function renderCharms(){
    charms.replaceChildren();
    facts.forEach((entry,i)=>{
      const earned=unlocked.has(entry.id);
      const node=el(earned?'button':'div','llama-charm'+(earned?'':' llama-locked'));
      if(earned){node.type='button';node.title='Review '+entry.name+' and replay its virtual charm';node.addEventListener('click',()=>{renderFact(entry,false);showLoot(entry,false);fact.scrollIntoView({behavior:reduced()?'auto':'smooth',block:'nearest'});});}
      else node.setAttribute('aria-label','Locked virtual charm '+(i+1)+' of 14');
      const emoji=el('span','llama-charm-icon',earned?entry.icon:'🔒');
      emoji.setAttribute('aria-hidden','true');
      const title=el('span','',earned?entry.name:'CHARM '+String(i+1).padStart(2,'0'));
      node.append(emoji,title);charms.append(node);
    });
  }
  function renderFact(entry,fresh){
    fact.replaceChildren();
    const label=el('div','llama-fact-tag',fresh?'✦ ✦ PROTECTIVE INTEL ACQUIRED ✦ ✦':'🦙 COMFORT KIT // FACT REPLAY');
    const title=el('h3','',entry.icon+' '+entry.title);
    const desc=el('p','',entry.body);
    const source=el('a','','VERIFY WITH THE HOTLINE ↗ '+entry.link);
    source.href=entry.url;source.target='_blank';source.rel='noopener noreferrer';
    const reward=el('span','llama-fact-reward',fresh?'✨ '+entry.name+' • +25 learning XP • VIRTUAL CHARM ADDED':'🩷 '+entry.name+' • Already collected, no extra XP');
    fact.append(label,title,desc,source,reward);
    fact.hidden=false;
    say.textContent=fresh?
      'Llama llama! '+entry.name.toLowerCase()+' unlocked. Gentle knowledge, cozy charms, and choices that stay yours.':
      'Llama llama! Every fact is worth revisiting. Take only what helps you.';
    updateStatus();
    renderCharms();
  }
  function pulseBag(){
    bag.classList.remove('llama-bag-bounce');
    void bag.offsetWidth;bag.classList.add('llama-bag-bounce');
    later(()=>bag.classList.remove('llama-bag-bounce'),700);
  }
  function showLoot(entry,fresh){
    clearLoot();
    const card=el('div','llama-loot-card');
    const kicker=el('div','llama-loot-kicker',fresh?'✦ NEW COMFORT CHARM UNLOCKED ✦':'✦ COMFORT CHARM REPLAY ✦');
    const icon=el('span','llama-loot-icon',entry.icon);icon.setAttribute('aria-hidden','true');
    const title=el('h3','',entry.name);
    const note=el('p','',fresh?'+25 LEARNING XP · VIRTUAL PROTECTION':'ALREADY IN YOUR KIT · NO NEW XP');
    card.append(kicker,icon,title,note);layer.append(card);
    if(reduced()){
      later(()=>{card.remove();pulseBag();},1050);
      return;
    }
    later(()=>{
      if(!card.isConnected)return;
      const start=icon.getBoundingClientRect();
      const target=bag.getBoundingClientRect();
      const size=62;
      const left=start.left+start.width/2-size/2;
      const top=start.top+start.height/2-size/2;
      const dx=target.left+target.width/2-left-size/2;
      const dy=target.top+target.height/2-top-size/2;
      card.classList.add('llama-loot-leaving');
      const sprite=el('div','llama-fly-charm',entry.icon);
      sprite.setAttribute('aria-hidden','true');
      sprite.style.left=left+'px';sprite.style.top=top+'px';
      document.body.append(sprite);flying=sprite;
      let finished=false;
      const land=()=>{
        if(finished)return;
        finished=true;sprite.remove();if(flying===sprite)flying=null;
        card.remove();pulseBag();
      };
      if(sprite.animate){
        const effect=sprite.animate([
          {transform:'translate(0,0) scale(1.1) rotate(-8deg)',opacity:1,offset:0},
          {transform:'translate('+(dx*.48)+'px,'+(dy*.22-56)+'px) scale(1.18) rotate(10deg)',opacity:1,offset:.46},
          {transform:'translate('+dx+'px,'+dy+'px) scale(.15) rotate(26deg)',opacity:.4,offset:1}
        ],{duration:780,easing:'cubic-bezier(.21,.05,.2,.96)',fill:'forwards'});
        effect.onfinish=land;
        later(land,950);
      }else land();
    },1300);
  }
  function advance(){
    let entry,fresh=false;
    if(unlocked.size<facts.length){
      entry=facts.find(item=>!unlocked.has(item.id));
      if(!entry)return;
      unlocked.add(entry.id);
      fresh=true;
    }else{
      entry=facts[reviewIndex++%facts.length];
    }
    renderFact(entry,fresh);
    showLoot(entry,fresh);
  }
  function open(){
    if(!game.hidden)return;
    game.hidden=false;
    roamer.hidden=true;
    updateStatus();
    renderCharms();
    game.scrollIntoView({behavior:reduced()?'auto':'smooth',block:'start'});
    heading.focus({preventScroll:true});
  }
  function close(){
    if(game.hidden)return;
    clearLoot();
    game.hidden=true;
    roamer.hidden=false;
    roamer.focus({preventScroll:true});
  }
  roamer.addEventListener('click',open);
  closeBtn.addEventListener('click',close);
  ask.addEventListener('click',advance);
  bag.addEventListener('click',()=>{
    inventory.scrollIntoView({behavior:reduced()?'auto':'smooth',block:'start'});
    inventory.focus({preventScroll:true});
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!game.hidden){e.preventDefault();close();}});
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){clearLoot();roamer.style.animationPlayState='paused';}
    else roamer.style.animationPlayState='';
  });
  updateStatus();
})();