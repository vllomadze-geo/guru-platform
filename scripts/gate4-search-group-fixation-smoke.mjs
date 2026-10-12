import { readFile, writeFile } from "node:fs/promises";

const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:4173/";
const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9395";
const fullPath = process.env.GURU_PROJECT_EXPORT || "/Users/vl/Downloads/guru-project-korichnoe-yabloko-all.json";
const gate4Path = process.env.GURU_GATE4_EXPORT || "/Users/vl/Downloads/gate-4.json";
const productId = "catalog-item-1786792591872-51f503";
const smokeId = "gate4-search-group-fixation-smoke";
const profileClickHandlers = process.env.GURU_PROFILE_CLICK_HANDLERS === "1";
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.nextId = 0;
    this.pending = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", ({ data }) => {
      const message = JSON.parse(data);
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      message.error ? pending.reject(new Error(message.error.message)) : pending.resolve(message.result);
    });
  }
  async call(method, params = {}) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const id = ++this.nextId;
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.socket.close(); }
}

const fullExport = JSON.parse(await readFile(fullPath, "utf8"));
const gate4Export = JSON.parse(await readFile(gate4Path, "utf8"));
assert(fullExport.project?.id === gate4Export.project?.id, "Project exports differ");
const fixture = structuredClone(fullExport.workspace);
Object.entries(gate4Export.content).forEach(([key, value]) => {
  fixture[key] = structuredClone(value);
});
const gateIndex = fixture.gates.findIndex((gate) => gate.id === "gate-4");
assert(gateIndex >= 0, "Gate 4 missing");
fixture.gates[gateIndex] = structuredClone(gate4Export.structure);
fixture.project.id = smokeId;
fixture.project.name = "Gate 4 group fixation smoke";
fixture.gate5 = {};
const product = fixture.project.catalogItemsV189.find((item) => item.id === productId);
assert(product, "Goat product missing");

const browserVersion = await (await fetch(`http://127.0.0.1:${debugPort}/json/version`)).json();
const browser = new Cdp(browserVersion.webSocketDebuggerUrl);
await browser.ready;
const { browserContextId } = await browser.call("Target.createBrowserContext");
const { targetId } = await browser.call("Target.createTarget", { url: "about:blank", browserContextId });
const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
const target = targets.find((item) => item.id === targetId);
assert(target?.webSocketDebuggerUrl, "Isolated browser target missing");
const page = new Cdp(target.webSocketDebuggerUrl);
await page.ready;

async function evaluate(expression) {
  const result = await page.call("Runtime.evaluate", {
    expression, awaitPromise: true, returnByValue: true,
  });
  if (result.exceptionDetails)
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}

async function waitFor(expression) {
  for (let index = 0; index < 200; index += 1) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await pause(100);
  }
  throw new Error(`Timed out: ${expression}`);
}

async function screenshot(selector, path, padding = 12) {
  const clip = await evaluate(`(() => {
    const node = document.querySelector(${JSON.stringify(selector)});
    if (!node) return null;
    node.scrollIntoView({ block: "center" });
    const box = node.getBoundingClientRect();
    return { x: Math.max(0, box.left + scrollX - ${padding}),
      y: Math.max(0, box.top + scrollY - ${padding}),
      width: Math.min(box.width + ${padding * 2}, 1560),
      height: box.height + ${padding * 2}, scale: 1 };
  })()`);
  assert(clip, `Screenshot target missing: ${selector}`);
  const shot = await page.call("Page.captureScreenshot", {
    format: "png", captureBeyondViewport: true, clip,
  });
  await writeFile(new URL(path, import.meta.url), Buffer.from(shot.data, "base64"));
}

