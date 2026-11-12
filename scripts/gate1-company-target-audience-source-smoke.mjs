import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

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
const hash = (value) => createHash('sha256').update(value).digest('hex');
const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
const browser = new Cdp(version.webSocketDebuggerUrl);
const { browserContextId } = await browser.call('Target.createBrowserContext');
const { targetId } = await browser.call('Target.createTarget', { url: 'about:blank', browserContextId, width: 1440, height: 1000 });
const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const page = new Cdp(tabs.find((tab) => tab.id === targetId).webSocketDebuggerUrl);
const evaluate = async (expression) => {
  const response = await page.call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
  return response.result.value;
};
const sources = [
  '/private/tmp/guru-now-korich-workspace.json',
  '/private/tmp/guru-step6-icleaning-workspace.json',
  '/private/tmp/guru-step6-sivrce-workspace.json',
  '/private/tmp/guru-step6-guru-workspace.json',
];
try {
  await page.call('Runtime.enable');
  await page.call('Page.enable');
  await page.call('Page.addScriptToEvaluateOnNewDocument', { source: `const mem=new Map();Storage.prototype.getItem=function(k){return mem.get(String(k))??null};Storage.prototype.setItem=function(k,v){mem.set(String(k),String(v))};const f=fetch.bind(window);window.fetch=(u,i)=>String(u).includes('/api/')?Promise.resolve(new Response(JSON.stringify({ok:true,projects:[],workspaces:[]}))):f(u,i);` });
  await page.call('Page.navigate', { url: appUrl });
  for (let i = 0; i < 300; i++) {
    if (await evaluate('document.readyState==="complete"&&typeof guruTargetAudienceViewHtml==="function"')) break;
    await wait(100);
  }
  await evaluate('rememberAccessUnlocked();setAccessState(true);bootstrapAppOnce();scheduleCloudSync=()=>{};scheduleProjectsCloudSync=()=>{};document.querySelector(".app-shell").hidden=false;document.body.classList.remove("access-locked");true');
  for (const file of sources) {
    const raw = JSON.parse(readFileSync(file));
    const source = raw.workspace || raw.content || raw;
    await evaluate(`(()=>{guruCancelDerivedRefresh();activeProjectId=${JSON.stringify(source.project.id)};state=guruExportWithoutPersistenceV223(()=>migrateWorkspace(${JSON.stringify(source)},${JSON.stringify(source.project.id)}));activeView='gate';activeGateId='gate-1';guruRenderedGateId='';guruAudienceScreen().open=true;renderGate();return true})()`);
    const beforeState = await evaluate('JSON.stringify(state)');
    const projection = await evaluate(`(()=>{const segment=state.targetAudience?.segments?.[0];if(!segment)return {rows:[],sources:[]};const p=guruTargetAudienceDerive(state.targetAudience,{...guruAudienceScreen(),workspace:state});return {rows:p.zones.flatMap(z=>z.rows).filter(r=>['jtbd','problem','criteria','objections'].includes(r.field)).map(r=>({field:r.field,raw:r.raw,stored:segment[r.field]||''})),sources:[...document.querySelectorAll('[data-audience-row] [data-audience-source]')].map(x=>JSON.parse(x.dataset.audienceSource))}})()`);
    for (const row of projection.rows) assert.equal(row.raw, row.stored, `${source.project.name}: ${row.field} mixed unrelated project data`);
    assert(projection.sources.every((item) => item.field && !item.cardId), `${source.project.name}: a local field points to an unrelated Gate 0 card`);
    if (projection.sources.length) {
      const field = projection.sources[0].field;
      await evaluate(`document.querySelector('[data-audience-row="${field}"] [data-audience-source]').click()`);
      assert(await evaluate(`!!document.querySelector('[data-audience-editor="${field}"]')`), `${source.project.name}: local source did not open its editor`);
      await evaluate(`document.querySelector('[data-audience-editor="${field}"]').blur()`);
    }
    const sourceRecords = (source.project.gate0ScopedValuesV194 || []).filter((item) => item.field === 'segments' && item.scope === 'project' && !item.archived_at);
    if (sourceRecords.length && source.targetAudience?.segments?.length) {
      const sourceId = sourceRecords[0].id;
      const linked = await evaluate(`(()=>{const select=document.querySelector('[data-audience-company-link]');select.value=${JSON.stringify(sourceId)};select.dispatchEvent(new Event('change',{bubbles:true}));const p=guruTargetAudienceDerive(state.targetAudience,{...guruAudienceScreen(),workspace:state});return {id:p.linked?.source?.id,offerId:p.linked?.offer?.id,value:p.zones.flatMap(z=>z.rows).find(r=>r.field==='value')?.raw,tab:!!document.querySelector('[data-audience-create-source="${sourceId}"]')}})()`);
      assert.equal(linked.id, sourceId);
      assert.equal(linked.tab, false);
      const offer = (source.project.gate0ScopedValuesV194 || []).find((item) => item.id === linked.offerId);
      if (offer?.value) assert.equal(linked.value, offer.value, 'linked offer value differs from exact record');
      const afterBinding = await evaluate('JSON.stringify(state)');
      const sourceLink = await evaluate(`(()=>{const p=guruTargetAudienceDerive(state.targetAudience,{...guruAudienceScreen(),workspace:state});return p.zones.flatMap(z=>z.rows).find(r=>r.field==='rational')?.source})()`);
      if (sourceLink) {
        assert.equal(sourceLink.recordId, offer.id);
        await evaluate('document.querySelector(\'[data-audience-row="rational"] [data-audience-source]\').click()');
        await wait(1700);
        const reached = await evaluate(`!!document.querySelector('[data-gate0-company-offer-id="${offer.id}"][data-gate0-company-offer-field="rational"]')`);
        assert(reached, `${source.project.name}: exact offer source was not opened`);
        const back = await evaluate(`(()=>{const link=document.querySelector('[data-gate0-company-portrait-link="${sourceId}"]');link?.click();return !!link})()`);
        assert(back, `${source.project.name}: reverse portrait link missing`);
        await wait(1700);
        assert(await evaluate(`!!document.querySelector('[data-audience-panel="${source.targetAudience.segments[0].id}"]')`), `${source.project.name}: reverse navigation missed the portrait`);
        await evaluate('document.querySelector(\'.target-audience-actions [data-audience-source]\').click()');
        await wait(1700);
        assert(await evaluate(`!!document.querySelector('[data-gate0-company-segmentation-id="${sourceId}"][data-gate0-company-segmentation-field="segment_name"]')`), `${source.project.name}: linked segment source was not opened`);
      }
      const afterNavigation = await evaluate('JSON.stringify(state)');
      const content = (raw) => { const w=JSON.parse(raw);return JSON.stringify({records:w.project.gate0ScopedValuesV194,segments:w.targetAudience.segments.map(({gate0SegmentId,...rest})=>rest)}); };
      assert.equal(hash(content(afterNavigation)),hash(content(afterBinding)),`${source.project.name}: navigation changed saved content`);
      if (sourceRecords.length > 1) {
        const second = sourceRecords[1];
        const created = await evaluate(`(()=>{activeView='gate';activeGateId='gate-1';guruRenderedGateId='';guruAudienceScreen().open=true;renderGate();const tab=document.querySelector('[data-audience-create-source="${second.id}"]');tab?.click();return {hadTab:!!tab,linked:state.targetAudience.segments.some(s=>s.gate0SegmentId===${JSON.stringify(second.id)})}})()`);
        assert(created.hadTab && created.linked, `${source.project.name}: explicit segment tab did not create a linked portrait`);
      }
    } else {
      const afterState = await evaluate('JSON.stringify(state)');
      const content = (raw) => { const w=JSON.parse(raw);return JSON.stringify({records:w.project.gate0ScopedValuesV194,segments:w.targetAudience?.segments}); };
      assert.equal(hash(content(afterState)),hash(content(beforeState)),`${source.project.name}: view changed saved content`);
    }
    console.log(`${source.project.name}: PASS (${projection.rows.length} verified fields)`);
  }
} finally {
  await browser.call('Target.disposeBrowserContext', { browserContextId }).catch(() => {});
  page.close(); browser.close();
}
