import { readFile } from "node:fs/promises";

const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9335";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const goatId = "catalog-item-1786792591872-51f503";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

  close() {
    this.socket.close();
  }
}

const gate0Export = JSON.parse(await readFile("/Users/vl/Downloads/gate-0.json", "utf8"));
const gate1Export = JSON.parse(await readFile("/Users/vl/Downloads/gate-1.json", "utf8"));
const gate2Export = JSON.parse(await readFile("/Users/vl/Downloads/gate-2.json", "utf8"));
const gate4Export = JSON.parse(await readFile("/Users/vl/Downloads/gate-4.json", "utf8"));
const sourceProduct = gate1Export.content.project.catalogItemsV189.find(
  (item) => item.id === goatId,
);
const sourcePageCard = gate1Export.gate.cards.find((card) =>
  (card.pageRows || []).some((row) => row.catalogItemIdV189 === goatId),
);
const sourcePage = sourcePageCard.pageRows.find(
  (row) => row.catalogItemIdV189 === goatId,
);
const sourceMap = gate1Export.content.painV130.productMaps.find(
  (map) => map.items?.[goatId],
);
const sourceMega = gate0Export.gate.cards.find((card) => card.megaMarketing);
const sourceGate2Cards = gate2Export.gate.cards.filter((card) =>
  ["card-92", "card-93", "card-122", "card-123", "card-124", "card-126"].includes(card.id),
);
const fixture = {
  project: {
    productRegistryV185: gate1Export.content.project.productRegistryV185,
    catalogItemsV189: gate1Export.content.project.catalogItemsV189,
    gate0ScopedValuesV194: gate1Export.content.project.gate0ScopedValuesV194,
    keywordFoundationV247: gate1Export.content.project.keywordFoundationV247,
  },
  mega: sourceMega.megaMarketing,
  megaId: sourceMega.id,
  pageCardId: sourcePageCard.id,
  page: sourcePage,
  painMap: sourceMap,
  comparison: gate1Export.content.projectComparison,
  gate2Cards: sourceGate2Cards,
  gate4Production: gate4Export.content.gate4Production,
  gate4Rsya: gate4Export.content.gate4Rsya,
};

const browserVersion = await (
  await fetch(`http://127.0.0.1:${debugPort}/json/version`)
).json();
const browser = new CdpClient(browserVersion.webSocketDebuggerUrl);
await browser.ready;
const { browserContextId } = await browser.call("Target.createBrowserContext");
const { targetId } = await browser.call("Target.createTarget", {
  url: "about:blank",
  browserContextId,
});
const targets = await (
  await fetch(`http://127.0.0.1:${debugPort}/json`)
).json();
const pageTarget = targets.find((target) => target.id === targetId);
const page = new CdpClient(pageTarget.webSocketDebuggerUrl);
await page.ready;

async function evaluate(expression) {
  const response = await page.call("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (response.exceptionDetails)
    throw new Error(
      response.exceptionDetails.exception?.description ||
        response.exceptionDetails.text,
    );
  return response.result.value;
}

async function waitFor(expression, timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await wait(100);
  }
  throw new Error(`Timed out waiting for ${expression}`);
}

