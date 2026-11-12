import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
const port = process.env.GURU_CHROME_DEBUG_PORT || '9535';
const appUrl = process.env.GURU_APP_URL || 'http://127.0.0.1:9531/';
const out = 'artifacts/company-target-audience'; mkdirSync(out, { recursive: true });
const hash = value => createHash('sha256').update(value).digest('hex');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
class Cdp {
  constructor(url) { this.socket = new WebSocket(url); this.id = 0; this.tasks = new Map(); this.ready = new Promise((resolve, reject) => { this.socket.addEventListener('open', resolve, { once: true }); this.socket.addEventListener('error', reject, { once: true }); }); this.socket.addEventListener('message', event => { const message = JSON.parse(event.data); const task = this.tasks.get(message.id); if (!task) return; this.tasks.delete(message.id); clearTimeout(task.timer); message.error ? task.reject(new Error(message.error.message)) : task.resolve(message.result); }); }
  async call(method, params = {}) { await this.ready; return new Promise((resolve, reject) => { const id = ++this.id; const timer = setTimeout(() => reject(new Error(`CDP timeout ${method}`)), 120000); this.tasks.set(id, { resolve, reject, timer }); this.socket.send(JSON.stringify({ id, method, params })); }); }
  close() { this.socket.close(); }
}
const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
const browser = new Cdp(version.webSocketDebuggerUrl);
const { browserContextId } = await browser.call('Target.createBrowserContext');
const { targetId } = await browser.call('Target.createTarget', { url: 'about:blank', browserContextId, width: 1440, height: 1000 });
const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const page = new Cdp(tabs.find(tab => tab.id === targetId).webSocketDebuggerUrl);
const evaluate = async expression => { const response = await page.call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text); return response.result.value; };
const screenshot = async name => { await page.call('Page.bringToFront'); const image = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); writeFileSync(`${out}/${name}.png`, Buffer.from(image.data, 'base64')); };
const files = ['/private/tmp/guru-now-korich-workspace.json','/private/tmp/guru-step6-icleaning-workspace.json','/private/tmp/guru-step6-sivrce-workspace.json','/private/tmp/guru-step6-guru-workspace.json'];
const results = [];
try {
 await page.call('Runtime.enable'); await page.call('Page.enable');
 await page.call('Page.addScriptToEvaluateOnNewDocument', { source: `const mem=new Map();Storage.prototype.getItem=function(k){return mem.get(String(k))??null};Storage.prototype.setItem=function(k,v){mem.set(String(k),String(v))};const f=fetch.bind(window);window.fetch=(u,i)=>String(u).includes('/api/')?Promise.resolve(new Response(JSON.stringify({ok:true,projects:[],workspaces:[]}))):f(u,i);` });
 await page.call('Page.navigate', { url: appUrl });
 for(let i=0;i<300;i++){ if(await evaluate('document.readyState==="complete"&&typeof guruTargetAudienceViewHtml==="function"')) break; await wait(100); }
 await evaluate('rememberAccessUnlocked();setAccessState(true);bootstrapAppOnce();scheduleCloudSync=()=>{};scheduleProjectsCloudSync=()=>{};true');
 for(let index=0;index<files.length;index++){
  const raw=JSON.parse(readFileSync(files[index])),source=raw.workspace||raw.content||raw;
  await evaluate(`(()=>{guruCancelDerivedRefresh();activeProjectId=${JSON.stringify(source.project.id)};state=guruExportWithoutPersistenceV223(()=>migrateWorkspace(${JSON.stringify(source)},${JSON.stringify(source.project.id)}));activeView='gate';activeGateId='gate-1';return true})()`);
  const before = hash(await evaluate('JSON.stringify((({ui,updatedAt,_guruTabId,...business})=>business)(state))'));
  const baseline = await evaluate(`(()=>{const m=state.targetAudience||{segments:[]};const segments=Array.isArray(m.segments)?m.segments:[];const before=segments.map(s=>['name','who','need','jtbd','problem','criteria','objections','value'].filter(k=>targetAudienceResolvedValue(s,k).trim()).length);const after=targetAudienceStatus(m);const corrupt=segments.flatMap((s,i)=>['name','who','need','jtbd','problem','criteria','objections','value'].filter(k=>String(s[k]||'').includes('\uFFFD')).map(k=>({index:i+1,field:k})));return {oldFilled:before.reduce((a,b)=>a+b,0),oldTotal:segments.length*8,newStatus:after,corrupt}})()`);
  const readiness = await evaluate(`nowGuideWithReadPass(()=>{const all=nowGuideBuildAllBlocks();const total=list=>nowGuideLaunchReadiness(list);const old=state.targetAudience?.segments||[];const oldFilled=old.reduce((sum,segment)=>sum+['name','who','need','jtbd','problem','criteria','objections','value'].filter(key=>targetAudienceResolvedValue(segment,key).trim()).length,0);const oldTotal=old.length*8;const baselineOldAudienceStatus=!oldFilled?'not_started':oldFilled===oldTotal?'ready':'in_progress';return {gate1:total(all.filter(item=>item.gateId==='gate-1')),launch:total(nowGuidePreflightPath(all)),oldAudienceStatus:baselineOldAudienceStatus,newAudienceStatus:targetAudienceStatus(state.targetAudience).status}})`);
  const pure = await evaluate(`(()=>{const v=guruAudienceScreen();v.open=true;document.body.classList.remove('access-locked');document.body.innerHTML='<main id="contentArea" style="max-width:1100px;margin:30px auto;display:block">'+targetAudienceHtml()+'</main>';document.body.style.background='#fff';window.scrollTo(0,0);const content=document.querySelector('#contentArea');const html=content.innerHTML;const p=guruTargetAudienceDerive(state.targetAudience,{...v,workspace:state});return {rows:content.querySelectorAll('[data-audience-row]').length,tabs:content.querySelectorAll('[data-audience-tab]').length,hasOld:html.includes('Автозаполнение включено')||html.includes('Идентификация'),zones:p.zones.map(z=>({key:z.key,sign:z.sign,title:z.title,filled:z.filled})),linked:Boolean(p.linked)}})()`);
  assert(!pure.hasOld);
  if(pure.zones.length){
   assert.deepEqual(pure.zones.map(zone=>zone.key),['need','benefits','result'],'offer formula is out of order');
   assert.deepEqual(pure.zones.map(zone=>`${zone.sign}${zone.title}`),['Потребность','+Выгоды','=Единый оффер компании'],'offer formula labels differ from the data flow');
  }
  if(index===0){
   await screenshot('01-segment-collapsed');
   const controls = await evaluate(`(()=>{const panel=document.querySelector('.target-audience-panel');const toggle=panel.querySelector('[data-audience-link-toggle]');const popover=panel.querySelector('[data-audience-link-popover]');const initiallyHidden=popover.hidden;toggle.click();const opened=!popover.hidden&&document.activeElement===popover.querySelector('select');popover.querySelector('select').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));return {initiallyHidden,opened,closed:popover.hidden&&document.activeElement===toggle,named:[...panel.querySelectorAll('.target-audience-icon')].every(node=>node.getAttribute('aria-label'))}})()`);
   assert(controls.initiallyHidden&&controls.opened&&controls.closed&&controls.named,'icon actions or source popover are inaccessible');
   const isolated = await evaluate(`(()=>{window.__audienceOtherRow=document.querySelector('[data-audience-row="criteria"]');const row=document.querySelector('[data-audience-row="problem"]');const preview=row.querySelector('.target-audience-row-main').textContent;row.querySelector('[data-audience-expand]')?.click();const key='gate-1|target-audience|row|'+state.targetAudience.segments[0].id+':problem';return {same:window.__audienceOtherRow===document.querySelector('[data-audience-row="criteria"]'),detail:!!document.querySelector('[data-audience-row="problem"] .target-audience-detail'),duplicate:[...document.querySelectorAll('[data-audience-row="problem"] .target-audience-detail li')].some(li=>preview.includes(li.textContent.trim())),persisted:state.ui.disclosureOpenV512[key]===true}})()`);
   assert(isolated.same&&isolated.detail&&!isolated.duplicate&&isolated.persisted,'expanding a row replaced another row, repeated the preview or lost its preference');
   await screenshot('02-expanded-row');
   await evaluate(`(()=>{guruAudienceStartEdit('problem',state.targetAudience.segments[0].id);return true})()`);
   await screenshot('03-inline-editor');
   const draftOnly = await evaluate(`(()=>{const editor=document.querySelector('[data-audience-editor="problem"]');const original=editor.value;editor.value=original+'\\nТест черновика';editor.dispatchEvent(new Event('input',{bubbles:true}));const unchanged=String(state.targetAudience.segments[0].problem||'').includes('Тест черновика')===false;editor.value=original;editor.blur();return unchanged})()`);
   assert(draftOnly,'input wrote to project before blur');
   await evaluate(`(()=>{document.querySelector('[data-audience-row="rational"]')?.scrollIntoView({block:'center'});return true})()`);
   await screenshot('04-gate0-source-fallback');
  }
  if(index===1) await screenshot('05-icleaning');
  if(index===3){ await screenshot('06-no-segments'); await evaluate(`(()=>{const old=state.targetAudience;state.targetAudience={version:2,open:true,autoSeedDismissed:true,segments:[targetAudienceBlankSegment()]};const v=guruAudienceScreen();v.activeId='';document.querySelector('#contentArea').innerHTML=targetAudienceHtml();state.targetAudience=old;return true})()`); await screenshot('07-empty-segment'); }
  const after = hash(await evaluate('JSON.stringify((({ui,updatedAt,_guruTabId,...business})=>business)(state))'));
  assert.equal(after,before,`${source.project.name}: view changed business data`);
  results.push({name:source.project.name,hashBefore:before,hashAfter:after,baseline,readiness,pure});
  console.log(source.project.name+': PASS');
 }
 writeFileSync(`${out}/smoke-results.json`,JSON.stringify(results,null,2));
} finally { await browser.call('Target.disposeBrowserContext',{browserContextId}).catch(()=>{}); page.close(); browser.close(); }
