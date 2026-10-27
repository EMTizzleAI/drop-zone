/* Drop Zone // EMTizzle encouragement interface
   This browser-only backup is labeled offline, NEVER pretends to be generative AI.
   User's recorded homepage greeting remains untouched. */
(() => {
  'use strict';
  const launcher=document.getElementById('dzCoachLaunch');
  const panel=document.getElementById('dzCoachPanel');
  const form=document.getElementById('dzCoachForm');
  const input=document.getElementById('dzCoachInput');
  const log=document.getElementById('dzCoachLog');
  const status=document.getElementById('dzCoachMode');
  const autoVoice=document.getElementById('dzCoachAutoVoice');
  const clear=document.getElementById('dzCoachClear');
  const close=document.getElementById('dzCoachClose');
  const backend=panel?.dataset.endpoint||'';
  if(!launcher||!panel||!form||!input||!log)return;
  const history=[];
  let busy=false;
  let turn=0;
  const helpText="I hear you. This is more than a pep talk deserves to handle. If you're in immediate danger, call local emergency services (911 in the U.S.). In the U.S. you can also call or text 988 for immediate emotional support. Try to reach someone you trust and get to a safer place if you can.";
  const localReplies=[
    "Hey, operator. You made it this far. That counts. Pick ONE thing you can do in the next ten minutes, not everything at once. I'm rooting for you.",
    "Look at you: still here, still making moves. You don't need a perfect plan; you need one realistic next step. Small victories are actual victories.",
    "Mission accepted: drink some water, unclench your shoulders, and give yourself credit for something you handled today. No heroics required.",
    "You're allowed to be tired and determined at the same time. The next objective can be tiny. Tiny is still forward.",
    "A bad hour isn't the entire story. Take the win you can reach right now. I'll celebrate the heck out of it with you."
  ];
  const danger=/(?:kill myself|end my life|suicid|hurt myself|self.harm|want to die|about to die|overdose|someone (?:is|will) hurt me|not safe right now)/i;
  const medical=/(?:diagnos|medication dose|symptoms|chest pain|medicine to take|medical advice|prescription)/i;
  function offlineReply(text) {
    if(danger.test(text))return helpText;
    if(medical.test(text))return "I'm here to encourage you, not give medical advice. For symptoms, medications, or treatment, please check with a qualified clinician; for immediate danger, contact emergency services. Your health matters.";
    if(/food|hungry|pantry|beans/i.test(text))return "You're allowed to ask for help with food, full stop. The next mission can be opening Pantry Goblin and checking the nearest listing before traveling. One step, operator.";
    if(/exhaust|tired|sleep|rest/i.test(text))return "Rest is not a failure to launch. You don't have to earn it. Choose one small, safe comfort step, and let that be enough for now.";
    if(/job|rejection|work|interview/i.test(text))return "One rejection doesn't erase your skills. You've already put yourself out there. That takes guts. What's one job-related move worth making tomorrow?";
    return localReplies[turn++%localReplies.length];
  }
  function activePage(){
    const found=document.querySelector('main > section:not(.hidden)');
    return found?.id||'home';
  }
  function syncPage(){
    const isHome=activePage()==='home';
    launcher.hidden=isHome;
    if(isHome){
      panel.hidden=true;
      stopSpeaking();
    }
  }
  document.querySelectorAll('main > section').forEach(section=>{
    new MutationObserver(syncPage).observe(section,{attributes:true,attributeFilter:['class']});
  });
  function stopSpeaking(){
    if('speechSynthesis' in window)try{window.speechSynthesis.cancel()}catch(_){}
  }
  function speak(text){
    if(!('speechSynthesis' in window))return;
    try{
      stopSpeaking();
      const utter=new SpeechSynthesisUtterance(text);
      utter.lang='en-US';utter.rate=1.03;utter.pitch=1.06;
      window.speechSynthesis.speak(utter);
    }catch(_){}
  }
  function addMessage(role,text,mode){
    const row=document.createElement('div');
    row.className='dz-coach-msg '+(role==='operator'?'dz-coach-operator':'dz-coach-medic');
    const label=document.createElement('strong');
    label.textContent=role==='operator'?'YOU // OPERATOR':'EMTIZZLE // '+(mode==='live'?'GENERATIVE AI':'FIELD ENCOURAGEMENT');
    const body=document.createElement('p');
    body.textContent=text;
    row.append(label,body);
    if(role==='medic'){
      const play=document.createElement('button');
      play.type='button';play.className='dz-coach-speak';
      play.textContent='🔊 HEAR THIS (BROWSER VOICE)';
      play.setAttribute('aria-label','Read EMTizzle encouragement using your device voice');
      play.addEventListener('click',()=>speak(text));
      row.append(play);
      if(autoVoice.checked)speak(text);
    }
    log.append(row);
    log.scrollTop=log.scrollHeight;
    return row;
  }
  function setMode(mode){
    status.textContent=mode==='live'?'● GENERATIVE AI ACTIVE':'● OFFLINE ENCOURAGEMENT MODE';
    status.dataset.mode=mode;
  }
  async function ask(text){
    if(busy||!text||text.length>280)return;
    busy=true;
    input.value='';
    input.disabled=true;
    document.getElementById('dzCoachSend').disabled=true;
    addMessage('operator',text);
    const placeholder=addMessage('medic','Checking in…','offline');
    placeholder.classList.add('dz-coach-pending');
    let reply,mode='offline';
    try{
      if(danger.test(text)||medical.test(text)){
        reply=offlineReply(text);
      }else if(backend){
        const ctrl=new AbortController();
        const timer=setTimeout(()=>ctrl.abort(),13000);
        try {
          const res=await fetch(backend,{
            method:'POST',mode:'cors',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({message:text,history:history.slice(-4)}),
            signal:ctrl.signal
          });
          if(!res.ok)throw Error('Generation not available');
          const data=await res.json();
          if(typeof data.reply!=='string'||!data.reply.trim())throw Error('Missing response');
          reply=data.reply.slice(0,900);
          mode=data.mode==='live'?'live':'offline';
        }finally{clearTimeout(timer)}
      }else throw Error('No AI backend configured');
    }catch(_){reply=offlineReply(text)}
    placeholder.remove();
    setMode(mode);
    addMessage('medic',reply,mode);
    history.push({role:'user',content:text},{role:'assistant',content:reply});
    if(history.length>8)history.splice(0,history.length-8);
    busy=false;input.disabled=false;
    document.getElementById('dzCoachSend').disabled=false;
    input.focus({preventScroll:true});
  }
  launcher.addEventListener('click',()=>{
    panel.hidden=false;launcher.setAttribute('aria-expanded','true');
    input.focus({preventScroll:true});
  });
  close.addEventListener('click',()=>{
    panel.hidden=true;launcher.setAttribute('aria-expanded','false');stopSpeaking();launcher.focus();
  });
  clear.addEventListener('click',()=>{
    history.length=0;log.textContent='';stopSpeaking();
    addMessage('medic',"Hey. EMTizzle here. Tell me what's heavy, or ask for a pep talk. No judgment.",'offline');
    setMode('offline');
  });
  form.addEventListener('submit',e=>{e.preventDefault();ask(input.value.trim())});
  panel.querySelectorAll('[data-pep]').forEach(b=>b.addEventListener('click',()=>ask(b.dataset.pep)));
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&!panel.hidden){panel.hidden=true;stopSpeaking();launcher.focus();}
  });
  addMessage('medic',"Hey. EMTizzle here. Your next step doesn't have to be huge. Ask for a little motivation or tell me what you're proud of.",'offline');
  setMode('offline');syncPage();
})();
