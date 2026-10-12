import { readFile, writeFile } from "node:fs/promises";

const port = process.env.GURU_CHROME_DEBUG_PORT || "9395";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const projectExportPath = process.env.GURU_PROJECT_EXPORT || "/Users/vl/Downloads/guru-project-korichnoe-yabloko-all.json";
const gate4ExportPath = process.env.GURU_GATE4_EXPORT || "/Users/vl/Downloads/gate-4.json";
const goatId = "catalog-item-1786792591872-51f503";
const shirtId = "catalog-item-1786792591872-c8b1e9";
const smokeId = "gate4-search-gate1-product-source-smoke";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.sequence = 0;
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
      const id = ++this.sequence;
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.socket.close(); }
}

const fullExport = JSON.parse(await readFile(projectExportPath, "utf8"));
const gate4Export = JSON.parse(await readFile(gate4ExportPath, "utf8"));
assert(fullExport.project?.id === gate4Export.project?.id, "Exports belong to different projects");
const fixture = fullExport.workspace;
fixture.project.id = smokeId;
fixture.gate4SearchBuild = structuredClone(gate4Export.content.gate4SearchBuild);
const products = fixture.project.catalogItemsV189 || [];
const goat = products.find((row) => row.id === goatId);
const shirt = products.find((row) => row.id === shirtId);
assert(goat && shirt, "Both source products must exist");

const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
const browser = new Cdp(version.webSocketDebuggerUrl);
await browser.ready;
const { browserContextId } = await browser.call("Target.createBrowserContext");
const { targetId } = await browser.call("Target.createTarget", { url: "about:blank", browserContextId });
const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const target = targets.find((row) => row.id === targetId);
assert(target?.webSocketDebuggerUrl, "Isolated tab missing");
const page = new Cdp(target.webSocketDebuggerUrl);
await page.ready;

async function evaluate(expression) {
  const response = await page.call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (response.exceptionDetails)
    throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
  return response.result.value;
}

async function waitFor(expression) {
  for (let step = 0; step < 180; step += 1) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await wait(100);
  }
  throw new Error(`Timed out: ${expression}`);
}

async function snapshot(label, phrase) {
  return evaluate(`(() => {
    const id = guruV194SelectedProduct(state)?.id || "";
    const d = ensureGate4SearchBuild(id);
    const rows = g4sbV128SourcePhraseRows(id, d.clusterDraft);
    const selected = rows.find((row) => guruV247KeywordNormalize(row.kw) === guruV247KeywordNormalize(${JSON.stringify(phrase)}));
    const { itemData } = g4sbV385ProductSource(id);
    const gate1GroupEntries = g4sbItemJtbdList(id, id).flatMap((jtbd) =>
      guruGate1GroupFinalEntriesV279(
        jtbd.id === 'primary:' + id ? 'primary' : 'additional',
        jtbd.id === 'primary:' + id ? '' : jtbd.id, id, itemData));
    const gate1Entry = [...gate1GroupEntries,
      ...guruGate1FinalExportEntriesV279(guruV194Product(id, state))]
      .find((entry) => guruV247KeywordNormalize(entry?.demandRow?.kw) ===
        guruV247KeywordNormalize(${JSON.stringify(phrase)}));
    const gate1Row = gate1Entry ? g4sbKeywordRow(gate1Entry.demandRow) : null;
    const controls = [...document.querySelectorAll('[data-g4sb-bank-phrase-field]')]
      .filter((node) => guruV247KeywordNormalize(node.dataset.g4sbBankPhrase) === guruV247KeywordNormalize(${JSON.stringify(phrase)}));
    return {
      label: ${JSON.stringify(label)}, selectedProductId: id,
      selectorProductId: document.querySelector('[data-gate0-scope-product-select="gate4-launch"]')?.value || "",
      searchProductIds: [...new Set([...document.querySelectorAll('[data-g4sb-product]')].map((node) => node.dataset.g4sbProduct))],
      sourceRows: rows.length, phrase: selected?.kw || "",
      model: selected ? { vol: selected.vol, clicks: selected.forecastClicks, budget: selected.forecastBudget } : null,
      gate1: gate1Row ? { vol: gate1Row.vol, clicks: gate1Row.forecastClicks,
        budget: gate1Row.forecastBudget } : null,
      fields: Object.fromEntries(controls.map((node) => [node.dataset.g4sbBankPhraseField, node.value])),
      placeholders: Object.fromEntries(controls.map((node) => [node.dataset.g4sbBankPhraseField, node.placeholder])),
      sectionTitles: [...document.querySelectorAll('.g4-v126-editor .g4-upstream-title')].map((node) => node.textContent.trim()),
      groupCount: d.groupRows.length,
      savedPhraseCount: d.groupRows[0]?.demandRows?.length || 0,
    };
  })()`);
}

