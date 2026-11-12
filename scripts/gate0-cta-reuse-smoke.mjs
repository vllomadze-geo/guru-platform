import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const port = process.env.GURU_CHROME_DEBUG_PORT || '9535';
const appUrl = process.env.GURU_APP_URL || 'http://127.0.0.1:9531/';
const fixturePath = process.env.GURU_NOW_KORICH_FIXTURE || '/private/tmp/guru-now-korich-workspace.json';
const fixtureBytes = readFileSync(fixturePath);
const sourceHash = createHash('sha256').update(fixtureBytes).digest('hex');
const fixture = JSON.parse(fixtureBytes);
const output = process.env.GURU_CTA_ARTIFACTS || 'artifacts/cta-reuse';
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
const report = { sourceSha256: sourceHash };
const screenshot = async name => {
  const shot = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  writeFileSync(`${output}/${name}.png`, Buffer.from(shot.data, 'base64'));
};
try {
  await page.call('Page.enable'); await page.call('Runtime.enable');
  await page.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await page.call('Page.addScriptToEvaluateOnNewDocument', { source: `const nativeFetch=window.fetch.bind(window);window.fetch=(u,i)=>String(u).includes('/api/')?Promise.resolve(new Response(JSON.stringify({ok:true,projects:[],workspaces:[]}),{status:200,headers:{'Content-Type':'application/json'}})):nativeFetch(u,i);const memory=new Map();Storage.prototype.getItem=function(k){return memory.get(String(k))??null};Storage.prototype.setItem=function(k,v){memory.set(String(k),String(v))};Storage.prototype.removeItem=function(k){memory.delete(String(k))};Storage.prototype.clear=function(){memory.clear()};` });
  await page.call('Page.navigate', { url: appUrl });
  await waitFor('document.readyState==="complete"&&typeof guruOfferCtaChoices==="function"');
  report.initial = await evaluate(`(()=>{
    rememberAccessUnlocked();setAccessState(true);bootstrapAppOnce();scheduleCloudSync=()=>{};scheduleProjectsCloudSync=()=>{};
    state=${JSON.stringify(fixture.workspace || fixture)};activeProjectId=state.project.id;
    guruExportWithoutPersistenceV223(()=>{state=migrateWorkspace(state,activeProjectId)});
    projects=[{id:activeProjectId,name:state.project.name,lifecycleStatus:'active'}];updateProjectChrome();els.launcher.hidden=true;els.appShell.hidden=false;
    state._gate0Open={...(state._gate0Open||{}),'card-3':true};guruNavigateToGate('gate-0');renderGate();
    window.__ctaRecord=()=>state.project.gate0ScopedValuesV194.find(r=>r.field==='offers'&&r.scope==='product');
    window.__ctaInput=role=>document.querySelector('[data-gate0-scope-record="'+__ctaRecord().id+'"][data-gate0-scope-record-field="offer_cta_'+role+'"]');
    window.__ctaTrigger=role=>__ctaInput(role).closest('.gate0-cta-level-v2').querySelector('[data-gate0-cta-reuse]');
    const input=__ctaInput('primary');for(let n=input?.parentElement;n;n=n.parentElement)if(n.matches('details'))n.open=true;
    input?.closest('.gate0-cta-levels-v2').scrollIntoView({block:'center',behavior:'instant'});
    return {build:GURU_BUILD_INFO.version,recordId:__ctaRecord().id,rendered:!!input};
  })()`);
  assert(report.initial.rendered);
  await delay(1200);
  await evaluate(`__ctaInput('primary').closest('.gate0-cta-levels-v2').scrollIntoView({block:'center',behavior:'instant'})`);
  await delay(250);
  report.readOnly = await evaluate(`(()=>{
    window.__ctaBefore=JSON.stringify(state);const before=JSON.stringify(state);
    const start=performance.now();const choices=GURU_GATE0_CTA_LEVELS_V2.map(([role])=>[role,guruOfferCtaChoices(role,__ctaRecord().id)]);
    const ms=performance.now()-start;
    __ctaTrigger('secondary').click();
    return {unchanged:before===JSON.stringify(state),choices,ms,groups:[...document.querySelectorAll('.gate0-cta-picker h3')].map(n=>n.textContent),focused:document.activeElement.matches('[data-cta-picker-search]')};
  })()`);
  assert(report.readOnly.unchanged && report.readOnly.focused);
  assert(report.readOnly.groups.includes('Компания'));
  await screenshot('01-existing-secondary');
  await evaluate(`(()=>{const s=document.querySelector('[data-cta-picker-search]');s.value='ничего-нет';s.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  assert.equal(await evaluate(`document.querySelectorAll('[data-cta-choice]').length`),0);
  await page.call('Input.dispatchKeyEvent', { type:'keyDown', key:'Escape', code:'Escape' });
  assert(await evaluate(`!guruOfferCtaPicker&&document.activeElement===__ctaTrigger('secondary')&&JSON.stringify(state)===__ctaBefore`));
  // Canonical scope and role isolation on an in-memory copy, including older primary-only records.
  report.isolation = await evaluate(`(()=>{
    const w=structuredClone(state),p=w.project,base=__ctaRecord();
    const other=p.catalogItemsV189.find(x=>x.id!==base.product_id&&x.name);
    const mk=(id,scope,field,owner,cta)=>({...base,id,scope,field,product_id:scope==='product'?owner:'',category_id:scope==='category'?owner:'',offer:{ctaV2:cta,ctaV2Migrated:true}});
    p.gate0ScopedValuesV194=[mk('target','product','offers',base.product_id,{primary:'Current'}),mk('product','product','offers',other.id,{primary:'Buy',secondary:'Learn',alternative:'Ask'}),mk('duplicate','product','offers',other.id,{primary:'Buy'}),mk('company','project','company_offer','',{primary:'Buy',secondary:'Company learn',alternative:'Company ask'}),{...mk('archived','product','offers',other.id,{primary:'Archived'}),archived_at:'2020-01-01'},{...mk('foreign','product','offers',other.id,{primary:'Foreign'}),project_id:'another-project'},mk('orphan','product','offers','deleted-product',{primary:'Orphan'}),{...mk('legacy','product','offers',base.product_id,{}),offer:{cta:'Legacy primary'}}];
    const freeze=o=>{Object.freeze(o);Object.values(o).forEach(v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v))freeze(v)})};freeze(w);
    const before=JSON.stringify(w);const primary=guruOfferCtaChoices('primary','target',w),secondary=guruOfferCtaChoices('secondary','target',w),alternative=guruOfferCtaChoices('alternative','target',w);
    return {unchanged:before===JSON.stringify(w),primary,secondary,alternative,invalid: guruOfferCtaChoices('unknown','target',w)};
  })()`);
  assert(report.isolation.unchanged);
  assert.deepEqual(report.isolation.primary.map(x=>x.value),['Legacy primary','Buy','Buy']);
  assert.deepEqual(report.isolation.secondary.map(x=>x.value),['Learn','Company learn']);
  assert.deepEqual(report.isolation.alternative.map(x=>x.value),['Ask','Company ask']);
  assert.deepEqual(report.isolation.invalid,[]);
  // Choose a company secondary CTA through the real button and existing input/save handler.
  report.selection = await evaluate(`(()=>{
    const before=structuredClone(__ctaRecord()),others=JSON.stringify(state.project.gate0ScopedValuesV194.filter(r=>r.id!==before.id));
    __ctaTrigger('secondary').click();const choice=document.querySelector('.gate0-cta-choice:not(:disabled)');const value=choice.querySelector('strong').textContent;choice.click();
    const after=structuredClone(__ctaRecord());
    return {before,after,value,othersUnchanged:others===JSON.stringify(state.project.gate0ScopedValuesV194.filter(r=>r.id!==before.id)),preview:__ctaInput('secondary').closest('.gate0-cta-level-v2').querySelector('[data-gate0-cta-preview]').textContent,closed:!guruOfferCtaPicker,focused:document.activeElement===__ctaInput('secondary')};
  })()`);
  assert.equal(report.selection.after.offer.ctaV2.secondary, report.selection.value);
  assert.equal(report.selection.preview, report.selection.value);
  assert(report.selection.othersUnchanged && report.selection.closed && report.selection.focused);
  const expected=structuredClone(report.selection.before);
  expected.offer.ctaV2.secondary=report.selection.value;expected.updated_at=report.selection.after.updated_at;
  assert.deepEqual(report.selection.after,expected,'Selection must change only the target CTA and timestamp');
  await waitFor(`JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_PREFIX+activeProjectId)||'null')?.project?.gate0ScopedValuesV194?.find(r=>r.id===__ctaRecord().id)?.offer?.ctaV2?.secondary===${JSON.stringify(report.selection.value)}`);
  report.autosaved=true;
  report.roundTrip=await evaluate(`(()=>{const value=__ctaRecord().offer.ctaV2.secondary;state=JSON.parse(JSON.stringify(state));return __ctaRecord().offer.ctaV2.secondary===value})()`);
  assert(report.roundTrip);
  // Reopen: already selected value is labelled, no extra write on close or repeat toggle.
  assert(await evaluate(`(()=>{const before=JSON.stringify(state);__ctaTrigger('secondary').click();const marked=!!document.querySelector('.gate0-cta-choice:disabled');__ctaTrigger('secondary').click();return marked&&!guruOfferCtaPicker&&before===JSON.stringify(state)})()`));
  // Show all provenance groups using another existing product, only in this isolated copy.
  await evaluate(`(()=>{
    const p=state.project,other=p.catalogItemsV189.find(x=>x.id!==__ctaRecord().product_id&&x.name);
    p.gate0ScopedValuesV194.push({...structuredClone(__ctaRecord()),id:'cta-screenshot-copy',product_id:other.id,offer:{ctaV2:{primary:'Выбрать изделие',secondary:'Посмотреть коллекцию',alternative:'Написать мастеру'},ctaV2Migrated:true}});
    __ctaTrigger('primary').scrollIntoView({block:'center',behavior:'instant'});__ctaTrigger('primary').click();
  })()`);
  await screenshot('02-products-and-company');
  await page.call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});
  await page.call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await evaluate(`__ctaTrigger('alternative').scrollIntoView({block:'center',behavior:'instant'})`);
  await delay(250);
  await evaluate(`__ctaTrigger('alternative').click()`);
  assert(await evaluate(`(()=>{const r=guruOfferCtaPicker.panel.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight})()`));
  await screenshot('03-compact');
  assert.deepEqual(page.errors,[]);
  assert.equal(createHash('sha256').update(readFileSync(fixturePath)).digest('hex'),sourceHash);
  report.passed=true;
  writeFileSync(`${output}/results.json`,JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));console.log('Gate 0 CTA reuse smoke: PASS');
} finally {
  await browser.call('Target.disposeBrowserContext',{browserContextId});page.close();browser.close();
}
