import { writeFile } from "node:fs/promises";

const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9365";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const projectId = "gate1-company-unified-container-v357-smoke";
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
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
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

async function captureElement(selector, filename) {
  const box = await evaluate(page, `(() => {
    const node = document.querySelector(${JSON.stringify(selector)});
    if (!node) throw new Error("Screenshot target not found");
    let ancestor = node;
    while (ancestor) {
      if (ancestor.hidden) ancestor.hidden = false;
      ancestor = ancestor.parentElement;
    }
    node.scrollIntoView({ block: "start" });
    const rect = node.getBoundingClientRect();
    return {
      x: Math.max(0, rect.left + scrollX),
      y: Math.max(0, rect.top + scrollY),
      width: Math.max(1, Math.min(rect.width, 1900)),
      height: Math.max(1, Math.min(rect.height, 6000)),
    };
  })()`);
  await wait(80);
  const screenshot = await page.call("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
    clip: { ...box, scale: 1 },
  });
  await writeFile(filename, Buffer.from(screenshot.data, "base64"));
  return { filename, ...box };
}

try {
  await page.call("Runtime.enable");
  await page.call("Page.enable");
  await page.call("Emulation.setDeviceMetricsOverride", {
    width: 1920,
    height: 1400,
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
      window.addEventListener("error", (event) =>
        window.__guruErrors.push(event.message));
      window.addEventListener("unhandledrejection", (event) =>
        window.__guruErrors.push(String(event.reason?.message || event.reason)));
    }`,
  });
  await page.call("Page.navigate", { url: appUrl });
  await waitFor(page, 'document.readyState === "complete"');
  await waitFor(
    page,
    'typeof gate1CompanyDemandPositioningCompletionV357 === "function" && ' +
      'typeof gate1CompanyDemandPositioningContainerHtmlV357 === "function" && ' +
      'typeof GATE1_COMPANY_DEMAND_POSITIONING_SECTION_V357 === "string" && ' +
      'typeof guruGate1SelectedProductCompletionV282 === "function"',
  );

  await evaluate(page, `(() => {
    const workspace = structuredClone(window.GURU_SEED);
    workspace.project.id = ${JSON.stringify(projectId)};
    workspace.project.name = "Gate 1 company unified container smoke";
    workspace.project.gate0ScopedValuesV194 = [];
    workspace.painV130 = workspace.painV130 || { openSteps: {}, steps: {} };
    workspace.painV130.companySemanticsV264 = { brandPhrases: "SMM-only sentinel" };
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
    `typeof state !== "undefined" && Boolean(state) && ` +
      `activeProjectId === ${JSON.stringify(projectId)}`,
  );

  const setup = await evaluate(page, `(() => {
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};

    const fixtureAt = "2026-09-15T00:00:00.000Z";
    const categoryId = "company-container-product-category-v357";
    const productId = "company-container-product-v357";
    const pageId = "company-container-product-page-v357";
    state.project.productRegistryV185 = [{
      id: categoryId,
      name: "Product control category",
      legacyNames: [],
      createdAt: fixtureAt,
    }];
    state.project.catalogItemsV189 = [{
      id: productId,
      name: "Product control sentinel",
      continuum: "pure_product",
      categoryId,
      createdAt: fixtureAt,
      source: { kind: "gate1", cardId: "card-24", rowId: pageId, rowIndex: 0 },
    }];
    const productCard = state.gates
      .find((gate) => gate.id === "gate-1")
      ?.cards?.find((card) => card.id === "card-24");
    if (!productCard) throw new Error("Gate 1 product fixture card is missing");
    const productPage = createPageStructureRow("Product control sentinel", false);
    productPage.id = pageId;
    productPage.direction = "Product control category";
    productPage.categoryId = categoryId;
    productPage.catalogItemIdV189 = productId;
    productPage.contextFields = {};
    productCard.pageRows = [productPage];
    state.painV130.productMaps = [{
      ...pv140EmptyProductMap("Product control category"),
      product_id: categoryId,
      items: {},
    }];
    const product = guruV194Products(state).find((candidate) =>
      Boolean(g3ProductJourneyPageSource(candidate)?.row));
    if (!product) throw new Error("Product control fixture is missing");
    const productUi = guruV194Ui(state);
    productUi.selectedCategoryId = product.categoryId || "__uncategorized__";
    productUi.selectedProductId = product.id;

    const productFoundation = guruV247KeywordFoundationRecord(product, true, state);
    productFoundation.keywords = [{
      id: "product-foundation-control-v357",
      value: "товарная контрольная фраза",
      source: "manual",
      status: "confirmed",
    }];
    const productPain = guruGate1FinalPainContextV259(product, true);
    if (!productPain?.itemData) throw new Error("Product demand fixture is missing");
    productPain.itemData.demandRows = [{
      id: "product-demand-control-v357",
      kw: "товарная контрольная фраза",
      vol: "101",
      queryCount: "102",
      forecastClicks: "103",
      clickPrice: "104",
      bid: "105",
      forecastBudget: "106",
      originStage: "gate1",
    }];
    let productJtbd = guruV194ExactRecords("jtbd", "product", product, state)[0];
    if (!productJtbd) {
      productJtbd = {
        id: "product-jtbd-control-v357",
        ...guruV194RecordLocation("product", product),
        field: "jtbd",
        value: "Контрольный JTBD товара",
        source: { type: "manual", label: "Smoke" },
        confirmation_status: "confirmed",
        created_at: fixtureAt,
        updated_at: fixtureAt,
      };
      guruV194Records(state).push(productJtbd);
    } else productJtbd.value = "Контрольный JTBD товара";

    const company = gate1CompanySemanticsV264(state);
    company.brandPhrases = "SMM-only sentinel";
    company.demandRows = [];
    company.archivedDemandRows = [];
    const companyFoundation = guruCompanyKeywordFoundationRecordV351(state, true);
    companyFoundation.keywords = [];

    const companyFields = new Set([
      "brand_purpose", "segments", "positioning", "company_offer",
    ]);
    state.project.gate0ScopedValuesV194 = guruV194Records(state).filter(
      (record) => !(record?.scope === "project" && companyFields.has(record?.field)),
    );

    window.__gate1CompanyContainerAuditV357 = () => {
      const key = GATE1_COMPANY_DEMAND_POSITIONING_SECTION_V357;
      const toggle = document.querySelector(
        '[data-gate1-toggle-section="' + CSS.escape(key) + '"]',
      );
      const section = toggle?.closest(".g1-section") || null;
      const body = section?.querySelector(":scope > .g1-section-body") || null;
      const redesign = document.querySelector(".g1-redesign");
      const foundation = body?.querySelector(
        "[data-guru-strategic-foundation-company]",
      ) || null;
      const semantics = body?.querySelector(
        "[data-gate1-company-semantics-v264]",
      ) || null;
      const style = section ? getComputedStyle(section) : null;
      const completion = gate1CompanyDemandPositioningCompletionV357(state);
      const productCompletion = guruGate1SelectedProductCompletionV282();
      return {
        completion: {
          status: completion.status,
          completed: completion.completed,
          total: completion.total,
          strategicFoundationReady: completion.strategicFoundationReady,
          keywordFoundationReady: completion.keywordFoundationReady,
          demandReady: completion.demandReady,
        },
        productCompletion: {
          productId: productCompletion.product?.id || "",
          status: productCompletion.status,
          completed: productCompletion.completed,
          total: productCompletion.total,
          foundationReady: productCompletion.foundationReady,
          demandReady: productCompletion.demandReady,
          jtbdReady: productCompletion.jtbdReady,
          demandRows: productCompletion.demandRows,
        },
        sectionCount: document.querySelectorAll(
          '[data-gate1-toggle-section="' + CSS.escape(key) + '"]',
        ).length,
        hasCompanyMarker: Boolean(
          section?.hasAttribute("data-gate1-company-demand-positioning-v357")),
        topLevelSection: Boolean(section && section.parentElement === redesign),
        title: toggle?.querySelector(".g1-section-title")?.textContent.trim() || "",
        progress: toggle?.querySelector(".g1-section-progress")?.textContent.trim() || "",
        statusText: toggle?.querySelector(".status-pill")?.textContent.trim() || "",
        statusClass: toggle?.querySelector(".status-pill")?.className || "",
        expanded: toggle?.getAttribute("aria-expanded") || "",
        openClass: Boolean(section?.classList.contains("is-open")),
        bodyHidden: Boolean(body?.hidden),
        hasFrame: Boolean(
          section && style && style.borderTopStyle !== "none" &&
          parseFloat(style.borderTopWidth) > 0 && parseFloat(style.borderRadius) > 0
        ),
        foundationInside: Boolean(foundation && foundation.closest(".g1-section") === section),
        semanticsInside: Boolean(semantics && semantics.closest(".g1-section") === section),
        productSectionCount: document.querySelectorAll(
          '[data-gate1-toggle-section="pain_jtbd_offer"]',
        ).length,
        productTitle: document.querySelector(
          '[data-gate1-toggle-section="pain_jtbd_offer"] .g1-section-title',
        )?.textContent.trim() || "",
      };
    };
    window.__renderAndAuditCompanyContainerV357 = () => {
      activeView = "gate";
      activeGateId = "gate-1";
      getGate1AccordionState().subblocks[
        GATE1_COMPANY_DEMAND_POSITIONING_SECTION_V357
      ] = true;
      getGate1AccordionState().subblocks.pain_jtbd_offer = true;
      renderGate();
      return window.__gate1CompanyContainerAuditV357();
    };

    saveState();
    const companySource = gate1CompanyDemandPositioningCompletionV357.toString();
    const productSource = guruGate1SelectedProductCompletionV282.toString();
    return {
      productId: product.id,
      companySource,
      productSource,
      first: window.__renderAndAuditCompanyContainerV357(),
    };
  })()`);

  assert(
    !/guruV194SelectedProduct|guruGate1FinalPainContextV259|product(?:\.|_)id/i
      .test(setup.companySource),
    "Company completion depends on a product-only selector, context, or product_id",
  );
  assert(
    /guruV194SelectedProduct/.test(setup.productSource),
    "Product completion path no longer uses its selected-product boundary",
  );

  const expectedProduct = setup.first.productCompletion;
  const assertProductUnchanged = (snapshot, stage) => {
    assert(
      JSON.stringify(snapshot.productCompletion) === JSON.stringify(expectedProduct),
      `Product completion changed during company stage ${stage}: ` +
        JSON.stringify(snapshot.productCompletion),
    );
    assert(snapshot.productSectionCount === 1, `Product container missing at ${stage}`);
    assert(
      snapshot.productTitle === "Спрос, ценность, позиционирование · Продукт/Услуга",
      `Product container title changed at ${stage}: ${snapshot.productTitle}`,
    );
  };
  const assertCompanyStage = (snapshot, completed, status, label) => {
    assert(snapshot.sectionCount === 1, `Company container count is not one at ${label}`);
    assert(snapshot.hasCompanyMarker, `Company container marker is missing at ${label}`);
    assert(snapshot.topLevelSection, `Company container is not one top-level node at ${label}`);
    assert(snapshot.hasFrame, `Company container has no common frame at ${label}`);
    assert(snapshot.foundationInside, `Strategic foundation escaped the frame at ${label}`);
    assert(snapshot.semanticsInside, `Company demand escaped the frame at ${label}`);
    assert(
      snapshot.title === "Спрос, ценность, позиционирование · Компания",
      `Wrong company title at ${label}: ${snapshot.title}`,
    );
    assert(
      snapshot.completion.completed === completed && snapshot.completion.total === 3,
      `Wrong company completion at ${label}: ${JSON.stringify(snapshot.completion)}`,
    );
    assert(
      snapshot.completion.status === status,
      `Wrong company status at ${label}: ${snapshot.completion.status}`,
    );
    assert(
      snapshot.progress === `${completed} из 3 блоков готово`,
      `Wrong company progress at ${label}: ${snapshot.progress}`,
    );
    assert(
      snapshot.statusClass.includes(`status-${status}`),
      `Wrong company status class at ${label}: ${snapshot.statusClass}`,
    );
    assertProductUnchanged(snapshot, label);
  };

  assert(
    expectedProduct.completed === 3 && expectedProduct.total === 3 &&
      expectedProduct.status === "ready",
    `Product control fixture is not 3/3: ${JSON.stringify(expectedProduct)}`,
  );
  assertCompanyStage(setup.first, 0, "not_started", "0/3");
  assert(
    !setup.first.completion.strategicFoundationReady &&
      !setup.first.completion.keywordFoundationReady &&
      !setup.first.completion.demandReady,
    "Empty company completion has a ready sub-block",
  );

  const partialStrategy = await evaluate(page, `(() => {
    guruV349ProjectBrandPurposeRecord(state, true).value = "Цель бренда";
    guruV309ProjectSegmentRecord(state, true).value = "Единая аудитория";
    guruV308ProjectPositioningRecord(state, true).value = "Единое позиционирование";
    return window.__renderAndAuditCompanyContainerV357();
  })()`);
  assertCompanyStage(partialStrategy, 0, "in_progress", "partial strategy");
  assert(
    !partialStrategy.completion.strategicFoundationReady,
    "Three of four strategy formulations incorrectly completed the strategy block",
  );

  const oneOfThree = await evaluate(page, `(() => {
    guruV347ProjectCompanyOfferRecord(state, true).value = "Единый оффер компании";
    return window.__renderAndAuditCompanyContainerV357();
  })()`);
  assertCompanyStage(oneOfThree, 1, "in_progress", "1/3");
  assert(
    oneOfThree.completion.strategicFoundationReady &&
      !oneOfThree.completion.keywordFoundationReady &&
      !oneOfThree.completion.demandReady,
    "Company 1/3 stage does not represent the four-formulation strategy block",
  );

  const twoOfThree = await evaluate(page, `(() => {
    const record = guruCompanyKeywordFoundationRecordV351(state, true);
    record.keywords = [{
      id: "company-keyword-control-v357",
      value: "компанийная контрольная фраза",
      source: "manual",
      status: "confirmed",
    }];
    return window.__renderAndAuditCompanyContainerV357();
  })()`);
  assertCompanyStage(twoOfThree, 2, "in_progress", "2/3");
  assert(
    twoOfThree.completion.strategicFoundationReady &&
      twoOfThree.completion.keywordFoundationReady &&
      !twoOfThree.completion.demandReady,
    "Confirmed keyword did not produce the expected 2/3 stage",
  );

  const threeOfThree = await evaluate(page, `(() => {
    const model = gate1CompanyBrandDemandReconcileV345(state, { create: true });
    if (model.rows.length !== 1) throw new Error("Company demand row was not reconciled");
    Object.assign(model.rows[0], {
      vol: "201",
      queryCount: "202",
      forecastClicks: "203",
      clickPrice: "204",
      bid: "205",
      forecastBudget: "206",
    });
    saveState();
    return window.__renderAndAuditCompanyContainerV357();
  })()`);
  assertCompanyStage(threeOfThree, 3, "ready", "3/3");
  assert(
    threeOfThree.completion.strategicFoundationReady &&
      threeOfThree.completion.keywordFoundationReady &&
      threeOfThree.completion.demandReady,
    "All company sub-blocks are not ready at 3/3",
  );

  const screenshot = await captureElement(
    "[data-gate1-company-demand-positioning-v357]",
    "artifacts/gate1-company-demand-positioning-v357.png",
  );

  const toggle = await evaluate(page, `(async () => {
    const key = GATE1_COMPANY_DEMAND_POSITIONING_SECTION_V357;
    const selector = '[data-gate1-toggle-section="' + CSS.escape(key) + '"]';
    const header = document.querySelector(selector);
    header.click();
    const afterClose = window.__gate1CompanyContainerAuditV357();
    header.click();
    const afterOpen = window.__gate1CompanyContainerAuditV357();
    await new Promise((resolve) => setTimeout(resolve, 260));
    guruFlushUiPreferenceSave({ cloud: false });
    return {
      afterClose,
      afterOpen,
      storedOpen: Boolean(getGate1AccordionState().subblocks[key]),
    };
  })()`);
  assert(
    toggle.afterClose.expanded === "false" && toggle.afterClose.bodyHidden &&
      !toggle.afterClose.openClass,
    `Company accordion did not close in place: ${JSON.stringify(toggle.afterClose)}`,
  );
  assert(
    toggle.afterOpen.expanded === "true" && !toggle.afterOpen.bodyHidden &&
      toggle.afterOpen.openClass && toggle.storedOpen,
    `Company accordion did not reopen in place: ${JSON.stringify(toggle.afterOpen)}`,
  );

  await evaluate(page, "location.reload(); true");
  await waitFor(
    page,
    `typeof state !== "undefined" && Boolean(state) && ` +
      `activeProjectId === ${JSON.stringify(projectId)}`,
  );
  const afterReload = await evaluate(page, `(() => {
    activeView = "gate";
    activeGateId = "gate-1";
    renderGate();
    const key = GATE1_COMPANY_DEMAND_POSITIONING_SECTION_V357;
    const toggle = document.querySelector(
      '[data-gate1-toggle-section="' + CSS.escape(key) + '"]',
    );
    const section = toggle?.closest(".g1-section") || null;
    const body = section?.querySelector(":scope > .g1-section-body") || null;
    const company = gate1CompanyDemandPositioningCompletionV357(state);
    const product = guruGate1SelectedProductCompletionV282();
    return {
      company: {
        status: company.status,
        completed: company.completed,
        total: company.total,
      },
      product: {
        productId: product.product?.id || "",
        status: product.status,
        completed: product.completed,
        total: product.total,
        foundationReady: product.foundationReady,
        demandReady: product.demandReady,
        jtbdReady: product.jtbdReady,
        demandRows: product.demandRows,
      },
      stateOpen: Boolean(getGate1AccordionState().subblocks[key]),
      expanded: toggle?.getAttribute("aria-expanded") || "",
      openClass: Boolean(section?.classList.contains("is-open")),
      bodyHidden: Boolean(body?.hidden),
      foundationInside: Boolean(
        body?.querySelector("[data-guru-strategic-foundation-company]")),
      semanticsInside: Boolean(
        body?.querySelector("[data-gate1-company-semantics-v264]")),
      companySectionCount: document.querySelectorAll(
        '[data-gate1-toggle-section="' + CSS.escape(key) + '"]',
      ).length,
      hasCompanyMarker: Boolean(
        section?.hasAttribute("data-gate1-company-demand-positioning-v357")),
      productSectionCount: document.querySelectorAll(
        '[data-gate1-toggle-section="pain_jtbd_offer"]',
      ).length,
      errors: window.__guruErrors,
    };
  })()`);

  assert(
    afterReload.company.completed === 3 && afterReload.company.total === 3 &&
      afterReload.company.status === "ready",
    `Company 3/3 did not survive reload: ${JSON.stringify(afterReload.company)}`,
  );
  assert(
    afterReload.stateOpen && afterReload.expanded === "true" &&
      afterReload.openClass && !afterReload.bodyHidden,
    `Company accordion expansion did not survive reload: ${JSON.stringify(afterReload)}`,
  );
  assert(
    afterReload.companySectionCount === 1 && afterReload.foundationInside &&
      afterReload.semanticsInside && afterReload.hasCompanyMarker,
    "Unified company frame did not survive reload",
  );
  assert(
    afterReload.productSectionCount === 1 &&
      JSON.stringify(afterReload.product) === JSON.stringify(expectedProduct),
    `Product 3/3 path changed after reload: ${JSON.stringify(afterReload.product)}`,
  );
  assert(
    afterReload.errors.length === 0,
    `Browser errors: ${afterReload.errors.join(" | ")}`,
  );

  console.log(JSON.stringify({
    transitions: {
      zero: setup.first.completion,
      partialStrategy: partialStrategy.completion,
      one: oneOfThree.completion,
      two: twoOfThree.completion,
      three: threeOfThree.completion,
    },
    frame: {
      title: threeOfThree.title,
      sectionCount: threeOfThree.sectionCount,
      hasFrame: threeOfThree.hasFrame,
      foundationInside: threeOfThree.foundationInside,
      semanticsInside: threeOfThree.semanticsInside,
      screenshot,
    },
    toggle,
    productControl: expectedProduct,
    afterReload,
  }, null, 2));
  console.log("gate1 company unified container smoke: OK");
} finally {
  page.close();
  await browser.call("Target.closeTarget", { targetId }).catch(() => {});
  await browser.call("Target.disposeBrowserContext", { browserContextId }).catch(() => {});
  browser.close();
}