try {
  await page.call("Runtime.enable");
  await page.call("Page.enable");
  await page.call("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1200,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await page.call("Page.addScriptToEvaluateOnNewDocument", {
    source: `{
      const nativeFetch = window.fetch.bind(window);
      window.fetch = (input, init) => String(input).includes("/api/")
        ? Promise.resolve(new Response(JSON.stringify({ ok: true, smoke: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }))
        : nativeFetch(input, init);
    }`,
  });
  await page.call("Page.navigate", { url: appUrl });
  await waitFor('document.readyState === "complete"');
  await waitFor('typeof bootstrapAppOnce === "function"');
  await evaluate(`(() => {
    localStorage.clear();
    localStorage.setItem("guru-platform-access-v01", "unlocked");
    localStorage.setItem("guru-platform-projects-v02", JSON.stringify([{
      id: "gate3-execution-map-smoke",
      name: "Gate 3 execution map smoke",
      lifecycleStatus: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }]));
    location.reload();
    return true;
  })()`);
  await waitFor('document.querySelector("[data-open-project]")');
  await evaluate('document.querySelector("[data-open-project]").click(); true');
  await waitFor('Boolean(state)');

  const setup = await evaluate(`(() => {
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};
    const fixture = ${JSON.stringify(fixture)};
    Object.assign(state.project, fixture.project);
    const gate0 = state.gates.find((gate) => gate.id === "gate-0");
    const mega = gate0.cards.find((card) => card.id === fixture.megaId) || gate0.cards.find(isMegaMarketingCard);
    mega.megaMarketing = fixture.mega;
    const gate1 = state.gates.find((gate) => gate.id === "gate-1");
    const pageCard = gate1.cards.find((card) => card.id === fixture.pageCardId);
    pageCard.pageRows = [fixture.page];
    state.painV130 = state.painV130 || {};
    state.painV130.productMaps = [fixture.painMap];
    state.projectComparison = fixture.comparison;
    const gate2 = state.gates.find((gate) => gate.id === "gate-2");
    fixture.gate2Cards.forEach((source) => {
      const target = gate2.cards.find((card) => card.id === source.id);
      if (target) Object.assign(target, source);
    });
    state.gate4Production = fixture.gate4Production;
    state.gate4Rsya = fixture.gate4Rsya;
    const smokeProduct = fixture.project.catalogItemsV189.find((item) => item.id === ${JSON.stringify(goatId)});
    const ui = guruV194Ui(state);
    ui.selectedCategoryId = smokeProduct?.categoryId || "";
    ui.selectedProductId = ${JSON.stringify(goatId)};
    state.gate3ProductJourneyV210 = state.gate3ProductJourneyV210 || { openStepsByProduct: {} };
    state.gate3ProductJourneyV210.openStepsByProduct[${JSON.stringify(goatId)}] = {
      aware: true, appeal: true, ask: true, act: true, advocate: true
    };
    guruNavigateToGate("gate-3");
    renderGate();
    return { product: guruV194SelectedProduct(state)?.name || "" };
  })()`);
  await waitFor('document.querySelectorAll("[data-g3-execution-stage-v282]").length === 5');

  const result = await evaluate(`(() => {
    const item = (id) => document.querySelector('[data-g3-execution-item-v282="' + id + '"]');
    const status = (id) => item(id)?.querySelector('.status-pill')?.textContent.trim() || "";
    const hasLink = (id) => Boolean(item(id)?.querySelector('[data-g3-execution-target-v282]'));
    const actLabels = [...document.querySelectorAll('[data-g3-product-stage="act"] .g1-card-body > .g3-product-journey-grid > .g3-product-journey-cell > span')].map((node) => node.textContent.trim());
    return {
      blocks: document.querySelectorAll('[data-g3-execution-stage-v282]').length,
      items: document.querySelectorAll('[data-g3-execution-item-v282]').length,
      links: document.querySelectorAll('[data-g3-execution-target-v282]').length,
      unifiedCards: document.querySelectorAll('.g3-execution-item-v282.g3-product-journey-cell').length,
      allGridsVertical: [...document.querySelectorAll('[data-g3-product-stage] .g3-product-journey-grid')].every((grid) => getComputedStyle(grid).gridTemplateColumns.split(/\s+/).filter(Boolean).length === 1),
      stageWidths: [...document.querySelectorAll('[data-g3-product-stage]')].map((stage) => Math.round(stage.getBoundingClientRect().width * 10) / 10),
      stageInlineWidths: [...document.querySelectorAll('[data-g3-product-stage]')].map((stage) => stage.style.width),
      viewportWidth: window.innerWidth,
      narrowMediaActive: matchMedia('(max-width: 760px)').matches,
      productSelectorVisible: Boolean(document.querySelector('[data-guru-product-context="gate3-product-journey"] [data-g3-product-journey-select]')),
      strategicFoundationRemoved: !document.querySelector('[data-guru-product-context="gate3-product-journey"] [data-guru-strategic-foundation]'),
      duplicateProductContextRemoved: !document.querySelector('.g3-product-journey-context'),
      funnelStageWidths: (() => {
        const widths = [...document.querySelectorAll('[data-g3-product-stage]')].map((stage) => stage.getBoundingClientRect().width);
        return widths.length === 5 && widths.every((width, index) => index === 0 || width < widths[index - 1]) && widths[4] / widths[0] > 0.48 && widths[4] / widths[0] < 0.52;
      })(),
      seo: status('seo'),
      forms: status('forms_cart'),
      quiz: status('quizzes'),
      context: status('context_ads'),
      media: status('media_ads'),
      retargeting: status('retargeting'),
      email: status('email_crm'),
      review: status('review_collection'),
      faq: status('faq'),
      emailLink: hasLink('email_crm'),
      reviewLink: hasLink('review_collection'),
      faqLink: hasLink('faq'),
      actLabels,
      build: window.GURU_BUILD_INFO?.version || "",
      all: [...document.querySelectorAll('[data-g3-execution-item-v282]')].map((row) => ({
        id: row.dataset.g3ExecutionItemV282,
        label: row.querySelector('.g3-execution-label-v282')?.textContent.trim() || "",
        status: row.querySelector('.status-pill')?.textContent.trim() || "",
        source: row.querySelector('[data-g3-execution-target-v282], .g3-execution-no-source-v282')?.textContent.trim().replace(/^←\s*/, '') || "",
        linked: Boolean(row.querySelector('[data-g3-execution-target-v282]'))
      })),
      errors: window.__guruConsoleLog?.filter((entry) => entry.level === "error") || []
    };
  })()`);

  if (
    setup.product !== "Символ 2027 года «Коза»" ||
    result.blocks !== 5 ||
    result.items !== 24 ||
    result.unifiedCards !== 24 ||
    !result.allGridsVertical ||
    !result.funnelStageWidths ||
    !result.productSelectorVisible ||
    !result.strategicFoundationRemoved ||
    !result.duplicateProductContextRemoved ||
    result.seo !== "Готово" ||
    result.forms !== "Готово" ||
    result.quiz !== "Не начато" ||
    result.context !== "Готово" ||
    result.media !== "Не начато" ||
    result.retargeting !== "Не начато" ||
    result.email !== "Нет реализации" ||
    result.review !== "Нет реализации" ||
    result.emailLink ||
    result.reviewLink ||
    !result.faqLink ||
    result.actLabels.includes("Оффер") ||
    !result.actLabels.includes("CTA") ||
    result.build !== "2.3.90" ||
    result.errors.length
  ) {
    throw new Error(`Gate 3 execution map mismatch: ${JSON.stringify({ setup, result })}`);
  }

  const navigation = {};
  for (const [id, gateId, selector] of [
    ["seo", "gate-1", "[data-gate1-final-foundation-v259]"],
    ["competitor_comparison", "gate-1", "[data-project-comparison-toggle]"],
    ["cta", "gate-1", '[data-v22-site-section="productFinalCtaImplementedV253"]'],
    ["quizzes", "gate-2", '[data-card="card-93"]'],
    ["crm_leads", "gate-2", '[data-card="card-122"]'],
    ["media_ads", "gate-4", "[data-g4camp-toggle]"],
    ["retargeting", "gate-4", '[data-g4rsya-product]'],
    ["faq", "gate-0", '[data-mega-preset="FAQ"]'],
  ]) {
    await evaluate('guruNavigateToGate("gate-3"); true');
    await waitFor('activeGateId === "gate-3"');
    await evaluate(`document.querySelector('[data-g3-execution-item-v282="${id}"] [data-g3-execution-target-v282]')?.click(); true`);
    await waitFor(`activeGateId === ${JSON.stringify(gateId)}`);
    await waitFor(`document.querySelector(${JSON.stringify(selector)})`);
    navigation[id] = await evaluate(`({
      gateId: activeGateId,
      targetFound: Boolean(document.querySelector(${JSON.stringify(selector)})),
      highlighted: Boolean(document.querySelector('.guru-source-target-v212'))
    })`);
  }
  if (Object.values(navigation).some((row) => !row.targetFound || !row.highlighted))
    throw new Error(`Gate 3 execution navigation mismatch: ${JSON.stringify(navigation)}`);

  console.log(JSON.stringify({
    setup,
    verified: {
      blocks: result.blocks,
      items: result.items,
      links: result.links,
      unifiedCards: result.unifiedCards,
      allGridsVertical: result.allGridsVertical,
      funnelStageWidths: result.funnelStageWidths,
      productSelectorVisible: result.productSelectorVisible,
      strategicFoundationRemoved: result.strategicFoundationRemoved,
      duplicateProductContextRemoved: result.duplicateProductContextRemoved,
      seo: result.seo,
      forms: result.forms,
      quiz: result.quiz,
      context: result.context,
      media: result.media,
      retargeting: result.retargeting,
      faq: result.faq,
      actLabels: result.actLabels,
      build: result.build,
      errors: result.errors,
    },
    navigation,
  }, null, 2));
} finally {
  page.close();
  await browser.call("Target.closeTarget", { targetId }).catch(() => {});
  await browser.call("Target.disposeBrowserContext", { browserContextId }).catch(() => {});
  browser.close();
}
