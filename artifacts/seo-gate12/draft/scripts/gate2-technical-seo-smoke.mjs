import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const port='9535',appUrl=process.env.GURU_APP_URL||'http://127.0.0.1:9531/';
const output='artifacts/seo-gate12'; mkdirSync(output,{recursive:true});
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



const report={projects:{},checks:[]};
try {
 await page.call('Runtime.enable');await page.call('Page.enable');
 await page.call('Emulation.setDeviceMetricsOverride',{width:1920,height:1200,deviceScaleFactor:1,mobile:false});
 await page.call('Page.addScriptToEvaluateOnNewDocument',{source:`const mem=new Map();Storage.prototype.getItem=function(k){return mem.get(String(k))??null};Storage.prototype.setItem=function(k,v){mem.set(String(k),String(v))};Storage.prototype.removeItem=function(k){mem.delete(String(k))};Storage.prototype.clear=function(){mem.clear()};const f=fetch.bind(window);window.fetch=(u,i)=>String(u).includes('/api/')?Promise.resolve(new Response(JSON.stringify({ok:true,projects:[],workspaces:[]}))):f(u,i);`});
 await page.call('Page.navigate',{url:appUrl});await waitFor('document.readyState==="complete"&&typeof g2SeoMigrationPlan==="function"');
 await evaluate(`rememberAccessUnlocked();setAccessState(true);bootstrapAppOnce();scheduleCloudSync=()=>{};scheduleProjectsCloudSync=()=>{};true`);
 const fixtures=[['apple','guru-now-korich-workspace.json'],['icleaning','guru-step6-icleaning-workspace.json'],['sivrce','guru-step6-sivrce-workspace.json'],['guru','guru-step6-guru-workspace.json']];
 for(const [name,file] of fixtures) {
  const bytes=readFileSync('/private/tmp/'+file),raw=JSON.parse(bytes),w=raw.workspace||raw;
  await evaluate(`(()=>{guruCancelDerivedRefresh();window.__source=${JSON.stringify(w)};activeProjectId=window.__source.project.id;state=guruExportWithoutPersistenceV223(()=>migrateWorkspace(window.__source,activeProjectId));projects=[{id:activeProjectId,name:state.project.name,lifecycleStatus:'active'}];window.__archiveBefore=JSON.stringify(g2SeoGate1(state).cards.filter(c=>G2_SEO_ARCHIVED_IDS.has(c.id)));window.__migrated=structuredClone(state);return true})()`);
  const checks=await evaluate(`(()=>{
   const source=window.__source,before=JSON.stringify(state),input=JSON.stringify(source);
   const archives=g2SeoGate1(state).cards.filter(c=>G2_SEO_ARCHIVED_IDS.has(c.id));
   const archiveEqual=archives.every(c=>JSON.stringify(c)===JSON.stringify(g2SeoGate1(source).cards.find(s=>s.id===c.id)));
   const plan=g2SeoMigrationPlan(state);g2SeoMigrate(state);const idempotent=before===JSON.stringify(state);
   const calc=nowGuidePlainRead(()=>({g1:nowGuideGate1Items(g2SeoGate1(state)).map(i=>({id:i.id,status:nowGuideGate1Assessment(i).status})),g2:g2s4Units().map(u=>({id:u.id,status:u.status})),summary1:guruGateReadiness(g2SeoGate1(state)),summary2:g2s4Readiness().summary,path:nowGuideBuildPath().map(i=>({id:i.id,gateId:i.gateId,status:i.status,productId:i.productId})),products:state.project.catalogItemsV189.map(p=>({id:p.id,name:p.name}))}));
   const pure=before===JSON.stringify(state);
   const history=state.gates.find(g=>g.id==='gate-2').cards.filter(c=>G2_SEO_OLD_CHECKS.has(c.id)).map(c=>({id:c.id,g2Check:c.fields?.g2Check}));
   const changed=structuredClone(state);for(const c of changed.gates.find(g=>g.id==='gate-2').cards)if(G2_SEO_OLD_CHECKS.has(c.id)){c.fields||={};c.fields.g2Check=c.fields.g2Check==='works'?'broken':'works'};
   const historicalIgnored=JSON.stringify(g2s4Readiness(state).summary)===JSON.stringify(g2s4Readiness(changed).summary);
   const conflict=structuredClone(state);delete g2SeoStore('company-webmaster','',conflict).migrated;g2SeoStore('company-domain','',conflict).cards['card-20'].sslV130.domain='conflict.invalid';
   g2SeoGate1(conflict).cards.find(c=>c.id==='card-20').sslV130.domain='source.invalid';const conflictBefore=JSON.stringify(conflict);let rejected=false,conflicts=[];try{g2SeoMigrate(conflict)}catch(e){rejected=true;conflicts=e.conflicts}
   return {archiveEqual,idempotent,pure,sourceUntouched:JSON.stringify(source)===input,historicalIgnored,history,calc,conflictAtomic:rejected&&conflictBefore===JSON.stringify(conflict),conflicts};})()`);
  report.projects[name]={...checks,sourceSha256:createHash('sha256').update(bytes).digest('hex')};
  writeFileSync(output+'/smoke-partial.json',JSON.stringify(report,null,2));
  for(const k of ['archiveEqual','idempotent','pure','sourceUntouched','historicalIgnored','conflictAtomic'])assert(checks[k],name+' '+k);
  console.log(name,'migration, archive, purity, historical g2Check, atomic conflicts PASS');
  const matrix=await evaluate(`(()=>{const result=[];const ids=state.project.catalogItemsV189.map(p=>p.id);for(const productId of ids.length?ids:['']){const copy=structuredClone(state);copy.project.gate0ScopeUiV194||={};copy.project.gate0ScopeUiV194.selectedProductId=productId;copy.project.gate0ScopeUiV194.selectedCategoryId='';const summary=g2s4Readiness(copy);result.push({productId,summary:summary.summary,units:summary.units.map(u=>({id:u.id,status:u.status,productId:u.productId}))});}return result})()`);
  report.projects[name].matrix=matrix;for(const m of matrix){assert.equal(m.summary.total,m.units.length);assert(m.units.filter(u=>u.productId).every(u=>u.productId===m.productId));}
  // Real render, not generated mock HTML. No network writes and memory storage only.
  const rendering=await evaluate(`(()=>{updateProjectChrome();els.launcher.hidden=true;els.appShell.hidden=false;activeView='gate';activeGateId='gate-2';guruRenderedGateId=null;renderGate();renderGateNav({recalculate:false});const rows=g2s4Readiness().units;return {missing:rows.filter(u=>!document.querySelector(u.config?'[data-g2sb-id="'+u.id+'"]':'[data-g2w-card-view="'+u.def.id+'"]')).map(u=>u.id),badges:rows.filter(u=>u.config).map(u=>({id:u.id,status:u.status,badge:document.querySelector('[data-g2sb-id="'+u.id+'"] [data-g2sb-status]')?.textContent})),archived:window.__archiveBefore===JSON.stringify(g2SeoGate1(state).cards.filter(c=>G2_SEO_ARCHIVED_IDS.has(c.id))),oldVisible:[...document.querySelectorAll('[data-card]')].filter(n=>G2_SEO_OLD_CHECKS.has(n.dataset.card)).length,technicalPreserved:JSON.stringify(state.gates.find(g=>g.id==='gate-2').cards.map(c=>c.fields?.g2SetupWizardV1?.company?.technicalSeoV1||null))===JSON.stringify(window.__migrated.gates.find(g=>g.id==='gate-2').cards.map(c=>c.fields?.g2SetupWizardV1?.company?.technicalSeoV1||null)),editorCount:document.querySelectorAll('[data-g2seo-editor]').length};})()`);
  report.projects[name].rendering=rendering;writeFileSync(output+'/smoke-partial.json',JSON.stringify(report,null,2));
  assert.equal(rendering.missing.length,0,name+' missing service');assert.equal(rendering.oldVisible,0);assert(rendering.archived,name+' archive changed on render');assert(rendering.technicalPreserved,name+' technical data changed on render');
  const labels={ready:'Готово',not_needed:'Не требуется',problem:'Проблема',in_progress:'В работе',not_started:'Не начато'};
  for(const row of rendering.badges)assert(row.badge?.startsWith(labels[row.status]),JSON.stringify(row));
  if(name==='apple'){
   await evaluate(`document.querySelector('[data-g2sb-id="company-domain"]').open=true;document.querySelector('[data-g2seo-editor="https"]').scrollIntoView({block:'center',behavior:'instant'});true`);await evaluate('window.scrollTo({left:0,top:window.scrollY})');await screenshot('gate2-https');
   await evaluate(`document.querySelector('[data-g2seo-editor="redirect"]').scrollIntoView({block:'center',behavior:'instant'});true`);await evaluate('window.scrollTo({left:0,top:window.scrollY})');await screenshot('gate2-redirects');
   await evaluate(`document.querySelector('[data-g2sb-id="company-webmaster"]').open=true;document.querySelector('[data-g2seo-editor="robots"]').scrollIntoView({block:'start',behavior:'instant'});true`);await screenshot('gate2-robots');
   await evaluate(`document.querySelector('[data-g2sb-id="product-landing"]').open=true;document.querySelector('[data-g2sb-id="product-landing"] [data-g2seo-editor="indexing"]').scrollIntoView({block:'center',behavior:'instant'});true`);await screenshot('gate2-product');
   const edits=await evaluate(`(()=>{const field=[...document.querySelectorAll('[data-g2seo-editor="https"] input')].find(n=>JSON.parse(n.dataset.g2seoControl||'{}')['data-ssl-v130-field']==='evidence');const saved=g2SeoStore('company-domain').cards['card-20'].sslV130.evidence;field.value='https://example.test/ssl-proof';field.dispatchEvent(new Event('input',{bubbles:true}));return {value:g2SeoStore('company-domain').cards['card-20'].sslV130.evidence,archive:window.__archiveBefore===JSON.stringify(g2SeoGate1(state).cards.filter(c=>G2_SEO_ARCHIVED_IDS.has(c.id))),connected:field.isConnected};})()`);
   assert.equal(edits.value,'https://example.test/ssl-proof');assert(edits.archive&&edits.connected);report.projects[name].edits=edits;
   await evaluate(`g2ServiceBlockFlushCommit(false);state=structuredClone(window.__migrated);activeGateId='gate-1';nowGuideGate1NavigationPending=false;guruRenderedGateId=null;renderGate();renderGateNav({recalculate:false});true`);
   const g1=await evaluate(`({old:[...document.querySelectorAll('[data-card]')].filter(n=>G2_SEO_ARCHIVED_IDS.has(n.dataset.card)).map(n=>n.dataset.card),technical:document.querySelectorAll('[data-g1-webmaster-scope-v295], [data-cwv-field], [data-ssl-v130-field], [data-rv2]').length,archive:window.__archiveBefore===JSON.stringify(g2SeoGate1(state).cards.filter(c=>G2_SEO_ARCHIVED_IDS.has(c.id))),structure:!!document.querySelector('[data-g1-company-block-v299="site-structure-audit"]')})`);
   report.projects[name].gate1Render=g1;assert.equal(g1.old.length,0);assert.equal(g1.technical,0);assert(g1.archive&&g1.structure);
   await evaluate(`window.scrollTo(0,0);document.querySelector('[data-g1-company-block-v299="site-structure-audit"]').scrollIntoView({block:'start',behavior:'instant'});true`);await screenshot('gate1-preparation');
  }
  assert.equal(createHash('sha256').update(readFileSync('/private/tmp/'+file)).digest('hex'),report.projects[name].sourceSha256);
 }
 report.errors=page.errors;assert.equal(page.errors.length,0,JSON.stringify(page.errors));report.build=await evaluate('GURU_BUILD_INFO.version');
 writeFileSync(output+'/smoke-results.json',JSON.stringify(report,null,2));console.log('PASS',report.build);
}finally{writeFileSync(output+'/smoke-partial.json',JSON.stringify(report,null,2));await browser.call('Target.disposeBrowserContext',{browserContextId});page.close();browser.close();}
