/* Job Goblin Application Desk: local-first resume routing and job application tracking.
   No personal resume file is uploaded to GitHub or Job Goblin servers. */
(()=>{
'use strict';
const KEY='job-goblin-desk-v1',DB='job-goblin-resume-store';
const el=id=>document.getElementById(id),trim=(x,n=1000)=>String(x||'').trim().slice(0,n);
const validUrl=value=>{try{const u=new URL(value);return /^https?:$/.test(u.protocol)?u.href:null}catch{return null}};
let state;try{state=JSON.parse(localStorage.getItem(KEY))||{}}catch{state={}}
state={profile:{},resumes:[],jobs:[],auto:false,...state};
if(!Array.isArray(state.jobs))state.jobs=[];
if(!Array.isArray(state.resumes))state.resumes=[];
let selected=null,dbRequest=null;
function save(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch{notice('Browser storage is unavailable; export the queue before leaving.')}}
function notice(s){el('jg-message').textContent=s}
function dbOpen(){
 if(dbRequest)return dbRequest;
 dbRequest=new Promise((resolve,reject)=>{
   if(!window.indexedDB)return reject(Error('Browser file storage is unavailable'));
   const r=indexedDB.open(DB,1);
   r.onupgradeneeded=()=>r.result.createObjectStore('resumes');
   r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
 });
 return dbRequest;
}
async function fileStorage(action,id,file){
 const db=await dbOpen();
 return new Promise((resolve,reject)=>{
   const tx=db.transaction('resumes',action==='get'?'readonly':'readwrite');
   const store=tx.objectStore('resumes');
   const r=action==='get'?store.get(id):action==='delete'?store.delete(id):store.put(file,id);
   r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
 });
}
function download(data,name){const u=URL.createObjectURL(data);const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),15000)}
function words(s){return new Set(trim(s,2000).toLowerCase().split(/[^a-z0-9]+/).filter(x=>x.length>2&&!['the','and','for','resume','job','jobs','andromeda','ambard'].includes(x)))}
function bestResume(job){
 let best='',max=0;const title=words(job.title+' '+(job.description||''));
 for(const r of state.resumes){const tags=words(r.name+' '+r.tags);let score=0;for(const word of title)if(tags.has(word))score++;if(score>max){best=r.id;max=score;}}
 return best||state.resumes[0]?.id||'';
}
function add(job,silent=false){
 const url=validUrl(job.url);if(!url){if(!silent)notice('Invalid job link; use an employer posting URL.');return false}
 const id=url.toLowerCase();
 const old=state.jobs.find(j=>j.id===id);if(old){if(!silent){selected=id;detail();notice('Already in the queue.')}return false}
 const j={id,url,title:trim(job.title,160)||'Job listing',company:trim(job.company,160),location:trim(job.location,160),resume:bestResume(job),status:'Ready to review',note:'',updated:new Date().toISOString()};
 state.jobs.unshift(j);state.jobs=state.jobs.slice(0,200);if(!silent)selected=id;
 save();renderQueue();if(!silent){detail();notice('Application added to queue. Choose the résumé and review the employer form.')};return true
}
const card=document.createElement('section');card.id='jg-desk';card.className='box';
card.innerHTML='<style>#jg-desk{border:2px solid #ff46aa;background:#21162d}#jg-desk textarea{width:100%;min-height:105px;box-sizing:border-box;background:#0e1020;color:#fff;border:1px solid #6f637e;border-radius:9px;padding:12px;font:inherit}#jg-desk .j-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}#jg-desk .j-row{border:1px solid #665574;border-radius:11px;margin:10px 0;padding:12px}#jg-desk .j-row button{margin:3px}#jg-desk .j-quiet{color:#c9c0d3}#jg-desk details{border:1px solid #5c4b68;border-radius:12px;padding:12px;margin:15px 0}#jg-desk summary{cursor:pointer;font-weight:850;color:#caff82}#jg-desk .j-muted{background:#3d2a4b;color:white}#jg-desk .j-danger{background:#44222e;color:white}#jg-desk input[type=checkbox]{width:auto}#jg-desk button,#jg-desk .btn{font-size:.85rem}#jg-message{color:#caff82;font-weight:800;min-height:1.5em}@media(max-width:600px){#jg-desk .j-grid{grid-template-columns:1fr}}</style>'+
'<h2>👹📨 JOB GOBLIN // APPLICATION DESK</h2>'+
'<p>Feed the Goblin your résumés. He will route job leads to the best-matching résumé, prepare a cover note, and track your applications. <strong>He cannot submit forms on external employers’ sites from this public webpage.</strong></p>'+
'<label><input type="checkbox" id="jg-auto"> AUTO-PREP every match from the job radar (no submissions)</label>'+
'<details open><summary>📂 MY RÉSUMÉ VAULT (private on this device)</summary><p class="j-quiet">Select multiple PDF, DOCX, or TXT résumés. Saved in this browser, never sent to Job Goblin or GitHub. Do not use on a shared device.</p><input type="file" id="jg-files" multiple accept=".pdf,.doc,.docx,.txt"><div id="jg-resumes"></div><p class="j-quiet">Add keywords under each résumé so the Goblin knows when to choose it. Example: EMT healthcare, Linux technician, or AI red team.</p></details>'+
'<details><summary>🪪 MY APPLICANT DETAILS</summary><p class="j-quiet">Optional. Stored locally. Never enter SSN, date of birth, or passwords.</p><div class="j-grid"><label>Full name<input id="jg-name" autocomplete="name"></label><label>Email<input id="jg-email" type="email" autocomplete="email"></label><label>Phone<input id="jg-phone" autocomplete="tel"></label><label>City / region<input id="jg-city"></label></div><label>Professional experience<textarea id="jg-exp" maxlength="2200"></textarea></label><label>Skills<textarea id="jg-skills" maxlength="1000"></textarea></label><button type="button" id="jg-save-profile">SAVE DETAILS</button><button type="button" id="jg-clear-profile" class="j-danger">CLEAR DETAILS</button></details>'+
'<details><summary>🔗 ADD A JOB FROM ANYWHERE</summary><div class="j-grid"><label>Title<input id="jg-title" placeholder="Data Center Technician"></label><label>Employer<input id="jg-company"></label><label>Job URL<input id="jg-url" type="url" placeholder="https://…"></label><label>Location<input id="jg-place"></label></div><button type="button" id="jg-add">📎 PREPARE APPLICATION</button></details>'+
'<p id="jg-message" aria-live="polite"></p><h3>🗂️ APPLICATION QUEUE <span id="jg-total"></span></h3><div id="jg-queue"></div>'+
'<button id="jg-export" type="button" class="j-muted">EXPORT TRACKER</button><button id="jg-clear" type="button" class="j-danger">CLEAR QUEUE</button>'+
'<div id="jg-detail"></div>';
const origin=el('hunt');if(!origin)return;origin.closest('section').after(card);
const fields=['name','email','phone','city','exp','skills'];
fields.forEach(f=>{el('jg-'+f).value=state.profile[f]||''});
el('jg-save-profile').onclick=()=>{const profile={};fields.forEach(f=>profile[f]=trim(el('jg-'+f).value,f==='exp'?2200:1000));state.profile=profile;save();notice('Private applicant details saved in this browser.')};
el('jg-clear-profile').onclick=()=>{if(!confirm('Erase profile details from this browser?'))return;state.profile={};fields.forEach(f=>el('jg-'+f).value='');save();notice('Profile cleared.')};
el('jg-auto').checked=!!state.auto;el('jg-auto').onchange=()=>{state.auto=el('jg-auto').checked;save();notice(state.auto?'Auto-prep enabled for subsequent job searches.':'Auto-prep disabled.')};
el('jg-files').onchange=async e=>{
 let count=0;
 for(const f of [...e.target.files].slice(0,25)){
   if(!/\.(pdf|doc|docx|txt)$/i.test(f.name)||f.size>8e6){notice('Skipped '+f.name+': unsupported format or larger than 8 MB.');continue}
   const key='resume-'+Date.now()+'-'+Math.random().toString(36).slice(2);
   try{await fileStorage('put',key,f);state.resumes.push({id:key,name:f.name,tags:f.name.replace(/[_\-.]+/g,' ').replace(/resume|andromeda|ambard/ig,'').trim()});count++}
   catch(err){notice('Could not save résumé in browser storage: '+err.message);break}
 }
 save();renderResumes();notice(count+' résumé(s) saved privately.');e.target.value=''
};
function renderResumes(){
 const host=el('jg-resumes');host.replaceChildren();
 if(!state.resumes.length){host.textContent='No résumés loaded yet.';return}
 for(const r of state.resumes){
   const d=document.createElement('div');d.className='j-row';const h=document.createElement('strong');h.textContent='📄 '+r.name;
   const l=document.createElement('label');l.textContent='Matching keywords';
   const inp=document.createElement('input');inp.value=r.tags||'';inp.maxLength=500;inp.onchange=()=>{r.tags=trim(inp.value,500);save()};l.append(inp);
   const dl=document.createElement('button');dl.type='button';dl.className='j-muted';dl.textContent='DOWNLOAD';dl.onclick=async()=>{try{const f=await fileStorage('get',r.id);if(!f)throw Error('File not found');download(f,r.name)}catch(e){notice(e.message)}};
   const rm=document.createElement('button');rm.type='button';rm.className='j-danger';rm.textContent='REMOVE';rm.onclick=async()=>{if(!confirm('Delete this résumé from local storage?'))return;await fileStorage('delete',r.id).catch(()=>{});state.resumes=state.resumes.filter(x=>x.id!==r.id);state.jobs.forEach(j=>{if(j.resume===r.id)j.resume=''});save();renderResumes();renderQueue();detail()};
   d.append(h,l,dl,rm);host.append(d)
 }
}
function choices(select,current){
 const none=document.createElement('option');none.value='';none.textContent='No résumé selected';select.append(none);
 for(const r of state.resumes){const o=document.createElement('option');o.value=r.id;o.textContent=r.name;select.append(o)}select.value=current||''
}
function renderQueue(){
 const host=el('jg-queue');host.replaceChildren();el('jg-total').textContent='('+state.jobs.length+')';
 if(!state.jobs.length){host.textContent='No jobs in queue yet. Search above or paste a job posting.';return}
 for(const j of state.jobs.slice(0,100)){
   const d=document.createElement('div');d.className='j-row',head=document.createElement('strong');head.textContent=j.title+' — '+(j.company||'Employer unknown');
   const desc=document.createElement('p');desc.className='j-quiet';desc.textContent=[j.location,j.status].filter(Boolean).join(' · ');
   const s=document.createElement('select');s.setAttribute('aria-label','Resume for '+j.title);choices(s,j.resume);s.onchange=()=>{j.resume=s.value;save();if(j.id===selected)detail()};
   const prep=document.createElement('button');prep.type='button';prep.textContent='📝 PREPARE';prep.onclick=()=>{selected=j.id;detail();el('jg-detail').scrollIntoView({behavior:'smooth',block:'nearest'})};
   const go=document.createElement('a');go.href=j.url;go.target='_blank';go.rel='noopener noreferrer';go.className='btn';go.textContent='↗ APPLICATION';go.onclick=()=>{j.status='Opened';j.updated=new Date().toISOString();save();renderQueue()};
   const status=document.createElement('select');status.setAttribute('aria-label','Status for '+j.title);
   for(const v of ['Ready to review','Opened','Submitted by me','Interview','Rejected','Skipped']){const o=document.createElement('option');o.value=v;o.textContent=v;status.append(o)}status.value=j.status;
   status.onchange=()=>{j.status=status.value;j.updated=new Date().toISOString();save();renderQueue()};
   const rm=document.createElement('button');rm.type='button';rm.className='j-danger';rm.textContent='×';rm.setAttribute('aria-label','Remove application');rm.onclick=()=>{state.jobs=state.jobs.filter(x=>x.id!==j.id);if(selected===j.id)selected=null;save();renderQueue();detail()};
   d.append(head,desc,s,prep,go,status,rm);host.append(d)
 }
}
function draft(j){
 const p=state.profile;
 return ['Hello hiring team,','',"I'm interested in the "+j.title+(j.company?' role at '+j.company:' role')+'.',p.exp?('My professional background includes '+p.exp.replace(/[.!?\s]+$/,'')+'.'):'I would welcome the opportunity to discuss my relevant experience.',p.skills?'My skills include '+p.skills.replace(/[.!?\s]+$/,'')+'.':'','Thank you for your consideration.','',p.name||'',p.email||''].filter(Boolean).join('\n');
}
function detail(){
 const host=el('jg-detail');host.replaceChildren();const j=state.jobs.find(x=>x.id===selected);if(!j)return;
 const h=document.createElement('h3');h.textContent='👹 APPLICATION PACKET: '+j.title;
 const note=document.createElement('p');note.className='j-quiet';note.textContent='Review carefully: this is a starter draft based on your own profile, not a verified assessment of the job requirements.';
 const textarea=document.createElement('textarea');textarea.value=j.note||draft(j);textarea.setAttribute('aria-label','Editable cover note');textarea.onchange=()=>{j.note=trim(textarea.value,6500);save()};
 const copy=document.createElement('button');copy.type='button';copy.textContent='📋 COPY NOTE';copy.onclick=async()=>{j.note=trim(textarea.value,6500);save();try{await navigator.clipboard.writeText(textarea.value);notice('Note copied to clipboard.')}catch{textarea.select();notice('Select and copy your note manually.')}};
 const resume=document.createElement('button');resume.type='button';resume.className='j-muted';resume.textContent='⬇ DOWNLOAD MATCHED RÉSUMÉ';resume.onclick=async()=>{const r=state.resumes.find(x=>x.id===j.resume);if(!r){notice('Choose a résumé for this job first.');return}try{const f=await fileStorage('get',r.id);if(!f)throw Error('Résumé file unavailable');download(f,r.name)}catch(e){notice(e.message)}};
 const apply=document.createElement('a');apply.className='btn';apply.href=j.url;apply.target='_blank';apply.rel='noopener noreferrer';apply.textContent='↗ OPEN FORM';
 const done=document.createElement('button');done.type='button';done.textContent='✅ I SUBMITTED IT';done.onclick=()=>{if(!confirm('Did you actually submit the application on the employer website?'))return;j.status='Submitted by me';j.note=trim(textarea.value,6500);j.updated=new Date().toISOString();save();renderQueue();notice('Recorded your submitted application.')};
 host.append(h,note,textarea,copy,resume,apply,done)
}
el('jg-add').onclick=()=>add({title:el('jg-title').value,company:el('jg-company').value,location:el('jg-place').value,url:el('jg-url').value});
el('jg-export').onclick=()=>download(new Blob([JSON.stringify({exported:new Date().toISOString(),applications:state.jobs},null,2)],{type:'application/json'}),'job-goblin-application-tracker.json');
el('jg-clear').onclick=()=>{if(!confirm('Delete the entire application queue from this browser?'))return;state.jobs=[];selected=null;save();renderQueue();detail();notice('Queue cleared.')};
renderResumes();renderQueue();
window.JobGoblinAgent={
 queueJob:job=>add(job),
 receiveResults:jobs=>{
   if(!state.auto||!Array.isArray(jobs))return;
   let count=0;for(const j of jobs.slice(0,20))if(add(j,true))count++;
   if(count){renderQueue();notice('👹 Auto-prepared '+count+' job(s). Check the selected résumés before applying.')}
 }
};
})();