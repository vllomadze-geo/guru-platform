import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const port = process.env.GURU_CHROME_DEBUG_PORT || '9535';
const appUrl = process.env.GURU_APP_URL || 'http://127.0.0.1:9531/';
const fixturePath = process.env.GURU_NOW_KORICH_FIXTURE || '/private/tmp/guru-now-korich-workspace.json';
const fixtureBytes = readFileSync(fixturePath);
const sourceHash = createHash('sha256').update(fixtureBytes).digest('hex');
const fixture = JSON.parse(fixtureBytes);
const output = process.env.GURU_INFRA_ARTIFACTS || 'artifacts/webmaster-infrastructure';
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
const report = { sourceSha256: sourceHash, statuses: [] };
const shot = async (name, selector) => {
  await evaluate(`(()=>{const node=document.querySelector(${JSON.stringify(selector)});node.scrollIntoView({block:node.getBoundingClientRect().height>innerHeight-144?'start':'center',behavior:'instant'})})()`);
  await delay(250);
  const result = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  writeFileSync(`${output}/${name}.png`, Buffer.from(result.data, 'base64'));
};
try {
  await page.call('Page.enable'); await page.call('Runtime.enable'); await page.call('Page.bringToFront');
  await page.call('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1100, deviceScaleFactor: 1, mobile: false });
  await page.call('Page.addScriptToEvaluateOnNewDocument', { source: `const nativeFetch=window.fetch.bind(window);window.fetch=(u,i)=>String(u).includes('/api/')?Promise.resolve(new Response(JSON.stringify({ok:true,projects:[],workspaces:[]}),{status:200,headers:{'Content-Type':'application/json'}})):nativeFetch(u,i);const memory=new Map();Storage.prototype.getItem=function(k){return memory.get(String(k))??null};Storage.prototype.setItem=function(k,v){memory.set(String(k),String(v))};Storage.prototype.removeItem=function(k){memory.delete(String(k))};Storage.prototype.clear=function(){memory.clear()};` });
  await page.call('Page.navigate', { url: appUrl });
  await waitFor('document.readyState==="complete"&&typeof g0MarketingSourceForRowV1==="function"');
  report.initial = await evaluate(`(()=>{
    rememberAccessUnlocked();setAccessState(true);bootstrapAppOnce();scheduleCloudSync=()=>{};scheduleProjectsCloudSync=()=>{};
    state=${JSON.stringify(fixture.workspace || fixture)}; activeProjectId=state.project.id;
    window.__infraCard=()=>state.gates.find(g=>g.id==='gate-0').cards.find(isMegaMarketingCard);
    window.__infraRow=()=>__infraCard().megaMarketing.infra.find(r=>r.name==='Яндекс Вебмастер');
    const before=JSON.stringify(__infraRow());
    guruExportWithoutPersistenceV223(()=>{state=migrateWorkspace(state,activeProjectId)});
    projects=[{id:activeProjectId,name:state.project.name,lifecycleStatus:'active'}];updateProjectChrome();els.launcher.hidden=true;els.appShell.hidden=false;
    ensureMegaMarketing(__infraCard(),state);guruCancelDerivedRefresh();guruDiscardUiPreferenceSave(activeProjectId);
    window.__baselineRow=JSON.stringify(__infraRow());
    const frozen=Object.freeze({infra:Object.freeze([Object.freeze({...__infraRow()})])});
    const snapshot=JSON.stringify(frozen);gate1WebmasterApplyDerivedGate0V295(Object.freeze({}),frozen);
    return {build:GURU_BUILD_INFO.version,before,after:__baselineRow,pure:snapshot===JSON.stringify(frozen),g1Status:gate1WebmasterOverallV295(state).infraStatus};
  })()`);
  assert.equal(report.initial.before, report.initial.after, 'Loading rewrote the infrastructure row');
  assert(report.initial.pure, 'Legacy projection must not write defaults or status');
  await evaluate(`(()=>{activeView='gate';activeGateId='gate-0';state._gate0Open={...(state._gate0Open||{}),'card-7':true};guruNavigateToGate('gate-0');renderGate()})()`);
  await waitFor(`document.querySelector('[data-mega-system-section="infra"] select[aria-label="Статус: Яндекс Вебмастер"]')`);
  await delay(700);
  report.render = await evaluate(`(()=>{
    const select=document.querySelector('[data-mega-system-section="infra"] select[aria-label="Статус: Яндекс Вебмастер"]');
    const row=select.closest('tr'); window.__getSelect=()=>document.querySelector('[data-mega-system-section="infra"] select[aria-label="Статус: Яндекс Вебмастер"]');
    return {unchanged:__baselineRow===JSON.stringify(__infraRow()),value:select.value,options:[...select.options].map(o=>o.value),source:JSON.parse(row.querySelector('[data-g0-marketing-source]').dataset.g0MarketingSource),noGate1Link:!row.querySelector('[data-g1-webmaster-open-v295]')};
  })()`);
  assert(report.render.unchanged && report.render.noGate1Link);
  assert.deepEqual(report.render.source, {gate:'gate-2',card:'card-107',label:'Яндекс Вебмастер'});
  await shot('01-editable-status', '[data-mega-system-section="infra"]');
  for (const status of ['works','needs_improvement','broken','missing','not_needed']) {
    assert(report.render.options.includes(status), `Missing option ${status}`);
    const result = await evaluate(`(()=>{
      const gate1=JSON.stringify(state.gates.find(g=>g.id==='gate-1'));
      const other=JSON.stringify(__infraCard().megaMarketing.infra.filter(r=>r.name!=='Яндекс Вебмастер'));
      const comment=__infraRow().comment; const input=__getSelect();input.value=${JSON.stringify(status)};input.dispatchEvent(new Event('change',{bubbles:true}));
      ensureMegaMarketing(__infraCard(),state);ensureMegaMarketing(__infraCard(),state);
      return {status:__infraRow().status,label:input.closest('.mega-system-status-shell-v1').textContent,gate1Unchanged:gate1===JSON.stringify(state.gates.find(g=>g.id==='gate-1')),othersUnchanged:other===JSON.stringify(__infraCard().megaMarketing.infra.filter(r=>r.name!=='Яндекс Вебмастер')),commentUnchanged:comment===__infraRow().comment,stored:JSON.stringify(__infraRow())};
    })()`);
    assert.equal(result.status,status,'The selected status was overwritten');
    assert(result.gate1Unchanged && result.othersUnchanged && result.commentUnchanged);
    report.statuses.push(result);
  }
  await shot('02-not-required', '[data-mega-system-section="infra"]');
  // Round-trip the exported copy, including historical flags, without touching real storage.
  report.roundTrip=await evaluate(`(()=>{const row=JSON.stringify(__infraRow());state=JSON.parse(JSON.stringify(state));ensureMegaMarketing(__infraCard(),state);return row===JSON.stringify(__infraRow())})()`);
  assert(report.roundTrip);
  await evaluate(`__getSelect().closest('tr').querySelector('[data-g0-marketing-source]').click()`);
  await waitFor(`activeGateId==='gate-2'&&document.querySelector('[data-g2sb-id="company-webmaster"]')?.open`);
  await delay(1000);
  report.navigation=await evaluate(`(()=>{const n=document.querySelector('[data-g2sb-id="company-webmaster"]');const r=n.getBoundingClientRect();return {open:n.open,visible:r.height>0&&r.top>=-1&&r.top<innerHeight,highlighted:n.classList.contains('guru-source-target-v212'),status:__infraRow().status}})()`);
  assert(report.navigation.open && report.navigation.visible && report.navigation.highlighted);
  assert.equal(report.navigation.status,'not_needed');
  await shot('03-gate2-webmaster', '[data-g2sb-id="company-webmaster"]');
  assert.deepEqual(page.errors,[]);
  assert.equal(createHash('sha256').update(readFileSync(fixturePath)).digest('hex'),sourceHash);
  report.passed=true;
  writeFileSync(`${output}/results.json`,JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));console.log('Gate 0 Webmaster infrastructure smoke: PASS');
} finally {
  await browser.call('Target.disposeBrowserContext',{browserContextId});page.close();browser.close();
}
