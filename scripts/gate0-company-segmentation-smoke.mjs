import { writeFile } from "node:fs/promises";

const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9361";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const projectId = "gate0-company-segmentation-v309-smoke";
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
    'typeof bootstrapAppOnce === "function" && typeof guruV309ProjectSegmentRecord === "function"',
  );

  await evaluate(page, `(() => {
    const workspace = structuredClone(window.GURU_SEED);
    workspace.project.id = ${JSON.stringify(projectId)};
    workspace.project.name = "Gate 0 company segmentation smoke";
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
  await waitFor(page, 'Boolean(state) && typeof guruV309CompanySegmentationHtml === "function"');

  const initial = await evaluate(page, `(() => {
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};
    const gate0 = state.gates.find((gate) => gate.id === "gate-0");
    const segmentCardIndex = gate0.cards.findIndex((card) =>
      card.id === "gate0-company-segmentation"
    );
    const positioningIndex = gate0.cards.findIndex((card) =>
      card.id === "gate0-company-positioning"
    );
    const brandPurposeIndex = gate0.cards.findIndex((card) =>
      card.id === "gate0-company-brand-purpose"
    );
    const projectRecordCount = guruV194ExactRecords(
      "segments", "project", null, state
    ).length;
    activeGateId = "gate-0";
    renderGate();
    const card = document.querySelector(
      '[data-card-row="gate0-company-segmentation"]'
    );
    return {
      projectRecordCount,
      segmentCardIndex,
      brandPurposeIndex,
      positioningIndex,
      fieldCount: card?.querySelectorAll(
        "[data-gate0-company-segmentation-field]"
      ).length || 0,
      cardVisible: Boolean(card),
      noProductRequired: !guruV194SelectedProduct(state),
      otherGateCardIds: state.gates
        .filter((gate) => gate.id !== "gate-0")
        .map((gate) => [gate.id, gate.cards.map((item) => item.id)]),
    };
  })()`);

  assert(initial.projectRecordCount === 0, "Opening the card created a project segment record");
  assert(initial.cardVisible, "Company segmentation card is not visible in Gate 0");
  assert(initial.fieldCount === 6, "Company segmentation card must contain five parts and one unified field");
  assert(initial.noProductRequired, "Company segmentation card unexpectedly requires a product");
  assert(
    initial.brandPurposeIndex + 1 === initial.segmentCardIndex &&
      initial.segmentCardIndex + 1 === initial.positioningIndex,
    "Company segmentation, brand purpose and positioning order is wrong",
  );

  const afterCompanyInput = await evaluate(page, `(() => {
    const values = {
      geography: "Москва и Московская область",
      demographics: "Женщины 25–40 лет",
      psychographics: "Ценят индивидуальность",
      behavior: "Сравнивают предложения и читают отзывы",
      need_response: "Реагируют на персонализацию"
    };
    Object.entries(values).forEach(([key, value]) => {
      const input = document.querySelector(
        '[data-gate0-company-segmentation-field="' + key + '"]'
      );
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const beforeUnified = guruStrategicFoundationContextCompanyV310(state);
    const statusBeforeUnified = state.gates.find((gate) => gate.id === "gate-0").cards.find(
      (item) => item.id === "gate0-company-segmentation"
    )?.status || "";
    const unified = "Женщины 25–40 лет из Москвы, выбирающие персонализированные вещи";
    const unifiedInput = document.querySelector(
      '[data-gate0-company-segmentation-field="unified"]'
    );
    unifiedInput.value = unified;
    unifiedInput.dispatchEvent(new Event("input", { bubbles: true }));
    const records = guruV194ExactRecords("segments", "project", null, state);
    const record = records[0];
    const card = state.gates.find((gate) => gate.id === "gate-0").cards.find(
      (item) => item.id === "gate0-company-segmentation"
    );
    return {
      recordCount: records.length,
      scope: record?.scope || "",
      productId: record?.product_id || "",
      unified: record?.value || "",
      parts: guruV194SegmentParts(record || {}),
      status: card?.status || "",
      statusBeforeUnified,
      targetAudienceBeforeUnified: beforeUnified.fields.targetAudience.value,
      targetAudience: guruStrategicFoundationContextCompanyV310(state).fields.targetAudience,
    };
  })()`);

  assert(afterCompanyInput.recordCount === 1, "First input did not create exactly one record");
  assert(afterCompanyInput.scope === "project", "Company segment scope is not project");
  assert(afterCompanyInput.productId === "", "Company segment unexpectedly has product_id");
  assert(
    afterCompanyInput.statusBeforeUnified === "in_progress",
    "Five source parts incorrectly made the card ready without a unified value",
  );
  assert(
    afterCompanyInput.targetAudienceBeforeUnified === "",
    "Strategic Target Audience still auto-joins the five source parts",
  );
  assert(
    afterCompanyInput.unified ===
      "Женщины 25–40 лет из Москвы, выбирающие персонализированные вещи",
    "Unified company segment was not stored in record.value",
  );
  assert(afterCompanyInput.status === "ready", "Six filled fields must make the card ready");
  assert(
    afterCompanyInput.targetAudience.value === afterCompanyInput.unified &&
      afterCompanyInput.targetAudience.target.field === "unified",
    "Strategic Target Audience does not read or point to the unified segment",
  );

  await evaluate(page, `(() => {
    document.querySelector(
      '[data-card-row="gate0-company-segmentation"]'
    )?.scrollIntoView({ block: "start" });
    return true;
  })()`);
  await wait(150);
  const screenshot = await page.call("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
  });
  await writeFile(
    "artifacts/gate0-company-segmentation-v309.png",
    Buffer.from(screenshot.data, "base64"),
  );

  const oldEntry = await evaluate(page, `(() => {
    const category = guruV189CreateCategory("Сувениры", state);
    const product = {
      id: "gate0-company-segmentation-product-v309",
      name: "Коза",
      categoryId: category.id,
      continuum: "pure_product",
      createdAt: new Date().toISOString()
    };
    guruV189CatalogItems(state).push(product);
    const ui = guruV194Ui(state);
    ui.selectedCategoryId = category.id;
    ui.selectedProductId = product.id;
    guruV194CommonMeta(product, state).scope = "project";
    renderGate();
    const oldInput = document.querySelector(
      '[data-card-row="card-2"] [data-gate0-scope-record-field="segment_demographics"]'
    );
    const visibleBefore = oldInput?.value || "";
    oldInput.value = "Женщины и мужчины 25–40 лет";
    oldInput.dispatchEvent(new Event("input", { bubbles: true }));
    const records = guruV194ExactRecords("segments", "project", null, state);
    saveState();
    return {
      visibleBefore,
      storedAfter: guruV194SegmentParts(records[0] || {}).demographics,
      recordCount: records.length,
      otherGateCardIds: state.gates
        .filter((gate) => gate.id !== "gate-0")
        .map((gate) => [gate.id, gate.cards.map((item) => item.id)]),
    };
  })()`);

  assert(oldEntry.visibleBefore === "Женщины 25–40 лет", "Old product entry cannot read company value");
  assert(
    oldEntry.storedAfter === "Женщины и мужчины 25–40 лет",
    "Old product entry cannot update the shared company record",
  );
  assert(oldEntry.recordCount === 1, "Old product entry duplicated the company record");
  assert(
    JSON.stringify(oldEntry.otherGateCardIds) === JSON.stringify(initial.otherGateCardIds),
    "Another gate card structure changed",
  );

  await evaluate(page, "location.reload(); true");
  await waitFor(
    page,
    'typeof state !== "undefined" && Boolean(state) && activeProjectId === ' +
      JSON.stringify(projectId),
  );
  const afterReload = await evaluate(page, `(() => {
    const records = guruV194ExactRecords("segments", "project", null, state);
    const record = records[0];
    const gate0 = state.gates.find((gate) => gate.id === "gate-0");
    return {
      recordCount: records.length,
      productId: record?.product_id || "",
      demographics: guruV194SegmentParts(record || {}).demographics,
      unified: record?.value || "",
      targetAudience: guruStrategicFoundationContextCompanyV310(state)
        .fields.targetAudience.value,
      cardCount: gate0.cards.filter((card) =>
        card.id === "gate0-company-segmentation"
      ).length,
      errors: window.__guruErrors,
    };
  })()`);

  assert(afterReload.recordCount === 1, "Company segment did not persist after reload");
  assert(afterReload.productId === "", "Persisted company segment acquired product_id");
  assert(
    afterReload.demographics === "Женщины и мужчины 25–40 лет",
    "Value changed after reload",
  );
  assert(
    afterReload.targetAudience === afterReload.unified &&
      !afterReload.targetAudience.includes("География:"),
    "Target Audience reverted to labelled auto-concatenation after reload",
  );
  assert(afterReload.cardCount === 1, "Company segmentation card duplicated after reload");
  assert(afterReload.errors.length === 0, `Browser errors: ${afterReload.errors.join(" | ")}`);

  console.log(JSON.stringify({ initial, afterCompanyInput, oldEntry, afterReload }, null, 2));
  console.log("gate0 company segmentation smoke: OK");
} finally {
  page.close();
  await browser.call("Target.closeTarget", { targetId }).catch(() => {});
  await browser.call("Target.disposeBrowserContext", { browserContextId }).catch(() => {});
  browser.close();
}
