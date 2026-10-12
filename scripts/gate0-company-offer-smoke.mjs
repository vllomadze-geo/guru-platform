import { writeFile } from "node:fs/promises";

const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9367";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const projectId = "gate0-company-offer-v347-smoke";
const productId = "gate0-company-offer-product-v347";
const fallbackProductId = "gate0-company-offer-fallback-v347";
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
    }`,
  });
  await page.call("Page.navigate", { url: appUrl });
  await waitFor(page, 'document.readyState === "complete"');
  await waitFor(
    page,
    'typeof bootstrapAppOnce === "function" && typeof guruV347ProjectCompanyOfferRecord === "function"',
  );

  await evaluate(page, `(() => {
    const workspace = structuredClone(window.GURU_SEED);
    workspace.project.id = ${JSON.stringify(projectId)};
    workspace.project.name = "Gate 0 company offer smoke";
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
    'typeof state !== "undefined" && Boolean(state) && typeof guruV347CompanyOfferHtml === "function"',
  );

  const initial = await evaluate(page, `(() => {
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};
    activeGateId = "gate-0";
    renderGate();
    const gate0 = state.gates.find((gate) => gate.id === "gate-0");
    const card = document.querySelector('[data-card-row="gate0-company-offer"]');
    const offerIndex = gate0.cards.findIndex((item) => item.id === "gate0-company-offer");
    const positioningIndex = gate0.cards.findIndex((item) => item.id === "gate0-company-positioning");
    return {
      companyRecordCount: guruV194ExactRecords("company_offer", "project", null, state).length,
      cardCount: gate0.cards.filter((item) => item.id === "gate0-company-offer").length,
      cardVisible: Boolean(card),
      fieldCount: card?.querySelectorAll("[data-gate0-company-offer-field]").length || 0,
      status: gate0.cards[offerIndex]?.status || "",
      badge: card?.querySelector(".gate0-card-status")?.textContent.trim() || "",
      orderCorrect: offerIndex === positioningIndex + 1,
      productAllowlistHasCompanyOffer: GURU_GATE0_SCOPE_FIELDS_V194.some(([key]) => key === "company_offer"),
      companyAllowlistHasCompanyOffer: GURU_GATE0_COMPANY_SCOPE_FIELDS_V347.some(([key]) => key === "company_offer"),
    };
  })()`);

  assert(initial.companyRecordCount === 0, "Opening Gate 0 created a company_offer record");
  assert(initial.cardCount === 1 && initial.cardVisible, "Company offer card is missing or duplicated");
  assert(initial.fieldCount === 5, "Company offer card must contain all five inputs");
  assert(initial.status === "not_started" && initial.badge === "Не начато", "Initial status is wrong");
  assert(initial.orderCorrect, "Company offer card is not immediately after company positioning");
  assert(!initial.productAllowlistHasCompanyOffer, "company_offer leaked into the product allowlist");
  assert(initial.companyAllowlistHasCompanyOffer, "company_offer is absent from the company allowlist");

  const seededOffers = await evaluate(page, `(() => {
    const category = guruV189CreateCategory("Сувениры", state);
    const now = new Date().toISOString();
    const product = {
      id: ${JSON.stringify(productId)},
      name: "Коза",
      categoryId: category.id,
      continuum: "pure_product",
      createdAt: now
    };
    const fallbackProduct = {
      id: ${JSON.stringify(fallbackProductId)},
      name: "Лиса",
      categoryId: category.id,
      continuum: "pure_product",
      createdAt: now
    };
    guruV189CatalogItems(state).push(product, fallbackProduct);
    guruV194Records(state).push(
      {
        id: "offer-product-v347-smoke",
        project_id: ${JSON.stringify(projectId)},
        category_id: category.id,
        product_id: product.id,
        scope: "product",
        field: "offers",
        value: "Товарный оффер Козы",
        offer: { rational: "Выгода", irrational: "Эмоция", social: "Доверие", cta: "Купить Козу", legacy_value: "" },
        source: { type: "manual", label: "Товарный smoke" },
        confirmation_status: "confirmed",
        created_at: now,
        updated_at: now
      },
      {
        id: "offer-project-v347-smoke",
        project_id: ${JSON.stringify(projectId)},
        category_id: "",
        product_id: "",
        scope: "project",
        field: "offers",
        value: "Старый общий товарный оффер",
        offer: { rational: "", irrational: "", social: "", cta: "Смотреть товары", legacy_value: "" },
        source: { type: "manual", label: "Общий товарный smoke" },
        confirmation_status: "confirmed",
        created_at: now,
        updated_at: now
      }
    );
    const ui = guruV194Ui(state);
    ui.selectedCategoryId = category.id;
    ui.selectedProductId = product.id;
    guruV194CommonMeta(product, state).scope = "product";
    guruV194SyncLegacy(state);
    renderGate();
    const productOffer = guruV194ExactRecords("offers", "product", product, state)[0];
    const projectOffer = guruV194ExactRecords("offers", "project", null, state)[0];
    return {
      categoryId: category.id,
      productOffer: { value: productOffer.value, cta: guruV194OfferParts(productOffer).cta },
      projectOffer: { value: projectOffer.value, cta: guruV194OfferParts(projectOffer).cta },
      companyRecordCount: guruV194ExactRecords("company_offer", "project", null, state).length,
    };
  })()`);

  assert(seededOffers.companyRecordCount === 0, "Product setup created a company offer");

  const partial = await evaluate(page, `(() => {
    const input = document.querySelector('[data-gate0-company-offer-field="offer"]');
    input.value = "Познакомьтесь с мастерской и найдите близкую вам историю";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    const card = state.gates.find((gate) => gate.id === "gate-0").cards.find(
      (item) => item.id === "gate0-company-offer"
    );
    return {
      recordCount: guruV194ExactRecords("company_offer", "project", null, state).length,
      status: card?.status || "",
      badge: document.querySelector('[data-card-row="gate0-company-offer"] .gate0-card-status')?.textContent.trim() || "",
    };
  })()`);

  assert(partial.recordCount === 1, "First input did not create exactly one company offer record");
  assert(partial.status === "in_progress" && partial.badge === "В работе", "Partial live status is wrong");

  const completed = await evaluate(page, `(() => {
    const lenses = {
      rational: "Понятный способ познакомиться с подходом",
      irrational: "Уверенность в осмысленном выборе",
      social: "Истории и отзывы покупателей"
    };
    Object.entries(lenses).forEach(([key, value]) => {
      const lensInput = document.querySelector(
        '[data-gate0-company-offer-field="' + key + '"]'
      );
      lensInput.value = value;
      lensInput.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const input = document.querySelector('[data-gate0-company-offer-field="cta"]');
    input.value = "Посмотреть истории вещей";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    const companyRecord = guruV194ExactRecords("company_offer", "project", null, state)[0];
    const product = guruV194Product(${JSON.stringify(productId)}, state);
    const fallbackProduct = guruV194Product(${JSON.stringify(fallbackProductId)}, state);
    const productOffer = guruV194ExactRecords("offers", "product", product, state)[0];
    const projectOffer = guruV194ExactRecords("offers", "project", null, state)[0];
    const card = state.gates.find((gate) => gate.id === "gate-0").cards.find(
      (item) => item.id === "gate0-company-offer"
    );
    return {
      recordCount: guruV194ExactRecords("company_offer", "project", null, state).length,
      scope: companyRecord?.scope || "",
      categoryId: companyRecord?.category_id || "",
      productId: companyRecord?.product_id || "",
      offer: companyRecord?.value || "",
      lenses: {
        rational: guruV194OfferParts(companyRecord || {}).rational,
        irrational: guruV194OfferParts(companyRecord || {}).irrational,
        social: guruV194OfferParts(companyRecord || {}).social,
      },
      cta: guruV194OfferParts(companyRecord || {}).cta,
      status: card?.status || "",
      badge: document.querySelector('[data-card-row="gate0-company-offer"] .gate0-card-status')?.textContent.trim() || "",
      productOffer: { value: productOffer.value, cta: guruV194OfferParts(productOffer).cta },
      projectOffer: { value: projectOffer.value, cta: guruV194OfferParts(projectOffer).cta },
      productResolvedIds: guruV194Resolve("offers", product, state).records.map((record) => record.id),
      fallbackResolvedIds: guruV194Resolve("offers", fallbackProduct, state).records.map((record) => record.id),
    };
  })()`);

  assert(completed.recordCount === 1, "Second input duplicated the company offer record");
  assert(completed.scope === "project" && !completed.categoryId && !completed.productId, "Company offer scope is not strictly project-only");
  assert(completed.status === "ready" && completed.badge === "Готово", "Completed live status is wrong");
  assert(Object.values(completed.lenses).every(Boolean), "Company offer lenses were not saved");
  assert(JSON.stringify(completed.productOffer) === JSON.stringify(seededOffers.productOffer), "Product offer changed after company input");
  assert(JSON.stringify(completed.projectOffer) === JSON.stringify(seededOffers.projectOffer), "Existing project offers changed after company input");
  assert(JSON.stringify(completed.productResolvedIds) === JSON.stringify(["offer-product-v347-smoke"]), "Product resolver started reading company_offer");
  assert(JSON.stringify(completed.fallbackResolvedIds) === JSON.stringify(["offer-project-v347-smoke"]), "Project offer fallback started reading company_offer");

  await evaluate(page, `(() => {
    document.querySelector('[data-card-row="gate0-company-offer"]')?.scrollIntoView({ block: "start" });
    return true;
  })()`);
  await wait(150);
  const screenshot = await page.call("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
  });
  await writeFile(
    "artifacts/gate0-company-offer-v347.png",
    Buffer.from(screenshot.data, "base64"),
  );

  const productScopeIsolation = await evaluate(page, `(() => {
    const product = guruV194Product(${JSON.stringify(productId)}, state);
    guruV194Ui(state).selectedProductId = product.id;
    guruV194Ui(state).selectedCategoryId = product.categoryId;
    guruV194CommonMeta(product, state).scope = "project";
    renderGate();
    const productCard = document.querySelector('[data-card-row="card-2"]');
    const companyRecordBefore = guruV194ExactRecords("company_offer", "project", null, state)[0];
    const sourceBefore = companyRecordBefore.source?.label || "";
    const sourceInput = productCard?.querySelector('[data-gate0-common-meta-field="source"]');
    if (sourceInput) {
      sourceInput.value = "Изменено через продуктовый scope";
      sourceInput.dispatchEvent(new Event("input", { bubbles: true }));
    }
    const companyRecordAfter = guruV194ExactRecords("company_offer", "project", null, state)[0];
    const productOffer = guruV194ExactRecords("offers", "product", product, state)[0];
    const projectOffer = guruV194ExactRecords("offers", "project", null, state)[0];
    return {
      renderedFieldKeys: [...(productCard?.querySelectorAll("[data-gate0-scope-field-row]") || [])]
        .map((node) => node.dataset.gate0ScopeFieldRow),
      companyFieldSectionCount: productCard?.querySelectorAll('[data-gate0-scope-field-row="company_offer"]').length || 0,
      companyInputCount: productCard?.querySelectorAll("[data-gate0-company-offer-field]").length || 0,
      companyRecordCount: guruV194ExactRecords("company_offer", "project", null, state).length,
      companySourceBefore: sourceBefore,
      companySourceAfter: companyRecordAfter.source?.label || "",
      companyInProductOverrides: Object.prototype.hasOwnProperty.call(
        state.project.productScopedOverridesV194?.[product.id] || {},
        "company_offer"
      ),
      productOffer: { value: productOffer.value, cta: guruV194OfferParts(productOffer).cta },
      projectOffer: { value: projectOffer.value, cta: guruV194OfferParts(projectOffer).cta },
    };
  })()`);

  assert(!productScopeIsolation.renderedFieldKeys.includes("company_offer"), "Product field list contains company_offer");
  assert(productScopeIsolation.companyFieldSectionCount === 0, "Product scope rendered a company_offer section");
  assert(productScopeIsolation.companyInputCount === 0, "Product scope rendered a company offer input");
  assert(productScopeIsolation.companyRecordCount === 1, "Product scope duplicated or removed the company offer");
  assert(productScopeIsolation.companySourceBefore === productScopeIsolation.companySourceAfter, "Product common-meta editor changed the company offer");
  assert(!productScopeIsolation.companyInProductOverrides, "company_offer leaked into productScopedOverridesV194");
  assert(JSON.stringify(productScopeIsolation.productOffer) === JSON.stringify(seededOffers.productOffer), "Product offer changed in product scope isolation test");
  assert(JSON.stringify(productScopeIsolation.projectOffer) === JSON.stringify(seededOffers.projectOffer), "Project offer content changed in product scope isolation test");

  // Wait for the real debounced autosave triggered by the input handlers;
  // the reload below must not rely on a direct saveState() call from the test.
  await wait(800);
  await evaluate(page, "location.reload(); true");
  await waitFor(
    page,
    'typeof state !== "undefined" && Boolean(state) && activeProjectId === ' +
      JSON.stringify(projectId),
  );
  const afterReload = await evaluate(page, `(() => {
    activeGateId = "gate-0";
    renderGate();
    const companyRecord = guruV194ExactRecords("company_offer", "project", null, state)[0];
    const product = guruV194Product(${JSON.stringify(productId)}, state);
    const fallbackProduct = guruV194Product(${JSON.stringify(fallbackProductId)}, state);
    const gate0 = state.gates.find((gate) => gate.id === "gate-0");
    const productCard = document.querySelector('[data-card-row="card-2"]');
    return {
      recordCount: guruV194ExactRecords("company_offer", "project", null, state).length,
      offer: companyRecord?.value || "",
      lenses: {
        rational: guruV194OfferParts(companyRecord || {}).rational,
        irrational: guruV194OfferParts(companyRecord || {}).irrational,
        social: guruV194OfferParts(companyRecord || {}).social,
      },
      cta: guruV194OfferParts(companyRecord || {}).cta,
      scope: companyRecord?.scope || "",
      productId: companyRecord?.product_id || "",
      cardCount: gate0.cards.filter((card) => card.id === "gate0-company-offer").length,
      cardStatus: gate0.cards.find((card) => card.id === "gate0-company-offer")?.status || "",
      productCompanyFieldCount: productCard?.querySelectorAll('[data-gate0-scope-field-row="company_offer"]').length || 0,
      productOffer: guruV194Resolve("offers", product, state).records.map((record) => ({ id: record.id, value: record.value, cta: guruV194OfferParts(record).cta })),
      fallbackOffer: guruV194Resolve("offers", fallbackProduct, state).records.map((record) => ({ id: record.id, value: record.value, cta: guruV194OfferParts(record).cta })),
      errors: window.__guruErrors,
    };
  })()`);

  assert(afterReload.recordCount === 1, "Company offer did not persist exactly once after hard reload");
  assert(afterReload.offer === completed.offer && afterReload.cta === completed.cta, "Company offer values changed after hard reload");
  assert(JSON.stringify(afterReload.lenses) === JSON.stringify(completed.lenses), "Company offer lenses changed after hard reload");
  assert(afterReload.scope === "project" && !afterReload.productId, "Company offer lost project-only scope after reload");
  assert(afterReload.cardCount === 1 && afterReload.cardStatus === "ready", "Company card status or identity changed after reload");
  assert(afterReload.productCompanyFieldCount === 0, "company_offer appeared in product scope after reload");
  assert(afterReload.productOffer.length === 1 && afterReload.productOffer[0].id === "offer-product-v347-smoke", "Product offer resolver changed after reload");
  assert(afterReload.fallbackOffer.length === 1 && afterReload.fallbackOffer[0].id === "offer-project-v347-smoke", "Project offer fallback changed after reload");
  assert(afterReload.errors.length === 0, `Browser errors: ${afterReload.errors.join(" | ")}`);

  console.log(JSON.stringify({ initial, seededOffers, partial, completed, productScopeIsolation, afterReload }, null, 2));
  console.log("gate0 company offer smoke: OK");
} finally {
  page.close();
  await browser.call("Target.closeTarget", { targetId }).catch(() => {});
  await browser.call("Target.disposeBrowserContext", { browserContextId }).catch(() => {});
  browser.close();
}
