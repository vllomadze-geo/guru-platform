import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const endpoint = `http://127.0.0.1:${process.env.GURU_CHROME_DEBUG_PORT || '9535'}`;
const appUrl = process.env.GURU_APP_URL || 'http://127.0.0.1:3000/';
const output = 'artifacts/company-keyword-relevance';
mkdirSync(output, { recursive: true });
const sha = value => createHash('sha256').update(value).digest('hex');
const files = [
  '/private/tmp/guru-competitor-recovery-original.json',
  '/private/tmp/guru-step6-icleaning-workspace.json',
  '/private/tmp/guru-step6-sivrce-workspace.json',
  '/private/tmp/guru-step6-guru-workspace.json',
];

class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url); this.id = 0; this.pending = new Map(); this.errors = [];
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
    this.socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.method === 'Runtime.exceptionThrown')
        this.errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
      const task = this.pending.get(message.id); if (!task) return;
      this.pending.delete(message.id); clearTimeout(task.timer);
      message.error ? task.reject(new Error(message.error.message)) : task.resolve(message.result);
    });
  }
  async call(method, params = {}) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 120000);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.socket.close(); }
}

const version = await (await fetch(`${endpoint}/json/version`)).json();
const browser = new Cdp(version.webSocketDebuggerUrl);
const { browserContextId } = await browser.call('Target.createBrowserContext');
const { targetId } = await browser.call('Target.createTarget', { url: 'about:blank', browserContextId });
const tabs = await (await fetch(`${endpoint}/json`)).json();
const page = new Cdp(tabs.find(tab => tab.id === targetId).webSocketDebuggerUrl);
const evaluate = async expression => {
  const result = await page.call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
};
const waitFor = async expression => {
  const start = Date.now();
  while (Date.now() - start < 30000) {
    if (await evaluate(expression)) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Timeout: ${expression}`);
};
const screenshot = async name => {
  await evaluate(`(()=>{const node=document.querySelector('[data-company-keyword-map]');node.scrollIntoView({block:'start',behavior:'instant'});return true})()`);
  const image = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  writeFileSync(`${output}/${name}.png`, Buffer.from(image.data, 'base64'));
};
const baseline = () => `nowGuideWithReadPass(()=>{const all=nowGuideBuildAllBlocks(),path=nowGuidePreflightPath(all),current=nowGuideCurrent(path);return {gate1:nowGuideLaunchReadiness(all.filter(i=>i.gateId==='gate-1')),step:current?.key,missing:current?nowGuideMissingHtml(current):'',launch:nowGuideLaunchReadiness(path)}})`;
const report = [];
try {
  await page.call('Runtime.enable'); await page.call('Page.enable');
  await page.call('Emulation.setDeviceMetricsOverride', { width: 1500, height: 900, deviceScaleFactor: 1, mobile: false });
  await page.call('Page.addScriptToEvaluateOnNewDocument', { source: `const mem=new Map();Storage.prototype.getItem=function(k){return mem.get(String(k))??null};Storage.prototype.setItem=function(k,v){mem.set(String(k),String(v))};Storage.prototype.removeItem=function(k){mem.delete(String(k))};Storage.prototype.clear=function(){mem.clear()};const f=fetch.bind(window);window.fetch=(u,i)=>String(u).includes('/api/')?Promise.resolve(new Response(JSON.stringify({ok:true,projects:[],workspaces:[]}))):f(u,i);` });
  await page.call('Page.navigate', { url: appUrl });
  await waitFor('document.readyState==="complete"&&typeof g1CompanyKeywordFilterHtml==="function"');
  await evaluate('rememberAccessUnlocked();setAccessState(true);bootstrapAppOnce();scheduleCloudSync=()=>{};scheduleProjectsCloudSync=()=>{};true');
  for (const [index, file] of files.entries()) {
    const bytes = readFileSync(file), raw = JSON.parse(bytes), source = raw.workspace || raw.content || raw;
    await evaluate(`(()=>{guruCancelDerivedRefresh();activeProjectId=${JSON.stringify(source.project.id)};state=guruExportWithoutPersistenceV223(()=>migrateWorkspace(${JSON.stringify(source)},${JSON.stringify(source.project.id)}));projects=[{id:activeProjectId,name:state.project.name,lifecycleStatus:'active'}];updateProjectChrome();els.launcher.hidden=true;els.appShell.hidden=false;activeView='gate';activeGateId='gate-1';nowGuideRegistryCache=null;renderGateNav({recalculate:false});return true})()`);
    await evaluate(`(()=>{const item=nowGuideWithReadPass(()=>nowGuideBuildAllBlocks()).find(i=>i.id==='project-comparison');nowGuideOpen(item);return true})()`);
    await waitFor(`!!document.querySelector('[data-g1bp-company] [data-company-keyword-map]')`);
    const before = await evaluate('JSON.stringify(state)');
    const guideBefore = await evaluate(baseline());
    const pure = await evaluate(`(()=>{const e=state.projectComparison||{},g=g1CompanyComparisonGroups()[0],data=g1CompanyKeywordFilterData(e,g),view=g1CompanyKeywordFilterView(),d=g1CompanyKeywordFilterDerive(data,view);return {competitors:data.competitors.length,phrases:data.phrases.length,types:d.types,relevances:d.relevances,counts:d.rows.map(r=>r.count),linked:data.competitors.map(c=>c.foundKeys.length)}})()`);
    if (index === 0) {
      const domBefore = await evaluate(`(()=>{const n=document.querySelector('[data-g1bp-company]').cloneNode(true);n.querySelector('[data-company-keyword-map-list]').innerHTML='';return n.outerHTML})()`);
      await screenshot('01-collapsed');
      await evaluate(`document.querySelector('[data-company-keyword-map-toggle]').click()`);
      await screenshot('02-expanded');
      assert.deepEqual(pure.relevances.map(item => [item.key, item.count]).sort(), [['low', 1], ['unrated', 14]].sort());
      const defaultOrder = await evaluate(`[...document.querySelectorAll('[data-company-filter-row]')].map(n=>n.textContent.match(/\\d+ из \\d+/)?.[0])`);
      assert(defaultOrder.length >= 5 && defaultOrder[0]);
      assert.equal(await evaluate(`document.querySelectorAll('.g1-company-filter-top').length`), 5);
      await evaluate(`document.querySelector('[data-company-filter-relevance="low"]').click()`);
      const low = await evaluate(`(()=>{const d=g1CompanyKeywordFilterDerive(g1CompanyKeywordFilterData(state.projectComparison,g1CompanyComparisonGroups()[0]),g1CompanyKeywordFilterView());return {m:d.queryCount,allPositive:d.rows.every(r=>r.count>0),counts:d.rows.map(r=>r.count),unmatched:d.unmatched.length}})()`);
      assert.equal(low.m, 1);
      assert(low.allPositive);
      await screenshot('03-low');
      await evaluate(`document.querySelector('[data-company-filter-relevance="unrated"]').click()`);
      const unrated = await evaluate(`(()=>{const d=g1CompanyKeywordFilterDerive(g1CompanyKeywordFilterData(state.projectComparison,g1CompanyComparisonGroups()[0]),g1CompanyKeywordFilterView());return {m:d.queryCount,allPositive:d.rows.every(r=>r.count>0),top:document.querySelectorAll('.g1-company-filter-top').length,unmatched:d.unmatched.length,visibleUnmatched:document.querySelector('.g1-company-filter-unmatched summary')?.textContent||''}})()`);
      assert.equal(unrated.m, 14);
      assert(unrated.allPositive);
      assert(unrated.top <= 5);
      assert.equal(unrated.visibleUnmatched, unrated.unmatched ? `Запросы без конкурентов · ${unrated.unmatched}` : '');
      await screenshot('04-unrated');
      assert.equal(unrated.top, 5, 'Top-5 must be recomputed in unrated slice');
      await screenshot('05-top-five-recomputed');
      const chosenType = await evaluate(`(()=>{const d=g1CompanyKeywordFilterDerive(g1CompanyKeywordFilterData(state.projectComparison,g1CompanyComparisonGroups()[0]),g1CompanyKeywordFilterView());return d.rows[0]?.type||''})()`);
      assert(chosenType);
      await evaluate(`document.querySelector('[data-company-filter-type=${JSON.stringify(chosenType)}]').click()`);
      const combined = await evaluate(`(()=>{const d=g1CompanyKeywordFilterDerive(g1CompanyKeywordFilterData(state.projectComparison,g1CompanyComparisonGroups()[0]),g1CompanyKeywordFilterView());return {m:d.queryCount,types:[...new Set(d.rows.map(r=>r.type))],count:d.rows.length,active:!document.querySelector('[data-company-filter-active]').hidden}})()`);
      assert.equal(combined.m, 14);
      assert.deepEqual(combined.types, [chosenType]);
      assert(combined.active);
      await screenshot('06-combined-type');
      const search = await evaluate(`(()=>{const input=document.querySelector('[data-company-filter-search]');input.focus();input.value='livemaster';input.dispatchEvent(new Event('input',{bubbles:true}));return {focused:document.activeElement===input,value:input.value,active:!document.querySelector('[data-company-filter-active]').hidden}})()`);
      assert(search.focused && search.active && search.value === 'livemaster');
      await screenshot('07-active-filter-reset');
      await evaluate(`document.querySelector('[data-company-filter-reset]').click()`);
      const reset = await evaluate(`(()=>({search:document.querySelector('[data-company-filter-search]').value,type:g1CompanyKeywordFilterView().type,relevance:g1CompanyKeywordFilterView().relevance,active:!document.querySelector('[data-company-filter-active]').hidden,rows:document.querySelectorAll('[data-company-filter-row]').length,m:g1CompanyKeywordFilterDerive(g1CompanyKeywordFilterData(state.projectComparison,g1CompanyComparisonGroups()[0]),g1CompanyKeywordFilterView()).queryCount}))()`);
      assert.deepEqual(reset, { search:'', type:'', relevance:'', active:false, rows:pure.competitors, m:pure.phrases });
      await screenshot('08-reset');
      await evaluate(`document.querySelector('[data-company-filter-relevance="unrated"]').click()`);
      await evaluate(`document.querySelector('[data-company-filter-row]').click()`);
      const expanded = await evaluate(`(()=>{const d=g1CompanyKeywordFilterDerive(g1CompanyKeywordFilterData(state.projectComparison,g1CompanyComparisonGroups()[0]),g1CompanyKeywordFilterView());const q=[...document.querySelectorAll('.g1-company-filter-queries [data-company-search-show-key]')].map(n=>n.dataset.companySearchShowKey);return {shown:q,expected:d.rows[0].queries.map(p=>p.key)}})()`);
      assert.deepEqual(expanded.shown, expanded.expected);
      await evaluate(`(()=>{const toggle=document.querySelector('[data-company-keyword-map-toggle]');if(toggle?.getAttribute('aria-expanded')==='true')toggle.click();return !!toggle})()`);
      const domAfter = await evaluate(`(()=>{const n=document.querySelector('[data-g1bp-company]').cloneNode(true);n.querySelector('[data-company-keyword-map-list]').innerHTML='';return n.outerHTML})()`);
      assert.equal(domAfter, domBefore, 'DOM outside disclosure changed');
    }
    const after = await evaluate('JSON.stringify(state)');
    assert.equal(after, before, `Serialized project changed for ${source.project.name}`);
    const guideAfter = await evaluate(baseline());
    assert.deepEqual(guideAfter, guideBefore, `Readiness or Now changed for ${source.project.name}`);
    report.push({ project: source.project.name, fixtureSha256: sha(bytes), projectBeforeSha256: sha(before), projectAfterSha256: sha(after), projectIdentical: true, guide: guideAfter, ...pure });
    console.log(`${source.project.name}: PASS`);
  }
  assert.deepEqual(page.errors, []);
  writeFileSync(`${output}/smoke-results.json`, JSON.stringify({ report }, null, 2));
} finally {
  await browser.call('Target.disposeBrowserContext', { browserContextId }).catch(() => {});
  page.close(); browser.close();
}
