import { writeFile } from "node:fs/promises";

const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9362";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const projectId = "gate4-company-foundation-v310-smoke";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

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

async function evaluate(page, expression) {
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

async function waitFor(page, expression, timeoutMs = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await evaluate(page, `Boolean(${expression})`)) return;
    await wait(100);
  }
  throw new Error(`Timed out waiting for ${expression}`);
}

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
const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
const target = targets.find((item) => item.id === targetId);
const page = new CdpClient(target.webSocketDebuggerUrl);
await page.ready;

try {
  await page.call("Runtime.enable");
  await page.call("Page.enable");
  await page.call("Emulation.setDeviceMetricsOverride", {
    width: 1600,
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
      window.__guruErrors = [];
      window.addEventListener("error", (event) => window.__guruErrors.push(event.message));
      window.addEventListener("unhandledrejection", (event) =>
        window.__guruErrors.push(String(event.reason?.message || event.reason))
      );
      window.__guruCompanyFoundationAudit = (panel) => {
        const flow = panel?.querySelector(":scope > .guru-strategic-flow-v286");
        const nodes = [...(flow?.children || [])];
        const keyword = nodes.find((node) =>
          node.matches?.("details[data-guru-strategic-company-keyword-foundation]")
        ) || null;
        const rows = nodes.map((node) => node === keyword
          ? {
              label: node.querySelector(".guru-strategic-jtbd-number-v286")?.textContent.trim() || "",
              value: node.querySelector(":scope > summary > strong")?.textContent.trim() || "",
              status: "",
            }
          : {
              label: node.querySelector(".guru-strategic-row-copy-v286 > strong")?.textContent.trim() || "",
              value: node.querySelector(".guru-strategic-row-copy-v286 > span")?.textContent.trim() || "",
              status: node.querySelector(".status-pill")?.textContent.trim() || "",
            });
        return {
          rows,
          directCount: nodes.length,
          panelText: panel?.textContent || "",
          keyword: {
            exists: Boolean(keyword),
            open: Boolean(keyword?.open),
            summary: keyword?.querySelector(":scope > summary > strong")?.textContent.trim() || "",
            count: keyword?.querySelector(".guru-strategic-jtbd-count-v286")?.textContent.trim() || "",
            phrases: [...(keyword?.querySelectorAll(
              ".guru-strategic-keyword-group-v286 > div > span"
            ) || [])].map((node) => node.textContent.trim()),
            context: keyword?.dataset.guruStrategicContextV286 || "",
            itemId: keyword?.dataset.guruStrategicJtbdV286 || "",
          },
        };
      };
    }`,
  });
  await page.call("Page.navigate", { url: appUrl });
  await waitFor(page, 'document.readyState === "complete"');
  await waitFor(
    page,
    'typeof bootstrapAppOnce === "function" && typeof gate4ProductionHtml === "function"',
  );

  await evaluate(page, `(() => {
    const workspace = structuredClone(window.GURU_SEED);
    workspace.project.id = ${JSON.stringify(projectId)};
    workspace.project.name = "Gate 4 company foundation smoke";
    workspace.project.catalogItemsV189 = [{
      id: "gate4-company-foundation-product",
      name: "Тестовый продукт Gate 4",
      continuum: "pure_product",
      categoryId: "",
      createdAt: new Date().toISOString()
    }];
    workspace.project.gate0ScopeUiV194 = {
      selectedCategoryId: "__uncategorized__",
      selectedProductId: "gate4-company-foundation-product",
      scopeByProductField: {}
    };
    localStorage.clear();
    localStorage.setItem("guru-platform-access-v01", "unlocked");
    localStorage.setItem("guru-platform-projects-v02", JSON.stringify([{
      id: workspace.project.id,
      name: workspace.project.name,
      lifecycleStatus: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }]));
    localStorage.setItem(
      "guru-platform-workspace-v02-" + workspace.project.id,
      JSON.stringify(workspace),
    );
    location.reload();
  })()`);
  await waitFor(page, 'document.querySelector("[data-open-project]")');
  await evaluate(page, 'document.querySelector("[data-open-project]").click(); true');
  await waitFor(
    page,
    'typeof state !== "undefined" && Boolean(state) && typeof guruStrategicFoundationCompanyRefreshV310 === "function"',
  );

  const initial = await evaluate(page, `(() => {
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};
    const product = g4ProductPickProducts()[0] || null;
    if (product) {
      const ui = guruV194Ui(state);
      ui.selectedProductId = product.id;
      ui.selectedCategoryId = guruV185Text(product.categoryId) || "__uncategorized__";
    }
    activeGateId = "gate-4";
    renderGate();
    const root = document.querySelector(".g4-launch-workspace");
    const companyScope = root?.querySelector(':scope > [data-gate-scope="company"]');
    const productScope = root?.querySelector(':scope > [data-gate-scope="product"]');
    const heading = companyScope?.querySelector(":scope > .gate0-section-heading");
    const productHeading = productScope?.querySelector(":scope > .gate0-section-heading");
    const panel = companyScope?.querySelector(
      ":scope > [data-guru-strategic-foundation-company]"
    );
    const selector = productScope?.querySelector(':scope > [data-guru-product-context="gate4-launch"]');
    const productFoundation = productScope?.querySelector(':scope > [data-guru-strategic-foundation]');
    const launch = productScope?.querySelector(":scope > .g1-card");
    const panels = [...document.querySelectorAll(
      "[data-guru-strategic-foundation-company]"
    )];
    const foundation = window.__guruCompanyFoundationAudit(panel);
    const rows = foundation.rows;
    const companyCardIds = ["card-155", "card-156", "card-157", "card-158", "card-159"];
    const gate4 = state.gates.find((gate) => gate.id === "gate-4");
    window.__companyFoundationGate4RenderCountV310 = 0;
    window.__companyFoundationGate4OriginalRenderV310 = renderGate;
    renderGate = function () {
      window.__companyFoundationGate4RenderCountV310 += 1;
      return window.__companyFoundationGate4OriginalRenderV310.apply(this, arguments);
    };
    return {
      segmentRecords: guruV194ExactRecords("segments", "project", null, state).length,
      positioningRecords: guruV194ExactRecords("positioning", "project", null, state).length,
      offerRecords: guruV194ExactRecords("company_offer", "project", null, state).length,
      keywordRecords: guruV194ExactRecords("keyword_foundation", "project", null, state).length,
      panelCount: panels.length,
      directPanelCount: companyScope?.querySelectorAll(
        ":scope > [data-guru-strategic-foundation-company]"
      ).length || 0,
      scopeOrder: [...(root?.querySelectorAll(":scope > [data-gate-scope]") || [])]
        .map((scope) => scope.dataset.gateScope),
      rows,
      foundation,
      projectIds: panels.map((item) => item.dataset.projectId),
      hasProductMarker: panels.some((item) => item.hasAttribute("data-product-id")),
      placement: Boolean(
        heading && panel && productHeading && selector && productFoundation && launch &&
        panel.previousElementSibling === heading &&
        selector.previousElementSibling === productHeading &&
        selector.nextElementSibling === productFoundation &&
        productFoundation.nextElementSibling === launch
      ),
      heading: heading?.querySelector(".gate0-section-heading-title")?.textContent.trim() || "",
      productHeading: productHeading?.querySelector(".gate0-section-heading-title")?.textContent.trim() || "",
      productFoundationCount: productScope?.querySelectorAll(
        ":scope > [data-guru-strategic-foundation]"
      ).length || 0,
      selectorInsideLaunchCount: launch?.querySelectorAll(
        '[data-guru-product-context="gate4-launch"]'
      ).length || 0,
      insideExistingBlockCount: document.querySelectorAll(
        ".g1-card [data-guru-strategic-foundation-company], [data-g4-smm-strategy-v298] [data-guru-strategic-foundation-company], [data-g4-funnel-version-v294] [data-guru-strategic-foundation-company]"
      ).length,
      smmCount: document.querySelectorAll('[data-g4-smm-scope-v298="company-project"]').length,
      companyCardCounts: Object.fromEntries(companyCardIds.map((id) => [
        id,
        document.querySelectorAll('[data-g4-readiness-card="' + id + '"]').length,
      ])),
      companyCardsInsidePanel: companyCardIds.filter((id) =>
        panel?.querySelector('[data-g4-readiness-card="' + id + '"]')
      ),
      smmInsidePanel: Boolean(panel?.querySelector("[data-g4-smm-strategy-v298]")),
      funnelCount: document.querySelectorAll("[data-g4-funnel-version-v294]").length,
      productPickerCount: document.querySelectorAll(
        '[data-gate0-scope-product-select="gate4-launch"]'
      ).length,
      campaignState: JSON.stringify(state.gate4Production?.campaigns || {}),
      gate4CardIds: gate4.cards.map((card) => card.id),
      otherGateCardIds: state.gates
        .filter((gate) => gate.id !== "gate-4")
        .map((gate) => [gate.id, gate.cards.map((card) => card.id)]),
    };
  })()`);

  assert(initial.segmentRecords === 0, "Panel render created a segment record");
  assert(initial.positioningRecords === 0, "Panel render created a positioning record");
  assert(initial.offerRecords === 0, "Panel render created a company offer record");
  assert(initial.keywordRecords === 0, "Panel render created a company keyword record");
  assert(initial.panelCount === 1, "Company foundation must render exactly once in Gate 4");
  assert(initial.directPanelCount === 1, "Company panel is not a direct Gate 4 overview block");
  assert(initial.heading === "Компания", "Gate 4 company heading is missing");
  assert(initial.productHeading === "Продукт / Услуга", "Gate 4 product heading is missing");
  assert(
    JSON.stringify(initial.scopeOrder) === JSON.stringify(["company", "product"]),
    `Gate 4 scope order is wrong: ${JSON.stringify(initial.scopeOrder)}`,
  );
  assert(initial.placement, "Company/product selector/foundation/launch order is wrong");
  assert(initial.productFoundationCount === 1, "Gate 4 product foundation is missing or duplicated");
  assert(initial.selectorInsideLaunchCount === 0, "Gate 4 selector is still duplicated inside launch");
  assert(initial.rows.length === 5, "Company foundation must contain five rows");
  assert(
    JSON.stringify(initial.rows.map((row) => row.label)) === JSON.stringify([
      "Цель бренда",
      "Целевая аудитория",
      "Позиционирование",
      "Оффер компании",
      "Фундамент ключевых слов",
    ]),
    "Company foundation labels are not fully localized",
  );
  assert(
    initial.rows[0]?.label === "Цель бренда",
    "Brand Purpose row is missing from the Gate 4 company foundation",
  );
  assert(
    initial.rows.slice(0, 4).every((row) =>
      row.value === "Не заполнено в источнике" && row.status === "Не начато"
    ),
    "Empty company foundation rows do not have the approved empty state",
  );
  assert(
    initial.foundation.directCount === 5 &&
      initial.foundation.keyword.exists &&
      !initial.foundation.keyword.open &&
      initial.foundation.keyword.summary === "Подтверждённых фраз пока нет" &&
      initial.foundation.keyword.count === "0 ключевых слов" &&
      initial.foundation.keyword.phrases.length === 0,
    `Empty Gate 4 keyword foundation state is wrong: ${JSON.stringify(initial.foundation.keyword)}`,
  );
  assert(initial.projectIds.every((id) => id === projectId), "Panel project_id marker is wrong");
  assert(!initial.hasProductMarker, "Company panel must not have data-product-id");
  assert(initial.insideExistingBlockCount === 0, "Panel was duplicated inside an existing Gate 4 block");
  assert(initial.smmCount === 1, "Existing SMM company block changed or disappeared");
  assert(
    Object.values(initial.companyCardCounts).every((count) => count === 1),
    `Company readiness cards changed: ${JSON.stringify(initial.companyCardCounts)}`,
  );
  assert(initial.companyCardsInsidePanel.length === 0, "card-155..159 were duplicated into the panel");
  assert(!initial.smmInsidePanel, "SMM strategy was duplicated into the panel");
  assert(initial.funnelCount === 1, "Gate 4 funnel render changed");
  assert(initial.productPickerCount === 1, "Gate 4 product picker changed");

  const filled = await evaluate(page, `(() => {
    const segmentRecord = guruV309ProjectSegmentRecord(state, true);
    segmentRecord.value = "Женщины 25–40 лет, выбирающие авторские вещи осознанно";
    Object.assign(segmentRecord.segment, {
      geography: "СТАРАЯ ГЕОГРАФИЯ НЕ ДОЛЖНА ПОКАЗЫВАТЬСЯ",
      demographics: "СТАРАЯ ДЕМОГРАФИЯ НЕ ДОЛЖНА ПОКАЗЫВАТЬСЯ",
      psychographics: "СТАРАЯ ПСИХОГРАФИЯ НЕ ДОЛЖНА ПОКАЗЫВАТЬСЯ",
      behavior: "СТАРОЕ ПОВЕДЕНИЕ НЕ ДОЛЖНО ПОКАЗЫВАТЬСЯ",
      need_response: "СТАРАЯ ПОТРЕБНОСТЬ НЕ ДОЛЖНА ПОКАЗЫВАТЬСЯ"
    });
    const positioningRecord = guruV308ProjectPositioningRecord(state, true);
    positioningRecord.value = "Авторская мастерская тёплых вещей с характером";
    Object.assign(positioningRecord.positioning, {
      category: "СТАРАЯ КАТЕГОРИЯ НЕ ДОЛЖНА ПОКАЗЫВАТЬСЯ",
      key_difference: "СТАРОЕ ОТЛИЧИЕ НЕ ДОЛЖНО ПОКАЗЫВАТЬСЯ",
      basis: "СТАРОЕ ОСНОВАНИЕ НЕ ДОЛЖНО ПОКАЗЫВАТЬСЯ"
    });
    const brandPurposeRecord = guruV349ProjectBrandPurposeRecord(state, true);
    brandPurposeRecord.value = "Помогать людям выбирать осмысленные вещи";
    const offerRecord = guruV347ProjectCompanyOfferRecord(state, true);
    offerRecord.value = "Выберите единственную вещь, созданную мастером для важного момента";
    Object.assign(offerRecord.offer, {
      rational: "СТАРАЯ РАЦИОНАЛЬНАЯ ЛИНЗА",
      irrational: "СТАРАЯ ИРРАЦИОНАЛЬНАЯ ЛИНЗА",
      social: "СТАРАЯ СОЦИАЛЬНАЯ ЛИНЗА",
      cta: "СТАРЫЙ CTA НЕ ДОЛЖЕН ПОКАЗЫВАТЬСЯ"
    });
    const keywordRecord = guruCompanyKeywordFoundationRecordV351(state, true);
    keywordRecord.keywords = [
      { id: "company-keyword-confirmed-a", value: "авторская мастерская", source: "generated", status: "confirmed" },
      { id: "company-keyword-confirmed-b", value: "тёплые вещи с характером", source: "manual", status: "confirmed" },
      { id: "company-keyword-draft", value: "черновая фраза не показывать", source: "generated", status: "draft" }
    ];
    guruStrategicFoundationCompanyRefreshV310();
    saveState();
    const panel = document.querySelector("[data-guru-strategic-foundation-company]");
    const foundation = window.__guruCompanyFoundationAudit(panel);
    const rows = foundation.rows;
    return {
      panelCount: document.querySelectorAll("[data-guru-strategic-foundation-company]").length,
      rows,
      foundation,
      renderCount: window.__companyFoundationGate4RenderCountV310,
      segmentRecords: guruV194ExactRecords("segments", "project", null, state).length,
      positioningRecords: guruV194ExactRecords("positioning", "project", null, state).length,
      offerRecords: guruV194ExactRecords("company_offer", "project", null, state).length,
      keywordRecords: guruV194ExactRecords("keyword_foundation", "project", null, state).length,
      smmCount: document.querySelectorAll('[data-g4-smm-scope-v298="company-project"]').length,
      companyCardCount: document.querySelectorAll('[data-g4-readiness-card="card-155"], [data-g4-readiness-card="card-156"], [data-g4-readiness-card="card-157"], [data-g4-readiness-card="card-158"], [data-g4-readiness-card="card-159"]').length,
      campaignState: JSON.stringify(state.gate4Production?.campaigns || {}),
    };
  })()`);

  assert(filled.panelCount === 1, "Live refresh duplicated the Gate 4 panel");
  assert(filled.renderCount === 0, "Live refresh triggered a full Gate render");
  assert(filled.segmentRecords === 1, "Live refresh did not keep one segment record");
  assert(filled.positioningRecords === 1, "Live refresh did not keep one positioning record");
  assert(filled.offerRecords === 1, "Live refresh did not keep one offer record");
  assert(filled.keywordRecords === 1, "Live refresh did not keep one keyword record");
  assert(filled.rows.slice(0, 4).every((row) => row.status === "Готово"), "Filled rows are not ready");
  assert(
    JSON.stringify(filled.rows.slice(0, 4).map((row) => row.value)) === JSON.stringify([
      "Помогать людям выбирать осмысленные вещи",
      "Женщины 25–40 лет, выбирающие авторские вещи осознанно",
      "Авторская мастерская тёплых вещей с характером",
      "Выберите единственную вещь, созданную мастером для важного момента",
    ]),
    `Unified company values did not update live in Gate 4: ${JSON.stringify(filled.rows)}`,
  );
  assert(
    !filled.foundation.panelText.includes("СТАРАЯ КАТЕГОРИЯ") &&
      !filled.foundation.panelText.includes("СТАРОЕ ОТЛИЧИЕ") &&
      !filled.foundation.panelText.includes("СТАРОЕ ОСНОВАНИЕ") &&
      !filled.foundation.panelText.includes("СТАРЫЙ CTA"),
    "Structured positioning/offer parts leaked into Gate 4",
  );
  assert(
    filled.foundation.keyword.summary === "Подтверждённые фразы" &&
      filled.foundation.keyword.count === "2 ключевых слова" &&
      JSON.stringify(filled.foundation.keyword.phrases) === JSON.stringify([
        "авторская мастерская",
        "тёплые вещи с характером",
      ]),
    `Gate 4 confirmed-only keywords are wrong: ${JSON.stringify(filled.foundation.keyword)}`,
  );
  assert(filled.smmCount === initial.smmCount, "Live refresh changed the SMM block");
  assert(filled.companyCardCount === 5, "Live refresh changed card-155..159");
  assert(filled.campaignState === initial.campaignState, "Live refresh changed campaign state");

  await evaluate(page, `document.querySelector("details[data-guru-strategic-company-keyword-foundation] > summary")?.click(); true`);
  await waitFor(page, 'document.querySelector("details[data-guru-strategic-company-keyword-foundation]")?.open === true');
  const expanded = await evaluate(page, `(() => {
    guruStrategicFoundationCompanyRefreshV310();
    saveState();
    return window.__guruCompanyFoundationAudit(
      document.querySelector("[data-guru-strategic-foundation-company]")
    );
  })()`);
  assert(expanded.keyword.open, "Gate 4 keyword foundation collapsed during live refresh");
  assert(
    JSON.stringify(expanded.keyword.phrases) === JSON.stringify(filled.foundation.keyword.phrases),
    "Gate 4 expanded keyword list changed during live refresh",
  );

  await wait(700);
  await evaluate(page, `(() => {
    document.querySelector('.g4-launch-workspace > [data-gate-scope="product"] > .gate0-section-heading')
      ?.scrollIntoView({ block: "start" });
    return true;
  })()`);
  await wait(150);
  const screenshot = await page.call("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
  });
  await writeFile(
    "artifacts/gate4-company-strategic-foundation-v310.png",
    Buffer.from(screenshot.data, "base64"),
  );

  await evaluate(page, "location.reload(); true");
  await waitFor(
    page,
    'typeof state !== "undefined" && Boolean(state) && activeProjectId === ' +
      JSON.stringify(projectId),
  );
  const afterReload = await evaluate(page, `(() => {
    activeGateId = "gate-4";
    renderGate();
    const root = document.querySelector(".g4-launch-workspace");
    const companyScope = root?.querySelector(':scope > [data-gate-scope="company"]');
    const productScope = root?.querySelector(':scope > [data-gate-scope="product"]');
    const panel = companyScope?.querySelector(
      ":scope > [data-guru-strategic-foundation-company]"
    );
    const gate4 = state.gates.find((gate) => gate.id === "gate-4");
    const foundation = window.__guruCompanyFoundationAudit(panel);
    return {
      panelCount: document.querySelectorAll("[data-guru-strategic-foundation-company]").length,
      directPanelCount: companyScope?.querySelectorAll(
        ":scope > [data-guru-strategic-foundation-company]"
      ).length || 0,
      scopeOrder: [...(root?.querySelectorAll(":scope > [data-gate-scope]") || [])]
        .map((scope) => scope.dataset.gateScope),
      productHeading: productScope?.querySelector(":scope > .gate0-section-heading .gate0-section-heading-title")?.textContent.trim() || "",
      productFoundationCount: productScope?.querySelectorAll(
        ":scope > [data-guru-strategic-foundation]"
      ).length || 0,
      selectorInsideLaunchCount: productScope?.querySelectorAll(
        ':scope > .g1-card [data-guru-product-context="gate4-launch"]'
      ).length || 0,
      foundation,
      segmentRecords: guruV194ExactRecords("segments", "project", null, state).length,
      positioningRecords: guruV194ExactRecords("positioning", "project", null, state).length,
      offerRecords: guruV194ExactRecords("company_offer", "project", null, state).length,
      keywordRecords: guruV194ExactRecords("keyword_foundation", "project", null, state).length,
      smmCount: document.querySelectorAll('[data-g4-smm-scope-v298="company-project"]').length,
      companyCardIds: [...document.querySelectorAll('[data-g4-readiness-card="card-155"], [data-g4-readiness-card="card-156"], [data-g4-readiness-card="card-157"], [data-g4-readiness-card="card-158"], [data-g4-readiness-card="card-159"]')]
        .map((node) => node.dataset.g4ReadinessCard),
      companyCardsInsidePanel: panel?.querySelectorAll("[data-g4-readiness-card]").length || 0,
      smmInsidePanel: panel?.querySelectorAll("[data-g4-smm-strategy-v298]").length || 0,
      funnelCount: document.querySelectorAll("[data-g4-funnel-version-v294]").length,
      productPickerCount: document.querySelectorAll(
        '[data-gate0-scope-product-select="gate4-launch"]'
      ).length,
      campaignState: JSON.stringify(state.gate4Production?.campaigns || {}),
      gate4CardIds: gate4.cards.map((card) => card.id),
      otherGateCardIds: state.gates
        .filter((gate) => gate.id !== "gate-4")
        .map((gate) => [gate.id, gate.cards.map((card) => card.id)]),
      errors: window.__guruErrors,
    };
  })()`);

  assert(afterReload.panelCount === 1, "Single Gate 4 panel did not survive hard reload");
  assert(afterReload.directPanelCount === 1, "Panel moved inside another block after reload");
  assert(
    JSON.stringify(afterReload.scopeOrder) === JSON.stringify(["company", "product"]),
    "Company/Product scope order changed after reload",
  );
  assert(afterReload.productHeading === "Продукт / Услуга", "Product heading changed after reload");
  assert(afterReload.productFoundationCount === 1, "Product foundation changed after reload");
  assert(afterReload.selectorInsideLaunchCount === 0, "Product selector returned inside launch after reload");
  assert(
    JSON.stringify(afterReload.foundation.rows.map((row) => row.label)) ===
      JSON.stringify(initial.rows.map((row) => row.label)),
    "Gate 4 five-row order changed after reload",
  );
  assert(
    JSON.stringify(afterReload.foundation.rows.slice(0, 4).map((row) => row.value)) ===
      JSON.stringify(filled.rows.slice(0, 4).map((row) => row.value)),
    "Gate 4 unified values changed after reload",
  );
  assert(afterReload.foundation.keyword.open, "Gate 4 keyword expansion did not survive reload");
  assert(
    JSON.stringify(afterReload.foundation.keyword.phrases) ===
      JSON.stringify(filled.foundation.keyword.phrases),
    "Gate 4 confirmed keywords changed after reload",
  );
  assert(afterReload.segmentRecords === 1, "Segment record duplicated after reload");
  assert(afterReload.positioningRecords === 1, "Positioning record duplicated after reload");
  assert(afterReload.offerRecords === 1, "Offer record duplicated after reload");
  assert(afterReload.keywordRecords === 1, "Keyword record duplicated after reload");
  assert(afterReload.smmCount === 1, "SMM block changed after reload");
  assert(afterReload.companyCardIds.length === 5, "card-155..159 changed after reload");
  assert(afterReload.companyCardsInsidePanel === 0, "Company readiness cards became panel children");
  assert(afterReload.smmInsidePanel === 0, "SMM became a panel child");
  assert(afterReload.funnelCount === initial.funnelCount, "Gate 4 funnel changed after reload");
  assert(afterReload.productPickerCount === initial.productPickerCount, "Product picker changed after reload");
  assert(afterReload.campaignState === initial.campaignState, "Campaign state changed after reload");
  assert(
    JSON.stringify(afterReload.gate4CardIds) === JSON.stringify(initial.gate4CardIds),
    "Gate 4 card structure changed",
  );
  assert(
    JSON.stringify(afterReload.otherGateCardIds) === JSON.stringify(initial.otherGateCardIds),
    "Another gate card structure changed",
  );
  assert(afterReload.errors.length === 0, `Browser errors: ${afterReload.errors.join(" | ")}`);

  console.log(JSON.stringify({
    initial: {
      panelCount: initial.panelCount,
      rows: initial.rows,
      smmCount: initial.smmCount,
      companyCardCounts: initial.companyCardCounts,
      funnelCount: initial.funnelCount,
      productPickerCount: initial.productPickerCount,
    },
    filled: {
      panelCount: filled.panelCount,
      renderCount: filled.renderCount,
      rows: filled.rows,
      smmCount: filled.smmCount,
      companyCardCount: filled.companyCardCount,
    },
    expanded,
    afterReload,
  }, null, 2));
  console.log("gate4 company strategic foundation smoke: OK");
} finally {
  page.close();
  await browser.call("Target.closeTarget", { targetId }).catch(() => {});
  await browser.call("Target.disposeBrowserContext", { browserContextId }).catch(() => {});
  browser.close();
}
