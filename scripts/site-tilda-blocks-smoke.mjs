import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const fixture = JSON.parse(readFileSync(process.env.GURU_TILDA_FIXTURE || "/private/tmp/guru-now-korich-workspace.json", "utf8"));
const source = fixture.workspace || fixture;
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3189/";
const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9347";
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.id = 0;
    this.pending = new Map();
    this.errors = [];
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.method === "Runtime.exceptionThrown")
        this.errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
      const task = this.pending.get(message.id);
      if (!task) return;
      this.pending.delete(message.id);
      clearTimeout(task.timer);
      if (message.error) task.reject(new Error(message.error.message));
      else task.resolve(message.result);
    });
  }
  async call(method, params = {}) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP timeout: ${method}`));
      }, 120000);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.socket.close(); }
}

const version = await (await fetch(`http://127.0.0.1:${debugPort}/json/version`)).json();
const browser = new Cdp(version.webSocketDebuggerUrl);
const { browserContextId } = await browser.call("Target.createBrowserContext");
const { targetId } = await browser.call("Target.createTarget", { url: "about:blank", browserContextId });
const tabs = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
const page = new Cdp(tabs.find((tab) => tab.id === targetId).webSocketDebuggerUrl);
const evaluate = async (expression) => {
  const result = await page.call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails)
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
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
  await page.call("Runtime.enable");
  await page.call("Page.enable");
  await page.call("Page.navigate", { url: appUrl });
  await waitFor('document.readyState === "complete" && typeof guruTildaOpenV528 === "function"');
  await evaluate("rememberAccessUnlocked();setAccessState(true);bootstrapAppOnce();scheduleCloudSync=()=>{};scheduleProjectsCloudSync=()=>{};true");
  const projectId = source.project.id || "tilda-smoke-project";
  await evaluate(`(()=>{guruCancelDerivedRefresh();activeProjectId=${JSON.stringify(projectId)};state=guruExportWithoutPersistenceV223(()=>migrateWorkspace(${JSON.stringify(source)},${JSON.stringify(projectId)}));projects=[{id:activeProjectId,name:state.project.name,lifecycleStatus:"active"}];updateProjectChrome();els.launcher.hidden=true;els.appShell.hidden=false;activeView="gate";activeGateId="gate-1";renderGateNav({recalculate:false});return true})()`);
  assert(await evaluate('openAuditPageCard("card-22-hub")'), "Catalog page did not open");
  await waitFor(`document.querySelector('[data-card="card-22-hub"] [data-guru-tilda-edit-v528="card-22-hub:catalog_hero"]')`);

  const initial = await evaluate(`(()=>{const s=document.querySelector('[data-card="card-22-hub"] [data-v22-site-section="catalog_hero"]');return {open:s.open,label:s.querySelector('[data-guru-tilda-label-v528]')?.textContent.trim(),codes:state.project.tildaBlockCodesV528||null}})()`);
  assert.match(initial.label, /ST340 \/ ST340A \/ ST340B/);
  assert.equal(initial.codes?.["card-22-hub:catalog_hero"], undefined);
  await evaluate(`document.querySelector('[data-guru-tilda-edit-v528="card-22-hub:catalog_hero"]').click()`);
  await waitFor('document.querySelector("#guru-tilda-dialog-v528")?.open');
  const existing = await evaluate('[...document.querySelectorAll("#guru-tilda-dialog-v528 [data-guru-tilda-code-v528]")].map(x=>x.value)');
  assert.deepEqual(existing, ["ST340", "ST340A", "ST340B"]);
  await evaluate(`(()=>{const d=document.querySelector('#guru-tilda-dialog-v528');const rows=[...d.querySelectorAll('.guru-tilda-row-v528')];rows[0].querySelector('input').value='st341';rows[1].querySelector('[data-guru-tilda-action-v528="remove"]').click();d.querySelector('[data-guru-tilda-action-v528="add"]').click();d.querySelector('.guru-tilda-row-v528:last-child input').value='st342';d.querySelector('[data-guru-tilda-action-v528="save"]').click();return true})()`);
  const saved = await evaluate(`(()=>{const s=document.querySelector('[data-card="card-22-hub"] [data-v22-site-section="catalog_hero"]');return {open:s.open,label:s.querySelector('[data-guru-tilda-label-v528]')?.textContent.trim(),codes:state.project.tildaBlockCodesV528?.['card-22-hub:catalog_hero'],dialogOpen:document.querySelector('#guru-tilda-dialog-v528').open}})()`);
  assert.deepEqual(saved.codes, ["ST341", "ST340B", "ST342"]);
  assert.equal(saved.label, "Tilda: ST341 / ST340B / ST342");
  assert.equal(saved.open, initial.open);
  assert.equal(saved.dialogOpen, false);
  await evaluate("renderGate();true");
  await waitFor(`document.querySelector('[data-guru-tilda-edit-v528="card-22-hub:catalog_hero"]')`);
  assert.equal(await evaluate('document.querySelector("[data-card=card-22-hub] [data-v22-site-section=catalog_hero] [data-guru-tilda-label-v528]").textContent.trim()'), saved.label);
  await waitFor('localStorage.getItem(WORKSPACE_STORAGE_PREFIX + activeProjectId)?.includes("tildaBlockCodesV528") || localStorage.getItem(WORKSPACE_IDB_MARKER_PREFIX + activeProjectId)');
  const persisted = await evaluate(`(async()=>{const raw=localStorage.getItem(WORKSPACE_STORAGE_PREFIX+activeProjectId);const stored=raw?JSON.parse(raw):JSON.parse((await guruWorkspaceIdbReadV1(activeProjectId)).serialized);return stored?.project?.tildaBlockCodesV528?.['card-22-hub:catalog_hero']||null})()`);
  assert.deepEqual(persisted, saved.codes);

  await evaluate(`document.querySelector('[data-guru-tilda-edit-v528="card-22-hub:catalog_hero"]').click()`);
  await waitFor('document.querySelector("#guru-tilda-dialog-v528")?.open');
  const dragPoints = await evaluate(`(()=>{const rows=[...document.querySelectorAll('#guru-tilda-dialog-v528 .guru-tilda-row-v528')];const source=rows[0].querySelector('[data-guru-tilda-drag-v529]').getBoundingClientRect();const target=rows.at(-1).getBoundingClientRect();return {start:{x:source.left+source.width/2,y:source.top+source.height/2},end:{x:target.left+target.width/2,y:target.bottom-4}}})()`);
  await page.call("Input.dispatchMouseEvent", { type: "mousePressed", ...dragPoints.start, button: "left", clickCount: 1 });
  await page.call("Input.dispatchMouseEvent", { type: "mouseMoved", ...dragPoints.end, buttons: 1 });
  await page.call("Input.dispatchMouseEvent", { type: "mouseReleased", ...dragPoints.end, button: "left", clickCount: 1 });
  const reordered = await evaluate(`({rows:[...document.querySelectorAll('#guru-tilda-dialog-v528 [data-guru-tilda-code-v528]')].map(x=>x.value),saved:state.project.tildaBlockCodesV528['card-22-hub:catalog_hero'],label:document.querySelector('[data-card=card-22-hub] [data-v22-site-section=catalog_hero] [data-guru-tilda-label-v528]').textContent.trim()})`);
  assert.deepEqual(reordered.rows, ["ST340B", "ST342", "ST341"]);
  assert.deepEqual(reordered.saved, reordered.rows);
  assert.equal(reordered.label, "Tilda: ST340B / ST342 / ST341");
  const keyboard = await evaluate(`(()=>{const d=document.querySelector('#guru-tilda-dialog-v528');const first=d.querySelector('.guru-tilda-row-v528');first.querySelector('input').value='UNSAVED';first.querySelector('[data-guru-tilda-drag-v529]').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true}));return {rows:[...d.querySelectorAll('[data-guru-tilda-code-v528]')].map(x=>x.value),saved:state.project.tildaBlockCodesV528['card-22-hub:catalog_hero']}})()`);
  assert.deepEqual(keyboard.rows, ["ST342", "UNSAVED", "ST341"]);
  assert.deepEqual(keyboard.saved, ["ST342", "ST340B", "ST341"]);
  await evaluate(`document.querySelector('#guru-tilda-dialog-v528 [data-guru-tilda-action-v528="cancel"]').click()`);
  await evaluate("renderGate();true");
  assert.equal(await evaluate('document.querySelector("[data-card=card-22-hub] [data-v22-site-section=catalog_hero] [data-guru-tilda-label-v528]").textContent.trim()'), "Tilda: ST342 / ST340B / ST341");
  await waitFor(`(async()=>{const raw=localStorage.getItem(WORKSPACE_STORAGE_PREFIX+activeProjectId);const stored=raw?JSON.parse(raw):JSON.parse((await guruWorkspaceIdbReadV1(activeProjectId)).serialized);return JSON.stringify(stored?.project?.tildaBlockCodesV528?.['card-22-hub:catalog_hero'])===JSON.stringify(['ST342','ST340B','ST341'])})()`);

  await evaluate(`document.querySelector('[data-guru-tilda-edit-v528="card-22-hub:catalog_hero"]').click()`);
  await waitFor('document.querySelector("#guru-tilda-dialog-v528")?.open');
  await evaluate(`(()=>{const d=document.querySelector('#guru-tilda-dialog-v528');d.querySelectorAll('.guru-tilda-row-v528').forEach(row=>row.querySelector('[data-guru-tilda-action-v528="remove"]').click());d.querySelector('[data-guru-tilda-action-v528="save"]').click();return true})()`);
  assert.deepEqual(await evaluate(`state.project.tildaBlockCodesV528['card-22-hub:catalog_hero']`), []);
  assert.equal(await evaluate('document.querySelector("[data-card=card-22-hub] [data-v22-site-section=catalog_hero] [data-guru-tilda-label-v528]").textContent.trim()'), "Коды Tilda не указаны");
  await evaluate(`document.querySelector('[data-guru-tilda-edit-v528="card-22-hub:catalog_hero"]').click()`);
  await waitFor('document.querySelector("#guru-tilda-dialog-v528")?.open');
  await evaluate(`(()=>{const d=document.querySelector('#guru-tilda-dialog-v528');d.querySelector('[data-guru-tilda-code-v528]').value='ST343';d.querySelector('[data-guru-tilda-action-v528="save"]').click();return true})()`);
  assert.deepEqual(await evaluate(`state.project.tildaBlockCodesV528['card-22-hub:catalog_hero']`), ["ST343"]);

  assert(await evaluate('openAuditPageCard("card-21")'));
  await waitFor('document.querySelector("[data-card=card-21] [data-guru-tilda-edit-v528]")');
  assert(await evaluate('openAuditPageCard("card-22")'));
  await waitFor('document.querySelector("[data-card=card-22] [data-guru-tilda-edit-v528]")');
  assert(await evaluate('openAuditPageCard("card-24")'));
  await waitFor('document.querySelector("[data-card=card-24] [data-guru-tilda-edit-v528]")');
  assert.deepEqual(page.errors, []);
  console.log(JSON.stringify({ passed: true, initial: initial.label, saved: saved.label, reordered: reordered.label, persisted: true, errors: page.errors.length }));
} finally {
  await browser.call("Target.disposeBrowserContext", { browserContextId }).catch(() => {});
  page.close();
  browser.close();
}
