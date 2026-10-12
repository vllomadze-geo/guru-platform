import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";

// Runs only against a new headless browser profile and an in-memory copy of
// the historical export. No project or export file is written by this test.
const exportPath = process.env.GURU_GATE4_EXPORT || "/Users/vl/Downloads/gate-4.json";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3217/";
const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9347";
const goatId = "catalog-item-1786792591872-51f503";
const otherId = "catalog-item-1786792591872-98358d";
const source = JSON.parse(await readFile(exportPath, "utf8")).content;
const fixture = {
  project: Object.fromEntries([
    "name", "website", "catalogItemsV189", "productRegistryV185",
    "gate0ScopedValuesV194", "gate0ScopeUiV194", "megaMarketing",
  ].filter((key) => Object.hasOwn(source.project, key))
    .map((key) => [key, structuredClone(source.project[key])])),
  gate4SearchBuild: structuredClone(source.gate4SearchBuild),
};

class CdpClient {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.sequence = 0;
    this.pending = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
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

async function evaluate(page, expression) {
  const response = await page.call("Runtime.evaluate", {
    expression, returnByValue: true, awaitPromise: true,
  });
  if (response.exceptionDetails) throw new Error(
    response.exceptionDetails.exception?.description || response.exceptionDetails.text,
  );
  return response.result.value;
}

const browserVersion = await (await fetch(`http://127.0.0.1:${debugPort}/json/version`)).json();
const browser = new CdpClient(browserVersion.webSocketDebuggerUrl);
let page;
let targetId;
try {
  await browser.ready;
  ({ targetId } = await browser.call("Target.createTarget", { url: "about:blank" }));
  const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
  const target = targets.find((candidate) => candidate.id === targetId);
  assert.ok(target?.webSocketDebuggerUrl, "Chrome target missing");
  page = new CdpClient(target.webSocketDebuggerUrl);
  await page.ready;
  await page.call("Runtime.enable");
  await page.call("Page.enable");
  await page.call("Page.navigate", { url: appUrl });
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await evaluate(page, 'document.readyState === "complete" && typeof guruGate1UniqueDemandV267 === "function" && typeof guruGate4PhraseRowsV519 === "function"')) break;
    if (attempt === 99) throw new Error("App scripts did not load");
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  const result = await evaluate(page, `(() => {
    const fixture = ${JSON.stringify(fixture)};
    const projectId = "isolated-gate4-upstream-integration";
    const base = createFreshWorkspace({ id: projectId, name: "Integration smoke", website: fixture.project.website });
    state = base;
    activeProjectId = projectId;
    Object.assign(state.project, fixture.project, { id: projectId });
    state.gate4SearchBuild = fixture.gate4SearchBuild;
    const goat = guruV194Product(${JSON.stringify(goatId)}, state);
    const other = guruV194Product(${JSON.stringify(otherId)}, state);
    if (!goat || !other) throw new Error("Fixture catalog products not resolved by id");
    // This older export predates the Platform relations store. Seed the
    // catalog's saved category only in the isolated copy for Gate 1 rendering.
    const relations = megaPlatformCategoryStore(state);
    const legacyCategoryId = state.project.catalogItemsV189.find((entry) =>
      entry.id === goat.id)?.categoryId;
    relations.categoryIdsByProduct[goat.id] = [legacyCategoryId];
    const goatSourceBefore = JSON.stringify(state.gate4SearchBuild);
    const otherSourceBefore = JSON.stringify(state.project.catalogItemsV189);
    const itemData = {
      product_id: goat.id,
      demandRows: [{ kw: "символ 2027 года коза", originStage: "gate1", source: "historical-Gate-1", vol: "" }],
      semL2: [""], semL3: [""], semL3Groups: [{ mainQuery: "", keywords: [] }],
      semL4: [""], semL4Model: { mainJtbd: "", additionalJtbds: [] },
      segments: [],
    };
    const map = { product: "Дизайнерские подарки", items: { [goat.id]: itemData } };
    state.painV130 = { ...(state.painV130 || {}), productMaps: [map] };
    const normalized = pv181ItemData(map, goat.id);
    normalized.semL4Model.additionalJtbds.push({
      id: "existing-empty-jtbd", situation: "", desired_action: "", result: "",
    });
    guruGate1EnsureAdditionalJtbdsV268(normalized);
    const demandBefore = JSON.stringify(normalized.demandRows);
    const additionalBefore = JSON.stringify(normalized.semL4Model.additionalJtbds);
    const savedGate4 = guruGate4PhraseRowsV519(goat.id, state);
    const savedJtbds = guruGate4SavedJtbdsV520(goat.id, state);
    const otherGate4 = guruGate4PhraseRowsV519(other.id, state);
    const confirmed = new Set(guruGate1FinalConfirmedV259(goat).map((entry) => guruV247KeywordNormalize(entry.value)));
    const implementation = savedGate4.find((row) => !confirmed.has(guruV247KeywordNormalize(row.kw)));
    if (!implementation) throw new Error("Fixture has no Gate 4-only phrase");
    const uniqueGoat = guruGate1UniqueDemandV267(normalized);
    const uniqueOther = guruGate1UniqueDemandV267({ product_id: other.id, demandRows: [] });
    const gate1Html = pv181ItemHtml(0, { id: goat.id, name: goat.name, url: "" }, map, { direct: true });
    const wrapper = document.createElement("div");
    wrapper.innerHTML = gate1Html;
    const implementationText = wrapper.querySelector(".pv181-demand-implementation-rows-v263")?.textContent || "";
    const gate3Goat = g3ProductJourneySnapshot(goat);
    const gate3Other = g3ProductJourneySnapshot(other);
    const gate4Goat = g4CampaignContext(goat.id);
    const gate4Other = g4CampaignContext(other.id);
    const gate3ForCampaign = g4Gate3ProductContext(goat.id);
    const savedBuckets = Object.fromEntries(savedJtbds.descriptors.map((jtbd) =>
      [jtbd.id, savedGate4.filter((row) =>
        row._gate4JtbdIdV519 === jtbd.id &&
        guruGate1JtbdBucketV274(goat.id, normalized,
          uniqueGoat.find((entry) => entry.key === guruV247KeywordNormalize(row.kw))) ===
          (jtbd.id === "primary:" + goat.id ? "primary" : "additional:" + jtbd.id),
      ).length],
    ));
    const gate4Choices = g4sbItemJtbdList(goat.id, goat.id);
    const savedGroupResolution = savedJtbds.descriptors.map((jtbd) => ({
      id: jtbd.id,
      resolved: guruGate4SavedGroupsV519(goat.id, state)
        .filter((group) => group.jtbdId === jtbd.id)
        .every((group) => g4sbV386GroupJtbd(goat.id, group)?.id === jtbd.id),
    }));
    // A legacy empty Gate 1 form may already carry the saved Gate 4 JTBD id.
    // It must keep its editable fields while the saved phrases render once.
    const sharedJtbd = savedJtbds.descriptors.find((entry) =>
      entry.id.startsWith("additional-jtbd-"));
    const sharedItem = structuredClone(normalized);
    sharedItem.semL4Model.additionalJtbds = [{
      id: sharedJtbd.id, situation: "", desired_action: "", result: "",
    }];
    const sharedContainer = document.createElement("div");
    sharedContainer.innerHTML = guruGate1AdditionalJtbdsHtmlV268(
      0, goat.id, sharedItem);
    const sharedPanels = [...sharedContainer.querySelectorAll(
      '[data-pv181-additional-jtbd-keywords-v274]')].filter((element) =>
      element.dataset.pv181AdditionalJtbdKeywordsV274 === sharedJtbd.id);
    const sharedRecoveredCards = [...sharedContainer.querySelectorAll(
      '[data-gate1-saved-jtbd-v520]')].filter((element) =>
      element.dataset.gate1SavedJtbdV520 === sharedJtbd.id);
    const foundation = guruStrategicFoundationModelV286(goat);
    return {
      savedPhrases: savedGate4.length,
      otherSavedPhrases: otherGate4.length,
      confirmedPhrases: confirmed.size,
      uniqueGate1: uniqueGoat.length,
      gate4OnlyPhrase: implementation.kw,
      gate4OnlyInGate1: uniqueGoat.some((entry) => guruV247KeywordNormalize(entry.value) === guruV247KeywordNormalize(implementation.kw)),
      gate4OnlyInGate1Ui: implementationText.includes(implementation.kw),
      gate4OnlyInGate3: gate3Goat.queries.includes(implementation.kw),
      gate4OnlyInGate4Context: gate4Goat.queries.includes(implementation.kw),
      gate1MetricFilled: uniqueGoat.find((entry) => guruV247KeywordNormalize(entry.value) === guruV247KeywordNormalize("символ 2027 года коза"))?.row?.vol,
      savedJtbdBuckets: savedBuckets,
      savedJtbdIds: savedJtbds.descriptors.map((jtbd) => jtbd.id),
      savedJtbdConflicts: savedJtbds.conflicts,
      gate4ChoiceIds: gate4Choices.map((jtbd) => jtbd.id),
      savedGroupResolution,
      sharedJtbdPhrasePanels: sharedPanels.length,
      sharedJtbdRecoveredCards: sharedRecoveredCards.length,
      sharedJtbdPhraseRows: sharedPanels[0]?.querySelectorAll(
        '[data-pv181-additional-jtbd-demand-row-v274]').length || 0,
      sharedJtbdSourcePhraseCount: sharedJtbd.phrases.length,
      sharedJtbdCountLabel: sharedContainer.querySelector(
        '.pv181-keyword-list-title')?.textContent?.trim() || "",
      gate1RecoveredCards: wrapper.querySelectorAll("[data-gate1-saved-jtbd-v520]").length,
      gate1EditableAdditionalCards: wrapper.querySelectorAll("[data-pv181-jtbd-part-v268]").length,
      selectedContextKeepsBlank: guruGate1FinalPainContextV259(goat, false)
        ?.itemData?.semL4Model?.additionalJtbds?.some((entry) =>
          entry.id === "existing-empty-jtbd"),
      gate0RecoveredDescriptors: foundation.descriptors.filter((jtbd) =>
        jtbd.savedFromGate4).length,
      gate4MetricSource: savedGate4.find((row) => guruV247KeywordNormalize(row.kw) === guruV247KeywordNormalize("символ 2027 года коза"))?.vol,
      otherHasGoatPhraseInGate1: uniqueOther.some((entry) => guruV247KeywordNormalize(entry.value) === guruV247KeywordNormalize(implementation.kw)),
      otherHasGoatPhraseInGate3: gate3Other.queries.includes(implementation.kw),
      otherHasGoatPhraseInGate4: gate4Other.queries.includes(implementation.kw),
      campaignProductId: gate4Goat.product,
      otherCampaignProductId: gate4Other.product,
      campaignJtbd: gate4Goat.jtbd,
      otherCampaignJtbd: gate4Other.jtbd,
      campaignGate3Stages: gate3ForCampaign.stageStatuses,
      campaignGate3Route: gate3ForCampaign.route,
      gate4SourceUnchanged: JSON.stringify(state.gate4SearchBuild) === goatSourceBefore,
      catalogSourceUnchanged: JSON.stringify(state.project.catalogItemsV189) === otherSourceBefore,
      gate1DemandUnchanged: JSON.stringify(normalized.demandRows) === demandBefore,
      gate1AdditionalUnchanged: JSON.stringify(normalized.semL4Model.additionalJtbds) === additionalBefore,
      gate1BlankFormPreserved: normalized.semL4Model.additionalJtbds.some((entry) =>
        entry.id === "existing-empty-jtbd"),
      sourceMetadataUnchanged: normalized.demandRows[0].source === "historical-Gate-1",
    };
  })()`);

