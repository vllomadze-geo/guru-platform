import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const port = process.env.GURU_CHROME_DEBUG_PORT || '9535';
const appUrl = process.env.GURU_APP_URL || 'http://127.0.0.1:3000/';
const fixturePath = process.env.GURU_NOW_KORICH_FIXTURE || '/private/tmp/guru-now-korich-workspace.json';
const fixtureBytes = readFileSync(fixturePath);
const sourceHash = createHash('sha256').update(fixtureBytes).digest('hex');
const fixture = JSON.parse(fixtureBytes);
const output = process.env.GURU_GATE1_PERF_ARTIFACTS || 'artifacts/gate1-responsiveness/verified';
mkdirSync(output, { recursive: true });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url); this.id = 0; this.pending = new Map(); this.errors = [];
    this.ready = new Promise((resolve, reject) => { this.socket.addEventListener('open', resolve, { once: true }); this.socket.addEventListener('error', reject, { once: true }); });
    this.socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.method === 'Runtime.exceptionThrown') this.errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
      const task = this.pending.get(message.id); if (!task) return;
      this.pending.delete(message.id); clearTimeout(task.timer);
      if (message.error) task.reject(new Error(message.error.message)); else task.resolve(message.result);
    });
  }
  async call(method, params = {}) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const id = ++this.id, timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 30000);
      this.pending.set(id, { resolve, reject, timer }); this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.socket.close(); }
}
const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
const browser = new Cdp(version.webSocketDebuggerUrl);
const { browserContextId } = await browser.call('Target.createBrowserContext');
const { targetId } = await browser.call('Target.createTarget', { url: 'about:blank', browserContextId });
const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const page = new Cdp(tabs.find(tab => tab.id === targetId).webSocketDebuggerUrl);
const evaluate = async expression => {
  const result = await page.call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
};
const waitFor = async expression => {
  const start = Date.now();
  while (Date.now() - start < 30000) { if (await evaluate(expression)) return; await delay(100); }
  throw new Error(`Timeout: ${expression}`);
};
const screenshot = async name => {
  const image = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  writeFileSync(`${output}/${name}.png`, Buffer.from(image.data, 'base64'));
};

