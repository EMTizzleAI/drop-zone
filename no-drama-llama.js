/* No Drama Llama: optional, low-pressure DV education.
   No sound, location access, score penalty, storage, or personal-data submission. */
(()=>{
  'use strict';
  const card=document.getElementById('noDramaLlama');
  const ask=document.getElementById('llamaAsk');
  const fact=document.getElementById('llamaFact');
  const counter=document.getElementById('llamaCounter');
  const charms=document.getElementById('llamaCharms');
  const say=document.getElementById('llamaSay');
  if(!card||!ask||!fact||!counter||!charms||!say)return;
  const facts=[
    {
      name:'BOUNDARY SHIELD',icon:'🛡️',
      headline:'Abuse is not just physical.',
      body:'Controlling money, isolating someone from people they trust, threats, and monitoring their technology can also be forms of abuse. You can ask for support even if there are no visible injuries.',
      href:'https://www.thehotline.org/resources/types-of-abuse/',
      link:'READ ABOUT TYPES OF ABUSE'
    },
    {
      name:'ADVOCATE ALLY',icon:'💗',
      headline:'You can talk to an advocate without making a police report.',
      body:'Domestic violence advocates can help you think through options and make an individualized safety plan. You do not need to decide to leave, report, or take another big step before reaching out.',
      href:'https://www.thehotline.org/get-help/',
      link:'FIND AN ADVOCATE'
    },
    {
      name:'DIGITAL SHIELD',icon:'📱',
      headline:'A quick exit does not erase your tracks.',
      body:'Phones and computers can be monitored. Even private browsing cannot guarantee that your activity is hidden. If you are concerned about monitoring, look for help from a device you trust.',
      href:'https://www.thehotline.org/plan-for-safety/internet-safety/',
      link:'LEARN ABOUT INTERNET SAFETY'
    },
    {
      name:'SAFETY MAP',icon:'🗺️',
      headline:'A safety plan can start before you leave.',
      body:'A safety plan can include identifying safer places, a trusted contact, ways to get help, and options that fit your specific circumstances. A trained advocate can help you plan.',
      href:'https://www.thehotline.org/plan-for-safety/',
      link:'EXPLORE SAFETY PLANNING'
    },
    {
      name:'CHOICE COMPASS',icon:'🧭',
      headline:'Reporting is one option, not the only path to help.',
      body:'Police involvement may have different risks and benefits depending on the situation. You can discuss the options with an advocate and decide what feels safer. If danger is immediate, contact emergency services.',
      href:'https://www.thehotline.org/resources/reporting-to-police-options-tips-for-being-prepared/',
      link:'UNDERSTAND REPORTING OPTIONS'
    }
  ];
  // Keep this session-only. The page does not track which safety topics someone opens.
  let seen=new Set(),at=-1;
  function showNext(){
    if(seen.size===facts.length){seen.clear();at=-1;charms.replaceChildren();}
    at=(at+1)%facts.length;
    let loops=0;
    while(seen.has(at)&&loops<facts.length){at=(at+1)%facts.length;loops++;}
    const entry=facts[at];seen.add(at);
    fact.replaceChildren();
    const label=document.createElement('div');
    label.className='llama-fact-head';label.textContent='🦙 PROTECTIVE INTEL ACQUIRED // '+seen.size+' OF '+facts.length;
    const title=document.createElement('h3');title.textContent=entry.icon+' '+entry.headline;
    const desc=document.createElement('p');desc.textContent=entry.body;
    const source=document.createElement('a');source.className='llama-resource';
    source.href=entry.href;source.target='_blank';source.rel='noopener noreferrer';
    source.textContent=entry.link+' ↗';
    fact.append(label,title,desc,source);
    fact.hidden=false;
    const charm=document.createElement('span');charm.className='llama-charm';
    charm.textContent=entry.icon+' '+entry.name;
    if(seen.size===1)charms.replaceChildren();
    charms.append(charm);
    counter.textContent=seen.size+' / '+facts.length+' safety facts learned';
    say.textContent=seen.size===facts.length?
      'Llama llama! Five facts learned. There are no tests here, just options. Want to go again?':
      'Llama llama! '+entry.name.toLowerCase()+' unlocked. Knowledge is protection, and you get to choose your next step.';
    ask.textContent=seen.size===facts.length?'🦙 REVIEW FACTS AGAIN ↺':'🛡️ ANOTHER SAFETY FACT →';
    card.classList.remove('llama-learning');
    void card.offsetWidth;
    card.classList.add('llama-learning');
    setTimeout(()=>card.classList.remove('llama-learning'),650);
  }
  ask.addEventListener('click',showNext);
})();