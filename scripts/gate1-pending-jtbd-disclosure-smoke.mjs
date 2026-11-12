import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
const port=process.env.GURU_CHROME_DEBUG_PORT || '9535';
const appUrl=process.env.GURU_APP_URL || 'http://127.0.0.1:9531/';
const output='artifacts/jtbd-pending-disclosure';mkdirSync(output,{recursive:true});
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const hash=s=>createHash('sha256').update(s).digest('hex');
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

const fixture=process.env.GURU_GATE1_SOURCE_EXPORT || '/private/tmp/guru-now-korich-workspace.json';
const fileBefore=readFileSync(fixture);
const raw=JSON.parse(fileBefore),source=raw.workspace||raw.content||raw;
const report={};
try{
 await page.call('Runtime.enable');await page.call('Page.enable');await page.call('Page.bringToFront');
 await page.call('Emulation.setDeviceMetricsOverride',{width:1920,height:1200,deviceScaleFactor:1,mobile:false});
 await page.call('Page.addScriptToEvaluateOnNewDocument',{source:`const mem=new Map();Storage.prototype.getItem=function(k){return mem.get(String(k))??null};Storage.prototype.setItem=function(k,v){mem.set(String(k),String(v))};Storage.prototype.removeItem=function(k){mem.delete(String(k))};Storage.prototype.clear=function(){mem.clear()};const f=fetch.bind(window);window.fetch=(u,i)=>String(u).includes('/api/')?Promise.resolve(new Response(JSON.stringify({ok:true,projects:[],workspaces:[]}))):f(u,i);`});
 await page.call('Page.navigate',{url:appUrl});await waitFor('document.readyState==="complete"&&typeof g2SeoMigrationPlan==="function"');
 await evaluate('rememberAccessUnlocked();setAccessState(true);bootstrapAppOnce();scheduleCloudSync=()=>{};scheduleProjectsCloudSync=()=>{};true');
 await evaluate(`(()=>{guruCancelDerivedRefresh();activeProjectId=${JSON.stringify(source.project.id)};state=guruExportWithoutPersistenceV223(()=>migrateWorkspace(${JSON.stringify(source)},${JSON.stringify(source.project.id)}));projects=[{id:activeProjectId,name:state.project.name,lifecycleStatus:'active'}];updateProjectChrome();els.launcher.hidden=true;els.appShell.hidden=false;activeView='gate';activeGateId='gate-0';nowGuideRegistryCache=null;renderGateNav({recalculate:false});return true})()`);

 await evaluate(`(()=>{const item=nowGuideWithReadPass(()=>nowGuideBuildAllBlocks()).find(i=>i.gateId==='gate-1'&&i.id==='pain_jtbd_offer');if(!item)throw Error('Product demand block missing');nowGuideOpen(item);return true})()`);
 await waitFor(`!!document.querySelector('[data-pv181-pending-jtbd-card-v273]')`);
 await delay(400);
 // Reveal ancestors through the existing source-link action, then let its timers settle.
 await evaluate(`(()=>{window.__pending=()=>document.querySelector('[data-pv181-pending-jtbd-card-v273]');nowGuideOpenAncestors(__pending().querySelector('summary'));g3ProductJourneyRevealSource(__pending().querySelector('summary'));return true})()`);
 await delay(600);
 report.beforeHash=hash(await evaluate('window.__pendingDataBefore=JSON.stringify(state)'));
 report.beforeReadiness=await evaluate(`nowGuideWithReadPass(()=>{const all=nowGuideBuildAllBlocks();const path=nowGuidePreflightPath(all);return {gate1:all.filter(i=>i.gateId==='gate-1').map(i=>[i.id,i.status]),path:nowGuideLaunchReadiness(path),current:nowGuideCurrent(path)?.id}})`);
 report.initial=await evaluate(`(()=>{window.__pendingOriginal=__pending();window.__pendingRows=__pending().querySelector('.pv181-pending-jtbd-demand-rows-v273');return {open:__pending().open,product:__pending().dataset.pv181ItemI,rows:__pendingRows.children.length,count:__pending().querySelector('summary > span').textContent}})()`);
 assert(report.initial.open && report.initial.rows>0,'Fixture must have pending phrases');
 for(let i=0;i<10;i++){
  const open=await evaluate(`(()=>{__pending().querySelector('summary').click();return __pending().open})()`);
  assert.equal(open,i%2===1,'Click failed to toggle');
  await delay(25);
 }
 assert(await evaluate('__pending()===__pendingOriginal && __pendingRows===__pending().querySelector(".pv181-pending-jtbd-demand-rows-v273")'),'Disclosure recreated keyword DOM');
 // Real keyboard input, not a synthetic click.
 await evaluate(`__pending().querySelector('summary').focus()`);
 for(const [key,code,vk,expected] of [['Enter','Enter',13,false],[' ','Space',32,true]]){
  await page.call('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode:vk,text:key==='Enter'?'\r':key});
  await page.call('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode:vk});
  await delay(80);assert.equal(await evaluate('__pending().open'),expected,'Keyboard disclosure failed: '+code);
 }
 // Clicking a metric must not collapse the table.
 assert(await evaluate(`(()=>{__pendingRows.querySelector('input')?.click();return __pending().open})()`));
 report.afterHash=hash(await evaluate('JSON.stringify(state)'));
 assert.equal(report.afterHash,report.beforeHash,'Disclosure changed project data');
 report.afterReadiness=await evaluate(`nowGuideWithReadPass(()=>{const all=nowGuideBuildAllBlocks();const path=nowGuidePreflightPath(all);return {gate1:all.filter(i=>i.gateId==='gate-1').map(i=>[i.id,i.status]),path:nowGuideLaunchReadiness(path),current:nowGuideCurrent(path)?.id}})`);
 assert.deepEqual(report.afterReadiness,report.beforeReadiness,'Disclosure changed readiness or path');
 await evaluate(`(()=>{document.activeElement?.blur();__pending().scrollIntoView({block:'start',behavior:'instant'});window.scrollBy(0,-65);return true})()`);await delay(150);await screenshot('expanded');
 await evaluate(`__pending().querySelector('summary').click()`);await delay(100);await screenshot('collapsed');
 assert(await evaluate(`!__pendingRows.checkVisibility()`),'Closed table is still visible');
 await evaluate(`(()=>{const target=g3ProductJourneyFindSource({kind:'gate1-analysis',focus:'pending',mapIndex:Number(__pending().dataset.pv181MapI),itemId:__pending().dataset.pv181ItemI});if(!target)throw Error('Pending source missing');g3ProductJourneyRevealSource(target);return true})()`);
 await delay(350);assert(await evaluate('__pending().open'),'Source navigation failed to open pending');
 report.navigationHash=hash(await evaluate('JSON.stringify(state)'));
 assert.equal(report.navigationHash,report.beforeHash,'Source navigation changed data');
 // Editing handlers normalize legacy JTBD data. Exercise them only after the read-only checks, on this memory copy.
 // Partial updates used by transfers and returning a phrase keep the disclosure.
 for(const open of [false,true]){
  const result=await evaluate(`(()=>{const n=__pending();n.open=${open};const context=pv181QueryGroupTarget(n);if(!context)throw Error('Missing pending product context');guruGate1RefreshTransferredKeywordUiV555(n.querySelector('summary'),context,'pending');return {open:__pending().open,count:__pending().querySelector('summary > span').textContent}})()`);
  assert.equal(result.open,open,'Partial refresh reset disclosure');assert.equal(result.count,report.initial.count);
 }
 // Stable keys preserve collapsed state through the app's full DOM restoration.
 assert(await evaluate(`(()=>{__pending().open=false;const snapshot=uiKeeperCapture();const context=pv181QueryGroupTarget(__pending());__pending().outerHTML=guruGate1PendingJtbdCardHtmlV273(context.mapIndex,context.itemId,context.itemData);uiKeeperRestore(snapshot);return !__pending().open})()`));
 // A closed header remains a drop target. Actual assignment runs only on this memory copy.
 report.drag=await evaluate(`(()=>{const n=__pending();const context=pv181QueryGroupTarget(n);const primary=document.querySelector('[data-pv181-jtbd-drop-target-v274="primary"]');const row=n.querySelector('[data-pv181-jtbd-keyword-drag-v274]');const key=row.dataset.pv181JtbdKeywordDragV274;const before=guruGate1PendingJtbdDemandV273(context.itemId,context.itemData).phrases.length;
 const originalRender=renderGate,originalSave=flashSaving;renderGate=()=>{};flashSaving=()=>{};
 const drop=(from,to)=>{const dataTransfer=new DataTransfer();for(const [node,type] of [[from,'dragstart'],[to,'dragover'],[to,'drop']])node.dispatchEvent(new DragEvent(type,{bubbles:true,cancelable:true,dataTransfer}));};
 try{drop(row,primary);const removed=!guruGate1PendingJtbdDemandV273(context.itemId,context.itemData).phrases.some(p=>p.key===key);n.open=false;drop(row,n.querySelector('summary'));const returned=guruGate1PendingJtbdDemandV273(context.itemId,context.itemData).phrases.some(p=>p.key===key);return {removed,returned,closed:!n.open,count:guruGate1PendingJtbdDemandV273(context.itemId,context.itemData).phrases.length,before};}finally{renderGate=originalRender;flashSaving=originalSave}})()`);
 assert(report.drag.removed&&report.drag.returned&&report.drag.closed,'Closed drop target broke keyword assignment');assert.equal(report.drag.count,report.drag.before);
 // Empty state and different product keys use the same renderer.
 report.empty=await evaluate(`(()=>{const n=__pending(),context=pv181QueryGroupTarget(n);const holder=document.createElement('div');holder.innerHTML=guruGate1PendingJtbdCardHtmlV273(context.mapIndex,context.itemId,{demandRows:[],semL3Groups:[],semL4Model:{additionalJtbds:[]}});const d=holder.firstElementChild;document.body.append(holder);const message=d.querySelector('.pv181-keyword-empty')?.textContent;d.querySelector('summary').click();const closed=!d.open;d.querySelector('summary').click();const opened=d.open;const a=d.dataset.uiKeeperKey;holder.innerHTML=guruGate1PendingJtbdCardHtmlV273(context.mapIndex,'other-product',{demandRows:[],semL3Groups:[],semL4Model:{additionalJtbds:[]}});const separateKey=a!==holder.firstElementChild.dataset.uiKeeperKey;holder.remove();return {message,closed,opened,separateKey}})()`);
 assert.equal(report.empty.message,'Все ключевые слова распределены по JTBD.');assert(report.empty.closed&&report.empty.opened&&report.empty.separateKey);
 assert.deepEqual(page.errors,[],'Browser errors');assert.equal(hash(readFileSync(fixture)),hash(fileBefore),'Source fixture changed');
 report.build=await evaluate('GURU_BUILD_INFO.version');report.passed=true;
 writeFileSync(output+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));

}finally{await browser.call('Target.disposeBrowserContext',{browserContextId}).catch(()=>{});page.close();browser.close();}
