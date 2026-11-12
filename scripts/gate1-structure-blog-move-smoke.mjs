import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
const port=process.env.GURU_CHROME_DEBUG_PORT || '9535';
const baseline=process.env.GURU_STRUCTURE_BASELINE==='1';
const appUrl=process.env.GURU_APP_URL || 'http://127.0.0.1:9531/';
const output='artifacts/gate1-structure';mkdirSync(output,{recursive:true});
const name=process.env.GURU_UI_PROJECT || 'apple';
const files={apple:'guru-now-korich-workspace.json',icleaning:'guru-step6-icleaning-workspace.json',sivrce:'guru-step6-sivrce-workspace.json',guru:'guru-step6-guru-workspace.json'};
const hash=s=>createHash('sha256').update(s).digest('hex');
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
  await page.call('Page.bringToFront');
  const image = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  writeFileSync(`${output}/${name}.png`, Buffer.from(image.data, 'base64'));
};

const raw=JSON.parse(readFileSync('/private/tmp/'+files[name],'utf8')),source=raw.workspace||raw;
const report={project:name,baseline};
const navigate=async(gate,id)=>{
 await evaluate(`(()=>{const all=nowGuideWithReadPass(()=>nowGuideBuildAllBlocks());const item=all.find(i=>i.gateId===${JSON.stringify(gate)}&&i.id===${JSON.stringify(id)});if(!item)throw Error('Missing navigation item: '+${JSON.stringify(gate)}+':'+${JSON.stringify(id)}+'; '+JSON.stringify(all.map(i=>[i.gateId,i.id])));nowGuideOpen(item);return true})()`);
 await waitFor(`guruRenderedGateId===${JSON.stringify(gate)}&&document.querySelector('.now-guide-highlight')`);
};
try{
 await page.call('Runtime.enable');await page.call('Page.enable');await page.call('Page.bringToFront');
 await page.call('Emulation.setDeviceMetricsOverride',{width:1920,height:1200,deviceScaleFactor:1,mobile:false});
 await page.call('Page.addScriptToEvaluateOnNewDocument',{source:`const mem=new Map();Storage.prototype.getItem=function(k){return mem.get(String(k))??null};Storage.prototype.setItem=function(k,v){mem.set(String(k),String(v))};Storage.prototype.removeItem=function(k){mem.delete(String(k))};Storage.prototype.clear=function(){mem.clear()};const f=fetch.bind(window);window.fetch=(u,i)=>String(u).includes('/api/')?Promise.resolve(new Response(JSON.stringify({ok:true,projects:[],workspaces:[]}))):f(u,i);`});
 await page.call('Page.navigate',{url:appUrl});await waitFor('document.readyState==="complete"&&typeof g2SeoMigrationPlan==="function"');
 await evaluate('rememberAccessUnlocked();setAccessState(true);bootstrapAppOnce();scheduleCloudSync=()=>{};scheduleProjectsCloudSync=()=>{};true');
 await evaluate(`(()=>{guruCancelDerivedRefresh();activeProjectId=${JSON.stringify(source.project.id)};state=guruExportWithoutPersistenceV223(()=>migrateWorkspace(${JSON.stringify(source)},${JSON.stringify(source.project.id)}));projects=[{id:activeProjectId,name:state.project.name,lifecycleStatus:'active'}];updateProjectChrome();els.launcher.hidden=true;els.appShell.hidden=false;activeView='gate';activeGateId='gate-0';nowGuideRegistryCache=null;renderGateNav({recalculate:false});window.__structureBefore=JSON.stringify(state);return true})()`);
 report.beforeHash=hash(await evaluate('window.__structureBefore'));
 report.snapshot=await evaluate(`nowGuideWithReadPass(()=>{const all=nowGuideBuildAllBlocks();const path=nowGuidePreflightPath(all);return {blocks:all.map(({id,gateId,title,kind,productId,status})=>({id,gateId,title,kind,productId,status})),readiness:Object.fromEntries(state.gates.map(g=>[g.id,guruReadinessFromStatuses(all.filter(i=>i.gateId===g.id).map(i=>i.status))])),path:nowGuideLaunchReadiness(path),current:nowGuideCurrent(path)?.id,step:path.indexOf(nowGuideCurrent(path))+1,productId:state.project.gate0ScopeUiV194?.selectedProductId,blog:state.gate1BlogV304||null}})`);
 await navigate('gate-1','company_demand_positioning');
 report.dom=await evaluate(`(()=>{const root=document.querySelector('.g1-redesign');return [...root.children].map(n=>({key:n.dataset.g1CompanyBlockV299||n.dataset.guruProductContext||n.dataset.card||n.querySelector(':scope > [data-gate1-toggle-section]')?.dataset.gate1ToggleSection||n.dataset.projectComparisonProduct||'',title:n.querySelector(':scope > .g1-section-header .g1-section-title,:scope > .project-comparison-heading b,:scope > .target-audience-heading b,:scope > .g1-card-header .g1-card-title,.gate0-section-heading-title')?.textContent.trim()||'',blog:n.hasAttribute('data-gate1-blog-company-v304')||n.hasAttribute('data-gate1-blog-product-v304')}))})()`);
 if(!baseline){
  assert(!report.dom.some(n=>n.blog),'Blog still in Gate 1');
  const company=report.dom.filter(n=>['company_demand_positioning','project-comparison','target-audience','site-structure-audit','legal-audit'].includes(n.key)).map(n=>n.key);
  assert.deepEqual(company,['company_demand_positioning','project-comparison','target-audience','site-structure-audit','legal-audit']);
  const product=report.dom.filter(n=>n.key==='pain_jtbd_offer'||n.key===report.snapshot.productId||n.key==='unit_economics').map(n=>n.key);
  if(report.snapshot.productId) assert.deepEqual(product,['pain_jtbd_offer',report.snapshot.productId,'unit_economics']);
  const labels={ready:'Готово',in_progress:'В работе',problem:'Проблема',not_started:'Не начато',not_required:'Не требуется'};
  for(const item of report.snapshot.blocks.filter(i=>i.gateId==='gate-1')){
    await navigate('gate-1',item.id);
    const header=await evaluate(`(()=>{const item=nowGuideBuildAllBlocks().find(i=>i.gateId==='gate-1'&&i.id===${JSON.stringify(item.id)});const n=nowGuideFindNode(item);return {visible:!!n&&n.getBoundingClientRect().height>0,badge:n?.querySelector('.status-pill')?.textContent,highlight:n?.classList.contains('now-guide-highlight')}})()`);
    assert(header.visible&&header.highlight,'Missing header '+item.id);
    assert(header.badge?.startsWith(labels[item.status]),JSON.stringify({item,header}));
  }
  const old=JSON.parse(readFileSync(output+'/before-'+name+'.json','utf8')).snapshot;
  report.navigationReadiness = await evaluate(`nowGuideWithReadPass(()=>nowGuidePlainRead(()=>Object.fromEntries(['gate-1','gate-4'].map(id=>[id,guruExportGateDiagnosticsCurrentV223(id,guruExportRawCardStatusesV223(state)).navigationReadiness.summary]))))`);
  for(const gate of ['gate-1','gate-4']) assert.deepEqual(report.navigationReadiness[gate],report.snapshot.readiness[gate],'Export readiness differs: '+gate);

  const unchanged=rows=>rows.filter(i=>!['gate-1','gate-4'].includes(i.gateId));
  assert.deepEqual(unchanged(report.snapshot.blocks),unchanged(old.blocks),'Other gates changed');
  const existingGate4 = rows => rows.filter(i=>i.gateId==='gate-4'&&i.kind!=='gate4-blog');
  assert.deepEqual(existingGate4(report.snapshot.blocks),existingGate4(old.blocks),'Existing Gate 4 blocks changed');
  const existingGate1 = rows => rows.filter(i=>i.gateId==='gate-1'&&!i.id.includes('gate1-blog')&&i.id!=='project-comparison-product').map(i=>[i.id,i.status]).sort();
  assert.deepEqual(existingGate1(report.snapshot.blocks),existingGate1(old.blocks),'Existing Gate 1 statuses changed');
  const blogs=report.snapshot.blocks.filter(i=>i.kind==='gate4-blog');
  assert.equal(blogs.length,report.snapshot.productId?2:1);
  for(const blog of blogs){
    assert.equal(blog.status,old.blocks.find(i=>i.id===blog.id).status,'Blog status changed');
    await navigate('gate-4',blog.id);
    const info=await evaluate(`(()=>{const n=document.querySelector('[data-gate4-blog-scope="${blog.id.endsWith('company')?'company':'product'}"]');return {open:n.open,highlight:n.querySelector('summary').classList.contains('now-guide-highlight'),badge:n.querySelector('.status-pill').textContent}})()`);
    assert(info.open&&info.highlight);assert.equal(info.badge,labels[blog.status]);
  }
  // Switching products uses product_id, while company articles are shared.
  report.products=await evaluate(`(()=>{const original=JSON.stringify(state);const ids=(state.project.catalogItemsV189||[]).filter(p=>p.id&&p.name).map(p=>p.id);const results=ids.map(id=>nowGuidePlainRead(view=>{view.project.gate0ScopeUiV194.selectedProductId=id;const gate1=nowGuideGate1Items(view.gates.find(g=>g.id==='gate-1')).map(i=>({id:i.id,status:nowGuideGate1Assessment(i).status}));const product=view.project.catalogItemsV189.find(p=>p.id===id);const template=document.createElement('template');template.innerHTML=gate4BlogHtmlV304('product',product);return {productId:id,gate1,blog:{productId:id,status:gate1BlogProductStatusV304(gate1BlogStoreV304(view,true).articles,id),rendered:!!template.content.querySelector('[data-gate4-blog-scope="product"]')}};}));if(original!==JSON.stringify(state))throw Error('Product reads changed data');return results})()`);
  for(const p of report.products){assert.equal(p.blog.productId,p.productId);assert(p.gate1.some(i=>i.id==='project-comparison-product'));}
 }
 writeFileSync(output+'/'+(baseline?'before-':'after-')+name+'-diagnostic.json',JSON.stringify(report,null,2));
 report.afterHash=hash(await evaluate('JSON.stringify(state)'));
 assert.equal(report.afterHash,report.beforeHash,'Reading/navigation changed workspace');
 if(!baseline&&name==='apple'){
  await navigate('gate-1','company_demand_positioning');await delay(700);
  // Only DOM disclosure changes for screenshots, no saved preferences.
  await evaluate(`(()=>{document.querySelectorAll('.g1-redesign > .g1-section > .g1-section-body,.g1-redesign > .project-comparison > .project-comparison-body,.g1-redesign > .target-audience > .target-audience-body').forEach(n=>n.hidden=true);document.querySelector('[data-gate1-company-demand-positioning-v357]').scrollIntoView({block:'start',behavior:'instant'});window.scrollBy(0,-90);return true})()`);await delay(350);await screenshot('gate1-company');
  if(report.snapshot.productId){await navigate('gate-1','project-comparison-product');await delay(700);await evaluate(`(()=>{document.querySelectorAll('.g1-redesign > .g1-section > .g1-section-body,.g1-redesign > .g1-card > .g1-card-body,.project-comparison-product-v309 > .project-comparison-body').forEach(n=>n.hidden=true);document.querySelector('[data-card="card-24"]').scrollIntoView({block:'start',behavior:'instant'});window.scrollBy(0,-60);return true})()`);await delay(250);await screenshot('gate1-product');}
  for(const scope of ['company','product']){await navigate('gate-4','gate1-blog-v304-'+scope);await delay(700);await screenshot('gate4-blog-'+scope);}
 }
 assert.deepEqual(page.errors,[]);report.build=await evaluate('GURU_BUILD_INFO.version');report.passed=true;
 writeFileSync(output+'/'+(baseline?'before-':'after-')+name+'.json',JSON.stringify(report,null,2));
 console.log(name,baseline?'BEFORE':'AFTER',JSON.stringify({readiness:report.snapshot.readiness,path:report.snapshot.path,pure:report.beforeHash===report.afterHash,pass:true}));
}finally{await browser.call('Target.disposeBrowserContext',{browserContextId}).catch(()=>{});page.close();browser.close();}
