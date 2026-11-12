import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const port='9535',appUrl=process.env.GURU_APP_URL||'http://127.0.0.1:9531/';
const output='artifacts/seo-gate12-final'; mkdirSync(output,{recursive:true});
if (!process.env.GURU_UI_PROJECT) {
 const report={projects:{}};
 // Each fixture starts in its own browser context. Deferred saves from the
 // explicit applicability edit must not cross a synthetic fixture switch.
 for (const name of ['apple','icleaning','sivrce','guru']) {
  execFileSync(process.execPath,[fileURLToPath(import.meta.url)],{env:{...process.env,GURU_UI_PROJECT:name},stdio:'inherit'});
  const result=JSON.parse(readFileSync(`${output}/ui-${name}-results.json`,'utf8'));
  Object.assign(report.projects,result.projects);
  if(name==='apple')Object.assign(report,Object.fromEntries(Object.entries(result).filter(([key])=>key!=='projects')));
 }
 writeFileSync(output+'/ui-results.json',JSON.stringify(report,null,2));
 process.exit(0);
}
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
      const id = ++this.id, timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 120000);
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




const report={projects:{}};
const fixtures=[['apple','guru-now-korich-workspace.json'],['icleaning','guru-step6-icleaning-workspace.json'],['sivrce','guru-step6-sivrce-workspace.json'],['guru','guru-step6-guru-workspace.json']];
const select = async(gateId,id)=>{
 await evaluate(`(()=>{const path=nowGuideDisplayedPath;const item=path.find(i=>i.gateId===${JSON.stringify(gateId)}&&i.id===${JSON.stringify(id)});if(!item)throw Error('Target missing');nowGuideSelect(item,path);return true})()`);
 await waitFor(`guruRenderedGateId===${JSON.stringify(gateId)}&&nowGuideFindNode(nowGuideCurrent(nowGuideDisplayedPath))?.classList.contains('now-guide-highlight')`);
};
const capture = async(name,selector)=>{
 await delay(500);
 await evaluate(`(()=>{const n=document.querySelector(${JSON.stringify(selector)});if(!n)throw Error('Screenshot target missing');nowGuideOpenAncestors(n);n.scrollIntoView({block:'start',behavior:'instant'});window.scrollBy(0,-100);return true})()`);
 await delay(250);
 const rect=await evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height}})()`);
 assert(rect.top>=0&&rect.top<innerHeightSafe,'Screenshot target is not visible');
 await screenshot(name);
 return rect;
};
const innerHeightSafe=1200;
try {
 await page.call('Runtime.enable');await page.call('Page.enable');await page.call('Page.bringToFront');
 await page.call('Emulation.setDeviceMetricsOverride',{width:1920,height:1200,deviceScaleFactor:1,mobile:false});
 await page.call('Page.addScriptToEvaluateOnNewDocument',{source:`const mem=new Map();Storage.prototype.getItem=function(k){return mem.get(String(k))??null};Storage.prototype.setItem=function(k,v){mem.set(String(k),String(v))};Storage.prototype.removeItem=function(k){mem.delete(String(k))};Storage.prototype.clear=function(){mem.clear()};const f=fetch.bind(window);window.fetch=(u,i)=>String(u).includes('/api/')?Promise.resolve(new Response(JSON.stringify({ok:true,projects:[],workspaces:[]}))):f(u,i);`});
 await page.call('Page.navigate',{url:appUrl});await waitFor('document.readyState==="complete"&&typeof g2SeoMigrationPlan==="function"');
 await evaluate(`rememberAccessUnlocked();setAccessState(true);bootstrapAppOnce();scheduleCloudSync=()=>{};scheduleProjectsCloudSync=()=>{};true`);
 const baseline=JSON.parse(readFileSync('artifacts/seo-gate12/three-changes-before.json','utf8'));
 for(const [name,file] of fixtures) {
  if (process.env.GURU_UI_PROJECT && process.env.GURU_UI_PROJECT !== name) continue;
  const raw=JSON.parse(readFileSync('/private/tmp/'+file,'utf8')),source=raw.workspace||raw;
  await evaluate(`(()=>{guruCancelDerivedRefresh();activeProjectId=${JSON.stringify(source.project.id)};state=guruExportWithoutPersistenceV223(()=>migrateWorkspace(${JSON.stringify(source)},${JSON.stringify(source.project.id)}));activeProjectId=state.project.id;projects=[{id:activeProjectId,name:state.project.name,lifecycleStatus:'active'}];updateProjectChrome();els.launcher.hidden=true;els.appShell.hidden=false;activeView='gate';activeGateId='gate-0';nowGuideRegistryCache=null;renderGateNav({recalculate:false});window.__uiBefore=JSON.stringify(state);return true})()`);
  await select('gate-1','project-comparison');
  const gate1=await evaluate(`(()=>{const items=nowGuideDisplayedPath.filter(i=>i.gateId==='gate-1');return {rows:items.map(i=>({id:i.id,status:i.status,header:!!nowGuideFindNode(i),badge:nowGuideFindNode(i)?.querySelector('.status-pill')?.textContent})),pure:window.__uiBefore===JSON.stringify(state),seoGroup:!!document.querySelector('[data-g1-company-block-v299="seo-audit"]'),tool:!!document.querySelector('[data-g1-seo-interactive-tool-v305]'),comparison:!!document.querySelector('.g1-redesign > [data-g1-company-block-v299="project-comparison"] > [data-project-comparison-toggle]'),otherGates:nowGuideBuildAllBlocks().filter(i=>Number(i.gateId.slice(5))>=3).map(i=>({id:i.id,gate:i.gateId,status:i.status,productId:i.productId}))};})()`);
  if (!gate1.pure) {
   const changes=await evaluate(`(()=>{const changes=[];const walk=(a,b,p)=>{if(JSON.stringify(a)===JSON.stringify(b))return;if(!a||!b||typeof a!=='object'||typeof b!=='object'){changes.push({path:p,before:a,after:b});return}for(const k of new Set([...Object.keys(a),...Object.keys(b)]))walk(a[k],b[k],p+'.'+k)};walk(JSON.parse(window.__uiBefore),state,'state');return changes;})()`);
   console.log(name,'navigation changes',JSON.stringify(changes));
  }
  assert(gate1.pure,name+' Gate 1 navigation changed data');assert(gate1.comparison&&!gate1.seoGroup&&!gate1.tool);
  const labels={ready:'Готово',in_progress:'В работе',problem:'Проблема',not_started:'Не начато',not_required:'Не требуется'};
  for(const row of gate1.rows){assert(row.header,name+' missing '+row.id);assert(row.badge?.startsWith(labels[row.status]),JSON.stringify(row));}
  assert.deepEqual(gate1.otherGates,baseline[name].otherGates,name+' Gate 3-8 changed');
  report.projects[name]=gate1;
  if(name==='apple') {
   const selector='[data-g1-company-block-v299="project-comparison"] > [data-project-comparison-toggle]';
   await evaluate(`(()=>{const n=document.querySelector(${JSON.stringify(selector)});if(n.getAttribute('aria-expanded')==='true')n.click();return true})()`);
   report.gate1Screenshot=await capture('gate1-final',selector);
   await select('gate-2','company-webmaster');
   report.gate2Screenshot=await capture('gate2-final','[data-g2sb-id="company-webmaster"] > summary');
   await capture('gate2-data-final','[data-g2seo-editor="robots"]');
   await select('gate-0','card-7');
   report.gate0Screenshot=await capture('gate0-final','[data-mega-system-section="infra"]');
   const control='[data-mega-system-section="infra"] select[aria-label="Статус: Яндекс Вебмастер"]';
   const current=await evaluate(`(()=>{const select=document.querySelector(${JSON.stringify(control)});return {value:select.value,status:g0MarketingInfraRow('Яндекс Вебмастер').row.status,badge:select.parentElement.querySelector('.mega-system-status-v1').textContent,derived:guruStatusLabel(g2SeoInfraStatus())}})()`);
   assert.equal(current.value,current.status);assert.equal(current.badge,current.derived);report.infra=current;
   for(const value of ['not_needed','works']) {
    await evaluate(`(()=>{const n=document.querySelector(${JSON.stringify(control)});n.value=${JSON.stringify(value)};n.dispatchEvent(new Event('change',{bubbles:true}));return true})()`);
    const applicability=await evaluate(`({saved:g0MarketingInfraRow('Яндекс Вебмастер').row.status,applicable:g2c2Applicability('webmaster')})`);
    assert.equal(applicability.saved,value);assert.equal(applicability.applicable,value==='not_needed'?'not_needed':'required');
   }
  }
  console.log(name,'visible headers, badges, archive-only tool, unchanged Gate 3-8 PASS');
 }
 assert.deepEqual(page.errors,[]);report.build=await evaluate('GURU_BUILD_INFO.version');report.passed=true;
 writeFileSync(`${output}/ui-${process.env.GURU_UI_PROJECT}-results.json`,JSON.stringify(report,null,2));console.log('PASS',report.build);
}finally{await browser.call('Target.disposeBrowserContext',{browserContextId});page.close();browser.close();}