const report={sourceSha256:sourceHash,steps:[]};
try{
 await page.call('Page.enable');await page.call('Runtime.enable');await page.call('Page.bringToFront');
 await page.call('Emulation.setDeviceMetricsOverride',{width:1800,height:1100,deviceScaleFactor:1,mobile:false});
 await page.call('Page.addScriptToEvaluateOnNewDocument',{source:`const nativeFetch=window.fetch.bind(window);window.fetch=(u,i)=>String(u).includes('/api/')?Promise.resolve(new Response(JSON.stringify({ok:true,projects:[],workspaces:[]}),{status:200,headers:{'Content-Type':'application/json'}})):nativeFetch(u,i);const memory=new Map();Storage.prototype.getItem=function(k){return memory.get(String(k))??null};Storage.prototype.setItem=function(k,v){memory.set(String(k),String(v))};Storage.prototype.removeItem=function(k){memory.delete(String(k))};Storage.prototype.clear=function(){memory.clear()};`});
 await page.call('Page.navigate',{url:appUrl});await waitFor('document.readyState==="complete"&&typeof nowGuideBuildPath==="function"');
 await evaluate(`(()=>{
 rememberAccessUnlocked();setAccessState(true);bootstrapAppOnce();scheduleCloudSync=()=>{};scheduleProjectsCloudSync=()=>{};
 state=${JSON.stringify(fixture.workspace||fixture)};activeProjectId=state.project.id;
 guruExportWithoutPersistenceV223(()=>{state=migrateWorkspace(state,activeProjectId)});
 projects=[{id:activeProjectId,name:state.project.name,lifecycleStatus:'active'}];updateProjectChrome();els.launcher.hidden=true;els.appShell.hidden=false;
 getGate1AccordionState().subblocks.company_demand_positioning=false;
 activeView='gate';activeGateId='gate-1';guruRenderedGateId=null;guruResetGateNavigationState();
 guruExportWithoutPersistenceV223(()=>renderGateNav({recalculate:false}));guruNavigateToGate('gate-1');return true})()`);
 await waitFor('guruRenderedGateId==="gate-1"');await delay(500);
 await evaluate(`(()=>{guruCancelDerivedRefresh();guruDiscardUiPreferenceSave(activeProjectId);if(_saveTimer){clearTimeout(_saveTimer);_saveTimer=null;}
 window.__perfCalls={};window.__perfOn=false;window.__longTasks=[];new PerformanceObserver(list=>{if(window.__perfOn)window.__longTasks.push(...list.getEntries().map(e=>({start:e.startTime,ms:e.duration}))) }).observe({type:'longtask',buffered:false});
 for(const name of ['renderGate','renderGate1Accordion','renderGateNav','guruReadinessInspect','guruV194Records','guruGateBlockStatuses','nowGuideGate1Blocks','nowGuideGate1Refresh','nowGuideBuildAllBlocks','nowGuideRender','guruExportDiagnosticCloneV223','gate1CompanyDemandPositioningCompletionV357','ensureTargetAudience','guruPersistStateFast','guruQueueWorkspaceSave','guruAutosizeVisible']){const original=window[name];if(typeof original!=='function')continue;window[name]=function(...args){if(!window.__perfOn)return original.apply(this,args);const t=performance.now();try{return original.apply(this,args)}finally{const row=window.__perfCalls[name]||={count:0,ms:0};row.count++;row.ms+=performance.now()-t}}}
 return true})()`);
 await page.call('Profiler.enable');await page.call('Profiler.start');
 const act=async(label,code)=>{
  const r=await evaluate(`(async()=>{window.__perfOn=true;window.__perfCalls={};window.__longTasks=[];const t=performance.now();${code};const syncMs=performance.now()-t;await new Promise(r=>requestAnimationFrame(()=>setTimeout(r,0)));const paintMs=performance.now()-t;const calls=window.__perfCalls;window.__perfOn=false;return {label:${JSON.stringify(label)},syncMs,paintMs,calls}})()`);
  report.steps.push(r);writeFileSync(`${output}/partial.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(r));return r;
 };
 await act('company-first-open',`document.querySelector('[data-gate1-toggle-section="company_demand_positioning"]').click()`);
 await act('company-close',`document.querySelector('[data-gate1-toggle-section="company_demand_positioning"]').click()`);
 await act('company-reopen',`document.querySelector('[data-gate1-toggle-section="company_demand_positioning"]').click()`);
 await act('demand-open',`document.querySelector('[data-pv181-company-demand-details-v345] summary').click()`);
 await evaluate(`(()=>{window.__a=document.querySelector('[data-pv181-company-demand-input-v345]');window.__b=document.querySelectorAll('[data-pv181-company-demand-input-v345]')[1];window.__a.focus();window.__aBefore=window.__a.value;return true})()`);
 for(let i=0;i<3;i++)await act('demand-type-'+i,`window.__a.value+='1';window.__a.dispatchEvent(new Event('input',{bubbles:true}))`);
 await act('cell-switch',`window.__a.dispatchEvent(new Event('change',{bubbles:true}));window.__b.focus()`);
 report.demandIntegrity=await evaluate(`({aConnected:window.__a.isConnected,bConnected:window.__b.isConnected,focused:document.activeElement===window.__b,value:window.__a.value,expected:window.__aBefore+'111',visible:!!window.__b.offsetParent})`);report.demandStable=report.demandIntegrity.aConnected&&report.demandIntegrity.bConnected&&report.demandIntegrity.focused&&report.demandIntegrity.value===report.demandIntegrity.expected;
 await act('audience-open',`const b=document.querySelector('[data-target-audience-toggle]');if(b.getAttribute('aria-expanded')!=='true')b.click();const c=document.querySelector('[data-target-audience-card-toggle]');if(c&&c.getAttribute('aria-expanded')!=='true')c.click()`);
 await evaluate(`(()=>{window.__aud=document.querySelector('[data-target-audience-field="need"]');window.__aud.focus();window.__audBefore=window.__aud.value;return true})()`);
 for(let i=0;i<3;i++)await act('audience-type-'+i,`window.__aud.value+='т';window.__aud.dispatchEvent(new Event('input',{bubbles:true}))`);
 report.audienceStable=await evaluate(`window.__aud.isConnected&&document.activeElement===window.__aud&&window.__aud.value===window.__audBefore+'ттт'`);
 const profile=(await page.call('Profiler.stop')).profile;writeFileSync(`${output}/actions.cpuprofile`,JSON.stringify(profile));
 await evaluate('window.__perfCalls={};window.__perfOn=true;true');
 await delay(2200);
 report.deferredCalls=await evaluate('window.__perfOn=false;window.__perfCalls');
 await waitFor('!guruWorkspaceSaveJobs.size&&!nowGuideGate1RefreshTask');
 report.saved=await evaluate(`(()=>{const saved=JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_PREFIX+activeProjectId));
 const field=window.__a.dataset.pv181CompanyDemandFieldV345, rowId=window.__a.dataset.pv181CompanyDemandRowIdV345;
 const row=gate1CompanyBrandDemandReconcileV345(saved).rows.find(r=>r.id===rowId);
 const audience=saved.targetAudience?.segments?.find(r=>r.id===window.__aud.dataset.targetAudienceSegment);
 return {demand:row?.[field],expectedDemand:window.__a.value,audience:audience?.need,expectedAudience:window.__aud.value};})()`);
 assert.equal(report.saved.demand,report.saved.expectedDemand,'Demand metric must persist');
 assert.equal(report.saved.audience,report.saved.expectedAudience,'Audience field must persist');
 report.matrix=await evaluate(`nowGuideWithReadPass(()=>{const gate=state.gates.find(g=>g.id==='gate-1');
 const rows=nowGuideDisplayedPath.filter(i=>i.gateId===gate.id).map(i=>({id:i.id,status:i.status,
 badge:[...(nowGuideGate1Node(i)?.querySelector('.status-pill')?.classList||[])].find(c=>c.startsWith('status-')&&c!=='status-pill')?.slice(7)}));
 return {rows,summary:guruGateReadiness(gate),menu:document.querySelector('[data-gate-id="gate-1"] .small').textContent};})`);
 assert(report.matrix.rows.every(r=>guruStatus(r.status)===guruStatus(r.badge)),JSON.stringify(report.matrix));
 assert.equal(report.matrix.rows.length,report.matrix.summary.total);
 assert.equal(report.matrix.rows.filter(r=>['ready','not_required'].includes(r.status)).length,report.matrix.summary.done);
 assert(report.matrix.menu.includes(report.matrix.summary.percent+'%'));
 report.final=await evaluate(`({build:GURU_BUILD_INFO.version,gate:activeGateId,errors:[],status:document.querySelector('[data-gate-id="gate-1"] .small')?.textContent,step:document.querySelector('#nowGuide')?.innerText.slice(0,120)})`);
 await evaluate(`document.querySelector('[data-gate1-toggle-section="company_demand_positioning"]').scrollIntoView({block:'start',behavior:'instant'});true`);await screenshot('demand');
 await evaluate(`window.__aud.scrollIntoView({block:'center',behavior:'instant'})`);await screenshot('audience');
 // Exercise the native input/blur pipeline as well as timed event dispatch.
 await evaluate(`window.__aud.focus();window.__aud.setSelectionRange(window.__aud.value.length,window.__aud.value.length);true`);
 await page.call('Input.insertText',{text:' Проверка ввода'});
 await page.call('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
 await page.call('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
 report.nativeInput=await evaluate(`({connected:window.__aud.isConnected,value:window.__aud.value,expected:window.__audBefore+'ттт Проверка ввода',focusMoved:document.activeElement!==window.__aud})`);
 assert(report.nativeInput.connected&&report.nativeInput.focusMoved);
 assert.equal(report.nativeInput.value,report.nativeInput.expected);
 // Every lazily mounted body must keep the surrounding editor and bind live data.
 report.lazy=[];
 for(const key of ['pain_jtbd_offer','unit_economics']){
  await evaluate(`(()=>{const button=document.querySelector('[data-gate1-toggle-section="${key}"]');const body=gate1AccordionBodyV302(gate1AccordionContainerV302(button,'section'),'section');body?.remove();getGate1AccordionState().subblocks['${key}']=false;button.setAttribute('aria-expanded','false');if('${key}'==='unit_economics')nowGuideGate1PassiveCalculators=true;return true;})()`);
  const result=await act('lazy-'+key,`const button=document.querySelector('[data-gate1-toggle-section="${key}"]');if(!button)throw Error('Missing section ${key}');if(button.getAttribute('aria-expanded')!=='true')button.click()`);
  assert(!result.calls.renderGate,`Section ${key} rerendered the screen`);
  report.lazy.push(await evaluate(`(()=>{const b=document.querySelector('[data-gate1-toggle-section="${key}"]');const body=gate1AccordionBodyV302(gate1AccordionContainerV302(b,'section'),'section');return {key:'${key}',mounted:!!body,open:!!body&&!body.hidden,previousEditorKept:window.__aud.isConnected};})()`));
 }
 await evaluate(`(()=>{window.__lazyCardButton=[...document.querySelectorAll('[data-gate1-toggle-card]')].find(b=>!gate1AccordionBodyV302(gate1AccordionContainerV302(b,'card'),'card'));if(!window.__lazyCardButton)throw Error('No closed card to verify');return true;})()`);
 const cardOpen=await act('lazy-card',`window.__lazyCardButton.click()`);
 assert(!cardOpen.calls.renderGate,'Opening a card must preserve the screen');
 report.lazy.push(await evaluate(`(()=>{const body=gate1AccordionBodyV302(gate1AccordionContainerV302(window.__lazyCardButton,'card'),'card');window.__lazyField=[...body.querySelectorAll('input,textarea')].find(n=>!n.disabled&&!n.readOnly&&n.type!=='hidden');return {key:window.__lazyCardButton.dataset.gate1ToggleCard,mounted:!!body,open:!body.hidden,previousEditorKept:window.__aud.isConnected,editable:!!window.__lazyField};})()`));
 assert(report.lazy.every(r=>r.mounted&&r.open&&r.previousEditorKept),JSON.stringify(report.lazy));
 report.calculators=await evaluate(`[...document.querySelectorAll('iframe[data-brown-calculator]')].map(frame=>({bound:frame.dataset.nowGuideCalculatorBound==='1'}))`);
 assert(report.calculators.every(frame=>frame.bound),'Lazy calculators must track explicit edits');
 assert(report.lazy.at(-1).editable,'Lazy card has no editable field');
 await evaluate(`window.__lazyField.value='gate1-lazy-smoke';window.__lazyField.dispatchEvent(new Event('input',{bubbles:true}));window.__lazyField.dispatchEvent(new Event('change',{bubbles:true}));true`);
 assert(await evaluate(`JSON.stringify(state).includes('gate1-lazy-smoke')`),'Lazy card handler must edit live workspace');
 // Closing the tab while a disclosure save is in the worker still saves the latest values.
 report.pagehide=await evaluate(`(()=>{guruScheduleUiPreferenceSave();guruFlushUiPreferenceSave();const inFlight=guruUiPreferenceInFlight.size;
 window.dispatchEvent(new PageTransitionEvent('pagehide'));
 const saved=JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_PREFIX+activeProjectId));
 return {inFlight,flushed:!guruUiPreferenceInFlight.size,hasNativeInput:saved.targetAudience.segments.some(s=>s.need===window.__aud.value),hasLazyEdit:JSON.stringify(saved).includes('gate1-lazy-smoke')};})()`);
 assert(report.pagehide.inFlight>0&&report.pagehide.flushed&&report.pagehide.hasNativeInput&&report.pagehide.hasLazyEdit,JSON.stringify(report.pagehide));
 await waitFor('!guruWorkspaceSaveJobs.size');
 assert(await evaluate(`localStorage.getItem(WORKSPACE_STORAGE_PREFIX+activeProjectId).includes('gate1-lazy-smoke')`),'Late worker reply overwrote the edit');
 report.discardedSave=await evaluate(`(()=>{guruScheduleUiPreferenceSave();guruFlushUiPreferenceSave();const hadPending=!!guruUiPreferenceInFlight.size;guruDiscardUiPreferenceSave(activeProjectId);return hadPending&&!guruUiPreferenceInFlight.has(activeProjectId);})()`);
 assert(report.discardedSave,'Discarded project must not remain in the pagehide save queue');
 assert.equal(createHash('sha256').update(readFileSync(fixturePath)).digest('hex'),sourceHash);assert.deepEqual(page.errors,[]);writeFileSync(`${output}/results.json`,JSON.stringify(report,null,2));assert(report.demandStable&&report.audienceStable,JSON.stringify(report.demandIntegrity));
 const median=values=>values.sort((a,b)=>a-b)[Math.floor(values.length/2)];
 report.medians={demand:median(report.steps.filter(s=>s.label.startsWith('demand-type')).map(s=>s.paintMs)),audience:median(report.steps.filter(s=>s.label.startsWith('audience-type')).map(s=>s.paintMs))};
 assert(report.medians.demand<250&&report.medians.audience<250,'Typing median must stay below 250 ms');
 assert(report.steps.find(s=>s.label==='company-first-open').paintMs<1000,'Opening must stay below 1 s');
 assert(!report.steps.find(s=>s.label==='company-first-open').calls.renderGate,'Opening must keep the existing screen');
 assert(report.steps.filter(s=>s.label.includes('type')||s.label==='cell-switch').every(s=>!s.calls.guruExportDiagnosticCloneV223),'Typing must not clone the workspace');
 writeFileSync(`${output}/results.json`,JSON.stringify(report,null,2));console.log('Gate 1 responsiveness: PASS');
}finally{await browser.call('Target.disposeBrowserContext',{browserContextId});page.close();browser.close()}

function guruStatus(status){return status==='done'?'ready':status;}
