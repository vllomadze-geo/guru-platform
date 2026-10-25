import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const port = process.env.GURU_CHROME_DEBUG_PORT || '9535';
const appUrl = process.env.GURU_APP_URL || 'http://127.0.0.1:9530/';
const fixturePath = process.env.GURU_NOW_KORICH_FIXTURE || '/private/tmp/guru-now-korich-workspace.json';
const source = readFileSync(fixturePath);
const fixture = JSON.parse(source);
const workspace = fixture.workspace || fixture;
const sourceHash = createHash('sha256').update(source).digest('hex');
const output = process.env.GURU_DISCLOSURE_ARTIFACTS || 'artifacts/gate-disclosure';
mkdirSync(output, { recursive: true });
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
class Cdp {
  constructor(url) {
    this.ws = new WebSocket(url); this.id = 0; this.pending = new Map(); this.errors = [];
    this.ready = new Promise((resolve, reject) => { this.ws.addEventListener('open', resolve, { once: true }); this.ws.addEventListener('error', reject, { once: true }); });
    this.ws.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.method === 'Runtime.exceptionThrown') this.errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
      if (message.method === 'Page.javascriptDialogOpening') this.errors.push(message.params.message);
      const task = this.pending.get(message.id); if (!task) return;
      this.pending.delete(message.id); clearTimeout(task.timer);
      if (message.error) task.reject(new Error(message.error.message)); else task.resolve(message.result);
    });
  }
  async call(method, params = {}) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const id = ++this.id, timer = setTimeout(() => { this.pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 120000);
      this.pending.set(id, { resolve, reject, timer }); this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.ws.close(); }
}
const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
const browser = new Cdp(version.webSocketDebuggerUrl);
const { browserContextId } = await browser.call('Target.createBrowserContext');
const { targetId } = await browser.call('Target.createTarget', { url: 'about:blank', browserContextId });
await browser.call('Target.activateTarget', { targetId });
const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const page = new Cdp(targets.find(target => target.id === targetId).webSocketDebuggerUrl);
const evaluate = async expression => {
  const r = await page.call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};
