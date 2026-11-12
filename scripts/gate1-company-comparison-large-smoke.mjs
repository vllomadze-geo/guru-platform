import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const folder = 'artifacts/company-comparison-large';
mkdirSync(folder, { recursive: true });
const raw = JSON.parse(readFileSync('/private/tmp/guru-step6-sivrce-workspace.json'));
const source = raw.workspace || raw.content || raw;

class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url); this.id = 0; this.pending = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
    this.socket.addEventListener('message', event => {
      const message = JSON.parse(event.data), task = this.pending.get(message.id);
      if (!task) return;
      this.pending.delete(message.id); clearTimeout(task.timer);
      if (message.error) task.reject(new Error(message.error.message)); else task.resolve(message.result);
    });
  }
  async call(method, params = {}) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const id = ++this.id, timer = setTimeout(() => reject(new Error(`CDP timeout: ${method}`)), 60000);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.socket.close(); }
}

const version = await (await fetch('http://127.0.0.1:9535/json/version')).json();
const browser = new Cdp(version.webSocketDebuggerUrl);
const { browserContextId } = await browser.call('Target.createBrowserContext');
const { targetId } = await browser.call('Target.createTarget', { url: 'about:blank', browserContextId });
const tabs = await (await fetch('http://127.0.0.1:9535/json')).json();
const page = new Cdp(tabs.find(tab => tab.id === targetId).webSocketDebuggerUrl);
const evaluate = async expression => {
  const result = await page.call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
};
const screenshot = async name => {
  await evaluate('document.querySelector(".g1-company-compare-title").scrollIntoView({block:"start",behavior:"instant"});true');
  const image = await page.call('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${folder}/${name}.png`, Buffer.from(image.data, 'base64'));
};

try {
  await page.call('Runtime.enable'); await page.call('Page.enable');
  await page.call('Emulation.setDeviceMetricsOverride', { width: 1880, height: 1050, deviceScaleFactor: 1, mobile: false });
  await page.call('Page.addScriptToEvaluateOnNewDocument', { source: `const mem=new Map();Storage.prototype.getItem=function(k){return mem.get(String(k))??null};Storage.prototype.setItem=function(k,v){mem.set(String(k),String(v))};Storage.prototype.removeItem=function(k){mem.delete(String(k))};Storage.prototype.clear=function(){mem.clear()};const f=fetch.bind(window);window.fetch=(u,i)=>String(u).includes('/api/')?Promise.resolve(new Response(JSON.stringify({ok:true,projects:[],workspaces:[]}))):f(u,i);` });
  await page.call('Page.navigate', { url: 'http://127.0.0.1:9531/' });
  const start = Date.now();
  while (!(await evaluate('document.readyState==="complete" && typeof projectComparisonHtml==="function"'))) {
    if (Date.now() - start > 30000) throw new Error('App load timeout');
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  await evaluate('rememberAccessUnlocked();setAccessState(true);bootstrapAppOnce();scheduleCloudSync=()=>{};scheduleProjectsCloudSync=()=>{};true');
  const result = await evaluate(`(()=>{
    guruCancelDerivedRefresh();activeProjectId=${JSON.stringify(source.project.id)};
    state=guruExportWithoutPersistenceV223(()=>migrateWorkspace(${JSON.stringify(source)},${JSON.stringify(source.project.id)}));
    projects=[{id:activeProjectId,name:state.project.name,lifecycleStatus:'active'}];
    updateProjectChrome();els.launcher.hidden=true;els.appShell.hidden=false;
    activeView='gate';activeGateId='gate-1';
    const base=state.projectComparison.competitors[0];
    state.projectComparison.competitors=Array.from({length:164},(_,index)=>({
      ...structuredClone(base),id:'stress-competitor-'+index,
      name:'Конкурент '+String(index+1).padStart(3,'0'),domain:'competitor-'+index+'.example',
      siteDomainV538:'competitor-'+index+'.example',
      classificationV539:{sameMarket:index>=45?'no':'yes',sameBusiness:index<4?'yes':'no'},
      typeV539:index<4?'direct':index<45?'substitute':'unrelated'}));
    state.projectComparison.open=true;
    const before=JSON.stringify(state), t=performance.now();
    els.contentArea.innerHTML=projectComparisonHtml();
    const renderMs=Math.round(performance.now()-t);
    const atRender=before===JSON.stringify(state);
    const section=els.contentArea.querySelector('[data-g1bp-company]');
    const grid=section.querySelector('[data-g1bp-company-compare]');
    const ids=()=>[...section.querySelectorAll('[data-g1bp-company-column]')].map(node=>node.dataset.g1bpCompanyColumn);
    const widths=()=>[...grid.querySelectorAll('.g1-company-compare-column')].map(node=>Math.round(node.getBoundingClientRect().width));
    const first={ids:ids(),widths:widths(),noOverflow:grid.scrollWidth<=grid.clientWidth,
      pager:section.querySelector('[data-g1bp-company-page-label]').textContent};
    const filterButtons=[...section.querySelectorAll('[data-g1bp-company-compare-filter]')];
    const filterLabels=filterButtons.map(button=>button.textContent);
    const selectFilter=kind=>section.querySelector('[data-g1bp-company-compare-filter="'+kind+'"]').click();
    selectFilter('close');
    const close={ids:ids(),pager:section.querySelector('[data-g1bp-company-page-label]').textContent,
      active:section.querySelector('[data-g1bp-company-compare-filter="close"]').getAttribute('aria-pressed')};
    selectFilter('far');
    const far={ids:ids(),pager:section.querySelector('[data-g1bp-company-page-label]').textContent};
    selectFilter('neighbor');
    const neighbor={ids:ids(),pager:section.querySelector('[data-g1bp-company-page-label]').textContent};
    selectFilter('');
    const atFilters=before===JSON.stringify(state);
    section.querySelector('[data-g1bp-company-page-next]').click();
    const atNext=before===JSON.stringify(state);
    const next={ids:ids(),pager:section.querySelector('[data-g1bp-company-page-label]').textContent};
    const select=section.querySelector('[data-g1bp-company-page-select]');
    select.value='54';select.dispatchEvent(new Event('change',{bubbles:true}));
    const atSelect=before===JSON.stringify(state);
    const last={ids:ids(),pager:section.querySelector('[data-g1bp-company-page-label]').textContent};
    const added={...structuredClone(base),id:'stress-added',name:'Добавленный конкурент'};
    state.projectComparison.competitors.push(added);
    const appended=g1BergenAppendCompetitorV580(section,state.projectComparison,added,
      g1CompanyComparisonContext(),g1CompanyComparisonGroups());
    const add={appended,ids:ids(),pager:section.querySelector('[data-g1bp-company-page-label]').textContent};
    const removedIndex=state.projectComparison.competitors.findIndex(row=>row.id===added.id);
    state.projectComparison.competitors.splice(removedIndex,1);
    const removed=g1BergenRemoveCompetitorV580(section,state.projectComparison,removedIndex);
    const remove={removed,ids:ids(),pager:section.querySelector('[data-g1bp-company-page-label]').textContent};
    const after=JSON.stringify(state);let mismatch=0;
    while(mismatch<Math.min(before.length,after.length)&&before[mismatch]===after[mismatch]) mismatch++;
    if(mismatch===before.length&&mismatch===after.length) mismatch=-1;
    return {renderMs,first,filterLabels,close,far,neighbor,atFilters,next,last,add,remove,
      readOnly:before===after,atRender,atNext,atSelect,
      mismatch:mismatch<0?-1:{position:mismatch,beforeLength:before.length,afterLength:after.length,
        before:before.slice(mismatch-60,mismatch+140),after:after.slice(mismatch-60,mismatch+140)},
      total:state.projectComparison.competitors.length};
  })()`);
  assert.equal(result.total, 164);
  assert(result.readOnly, 'Paging or rendering changed project data: '+JSON.stringify({atRender:result.atRender,atNext:result.atNext,atSelect:result.atSelect,mismatch:result.mismatch}));
  assert.deepEqual(result.first.ids, ['stress-competitor-0','stress-competitor-1','stress-competitor-2']);
  assert.deepEqual(result.filterLabels, ['Все · 164','Близкие конкуренты · 4',
    'Дальние конкуренты · 41','Соседи по выдаче · 119']);
  assert.deepEqual(result.close.ids, ['stress-competitor-0','stress-competitor-1','stress-competitor-2']);
  assert.equal(result.close.pager, 'Конкуренты 1–3 из 4');
  assert.equal(result.close.active, 'true');
  assert.deepEqual(result.far.ids, ['stress-competitor-4','stress-competitor-5','stress-competitor-6']);
  assert.equal(result.far.pager, 'Конкуренты 1–3 из 41');
  assert.deepEqual(result.neighbor.ids, ['stress-competitor-45','stress-competitor-46','stress-competitor-47']);
  assert.equal(result.neighbor.pager, 'Конкуренты 1–3 из 119');
  assert(result.atFilters, 'Filters changed project data');
  assert.deepEqual(result.next.ids, ['stress-competitor-3','stress-competitor-4','stress-competitor-5']);
  assert.deepEqual(result.last.ids, ['stress-competitor-162','stress-competitor-163']);
  assert.deepEqual(result.add.ids, ['stress-competitor-162','stress-competitor-163','stress-added']);
  assert.deepEqual(result.remove.ids, result.last.ids);
  assert(result.first.noOverflow && result.first.widths.every(width => width >= 250), JSON.stringify(result.first));
  assert(result.add.appended && result.remove.removed);
  const copy = await evaluate(`(async()=>{
    const before=JSON.stringify(state), button=document.querySelector('[data-g1bp-company-column="stress-competitor-162"] [data-g1bp-company-copy-link]');
    const row=button?.closest('.g1-company-compare-domain');
    let copied='';
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{copied=text}}});
    button.click();
    await new Promise(resolve=>setTimeout(resolve,20));
    return {copied,expected:row.querySelector('a').href,
      feedback:row.querySelector('[data-g1bp-company-copy-status]').textContent,
      icon:button.dataset.g1bpCompanyCopyState,
      readOnly:before===JSON.stringify(state)};
  })()`);
  assert.equal(copy.copied,copy.expected);
  assert.equal(copy.feedback,'Скопировано');
  assert.equal(copy.icon,'copied');
  assert(copy.readOnly);
  await screenshot('last-page');
  await evaluate('document.querySelector("[data-g1bp-company-page-select]").value="0";document.querySelector("[data-g1bp-company-page-select]").dispatchEvent(new Event("change",{bubbles:true}));true');
  await screenshot('first-page');
  writeFileSync(`${folder}/checks.json`, JSON.stringify({...result,copy}, null, 2));
  console.log('Large Company comparison: PASS', JSON.stringify({...result,copy}));
} finally {
  await browser.call('Target.disposeBrowserContext', { browserContextId }).catch(() => {});
  page.close(); browser.close();
}