async function captureTable(file) {
  await page.call("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
  const clip = await evaluate(`(() => {
    const table = document.querySelector('.g4-v128-selector:not(.g4-v150-excluded-table)');
    if (!table) return null;
    table.scrollIntoView({ block: 'start' });
    const rect = table.getBoundingClientRect();
    return { x: Math.max(0, rect.x + scrollX - 10), y: Math.max(0, rect.y + scrollY - 55),
      width: Math.min(rect.width + 20, 1400), height: Math.min(rect.height + 75, 950), scale: 1 };
  })()`);
  assert(clip, "Search phrase table missing for screenshot");
  await wait(150);
  const result = await page.call("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip });
  await writeFile(new URL(`../artifacts/${file}`, import.meta.url), Buffer.from(result.data, "base64"));
}

try {
  await page.call("Runtime.enable");
  await page.call("Page.enable");
  await page.call("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
  await page.call("Page.addScriptToEvaluateOnNewDocument", { source: `{
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (input, init) => String(input).includes("/api/")
      ? Promise.resolve(new Response(JSON.stringify({ ok: true, isolatedSmoke: true }), {
          status: 200, headers: { "Content-Type": "application/json" }
        })) : nativeFetch(input, init);
  }` });
  await page.call("Page.navigate", { url: appUrl });
  await waitFor('document.readyState === "complete"');
  await waitFor('Boolean(window.GURU_SEED)');
  await evaluate(`(() => {
    const workspace = structuredClone(window.GURU_SEED);
    workspace.project.id = ${JSON.stringify(smokeId)};
    workspace.project.name = "Gate 4 Search product source smoke";
    localStorage.clear();
    localStorage.setItem("guru-platform-access-v01", "unlocked");
    localStorage.setItem("guru-platform-projects-v02", JSON.stringify([{
      id: workspace.project.id, name: workspace.project.name, lifecycleStatus: "active",
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }]));
    localStorage.setItem("guru-platform-workspace-v02-" + workspace.project.id, JSON.stringify(workspace));
    location.reload();
    return true;
  })()`);
  await waitFor('document.querySelector("[data-open-project]")');
  await evaluate('document.querySelector("[data-open-project]").click(); true');
  await waitFor('Boolean(state) && typeof g4sbV385ProductSource === "function"');

  await evaluate(`(() => {
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};
    state = ${JSON.stringify(fixture)};
    activeProjectId = ${JSON.stringify(smokeId)};
    const ui = guruV194Ui(state);
    ui.selectedCategoryId = ${JSON.stringify(goat.categoryId)};
    ui.selectedProductId = ${JSON.stringify(goatId)};
    const channels = g4LaunchChannels().filter(g4IsYandexSearchChannel);
    channels.forEach((channel) => {
      g4EnsureLaunchUiState().rows[g4CampaignStateKey(${JSON.stringify(goatId)}, channel.key)] = true;
      g4EnsureLaunchUiState().rows[g4CampaignStateKey(${JSON.stringify(shirtId)}, channel.key)] = true;
    });
    guruNavigateToGate("gate-4");
    return { channels: channels.length };
  })()`);
  await waitFor(`document.querySelector('[data-gate0-scope-product-select="gate4-launch"]')?.value === ${JSON.stringify(goatId)}`);
  await waitFor(`document.querySelectorAll('[data-g4sb-bank-phrase-field]').length > 0`);

  const goatStart = await snapshot("goat", "символ 2027 года коза");
  assert(goatStart.selectedProductId === goatId && goatStart.selectorProductId === goatId, "Goat selector mismatch");
  assert(goatStart.model?.vol === "206" && goatStart.model?.clicks === "7" && goatStart.model?.budget === "148.40",
    `Goat Gate 1 metrics mismatch: ${JSON.stringify(goatStart)}`);
  assert(goatStart.fields.vol === "206" && goatStart.fields.forecastClicks === "7" && goatStart.fields.forecastBudget === "148.40",
    `Goat DOM metrics mismatch: ${JSON.stringify(goatStart)}`);
  await captureTable("gate4-search-goat-gate1-v385.png");

  await evaluate(`(() => {
    const category = document.querySelector('[data-gate0-scope-category-select="gate4-launch"]');
    category.value = ${JSON.stringify(shirt.categoryId)};
    category.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  })()`);
  await waitFor(`document.querySelector('[data-gate0-scope-category-select="gate4-launch"]')?.value === ${JSON.stringify(shirt.categoryId)}`);
  await evaluate(`(() => {
    const product = document.querySelector('[data-gate0-scope-product-select="gate4-launch"]');
    product.value = ${JSON.stringify(shirtId)};
    product.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  })()`);
  await waitFor(`guruV194SelectedProduct(state)?.id === ${JSON.stringify(shirtId)}`);
  await waitFor(`document.querySelector('[data-gate0-scope-product-select="gate4-launch"]')?.value === ${JSON.stringify(shirtId)}`);
  await evaluate(`(() => {
    const edit = document.querySelector('[data-g4sb-product="${shirtId}"][data-g4sb-edit-group]');
    if (!edit) throw new Error("Existing shirt group edit button missing");
    edit.click();
    return true;
  })()`);
  await waitFor(`document.querySelectorAll('[data-g4sb-bank-phrase-field]').length > 0`);
  const shirtLegacy = await snapshot("shirt-legacy", "рубашка женская с кружевом");
  assert(shirtLegacy.selectedProductId === shirtId && shirtLegacy.selectorProductId === shirtId, "Shirt selector mismatch");
  assert(JSON.stringify(shirtLegacy.model) === JSON.stringify(shirtLegacy.gate1),
    `Shirt legacy metrics differ from Gate 1: ${JSON.stringify(shirtLegacy)}`);
  assert(shirtLegacy.fields.vol === shirtLegacy.gate1?.vol &&
    shirtLegacy.fields.forecastClicks === shirtLegacy.gate1?.clicks &&
    shirtLegacy.fields.forecastBudget === shirtLegacy.gate1?.budget,
    `Shirt legacy DOM metrics differ from Gate 1: ${JSON.stringify(shirtLegacy)}`);
  assert(Object.values(shirtLegacy.placeholders).every((value) => value === ""),
    `Empty Shirt metrics still display a zero placeholder: ${JSON.stringify(shirtLegacy)}`);
  assert(shirtLegacy.savedPhraseCount === 27, "Existing Shirt group phrases were lost");
  const shirtConfirmedPhrase = await evaluate(`guruGate1FinalConfirmedV259(guruV194Product(${JSON.stringify(shirtId)}, state))[0]?.value || ""`);
  const shirtConfirmed = await snapshot("shirt-confirmed", shirtConfirmedPhrase);
  assert(JSON.stringify(shirtConfirmed.model) === JSON.stringify(shirtConfirmed.gate1),
    `Shirt confirmed metrics differ from Gate 1: ${JSON.stringify(shirtConfirmed)}`);
  assert(shirtConfirmed.fields.vol === shirtConfirmed.gate1?.vol &&
    shirtConfirmed.fields.forecastClicks === shirtConfirmed.gate1?.clicks &&
    shirtConfirmed.fields.forecastBudget === shirtConfirmed.gate1?.budget,
    `Shirt confirmed DOM metrics differ from Gate 1: ${JSON.stringify(shirtConfirmed)}`);
  assert(!shirtConfirmed.searchProductIds.includes(goatId), "Goat Search controls leaked into shirt view");
  const shirtGoatPhrase = await snapshot("shirt-goat-phrase", "символ 2027 года коза");
  assert(shirtGoatPhrase.model === null && Object.keys(shirtGoatPhrase.fields).length === 0,
    "Goat phrase leaked into Shirt Search bank");
  await captureTable("gate4-search-shirt-gate1-v385.png");

  await evaluate(`(() => {
    const category = document.querySelector('[data-gate0-scope-category-select="gate4-launch"]');
    category.value = ${JSON.stringify(goat.categoryId)};
    category.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  })()`);
  await waitFor(`guruV194SelectedProduct(state)?.id === ${JSON.stringify(goatId)}`);
  const goatReturn = await snapshot("goat-return", "символ 2027 года коза");
  assert(goatReturn.model?.vol === "206" && goatReturn.model?.clicks === "7" && goatReturn.model?.budget === "148.40",
    "Goat metrics changed after product switch");
  assert(!goatReturn.searchProductIds.includes(shirtId), "Shirt Search controls leaked into goat view");
  const goatShirtPhrase = await snapshot("goat-shirt-phrase", "рубашка женская с кружевом");
  assert(goatShirtPhrase.model === null && Object.keys(goatShirtPhrase.fields).length === 0,
    "Shirt phrase leaked into Goat Search bank");
  assert(shirtLegacy.groupCount === 1 && goatReturn.groupCount === 0, "Search groups mixed across products");

  process.stdout.write(JSON.stringify({ ok: true, projectExportedAt: fullExport.exportedAt,
    gate4ExportedAt: gate4Export.exportedAt, goatStart, shirtLegacy, shirtConfirmed, goatReturn,
    screenshots: ["artifacts/gate4-search-goat-gate1-v385.png", "artifacts/gate4-search-shirt-gate1-v385.png"] }, null, 2) + "\n");
} finally {
  page.close();
  await browser.call("Target.disposeBrowserContext", { browserContextId });
  browser.close();
}
