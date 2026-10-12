const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9339";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const expected = {
  aware: "Человек впервые сталкивается с брендом — через рекламу, соцсети, поиск или совет знакомого. Он ещё ничего не выбирает и не сравнивает, просто узнаёт, что такой бренд/товар существует. Задача этапа — попасть в поле зрения и зацепить внимание хотя бы на секунду, оставить имя в памяти.",
  appeal: "Из всех брендов, о которых человек узнал, в голове остаётся короткий список тех, что зацепили — обычно 2-3. Здесь работает не логика, а первое впечатление: понятно ли, чем это лучше других, вызывает ли доверие с виду. Задача — попасть в этот короткий список, выделиться среди похожих.",
  ask: "Человек начинает целенаправленно искать подробности о брендах из короткого списка: читает отзывы, сравнивает цены, спрашивает знакомых, изучает сайт. Здесь решается, кому он поверит. Задача — дать понятные честные ответы на реальные вопросы и снять сомнения раньше, чем их озвучат.",
  act: "Человек принимает решение и совершает целевое действие — покупает, оформляет заявку, записывается. Дальше идёт первый опыт использования продукта. Задача этапа — убрать препятствия на пути к оплате и сделать первый опыт таким, чтобы не разочаровать.",
  advocate: "Со временем у человека формируется устойчивое отношение к бренду — он либо возвращается за повторной покупкой, либо уходит. Довольный клиент начинает советовать бренд другим сам, без просьбы. Задача — заслужить это доверие, а не выпросить отзыв."
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

  close() {
    this.socket.close();
  }
}

async function evaluate(client, expression) {
  const response = await client.call("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (response.exceptionDetails) {
    throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
  }
  return response.result.value;
}

async function waitFor(client, expression, timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await evaluate(client, `Boolean(${expression})`)) return;
    await wait(100);
  }
  throw new Error(`Timed out waiting for ${expression}`);
}

const browserVersion = await (await fetch(`http://127.0.0.1:${debugPort}/json/version`)).json();
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
        ? Promise.resolve(new Response(JSON.stringify({ ok: true, isolatedSmokeTest: true }), { status: 200, headers: { "Content-Type": "application/json" } }))
        : nativeFetch(input, init);
    }`,
  });
  await page.call("Page.navigate", { url: appUrl });
  await waitFor(page, 'document.readyState === "complete"');
  await waitFor(page, 'typeof bootstrapAppOnce === "function"');
  await evaluate(page, `(() => {
    localStorage.clear();
    localStorage.setItem("guru-platform-access-v01", "unlocked");
    localStorage.setItem("guru-platform-projects-v02", JSON.stringify([{
      id: "gate4-stage-explanations-smoke",
      name: "Gate 4 stage explanations smoke",
      lifecycleStatus: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }]));
    location.reload();
    return true;
  })()`);
  await waitFor(page, 'document.querySelector("[data-open-project]")');
  await evaluate(page, 'document.querySelector("[data-open-project]").click(); true');
  await waitFor(page, 'Boolean(state)');

  const result = await evaluate(page, `(() => {
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};
    const now = new Date().toISOString();
    state.project.productRegistryV185 = [{ id: "category-test", name: "Тестовая категория", legacyNames: [], createdAt: now }];
    state.project.catalogItemsV189 = [{
      id: "product-test",
      name: "Тестовый товар",
      continuum: "pure_product",
      categoryId: "category-test",
      createdAt: now,
      source: { kind: "gate0", key: "gate0:product-test" }
    }];
    state.project.gate0ScopedValuesV194 = [
      { id: "segment-test", project_id: activeProjectId, category_id: "category-test", product_id: "product-test", scope: "product", field: "segments", value: "Тестовый сегмент", confirmation_status: "confirmed", created_at: now, updated_at: now },
      { id: "jtbd-test", project_id: activeProjectId, category_id: "category-test", product_id: "product-test", scope: "product", field: "jtbd", value: "Тестовая задача клиента", confirmation_status: "confirmed", created_at: now, updated_at: now }
    ];
    state.project._gate0ProductIdMigrationLog = [
      { id: GURU_GATE0_PRODUCT_SCOPE_MIGRATION_V194, at: now, status: "test" },
      { id: GURU_GATE0_OFFER_CTA_MIGRATION_V197, at: now, status: "test" }
    ];
    const ui = guruV194Ui(state);
    ui.selectedCategoryId = "category-test";
    ui.selectedProductId = "product-test";
    state.gate4Production.launchProduct = "product-test";
    guruNavigateToGate("gate-4");
    renderGate();

    const keys = ${JSON.stringify(Object.keys(expected))};
    const explanations = Object.fromEntries(keys.map((key) => {
      const stage = document.querySelector('[data-g4-map-stage-v290="' + key + '"]');
      const header = stage?.querySelector(":scope > header");
      const explanation = stage?.querySelector(':scope > [data-g4-stage-explanation-v297="' + key + '"]');
      const style = explanation ? getComputedStyle(explanation) : null;
      return [key, {
        text: explanation?.textContent.trim() || "",
        visible: Boolean(explanation && explanation.getClientRects().length && style?.display !== "none" && style?.visibility !== "hidden"),
        directlyUnderHeader: Boolean(header && header.nextElementSibling === explanation),
        sharedClass: Boolean(explanation?.classList.contains("g3-product-journey-stage-explanation-v296")),
        fontSize: Number.parseFloat(style?.fontSize || "0"),
        color: style?.color || ""
      }];
    }));
    const helperTexts = Object.fromEntries(keys.map((key) => {
      const host = document.createElement("div");
      host.innerHTML = g3ProductJourneyStageExplanationHtmlV296(key);
      return [key, host.textContent.trim()];
    }));
    return {
      build: window.GURU_BUILD_INFO?.version || "",
      stageOrder: [...document.querySelectorAll(".g4-funnel-stage-v294")].map((stage) => stage.dataset.g4MapStageV290),
      outsideExplanations: document.querySelectorAll('[data-g4-map-stage-v290="outside"] .g3-product-journey-stage-explanation-v296').length,
      readinessCards: document.querySelectorAll("[data-g4-readiness-card]").length,
      campaignChannels: new Set([...document.querySelectorAll("[data-g4camp-toggle]")].map((node) => node.dataset.g4campToggle)).size,
      explanations,
      helperTexts,
      errors: window.__guruConsoleLog?.filter((entry) => entry.level === "error") || []
    };
  })()`);

  if (result.build !== "2.3.163" || JSON.stringify(result.stageOrder) !== JSON.stringify(["outside", "aware", "appeal", "ask", "act", "advocate"]) || result.outsideExplanations !== 0 || result.readinessCards !== 23 || result.campaignChannels !== 15 || result.errors.length) {
    throw new Error(`Gate 4 structure changed unexpectedly: ${JSON.stringify(result)}`);
  }
  for (const [stageKey, expectedText] of Object.entries(expected)) {
    const rendered = result.explanations[stageKey];
    if (rendered?.text !== expectedText || result.helperTexts[stageKey] !== expectedText || !rendered.visible || !rendered.directlyUnderHeader || !rendered.sharedClass || rendered.fontSize !== 12) {
      throw new Error(`Gate 4 academic explanation mismatch for ${stageKey}: ${JSON.stringify({ rendered, expectedText })}`);
    }
  }

  console.log(JSON.stringify(result, null, 2));
} finally {
  page.close();
  await browser.call("Target.disposeBrowserContext", { browserContextId });
  browser.close();
}