try {
  await page.call("Runtime.enable");
  await page.call("Page.enable");
  await page.call("Emulation.setDeviceMetricsOverride", {
    width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false,
  });
  await page.call("Page.addScriptToEvaluateOnNewDocument", { source: `{
    if (${JSON.stringify(profileClickHandlers)}) {
      const nativeAddEventListener = EventTarget.prototype.addEventListener;
      window.__guruClickHandlerTimings = [];
      EventTarget.prototype.addEventListener = function (type, listener, options) {
        if (type !== "click" || typeof listener !== "function")
          return nativeAddEventListener.call(this, type, listener, options);
        const source = Function.prototype.toString.call(listener)
          .replace(/\s+/g, " ").slice(0, 180);
        const wrapped = function () {
          const startedAt = performance.now();
          try { return listener.apply(this, arguments); }
          finally {
            const duration = performance.now() - startedAt;
            if (duration >= 0.1)
              window.__guruClickHandlerTimings.push({ duration, source });
          }
        };
        return nativeAddEventListener.call(this, type, wrapped, options);
      };
    }
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (input, init) => String(input).includes("/api/")
      ? Promise.resolve(new Response(JSON.stringify({ ok: true, isolatedSmoke: true }), {
          status: 200, headers: { "Content-Type": "application/json" }
        })) : nativeFetch(input, init);
  }` });
  await page.call("Page.navigate", { url: appUrl });
  await waitFor('document.readyState === "complete" && Boolean(window.GURU_SEED)');
  await evaluate(`(() => {
    const workspace = structuredClone(window.GURU_SEED);
    workspace.project.id = ${JSON.stringify(smokeId)};
    workspace.project.name = "Gate 4 group fixation smoke";
    localStorage.clear();
    localStorage.setItem("guru-platform-access-v01", "unlocked");
    localStorage.setItem("guru-platform-projects-v02", JSON.stringify([{
      id: workspace.project.id, name: workspace.project.name, lifecycleStatus: "active",
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }]));
    localStorage.setItem("guru-platform-workspace-v02-" + workspace.project.id, JSON.stringify(workspace));
    location.reload();
  })()`);
  await waitFor('document.querySelector("[data-open-project]")');
  await evaluate('document.querySelector("[data-open-project]").click(); true');
  await waitFor('Boolean(state) && typeof g4sbGroupIsFixed === "function"');

  const setup = await evaluate(`(() => {
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};
    state = ${JSON.stringify(fixture)};
    activeProjectId = ${JSON.stringify(smokeId)};
    const ui = guruV194Ui(state);
    ui.selectedCategoryId = ${JSON.stringify(product.categoryId)};
    ui.selectedProductId = ${JSON.stringify(productId)};
    const channel = g4LaunchChannels().find(g4IsYandexSearchChannel);
    g4EnsureLaunchUiState().rows[g4CampaignStateKey(${JSON.stringify(productId)}, channel.key)] = true;
    const d = ensureGate4SearchBuild(${JSON.stringify(productId)});
    d.groupRows = [];
    d.clusters = [];
    d.adsRows = {};
    const jtbds = g4sbV166DirectionJtbds(${JSON.stringify(productId)});
    const firstDraft = d.jtbdDraftsV388?.[jtbds[0]?.key];
    if (firstDraft)
      firstDraft.callouts = ["Ручная работа", "На заказ", "Для подарка", "С доставкой"];
    const ready = jtbds.find((jtbd) => {
      const draft = d.jtbdDraftsV388?.[jtbd.key];
      return draft && g4sbGroupSaveAssessment(${JSON.stringify(productId)}, d, draft).enabled;
    });
    if (!ready) throw new Error("No ready Cinnamon Apple draft: " + JSON.stringify(jtbds.map((jtbd) => {
      const draft = d.jtbdDraftsV388?.[jtbd.key];
      return { key: jtbd.key, assessment: draft
        ? g4sbGroupSaveAssessment(${JSON.stringify(productId)}, d, draft) : null };
    })));
    d.openJtbdIdsV391 = [ready.key];
    d.activeJtbdId = ready.key;
    d.clusterDraft = d.jtbdDraftsV388[ready.key];
    d.clusterDraft.open = true;
    guruNavigateToGate("gate-4");
    return { jtbdId: ready.key, title: ready.text,
      ads: structuredClone(d.clusterDraft.ads),
      callouts: structuredClone(d.clusterDraft.callouts) };
  })()`);
  await waitFor('document.querySelector("[data-g4sb-draft-save]")');

  const initial = await evaluate(`(() => {
    const button = document.querySelector('[data-g4sb-draft-save]');
    return { text: button?.textContent.trim(), disabled: button?.disabled,
      groups: ensureGate4SearchBuild(${JSON.stringify(productId)}).groupRows.length };
  })()`);
  assert(initial.text === "Зафиксировать группу" && !initial.disabled && initial.groups === 0,
    `Initial fixation control is wrong: ${JSON.stringify(initial)}`);
  const fixationViewportBefore = await evaluate(`new Promise((resolve) => {
    const button = document.querySelector('[data-g4sb-draft-save]');
    const card = button?.closest('.g4-v166-jtbd[data-g4sb-jtbd-id]');
    button?.scrollIntoView({ block: 'center', behavior: 'auto' });
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const box = card?.getBoundingClientRect();
      resolve({
        cardBottom: box?.bottom ?? null,
        buttonTop: button?.getBoundingClientRect().top ?? null,
        windowY: window.scrollY,
        contentScroll: document.querySelector('.content-area')?.scrollTop ?? null,
      });
    }));
  })`);
  await evaluate('document.querySelector("[data-g4sb-draft-save]").click(); true');
  await waitFor('document.querySelector("[data-g4sb-return-to-edit]")');
  await pause(120);

  const fixed = await evaluate(`(() => {
    const d = ensureGate4SearchBuild(${JSON.stringify(productId)});
    const group = d.groupRows[0];
    const jtbd = g4sbV166DirectionJtbds(${JSON.stringify(productId)})
      .find((item) => item.key === ${JSON.stringify(setup.jtbdId)});
    const groups = d.groupRows.map((row, index) => ({ row, index }))
      .filter(({ row }) => g4sbV166GroupJtbdKey(${JSON.stringify(productId)}, row) === jtbd.key);
    const gate4 = state.gates.find((gate) => gate.id === "gate-4");
    const originalStatus = g4sbCampaignStatus;
    let gate4SearchCalls = 0;
    g4sbCampaignStatus = function () {
      gate4SearchCalls += 1;
      return originalStatus.apply(this, arguments);
    };
    guruGateBlockStatuses(gate4);
    g4sbCampaignStatus = originalStatus;
    return { count: d.groupRows.length, isFixed: group.isFixed, fixedAt: group.fixedAt,
      draftOpen: Boolean(d.clusterDraft?.open), draftStored: Boolean(d.jtbdDraftsV388?.[jtbd.key]),
      summary: g4sbV405SummaryEntries(${JSON.stringify(productId)}, d).length,
      visibleSummary: Number(document.querySelector('[data-g4sb-launch-summary]')?.dataset.g4sbSummaryGroups),
      readiness: g4sbV166JtbdReadiness(${JSON.stringify(productId)}, d, jtbd, groups),
      visibleReadiness: document.querySelector('[data-g4sb-jtbd-id="${setup.jtbdId}"] [data-g4sb-jtbd-readiness]')?.dataset.g4sbJtbdReadiness,
      campaignStatus: g4sbCampaignStatus(${JSON.stringify(productId)}, {}, d),
      gate4SearchCalls,
      button: document.querySelector('[data-g4sb-return-to-edit]')?.textContent.trim(),
      deleteVisible: Boolean(document.querySelector('.g4-v127-group-row [data-g4sb-delete-unit]')),
      viewport: (() => {
        const card = document.querySelector('[data-g4sb-jtbd-id="${setup.jtbdId}"]');
        const box = card?.getBoundingClientRect();
        return { cardBottom: box?.bottom ?? null, detailsOpen: Boolean(card?.open), windowY: window.scrollY,
          contentScroll: document.querySelector('.content-area')?.scrollTop ?? null };
      })() };
  })()`);
  const fixationViewportDrift = Math.abs(
    Number(fixed.viewport.cardBottom) - Number(fixationViewportBefore.cardBottom),
  );
  assert(fixed.count === 1 && fixed.isFixed === true && fixed.fixedAt &&
    !fixed.draftOpen && !fixed.draftStored && fixed.summary === 1 && fixed.visibleSummary === 1 &&
    fixed.readiness === "ready" && fixed.visibleReadiness === "ready" &&
    fixed.campaignStatus === "ready_to_launch" &&
    fixed.gate4SearchCalls > 0 && fixed.button === "Вернуть в редактирование" &&
    !fixed.deleteVisible && fixationViewportDrift <= 4,
  `Fixed state or viewport anchor is wrong: ${JSON.stringify({
    fixed, fixationViewportBefore, fixationViewportDrift,
  })}`);
  await evaluate(`(() => {
    const row = document.querySelector('.g4-v127-group-row.is-fixed');
    const details = row?.closest('details');
    if (details) details.open = true;
    return Boolean(row);
  })()`);
  await screenshot(".g4-v127-group-row.is-fixed", "../artifacts/gate4-search-group-fixed-v410.png");

  const returnInteraction = await evaluate(`(async () => {
    const button = document.querySelector('[data-g4sb-return-to-edit]');
    const card = button?.closest('.g4-v166-jtbd[data-g4sb-jtbd-id]');
    const jtbdId = card?.dataset.g4sbJtbdId || '';
    const cardTop = card?.getBoundingClientRect().top ?? null;
    const scrollBefore = window.scrollY;
    const originalRenderGate = renderGate;
    let renderGateCalls = 0;
    let renderGateMs = 0;
    const functionTimings = {};
    const timedNames = [
      'g4sbOpenSavedGroupEditor', 'g4sbV448RefreshSearchCoverage',
      'g4sbV166EditorHtml', 'g4sbV405LaunchSummaryHtml',
      'g4sbV448RefreshLaunchPriorities', 'guruApplyFieldStates',
      'guruAutosizeProgressively', 'g4sbV403DuplicateCount',
      'g4sbV166DirectionJtbds', 'ensureGate4SearchBuild',
      'g4sbKeywordEditorHtml', 'g4sbV127DraftOperationsHtml',
      'g4sbV439AdPoolsEditorHtml', 'g4sbV441AdCardsEditorHtml',
      'g4sbV443AdVariantsPrompt', 'g4sbV437GroupSitelinksHtml',
      'g4sbV426SitelinkPromptHtml', 'g4sbGroupCalloutsHtml',
      'g4sbGroupSaveControlsHtml', 'g4sbV140ForecastAssessment',
      'g4sbV397MinusPromptForDraft', 'g4sbV398AdPrompt',
      'g4sbV128SourcePhraseRows', 'g4sbV385ProductSemantics',
      'g4sbV386JtbdPhraseRows', 'g4sbV128PhraseUsage',
    ];
    const originals = new Map();
    const profileFunctions = ${JSON.stringify(process.env.GURU_PROFILE_RETURN_EDIT === "1")};
    if (profileFunctions) timedNames.forEach((name) => {
      if (typeof window[name] !== 'function') return;
      const original = window[name];
      originals.set(name, original);
      window[name] = (...args) => {
        const mark = performance.now();
        try { return original(...args); }
        finally {
          const timing = functionTimings[name] ||= { calls: 0, ms: 0 };
          timing.calls += 1;
          timing.ms += performance.now() - mark;
        }
      };
    });
    renderGate = (...args) => {
      renderGateCalls += 1;
      const started = performance.now();
      try { return originalRenderGate(...args); }
      finally { renderGateMs += performance.now() - started; }
    };
    if (window.__guruClickHandlerTimings) window.__guruClickHandlerTimings.length = 0;
    const started = performance.now();
    button.click();
    const synchronousMs = performance.now() - started;
    await new Promise((resolve) => requestAnimationFrame(() =>
      requestAnimationFrame(resolve)));
    const settledMs = performance.now() - started;
    renderGate = originalRenderGate;
    originals.forEach((original, name) => { window[name] = original; });
    const nextCard = document.querySelector(
      '.g4-v166-jtbd[data-g4sb-jtbd-id="' + CSS.escape(jtbdId) + '"]'
    );
    return { renderGateCalls, renderGateMs, synchronousMs, settledMs,
      functionTimings,
      clickHandlerTimings: (window.__guruClickHandlerTimings || [])
        .sort((left, right) => right.duration - left.duration).slice(0, 12),
      editorVisible: Boolean(nextCard?.querySelector('[data-g4sb-draft-save]')),
      cardTopDelta: cardTop === null || !nextCard ? null
        : Math.abs(nextCard.getBoundingClientRect().top - cardTop),
      scrollDelta: Math.abs(window.scrollY - scrollBefore) };
  })()`);
  await waitFor('document.querySelector("[data-g4sb-draft-save]")');
  const editing = await evaluate(`(() => {
    const d = ensureGate4SearchBuild(${JSON.stringify(productId)});
    const group = d.groupRows[0];
    const jtbd = g4sbV166DirectionJtbds(${JSON.stringify(productId)})
      .find((item) => item.key === ${JSON.stringify(setup.jtbdId)});
    const groups = d.groupRows.map((row, index) => ({ row, index }))
      .filter(({ row }) => g4sbV166GroupJtbdKey(${JSON.stringify(productId)}, row) === jtbd.key);
    const phrase = d.clusterDraft.keywordRows[0].kw;
    let other = Object.values(d.jtbdDraftsV388 || {})
      .find((draft) => draft !== d.clusterDraft && Array.isArray(draft?.keywordRows));
    if (!other) {
      const otherJtbd = g4sbV166DirectionJtbds(${JSON.stringify(productId)})
        .find((item) => item.key !== jtbd.key);
      if (!otherJtbd) throw new Error("Second JTBD missing");
      other = structuredClone(d.clusterDraft);
      other.jtbdId = otherJtbd.key;
      other.editingClusterId = "";
      other.name = "Smoke duplicate draft";
      other.keywordRows = [];
      d.jtbdDraftsV388[otherJtbd.key] = other;
    }
    other.open = true;
    if (!other.keywordRows.some((row) => g4sbV128PhraseKey(row.kw) === g4sbV128PhraseKey(phrase)))
      other.keywordRows.push(g4sbKeywordRow({ kw: phrase }));
    const duplicateCount = g4sbV403DuplicateCount(${JSON.stringify(productId)}, d);
    const occupied = (g4sbV128PhraseUsage(${JSON.stringify(productId)}, d, other)
      .get(g4sbV128PhraseKey(phrase)) || []).some((item) => item.groupId === group.groupId);
    other.keywordRows = other.keywordRows
      .filter((row) => g4sbV128PhraseKey(row.kw) !== g4sbV128PhraseKey(phrase));
    return { isFixed: group.isFixed, draftOpen: d.clusterDraft.open,
      summary: g4sbV405SummaryEntries(${JSON.stringify(productId)}, d).length,
      visibleSummary: Number(document.querySelector('[data-g4sb-launch-summary]')?.dataset.g4sbSummaryGroups),
      readiness: g4sbV166JtbdReadiness(${JSON.stringify(productId)}, d, jtbd, groups),
      visibleReadiness: document.querySelector('[data-g4sb-jtbd-id="${setup.jtbdId}"] [data-g4sb-jtbd-readiness]')?.dataset.g4sbJtbdReadiness,
      campaignStatus: g4sbCampaignStatus(${JSON.stringify(productId)}, {}, d),
      duplicateCount, occupied,
      button: document.querySelector('[data-g4sb-draft-save]')?.textContent.trim(),
      ads: structuredClone(d.clusterDraft.ads),
      callouts: structuredClone(d.clusterDraft.callouts),
      deleteVisible: Boolean(document.querySelector('.g4-group-save-controls [data-g4sb-delete-unit]')),
      deleteButtonUi: (() => {
        const button = document.querySelector(
          '.g4-group-save-controls .g4-group-delete-editing[data-g4sb-delete-unit]'
        );
        const rect = button?.getBoundingClientRect();
        const style = button ? getComputedStyle(button) : null;
        return {
          text: button?.textContent.trim() || '',
          width: rect?.width || 0,
          height: rect?.height || 0,
          ratio: rect?.height ? rect.width / rect.height : 0,
          whiteSpace: style?.whiteSpace || '',
          borderRadius: style?.borderRadius || '',
          fits: Boolean(button && button.scrollWidth <= button.clientWidth &&
            button.scrollHeight <= button.clientHeight),
        };
      })() };
  })()`);
  assert(editing.isFixed === false && editing.draftOpen && editing.summary === 0 &&
    editing.visibleSummary === 0 && editing.readiness === "in_progress" &&
    editing.visibleReadiness === "in_progress" && editing.campaignStatus === "not_started" &&
    editing.occupied &&
    JSON.stringify(editing.ads) === JSON.stringify(setup.ads) &&
    JSON.stringify(editing.callouts) === JSON.stringify(setup.callouts) &&
    editing.button === "Зафиксировать группу" && editing.deleteVisible &&
    editing.deleteButtonUi.text === "Удалить группу" &&
    editing.deleteButtonUi.width >= 110 && editing.deleteButtonUi.height === 36 &&
    editing.deleteButtonUi.ratio >= 3 &&
    editing.deleteButtonUi.whiteSpace === "nowrap" &&
    editing.deleteButtonUi.borderRadius === "10px" && editing.deleteButtonUi.fits,
  `Editing state is wrong: ${JSON.stringify(editing)}`);
  await screenshot(".g4-group-save-controls", "../artifacts/gate4-search-group-editing-v410.png");

  await evaluate('document.querySelector("[data-g4sb-draft-save]").click(); true');
  await waitFor('document.querySelector("[data-g4sb-return-to-edit]")');
  const refixed = await evaluate(`(() => {
    const d = ensureGate4SearchBuild(${JSON.stringify(productId)});
    const group = d.groupRows[0];
    const explicit = { fixed: g4sbGroupIsFixed(group),
      summary: g4sbV405SummaryEntries(${JSON.stringify(productId)}, d).length };
    delete group.isFixed;
    const legacy = { fixed: g4sbGroupIsFixed(group),
      summary: g4sbV405SummaryEntries(${JSON.stringify(productId)}, d).length };
    group.isFixed = true;
    renderGate();
    return { explicit, legacy, count: d.groupRows.length };
  })()`);
  assert(refixed.count === 1 && refixed.explicit.fixed && refixed.explicit.summary === 1 &&
    refixed.legacy.fixed && refixed.legacy.summary === 1,
  `Legacy compatibility is wrong: ${JSON.stringify(refixed)}`);

  const parallelDraft = await evaluate(`(() => {
    const d = ensureGate4SearchBuild(${JSON.stringify(productId)});
    const group = d.groupRows[0];
    group.isFixed = true;
    const jtbd = g4sbV166DirectionJtbds(${JSON.stringify(productId)})
      .find((item) => item.key === ${JSON.stringify(setup.jtbdId)});
    const blank = { open: true, editingClusterId: '', ads: [{ ad0: '', ad1: '', ad2: '' }],
      callouts: ['', '', '', ''], minus: '', desiredLeads: '' };
    Object.assign(blank, { itemId: jtbd.itemId,
      segmentIndex: '__jtbd__', mainJtbdIndex: jtbd.index, jtbdId: jtbd.key,
      name: jtbd.text, searchIntent: jtbd.text,
      keywordRows: (group.demandRows || []).map(g4sbKeywordRow) });
    blank.autoSourceSignatureV390 = g4sbV390PhraseSignature(blank.keywordRows);
    d.jtbdDraftsV388[jtbd.key] = blank;
    d.clusterDraft = blank;
    d.openJtbdIdsV391 = [jtbd.key];
    d.activeJtbdId = jtbd.key;
    renderGate();
    return { editorVisible: Boolean(document.querySelector(
        '[data-g4sb-jtbd-id="${setup.jtbdId}"] .g4-v126-editor')),
      storedDraft: Boolean(d.jtbdDraftsV388[jtbd.key]),
      savedAds: structuredClone(d.adsRows[0]),
      savedCallouts: structuredClone(group.callouts) };
  })()`);
  assert(!parallelDraft.editorVisible && !parallelDraft.storedDraft &&
    JSON.stringify(parallelDraft.savedAds) === JSON.stringify(setup.ads) &&
    JSON.stringify(parallelDraft.savedCallouts) === JSON.stringify(setup.callouts),
  `Blank parallel draft was not removed safely: ${JSON.stringify(parallelDraft)}`);

  await evaluate('document.querySelector("[data-g4sb-return-to-edit]").click(); true');
  await waitFor('document.querySelector("[data-g4sb-draft-save]")');
  const restored = await evaluate(`(() => {
    const d = ensureGate4SearchBuild(${JSON.stringify(productId)});
    return { ads: structuredClone(d.clusterDraft.ads),
      callouts: structuredClone(d.clusterDraft.callouts),
      editingClusterId: d.clusterDraft.editingClusterId,
      isFixed: d.groupRows[0].isFixed };
  })()`);
  assert(restored.editingClusterId && restored.isFixed === false &&
    JSON.stringify(restored.ads) === JSON.stringify(setup.ads) &&
    JSON.stringify(restored.callouts) === JSON.stringify(setup.callouts),
  `Saved creatives were not restored: ${JSON.stringify(restored)}`);
  await screenshot(`.g4-v166-jtbd[data-g4sb-jtbd-id="${setup.jtbdId}"] .g4-v126-editor`,
    "../artifacts/gate4-search-group-creatives-restored-v420.png");

  console.log(JSON.stringify({ ok: true, jtbd: setup, initial,
    fixationViewportBefore, fixationViewportDrift, fixed, returnInteraction,
    editing, refixed,
    parallelDraft, restored,
    screenshots: [
      "artifacts/gate4-search-group-fixed-v410.png",
      "artifacts/gate4-search-group-editing-v410.png",
      "artifacts/gate4-search-group-creatives-restored-v420.png",
    ] }, null, 2));
} finally {
  page.close();
  await browser.call("Target.disposeBrowserContext", { browserContextId });
  browser.close();
}
