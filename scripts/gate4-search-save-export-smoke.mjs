import { readFile, writeFile } from "node:fs/promises";

const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9395";
const fullPath = process.env.GURU_PROJECT_EXPORT || "/Users/vl/Downloads/guru-project-korichnoe-yabloko-all.json";
const gate4Path = process.env.GURU_GATE4_EXPORT || "/Users/vl/Downloads/gate-4.json";
const goatId = "catalog-item-1786792591872-51f503";
const diagnose = process.argv.includes("--diagnose");
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
assert(gateIndex >= 0 && gate4Export.structure?.id === "gate-4", "Gate 4 structure missing");
fixture.gates[gateIndex] = structuredClone(gate4Export.structure);
fixture.gate5 = {};
const product = fixture.project.catalogItemsV189.find((item) => item.id === goatId);
assert(product, "Goat product missing from project export");
const projectId = fixture.project.id;

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
  for (let i = 0; i < 180; i += 1) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await pause(100);
  }
  throw new Error(`Timed out: ${expression}`);
}

try {
  await page.call("Runtime.enable");
  await page.call("Page.enable");
  await page.call("Emulation.setDeviceMetricsOverride", {
    width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false,
  });
  await page.call("Page.addScriptToEvaluateOnNewDocument", { source: `{
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
    workspace.project.id = ${JSON.stringify(projectId)};
    workspace.project.name = ${JSON.stringify(fixture.project.name)};
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
  await waitFor('Boolean(state) && typeof g4sbSaveClusterDraft === "function"');
  const before = await evaluate(`(() => {
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};
    state = ${JSON.stringify(fixture)};
    activeProjectId = ${JSON.stringify(projectId)};
    const ui = guruV194Ui(state);
    ui.selectedCategoryId = ${JSON.stringify(product.categoryId)};
    ui.selectedProductId = ${JSON.stringify(goatId)};
    const channel = g4LaunchChannels().find(g4IsYandexSearchChannel);
    g4EnsureLaunchUiState().rows[g4CampaignStateKey(${JSON.stringify(goatId)}, channel.key)] = true;
    const d = ensureGate4SearchBuild(${JSON.stringify(goatId)});
    const jtbds = g4sbV166DirectionJtbds(${JSON.stringify(goatId)});
    d.openJtbdIdsV391 = jtbds.map((jtbd) => jtbd.key);
    d.activeJtbdId = jtbds[0]?.key || '';
    const sourceComparisons = ${diagnose} ? jtbds.map((jtbd) => {
      const draft = d.jtbdDraftsV388?.[jtbd.key];
      const source = new Map(g4sbV128SourcePhraseRows(${JSON.stringify(goatId)}, draft)
        .map((row) => [g4sbV128PhraseKey(row.kw), row]));
      const differences = (draft?.keywordRows || []).flatMap((row) => {
        const match = source.get(g4sbV128PhraseKey(row.kw));
        if (!match) return [];
        return ['vol', 'forecastClicks', 'forecastBudget'].flatMap((field) =>
          String(row[field] ?? '') === String(match[field] ?? '') ? [] :
            [{ phrase: row.kw, field, draft: row[field], gate1: match[field] }]);
      });
      return { id: jtbd.key, differences: differences.slice(0, 12), differenceCount: differences.length };
    }) : [];
    guruNavigateToGate('gate-4');
    return { saved: d.groupRows.length, clusters: d.clusters.length,
      sourceComparisons,
      drafts: jtbds.map((jtbd) => ({ id: jtbd.key,
        phrases: d.jtbdDraftsV388?.[jtbd.key]?.keywordRows?.length || 0,
        budget: d.jtbdDraftsV388?.[jtbd.key]?.col4 || '',
        callouts: (d.jtbdDraftsV388?.[jtbd.key]?.callouts || []).filter(Boolean).length })) };
  })()`);
  await waitFor('document.querySelectorAll(".g4-v166-jtbd[data-g4sb-jtbd-id]").length === 3');
  const attempts = [];
  for (const draft of before.drafts) {
    const attempt = await evaluate(`(() => {
      const id = ${JSON.stringify(draft.id)};
      const card = [...document.querySelectorAll('.g4-v166-jtbd[data-g4sb-jtbd-id]')]
        .find((item) => item.dataset.g4sbJtbdId === id);
      const button = card?.querySelector('[data-g4sb-draft-save]');
      const pre = { button: button?.textContent?.trim() || '', disabled: Boolean(button?.disabled) };
      if (button && !button.disabled) button.click();
      const d = ensureGate4SearchBuild(${JSON.stringify(goatId)});
      const savedGroup = d.groupRows.find((row) => row.jtbdId === id);
      return { id, ...pre, error: d.jtbdDraftsV388?.[id]?.validationError || '',
        saved: Boolean(savedGroup), savedPhrases: savedGroup?.demandRows?.length || 0,
        savedBudget: savedGroup?.col4 || '', groups: d.groupRows.length,
        clusters: d.clusters.length };
    })()`);
    attempts.push(attempt);
  }
  if (!diagnose) {
    assert(before.saved === 0 && before.clusters === 0, "Input export unexpectedly has saved groups");
    assert(attempts.every((item) => item.saved), `Group save failed: ${JSON.stringify(attempts)}`);
    const exported = await evaluate(`(() => {
      saveState();
      return JSON.stringify(guruGateContentPayloadV120('gate-4'));
    })()`);
    const payload = JSON.parse(exported);
    const key = Object.keys(payload.content.gate4SearchBuild).find((item) => item.includes("51f503"));
    const build = payload.content.gate4SearchBuild[key];
    assert(build.groupRows.length === 3 && build.clusters.length === 3,
      `Export has wrong group count: ${build.groupRows.length}/${build.clusters.length}`);
    assert(build.groupRows.every((row) => row.demandRows?.length && row.col4),
      "Export lost phrases or budget");
    assert(JSON.stringify(build.groupRows.map((row) => [
      row.demandRows.length, row.col3, row.col4,
    ])) === JSON.stringify([
      [28, "206", "10431"], [28, "242", "7397.5"], [27, "91", "2220.3"],
    ]), "Export changed the source phrases, clicks or budgets");
    const output = new URL("../artifacts/gate-4-recovered-groups-v408.json", import.meta.url);
    await writeFile(output, JSON.stringify(payload, null, 2));
    const savedState = await evaluate(`(() => {
      const stored = JSON.parse(localStorage.getItem('guru-platform-workspace-v02-' + ${JSON.stringify(projectId)}));
      const build = Object.values(stored.gate4SearchBuild || {})
        .find((item) => item.groupRows?.some((row) => row.jtbdId?.includes('51f503')));
      return { groups: build?.groupRows?.length || 0, clusters: build?.clusters?.length || 0 };
    })()`);
    assert(savedState.groups === 3 && savedState.clusters === 3,
      `Local save missing groups: ${JSON.stringify(savedState)}`);
    console.log(JSON.stringify({ ok: true, before, attempts, savedState,
      exportedAt: payload.exportedAt, exportFile: output.pathname,
      groups: build.groupRows.map((row) => ({ jtbdId: row.jtbdId,
        phrases: row.demandRows.length, impressions: row.col2,
        clicks: row.col3, budget: row.col4, callouts: row.callouts?.length || 0 })) }, null, 2));
  } else {
    console.log(JSON.stringify({ diagnostic: true, before, attempts }, null, 2));
  }
} finally {
  page.close();
  await browser.call("Target.disposeBrowserContext", { browserContextId });
  browser.close();
}
