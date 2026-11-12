import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';

const port = process.env.GURU_CHROME_DEBUG_PORT || '9535';
const appUrl = process.env.GURU_APP_URL || 'http://127.0.0.1:9531/';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.id = 0;
    this.tasks = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      const task = this.tasks.get(message.id);
      if (!task) return;
      this.tasks.delete(message.id);
      clearTimeout(task.timer);
      message.error ? task.reject(new Error(message.error.message)) : task.resolve(message.result);
    });
  }
  async call(method, params = {}) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      const timer = setTimeout(() => reject(new Error(`CDP timeout: ${method}`)), 120000);
      this.tasks.set(id, { resolve, reject, timer });
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
const page = new Cdp(tabs.find((tab) => tab.id === targetId).webSocketDebuggerUrl);
const evaluate = async (expression) => {
  const response = await page.call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
  return response.result.value;
};
const differences = (left, right, path = '', found = []) => {
  if (found.length >= 8 || JSON.stringify(left) === JSON.stringify(right)) return found;
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') { found.push(path); return found; }
  for (const key of new Set([...Object.keys(left), ...Object.keys(right)])) differences(left[key], right[key], `${path}.${key}`, found);
  return found;
};
try {
  await page.call('Runtime.enable');
  await page.call('Page.enable');
  await page.call('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
  await page.call('Page.addScriptToEvaluateOnNewDocument', { source: `const mem=new Map();Storage.prototype.getItem=function(k){return mem.get(String(k))??null};Storage.prototype.setItem=function(k,v){mem.set(String(k),String(v))};const f=fetch.bind(window);window.fetch=(u,i)=>String(u).includes('/api/')?Promise.resolve(new Response(JSON.stringify({ok:true,projects:[],workspaces:[]}))):f(u,i);` });
  await page.call('Page.navigate', { url: appUrl });
  for (let i = 0; i < 300; i++) {
    if (await evaluate('document.readyState==="complete"&&typeof guruCompanyOfferApproveV1==="function"&&typeof guruTargetAudienceViewHtml==="function"')) break;
    await wait(100);
  }
  await evaluate('rememberAccessUnlocked();setAccessState(true);bootstrapAppOnce();scheduleCloudSync=()=>{};scheduleProjectsCloudSync=()=>{};document.querySelector(".app-shell").hidden=false;document.body.classList.remove("access-locked");true');
  const files = [
    '/private/tmp/guru-now-korich-workspace.json',
    '/private/tmp/guru-step6-icleaning-workspace.json',
    '/private/tmp/guru-step6-sivrce-workspace.json',
    '/private/tmp/guru-step6-guru-workspace.json',
  ];
  for (const file of files) {
    const raw = JSON.parse(readFileSync(file));
    const source = raw.workspace || raw.content || raw;
    await evaluate(`(()=>{guruCancelDerivedRefresh();activeProjectId=${JSON.stringify(source.project.id)};projects=[{id:activeProjectId,name:${JSON.stringify(source.project.name)}}];state=guruExportWithoutPersistenceV223(()=>migrateWorkspace(${JSON.stringify(source)},${JSON.stringify(source.project.id)}));activeView='gate';activeGateId='gate-1';guruRenderedGateId='';guruAudienceScreen().open=true;renderGate();return true})()`);
    const projectBefore = await evaluate('JSON.stringify(state.project)');
    await evaluate('(()=>{const p=guruTargetAudienceDerive(state.targetAudience,{...guruAudienceScreen(),workspace:state});guruAudienceRefreshView();return p.zones.length})()');
    assert.equal(await evaluate('JSON.stringify(state.project)'), projectBefore, `${source.project.name}: viewing changed the project`);
    if (file !== files[0]) { console.log(`${source.project.name}: read-only PASS`); continue; }
    const setup = await evaluate(`(()=>{const offer=state.project.gate0ScopedValuesV194.find(r=>r.field==='company_offer'&&!r.archived_at);const segment=state.targetAudience.segments[0];segment.gate0SegmentId=offer.segment_id;segment.value='Старый локальный текст';segment.manualFields={...(segment.manualFields||{}),value:true};guruAudienceScreen().activeId=segment.id;guruAudienceRefreshView();return {offerId:offer.id,segmentId:segment.id,original:offer.value,legacyVisible:document.querySelector('[data-audience-row="value"] .company-offer-history')?.textContent.includes('Старый локальный текст'),resolved:targetAudienceResolvedValue(segment,'value')}})()`);
    assert.equal(setup.legacyVisible, true, 'legacy portrait offer is not visible in history');
    assert.equal(setup.resolved, setup.original, 'legacy portrait offer overrides canonical value');
    const beforeDraft = await evaluate('JSON.stringify(state.project)');
    await evaluate(`document.querySelector('[data-audience-row="value"] [data-audience-source]').click()`);
    assert(await evaluate('!!document.querySelector("[data-audience-offer-draft]")'), 'offer editor did not open');
    assert.equal(await evaluate('JSON.stringify(state.project)'), beforeDraft, 'opening a draft changed the project');
    await evaluate(`(()=>{document.querySelector('[data-audience-offer-draft]').value='Новый утверждённый оффер';document.querySelector('[data-audience-offer-reason]').value='Уточнили после анализа аудитории';return true})()`);
    assert.equal(await evaluate('JSON.stringify(state.project)'), beforeDraft, 'typing a draft changed the project');
    await evaluate(`document.querySelector('[data-audience-offer-approve]').click()`);
    for (let attempt = 0; attempt < 150; attempt++) {
      if (await evaluate('!document.querySelector("[data-audience-offer-approve]")')) break;
      await wait(100);
    }
    assert.equal(await evaluate('!!document.querySelector("[data-audience-offer-approve]")'), false, 'approval did not persist and close the editor');
    const approved = await evaluate(`(()=>{const offer=state.project.gate0ScopedValuesV194.find(r=>r.id===${JSON.stringify(setup.offerId)});return {value:offer.value,versions:offer.offerVersionsV1,foundation:document.querySelector('[data-guru-strategic-foundation-company]')?.textContent,portrait:document.querySelector('[data-audience-row="value"]')?.textContent}})()`);
    assert.equal(approved.value, 'Новый утверждённый оффер');
    assert.equal(approved.versions.length, 2);
    assert.equal(approved.versions[0].value, setup.original);
    assert.equal(approved.versions[1].reason, 'Уточнили после анализа аудитории');
    assert.equal(approved.versions[1].evidence.audienceSegmentId, setup.segmentId);
    assert.deepEqual(approved.versions[1].evidence.gate0,
      await evaluate(`(()=>{const offer=state.project.gate0ScopedValuesV194.find(r=>r.id===${JSON.stringify(setup.offerId)});return Object.fromEntries(['rational','irrational','social'].map(field=>[field,String(offer.offer?.[field]||'')]))})()`),
      'approved version lost the benefit sources');
    assert(approved.foundation.includes(approved.value));
    assert(approved.portrait.includes(approved.value));
    assert.equal(await evaluate('state.targetAudience.segments[0].value'), 'Старый локальный текст', 'legacy portrait value was deleted');
    const afterApprovalRecord = await evaluate(`JSON.stringify(state.project.gate0ScopedValuesV194.find(r=>r.id===${JSON.stringify(setup.offerId)}))`);
    assert.deepEqual(differences(JSON.parse(beforeDraft).gate0ScopedValuesV194.find((r) => r.id === setup.offerId), JSON.parse(afterApprovalRecord)).sort(),
      ['.offerVersionsV1', '.updated_at', '.value'].sort(), 'approval changed unrelated offer fields');
    const afterApprove = await evaluate(`JSON.stringify(state.project.gate0ScopedValuesV194.find(r=>r.id===${JSON.stringify(setup.offerId)}))`);
    await evaluate(`document.querySelector('[data-audience-row="value"] [data-audience-offer-history]').click()`);
    assert(await evaluate(`document.querySelector('[data-audience-row="value"] .company-offer-history').open`));
    if (process.env.GURU_OFFER_SCREENSHOT) {
      await evaluate(`document.querySelector('[data-audience-row="value"]').scrollIntoView({block:'center'})`);
      const image = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      writeFileSync(process.env.GURU_OFFER_SCREENSHOT, Buffer.from(image.data, 'base64'));
    }
    const afterHistory = await evaluate(`JSON.stringify(state.project.gate0ScopedValuesV194.find(r=>r.id===${JSON.stringify(setup.offerId)}))`);
    assert.equal(afterHistory, afterApprove, `opening history changed the offer: ${differences(JSON.parse(afterApprove), JSON.parse(afterHistory)).join(', ')}`);
    const final = await evaluate(`(()=>{const offer=state.project.gate0ScopedValuesV194.find(r=>r.id===${JSON.stringify(setup.offerId)});return {otherRecordCount:state.project.gate0ScopedValuesV194.length,versions:offer.offerVersionsV1.length}})()`);
    assert.equal(final.versions, 2);
    await evaluate(`guruNavigateToGate('gate-0')`);
    for (let i = 0; i < 80; i++) {
      if (await evaluate(`!!document.querySelector('[data-gate0-company-offer-id="${setup.offerId}"][data-gate0-company-offer-field="offer"]')`)) break;
      await wait(100);
    }
    const gate0Edit = await evaluate(`(()=>{const input=document.querySelector('[data-gate0-company-offer-id="${setup.offerId}"][data-gate0-company-offer-field="offer"]');if(!input)return {found:false};input.value='Новая гипотеза Gate 0';input.dispatchEvent(new Event('input',{bubbles:true}));const draftRecord=state.project.gate0ScopedValuesV194.find(r=>r.id===${JSON.stringify(setup.offerId)});const beforeBlur=draftRecord.value,draft=draftRecord.offerDraftV1?.value,draftRendered=guruV349OfferPartsHtml(draftRecord,{company:true}).includes('Новая гипотеза Gate 0');input.dispatchEvent(new FocusEvent('focusout',{bubbles:true}));const record=state.project.gate0ScopedValuesV194.find(r=>r.id===${JSON.stringify(setup.offerId)});return {found:true,beforeBlur,draft,draftRendered,value:record.value,versions:record.offerVersionsV1.length,hasDraft:Object.hasOwn(record,'offerDraftV1')}})()`);
    assert.equal(gate0Edit.found, true, 'Gate 0 offer editor missing');
    assert.equal(gate0Edit.beforeBlur, approved.value, 'Gate 0 draft wrote before commit');
    assert.equal(gate0Edit.draft, 'Новая гипотеза Gate 0');
    assert.equal(gate0Edit.draftRendered, true);
    assert.equal(gate0Edit.value, 'Новая гипотеза Gate 0');
    assert.equal(gate0Edit.versions, 3);
    assert.equal(gate0Edit.hasDraft, false);
    console.log(`${source.project.name}: approval, sync, history PASS`);
  }
} finally {
  page.close();
  await browser.call('Target.disposeBrowserContext', { browserContextId }).catch(() => {});
  browser.close();
}
