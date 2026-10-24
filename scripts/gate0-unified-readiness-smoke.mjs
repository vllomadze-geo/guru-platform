import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";

const port = process.env.GURU_CHROME_DEBUG_PORT || "9420";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const fixture = JSON.parse(readFileSync(process.env.GURU_GATE0_FIXTURE ||
  "/private/tmp/guru-now-korich-workspace.json", "utf8"));
const artifact = "artifacts/gate0-unified-readiness";
const copyId = "gate0-unified-readiness-smoke";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.sequence = 0;
    this.pending = new Map();
    this.errors = [];
    this.dialogs = [];
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.method === "Page.javascriptDialogOpening") {
        this.dialogs.push(message.params.message);
        this.socket.send(JSON.stringify({ id: ++this.sequence, method: "Page.handleJavaScriptDialog",
          params: { accept: true } }));
      }
      if (message.method === "Page.screencastFrame") {
        this.frame = message.params;
        this.socket.send(JSON.stringify({ id: ++this.sequence, method: "Page.screencastFrameAck",
          params: { sessionId: message.params.sessionId } }));
      }
      if (message.method === "Runtime.exceptionThrown")
        this.errors.push(message.params.exceptionDetails.exception?.description ||
          message.params.exceptionDetails.text);
      const entry = this.pending.get(message.id);
      if (!entry) return;
      this.pending.delete(message.id);
      if (message.error) entry.reject(new Error(message.error.message));
      else entry.resolve(message.result);
    });
  }
  async call(method, params = {}) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const id = ++this.sequence;
      const timer = setTimeout(() => reject(new Error(`CDP timeout: ${method}`)), 120000);
      this.pending.set(id, {
        resolve: (value) => { clearTimeout(timer); resolve(value); },
        reject: (error) => { clearTimeout(timer); reject(error); },
      });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.socket.close(); }
}

async function evaluate(page, expression) {
  const response = await page.call("Runtime.evaluate", {
    expression, awaitPromise: true, returnByValue: true,
  });
  if (response.exceptionDetails)
    throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
  return response.result.value;
}

async function waitFor(page, expression, timeout = 90000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await evaluate(page, `Boolean(${expression})`)) return;
    await wait(150);
  }
  throw new Error(`Timeout: ${expression}`);
}

const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
const browser = new Cdp(version.webSocketDebuggerUrl);
const { browserContextId } = await browser.call("Target.createBrowserContext");
const { targetId } = await browser.call("Target.createTarget", { url: "about:blank", browserContextId });
const target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json())
  .find((entry) => entry.id === targetId);
const page = new Cdp(target.webSocketDebuggerUrl);