  assert.equal(result.savedPhrases, 83, "the saved Gate 4 goat branch should expose 83 phrases");
  assert.equal(result.otherSavedPhrases, 0, "unrelated item should have no Gate 4 phrases");
  assert.ok(result.gate4OnlyInGate1, "Gate 1 keyword projection lost Gate 4-only phrase");
  assert.ok(result.gate4OnlyInGate1Ui, "Gate 1 demand UI lost Gate 4-only phrase");
  assert.ok(result.gate4OnlyInGate3, "Gate 3 snapshot lost Gate 4-only phrase");
  assert.ok(result.gate4OnlyInGate4Context, "Gate 4 context lost saved phrase");
  assert.equal(result.gate1MetricFilled, result.gate4MetricSource,
    "Gate 1 display copy did not receive saved Gate 4 metric");
  assert.deepEqual(Object.values(result.savedJtbdBuckets).sort((a, b) => a - b),
    [26, 27, 30], "saved Gate 4 phrases must keep their exact JTBD group ids");
  assert.deepEqual(result.savedJtbdIds.slice().sort(), [
    "additional-jtbd-1788609074828-88a3f1",
    "additional-jtbd-1788615285799-9a35ef",
    `primary:${goatId}`,
  ].sort(), "historical Gate 4 JTBD IDs must be preserved exactly");
  assert.equal(result.savedJtbdConflicts.length, 2,
    "two saved phrase-level JTBD conflicts must remain visible for review");
  assert.deepEqual(result.savedJtbdConflicts.map((conflict) => [
    conflict.phrase, conflict.rowJtbdId,
  ]).sort((a, b) => a[0].localeCompare(b[0])), [
    ["купить козу Москва", "additional-jtbd-1788609074828-88a3f1"],
    ["новогодняя игрушка коза", "additional-jtbd-1788615285799-9a35ef"],
  ], "conflicting row-level JTBD IDs must not be silently reassigned");
  assert.equal(result.gate1RecoveredCards, 2,
    "Gate 1 must show the two saved additional JTBDs without replacing the empty form");
  assert.equal(result.sharedJtbdPhrasePanels, 1,
    "an empty Gate 1 form sharing a saved JTBD id must have one phrase panel");
  assert.equal(result.sharedJtbdRecoveredCards, 1,
    "a shared JTBD id must have one recovered source card, not duplicate cards");
  assert.equal(result.sharedJtbdPhraseRows, result.sharedJtbdSourcePhraseCount,
    "the shared JTBD panel must show each saved phrase exactly once");
  assert.equal(result.sharedJtbdCountLabel, "Дополнительные JTBD · 2 из 3",
    "the additional JTBD count must use unique ids, including a shared form id");
  assert.equal(result.gate1EditableAdditionalCards, 3,
    "the existing blank Gate 1 JTBD form must remain editable");
  assert.equal(result.selectedContextKeepsBlank, true,
    "product_id lookup must prefer the populated Gate 1 card over another category's stub");
  assert.equal(result.gate0RecoveredDescriptors, 2,
    "Gate 0 strategic foundation must show the saved additional JTBDs");
  assert.ok(result.savedJtbdIds.every((id) => result.gate4ChoiceIds.includes(id)),
    "Gate 4 must offer all saved JTBD ids");
  assert.ok(result.savedGroupResolution.every((entry) => entry.resolved),
    "saved groups must resolve to their original JTBD ids");
  assert.equal(result.otherHasGoatPhraseInGate1, false);
  assert.equal(result.otherHasGoatPhraseInGate3, false);
  assert.equal(result.otherHasGoatPhraseInGate4, false);
  assert.equal(result.campaignProductId, goatId);
  assert.equal(result.otherCampaignProductId, otherId);
  assert.ok(result.campaignJtbd, "Gate 0 scoped product JTBD should reach Gate 4 by id");
  assert.notEqual(result.campaignJtbd, result.otherCampaignJtbd,
    "unrelated product should not inherit goat JTBD");
  assert.ok(result.campaignGate3Stages.includes("Aware"),
    "Gate 4 should read the selected product's Gate 3 stages by id");
  assert.ok(result.campaignGate3Route.includes("Особенный новогодний подарок"),
    "Gate 4 should read the selected product's Gate 3 route by id");
  assert.equal(result.gate4SourceUnchanged, true);
  assert.equal(result.catalogSourceUnchanged, true);
  assert.equal(result.gate1DemandUnchanged, true);
  assert.equal(result.gate1AdditionalUnchanged, true);
  assert.equal(result.gate1BlankFormPreserved, true);
  assert.equal(result.sourceMetadataUnchanged, true);
  if (process.env.GURU_JTBD_SCREENSHOT) {
    await page.call("Emulation.setDeviceMetricsOverride", {
      width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false,
    });
    await evaluate(page, `(() => {
      const product = guruV194Product(${JSON.stringify(goatId)}, state);
      const context = guruGate1FinalPainContextV259(product, false);
      const itemData = pv181ItemData(context.row, product.id);
      const level = { title: "Уровень 2 — Основной и дополнительные JTBD", hints: [] };
      const coverage = document.createElement("div");
      coverage.innerHTML = g4sbSegmentCoverageHtml(
        product.id, ensureGate4SearchBuild(product.id));
      const savedGroupList = coverage.querySelector(".g4-v166-jtbd-list");
      if (!savedGroupList) throw new Error("Saved Gate 4 JTBD groups did not render");
      document.body.innerHTML = '<main style="max-width:1500px;margin:24px auto;padding:24px;background:white">' +
        '<h1>Проверка JTBD на копии экспорта Gate 4 · 22.09</h1>' +
        guruStrategicFoundationHtmlV237(product) +
        '<h2>Gate 1 · JTBD товара</h2>' +
        pv181JtbdModelHtml(context.mapIndex, product.id, itemData, level) +
        '<h2>Gate 4 · сохранённые группы и связи JTBD</h2>' +
        savedGroupList.outerHTML + '</main>';
      document.querySelectorAll(".g4-v166-jtbd-list > details").forEach(
        (details) => { details.open = true; });
      return true;
    })()`);
    const shot = await page.call("Page.captureScreenshot", {
      format: "png", captureBeyondViewport: true,
    });
    await writeFile(process.env.GURU_JTBD_SCREENSHOT,
      Buffer.from(shot.data, "base64"));
  }
  console.log(JSON.stringify({ ...result, export: exportPath, inMemoryCopy: true }, null, 2));
} finally {
  page?.close();
  if (targetId) await browser.call("Target.closeTarget", { targetId }).catch(() => {});
  browser.close();
}
