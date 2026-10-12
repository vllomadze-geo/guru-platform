const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9356";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const expectedSeoKeys = [
  "canonical-redirects",
  "keyword-foundations",
  "project-comparison",
  "seo-snippet",
  "site-audit",
  "webmaster-company",
  "webmaster-product",
];

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
      response.exceptionDetails.exception?.description || response.exceptionDetails.text,
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
  await waitFor(page, 'typeof bootstrapAppOnce === "function" && typeof gate1SeoInteractiveToolStoreV305 === "function"');
  await evaluate(page, `(() => {
    const workspace = structuredClone(window.GURU_SEED);
    workspace.project.id = "gate1-seo-interactive-tool-v305-smoke";
    workspace.project.name = "Gate 1 SEO interactive tool smoke";
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
  await waitFor(page, 'Boolean(state) && typeof gate1SeoInteractiveToolInjectV305 === "function"');

  const setup = await evaluate(page, `(() => {
    activeGateId = "gate-1";
    renderGate();
    const gate1 = state.gates.find((gate) => gate.id === "gate-1");
    window.__seoToolBeforeV305 = {
      cards: JSON.stringify(gate1.cards),
      otherGates: JSON.stringify(state.gates.filter((gate) => gate.id !== "gate-1")),
      explanationKeys: Object.keys(GATE1_SEO_EXPLANATIONS_V297).sort(),
    };
    return { cardCount: gate1.cards.length };
  })()`);
  await waitFor(page, 'document.querySelector("[data-g1-seo-interactive-tool-v305]")');

  const initial = await evaluate(page, `(() => {
    const root = document.querySelector(".g1-redesign");
    const companySeo = root.querySelector(':scope > [data-g1-company-block-v299="seo-audit"]');
    const card = companySeo?.querySelector('[data-g1-seo-interactive-tool-v305]');
    return {
      oneInstance: root.querySelectorAll('[data-g1-seo-interactive-tool-v305]').length === 1,
      insideCompanySeo: Boolean(card && card.closest('[data-g1-company-block-v299="seo-audit"]') === companySeo),
      outsideProductSeo: !root.querySelector('[data-g1-seo-central-v298="product"] [data-g1-seo-interactive-tool-v305]'),
      fieldNames: [...card.querySelectorAll('[data-g1-seo-interactive-tool-field-v305]')]
        .map((field) => field.dataset.g1SeoInteractiveToolFieldV305),
      yesHidden: card.querySelector('[data-g1-seo-interactive-tool-yes-v305]').hidden,
      noHidden: card.querySelector('[data-g1-seo-interactive-tool-no-v305]').hidden,
    };
  })()`);

  await evaluate(page, `(() => {
    const set = (name, value, type = "input") => {
      const field = document.querySelector('[data-g1-seo-interactive-tool-field-v305="' + name + '"]');
      if (!field) throw new Error("Missing SEO interactive tool field: " + name);
      field.value = value;
      field.dispatchEvent(new Event(type, { bubbles: true }));
    };
    set("exists_now", "yes", "change");
    set("tool_name", "Калькулятор стоимости подарка");
    set("tool_url", "https://example.ru/calculator");
    set("idea", "Подбирать подарок по поводу, бюджету и сроку.");
    document.querySelector('[data-g1-seo-interactive-tool-field-v305="tool_url"]')
      .dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  })()`);
  await wait(500);

  const yesResult = await evaluate(page, `(() => {
    const store = gate1SeoInteractiveToolStoreV305(state);
    const saved = JSON.parse(localStorage.getItem("guru-platform-workspace-v02-" + activeProjectId));
    const card = document.querySelector('[data-g1-seo-interactive-tool-v305]');
    return {
      store: structuredClone(store),
      saved: saved.gate1SeoInteractiveToolV305,
      status: card.getAttribute("data-g1-seo-interactive-tool-status-v305"),
      yesVisible: !card.querySelector('[data-g1-seo-interactive-tool-yes-v305]').hidden,
      noHidden: card.querySelector('[data-g1-seo-interactive-tool-no-v305]').hidden,
    };
  })()`);

  const noResult = await evaluate(page, `(() => {
    const exists = document.querySelector('[data-g1-seo-interactive-tool-field-v305="exists_now"]');
    exists.value = "no";
    exists.dispatchEvent(new Event("change", { bubbles: true }));
    const shouldBuild = document.querySelector('[data-g1-seo-interactive-tool-field-v305="should_build"]');
    shouldBuild.value = "not_considered";
    shouldBuild.dispatchEvent(new Event("change", { bubbles: true }));
    const store = gate1SeoInteractiveToolStoreV305(state);
    const card = document.querySelector('[data-g1-seo-interactive-tool-v305]');
    return {
      existsNow: store.exists_now,
      shouldBuild: store.should_build,
      previousYesValuesPreserved: store.tool_name === "Калькулятор стоимости подарка" &&
        store.tool_url === "https://example.ru/calculator",
      yesHidden: card.querySelector('[data-g1-seo-interactive-tool-yes-v305]').hidden,
      noVisible: !card.querySelector('[data-g1-seo-interactive-tool-no-v305]').hidden,
      status: card.getAttribute("data-g1-seo-interactive-tool-status-v305"),
    };
  })()`);
  await wait(500);

  const finalResult = await evaluate(page, `(() => {
    const root = document.querySelector(".g1-redesign");
    const gate1 = state.gates.find((gate) => gate.id === "gate-1");
    const saved = JSON.parse(localStorage.getItem("guru-platform-workspace-v02-" + activeProjectId));
    return {
      cardCount: gate1.cards.length,
      cardsUnchanged: window.__seoToolBeforeV305.cards === JSON.stringify(gate1.cards),
      otherGatesUnchanged: window.__seoToolBeforeV305.otherGates === JSON.stringify(
        state.gates.filter((gate) => gate.id !== "gate-1"),
      ),
      explanationKeys: Object.keys(GATE1_SEO_EXPLANATIONS_V297).sort(),
      saved: saved.gate1SeoInteractiveToolV305,
      instanceCount: root.querySelectorAll('[data-g1-seo-interactive-tool-v305]').length,
      errors: window.__guruErrors || [],
    };
  })()`);

  console.log(JSON.stringify({ setup, initial, yesResult, noResult, finalResult }, null, 2));
  assert(initial.oneInstance && initial.insideCompanySeo && initial.outsideProductSeo,
    `Wrong SEO Company placement: ${JSON.stringify(initial)}`);
  assert(JSON.stringify(initial.fieldNames) === JSON.stringify([
    "exists_now", "tool_name", "tool_url", "should_build", "idea",
  ]), `Expected fields are incomplete: ${JSON.stringify(initial.fieldNames)}`);
  assert(initial.yesHidden && initial.noHidden, "Conditional fields must be hidden before the honest flag is selected");
  assert(yesResult.store.exists_now === "yes" &&
    yesResult.store.tool_name === "Калькулятор стоимости подарка" &&
    yesResult.store.tool_url === "https://example.ru/calculator" &&
    yesResult.store.idea.includes("Подбирать подарок") &&
    yesResult.status === "ready" && yesResult.yesVisible && yesResult.noHidden,
    `Yes branch did not fill correctly: ${JSON.stringify(yesResult)}`);
  assert(JSON.stringify(yesResult.store) === JSON.stringify(yesResult.saved),
    "Yes branch was not persisted to the project workspace");
  assert(noResult.existsNow === "no" && noResult.shouldBuild === "not_considered" &&
    noResult.previousYesValuesPreserved && noResult.yesHidden && noResult.noVisible &&
    noResult.status === "ready", `No branch did not work correctly: ${JSON.stringify(noResult)}`);
  assert(finalResult.saved.exists_now === "no" && finalResult.saved.should_build === "not_considered",
    "No branch was not persisted to the project workspace");
  assert(setup.cardCount === 82 && finalResult.cardCount === 82 && finalResult.cardsUnchanged,
    `Gate 1 cards changed: ${JSON.stringify({ before: setup.cardCount, after: finalResult.cardCount })}`);
  assert(finalResult.otherGatesUnchanged, "A non-Gate-1 gate changed during the interaction");
  assert(JSON.stringify(finalResult.explanationKeys) === JSON.stringify(expectedSeoKeys),
    "One or more of the existing seven SEO points changed");
  assert(finalResult.instanceCount === 1, "The project-level field was duplicated");
  assert(finalResult.errors.length === 0, `Runtime errors: ${finalResult.errors.join(" | ")}`);
} finally {
  page.close();
  await browser.call("Target.disposeBrowserContext", { browserContextId });
  browser.close();
}
