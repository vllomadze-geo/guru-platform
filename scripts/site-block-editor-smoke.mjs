import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";

const fixture = JSON.parse(readFileSync(process.env.GURU_SITE_UI_FIXTURE || "/private/tmp/guru-now-korich-workspace.json", "utf8"));
const source = fixture.workspace || fixture;
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3189/";
const port = process.env.GURU_CHROME_DEBUG_PORT || "9347";
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url); this.id = 0; this.pending = new Map(); this.errors = [];
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const msg = JSON.parse(event.data);
      if (msg.method === "Runtime.exceptionThrown") this.errors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
      const task = this.pending.get(msg.id); if (!task) return;
      this.pending.delete(msg.id); clearTimeout(task.timer);
      if (msg.error) task.reject(new Error(msg.error.message)); else task.resolve(msg.result);
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

const browserVersion = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
const browser = new Cdp(browserVersion.webSocketDebuggerUrl);
const { browserContextId } = await browser.call("Target.createBrowserContext");
const { targetId } = await browser.call("Target.createTarget", { url: "about:blank", browserContextId });
const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const page = new Cdp(tabs.find((tab) => tab.id === targetId).webSocketDebuggerUrl);
const evaluate = async (expression) => {
  const result = await page.call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
};
const waitFor = async (expression) => {
  const start = Date.now();
  while (Date.now() - start < 30000) {
    if (await evaluate(expression)) return;
    await delay(100);
  }
  throw new Error(`Timeout: ${expression}`);
};