const waitFor = async expression => { const start = Date.now(); while (Date.now() - start < 30000) { if (await evaluate(expression)) return; await wait(100); } throw new Error('Timeout: ' + expression); };
const click = async selector => {
  const p = await evaluate(`(async()=>{
    const n=document.querySelector(${JSON.stringify(selector)});if(!n)throw Error('Missing target');
    n.scrollIntoView({block:'center',behavior:'instant'});let previous;
    for(let attempt=0;attempt<20;attempt++){
      await new Promise(resolve=>requestAnimationFrame(resolve));
      const r=n.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
      if(previous&&Math.abs(previous.x-r.x)<0.5&&Math.abs(previous.y-r.y)<0.5&&n.contains(document.elementFromPoint(x,y)))return{x,y};
      if(!n.contains(document.elementFromPoint(x,y)))n.scrollIntoView({block:'center',behavior:'instant'});
      previous={x:r.x,y:r.y};await new Promise(resolve=>setTimeout(resolve,16));
    }
    const r=n.getBoundingClientRect();throw Error('Obscured or moving target: '+${JSON.stringify(selector)}+' '+JSON.stringify({rect:r.toJSON(),hit:document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.outerHTML.slice(0,250),nav:document.getElementById('gateNav').getBoundingClientRect().toJSON()}));
  })()`);
  const assertDisclosurePosition = async phase => {
    if (!selector.startsWith('[data-now-disclosure=')) return;
    const position = await evaluate(`(()=>{
      const b=document.querySelector(${JSON.stringify(selector)}),r=b.getBoundingClientRect(),g=b.parentElement.querySelector('.gate-btn').getBoundingClientRect();
      return{inside:r.top>=g.top&&r.bottom<=g.bottom&&r.left>=g.left&&r.right<=g.right,centerOffset:Math.abs(r.top+r.height/2-g.top-g.height/2)};
    })()`);
    assert(position.inside && position.centerOffset < 1, `${selector} ${phase}: ${JSON.stringify(position)}`);
  };
  await assertDisclosurePosition('before hover');
  await page.call('Input.dispatchMouseEvent', { type: 'mouseMoved', ...p });
  await assertDisclosurePosition('hover');
  await page.call('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...p });
  await assertDisclosurePosition('pressed');
  await page.call('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...p });
  await assertDisclosurePosition('released');
};
const key = async (key, code, windowsVirtualKeyCode) => {
  for (const type of ['keyDown', 'keyUp']) await page.call('Input.dispatchKeyEvent', {
    type, key, code, windowsVirtualKeyCode,
    ...(type === 'keyDown' && key === 'Enter' ? { text: '\r' } : {}),
  });
};
const checkpoint = () => evaluate(`({gate:activeGateId,rendered:guruRenderedGateId,expanded:[...nowGuideExpanded],counts:{...window.__disclosureCounts}})`);
const resetCounters = () => evaluate(`(()=>{for(const k in window.__disclosureCounts)window.__disclosureCounts[k]=0;return true})()`);
const evidence = { fixture: fixturePath, sourceSha256: sourceHash, toggles: [] };
try {
  await page.call('Page.enable'); await page.call('Runtime.enable');
  await page.call('Page.bringToFront');
  await page.call('Emulation.setDeviceMetricsOverride', { width: 1800, height: 1100, deviceScaleFactor: 1, mobile: false });
  await page.call('Page.addScriptToEvaluateOnNewDocument', { source: `{
    const fetchOriginal=window.fetch.bind(window);window.fetch=(u,i)=>String(u).includes('/api/')?Promise.resolve(new Response(JSON.stringify({ok:true,projects:[],workspaces:[]}),{status:200,headers:{'Content-Type':'application/json'}})):fetchOriginal(u,i);
    const memory=new Map();Storage.prototype.getItem=function(k){return memory.get(String(k))??null};Storage.prototype.setItem=function(k,v){memory.set(String(k),String(v))};Storage.prototype.clear=function(){memory.clear()};Storage.prototype.removeItem=function(k){memory.delete(String(k))};
  }` });
  await page.call('Page.navigate', { url: appUrl });
  await waitFor('document.readyState==="complete"&&typeof nowGuideBuildPath==="function"');
  await evaluate(`(()=>{
    rememberAccessUnlocked();setAccessState(true);bootstrapAppOnce();scheduleCloudSync=()=>{};scheduleProjectsCloudSync=()=>{};
    state=${JSON.stringify(workspace)};activeProjectId=state.project.id;
    guruExportWithoutPersistenceV223(()=>{state=migrateWorkspace(state,activeProjectId)});
    projects=[{id:activeProjectId,name:state.project.name,lifecycleStatus:'active'}];
    activeView='project';activeGateId='gate-0';els.launcher.hidden=true;els.appShell.hidden=false;guruResetGateNavigationState();guruGateReadinessCache=new Map();
    guruExportWithoutPersistenceV223(()=>renderGateNav({recalculate:false}));nowGuideProtectedGate='gate-0';guruNavigateToGate('gate-0');return true;
  })()`);
  await waitFor('guruRenderedGateId==="gate-0"');
  await evaluate(`(()=>{
    guruCancelDerivedRefresh();guruDiscardUiPreferenceSave(activeProjectId);
    window.__disclosureBefore=JSON.stringify(state);window.__disclosureRoot=els.contentArea.firstChild;window.__disclosureCard=document.querySelector('#nowGuide').innerHTML;
    window.__disclosureCounts={};for(const name of ['guruNavigateToGate','renderGate','nowGuideRender','nowGuideBuildAllBlocks','saveState']){
      const original=window[name];window.__disclosureCounts[name]=0;window[name]=function(...args){window.__disclosureCounts[name]++;return original.apply(this,args)};
    }return true;
  })()`);
  const gates = await evaluate(`[...document.querySelectorAll('[data-now-disclosure]')].map(b=>b.dataset.nowDisclosure)`);
  assert(gates.includes('gate-0') && gates.includes('gate-2') && gates.includes('gate-4'));
  assert.equal(await evaluate(`document.querySelector('[data-now-disclosure="gate-7"]')===null`), true);
  for (const gate of gates) {
    const selector = `[data-now-disclosure="${gate}"]`;
    if (await evaluate(`document.querySelector(${JSON.stringify(selector)}).getAttribute('aria-expanded')==='true'`)) await click(selector);
    await click(selector);
    const opened = await evaluate(`(()=>{const b=document.querySelector(${JSON.stringify(selector)}),l=document.getElementById(b.getAttribute('aria-controls'));return {open:b.getAttribute('aria-expanded')==='true'&&!l.hidden,gate:activeGateId,rootSame:els.contentArea.firstChild===window.__disclosureRoot,focused:document.activeElement===b,width:b.getBoundingClientRect().width,height:b.getBoundingClientRect().height}})()`);
    assert(opened.open && opened.rootSame && opened.focused); assert.equal(opened.gate, 'gate-0'); assert(opened.width >= 44 && opened.height >= 44);
    await click(selector);
    assert(await evaluate(`document.querySelector(${JSON.stringify(selector)}).getAttribute('aria-expanded')==='false'&&document.querySelector('[data-now-children="${gate}"]').hidden`));
    evidence.toggles.push({ ...opened, gateId: gate });
  }
  evidence.disclosureOnly = await checkpoint();
  assert(Object.values(evidence.disclosureOnly.counts).every(n => n === 0), JSON.stringify(evidence.disclosureOnly.counts));
  evidence.exportUnchanged = await evaluate('window.__disclosureBefore===JSON.stringify(state)'); assert(evidence.exportUnchanged);
  assert(await evaluate(`document.querySelector('#nowGuide').innerHTML===window.__disclosureCard`));

  // Existing gate buttons navigate and preserve every disclosure state.
  const closed = (await checkpoint()).expanded;
  await click('[data-gate-id="gate-2"]'); await waitFor('guruRenderedGateId==="gate-2"');
  assert.deepEqual((await checkpoint()).expanded, closed);
  await resetCounters(); await click('[data-now-disclosure="gate-0"]');
  assert.equal((await checkpoint()).gate, 'gate-2');
  assert(Object.values((await checkpoint()).counts).every(n => n === 0));
  const opened = (await checkpoint()).expanded;
  await click('[data-gate-id="gate-0"]'); await waitFor('guruRenderedGateId==="gate-0"');
  assert.deepEqual((await checkpoint()).expanded, opened);
  await resetCounters(); await click('[data-gate-id="gate-0"]');
  assert.deepEqual((await checkpoint()).expanded, opened);
  assert.equal((await checkpoint()).counts.guruNavigateToGate, 1);
  evidence.navigationIndependent = true;

  // Native buttons retain Tab order and respond to Space and Enter.
  await evaluate(`document.querySelector('[data-gate-id="gate-0"]').focus()`);
  await key('Tab', 'Tab', 9);
  assert(await evaluate(`document.activeElement.matches('[data-now-disclosure="gate-0"]')`));
  await resetCounters();
  await key(' ', 'Space', 32);
  assert(await evaluate(`document.querySelector('[data-now-disclosure="gate-0"]').getAttribute('aria-expanded')==='false'`));
  await key('Enter', 'Enter', 13);
  assert(await evaluate(`document.querySelector('[data-now-disclosure="gate-0"]').getAttribute('aria-expanded')==='true'`));
  assert(Object.values((await checkpoint()).counts).every(n => n === 0));
  evidence.keyboard = true;

  // Refreshes preserve state, button identity and valid control ownership.
  await evaluate(`(()=>{window.__disclosureButton=document.querySelector('[data-now-disclosure="gate-0"]');nowGuideRender(nowGuideDisplayedPath,nowGuideDisplayedAllBlocks);return true})()`);
  assert(await evaluate(`window.__disclosureButton===document.querySelector('[data-now-disclosure="gate-0"]')&&document.querySelectorAll('#gateNav button button').length===0&&document.querySelector('[data-now-disclosure="gate-0"]').getAttribute('aria-expanded')==='true'`));
  await evaluate(`(()=>{window.__disclosureRegistry=nowGuideDisplayedAllBlocks;nowGuideRender(nowGuideDisplayedPath,[...window.__disclosureRegistry,{gateId:'gate-7',id:'temporary',key:'gate-7:temporary',kind:'task',title:'Проверка списка',status:'not_started'}]);nowGuideRender(nowGuideDisplayedPath,window.__disclosureRegistry);return true})()`);
  assert(await evaluate(`!document.querySelector('[data-now-disclosure="gate-7"]')&&!document.querySelector('[data-gate-id="gate-7"]').closest('.now-guide-gate-row')`));
  evidence.refresh = true;

  await evaluate(`document.querySelector('[data-gate-id="gate-0"]').scrollIntoView({block:'start'})`);
  const clip = await evaluate(`(()=>{const r=document.getElementById('appSidebar').getBoundingClientRect();return{x:Math.max(0,r.x),y:Math.max(0,r.y),width:r.width,height:Math.min(r.height,innerHeight),scale:1}})()`);
  const desktop = await page.call('Page.captureScreenshot', { format: 'png', clip, captureBeyondViewport: false });
  writeFileSync(`${output}/desktop.png`, Buffer.from(desktop.data, 'base64'));
  await page.call('Emulation.setDeviceMetricsOverride', { width: 1800, height: 1600, deviceScaleFactor: 1, mobile: false });
  await page.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 0, y: 0 });
  await evaluate(`document.activeElement.blur()`);
  const menuClip = await evaluate(`(()=>{const r=document.getElementById('gateNav').getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:Math.min(r.height,innerHeight-r.y),scale:1}})()`);
  const menu = await page.call('Page.captureScreenshot', { format: 'png', clip: menuClip, captureBeyondViewport: false });
  writeFileSync(`${output}/menu.png`, Buffer.from(menu.data, 'base64'));
  await page.call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await wait(150); await click('#sidebarToggle');
  assert(await evaluate(`document.getElementById('appShell').classList.contains('sidebar-open')`));
  await resetCounters(); await click('[data-now-disclosure="gate-0"]'); await click('[data-now-disclosure="gate-0"]');
  assert(await evaluate(`document.getElementById('appShell').classList.contains('sidebar-open')`));
  assert(Object.values((await checkpoint()).counts).every(n => n === 0));
  evidence.mobile = { drawerStaysOpen: true, noNavigationOrRender: true };
  evidence.stableDisclosurePosition = true;
  const mobile = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  writeFileSync(`${output}/mobile.png`, Buffer.from(mobile.data, 'base64'));
  const mobileExpanded = (await checkpoint()).expanded;
  await click('[data-gate-id="gate-2"]'); await waitFor('guruRenderedGateId==="gate-2"');
  assert(await evaluate(`!document.getElementById('appShell').classList.contains('sidebar-open')`));
  assert.deepEqual((await checkpoint()).expanded, mobileExpanded);
  evidence.mobile.navigationClosesDrawer = true;
  assert.equal(createHash('sha256').update(readFileSync(fixturePath)).digest('hex'), sourceHash);
  assert.deepEqual(page.errors, []);
  evidence.build = await evaluate('GURU_BUILD_INFO.version'); evidence.errors = page.errors; evidence.passed = true;
  writeFileSync(`${output}/results.json`, JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence, null, 2)); console.log('now-guide-disclosure-smoke: PASS');
} finally {
  await browser.call('Target.disposeBrowserContext', { browserContextId }); page.close(); browser.close();
}
