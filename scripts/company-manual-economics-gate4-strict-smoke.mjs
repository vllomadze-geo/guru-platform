import { writeFile } from "node:fs/promises";

const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9362";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const projectId = "company-manual-economics-gate4-strict-smoke";
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

async function screenshot(page, path, clip) {
  await wait(150);
  const image = await page.call("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    ...(clip ? { clip } : {}),
  });
  await writeFile(path, Buffer.from(image.data, "base64"));
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
  await waitFor(page, 'typeof bootstrapAppOnce === "function"');

  await evaluate(page, `(() => {
    const workspace = structuredClone(window.GURU_SEED);
    workspace.project.id = ${JSON.stringify(projectId)};
    workspace.project.name = "Company manual economics smoke";
    workspace.project.averageCheck = "";
    workspace.project.targetCpa = "";
    workspace.demandRoute = {
      ...(workspace.demandRoute || {}),
      targetCpa: "9090"
    };
    workspace.unitV130 = {
      items: [{
        product_id: "foreign-product",
        productKey: "foreign-product",
        name: "Чужой товар",
        steps: {
          revenue: { avgCheck: "8080", unitPrice: "8080" },
          adLimits: { allowedCpa: "6060", allowedCpl: "5050" }
        }
      }]
    };
    workspace.projectComparison = null;
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
    'typeof state !== "undefined" && Boolean(state) && typeof projectPassportOverviewFields === "function"',
  );

  const passport = await evaluate(page, `(() => {
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};
    renderProject();
    const averageCheck = document.querySelector('[data-project="averageCheck"]');
    const targetCpa = document.querySelector('[data-project="targetCpa"]');
    const before = {
      averageCheck: averageCheck?.value || "",
      targetCpa: targetCpa?.value || "",
      averageReadonly: averageCheck?.readOnly,
      targetReadonly: targetCpa?.readOnly,
      overviewHasForeign: document.querySelector(".project-overview")
        ?.textContent.includes("8080") || false,
      overviewHasDemandFallback: document.querySelector(".project-overview")
        ?.textContent.includes("9090") || false,
    };
    averageCheck.value = "5600";
    averageCheck.dispatchEvent(new Event("input", { bubbles: true }));
    targetCpa.value = "1400";
    targetCpa.dispatchEvent(new Event("input", { bubbles: true }));
    renderProject();
    document.querySelector('[data-project="averageCheck"]')
      ?.scrollIntoView({ block: "center" });
    return {
      before,
      storedAverageCheck: state.project.averageCheck,
      storedTargetCpa: state.project.targetCpa,
      sourceLabels: [averageCheck, targetCpa].map((input) =>
        input.closest(".project-overview-field")?.querySelector("small")?.textContent.trim() || ""
      ),
    };
  })()`);

  assert(passport.before.averageCheck === "", "Passport average check used a product fallback");
  assert(passport.before.targetCpa === "", "Passport target CPA used a demand/product fallback");
  assert(!passport.before.averageReadonly && !passport.before.targetReadonly, "Passport company fields are readonly");
  assert(!passport.before.overviewHasForeign, "Passport rendered foreign product economics");
  assert(!passport.before.overviewHasDemandFallback, "Passport rendered demandRoute.targetCpa");
  assert(passport.storedAverageCheck === "5600", "Passport average check did not save to project.averageCheck");
  assert(passport.storedTargetCpa === "1400", "Passport target CPA did not save to project.targetCpa");
  assert(
    passport.sourceLabels.every((label) => label.includes("уровень компании")),
    "Passport fields do not identify the company-level source",
  );

  await wait(700);
  await screenshot(page, "artifacts/company-manual-economics-passport.png");

  const comparison = await evaluate(page, `(() => {
    activeGateId = "gate-1";
    renderGate();
    const model = ensureProjectComparison();
    const priceCriterion = projectComparisonCompanyCriteria(model).find(
      (criterion) => criterion.coreKey === "price"
    );
    const inputSelector = '[data-project-comparison-cell="' + priceCriterion.id + '"]' +
      '[data-project-comparison-owner="our-project"]';
    const input = document.querySelector(inputSelector);
    const before = {
      value: input?.value || "",
      readonly: input?.readOnly,
      containsPassportAverage: input?.value.includes("5600") || false,
      containsForeignAverage: input?.value.includes("8080") || false,
      manualLabel: input?.closest("td")?.querySelector(".project-comparison-auto")
        ?.textContent.trim() || "",
    };
    input.value = "от 4 500 ₽";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    const currentInput = document.querySelector(inputSelector);
    currentInput?.closest(".project-comparison-body")?.removeAttribute("hidden");
    currentInput?.closest(".g1-section-body")?.removeAttribute("hidden");
    const row = currentInput?.closest("tr");
    row?.scrollIntoView({ block: "center" });
    return {
      before,
      stored: projectComparisonCell(priceCriterion, "our-project").text,
      statusIncludesManualPrice:
        projectComparisonStatus(model).filled > projectComparisonStatus({
          ...model,
          criteria: model.criteria.map((criterion) =>
            criterion.id === priceCriterion.id
              ? { ...criterion, cells: { ...criterion.cells, "our-project": { text: "" } } }
              : criterion
          )
        }).filled,
      gate1CardIds: state.gates.find((gate) => gate.id === "gate-1").cards.map((card) => card.id),
      otherGateCardIds: state.gates
        .filter((gate) => gate.id !== "gate-1")
        .map((gate) => [gate.id, gate.cards.map((card) => card.id)]),
    };
  })()`);

  assert(comparison.before.value === "", "Company comparison price used an automatic fallback");
  assert(!comparison.before.readonly, "Company comparison price is readonly");
  assert(!comparison.before.containsPassportAverage, "Company comparison price reused passport average check");
  assert(!comparison.before.containsForeignAverage, "Company comparison price reused foreign product economics");
  assert(comparison.before.manualLabel.includes("Ввод вручную"), "Company comparison price lacks manual-source label");
  assert(comparison.stored === "от 4 500 ₽", "Company comparison price did not save in the own-project cell");
  assert(comparison.statusIncludesManualPrice, "Company comparison status ignores the manual price");

  await wait(700);
  await evaluate(page, `(() => {
    const model = ensureProjectComparison();
    const priceCriterion = projectComparisonCompanyCriteria(model).find(
      (criterion) => criterion.coreKey === "price"
    );
    const currentInput = document.querySelector(
      '[data-project-comparison-cell="' + priceCriterion.id + '"]' +
      '[data-project-comparison-owner="our-project"]'
    );
    currentInput?.closest(".project-comparison-body")?.removeAttribute("hidden");
    currentInput?.closest(".g1-section-body")?.removeAttribute("hidden");
    const row = currentInput?.closest("tr");
    if (row) {
      const absoluteTop = window.scrollY + row.getBoundingClientRect().top;
      window.scrollTo(0, Math.max(0, absoluteTop - window.innerHeight / 2));
    }
    return Boolean(row);
  })()`);
  await screenshot(page, "artifacts/company-manual-price-comparison.png");

  const gate4 = await evaluate(page, `(() => {
    const originalSelected = g4ProductPickSelected;
    const originalSnapshot = uv130EconomicsSnapshot;
    const calls = [];
    state.unitV130.items = [
      {
        product_id: "foreign-product",
        productKey: "foreign-product",
        name: "Чужой товар",
        steps: {
          revenue: { avgCheck: "8080", unitPrice: "8080" },
          adLimits: { allowedCpa: "6060", allowedCpl: "5050" }
        }
      },
      {
        product_id: "target-product",
        productKey: "legacy-name-must-not-match",
        name: "Другой display name",
        steps: {
          revenue: { avgCheck: "4242", unitPrice: "4242" },
          adLimits: { allowedCpa: "2121", allowedCpl: "1111" },
          ltv: { ltv: "9999" }
        }
      }
    ];
    uv130EconomicsSnapshot = function (product, options) {
      calls.push({ product, productIdOnly: options?.productIdOnly === true });
      return originalSnapshot(product, options);
    };
    g4ProductPickSelected = () => null;
    const emptyOffer = g4OfferHtml();
    const emptyLaunch = g4LaunchParamsHtml();
    const emptyCallCount = calls.length;
    g4ProductPickSelected = () => ({ id: "target-product" });
    const exactOffer = g4OfferHtml();
    const exactLaunch = g4LaunchParamsHtml();
    g4ProductPickSelected = originalSelected;
    uv130EconomicsSnapshot = originalSnapshot;
    return {
      emptyCallCount,
      emptyContainsForeign: (emptyOffer + emptyLaunch).includes("8080") ||
        (emptyOffer + emptyLaunch).includes("6060"),
      exactContainsTarget: exactOffer.includes("4242") &&
        exactOffer.includes("2121") &&
        exactLaunch.includes("4242") &&
        exactLaunch.includes("2121"),
      exactContainsForeign: (exactOffer + exactLaunch).includes("8080") ||
        (exactOffer + exactLaunch).includes("6060"),
      calls,
    };
  })()`);

  assert(gate4.emptyCallCount === 0, "Legacy Gate 4 called economics without a product ID");
  assert(!gate4.emptyContainsForeign, "Legacy Gate 4 rendered foreign economics with no product ID");
  assert(gate4.exactContainsTarget, "Legacy Gate 4 did not render exact product_id economics");
  assert(!gate4.exactContainsForeign, "Legacy Gate 4 rendered foreign economics instead of exact product_id");
  assert(
    gate4.calls.length === 2 &&
      gate4.calls.every((call) =>
        call.product === "target-product" && call.productIdOnly
      ),
    "Legacy Gate 4 did not use strict productIdOnly calls",
  );

  await evaluate(page, "location.reload(); true");
  await waitFor(
    page,
    'typeof state !== "undefined" && Boolean(state) && activeProjectId === ' +
      JSON.stringify(projectId),
  );
  const afterReload = await evaluate(page, `(() => {
    renderProject();
    const averageCheck = document.querySelector('[data-project="averageCheck"]')?.value || "";
    const targetCpa = document.querySelector('[data-project="targetCpa"]')?.value || "";
    activeGateId = "gate-1";
    renderGate();
    const model = ensureProjectComparison();
    const priceCriterion = projectComparisonCompanyCriteria(model).find(
      (criterion) => criterion.coreKey === "price"
    );
    const price = projectComparisonCell(priceCriterion, "our-project").text;
    return {
      averageCheck,
      targetCpa,
      price,
      gate1CardIds: state.gates.find((gate) => gate.id === "gate-1").cards.map((card) => card.id),
      otherGateCardIds: state.gates
        .filter((gate) => gate.id !== "gate-1")
        .map((gate) => [gate.id, gate.cards.map((card) => card.id)]),
      errors: window.__guruErrors,
    };
  })()`);

  assert(afterReload.averageCheck === "5600", "Passport average check changed after hard reload");
  assert(afterReload.targetCpa === "1400", "Passport target CPA changed after hard reload");
  assert(afterReload.price === "от 4 500 ₽", "Company comparison price changed after hard reload");
  assert(
    JSON.stringify(afterReload.gate1CardIds) === JSON.stringify(comparison.gate1CardIds),
    "Gate 1 card structure changed",
  );
  assert(
    JSON.stringify(afterReload.otherGateCardIds) === JSON.stringify(comparison.otherGateCardIds),
    "Another gate card structure changed",
  );
  assert(afterReload.errors.length === 0, `Browser errors: ${afterReload.errors.join(" | ")}`);

  console.log(JSON.stringify({ passport, comparison, gate4, afterReload }, null, 2));
  console.log("company manual economics + Gate 4 strict smoke: OK");
} finally {
  page.close();
  await browser.call("Target.closeTarget", { targetId }).catch(() => {});
  await browser.call("Target.disposeBrowserContext", { browserContextId }).catch(() => {});
  browser.close();
}
