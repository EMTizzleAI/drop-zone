/* Drop Zone // Shelter Tonight search. No API key, geolocation request, or stored location. */
(function(){
  'use strict';
  const dialog=document.getElementById('shelterTonightDialog');
  const input=document.getElementById('dzShelterArea');
  const refresh=document.getElementById('dzShelterRefresh');
  if(!dialog||!input)return;
  const fields={
    dzShelterMapsLink:'emergency homeless shelters',
    dzShelterParkingLink:'safe parking programs for people living in vehicles',
    dzShelterBudgetLink:'budget motels',
    dzShelterHotelsLink:'hotels'
  };
  function urlFor(what,area){
    const term=area?what+' in '+area:what+' near me';
    const url=new URL('https://www.google.com/maps/search/');
    url.searchParams.set('api','1');
    url.searchParams.set('query',term);
    return url.toString();
  }
  let timeout=null;
  window.updateShelterSearchLinks=function(){
    const area=input.value.trim().slice(0,90);
    for(const [id,query] of Object.entries(fields)){
      const link=document.getElementById(id);
      if(link)link.href=urlFor(query,area);
    }
    if(refresh){
      refresh.textContent='SEARCH UPDATED ✓';
      if(timeout)clearTimeout(timeout);
      timeout=setTimeout(()=>{refresh.textContent='UPDATE SEARCH ↗';},1900);
    }
  };
  window.openShelterTonight=function(){
    if(!dialog.open&&typeof dialog.showModal==='function'){
      dialog.showModal();
      window.updateShelterSearchLinks();
      const close=dialog.querySelector('.dz-shelter-close');
      if(close)close.focus({preventScroll:true});
    }
  };
  window.closeShelterTonight=function(){
    if(dialog.open)dialog.close();
  };
  input.addEventListener('input',()=>{window.updateShelterSearchLinks();});
  input.addEventListener('keydown',event=>{
    if(event.key==='Enter'){event.preventDefault();window.updateShelterSearchLinks();document.getElementById('dzShelterBudgetLink')?.focus();}
  });
  dialog.addEventListener('click',event=>{
    if(event.target===dialog)window.closeShelterTonight();
  });
  dialog.addEventListener('close',()=>{
    const trigger=document.querySelector('[data-status-need="sleep"]');
    if(trigger&&document.activeElement===document.body)trigger.focus({preventScroll:true});
  });
  window.updateShelterSearchLinks();
})();