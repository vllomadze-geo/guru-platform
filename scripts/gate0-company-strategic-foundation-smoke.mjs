import { writeFile } from "node:fs/promises";

const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9362";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const projectId = "gate0-company-foundation-v310-smoke";
const formerRecipientIds = ["card-1", "gate0-project-goal", "card-7"];
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
    'typeof bootstrapAppOnce === "function" && typeof guruStrategicFoundationContextCompanyV310 === "function"',
  );

  await evaluate(page, `(() => {
    const workspace = structuredClone(window.GURU_SEED);
    workspace.project.id = ${JSON.stringify(projectId)};
    workspace.project.name = "Gate 0 company foundation smoke";
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
    'typeof state !== "undefined" && Boolean(state) && typeof guruStrategicFoundationCompanyHtmlV310 === "function"',
  );

  const initial = await evaluate(page, `(() => {
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};
    activeGateId = "gate-0";
    renderGate();
    const panels = [...document.querySelectorAll(
      "[data-guru-strategic-foundation-company]"
    )];
    const companyHeading = [...document.querySelectorAll(".gate0-section-heading")]
      .find((heading) => heading.querySelector(".gate0-section-heading-title")
        ?.textContent.trim() === "Раздел А — Компания");
    const foundation = window.__guruCompanyFoundationAudit(panels[0]);
    const rows = foundation.rows;
    const gate0 = state.gates.find((gate) => gate.id === "gate-0");
    window.__companyFoundationRenderCountV310 = 0;
    window.__companyFoundationOriginalRenderV310 = renderGate;
    renderGate = function () {
      window.__companyFoundationRenderCountV310 += 1;
      return window.__companyFoundationOriginalRenderV310.apply(this, arguments);
    };
    return {
      segmentRecords: guruV194ExactRecords("segments", "project", null, state).length,
      positioningRecords: guruV194ExactRecords("positioning", "project", null, state).length,
      offerRecords: guruV194ExactRecords("company_offer", "project", null, state).length,
      keywordRecords: guruV194ExactRecords("keyword_foundation", "project", null, state).length,
      panelCount: panels.length,
      rows,
      foundation,
      projectIds: panels.map((panel) => panel.dataset.projectId),
      hasProductMarker: panels.some((panel) => panel.hasAttribute("data-product-id")),
      cardPanelCounts: [
        ...${JSON.stringify(formerRecipientIds)},
        "gate0-company-segmentation",
        "gate0-company-positioning"
      ].map((id) => document.querySelector(
        '[data-card-row="' + id + '"] [data-guru-strategic-foundation-company]'
      )?.length || 0),
      sectionPlacement: Boolean(
        companyHeading &&
        panels[0]?.previousElementSibling === companyHeading &&
        panels[0]?.nextElementSibling?.dataset.cardRow === "card-1"
      ),
      otherGateCardIds: state.gates
        .filter((gate) => gate.id !== "gate-0")
        .map((gate) => [gate.id, gate.cards.map((card) => card.id)]),
      gate0CardCount: gate0.cards.length,
    };
  })()`);

  assert(initial.segmentRecords === 0, "Panel render created a segment record");
  assert(initial.positioningRecords === 0, "Panel render created a positioning record");
  assert(initial.offerRecords === 0, "Panel render created a company offer record");
  assert(
    initial.keywordRecords === 1,
    "Gate 0 keyword editor did not keep its single canonical empty record",
  );
  assert(initial.panelCount === 1, "Company foundation must render exactly once");
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
    "Brand Purpose row is missing from the company foundation",
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
    `Empty keyword foundation state is wrong: ${JSON.stringify(initial.foundation.keyword)}`,
  );
  assert(initial.projectIds.every((id) => id === projectId), "Panel project_id marker is wrong");
  assert(!initial.hasProductMarker, "Company panel must not have data-product-id");
  assert(initial.cardPanelCounts.every((count) => count === 0), "A Gate 0 card still contains the panel");
  assert(initial.sectionPlacement, "Panel is not between the company heading and first card");

  const filled = await evaluate(page, `(() => {
    const segmentation = {
      geography: "Москва",
      demographics: "Женщины 25–40 лет",
      psychographics: "Ценят индивидуальность",
      behavior: "Сравнивают предложения",
      need_response: "Реагируют на персонализацию",
      unified: "Женщины 25–40 лет, выбирающие авторские вещи осознанно"
    };
    Object.entries(segmentation).forEach(([key, value]) => {
      const input = document.querySelector(
        '[data-gate0-company-segmentation-field="' + key + '"]'
      );
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const positioning = {
      category: "СТАРАЯ КАТЕГОРИЯ НЕ ДОЛЖНА ПОКАЗЫВАТЬСЯ",
      key_difference: "СТАРОЕ ОТЛИЧИЕ НЕ ДОЛЖНО ПОКАЗЫВАТЬСЯ",
      basis: "СТАРОЕ ОСНОВАНИЕ НЕ ДОЛЖНО ПОКАЗЫВАТЬСЯ",
      unified: "Авторская мастерская тёплых вещей с характером"
    };
    Object.entries(positioning).forEach(([key, value]) => {
      const input = document.querySelector(
        '[data-gate0-company-positioning-field="' + key + '"]'
      );
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const brandPurpose = {
      functional: "Помогать выбирать осмысленные вещи",
      higher: "Поддерживать осознанное потребление",
      unified: "Помогать людям выбирать осмысленные вещи"
    };
    Object.entries(brandPurpose).forEach(([key, value]) => {
      const input = document.querySelector(
        '[data-gate0-company-brand-purpose-field="' + key + '"]'
      );
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const companyOffer = {
      rational: "СТАРАЯ РАЦИОНАЛЬНАЯ ЛИНЗА",
      irrational: "СТАРАЯ ИРРАЦИОНАЛЬНАЯ ЛИНЗА",
      social: "СТАРАЯ СОЦИАЛЬНАЯ ЛИНЗА",
      offer: "Выберите единственную вещь, созданную мастером для важного момента",
      cta: "СТАРЫЙ CTA НЕ ДОЛЖЕН ПОКАЗЫВАТЬСЯ"
    };
    Object.entries(companyOffer).forEach(([key, value]) => {
      const input = document.querySelector(
        '[data-gate0-company-offer-field="' + key + '"]'
      );
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const keywordRecord = guruCompanyKeywordFoundationRecordV351(state, true);
    keywordRecord.keywords = [
      { id: "company-keyword-confirmed-a", value: "авторская мастерская", source: "generated", status: "confirmed" },
      { id: "company-keyword-confirmed-b", value: "тёплые вещи с характером", source: "manual", status: "confirmed" },
      { id: "company-keyword-draft", value: "черновая фраза не показывать", source: "generated", status: "draft" }
    ];
    guruCompanyKeywordFoundationRefreshV351();
    guruStrategicFoundationCompanyRefreshV310();
    const panels = [...document.querySelectorAll(
      "[data-guru-strategic-foundation-company]"
    )];
    const foundation = window.__guruCompanyFoundationAudit(panels[0]);
    const rows = foundation.rows;
    saveState();
    return {
      panelCount: panels.length,
      rows,
      foundation,
      renderCount: window.__companyFoundationRenderCountV310,
      segmentRecords: guruV194ExactRecords("segments", "project", null, state).length,
      positioningRecords: guruV194ExactRecords("positioning", "project", null, state).length,
      offerRecords: guruV194ExactRecords("company_offer", "project", null, state).length,
      keywordRecords: guruV194ExactRecords("keyword_foundation", "project", null, state).length,
      projectIds: panels.map((panel) => panel.dataset.projectId),
    };
  })()`);

  assert(filled.panelCount === 1, "Live refresh did not preserve the single panel");
  assert(filled.renderCount === 0, "Source input triggered a full Gate 0 render");
  assert(filled.segmentRecords === 1, "Segmentation input did not create exactly one record");
  assert(filled.positioningRecords === 1, "Positioning input did not create exactly one record");
  assert(filled.offerRecords === 1, "Offer input did not create exactly one record");
  assert(filled.keywordRecords === 1, "Keyword fixture did not create exactly one record");
  assert(filled.rows.slice(0, 4).every((row) => row.status === "Готово"), "Filled rows are not ready");
  assert(
    JSON.stringify(filled.rows.slice(0, 4).map((row) => row.value)) === JSON.stringify([
      "Помогать людям выбирать осмысленные вещи",
      "Женщины 25–40 лет, выбирающие авторские вещи осознанно",
      "Авторская мастерская тёплых вещей с характером",
      "Выберите единственную вещь, созданную мастером для важного момента",
    ]),
    `Unified company values did not update live: ${JSON.stringify(filled.rows)}`,
  );
  assert(
    !filled.foundation.panelText.includes("СТАРАЯ КАТЕГОРИЯ") &&
      !filled.foundation.panelText.includes("СТАРОЕ ОТЛИЧИЕ") &&
      !filled.foundation.panelText.includes("СТАРОЕ ОСНОВАНИЕ") &&
      !filled.foundation.panelText.includes("СТАРЫЙ CTA"),
    "Structured positioning/offer parts leaked into the compact panel",
  );
  assert(
    filled.foundation.keyword.count === "2 ключевых слова" &&
      filled.foundation.keyword.summary === "Подтверждённые фразы" &&
      JSON.stringify(filled.foundation.keyword.phrases) === JSON.stringify([
        "авторская мастерская",
        "тёплые вещи с характером",
      ]),
    `Confirmed-only keyword summary is wrong: ${JSON.stringify(filled.foundation.keyword)}`,
  );

  await evaluate(page, `(() => {
    document.querySelector(
      "details[data-guru-strategic-company-keyword-foundation] > summary"
    )?.click();
    return true;
  })()`);
  await waitFor(
    page,
    'document.querySelector("details[data-guru-strategic-company-keyword-foundation]")?.open === true',
  );
  await wait(50);

  const keywordStatusRefresh = await evaluate(page, `(() => {
    const draftRow = document.querySelector(
      '[data-keyword-foundation-row-v257="company-keyword-draft"]'
    );
    draftRow?.querySelector("[data-gate0-company-keyword-confirm]")?.click();
    const afterConfirm = window.__guruCompanyFoundationAudit(
      document.querySelector("[data-guru-strategic-foundation-company]")
    );
    document.querySelector(
      '[data-keyword-foundation-row-v257="company-keyword-draft"] [data-gate0-company-keyword-remove]'
    )?.click();
    const afterRemove = window.__guruCompanyFoundationAudit(
      document.querySelector("[data-guru-strategic-foundation-company]")
    );
    const confirmedInput = document.querySelector(
      '[data-keyword-foundation-row-v257="company-keyword-confirmed-a"] [data-gate0-company-keyword-input]'
    );
    confirmedInput.value = "авторская мастерская обновлено";
    confirmedInput.dispatchEvent(new Event("input", { bubbles: true }));
    const afterInput = window.__guruCompanyFoundationAudit(
      document.querySelector("[data-guru-strategic-foundation-company]")
    );
    return {
      afterConfirm: afterConfirm.keyword,
      afterRemove: afterRemove.keyword,
      afterInput: afterInput.keyword,
      panelCount: document.querySelectorAll(
        "[data-guru-strategic-foundation-company]"
      ).length,
      renderCount: window.__companyFoundationRenderCountV310,
    };
  })()`);
  assert(
    keywordStatusRefresh.afterConfirm.open &&
      keywordStatusRefresh.afterConfirm.count === "3 ключевых слова" &&
      keywordStatusRefresh.afterConfirm.phrases.includes(
        "черновая фраза не показывать",
      ),
    `Confirm did not refresh the expanded panel: ${JSON.stringify(keywordStatusRefresh)}`,
  );
  assert(
    keywordStatusRefresh.afterRemove.open &&
      keywordStatusRefresh.afterRemove.count === "2 ключевых слова" &&
      !keywordStatusRefresh.afterRemove.phrases.includes(
        "черновая фраза не показывать",
      ),
    `Removal did not refresh the expanded panel: ${JSON.stringify(keywordStatusRefresh)}`,
  );
  assert(
    keywordStatusRefresh.afterInput.open &&
      keywordStatusRefresh.afterInput.phrases[0] ===
        "авторская мастерская обновлено" &&
      keywordStatusRefresh.panelCount === 1 &&
      keywordStatusRefresh.renderCount === 0,
    `Confirmed input did not refresh locally: ${JSON.stringify(keywordStatusRefresh)}`,
  );

  const liveRefresh = await evaluate(page, `(() => {
    const positioningRecord = guruV308ProjectPositioningRecord(state, false);
    positioningRecord.value = "Авторская мастерская — обновлённое позиционирование";
    const offerRecord = guruV347ProjectCompanyOfferRecord(state, false);
    offerRecord.value = "Обновлённый единый оффер компании";
    guruStrategicFoundationCompanyRefreshV310();
    saveState();
    const panel = document.querySelector("[data-guru-strategic-foundation-company]");
    return {
      ...window.__guruCompanyFoundationAudit(panel),
      panelCount: document.querySelectorAll("[data-guru-strategic-foundation-company]").length,
      renderCount: window.__companyFoundationRenderCountV310,
    };
  })()`);
  assert(liveRefresh.panelCount === 1, "Live refresh duplicated the company panel");
  assert(liveRefresh.renderCount === 0, "Live refresh triggered a full Gate render");
  assert(liveRefresh.keyword.open, "Expanded keyword foundation collapsed during live refresh");
  assert(
    liveRefresh.rows[2].value === "Авторская мастерская — обновлённое позиционирование" &&
      liveRefresh.rows[3].value === "Обновлённый единый оффер компании",
    `Positioning or offer did not refresh live: ${JSON.stringify(liveRefresh.rows)}`,
  );
  assert(
    JSON.stringify(liveRefresh.keyword.phrases) === JSON.stringify([
      "авторская мастерская обновлено",
      "тёплые вещи с характером",
    ]),
    "Expanded confirmed keyword list did not refresh live",
  );

  await evaluate(page, `(() => {
    document.querySelector('.gate0-section-heading')
      ?.scrollIntoView({ block: "start" });
    return true;
  })()`);
  await wait(150);
  const screenshot = await page.call("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
  });
  await writeFile(
    "artifacts/gate0-company-strategic-foundation-v355.png",
    Buffer.from(screenshot.data, "base64"),
  );

  await evaluate(page, "location.reload(); true");
  await waitFor(
    page,
    'typeof state !== "undefined" && Boolean(state) && activeProjectId === ' +
      JSON.stringify(projectId),
  );
  const afterReload = await evaluate(page, `(() => {
    activeGateId = "gate-0";
    renderGate();
    const panels = [...document.querySelectorAll(
      "[data-guru-strategic-foundation-company]"
    )];
    const first = panels[0];
    const foundation = window.__guruCompanyFoundationAudit(first);
    return {
      panelCount: panels.length,
      foundation,
      segmentRecords: guruV194ExactRecords("segments", "project", null, state).length,
      positioningRecords: guruV194ExactRecords("positioning", "project", null, state).length,
      offerRecords: guruV194ExactRecords("company_offer", "project", null, state).length,
      keywordRecords: guruV194ExactRecords("keyword_foundation", "project", null, state).length,
      otherGateCardIds: state.gates
        .filter((gate) => gate.id !== "gate-0")
        .map((gate) => [gate.id, gate.cards.map((card) => card.id)]),
      errors: window.__guruErrors,
    };
  })()`);

  assert(afterReload.panelCount === 1, "Single panel did not survive hard reload");
  assert(
    JSON.stringify(afterReload.foundation.rows.map((row) => row.label)) ===
      JSON.stringify(initial.rows.map((row) => row.label)),
    "Five-row company order changed after reload",
  );
  assert(
    JSON.stringify(afterReload.foundation.rows.slice(0, 4).map((row) => row.value)) ===
      JSON.stringify(liveRefresh.rows.slice(0, 4).map((row) => row.value)),
    "Unified company values changed after reload",
  );
  assert(afterReload.foundation.keyword.open, "Keyword foundation expansion did not survive hard reload");
  assert(
    afterReload.foundation.keyword.count === "2 ключевых слова" &&
      JSON.stringify(afterReload.foundation.keyword.phrases) ===
        JSON.stringify(liveRefresh.keyword.phrases),
    "Confirmed keyword list changed after reload",
  );
  assert(afterReload.segmentRecords === 1, "Segment record duplicated after reload");
  assert(afterReload.positioningRecords === 1, "Positioning record duplicated after reload");
  assert(afterReload.offerRecords === 1, "Company offer record duplicated after reload");
  assert(afterReload.keywordRecords === 1, "Company keyword record duplicated after reload");
  assert(
    JSON.stringify(afterReload.otherGateCardIds) === JSON.stringify(initial.otherGateCardIds),
    "Another gate card structure changed",
  );
  assert(afterReload.errors.length === 0, `Browser errors: ${afterReload.errors.join(" | ")}`);

  console.log(JSON.stringify({ initial, filled, liveRefresh, afterReload }, null, 2));
  console.log("gate0 company strategic foundation smoke: OK");
} finally {
  page.close();
  await browser.call("Target.closeTarget", { targetId }).catch(() => {});
  await browser.call("Target.disposeBrowserContext", { browserContextId }).catch(() => {});
  browser.close();
}
