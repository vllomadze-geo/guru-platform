import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const port = process.env.GURU_CHROME_DEBUG_PORT || '9535';
const appUrl = process.env.GURU_APP_URL || 'http://127.0.0.1:9531/';
const output = 'artifacts/company-query-navigation';
mkdirSync(output, { recursive: true });
const files = [
  '/private/tmp/guru-competitor-recovery-original.json',
  '/private/tmp/guru-now-icleaning-workspace.json',
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
      if (message.error) task.reject(new Error(message.error.message)); else task.resolve(message.result);
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
  while (Date.now() - start < 30000) {
    if (await evaluate(expression)) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Timeout: ${expression}`);
};
const screenshot = async name => {
  await page.call('Page.bringToFront');
  const image = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  writeFileSync(`${output}/${name}.png`, Buffer.from(image.data, 'base64'));
};

const report = [];
try {
  await page.call('Runtime.enable'); await page.call('Page.enable');
  await page.call('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1200, deviceScaleFactor: 1, mobile: false });
  await page.call('Page.addScriptToEvaluateOnNewDocument', { source: `const mem=new Map();Storage.prototype.getItem=function(k){return mem.get(String(k))??null};Storage.prototype.setItem=function(k,v){mem.set(String(k),String(v))};Storage.prototype.removeItem=function(k){mem.delete(String(k))};Storage.prototype.clear=function(){mem.clear()};const f=fetch.bind(window);window.fetch=(u,i)=>String(u).includes('/api/')?Promise.resolve(new Response(JSON.stringify({ok:true,projects:[],workspaces:[]}))):f(u,i);` });
  await page.call('Page.navigate', { url: appUrl });
  await waitFor('document.readyState==="complete"&&typeof g1CompanyQueryNavigatorHtml==="function"');
  await evaluate('rememberAccessUnlocked();setAccessState(true);bootstrapAppOnce();scheduleCloudSync=()=>{};scheduleProjectsCloudSync=()=>{};true');
  for (const [fileIndex, file] of files.entries()) {
    if (fileIndex) {
      await page.call('Page.navigate', { url: appUrl });
      await waitFor('document.readyState==="complete"&&typeof g1CompanyQueryNavigatorHtml==="function"');
      await evaluate('rememberAccessUnlocked();setAccessState(true);bootstrapAppOnce();scheduleCloudSync=()=>{};scheduleProjectsCloudSync=()=>{};true');
    }
    const raw = JSON.parse(readFileSync(file)), source = raw.workspace || raw.content || raw;
    await evaluate(`(()=>{guruCancelDerivedRefresh();activeProjectId=${JSON.stringify(source.project.id)};state=guruExportWithoutPersistenceV223(()=>migrateWorkspace(${JSON.stringify(source)},${JSON.stringify(source.project.id)}));projects=[{id:activeProjectId,name:state.project.name,lifecycleStatus:'active'}];updateProjectChrome();els.launcher.hidden=true;els.appShell.hidden=false;activeView='gate';activeGateId='gate-1';nowGuideRegistryCache=null;renderGateNav({recalculate:false});return true})()`);
    await evaluate(`(()=>{const item=nowGuideWithReadPass(()=>nowGuideBuildAllBlocks()).find(i=>i.id==='project-comparison');if(item)nowGuideOpen(item);else renderGate();return true})()`);
    await evaluate(`(()=>{const section=document.querySelector('[data-g1bp-company]');if(!section) throw Error('Company comparison missing after opening guide');section.classList.add('is-open');section.querySelector('.project-comparison-body').hidden=false;section.scrollIntoView({block:'start',behavior:'instant'});window.__navBefore=JSON.stringify(state);return true})()`);
    const result = await evaluate(`(()=>{
      const section=document.querySelector('[data-g1bp-company]');
      const group=g1CompanyComparisonGroups()[0], entry=state.projectComparison || {};
      const statusBefore=JSON.stringify(projectComparisonStatus());
      const nav=section.querySelector('[data-company-query-nav]');
      if (!nav) return { missing:true, project:state.project.name, total:group.phrases.length,
        unchanged:window.__navBefore===JSON.stringify(state) };
      const model=g1CompanyQueryNavigatorModel(entry,group,g1CompanyComparisonSuggestedPhrase(entry,group));
      const options=[...nav.querySelectorAll('[data-company-query-nav-option]')];
      const allStats=options.every((option,index)=>{
        const counts=model.queries[index].counts, text=option.innerText;
        return option.dataset.companyQueryNavOption===group.phrases[index].key &&
          text.includes('Найдено по запросу: '+counts.total) &&
          text.includes('Близкие конкуренты: '+counts.close) &&
          text.includes('Дальние конкуренты: '+counts.far) &&
          text.includes('Соседи по выдаче: '+counts.neighbor);
      });
      const currentKey=g1CompanyComparisonSuggestedPhrase(entry,group).key;
      nav.querySelector('[data-company-query-nav-toggle]').click();
      const opened=!nav.querySelector('[data-company-query-nav-list]').hidden && nav.querySelector('[data-company-query-nav-toggle]').getAttribute('aria-expanded')==='true';
      nav.querySelector('[data-company-query-nav-option]').focus();
      nav.querySelector('[data-company-query-nav-option]').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));
      const arrowMoves=options.length<2 || document.activeElement===options[1];
      document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
      const escapeCloses=nav.querySelector('[data-company-query-nav-list]').hidden && document.activeElement===nav.querySelector('[data-company-query-nav-toggle]');
      nav.querySelector('[data-company-query-nav-toggle]').click();
      const selected=options.find(option=>option.dataset.companyQueryNavOption!==currentKey) || options[0];
      const selectedKey=selected?.dataset.companyQueryNavOption;
      selected?.click();
      const switched=g1CompanyComparisonSuggestedPhrase(state.projectComparison || {},group)?.key===selectedKey;
      const focusRestored=document.activeElement===section.querySelector('[data-company-query-nav-toggle]');
      section.querySelector('[data-company-competitor-toggle]').click();
      const form=section.querySelector('[data-company-competitor-form]');
      form.elements.domain.value='draft.example';
      const currentNav=section.querySelector('[data-company-query-nav]');
      currentNav.querySelector('[data-company-query-nav-toggle]').click();
      [...currentNav.querySelectorAll('[data-company-query-nav-option]')]
        .find(option=>option.dataset.companyQueryNavOption!==selectedKey)?.click();
      const draftPreserved=form.elements.domain.value==='draft.example' &&
        g1CompanyComparisonSuggestedPhrase(state.projectComparison || {},group)?.key===selectedKey &&
        section.querySelector('[data-company-guide-notice]').textContent.includes('Сначала добавьте конкурента');
      section.querySelector('[data-company-competitor-cancel]').click();
      const after=JSON.stringify(state);
      return {project:state.project.name,total:group.phrases.length,processed:model.processed,items:options.length,allStats,opened,arrowMoves,escapeCloses,switched,focusRestored,draftPreserved,unchanged:window.__navBefore===after,statusUnchanged:statusBefore===JSON.stringify(projectComparisonStatus()),selectedKey};
    })()`);
    if (result.missing) {
      assert.equal(result.total, 0, `${result.project}: navigator missing with queries`);
      assert(result.unchanged, `${result.project}: empty view changed project data`);
      report.push(result); console.log(`${result.project}: PASS (empty query list)`);
      continue;
    }
    assert.equal(result.items, result.total, `${result.project}: query count`);
    for (const key of ['allStats', 'opened', 'arrowMoves', 'escapeCloses', 'switched', 'focusRestored', 'draftPreserved', 'unchanged', 'statusUnchanged'])
      assert(result[key], `${result.project}: ${key}`);
    if (fileIndex === 0) {
      await screenshot('widget-closed');
      await evaluate(`(()=>{const nav=document.querySelector('[data-company-query-nav]');nav.querySelector('[data-company-query-nav-toggle]').click();return true})()`);
      await screenshot('widget-open');
      await evaluate(`(()=>{document.querySelector('[data-company-query-nav-option]:last-child').click();return true})()`);
      await screenshot('widget-selected');
      await evaluate(`(()=>{const section=document.querySelector('[data-g1bp-company]');const entry=state.projectComparison || {},group=g1CompanyComparisonGroups()[0];const phrase=group.phrases.reduce((best,row)=>g1CompanySearchMatchCounts(entry,group,row.key).total>g1CompanySearchMatchCounts(entry,group,best.key).total?row:best,group.phrases[0]);const nav=section.querySelector('[data-company-query-nav]');nav.querySelector('[data-company-query-nav-toggle]').click();const option=[...nav.querySelectorAll('[data-company-query-nav-option]')].find(node=>node.dataset.companyQueryNavOption===phrase.key);option.scrollIntoView({block:'center'});option.focus({preventScroll:true});return true})()`);
      await screenshot('widget-results');
      const nextAppearance = await evaluate(`(()=>{const entry=state.projectComparison || {},group=g1CompanyComparisonGroups()[0];const phrase=group.phrases.find(row=>g1CompanyQueryNavigatorModel(entry,group,row).queries.find(item=>item.phrase.key===row.key)?.processed);const option=[...document.querySelectorAll('[data-company-query-nav-option]')].find(node=>node.dataset.companyQueryNavOption===phrase?.key);option?.click();const button=document.querySelector('[data-company-search-next]');const style=getComputedStyle(button);return {enabled:!button.disabled,background:style.backgroundColor,color:style.color}})()`);
      assert(nextAppearance.enabled && nextAppearance.background==='rgb(31, 27, 22)' && nextAppearance.color==='rgb(255, 255, 255)', 'Enabled next button appearance');
      await screenshot('next-enabled');
      const placement = await evaluate(`(()=>{const nav=document.querySelector('[data-company-query-nav]');document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));const toggle=nav.querySelector('[data-company-query-nav-toggle]');window.scrollBy(0,toggle.getBoundingClientRect().top-(window.innerHeight-90));toggle.click();const bounds=nav.querySelector('[data-company-query-nav-list]').getBoundingClientRect();return {above:nav.classList.contains('is-above'),visible:bounds.top>=0&&bounds.bottom<=window.innerHeight}})()`);
      assert(placement.above && placement.visible, 'Popover placement near viewport bottom');
      assert(await evaluate('window.__navBefore===JSON.stringify(state)'), 'Screenshot navigation changed project data');
    }
    report.push(result); console.log(`${result.project}: PASS (${result.processed}/${result.total})`);
  }
  assert.deepEqual(page.errors, []);
  writeFileSync(`${output}/results.json`, JSON.stringify(report, null, 2));
} finally {
  await browser.call('Target.disposeBrowserContext', { browserContextId }).catch(() => {});
  page.close(); browser.close();
}
