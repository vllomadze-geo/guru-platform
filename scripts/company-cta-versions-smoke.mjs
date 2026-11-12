import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';

const appUrl = process.env.GURU_APP_URL || 'http://127.0.0.1:3000/';
const port = process.env.GURU_CHROME_DEBUG_PORT || '9535';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.id = 0;
    this.pending = new Map();
    this.ready = new Promise((resolve) => this.socket.addEventListener('open', resolve, { once: true }));
    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      const task = this.pending.get(message.id);
      if (!task) return;
      this.pending.delete(message.id);
      message.error ? task.reject(new Error(message.error.message)) : task.resolve(message.result);
    });
  }
  async call(method, params = {}) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.socket.close(); }
}
const info = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
const browser = new Cdp(info.webSocketDebuggerUrl);
const { browserContextId } = await browser.call('Target.createBrowserContext');
const { targetId } = await browser.call('Target.createTarget', { url: 'about:blank', browserContextId });
const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const page = new Cdp(tabs.find((tab) => tab.id === targetId).webSocketDebuggerUrl);
const evaluate = async (expression) => {
  const result = await page.call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
};
try {
  await page.call('Runtime.enable');
  await page.call('Page.enable');
  await page.call('Page.addScriptToEvaluateOnNewDocument', { source: `const f=window.fetch.bind(window);window.fetch=(u,i)=>String(u).includes('/api/')?Promise.resolve(new Response(JSON.stringify({ok:true,projects:[],workspaces:[]}))):f(u,i);` });
  await page.call('Page.navigate', { url: appUrl });
  for (let i = 0; i < 300; i++) {
    if (await evaluate('document.readyState==="complete" && typeof guruCompanyCtaApproveV1==="function" && typeof guruTargetAudienceViewHtml==="function"')) break;
    await wait(100);
  }
  await evaluate('rememberAccessUnlocked();setAccessState(true);bootstrapAppOnce();scheduleCloudSync=()=>{};scheduleProjectsCloudSync=()=>{};true');
  const raw = JSON.parse(readFileSync('/private/tmp/guru-step6-icleaning-workspace.json'));
  const workspace = raw.workspace || raw.content || raw;
  const sourceRaw = JSON.parse(readFileSync('/private/tmp/guru-now-korich-workspace.json'));
  const source = sourceRaw.workspace || sourceRaw.content || sourceRaw;
  const offer = source.project.gate0ScopedValuesV194.find((record) => record.field === 'company_offer' && !record.archived_at);
  const segment = source.project.gate0ScopedValuesV194.find((record) => record.id === offer.segment_id);
  assert(offer && segment);
  const setup = await evaluate(`(() => {
    activeProjectId=${JSON.stringify(workspace.project.id)};
    projects=[{id:activeProjectId,name:${JSON.stringify(workspace.project.name)}}];
    state=migrateWorkspace(${JSON.stringify(workspace)},activeProjectId);
    state.project.gate0ScopedValuesV194.push(${JSON.stringify(segment)},${JSON.stringify(offer)});
    state.targetAudience.segments[0].gate0SegmentId=${JSON.stringify(segment.id)};
    activeView='gate';activeGateId='gate-1';guruRenderedGateId='';
    const view=guruAudienceScreen();view.open=true;view.activeId=state.targetAudience.segments[0].id;
    renderGate();saveState();
    return {id:${JSON.stringify(offer.id)},value:guruCompanyCtaCurrentV1(state.project.gate0ScopedValuesV194.find((entry)=>entry.id===${JSON.stringify(offer.id)}))};
  })()`);
  const row = '[data-audience-row="cta_primary"]';
  assert.equal(await evaluate(`document.querySelector('${row}')?.textContent.includes(${JSON.stringify(setup.value)})`), true, 'current CTA not visible');
  const initialRoles = await evaluate(`(() => {
    const record=state.project.gate0ScopedValuesV194.find((entry)=>entry.id===${JSON.stringify(offer.id)});
    return ['primary','secondary','alternative'].map((role)=>({role,value:guruCompanyCtaCurrentV1(record,role),
      portrait:document.querySelector('[data-audience-row="cta_'+role+'"]')?.textContent,
      foundation:document.querySelector('[data-guru-strategic-foundation-company] [data-guru-strategic-cta-v286="'+role+'"]')?.textContent}));
  })()`);
  assert(initialRoles.every(({value,portrait,foundation})=>value&&portrait?.includes(value)&&foundation?.includes(value)), 'a company CTA role is absent from either view');
  const before = await evaluate('JSON.stringify(state.project)');
  await evaluate(`document.querySelector('${row} [data-audience-source]').click()`);
  await evaluate(`document.querySelector('[data-audience-cta-draft]').value='Новый CTA тест';document.querySelector('[data-audience-cta-reason]').value='По результатам анализа аудитории'`);
  assert.equal(await evaluate('JSON.stringify(state.project)'), before, 'draft changed project data');
  await evaluate('document.querySelector("[data-audience-cta-cancel]").click()');
  assert.equal(await evaluate('JSON.stringify(state.project)'), before, 'cancel changed project data');
  await evaluate(`document.querySelector('${row} [data-audience-source]').click()`);
  await evaluate(`document.querySelector('[data-audience-cta-draft]').value='Новый CTA тест';document.querySelector('[data-audience-cta-reason]').value='По результатам анализа аудитории';document.querySelector('[data-audience-cta-approve]').click()`);
  for (let i = 0; i < 150 && await evaluate('!!document.querySelector("[data-audience-cta-approve]")'); i++) await wait(100);
  assert.equal(await evaluate('!!document.querySelector("[data-audience-cta-approve]")'), false, 'approval did not finish');
  const approved = await evaluate(`(() => {
    const record=state.project.gate0ScopedValuesV194.find((entry)=>entry.id===${JSON.stringify(offer.id)});
    const saved=JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_PREFIX+activeProjectId));
    const savedRecord=saved.project.gate0ScopedValuesV194.find((entry)=>entry.id===record.id);
    return {primary:record.offer.ctaV2.primary,legacy:record.offer.cta,secondary:record.offer.ctaV2.secondary,
      versions:record.ctaVersionsV1,offerValue:record.value,saved:savedRecord.offer.ctaV2.primary,
      foundation:document.querySelector('[data-guru-strategic-foundation-company]')?.textContent.includes('Новый CTA тест'),
      choices:guruStrategicCtaChoicesV1('company').map((entry)=>entry.value)};
  })()`);
  assert.equal(approved.primary, 'Новый CTA тест');
  assert.equal(approved.legacy, approved.primary);
  assert.equal(approved.saved, approved.primary);
  assert.equal(approved.offerValue, offer.value);
  assert.equal(approved.secondary, offer.offer.ctaV2.secondary);
  assert.equal(approved.versions.length, 2);
  assert.equal(approved.versions[0].value, setup.value);
  assert.equal(approved.versions[1].reason, 'По результатам анализа аудитории');
  assert(approved.foundation && approved.choices.includes(approved.primary));
  assert.equal(await evaluate('!!document.querySelector("[data-guru-strategic-foundation-company] .company-cta-history > summary")'), true,
    'strategic foundation CTA history icon missing');
  const beforeHistory = await evaluate(`JSON.stringify(state.project.gate0ScopedValuesV194.find((entry)=>entry.id===${JSON.stringify(offer.id)}))`);
  await evaluate(`document.querySelector('${row} [data-audience-cta-history]').click()`);
  assert.equal(await evaluate(`document.querySelector('${row} .company-cta-history')?.open`), true, 'CTA history not open');
  assert.equal(await evaluate(`JSON.stringify(state.project.gate0ScopedValuesV194.find((entry)=>entry.id===${JSON.stringify(offer.id)}))`), beforeHistory, 'history changed data');
  for (const [role, label] of [['secondary','Вторичный'], ['alternative','Альтернативный']]) {
    const selector = `[data-audience-row="cta_${role}"]`;
    const beforeRole = await evaluate('JSON.stringify(state.project)');
    await evaluate(`document.querySelector(${JSON.stringify(selector + ' [data-audience-source]')}).click()`);
    await evaluate(`document.querySelector(${JSON.stringify(selector + ' [data-audience-cta-draft]')}).value=${JSON.stringify('Новый ' + label + ' CTA')}`);
    assert.equal(await evaluate('JSON.stringify(state.project)'), beforeRole, `${role} draft changed project data`);
    await evaluate(`document.querySelector(${JSON.stringify(selector + ' [data-audience-cta-approve]')}).click()`);
    for (let i = 0; i < 150 && await evaluate(`!!document.querySelector(${JSON.stringify(selector + ' [data-audience-cta-approve]')})`); i++) await wait(100);
    const result = await evaluate(`(() => {
      const record=state.project.gate0ScopedValuesV194.find((entry)=>entry.id===${JSON.stringify(offer.id)});
      return {value:guruCompanyCtaCurrentV1(record,${JSON.stringify(role)}),versions:record.ctaVersionsByRoleV1?.[${JSON.stringify(role)}]?.length,
        primary:guruCompanyCtaCurrentV1(record),foundation:document.querySelector('[data-guru-strategic-foundation-company] [data-guru-strategic-cta-v286="${role}"]')?.textContent,
        history:!!document.querySelector(${JSON.stringify(selector + ' .company-cta-history > summary')})};
    })()`);
    assert.equal(result.value, `Новый ${label} CTA`);
    assert.equal(result.versions, 2);
    assert.equal(result.primary, approved.primary, `${role} approval changed primary CTA`);
    assert(result.foundation.includes(result.value) && result.history);
    await evaluate(`document.querySelector(${JSON.stringify(selector + ' [data-audience-cta-history]')}).click()`);
    assert.equal(await evaluate(`document.querySelector(${JSON.stringify(selector + ' .company-cta-history')})?.open`), true, `${role} history did not open`);
  }
  if (process.env.GURU_CTA_SCREENSHOT) {
    await evaluate('els.launcher.hidden=true;els.appShell.hidden=false;document.body.classList.remove("access-locked");document.querySelector("[data-audience-zone=result]").scrollIntoView({block:"center"})');
    await page.call('Page.bringToFront');
    const image = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    writeFileSync(process.env.GURU_CTA_SCREENSHOT, Buffer.from(image.data, 'base64'));
  }
  await evaluate(`document.querySelector('${row} [data-audience-source]').click()`);
  await evaluate(`document.querySelector('[data-audience-cta-draft]').value='CTA при отказе';window.__saveCta=guruQueueWorkspaceSave;guruQueueWorkspaceSave=async()=>false;document.querySelector('[data-audience-cta-approve]').click()`);
  for (let i = 0; i < 100 && !await evaluate('!!document.querySelector("[data-audience-cta-error]:not([hidden])")'); i++) await wait(100);
  assert.equal(await evaluate('!!document.querySelector("[data-audience-cta-error]:not([hidden])")'), true, 'save failure not shown');
  assert.equal(await evaluate(`guruCompanyCtaCurrentV1(state.project.gate0ScopedValuesV194.find((entry)=>entry.id===${JSON.stringify(offer.id)}))`), approved.primary, 'failed save changed CTA');
  await evaluate('guruQueueWorkspaceSave=window.__saveCta;document.querySelector("[data-audience-cta-cancel]").click()');
  await evaluate(`document.querySelector('[data-audience-row="cta_secondary"] [data-audience-source]').click()`);
  await evaluate(`document.querySelector('[data-audience-row="cta_secondary"] [data-audience-cta-draft]').value='Вторичный CTA при отказе';guruQueueWorkspaceSave=async()=>false;document.querySelector('[data-audience-row="cta_secondary"] [data-audience-cta-approve]').click()`);
  for (let i = 0; i < 100 && !await evaluate('!!document.querySelector("[data-audience-row=cta_secondary] [data-audience-cta-error]:not([hidden])")'); i++) await wait(100);
  assert.equal(await evaluate(`(() => {const record=state.project.gate0ScopedValuesV194.find((entry)=>entry.id===${JSON.stringify(offer.id)});return guruCompanyCtaCurrentV1(record,'secondary')==='Новый Вторичный CTA'&&record.ctaVersionsByRoleV1.secondary.length===2})()`), true,
    'failed secondary CTA save changed data or history');
  await evaluate('guruQueueWorkspaceSave=window.__saveCta;document.querySelector("[data-audience-row=cta_secondary] [data-audience-cta-cancel]").click()');
  await evaluate(`guruNavigateToGate('gate-0')`);
  const gate0 = await evaluate(`(() => {
    const input=document.querySelector('[data-gate0-company-offer-id="${offer.id}"][data-gate0-company-offer-field="cta_primary"]');
    if (!input) return {found:false};
    input.dispatchEvent(new FocusEvent('focusin',{bubbles:true}));
    input.value='CTA из Gate 0';
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.dispatchEvent(new FocusEvent('focusout',{bubbles:true}));
    const record=state.project.gate0ScopedValuesV194.find((entry)=>entry.id===${JSON.stringify(offer.id)});
    return {found:true,primary:guruCompanyCtaCurrentV1(record),versions:record.ctaVersionsV1.map((entry)=>entry.value)};
  })()`);
  assert.equal(gate0.found, true, 'Gate 0 CTA editor missing');
  assert.equal(gate0.primary, 'CTA из Gate 0');
  assert.deepEqual(gate0.versions, [setup.value, approved.primary, gate0.primary]);
  const gate0Secondary = await evaluate(`(() => {
    const input=document.querySelector('[data-gate0-company-offer-id="${offer.id}"][data-gate0-company-offer-field="cta_secondary"]');
    if (!input) return {found:false};
    input.dispatchEvent(new FocusEvent('focusin',{bubbles:true}));
    input.value='Вторичный CTA из Gate 0';
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.dispatchEvent(new FocusEvent('focusout',{bubbles:true}));
    const record=state.project.gate0ScopedValuesV194.find((entry)=>entry.id===${JSON.stringify(offer.id)});
    return {found:true,value:guruCompanyCtaCurrentV1(record,'secondary'),versions:record.ctaVersionsByRoleV1?.secondary?.map((entry)=>entry.value),primary:guruCompanyCtaCurrentV1(record)};
  })()`);
  assert.equal(gate0Secondary.found, true, 'Gate 0 secondary CTA editor missing');
  assert.equal(gate0Secondary.value, 'Вторичный CTA из Gate 0');
  assert.deepEqual(gate0Secondary.versions, [initialRoles[1].value, 'Новый Вторичный CTA', gate0Secondary.value]);
  assert.equal(gate0Secondary.primary, gate0.primary);
  await wait(700);
  const storedGate0 = await evaluate(`(() => {
    const saved=JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_PREFIX+activeProjectId));
    const record=saved.project.gate0ScopedValuesV194.find((entry)=>entry.id===${JSON.stringify(offer.id)});
    return {primary:record.offer.ctaV2.primary,versions:record.ctaVersionsV1?.length,
      secondary:record.offer.ctaV2.secondary,secondaryVersions:record.ctaVersionsByRoleV1?.secondary?.length};
  })()`);
  assert.deepEqual(storedGate0, { primary: gate0.primary, versions: 3,
    secondary: gate0Secondary.value, secondaryVersions: 3 }, 'Gate 0 CTA history was not saved');
  await page.call('Page.reload', { ignoreCache: true });
  await wait(1000);
  for (let i = 0; i < 300 && !await evaluate('document.readyState==="complete"&&typeof openProject==="function"&&typeof bootstrapAppOnce==="function"'); i++) await wait(100);
  await evaluate(`bootstrapAppOnce();openProject(${JSON.stringify(workspace.project.id)});true`);
  for (let i = 0; i < 150 && !await evaluate(`state?.project?.gate0ScopedValuesV194?.some((entry)=>entry.id===${JSON.stringify(offer.id)})`); i++) await wait(100);
  const restored = await evaluate(`(() => {
    const record=state?.project?.gate0ScopedValuesV194?.find((entry)=>entry.id===${JSON.stringify(offer.id)});
    return record && {roles:['primary','secondary','alternative'].map((role)=>guruCompanyCtaCurrentV1(record,role)),
      histories:['primary','secondary','alternative'].map((role)=>guruCompanyCtaVersionsV1(record,role).length)};
  })()`);
  assert.deepEqual(restored.roles, [gate0.primary, gate0Secondary.value, 'Новый Альтернативный CTA']);
  assert.deepEqual(restored.histories, [3, 3, 2]);
  console.log('All three CTA roles: approval, durable save, separate histories, linked views, Gate 0 edit, cancel and rollback PASS');
} finally {
  await browser.call('Target.disposeBrowserContext', { browserContextId }).catch(() => {});
  page.close();browser.close();
}
