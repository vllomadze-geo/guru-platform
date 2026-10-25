import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const port = process.env.GURU_CHROME_DEBUG_PORT || '9535';
const appUrl = process.env.GURU_APP_URL || 'http://127.0.0.1:3000/';
const fixturePath = process.env.GURU_NOW_KORICH_FIXTURE || '/private/tmp/guru-now-korich-workspace.json';
const fixtureBytes = readFileSync(fixturePath);
const sourceHash = createHash('sha256').update(fixtureBytes).digest('hex');
const fixture = JSON.parse(fixtureBytes);
const output = process.env.GURU_INPUT_ARTIFACTS || 'artifacts/input-lag/smoke';
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
const benchmark = process.env.GURU_INPUT_BENCHMARK === '1';
const report = { steps: [], sourceSha256: sourceHash };
try {
  await page.call('Page.enable'); await page.call('Runtime.enable'); await page.call('Page.bringToFront');
  await page.call('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1100, deviceScaleFactor: 1, mobile: false });
  await page.call('Page.addScriptToEvaluateOnNewDocument', { source: `{
    const nativeFetch=window.fetch.bind(window);window.fetch=(u,i)=>String(u).includes('/api/')?Promise.resolve(new Response(JSON.stringify({ok:true,projects:[],workspaces:[]}),{status:200,headers:{'Content-Type':'application/json'}})):nativeFetch(u,i);
    const memory=new Map();Storage.prototype.getItem=function(k){return memory.get(String(k))??null};Storage.prototype.setItem=function(k,v){memory.set(String(k),String(v))};Storage.prototype.removeItem=function(k){memory.delete(String(k))};Storage.prototype.clear=function(){memory.clear()};
  }` });
  await page.call('Page.navigate', { url: appUrl });
  await waitFor('document.readyState==="complete"&&typeof nowGuideBuildPath==="function"');
  await evaluate(`(()=>{
    rememberAccessUnlocked();setAccessState(true);bootstrapAppOnce();scheduleCloudSync=()=>{};scheduleProjectsCloudSync=()=>{};
    state=${JSON.stringify(fixture.workspace || fixture)};activeProjectId=state.project.id;
    guruExportWithoutPersistenceV223(()=>{state=migrateWorkspace(state,activeProjectId)});
    projects=[{id:activeProjectId,name:state.project.name,lifecycleStatus:'active'}];updateProjectChrome();
    activeView='gate';activeGateId='gate-0';guruRenderedGateId=null;els.launcher.hidden=true;els.appShell.hidden=false;
    guruResetGateNavigationState();guruGateReadinessCache=new Map();guruExportWithoutPersistenceV223(()=>renderGateNav({recalculate:false}));
    nowGuideProtectedGate='gate-0';guruNavigateToGate('gate-0');return true;
  })()`);
  await waitFor('guruRenderedGateId==="gate-0"');
  await evaluate(`(()=>{const p=nowGuideDisplayedPath;nowGuideSelect(p.find(i=>i.gateId==='gate-0'&&i.id==='card-7'),p);return true})()`);
  await waitFor(`document.querySelector('input[data-mega-platform-rename-product]')?.getClientRects().length>0`);
  await delay(250);
  await evaluate(`(()=>{
    guruCancelDerivedRefresh();guruDiscardUiPreferenceSave(activeProjectId);if(_saveTimer){clearTimeout(_saveTimer);_saveTimer=null;}
    window.__typingEvents=[];window.__typingCalls={versionInDispatch:0,registryInDispatch:0,gate0FullInDispatch:0};
    for(const [name,key] of [['nowGuideDataVersion','versionInDispatch'],['nowGuideBuildAllBlocks','registryInDispatch'],['gate0RefreshStatuses','gate0FullInDispatch']]){
      const original=window[name];window[name]=function(...args){if(guruUserEditDispatchActive)window.__typingCalls[key]++;return original.apply(this,args)};
    }
    window.addEventListener('input',e=>{if(!e.target?.closest?.('#contentArea'))return;const start=performance.now(),target=e.target;
      requestAnimationFrame(()=>window.__typingEvents.push({ms:performance.now()-start,connected:target.isConnected,value:target.value}));},true);
    window.__name=document.querySelector('input[data-mega-platform-rename-product]');window.__url=window.__name.closest('tr').querySelector('input[data-mega-url-group]');
    window.__next=document.querySelectorAll('input[data-mega-platform-rename-product]')[1];
    window.__expected={name:window.__name.value+' тест',url:window.__url.value+'-test',next:window.__next.value+' тест'};
    window.__targetId=window.__name.dataset.megaPlatformRenameProduct;window.__nextId=window.__next.dataset.megaPlatformRenameProduct;return true;
  })()`);
  const paint = () => evaluate('new Promise(resolve=>requestAnimationFrame(()=>resolve(true)))');
  const focus = async (expression, label) => {
    const p = await evaluate(`(async()=>{
      const input=${expression};input.scrollIntoView({block:'center',behavior:'instant'});let previous;
      for(let frame=0;frame<30;frame++){
        await new Promise(resolve=>requestAnimationFrame(resolve));const r=input.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
        if(previous&&Math.abs(previous.x-r.x)<0.5&&Math.abs(previous.y-r.y)<0.5&&input.contains(document.elementFromPoint(x,y)))return{x,y};
        previous={x:r.x,y:r.y};
      }throw Error('Editor is obscured or moving');
    })()`);
    const start = Date.now();
    await page.call('Input.dispatchMouseEvent', { type: 'mouseMoved', ...p });
    await page.call('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...p });
    await page.call('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...p });
    await paint();
    assert(await evaluate(`document.activeElement===${expression}&&${expression}.isConnected`), `${label}: focus moved to another field`);
    await evaluate(`(()=>{const input=${expression};input.setSelectionRange(input.value.length,input.value.length);return true})()`);
    report.steps.push({ label, type: 'focus', ms: Date.now() - start });
  };
  const type = async (text, expression, label) => {
    const start = Date.now(); await page.call('Input.insertText', { text }); await paint();
    assert(await evaluate(`document.activeElement===${expression}&&${expression}.isConnected`), `${label}: editor was replaced`);
    report.steps.push({ label, type: 'input', ms: Date.now() - start });
  };
  await focus('window.__name', 'first-name'); await type(' тест', 'window.__name', 'type-name');
  await focus('window.__url', 'name-to-url'); await type('-test', 'window.__url', 'type-url');
  await focus('window.__next', 'url-to-next-name'); await type(' тест', 'window.__next', 'type-next-name');
  await delay(800); await focus('window.__url', 'focus-after-autosave');
  const category = await evaluate(`(()=>{const b=[...document.querySelectorAll('[data-mega-platform-pick-category]')].find(b=>b.dataset.megaPlatformPickCategory!=='__uncategorized__');b.click();return b.dataset.megaPlatformPickCategory})()`);
  await evaluate(`window.__picker=document.querySelector('[data-mega-platform-picker-name="${category}"]');true`);
  await focus('window.__picker', 'new-product-draft');
  for (const letter of ['Н', 'о', 'в', 'ы', 'й']) await type(letter, 'window.__picker', `draft-${letter}`);
  report.duringInput = await evaluate(`({...window.__typingCalls})`);
  if (!benchmark) {
    assert.equal(report.duringInput.versionInDispatch, 0, 'Full-project serialization in an input/change dispatch');
    assert.equal(report.duringInput.registryInDispatch, 0, 'All gates rebuilt during input/change');
    assert.equal(report.duringInput.gate0FullInDispatch, 0, 'Duplicate full Gate 0 refresh during field editing');
  }
  await waitFor(`(()=>{const saved=JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_PREFIX+activeProjectId)||'null');return saved&&megaPlatformUrl('products',window.__targetId,saved)===window.__expected.url&&saved.project.catalogItemsV189.find(p=>p.id===window.__targetId)?.name===window.__expected.name&&saved.project.catalogItemsV189.find(p=>p.id===window.__nextId)?.name===window.__expected.next})()`);
  if (!benchmark) {
    await waitFor('!guruDerivedRefreshRequired&&guruWorkspaceSaveJobs.size===0');
    report.workerUsed = await evaluate('Boolean(guruWorkspaceSaveWorker)&&!guruWorkspaceSaveWorkerFailed');
    assert(report.workerUsed, 'Background serializer was not used');
  }
  report.integrity = await evaluate(`({name:window.__name.value===window.__expected.name,url:window.__url.value===window.__expected.url,next:window.__next.value===window.__expected.next,draft:window.__picker.value==='Новый',focused:document.activeElement===window.__picker,connected:window.__picker.isConnected,gate:activeGateId})`);
  assert(Object.entries(report.integrity).filter(([key])=>key!=='gate').every(([,value])=>value), JSON.stringify(report.integrity));
  report.events = await evaluate('window.__typingEvents'); assert(report.events.every(event=>event.connected));
  const median = values => [...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
  report.medianInputMs = median(report.steps.filter(step=>step.type==='input').map(step=>step.ms));
  report.medianFocusMs = median(report.steps.filter(step=>step.type==='focus').map(step=>step.ms));
  if (!benchmark) { assert(report.medianInputMs < 150, `Input median ${report.medianInputMs} ms`); assert(report.medianFocusMs < 200, `Focus median ${report.medianFocusMs} ms`); }
  assert.equal(createHash('sha256').update(readFileSync(fixturePath)).digest('hex'), sourceHash);
  report.build=await evaluate('GURU_BUILD_INFO.version');
  await evaluate(`window.__picker.scrollIntoView({block:'center',behavior:'instant'})`);await screenshot('typing');
  assert.deepEqual(page.errors, []); report.errors=page.errors; report.passed=true;
  writeFileSync(`${output}/results.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report,null,2));console.log('platform-input-performance-smoke: PASS');
} finally {
  await browser.call('Target.disposeBrowserContext', { browserContextId });page.close();browser.close();
}