try {
  await page.call("Runtime.enable");
  await page.call("Page.enable");
  await page.call("Page.bringToFront");
  await page.call("Emulation.setDeviceMetricsOverride", {
    width: 1800, height: 1000, deviceScaleFactor: 1, mobile: false,
  });
  await page.call("Page.addScriptToEvaluateOnNewDocument", {
    source: `{
      const nativeFetch = window.fetch.bind(window);
      window.fetch = (input, init) => String(input).includes("/api/")
        ? Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200,
            headers: { "Content-Type": "application/json" } })) : nativeFetch(input, init);
    }`,
  });
  await page.call("Page.navigate", { url: appUrl });
  await waitFor(page, 'document.readyState === "complete" && typeof nowGuideBuildPath === "function"');
  await evaluate(page, `(() => {
    const workspace = structuredClone(window.GURU_SEED);
    workspace.project.id = ${JSON.stringify(copyId)};
    localStorage.clear();
    localStorage.setItem("guru-platform-access-v01", "unlocked");
    localStorage.setItem("guru-platform-projects-v02", JSON.stringify([{
      id: ${JSON.stringify(copyId)}, name: "Коричное яблоко", lifecycleStatus: "active",
      createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z"
    }]));
    localStorage.setItem("guru-platform-workspace-v02-" + ${JSON.stringify(copyId)}, JSON.stringify(workspace));
    location.reload();
    return true;
  })()`);
  await waitFor(page, 'document.querySelector("[data-open-project]")');
  await evaluate(page, 'document.querySelector("[data-open-project]").click(); true');
  await waitFor(page, `activeProjectId === ${JSON.stringify(copyId)} && document.querySelector("#nowGuide")`);
  await evaluate(page, `(() => {
    const source = ${JSON.stringify(fixture)};
    source.project.id = ${JSON.stringify(copyId)};
    guruExportWithoutPersistenceV223(() => {
      state = migrateWorkspace(source, ${JSON.stringify(copyId)});
      guruGateReadinessCache = new Map();
      activeView = "project";
      render();
    });
    guruCancelDerivedRefresh();
    guruDiscardUiPreferenceSave(${JSON.stringify(copyId)});
    return true;
  })()`);
  console.log("Коричное яблоко: тестовая копия загружена");

  const evidence = {};
  const selectBlock = async (id) => {
    await evaluate(page, `(() => {
      const path = nowGuideDisplayedPath;
      nowGuideSelect(path.find(item => item.gateId === "gate-0" && item.id === ${JSON.stringify(id)}), path);
      return true;
    })()`);
    await waitFor(page, `guruRenderedGateId === "gate-0" &&
      document.querySelector('details.gate0-card[data-card-row="${id}"]')?.open &&
      nowGuideCurrent(nowGuideDisplayedPath)?.id === ${JSON.stringify(id)} &&
      (() => { const node = nowGuideFindNode(nowGuideCurrent(nowGuideDisplayedPath)); const r = node?.getBoundingClientRect();
        return node?.classList.contains("now-guide-highlight") && r.top >= 0 && r.bottom <= innerHeight; })()`);
  };
  const matrix = () => evaluate(page, `(() => {
    const gate = state.gates.find(g => g.id === "gate-0");
    const path = nowGuideDisplayedPath.filter(item => item.gateId === "gate-0");
    const rows = path.map(item => {
      const badge = document.querySelector('details.gate0-card[data-card-row="' + item.id + '"] .gate0-card-status');
      return { id: item.id, title: item.title, pageStatus: [...badge.classList].find(s => s.startsWith("status-")).slice(7),
        pageBadge: badge.textContent, pathStatus: item.status };
    });
    return { productId: state.project.gate0ScopeUiV194.selectedProductId,
      rows, summary: guruGateReadiness(gate), menu: document.querySelector('[data-gate-id="gate-0"]').innerText };
  })()`);
  const checkMatrix = (data) => {
    assert.equal(data.rows.length, 9);
    for (const row of data.rows) assert.equal(row.pathStatus, row.pageStatus, row.id);
    assert.equal(data.summary.total, 9);
    assert.equal(data.rows.filter(row => ["ready", "not_required"].includes(row.pathStatus)).length, data.summary.done);
    assert(data.menu.includes(`9 блоков, прогресс ${data.summary.percent}%`));
  };
  const shot = async (label) => {
    page.frame = null;
    await page.call("Page.startScreencast", { format: "png", maxWidth: 1800, maxHeight: 1000, everyNthFrame: 1 });
    for (let attempt = 0; attempt < 30 && !page.frame?.data; attempt++) await wait(100);
    assert(page.frame?.data);
    writeFileSync(`${artifact}-${label}.png`, Buffer.from(page.frame.data, "base64"));
    await page.call("Page.stopScreencast");
  };
  const snapshot = () => evaluate(page, `(() => {
    window.__unifiedBefore = JSON.stringify({ workspace: guruExportDiagnosticCloneV223(state) });
    window.__unifiedUiWrites = 0;
    return true;
  })()`);
  const compare = () => evaluate(page, `(async () => {
    const before = window.__unifiedBefore;
    const after = JSON.stringify({ workspace: guruExportDiagnosticCloneV223(state) });
    const bytes = text => new TextEncoder().encode(text);
    const hash = async text => [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes(text)))].map(b => b.toString(16).padStart(2,"0")).join("");
    const differences = [];
    const scan = (a,b,path) => {
      if (differences.length >= 12 || a === b) return;
      if (!a || !b || typeof a !== "object" || typeof b !== "object") {
        differences.push({ path, beforeType: typeof a, afterType: typeof b,
          before: typeof a === "string" ? a.slice(0,100) : a, after: typeof b === "string" ? b.slice(0,100) : b }); return;
      }
      for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) scan(a[key],b[key],path + "." + key);
    };
    if (before !== after) scan(JSON.parse(before),JSON.parse(after),"export");
    return { schedules: window.__unifiedSchedules, linkWrites: window.__unifiedLinkWrites, differences, identical: before === after, beforeBytes: bytes(before).length, afterBytes: bytes(after).length,
      beforeSha256: await hash(before), afterSha256: await hash(after),
      updatedAtFields: (after.match(/"updated_at"\s*:/g) || []).length, uiPreferenceWrites: window.__unifiedUiWrites };
  })()`);
  await evaluate(page, `(() => {
    window.__unifiedLinkWrites = [];
    window.__unifiedSchedules = [];
    const scheduleDerived = guruScheduleDerivedRefresh;
    guruScheduleDerivedRefresh = function(...args) {
      if (window.__unifiedSchedules.length < 8) window.__unifiedSchedules.push(new Error("Постановка пересчёта").stack);
      return scheduleDerived.apply(this,args);
    };
    const flash = flashSaving;
    flashSaving = function(...args) {
      if (window.__unifiedSchedules.length < 8) window.__unifiedSchedules.push(new Error("Запрос сохранения").stack);
      return flash.apply(this,args);
    };
    const addLink = addOrUpdateProjectLink;
    addOrUpdateProjectLink = function(url, patch, workspace = state) {
      if (workspace === state && window.__unifiedLinkWrites.length < 4)
        window.__unifiedLinkWrites.push(new Error("Запись ссылки при просмотре").stack);
      return addLink(url, patch, workspace);
    };
    const schedule = guruScheduleUiPreferenceSave;
    guruScheduleUiPreferenceSave = function(...args) { window.__unifiedUiWrites++; return schedule.apply(this,args); };
    return true;
  })()`);
  await snapshot();
  await selectBlock("gate0-company-keyword-foundation");
  evidence.defaultProduct = await matrix();
  checkMatrix(evidence.defaultProduct);
  assert.equal(evidence.defaultProduct.summary.done, 8);
  assert.equal(evidence.defaultProduct.summary.percent, 94);
  assert.equal(await evaluate(page, 'document.querySelector("#nowGuide .now-guide-missing").innerText'), "Всё заполнено");
  evidence.keyword = await evaluate(page, `(() => ({
    text: document.querySelector("#nowGuide").innerText,
    badge: document.querySelector('[data-card-row="gate0-company-keyword-foundation"] .gate0-card-status').innerText,
    stats: guruCompanyKeywordFoundationStatsV351(state),
    headerVisible: (() => { const r = nowGuideFindNode(nowGuideCurrent(nowGuideDisplayedPath)).getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; })()
  }))()`);
  await shot("keywords");
  await shot("gate0-percent");
  console.log("Девять значков совпадают", JSON.stringify(evidence.defaultProduct));
  evidence.hidden = await evaluate(page, `(() => {
    const gate = state.gates.find(g => g.id === "gate-0");
    const ids = ["card-4", "card-5", "card-6", "card-8", "card-9"];
    const altered = { ...state, gates: state.gates.map(g => g === gate ? { ...g, cards: g.cards.map(c => ids.includes(c.id) ? { ...c, status: "problem" } : c) } : g) };
    return ids.map(id => ({ id, status: gate.cards.find(c => c.id === id).status,
      ownEditor: Boolean(document.querySelector('[data-card-row="' + id + '"]')),
      ignored: nowGuideGate0Cards(gate).every(c => guruGate0BlockReadiness(c, state).status === guruGate0BlockReadiness(c, altered).status) }));
  })()`);
  for (const row of evidence.hidden) { assert.equal(row.ownEditor, false); assert(row.ignored); }
  // Exercise every block, then a return to the first incomplete block.
  for (const row of evidence.defaultProduct.rows) {
    await selectBlock(row.id);
    checkMatrix(await matrix());
  }
  await evaluate(page, 'document.querySelector("#nowGuide [data-now-current]")?.click(); true');
  evidence.readOnlyDefault = await compare();
  assert(evidence.readOnlyDefault.identical, "Просмотр изменил экспорт выбранного продукта");
  assert.equal(evidence.readOnlyDefault.uiPreferenceWrites, 0);

  // Select an existing incomplete product in the isolated copy. No field
  // edits or persistence are used to prepare its screenshot.
  evidence.productSelection = await evaluate(page, `(() => {
    const product = guruV194Products(state).find(p => p.id === "catalog-item-1786792591872-c8b1e9");
    if (!product) throw new Error("Нет проверяемого продукта");
    state.project.gate0ScopeUiV194.selectedProductId = product.id;
    state.project.gate0ScopeUiV194.selectedCategoryId = megaPlatformProductCategoryIds(product, state)[0] || "__uncategorized__";
    guruExportWithoutPersistenceV223(() => { renderGate(); renderGateNav(); });
    guruCancelDerivedRefresh(); guruDiscardUiPreferenceSave(${JSON.stringify(copyId)});
    return { id: product.id, name: product.name };
  })()`);
  // Product preparation above runs the existing full menu initializers.
  // Their queued microtasks must finish before the read-only observation.
  // Cancel the preparation autosave, not any guide action under test.
  await evaluate(page, `(() => {
    clearTimeout(_saveTimer); _saveTimer = null;
    guruCancelDerivedRefresh(); guruDiscardUiPreferenceSave(${JSON.stringify(copyId)});
    window.__unifiedSchedules = []; window.__unifiedLinkWrites = [];
    return true;
  })()`);
  await selectBlock("card-2");
  await snapshot();
  evidence.incompleteProduct = await matrix();
  checkMatrix(evidence.incompleteProduct);
  assert.equal(evidence.incompleteProduct.summary.percent, 89);
  const missing = await evaluate(page, 'nowGuideDisplayedMissing');
  assert(missing.length >= 2);
  assert(missing.some(item => item.label.includes("JTBD: запись 1, Какой клиент хочет")));
  assert(!missing.some(item => item.fallback));
  await evaluate(page, 'document.querySelector("#nowGuide [data-now-missing]").click(); true');
  await waitFor(page, `(() => { const field = nowGuideMissingNode(nowGuideDisplayedMissing[0]);
    const rect = field?.getBoundingClientRect(); return field === document.activeElement && !field.value && rect.top >= 0 && rect.bottom <= innerHeight; })()`);
  evidence.productHint = await evaluate(page, `(() => {
    const field = nowGuideMissingNode(nowGuideDisplayedMissing[0]);
    return { missing: nowGuideDisplayedMissing, text: document.querySelector("#nowGuide").innerText,
      focused: field === document.activeElement, highlighted: field.classList.contains("now-guide-highlight"),
      expanded: field.closest("details.gate0-card").open };
  })()`);
  assert(evidence.productHint.highlighted);
  await shot("product");
  for (let i = 0; i < 10; i++) {
    await selectBlock(i % 2 ? "card-2" : "gate0-company-keyword-foundation");
    checkMatrix(await matrix());
  }
  evidence.readOnlyIncomplete = await compare();
  console.log("Сравнение экспорта", JSON.stringify({ default: evidence.readOnlyDefault, incomplete: evidence.readOnlyIncomplete }));
  assert(evidence.readOnlyIncomplete.identical, "Десять переходов изменили экспорт, включая updated_at");
  assert.equal(evidence.readOnlyIncomplete.uiPreferenceWrites, 0);

  // Only this phase edits the disposable in-memory copy. Persistence is
  // disabled because its historical snapshots exceed localStorage quota.
  evidence.edits = [];
  await selectBlock("card-2");
  await evaluate(page, 'guruPersistStateFast = () => true; scheduleCloudSync = () => {}; true');
  for (let i = 0; i < missing.length; i++) {
    const edit = await evaluate(page, `(() => {
      const check = nowGuideDisplayedMissing[0]; const field = nowGuideMissingNode(check);
      window.__unifiedEdited = check.selector; window.__unifiedDocument = document;
      field.focus(); field.value = "Тестовое заполнение видимого поля";
      field.dispatchEvent(new Event("input", { bubbles: true }));
      return { label: check.label, selector: check.selector };
    })()`);
    await waitFor(page, '!nowGuideDisplayedMissing.some(item => item.selector === window.__unifiedEdited)');
    assert(await evaluate(page, 'document === window.__unifiedDocument'));
    evidence.edits.push(edit);
  }
  await waitFor(page, `document.querySelector('[data-card-row="card-2"] .gate0-card-status').textContent === "Готово"`);
  evidence.afterInput = await matrix();
  checkMatrix(evidence.afterInput);
  assert.equal(evidence.afterInput.rows.find(row => row.id === "card-2").pathStatus, "ready");
  assert.equal(await evaluate(page, 'document.querySelector("#nowGuide .now-guide-missing").innerText'), "Всё заполнено");

  // Confirm that the existing offer completeness rule names the actual CTA.
  await evaluate(page, `(() => {
    state.project.gate0ScopeUiV194.selectedProductId = ${JSON.stringify(fixture.project.gate0ScopeUiV194.selectedProductId)};
    state.project.gate0ScopeUiV194.selectedCategoryId = ${JSON.stringify(fixture.project.gate0ScopeUiV194.selectedCategoryId)};
    guruExportWithoutPersistenceV223(() => { renderGate(); renderGateNav(); });
    guruCancelDerivedRefresh(); return true;
  })()`);
  await selectBlock("card-2");
  await evaluate(page, `(() => {
    const field = document.querySelector('[data-card-row="card-2"] [data-gate0-scope-record-field="offer_cta_primary"]');
    field.value = ""; field.dispatchEvent(new Event("input", { bubbles: true })); return true;
  })()`);
  await waitFor(page, 'nowGuideDisplayedMissing.some(item => item.label.includes("Основной CTA"))');
  evidence.offerHint = await evaluate(page, 'nowGuideDisplayedMissing');
  checkMatrix(await matrix());
  assert.equal(page.errors.length, 0, page.errors.join("\n"));
  assert.deepEqual(page.dialogs, []);
  evidence.beforeCorrection = JSON.parse(readFileSync("artifacts/gate0-now-missing-results.json", "utf8")).initial.summary;
  evidence.build = await evaluate(page, 'GURU_BUILD_INFO.version');
  writeFileSync(`${artifact}-results.json`, JSON.stringify({ passed: true, ...evidence }, null, 2) + "\n");
  console.log(JSON.stringify(evidence, null, 2));
  console.log("Gate 0 unified readiness smoke: PASS");
} finally {
  page.close();
  await browser.call("Target.disposeBrowserContext", { browserContextId });
  browser.close();
}