try {
  await page.call("Runtime.enable"); await page.call("Page.enable");
  await page.call("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1200, deviceScaleFactor: 1, mobile: false });
  await page.call("Page.navigate", { url: appUrl });
  await waitFor('document.readyState === "complete" && typeof openAuditPageCard === "function"');
  await evaluate("rememberAccessUnlocked();setAccessState(true);bootstrapAppOnce();scheduleCloudSync=()=>{};scheduleProjectsCloudSync=()=>{};true");
  const id = source.project.id || "site-editor-smoke-project";
  await evaluate(`(()=>{guruCancelDerivedRefresh();activeProjectId=${JSON.stringify(id)};state=guruExportWithoutPersistenceV223(()=>migrateWorkspace(${JSON.stringify(source)},${JSON.stringify(id)}));projects=[{id:activeProjectId,name:state.project.name,lifecycleStatus:'active'}];updateProjectChrome();els.launcher.hidden=true;els.appShell.hidden=false;activeView='gate';activeGateId='gate-1';renderGateNav({recalculate:false});window.__beforeSiteUi=JSON.stringify(state);return true})()`);
  const cards = [];
  for (const cardId of ["card-21", "card-22-hub", "card-22", "card-24"]) {
    assert(await evaluate(`openAuditPageCard(${JSON.stringify(cardId)})`), `Missing ${cardId}`);
    await waitFor(`document.querySelector('[data-card="${cardId}"]')`);
    const sectionKey = ({"card-21":"home_segments","card-22-hub":"catalog_lead_magnet","card-22":"catalog_trust_v493","card-24":"goat-product-delivery-v514"})[cardId];
    await evaluate(`(()=>{const block=document.querySelector('[data-card="${cardId}"] [data-v22-site-section="${sectionKey}"]');if(!block)throw Error('Missing sample block');block.open=true;return true})()`);
    const metrics = await evaluate(`(()=>{const card=document.querySelector('[data-card="${cardId}"]');const page=card.querySelector('.page-structure-card')||card;const sample=page.querySelector('[data-v22-site-section="${sectionKey}"]');const rect=s=>Math.round((s?.getBoundingClientRect().width||0)*10)/10;const content=card.querySelector('.g1-card-body');const fields=card.querySelector('.card-fields');const preview=sample.querySelector('.guru-site-editor-canvas-v543');const collection=sample.querySelector('.guru-site-editor-collection-v543');const cta=sample.querySelector('.guru-site-editor-cta-v543');const blocks=[...page.querySelectorAll('details[data-v22-site-section]')];return {id:${JSON.stringify(cardId)},pageClass:page.className,content:rect(content),fields:rect(fields),page:rect(page),preview:rect(preview),blockCount:blocks.length,unstyled:blocks.filter(b=>b.querySelector('input:not([type="checkbox"]):not([type="file"]),textarea,select')&&!b.querySelector('.guru-site-editor-canvas-v543')).map(b=>b.dataset.v22SiteSection),inputs:page.querySelectorAll('input,textarea,select').length,captions:page.querySelectorAll('.guru-site-field-caption-v542').length,fieldsInSample:sample.querySelectorAll('.guru-site-editor-field-v543').length,collectionColumns:collection?getComputedStyle(collection).gridTemplateColumns.split(' ').length:0,canvasColor:preview?getComputedStyle(preview).backgroundColor:'',ctaLabel:cta?.querySelector('.guru-site-field-caption-v542')?.textContent.trim()||'',ctaInputColor:cta?.querySelector('input')?getComputedStyle(cta.querySelector('input')).backgroundColor:'',sourceLabels:[...card.querySelectorAll('.guru-category-page-title-v495')].map(x=>x.querySelectorAll('.mega-platform-source-label').length),textareaHeight:Math.round(sample.querySelector('textarea')?.getBoundingClientRect().height||0),overflow:page.scrollWidth>page.clientWidth+2,focusable:blocks.every(b=>!!b.querySelector(':scope > summary'))}})()`);
    cards.push(metrics);
    assert(metrics.inputs > 0, `Empty editor ${cardId}`);
    assert(metrics.focusable && !metrics.overflow && metrics.captions > 0, `Broken editor ${cardId}`);
    assert.deepEqual(metrics.unstyled, [], `Some blocks bypassed the shared editor in ${cardId}`);
    assert(metrics.fieldsInSample > 0 && metrics.canvasColor === "rgb(255, 255, 255)", `Unstyled editor ${cardId}`);
    if (["card-21", "card-22" , "card-24"].includes(cardId))
      assert.equal(metrics.collectionColumns, 2, `Card grid is inconsistent in ${cardId}`);
    if (["card-21", "card-22-hub"].includes(cardId)) {
      assert.equal(metrics.ctaLabel, "CTA", `CTA caption is inconsistent in ${cardId}`);
      assert.equal(metrics.ctaInputColor, "rgba(0, 0, 0, 0)", `CTA input has an extra surface in ${cardId}`);
    }
    assert(metrics.preview > 0 && metrics.page >= metrics.content - 90, `Narrow editor ${cardId}`);
    assert(metrics.sourceLabels.every((count) => count <= 1), `Duplicate source label ${cardId}`);
    if (process.env.GURU_SITE_UI_SHOTS === "1") {
      await evaluate(`(()=>{const block=document.querySelector('[data-card="${cardId}"] [data-v22-site-section="${sectionKey}"]');if(block){block.open=true;block.scrollIntoView({block:'start',behavior:'instant'});}return true})()`);
      await delay(150);
      const shot = await page.call("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
      writeFileSync(`/private/tmp/guru-site-ui-${cardId}.png`, Buffer.from(shot.data, "base64"));
      const extraSections = {
        "card-22-hub": ["catalog_pagination", "catalog_final_cta_v493"],
        "card-22": ["catalog_pagination", "catalog_final_cta_v493"],
        "card-24": ["goat-product-finalCta-v514"],
      }[cardId] || [];
      for (const extraKey of extraSections) {
        const found = await evaluate(`(()=>{const block=document.querySelector('[data-card="${cardId}"] [data-v22-site-section="${extraKey}"]');if(!block)return false;block.open=true;block.scrollIntoView({block:'start',behavior:'instant'});return true})()`);
        if (!found) continue;
        await delay(150);
        const extraShot = await page.call("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
        writeFileSync(`/private/tmp/guru-site-ui-${cardId}-${extraKey}.png`, Buffer.from(extraShot.data, "base64"));
      }
    }
    const editProbe = await evaluate(`(()=>{const sample=document.querySelector('[data-card="${cardId}"] [data-v22-site-section="${sectionKey}"]');const field=sample.querySelector('[data-page-context-key]');if(!field)return null;const key=field.dataset.pageContextKey;const index=Number(field.dataset.pageContextIndex);const value=field.value+' · проверка редактора';field.value=value;field.dispatchEvent(new Event('input',{bubbles:true}));field.dispatchEvent(new Event('change',{bubbles:true}));return {key,value,saved:findCard(${JSON.stringify(cardId)})?.pageRows?.[index]?.contextFields?.[key]}})()`);
    assert(editProbe, `Missing editable field in ${cardId}`);
    assert.equal(editProbe.saved, editProbe.value, `Field edit did not reach the source data in ${cardId}`);
  }
  await page.call("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  for (const cardId of ["card-21", "card-22-hub", "card-22", "card-24"]) {
    assert(await evaluate(`openAuditPageCard(${JSON.stringify(cardId)})`));
    await waitFor(`document.querySelector('[data-card="${cardId}"] .page-structure-card')`);
    const overflow = await evaluate(`(()=>{const page=document.querySelector('[data-card="${cardId}"] .page-structure-card');return {client:page.clientWidth,scroll:page.scrollWidth}})()`);
    assert(overflow.scroll <= overflow.client + 2, `Mobile overflow ${cardId}: ${JSON.stringify(overflow)}`);
  }
  assert.deepEqual(page.errors, []);
  console.log(JSON.stringify({ passed: true, cards }));
} finally {
  await browser.call("Target.disposeBrowserContext", { browserContextId }).catch(() => {});
  page.close(); browser.close();
}
