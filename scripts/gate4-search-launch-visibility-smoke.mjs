import { readFile, mkdir, writeFile } from "node:fs/promises";

// Run against a disposable Chrome debugging profile. The test creates and
// disposes its own browser context; no existing tab or local project is used.
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9358";
const gate4Path = process.env.GURU_GATE4_EXPORT || "/Users/vl/Downloads/gate-4.json";
const productId = "catalog-item-1786792591872-51f503";
const otherProductId = "catalog-item-1786792591872-c8b1e9";
const smokeId = "gate4-search-launch-visibility-smoke";
const gate4Export = JSON.parse(await readFile(gate4Path, "utf8"));
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.pending = new Map();
    this.nextId = 0;
    this.exceptions = [];
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", ({ data }) => {
      const message = JSON.parse(data);
      if (message.method === "Runtime.exceptionThrown")
        this.exceptions.push(message.params.exceptionDetails);
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      clearTimeout(pending.timer);
      message.error ? pending.reject(new Error(message.error.message)) : pending.resolve(message.result);
    });
  }
  async call(method, params = {}) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const id = ++this.nextId;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP timed out: ${method}`));
      }, 60000);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.socket.close(); }
}

const version = await (await fetch(`http://127.0.0.1:${debugPort}/json/version`)).json();
const browser = new Cdp(version.webSocketDebuggerUrl);
await browser.ready;
const { browserContextId } = await browser.call("Target.createBrowserContext");
let page;
try {
  const { targetId } = await browser.call("Target.createTarget", {
    url: "about:blank", browserContextId,
  });
  const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
  const target = targets.find((item) => item.id === targetId);
  assert(target?.webSocketDebuggerUrl, "Isolated Chrome target missing");
  page = new Cdp(target.webSocketDebuggerUrl);
  await page.ready;
  const evaluate = async (expression) => {
    const result = await page.call("Runtime.evaluate", {
      expression, awaitPromise: true, returnByValue: true,
    });
    if (result.exceptionDetails)
      throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  const waitFor = async (expression) => {
    for (let attempt = 0; attempt < 200; attempt += 1) {
      if (await evaluate(`Boolean(${expression})`)) return;
      await pause(100);
    }
    throw new Error(`Timed out: ${expression}`);
  };
  await page.call("Runtime.enable");
  await page.call("Page.enable");
  await page.call("Emulation.setDeviceMetricsOverride", {
    width: 1600, height: 1050, deviceScaleFactor: 1, mobile: false,
  });
  await page.call("Page.addScriptToEvaluateOnNewDocument", { source: `{
    try { localStorage.setItem("guru-platform-access-v01", "unlocked"); } catch (_) {}
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (input, init) => String(input).includes("/api/")
      ? Promise.resolve(new Response(JSON.stringify({ ok: true, isolatedSmoke: true }), {
          status: 200, headers: { "Content-Type": "application/json" }
        })) : nativeFetch(input, init);
  }` });
  await page.call("Page.navigate", { url: appUrl });
  await waitFor('document.readyState === "complete" && typeof createFreshWorkspace === "function" && typeof g4sbV407LaunchModel === "function"');
  console.error("Browser ready; loading isolated Gate 4 export");

  const initial = await evaluate(`(() => {
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};
    const imported = ${JSON.stringify(gate4Export)};
    state = createFreshWorkspace({ id: ${JSON.stringify(smokeId)}, name: "Проверка запуска · Коза" });
    for (const [key, value] of Object.entries(imported.content))
      state[key] = structuredClone(value);
    const gateIndex = state.gates.findIndex((gate) => gate.id === "gate-4");
    if (imported.structure) state.gates[gateIndex] = structuredClone(imported.structure);
    state.project.id = ${JSON.stringify(smokeId)};
    activeProjectId = state.project.id;
    activeView = "gate";
    activeGateId = "gate-4";
    els.launcher.hidden = true;
    els.appShell.hidden = false;
    updateProjectChrome();
    guruV194Ensure(state);
    window.__launchVisibility = {
      productId: ${JSON.stringify(productId)},
      otherProductId: ${JSON.stringify(otherProductId)},
      dataSnapshot(d) {
        return JSON.stringify({
          groups: d.groupRows, clusters: d.clusters, ads: d.adsRows,
          adsById: d.adsByGroupIdV420, drafts: d.jtbdDraftsV388,
          activeDraft: d.clusterDraft, checks: d.launchChecklistV406,
          unit: state.unitV130, pain: state.painV130, gates: state.gates,
        });
      },
      select(id) {
        const product = guruV194Product(id, state);
        if (!product) throw new Error("Missing product: " + id);
        const ui = guruV194Ui(state);
        ui.selectedCategoryId = product.categoryId;
        ui.selectedProductId = id;
        ensureGate4Production().launchProduct = id;
        const channel = g4LaunchChannels().find(g4IsYandexSearchChannel);
        g4EnsureLaunchUiState().rows = { [g4CampaignStateKey(id, channel.key)]: true };
        const d = ensureGate4SearchBuild(id);
        d.searchStepOpen = { ...d.searchStepOpen, clusters: false, launch: true };
        renderGate();
        return d;
      },
      inspect(id = ${JSON.stringify(productId)}) {
        const d = ensureGate4SearchBuild(id);
        const model = g4sbV407LaunchModel(id, d);
        const levels = [...document.querySelectorAll('[data-g4sb-launch-group-level]')];
        return {
          visible: levels.map((node) => ({
            id: node.dataset.g4sbLaunchGroupLevel,
            title: node.querySelector('h4')?.textContent.trim(),
            editing: Boolean(node.querySelector('[data-g4sb-launch-edit-group]')),
            manualChecks: node.querySelectorAll('[data-g4sb-launch-check]').length,
          })),
          fixed: model.groups.map((group) => group.groupId),
          displayed: model.displayGroups.map((group) => ({ id: group.groupId, fixed: group.fixed })),
          summaryGroups: model.summary?.groups,
          duplicates: model.summary?.duplicateCount,
          ready: model.ready, total: model.total,
          overview: document.querySelector('.g4-v407-group-overview')?.textContent.trim(),
        };
      },
    };
    // A Gate 4 export does not include Gate 1's page tree. Render the actual
    // Search card, with its normal handlers, without rebuilding unrelated
    // gates/media sections from incomplete source data.
    renderGate = () => {
      const id = guruV194Ui(state).selectedProductId;
      const d = ensureGate4SearchBuild(id);
      const channel = g4LaunchChannels().find(g4IsYandexSearchChannel);
      const started = performance.now();
      const html = g4sbV448WithEditorReadCache(id, d.clusterDraft, () =>
        g4sbSearchChannelCardHtml(channel, g4RsyaCampaignV289(id, channel.key), 0, id));
      els.contentArea.innerHTML = html;
      els.pageTitle.textContent = 'Яндекс Директ / Поиск · ' + guruV194Product(id, state).name;
      window.__launchVisibility.renderMs = Math.round(performance.now() - started);
    };
    return { loaded: true, products: guruV194Products(state).length };
  })()`);
  console.error("Fixture loaded", JSON.stringify(initial));
  const initialState = await evaluate(`(() => {
    const smoke = window.__launchVisibility;
    const d = smoke.select(smoke.productId);
    g4sbV407LaunchSummarySnapshots.delete(d);
    renderGate();
    smoke.expectedIds = g4sbV411ProductGroupEntries(smoke.productId, d)
      .filter((entry) => entry.group).sort(g4sbV411CompareEntries)
      .map((entry) => g4sbV420GroupId(entry.group));
    smoke.primaryId = smoke.expectedIds[0];
    smoke.initialData = smoke.dataSnapshot(d);
    smoke.initial = smoke.inspect();
    return { ...smoke.initial, expectedIds: smoke.expectedIds,
      summaryClosed: !d.searchStepOpen.clusters, renderMs: smoke.renderMs };
  })()`);
  console.error("Search card rendered", JSON.stringify(initialState));
  assert(initialState.visible.length === 3 && initialState.fixed.length === 2 && initialState.summaryGroups === 2,
    `Expected 3 visible / 2 fixed: ${JSON.stringify(initialState)}`);
  assert(JSON.stringify(initialState.visible.map((row) => row.id)) === JSON.stringify(initialState.expectedIds),
    `Wrong canonical order: ${JSON.stringify(initialState)}`);
  assert(initialState.visible[0].editing && initialState.visible[0].manualChecks === 0 &&
    initialState.visible.slice(1).every((row) => !row.editing && row.manualChecks > 0),
  `Editing group is hidden or counted as fixed: ${JSON.stringify(initialState)}`);
  assert(initialState.summaryClosed && !initialState.overview?.includes("Нет групп"),
    `Collapsed summary breaks launch state: ${JSON.stringify(initialState)}`);

  const readChecks = await evaluate(`(() => {
    const smoke = window.__launchVisibility;
    const d = ensureGate4SearchBuild(smoke.productId);
    const before = smoke.dataSnapshot(d);
    g4sbV407LaunchSummarySnapshots.set(d, { groups: 999, duplicateCount: 999,
      budget: 0, budgetKnown: 0, weekly: { base: 0 }, hasCompleteClicks: false });
    const started = performance.now();
    const model = g4sbV407LaunchModel(smoke.productId, d);
    const modelMs = Math.round(performance.now() - started);
    const channel = g4LaunchChannels().find(g4IsYandexSearchChannel);
    g4sbV406LaunchBodyHtml(smoke.productId, d, model, channel,
      g4RsyaCampaignV289(smoke.productId, channel.key));
    const snapshotUnchanged = before === smoke.dataSnapshot(d);
    const primary = d.groupRows.find((row) => g4sbV420GroupId(row) === smoke.primaryId);
    primary.isFixed = true;
    const allFixed = g4sbV407LaunchModel(smoke.productId, d);
    primary.isFixed = false;
    const editingAgain = g4sbV407LaunchModel(smoke.productId, d);
    renderGate();
    return {
      staleIgnored: model.summary.groups === 2 && model.summary.duplicateCount !== 999,
      modelMs,
      snapshotUnchanged,
      restoredUnchanged: before === smoke.dataSnapshot(d),
      allFixed: { visible: allFixed.displayGroups.length, fixed: allFixed.groups.length,
        summary: allFixed.summary.groups },
      editingAgain: { visible: editingAgain.displayGroups.length,
        fixed: editingAgain.groups.length, summary: editingAgain.summary.groups },
    };
  })()`);
  console.error("Read and lifecycle checks", JSON.stringify(readChecks));
  assert(readChecks.staleIgnored && readChecks.snapshotUnchanged && readChecks.restoredUnchanged,
    `Launch read mutated data or used stale cache: ${JSON.stringify(readChecks)}`);
  assert(readChecks.allFixed.visible === 3 && readChecks.allFixed.fixed === 3 &&
    readChecks.allFixed.summary === 3 && readChecks.editingAgain.visible === 3 &&
    readChecks.editingAgain.fixed === 2 && readChecks.editingAgain.summary === 2,
  `Fix/edit refresh failed: ${JSON.stringify(readChecks)}`);

  const screenshotPath = new URL("../artifacts/gate4-search-launch-three-groups.png", import.meta.url);
  const clip = await evaluate(`(async () => {
    const smoke = window.__launchVisibility;
    const d = ensureGate4SearchBuild(smoke.productId);
    d.launchGroupOpenV444 = { ...d.launchGroupOpenV444, [smoke.primaryId]: true };
    renderGate();
    const overview = document.querySelector('.g4-v407-group-overview');
    const levels = [...document.querySelectorAll('[data-g4sb-launch-group-level]')];
    overview.scrollIntoView({ block: 'center', behavior: 'instant' });
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const first = overview.getBoundingClientRect();
    const last = levels.at(-1).getBoundingClientRect();
    if (first.width < 500 || last.bottom <= first.top)
      throw new Error("Search groups are not visible for screenshot");
    return { x: Math.max(0, first.left + scrollX - 16),
      y: Math.max(0, first.top + scrollY - 20),
      width: Math.min(first.width + 32, 1580),
      height: last.bottom - first.top + 40, scale: 1 };
  })()`);
  const screenshot = await page.call("Page.captureScreenshot", {
    format: "png", captureBeyondViewport: true, clip,
  });
  await mkdir(new URL("../artifacts/", import.meta.url), { recursive: true });
  await writeFile(screenshotPath, Buffer.from(screenshot.data, "base64"));

  const navigation = await evaluate(`(() => {
    const smoke = window.__launchVisibility;
    // The 16 MB partial export exceeds this disposable profile's storage
    // quota. Observe the requested UI save without testing unrelated storage.
    smoke.preferenceSaves = 0;
    guruScheduleUiPreferenceSave = () => { smoke.preferenceSaves += 1; };
    const d = ensureGate4SearchBuild(smoke.productId);
    const entry = g4sbV411ProductGroupEntries(smoke.productId, d)
      .find((item) => item.groupId === smoke.primaryId);
    if (!entry?.draft?.open) throw new Error("Fresh export has no primary editing draft");
    smoke.draftBeforeNavigation = JSON.stringify(entry.draft);
    smoke.draftIdBeforeNavigation = entry.draft.editingClusterId;
    const button = document.querySelector('[data-g4sb-launch-edit-group]');
    button.click();
    return { clicked: true, groupId: smoke.primaryId };
  })()`);
  console.error("Editing navigation clicked");
  await waitFor(`document.querySelector('.g4-v166-jtbd[data-g4sb-product="${productId}"] [data-g4sb-draft-save]')`);
  const navigationResult = await evaluate(`(() => {
    const smoke = window.__launchVisibility;
    const d = ensureGate4SearchBuild(smoke.productId);
    const entry = g4sbV411ProductGroupEntries(smoke.productId, d)
      .find((item) => item.groupId === smoke.primaryId);
    const card = [...document.querySelectorAll('.g4-v166-jtbd[data-g4sb-product]')]
      .find((node) => node.dataset.g4sbProduct === smoke.productId &&
        node.dataset.g4sbJtbdId === entry.jtbdId);
    return { unchanged: JSON.stringify(entry.draft) === smoke.draftBeforeNavigation,
      correctDraft: d.clusterDraft.editingClusterId === smoke.draftIdBeforeNavigation,
      open: card?.open === true, fixed: entry.group.isFixed,
      persistenceRequested: smoke.preferenceSaves > 0 };
  })()`);
  assert(navigationResult.unchanged && navigationResult.correctDraft &&
    navigationResult.open && navigationResult.fixed === false && navigationResult.persistenceRequested,
  `Navigation replaced editing data: ${JSON.stringify(navigationResult)}`);

  const switching = await evaluate(`(() => {
    const smoke = window.__launchVisibility;
    smoke.select(smoke.otherProductId);
    const other = smoke.inspect(smoke.otherProductId);
    const noGoatGroups = other.displayed.every((row) => !smoke.expectedIds.includes(row.id));
    smoke.select(smoke.productId);
    const goat = smoke.inspect();
    return { noGoatGroups, otherGroups: other.displayed.map((row) => row.id),
      goatVisible: goat.visible.map((row) => row.id), expected: smoke.expectedIds };
  })()`);
  assert(switching.noGoatGroups &&
    JSON.stringify(switching.goatVisible) === JSON.stringify(switching.expected),
  `Product switching leaked groups: ${JSON.stringify(switching)}`);
  assert(page.exceptions.length === 0,
    `Browser errors: ${JSON.stringify(page.exceptions.map((item) => item.exception?.description || item.text))}`);
  console.log(JSON.stringify({ ok: true, source: gate4Path,
    exportedAt: gate4Export.exportedAt, initial: initialState, readChecks,
    navigation: { ...navigation, ...navigationResult }, switching,
    screenshot: "artifacts/gate4-search-launch-three-groups.png" }, null, 2));
} finally {
  page?.close();
  await browser.call("Target.disposeBrowserContext", { browserContextId });
  browser.close();
}
