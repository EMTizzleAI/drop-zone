/* Job Goblin public radar: resilient feed search, accessible results, honest fallbacks.
   No private profile data or resume files leave this page through the search feature. */
(()=>{
'use strict';
const el=id=>document.getElementById(id);
const form=el('hunt'),results=el('results'),status=el('status');
if(!form||!results||!status)return;
let searchNumber=0,activeController=null;
const clean=s=>String(s==null?'':s).trim();
const safeUrl=value=>{try{const u=new URL(value);return u.protocol==='https:'?u.href:null}catch{return null}};
const escapeWords=s=>clean(s).toLowerCase().match(/[a-z0-9+#.]+/g)||[];
const positiveNumber=n=>Number.isFinite(Number(n))&&Number(n)>0?Number(n):null;
function add(tag,parent,value,cls){
 const node=document.createElement(tag);
 if(cls)node.className=cls;
 if(value!==undefined&&value!==null)node.textContent=value;
 parent.append(node);
 return node;
}
function boardLinks(role,place,remote,container){
 add('h3',container,'🔗 KEEP HUNTING — DIRECT JOB SEARCHES');
 const query=(role+(remote?' remote':'')).trim();
 const links=[
  ['SEARCH INDEED ↗','https://www.indeed.com/jobs?q='+encodeURIComponent(query)+'&l='+encodeURIComponent(remote?'':place)],
  ['SEARCH LINKEDIN ↗','https://www.linkedin.com/jobs/search/?keywords='+encodeURIComponent(query)+'&location='+encodeURIComponent(remote?'United States':place)],
  ['SEARCH GOOGLE JOBS ↗','https://www.google.com/search?q='+encodeURIComponent(query+' jobs '+(remote?'United States':place))]
 ];
 if(remote)links.push(['BROWSE REMOTIVE ↗','https://remotive.com/remote-jobs']);
 for(const [label,href] of links){
  const a=add('a',container,label,'btn');a.href=href;a.target='_blank';a.rel='noopener noreferrer';
 }
 add('p',container,'Direct searches open job boards. They are not listings verified by Job Goblin.','hint');
}
async function readJSON(url,timeout,signal){
 const controller=new AbortController();
 const stop=()=>controller.abort();
 if(signal.aborted)controller.abort();
 else signal.addEventListener('abort',stop,{once:true});
 const timer=setTimeout(()=>controller.abort(),timeout);
 try{
  const response=await fetch(url,{signal:controller.signal,headers:{Accept:'application/json'}});
  if(!response.ok)throw new Error('HTTP '+response.status);
  return await response.json();
 }finally{clearTimeout(timer);signal.removeEventListener('abort',stop)}
}
function normalize(job,source){
 const url=safeUrl(job.url||job.apply_url||job.applyUrl||job.refs?.landing_page);
 const title=clean(job.title||job.name||job.position);
 if(!title||!url)return null;
 const location=clean(typeof job.location==='string'?job.location:job.location?.name||(job.locations||[]).map(x=>x.name).join(', ')||job.candidate_required_location||'');
 return {title,company:clean(typeof job.company==='string'?job.company:job.company?.name||job.company_name),
   location:location||'Location not supplied',url,salary:job.salary||null,
   source:clean(job.source)||source,remote:job.remote===true||job.remote==='true'||job.remoteStatus==='remote'||
   /remote|work from home|anywhere|worldwide/i.test(location),
   employmentType:clean(job.employmentType||job.employment_type).toLowerCase(),localMatch:source==='Job Goblin server'&&job.source==='VeritaHire'&&job.localMatch===true};
}
function salaryText(salary){
 if(!salary)return '';
 if(typeof salary==='string')return 'Listed pay: '+clean(salary).slice(0,160);
 if(typeof salary!=='object')return '';
 const min=positiveNumber(salary.min??salary.minimum);
 const max=positiveNumber(salary.max??salary.maximum);
 if(!min&&!max)return '';
 const fmt=n=>n==null?'':Math.round(n).toLocaleString('en-US');
 const range=min&&max?fmt(min)+'–'+fmt(max):min?'From '+fmt(min):'Up to '+fmt(max);
 return 'Listed pay: '+range+' '+clean(salary.currency||'')+(salary.interval?'/'+clean(salary.interval):'');
}
function hourlyMinimum(salary){
 if(!salary||typeof salary!=='object')return null;
 const min=positiveNumber(salary.min??salary.minimum);
 if(min===null)return null;
 const interval=clean(salary.interval||salary.period).toLowerCase();
 const factor=/year|annual/.test(interval)?2080:/month/.test(interval)?173.33:/week/.test(interval)?40:/day/.test(interval)?8:/hour/.test(interval)?1:null;
 return factor?min/factor:null;
}
function relevant(job,search){
 const tokens=escapeWords(search.role).filter(x=>!['jobs','job','remote','work','the','for','with','and'].includes(x));
 const title=job.title.toLowerCase(),company=job.company.toLowerCase();
 const aiEval=/\bai\b|\bllm\b|model evaluat|red.team|annotat|label|rater|video.?review|data trainer|ai train/i.test(search.role);
 const qaIntent=/\bqa\b|quality assurance|software test|game test/i.test(search.role);
 const aiTitles=/\bai\b|\bllm\b|model evaluat|red.team|annotat|label|rater|video.?review|data trainer|ai train/i.test(title);
 const qaTitles=/\bqa\b|quality assurance|software test|game test|test engineer/i.test(title);
 const emtIntent=/\bemt\b|emergency medical technician/i.test(search.role);
 const emtTitle=/\bemt\b|emergency medical technician|emergency department tech|emergency room tech|\bed tech\b|\ber tech\b/i.test(title);
 const matchedText=emtIntent?emtTitle:tokens.some(word=>title.includes(word)||company.includes(word));
 if(tokens.length&&!(matchedText||(aiEval&&aiTitles)||(qaIntent&&qaTitles)))return false;
 const where=job.location.toLowerCase();
 if(search.remote&&!job.remote)return false;
 if(!search.remote&&!job.localMatch&&search.place&&!/^(remote|anywhere)$/i.test(search.place)){
  const city=search.place.split(',')[0].trim().toLowerCase();
  const state=(search.place.split(',')[1]||'').trim().toLowerCase();
  const regional=state&&((state==='ca'&&/california/.test(where))||where.includes(state));
  if(city&&!where.includes(city)&&!regional&&!job.remote&&
    !/united states|usa|nationwide|anywhere|multiple locations/i.test(where))return false;
 }
 if(search.type&&search.type!=='remote'&&job.employmentType){
  const key=search.type.replaceAll(' ','_');
  if(job.employmentType.replaceAll(' ','_')!==key)return false;
 }
 if(search.pay&&hourlyMinimum(job.salary)!==null&&hourlyMinimum(job.salary)<search.pay)return false;
 return true;
}
function score(job,search){
 const title=job.title.toLowerCase();
 const term=search.role.toLowerCase();
 const city=search.place.split(',')[0].trim().toLowerCase();
 return (title.includes(term)?8:0)+escapeWords(term).filter(w=>title.includes(w)).length+
   (city&&job.location.toLowerCase().includes(city)?4:0)+(search.remote&&job.remote?3:0);
}
function jobCard(job){
 const d=add('article',results,undefined,'service');
 add('h3',d,job.title);
 add('p',d,[job.company,job.location].filter(Boolean).join(' · '));
 const pay=salaryText(job.salary);
 if(pay)add('p',d,pay);
 const attribution=add('p',d,undefined,'hint');
 attribution.append(document.createTextNode('Source: '));
 if(job.source==='VeritaHire'||job.source==='Himalayas'||job.source==='Remotive'){
  const credit=add('a',attribution,job.source);
  credit.href=job.source==='VeritaHire'?'https://veritahire.com/':job.source==='Himalayas'?'https://himalayas.app/':'https://remotive.com/';
  credit.target='_blank';credit.rel='noopener noreferrer';
 }else attribution.append(document.createTextNode(job.source));
 attribution.append(document.createTextNode(job.remote?' · Marked remote (check country eligibility)':''));
 const a=add('a',d,'VIEW JOB & APPLY ↗');a.href=job.url;a.target='_blank';a.rel='noopener noreferrer';
 if(window.JobGoblinAgent){
  const b=add('button',d,'👹 PREPARE APPLICATION');
  b.type='button';b.addEventListener('click',()=>window.JobGoblinAgent.queueJob(job));
 }
}
function render(jobs,search,completed,errors){
 results.replaceChildren();
 if(jobs.length){
  add('h2',results,'📡 '+jobs.length+' MATCHING LEAD'+(jobs.length===1?'':'S'));
  for(const j of jobs)jobCard(j);
  add('p',results,'Listings come from third-party feeds. Verify posting dates, location eligibility, job duties and pay directly with the employer.','hint');
  status.textContent='👹 RADAR SWEEP COMPLETE: '+jobs.length+' lead'+(jobs.length===1?'':'s')+' displayed from '+completed+' responding source'+(completed===1?'':'s')+'.';
 }else{
  add('h2',results,'👹 NOTHING MATCHED THE GOBLIN RADAR THIS TIME');
  add('p',results,completed
   ?'The connected feeds returned no matching listings. That does not mean no jobs are available.'
   :'The connected feeds could not be reached right now. You can still search directly below.');
  status.textContent=completed?'📡 NO MATCHES IN LIMITED FEEDS — TRY DIRECT SEARCHES BELOW!':'📡 FEEDS UNAVAILABLE — DIRECT SEARCH LINKS READY!';
 }
 if(errors.length){
  const d=add('details',results,undefined,'hint');
  add('summary',d,'Feed status: '+errors.length+' source'+(errors.length===1?'':'s')+' unavailable');
  add('p',d,'Some external job feeds restrict browser access or temporarily time out. Your search is not a guarantee that jobs do not exist.');
  for(const error of errors)add('p',d,error);
 }
 boardLinks(search.role,search.place,search.remote,results);
 if(search.pay)add('p',results,'Requested minimum: $'+search.pay+'/hr. Listings with unpublished or non-comparable pay may still appear.','hint');
}
async function scan(search,id,signal){
 const qs=new URLSearchParams({q:search.role,location:search.remote?'':search.place});
 const jobs=[];
 let completed=0,checked=0;
 const errors=[];
 const feeds=[
  {name:'Job Goblin server',timeout:16000,url:'https://pantry-goblin.vercel.app/api/jobs?'+qs,
   map:data=>{if(!Array.isArray(data.jobs))throw Error('Bad server response');return data.jobs;},proxy:true},
  ...(search.remote?[{name:'Remotive',timeout:12000,
   url:'https://remotive.com/api/remote-jobs?'+new URLSearchParams({search:/annotat|label/i.test(search.role)?'annotation':/qa|test/i.test(search.role)?'QA':/support/i.test(search.role)?'support':/ai|llm|red.team|model/i.test(search.role)?'AI':search.role.split(/\s+/)[0],limit:'100'}),
   map:data=>{if(!Array.isArray(data.jobs))throw Error('Bad feed response');return data.jobs.map(j=>({...j,location:j.candidate_required_location||'Remote',remote:true}));}}]:[]),
  {name:'Arbeitnow',timeout:11000,url:'https://www.arbeitnow.com/api/job-board-api',
   map:data=>{if(!Array.isArray(data.data))throw Error('Bad feed response');return data.data;}}
 ];
 const work=feeds.map(async feed=>{
  try{
   const payload=await readJSON(feed.url,feed.timeout,signal);
   const rows=feed.map(payload);
   const cleanRows=rows.map(j=>normalize(j,feed.name)).filter(Boolean);
   if(feed.proxy&&Array.isArray(payload.diagnostics)){
    if(!payload.diagnostics.length)throw Error('No upstream feed diagnostics');
    for(const d of payload.diagnostics){
     if(d.ok===true)completed++;
     else errors.push(clean(d.source||'Upstream source')+(d.error?' ('+clean(d.error).slice(0,100)+')':''));
    }
   }else completed++;
   jobs.push(...cleanRows);
  }catch(err){if(!signal.aborted)errors.push(feed.name)}
  finally{
   checked++;
   if(id===searchNumber&&!signal.aborted)status.textContent='👹 Searching job feeds… '+checked+'/'+feeds.length+' checked. Direct job-board links are ready below.';
  }
 });
 await Promise.all(work);
 if(id!==searchNumber||signal.aborted)return;
 const unique=new Map();
 for(const job of jobs){
  const key=job.url.toLowerCase().replace(/\/$/,'');
  if(!unique.has(key))unique.set(key,job);
 }
 const allJobs=[...unique.values()];
 const matched=allJobs.filter(j=>relevant(j,search))
  .sort((a,b)=>score(b,search)-score(a,search)).slice(0,25);
 if(window.JobGoblinAgent)window.JobGoblinAgent.receiveResults(matched);
 render(matched,search,completed,errors);
 if(!matched.length&&allJobs.length){
  add('p',results,'The radar checked '+allJobs.length+' listings, but none passed this search. Try shorter keywords (EMT, ER tech, warehouse, QA) and remove pay/type filters if needed.','hint');
 }

}
function startSearch(){
 const role=clean(el('role').value),place=clean(el('place').value);
 if(!role){el('role').focus();return}
 const type=el('type').value,remote=el('remote-only').checked||type==='remote'||/^(remote|work from home)$/i.test(place);
 const search={role,place,remote,type,pay:positiveNumber(el('pay').value)||0};
 if(activeController)activeController.abort();
 activeController=new AbortController();
 const id=++searchNumber;
 results.replaceChildren();
 add('p',results,'☕ Goblin is checking the feeds. You can open direct searches right now.','hint');
 boardLinks(role,place,remote,results);
 status.textContent='📡 SCANNING CONNECTED JOB FEEDS…';
 scan(search,id,activeController.signal).catch(err=>{
  if(id!==searchNumber)return;
  render([],search,0,['Unexpected feed error']);
  console.warn('Job Goblin scan error:',err);
 });
}
form.addEventListener('submit',e=>{e.preventDefault();startSearch()});
document.querySelectorAll('[data-goblin-role]').forEach(b=>{
 b.addEventListener('click',()=>{
  el('role').value=b.dataset.goblinRole;
  el('place').value=b.dataset.goblinPlace||'';
  el('remote-only').checked=b.dataset.goblinRemote==='yes';
  el('type').value='';
  startSearch();
 });
});
})();