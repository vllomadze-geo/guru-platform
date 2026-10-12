import { writeFile } from "node:fs/promises";

const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9362";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const projectId = "gate7-company-foundation-v310-smoke";
const productId = "gate7-linked-product";
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
  if (response.exceptionDetails) {
    throw new Error(
      response.exceptionDetails.exception?.description ||
        response.exceptionDetails.text,
    );
  }
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
    'typeof bootstrapAppOnce === "function" && typeof renderGate7Journal === "function"',
  );

  await evaluate(page, `(() => {
    const workspace = structuredClone(window.GURU_SEED);
    workspace.project.id = ${JSON.stringify(projectId)};
    workspace.project.name = "Gate 7 company foundation smoke";
    workspace.project.catalogItemsV189 = [{
      id: ${JSON.stringify(productId)},
      name: "Связанный продукт Gate 7",
      continuum: "pure_product",
      categoryId: "",
      createdAt: new Date().toISOString()
    }];
    workspace.project.gate0ScopeUiV194 = {
      selectedCategoryId: "__uncategorized__",
      selectedProductId: ${JSON.stringify(productId)},
      scopeByProductField: {}
    };
    workspace.project.gate0ScopedValuesV194 = [];
    workspace.gate7Journal = {
      ui: {
        openSections: { new: true, regular: true, work: true, done: true },
        openTasks: {}
      },
      tasks: [
        {
          id: "g7-task-seed-new",
          sectionId: "new",
          order: 0,
          date: "",
          task: "Новая задача",
          status: "not_started",
          result: "",
          createdAt: "2026-01-01T00:00:00.000Z"
        },
        {
          id: "g7-task-seed-regular",
          sectionId: "regular",
          order: 0,
          date: "",
          task: "Регулярная задача",
          status: "regular",
          result: "",
          isRecurringTemplate: true,
          createdAt: "2026-01-02T00:00:00.000Z"
        },
        {
          id: "g7-task-seed-work",
          sectionId: "work",
          order: 0,
          date: "2026-12-01",
          task: "Задача в работе",
          status: "in_progress",
          result: "",
          createdAt: "2026-01-03T00:00:00.000Z"
        },
        {
          id: "g7-task-seed-done",
          sectionId: "done",
          order: 0,
          date: "2026-01-04",
          task: "Готовая задача",
          status: "ready",
          result: "Готово",
          completedAt: "2026-01-04T00:00:00.000Z",
          createdAt: "2026-01-04T00:00:00.000Z"
        },
        {
          id: "g7-task-linked-product",
          product_id: ${JSON.stringify(productId)},
          sectionId: "new",
          order: 1,
          date: "",
          task: "Задача из прогноза продукта",
          status: "not_started",
          result: "",
          forecastLink: {
            gate: "gate-8",
            product_id: ${JSON.stringify(productId)},
            forecastId: "forecast-smoke"
          },
          createdAt: "2026-01-05T00:00:00.000Z"
        }
      ]
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
    activeGateId = "gate-7";
    renderGate();
    const root = document.querySelector(".gate7-journal");
    const company = root?.querySelector(':scope > [data-gate-scope="company"]');
    const product = root?.querySelector(':scope > [data-gate-scope="product"]');
    const heading = company?.querySelector(":scope > .gate0-section-heading");
    const panel = company?.querySelector(
      ':scope > [data-guru-strategic-foundation-company]'
    );
    const toolbar = company?.querySelector(":scope > .gate7-toolbar");
    const panels = [...document.querySelectorAll(
      "[data-guru-strategic-foundation-company]"
    )];
    const foundation = window.__guruCompanyFoundationAudit(panel);
    const rows = foundation.rows;
    const gate7 = state.gates.find((gate) => gate.id === "gate-7");
    window.__companyFoundationGate7RenderCountV310 = 0;
    window.__companyFoundationGate7OriginalRenderV310 = renderGate;
    renderGate = function () {
      window.__companyFoundationGate7RenderCountV310 += 1;
      return window.__companyFoundationGate7OriginalRenderV310.apply(this, arguments);
    };
    return {
      segmentRecords: guruV194ExactRecords("segments", "project", null, state).length,
      positioningRecords: guruV194ExactRecords("positioning", "project", null, state).length,
      offerRecords: guruV194ExactRecords("company_offer", "project", null, state).length,
      keywordRecords: guruV194ExactRecords("keyword_foundation", "project", null, state).length,
      panelCount: panels.length,
      directCompanyPanelCount: company?.querySelectorAll(
        ':scope > [data-guru-strategic-foundation-company]'
      ).length || 0,
      productPanelCount: product?.querySelectorAll(
        "[data-guru-strategic-foundation-company]"
      ).length || 0,
      insideSectionCount: company?.querySelectorAll(
        ".gate7-section [data-guru-strategic-foundation-company]"
      ).length || 0,
      insideTaskCount: company?.querySelectorAll(
        "[data-g7-task] [data-guru-strategic-foundation-company]"
      ).length || 0,
      rows,
      foundation,
      heading: heading?.querySelector(".gate0-section-heading-title")?.textContent.trim() || "",
      placement: Boolean(
        heading && panel && toolbar &&
        panel.previousElementSibling === heading &&
        panel.nextElementSibling === toolbar
      ),
      projectIds: panels.map((item) => item.dataset.projectId),
      hasProductMarker: panels.some((item) => item.hasAttribute("data-product-id")),
      scopeCount: root?.querySelectorAll(":scope > [data-gate-scope]").length || 0,
      sectionIds: [...(company?.querySelectorAll(":scope > .gate7-sections > .gate7-section") || [])]
        .map((section) => section.dataset.g7Section),
      productPickerCount: root?.querySelectorAll("[data-g7-product-pick-select]").length || 0,
      toolbarControls: {
        add: company?.querySelectorAll("[data-g7-add-task]").length || 0,
        pdf: company?.querySelectorAll("[data-g7-export-pdf]").length || 0,
        csv: company?.querySelectorAll("[data-g7-export-csv]").length || 0
      },
      linkedTask: structuredClone(
        state.gate7Journal.tasks.find((task) => task.id === "g7-task-linked-product")
      ),
      taskCount: state.gate7Journal.tasks.length,
      taskIds: state.gate7Journal.tasks.map((task) => task.id),
      gate7CardIds: gate7.cards.map((card) => card.id),
      otherGateCardIds: state.gates
        .filter((gate) => gate.id !== "gate-7")
        .map((gate) => [gate.id, gate.cards.map((card) => card.id)])
    };
  })()`);

  assert(initial.segmentRecords === 0, "Panel render created a segment record");
  assert(initial.positioningRecords === 0, "Panel render created a positioning record");
  assert(initial.offerRecords === 0, "Panel render created a company offer record");
  assert(initial.keywordRecords === 0, "Panel render created a company keyword record");
  assert(initial.panelCount === 1, "Company foundation must render exactly once in Gate 7");
  assert(initial.directCompanyPanelCount === 1, "Company scope lacks its direct panel");
  assert(initial.productPanelCount === 0, "Company panel leaked into the empty product scope");
  assert(initial.insideSectionCount === 0, "Company panel leaked into a journal section");
  assert(initial.insideTaskCount === 0, "Company panel leaked into a journal task");
  assert(initial.heading === "Компания", "Gate 7 company heading changed");
  assert(initial.placement, "Panel is not between the company heading and toolbar");
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
    "Brand Purpose row is missing from the Gate 7 company foundation",
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
    `Empty Gate 7 keyword foundation state is wrong: ${JSON.stringify(initial.foundation.keyword)}`,
  );
  assert(initial.projectIds.every((id) => id === projectId), "Panel project_id marker is wrong");
  assert(!initial.hasProductMarker, "Company panel must not have data-product-id");
  assert(initial.scopeCount === 2, "Gate 7 company/product visual structure changed");
  assert(
    JSON.stringify(initial.sectionIds) === JSON.stringify(["new", "regular", "work", "done"]),
    `Gate 7 journal sections changed: ${JSON.stringify(initial.sectionIds)}`,
  );
  assert(initial.productPickerCount === 0, "Gate 7 unexpectedly gained a product selector");
  assert(
    initial.toolbarControls.add === 1 && initial.toolbarControls.pdf === 1 && initial.toolbarControls.csv === 1,
    "Gate 7 toolbar controls changed",
  );
  assert(initial.taskCount === 5, `Expected five seed tasks, got ${initial.taskCount}`);
  assert(initial.linkedTask?.product_id === productId, "Product-linked task lost product_id");
  assert(
    initial.linkedTask?.forecastLink?.product_id === productId,
    "Product-linked task lost forecast product_id",
  );

  const journalFlow = await evaluate(page, `(() => {
    const click = (selector) => {
      const node = document.querySelector(selector);
      if (!node) throw new Error("Missing control: " + selector);
      node.click();
    };
    click("[data-g7-add-task]");
    const manual = state.gate7Journal.tasks.find(
      (task) => task.id && !${JSON.stringify(initial.taskIds)}.includes(task.id) && !task.isRecurringTemplate
    );
    if (!manual) throw new Error("Manual task was not created");
    const manualTitle = document.querySelector(
      '[data-g7-task="' + CSS.escape(manual.id) + '"] [data-g7-task-field="task"]'
    );
    manualTitle.value = "Smoke: пройти полный цикл";
    manualTitle.dispatchEvent(new Event("input", { bubbles: true }));
    const toWork = document.querySelector(
      '[data-g7-task="' + CSS.escape(manual.id) + '"] [data-g7-status-select]'
    );
    toWork.value = "in_progress";
    toWork.dispatchEvent(new Event("change", { bubbles: true }));
    const reachedWork = state.gate7Journal.tasks.find((task) => task.id === manual.id)?.sectionId === "work";
    const toDone = document.querySelector(
      '[data-g7-task="' + CSS.escape(manual.id) + '"] [data-g7-status-select]'
    );
    toDone.value = "ready";
    toDone.dispatchEvent(new Event("change", { bubbles: true }));
    const reachedDone = state.gate7Journal.tasks.find((task) => task.id === manual.id)?.sectionId === "done";
    click("[data-g7-add-regular]");
    const regular = state.gate7Journal.tasks.find(
      (task) => task.isRecurringTemplate && !${JSON.stringify(initial.taskIds)}.includes(task.id)
    );
    if (!regular) throw new Error("Regular task was not created");
    const regularTitle = document.querySelector(
      '[data-g7-task="' + CSS.escape(regular.id) + '"] [data-g7-task-field="task"]'
    );
    if (!regularTitle) {
      throw new Error(
        "Regular task title is missing; date=" + String(regular.date) +
        "; section=" + String(regular.sectionId) +
        "; open=" + String(state.gate7Journal.ui.openSections.regular) +
        "; rendered=" + String(Boolean(document.querySelector('[data-g7-task="' + CSS.escape(regular.id) + '"]')))
      );
    }
    regularTitle.value = "Smoke: регулярная проверка";
    regularTitle.dispatchEvent(new Event("input", { bubbles: true }));
    const finishRegular = document.querySelector(
      '[data-g7-task="' + CSS.escape(regular.id) + '"] [data-g7-status-select]'
    );
    if (!finishRegular) throw new Error("Regular task status is missing");
    finishRegular.value = "ready";
    finishRegular.dispatchEvent(new Event("change", { bubbles: true }));
    const recurringTemplate = state.gate7Journal.tasks.find((task) => task.id === regular.id);
    const recurringDone = state.gate7Journal.tasks.find(
      (task) => task.recurringTemplateId === regular.id && task.sectionId === "done"
    );

    const manualResultToggle = document.querySelector(
      '[data-g7-task="' + CSS.escape(manual.id) + '"] [data-g7-toggle-result]'
    );
    if (!manualResultToggle) throw new Error("Manual task result toggle is missing");
    manualResultToggle.click();
    const manualResult = document.querySelector(
      '[data-g7-task="' + CSS.escape(manual.id) + '"] [data-g7-task-field="result"]'
    );
    if (!manualResult) {
      throw new Error(
        "Manual task result field is missing; open=" +
        String(state.gate7Journal.ui.openTasks[manual.id]) +
        "; section=" +
        String(state.gate7Journal.tasks.find((task) => task.id === manual.id)?.sectionId)
      );
    }
    manualResult.value = "Smoke: результат сохранён";
    manualResult.dispatchEvent(new Event("input", { bubbles: true }));

    window.__gate7CsvProbe = null;
    window.__gate7PdfProbe = null;
    downloadText = (name, contents) => {
      window.__gate7CsvProbe = { name, contents };
    };
    openPrintableReport = (html) => {
      window.__gate7PdfProbe = html;
    };
    document.querySelector("[data-g7-export-csv]").click();
    document.querySelector("[data-g7-export-pdf]").click();
    saveState();
    return {
      manualId: manual.id,
      regularId: regular.id,
      reachedWork,
      reachedDone,
      manualTitle: state.gate7Journal.tasks.find((task) => task.id === manual.id)?.task || "",
      manualResult: state.gate7Journal.tasks.find((task) => task.id === manual.id)?.result || "",
      recurringTemplateSection: recurringTemplate?.sectionId || "",
      recurringTemplateStatus: recurringTemplate?.status || "",
      recurringDone: Boolean(recurringDone),
      recurringDoneResult: recurringDone?.result || "",
      renderCount: window.__companyFoundationGate7RenderCountV310,
      csvName: window.__gate7CsvProbe?.name || "",
      csvContents: window.__gate7CsvProbe?.contents || "",
      pdfHtml: window.__gate7PdfProbe || "",
      sectionIds: [...document.querySelectorAll('[data-gate-scope="company"] .gate7-section')]
        .map((section) => section.dataset.g7Section),
      linkedTaskProductId: state.gate7Journal.tasks.find(
        (task) => task.id === "g7-task-linked-product"
      )?.product_id || ""
    };
  })()`);

  assert(journalFlow.reachedWork, "Task did not move from New to Work");
  assert(journalFlow.reachedDone, "Task did not move from Work to Done");
  assert(journalFlow.manualTitle === "Smoke: пройти полный цикл", "Task title did not persist");
  assert(journalFlow.manualResult === "Smoke: результат сохранён", "Task result did not persist");
  assert(journalFlow.recurringTemplateSection === "regular", "Recurring template left Regular");
  assert(journalFlow.recurringTemplateStatus === "regular", "Recurring template status changed");
  assert(journalFlow.recurringDone, "Completing a regular task did not create a Done entry");
  assert(journalFlow.csvName === "guru-gate7-tasks.csv", "Gate 7 CSV filename changed");
  assert(journalFlow.csvContents.includes("Smoke: пройти полный цикл"), "CSV lacks the test task");
  assert(journalFlow.csvContents.includes("Smoke: результат сохранён"), "CSV lacks the task result");
  assert(journalFlow.pdfHtml.includes("Gate 7 · Задачи и результаты"), "PDF report did not render");
  assert(journalFlow.pdfHtml.includes("Smoke: пройти полный цикл"), "PDF lacks the test task");
  assert(journalFlow.pdfHtml.includes("Smoke: результат сохранён"), "PDF lacks the task result");
  assert(
    JSON.stringify(journalFlow.sectionIds) === JSON.stringify(["new", "regular", "work", "done"]),
    "Journal flow changed the four Gate 7 sections",
  );
  assert(journalFlow.linkedTaskProductId === productId, "Journal flow erased task product_id");

  const filled = await evaluate(page, `(() => {
    const beforeTasks = JSON.stringify(state.gate7Journal.tasks);
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
    const panel = document.querySelector("[data-guru-strategic-foundation-company]");
    const foundation = window.__guruCompanyFoundationAudit(panel);
    const rows = foundation.rows;
    saveState();
    return {
      panelCount: document.querySelectorAll("[data-guru-strategic-foundation-company]").length,
      rows,
      foundation,
      renderCount: window.__companyFoundationGate7RenderCountV310,
      segmentRecords: guruV194ExactRecords("segments", "project", null, state).length,
      positioningRecords: guruV194ExactRecords("positioning", "project", null, state).length,
      offerRecords: guruV194ExactRecords("company_offer", "project", null, state).length,
      keywordRecords: guruV194ExactRecords("keyword_foundation", "project", null, state).length,
      tasksUnchanged: beforeTasks === JSON.stringify(state.gate7Journal.tasks),
      taskCount: state.gate7Journal.tasks.length,
      linkedTaskProductId: state.gate7Journal.tasks.find(
        (task) => task.id === "g7-task-linked-product"
      )?.product_id || ""
    };
  })()`);

  assert(filled.panelCount === 1, "Live refresh duplicated the Gate 7 panel");
  assert(
    filled.renderCount === journalFlow.renderCount,
    "Live refresh triggered a full Gate render",
  );
  assert(filled.segmentRecords === 1, "Live refresh did not keep one segment record");
  assert(filled.positioningRecords === 1, "Live refresh did not keep one positioning record");
  assert(filled.offerRecords === 1, "Live refresh did not keep one offer record");
  assert(filled.keywordRecords === 1, "Live refresh did not keep one keyword record");
  assert(filled.foundation.directCount === 5, "Live refresh changed the five-row foundation");
  assert(
    JSON.stringify(filled.rows.map((row) => row.label)) ===
      JSON.stringify(initial.rows.map((row) => row.label)),
    "Live refresh changed the Gate 7 foundation order",
  );
  assert(filled.rows.slice(0, 4).every((row) => row.status === "Готово"), "Filled rows are not ready");
  assert(
    JSON.stringify(filled.rows.slice(0, 4).map((row) => row.value)) === JSON.stringify([
      "Помогать людям выбирать осмысленные вещи",
      "Женщины 25–40 лет, выбирающие авторские вещи осознанно",
      "Авторская мастерская тёплых вещей с характером",
      "Выберите единственную вещь, созданную мастером для важного момента",
    ]),
    `Unified company values did not update live in Gate 7: ${JSON.stringify(filled.rows)}`,
  );
  assert(
    !filled.foundation.panelText.includes("СТАРАЯ КАТЕГОРИЯ") &&
      !filled.foundation.panelText.includes("СТАРОЕ ОТЛИЧИЕ") &&
      !filled.foundation.panelText.includes("СТАРОЕ ОСНОВАНИЕ") &&
      !filled.foundation.panelText.includes("СТАРАЯ РАЦИОНАЛЬНАЯ ЛИНЗА") &&
      !filled.foundation.panelText.includes("СТАРАЯ ИРРАЦИОНАЛЬНАЯ ЛИНЗА") &&
      !filled.foundation.panelText.includes("СТАРАЯ СОЦИАЛЬНАЯ ЛИНЗА") &&
      !filled.foundation.panelText.includes("СТАРЫЙ CTA") &&
      !filled.foundation.panelText.includes("СТАРАЯ ГЕОГРАФИЯ"),
    "Structured positioning/offer parts leaked into Gate 7",
  );
  assert(
    filled.foundation.keyword.summary === "Подтверждённые фразы" &&
      filled.foundation.keyword.count === "2 ключевых слова" &&
      JSON.stringify(filled.foundation.keyword.phrases) === JSON.stringify([
        "авторская мастерская",
        "тёплые вещи с характером",
      ]),
    `Gate 7 confirmed-only keywords are wrong: ${JSON.stringify(filled.foundation.keyword)}`,
  );
  assert(filled.tasksUnchanged, "Live refresh changed Gate 7 tasks");
  assert(filled.linkedTaskProductId === productId, "Live refresh erased task product_id");

  await evaluate(page, `document.querySelector("details[data-guru-strategic-company-keyword-foundation] > summary")?.click(); true`);
  await waitFor(page, 'document.querySelector("details[data-guru-strategic-company-keyword-foundation]")?.open === true');
  const expanded = await evaluate(page, `(() => {
    guruStrategicFoundationCompanyRefreshV310();
    saveState();
    return window.__guruCompanyFoundationAudit(
      document.querySelector("[data-guru-strategic-foundation-company]")
    );
  })()`);
  assert(expanded.keyword.open, "Gate 7 keyword foundation collapsed during live refresh");
  assert(
    JSON.stringify(expanded.keyword.phrases) === JSON.stringify(filled.foundation.keyword.phrases),
    "Gate 7 expanded keyword list changed during live refresh",
  );

  await wait(700);
  await evaluate(page, `(() => {
    document.querySelector('[data-gate-scope="company"] > .gate0-section-heading')
      ?.scrollIntoView({ block: "start" });
    return true;
  })()`);
  await wait(150);
  const screenshot = await page.call("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
  });
  await writeFile(
    "artifacts/gate7-company-strategic-foundation-v355.png",
    Buffer.from(screenshot.data, "base64"),
  );

  await evaluate(page, "location.reload(); true");
  await waitFor(
    page,
    'typeof state !== "undefined" && Boolean(state) && activeProjectId === ' +
      JSON.stringify(projectId),
  );
  const afterReload = await evaluate(page, `(() => {
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};
    activeGateId = "gate-7";
    renderGate();
    const root = document.querySelector(".gate7-journal");
    const company = root?.querySelector(':scope > [data-gate-scope="company"]');
    const product = root?.querySelector(':scope > [data-gate-scope="product"]');
    const heading = company?.querySelector(":scope > .gate0-section-heading");
    const panel = company?.querySelector(
      ':scope > [data-guru-strategic-foundation-company]'
    );
    const toolbar = company?.querySelector(":scope > .gate7-toolbar");
    const linked = state.gate7Journal.tasks.find((task) => task.id === "g7-task-linked-product");
    const gate7 = state.gates.find((gate) => gate.id === "gate-7");
    const foundation = window.__guruCompanyFoundationAudit(panel);
    window.__gate7ReloadCsvProbe = null;
    window.__gate7ReloadPdfProbe = null;
    downloadText = (name, contents) => {
      window.__gate7ReloadCsvProbe = { name, contents };
    };
    openPrintableReport = (html) => {
      window.__gate7ReloadPdfProbe = html;
    };
    document.querySelector("[data-g7-export-csv]").click();
    document.querySelector("[data-g7-export-pdf]").click();
    return {
      panelCount: document.querySelectorAll("[data-guru-strategic-foundation-company]").length,
      directCompanyPanelCount: company?.querySelectorAll(
        ':scope > [data-guru-strategic-foundation-company]'
      ).length || 0,
      productPanelCount: product?.querySelectorAll(
        "[data-guru-strategic-foundation-company]"
      ).length || 0,
      insideTaskCount: company?.querySelectorAll(
        "[data-g7-task] [data-guru-strategic-foundation-company]"
      ).length || 0,
      placement: Boolean(
        heading && panel && toolbar &&
        panel.previousElementSibling === heading &&
        panel.nextElementSibling === toolbar
      ),
      foundation,
      segmentRecords: guruV194ExactRecords("segments", "project", null, state).length,
      positioningRecords: guruV194ExactRecords("positioning", "project", null, state).length,
      offerRecords: guruV194ExactRecords("company_offer", "project", null, state).length,
      keywordRecords: guruV194ExactRecords("keyword_foundation", "project", null, state).length,
      sectionIds: [...(company?.querySelectorAll(":scope > .gate7-sections > .gate7-section") || [])]
        .map((section) => section.dataset.g7Section),
      taskIds: state.gate7Journal.tasks.map((task) => task.id),
      manualTask: structuredClone(
        state.gate7Journal.tasks.find((task) => task.id === ${JSON.stringify(journalFlow.manualId)})
      ),
      regularTask: structuredClone(
        state.gate7Journal.tasks.find((task) => task.id === ${JSON.stringify(journalFlow.regularId)})
      ),
      regularDoneCount: state.gate7Journal.tasks.filter(
        (task) => task.recurringTemplateId === ${JSON.stringify(journalFlow.regularId)} && task.sectionId === "done"
      ).length,
      linkedTask: structuredClone(linked),
      productPickerCount: root?.querySelectorAll("[data-g7-product-pick-select]").length || 0,
      csvName: window.__gate7ReloadCsvProbe?.name || "",
      csvContents: window.__gate7ReloadCsvProbe?.contents || "",
      pdfHtml: window.__gate7ReloadPdfProbe || "",
      gate7CardIds: gate7.cards.map((card) => card.id),
      otherGateCardIds: state.gates
        .filter((gate) => gate.id !== "gate-7")
        .map((gate) => [gate.id, gate.cards.map((card) => card.id)]),
      errors: window.__guruErrors
    };
  })()`);

  assert(afterReload.panelCount === 1, "Single Gate 7 panel did not survive hard reload");
  assert(afterReload.directCompanyPanelCount === 1, "Panel moved out of company scope after reload");
  assert(afterReload.productPanelCount === 0, "Panel entered product scope after reload");
  assert(afterReload.insideTaskCount === 0, "Panel entered a journal task after reload");
  assert(afterReload.placement, "Panel placement changed after reload");
  assert(
    JSON.stringify(afterReload.foundation.rows.map((row) => row.label)) ===
      JSON.stringify(initial.rows.map((row) => row.label)),
    "Gate 7 five-row order changed after reload",
  );
  assert(
    JSON.stringify(afterReload.foundation.rows.slice(0, 4).map((row) => row.value)) ===
      JSON.stringify(filled.rows.slice(0, 4).map((row) => row.value)),
    "Gate 7 unified values changed after reload",
  );
  assert(
    !afterReload.foundation.panelText.includes("СТАРАЯ КАТЕГОРИЯ") &&
      !afterReload.foundation.panelText.includes("СТАРОЕ ОТЛИЧИЕ") &&
      !afterReload.foundation.panelText.includes("СТАРОЕ ОСНОВАНИЕ") &&
      !afterReload.foundation.panelText.includes("СТАРАЯ РАЦИОНАЛЬНАЯ ЛИНЗА") &&
      !afterReload.foundation.panelText.includes("СТАРАЯ ИРРАЦИОНАЛЬНАЯ ЛИНЗА") &&
      !afterReload.foundation.panelText.includes("СТАРАЯ СОЦИАЛЬНАЯ ЛИНЗА") &&
      !afterReload.foundation.panelText.includes("СТАРЫЙ CTA") &&
      !afterReload.foundation.panelText.includes("СТАРАЯ ГЕОГРАФИЯ"),
    "Legacy structured values returned to Gate 7 after reload",
  );
  assert(afterReload.foundation.keyword.open, "Gate 7 keyword expansion did not survive reload");
  assert(
    afterReload.foundation.keyword.summary === "Подтверждённые фразы" &&
      afterReload.foundation.keyword.count === "2 ключевых слова" &&
      JSON.stringify(afterReload.foundation.keyword.phrases) ===
        JSON.stringify(filled.foundation.keyword.phrases),
    "Gate 7 confirmed keywords changed after reload",
  );
  assert(afterReload.segmentRecords === 1, "Segment record duplicated after reload");
  assert(afterReload.positioningRecords === 1, "Positioning record duplicated after reload");
  assert(afterReload.offerRecords === 1, "Offer record duplicated after reload");
  assert(afterReload.keywordRecords === 1, "Keyword record duplicated after reload");
  assert(
    JSON.stringify(afterReload.sectionIds) === JSON.stringify(["new", "regular", "work", "done"]),
    "Journal sections changed after reload",
  );
  assert(afterReload.manualTask?.sectionId === "done", "Manual task status did not survive reload");
  assert(afterReload.manualTask?.task === "Smoke: пройти полный цикл", "Manual task text did not survive reload");
  assert(afterReload.manualTask?.result === "Smoke: результат сохранён", "Task result did not survive reload");
  assert(afterReload.regularTask?.sectionId === "regular", "Regular template did not survive reload");
  assert(afterReload.regularDoneCount === 1, "Regular completion duplicated or disappeared after reload");
  assert(afterReload.linkedTask?.product_id === productId, "Task product_id did not survive reload");
  assert(
    afterReload.linkedTask?.forecastLink?.product_id === productId,
    "Forecast product_id did not survive reload",
  );
  assert(afterReload.productPickerCount === 0, "Gate 7 gained a product selector after reload");
  assert(afterReload.csvName === "guru-gate7-tasks.csv", "CSV stopped working after reload");
  assert(afterReload.csvContents.includes("Smoke: пройти полный цикл"), "Reloaded CSV lacks the task");
  assert(afterReload.pdfHtml.includes("Smoke: пройти полный цикл"), "Reloaded PDF lacks the task");
  assert(
    JSON.stringify(afterReload.gate7CardIds) === JSON.stringify(initial.gate7CardIds),
    "Gate 7 card structure changed",
  );
  assert(
    JSON.stringify(afterReload.otherGateCardIds) === JSON.stringify(initial.otherGateCardIds),
    "Another gate card structure changed",
  );
  assert(afterReload.errors.length === 0, `Browser errors: ${afterReload.errors.join(" | ")}`);

  const offerTarget = await evaluate(page, `(() => {
    const row = [...document.querySelectorAll(
      "[data-guru-strategic-foundation-company] .guru-strategic-row-v286"
    )].find((item) => item.querySelector(
      ".guru-strategic-row-copy-v286 > strong"
    )?.textContent.trim() === "Оффер компании");
    const button = row?.querySelector("[data-g4-jump-target]");
    const target = button ? JSON.parse(button.dataset.g4JumpTarget) : null;
    button?.click();
    return target;
  })()`);
  await waitFor(
    page,
    'activeGateId === "gate-0" && Boolean(document.querySelector(\'[data-gate0-company-offer-field="offer"]\'))',
  );
  await wait(350);
  const offerJump = await evaluate(page, `(() => {
    const node = document.querySelector('[data-gate0-company-offer-field="offer"]');
    return {
      gateId: activeGateId,
      cardOpen: state._gate0Open?.["gate0-company-offer"] === true,
      targetPresent: Boolean(node),
      highlighted: Boolean(node?.classList.contains("guru-source-target-v212")),
      focused: document.activeElement === node,
    };
  })()`);
  assert(
    offerTarget?.kind === "gate0-company-offer" &&
      offerTarget.cardId === "gate0-company-offer" &&
      offerTarget.field === "offer",
    `Offer source target is wrong: ${JSON.stringify(offerTarget)}`,
  );
  assert(
    offerJump.gateId === "gate-0" && offerJump.cardOpen &&
      offerJump.targetPresent && offerJump.highlighted && offerJump.focused,
    `Offer source navigation failed: ${JSON.stringify(offerJump)}`,
  );

  await evaluate(page, 'guruNavigateToGate("gate-7"); true');
  await waitFor(
    page,
    'activeGateId === "gate-7" && Boolean(document.querySelector("details[data-guru-strategic-company-keyword-foundation]"))',
  );
  const keywordTarget = await evaluate(page, `(() => {
    const details = document.querySelector(
      "details[data-guru-strategic-company-keyword-foundation]"
    );
    if (details && !details.open) details.open = true;
    const button = details?.querySelector(
      ".guru-strategic-jtbd-links-v286 [data-g4-jump-target]"
    );
    const target = button ? JSON.parse(button.dataset.g4JumpTarget) : null;
    button?.click();
    return target;
  })()`);
  await waitFor(
    page,
    'activeGateId === "gate-0" && Boolean(document.querySelector("[data-gate0-company-keyword-foundation]"))',
  );
  await wait(100);
  const keywordJump = await evaluate(page, `(() => {
    const node = document.querySelector("[data-gate0-company-keyword-foundation]");
    return {
      gateId: activeGateId,
      cardOpen: state._gate0Open?.["gate0-company-keyword-foundation"] === true,
      targetPresent: Boolean(node),
      highlighted: Boolean(node?.classList.contains("guru-source-target-v212")),
    };
  })()`);
  assert(
    keywordTarget?.kind === "gate0-company-keyword-foundation" &&
      keywordTarget.cardId === "gate0-company-keyword-foundation" &&
      keywordTarget.field === "keyword_foundation",
    `Keyword source target is wrong: ${JSON.stringify(keywordTarget)}`,
  );
  assert(
    keywordJump.gateId === "gate-0" && keywordJump.cardOpen &&
      keywordJump.targetPresent && keywordJump.highlighted,
    `Keyword source navigation failed: ${JSON.stringify(keywordJump)}`,
  );

  console.log(JSON.stringify({
    initial,
    journalFlow,
    filled,
    expanded,
    afterReload,
    sourceJumps: { offerTarget, offerJump, keywordTarget, keywordJump },
  }, null, 2));
  console.log("gate7 company strategic foundation smoke: OK");
} finally {
  await browser.call("Target.closeTarget", { targetId }).catch(() => {});
  await browser.call("Target.disposeBrowserContext", { browserContextId }).catch(() => {});
  page.close();
  browser.close();
}
