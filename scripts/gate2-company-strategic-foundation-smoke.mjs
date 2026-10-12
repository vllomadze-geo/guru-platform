import { writeFile } from "node:fs/promises";

const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9362";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const projectId = "gate2-company-foundation-v310-smoke";
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
    'typeof bootstrapAppOnce === "function" && typeof renderGate2Redesign === "function"',
  );

  await evaluate(page, `(() => {
    const workspace = structuredClone(window.GURU_SEED);
    workspace.project.id = ${JSON.stringify(projectId)};
    workspace.project.name = "Gate 2 company foundation smoke";
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
    activeGateId = "gate-2";
    renderGate();
    const company = document.querySelector('[data-g2-scope="company"]');
    const product = document.querySelector('[data-g2-scope="product"]');
    const panels = [...document.querySelectorAll(
      "[data-guru-strategic-foundation-company]"
    )];
    const panel = panels[0];
    const companyHeading = company?.querySelector(
      ":scope > .gate0-section-heading"
    );
    const foundation = window.__guruCompanyFoundationAudit(panel);
    const rows = foundation.rows;
    const gate2 = state.gates.find((gate) => gate.id === "gate-2");
    const expectedCompanyCards = [
      "card-96", "card-97", "card-98", "g2-canonical",
      "card-107", "card-108", "card-109", "card-110", "card-111",
      "card-113", "card-114", "card-122", "card-123", "card-124",
      "card-131", "card-132", "card-134", "card-135", "card-136"
    ];
    const scopeAudit = g2ScopeAuditV267(gate2, state);
    window.__companyFoundationGate2RenderCountV310 = 0;
    window.__companyFoundationGate2OriginalRenderV310 = renderGate;
    renderGate = function () {
      window.__companyFoundationGate2RenderCountV310 += 1;
      return window.__companyFoundationGate2OriginalRenderV310.apply(this, arguments);
    };
    return {
      segmentRecords: guruV194ExactRecords("segments", "project", null, state).length,
      positioningRecords: guruV194ExactRecords("positioning", "project", null, state).length,
      offerRecords: guruV194ExactRecords("company_offer", "project", null, state).length,
      keywordRecords: guruV194ExactRecords("keyword_foundation", "project", null, state).length,
      panelCount: panels.length,
      companyPanelCount: company?.querySelectorAll(
        ":scope > [data-guru-strategic-foundation-company]"
      ).length || 0,
      productPanelCount: product?.querySelectorAll(
        "[data-guru-strategic-foundation-company]"
      ).length || 0,
      rows,
      foundation,
      projectIds: panels.map((item) => item.dataset.projectId),
      hasProductMarker: panels.some((item) => item.hasAttribute("data-product-id")),
      insideCardCount: document.querySelectorAll(
        ".g2-check-row [data-guru-strategic-foundation-company]"
      ).length,
      insideGroupedSectionCount: company?.querySelectorAll(
        ".g1-section [data-guru-strategic-foundation-company]"
      ).length || 0,
      sectionPlacement: Boolean(
        companyHeading &&
        panel?.previousElementSibling === companyHeading &&
        panel?.nextElementSibling?.matches(".g1-section, .g1-empty")
      ),
      companyChildOrder: [...(company?.children || [])].slice(0, 5).map((node) => ({
        tag: node.tagName,
        className: node.className,
        strategic: node.hasAttribute("data-guru-strategic-foundation-company"),
        heading: node.querySelector(".gate0-section-heading-title")?.textContent.trim() || ""
      })),
      scopeCount: document.querySelectorAll("[data-g2-scope]").length,
      expectedCompanyCardsMissing: expectedCompanyCards.filter(
        (id) => !scopeAudit.company.some((row) => row.cardId === id)
      ),
      companyVisibleCardIds: [...(company?.querySelectorAll(".g2-check-row[data-card]") || [])]
        .map((node) => node.dataset.card),
      productSignature: {
        heading: product?.querySelector(
          ":scope > .gate0-section-heading .gate0-section-heading-title"
        )?.textContent.trim() || "",
        modelCount: product?.dataset.g2ModelCardCount || "",
        visibleCount: product?.dataset.g2VisibleCardCount || "",
        cardIds: [...(product?.querySelectorAll(".g2-check-row[data-card]") || [])]
          .map((node) => node.dataset.card),
        selectorCount: product?.querySelectorAll(
          '[data-gate0-scope-product-select="gate2-product"]'
        ).length || 0,
      },
      gate2CardIds: gate2.cards.map((card) => card.id),
      otherGateCardIds: state.gates
        .filter((gate) => gate.id !== "gate-2")
        .map((gate) => [gate.id, gate.cards.map((card) => card.id)]),
    };
  })()`);

  assert(initial.segmentRecords === 0, "Panel render created a segment record");
  assert(initial.positioningRecords === 0, "Panel render created a positioning record");
  assert(initial.offerRecords === 0, "Panel render created a company offer record");
  assert(initial.keywordRecords === 0, "Panel render created a company keyword record");
  assert(initial.panelCount === 1, "Company foundation must render exactly once in Gate 2");
  assert(initial.companyPanelCount === 1, "Company scope lacks its one direct panel");
  assert(initial.productPanelCount === 0, "Company panel leaked into the product scope");
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
    "Brand Purpose row is missing from the Gate 2 company foundation",
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
    `Empty Gate 2 keyword foundation state is wrong: ${JSON.stringify(initial.foundation.keyword)}`,
  );
  assert(initial.projectIds.every((id) => id === projectId), "Panel project_id marker is wrong");
  assert(!initial.hasProductMarker, "Company panel must not have data-product-id");
  assert(initial.insideCardCount === 0, "A Gate 2 card contains the company panel");
  assert(initial.insideGroupedSectionCount === 0, "A Gate 2 grouped section contains the panel");
  assert(
    initial.sectionPlacement,
    `Panel is not immediately below the company heading: ${JSON.stringify(initial.companyChildOrder)}`,
  );
  assert(initial.scopeCount === 2, "Gate 2 company/product split changed");
  assert(
    initial.expectedCompanyCardsMissing.length === 0,
    `Approved company cards are outside company scope: ${initial.expectedCompanyCardsMissing.join(", ")}`,
  );
  assert(initial.productSignature.heading === "Продукт/Услуга", "Product heading changed");

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
    flashSaving();
    const panels = [...document.querySelectorAll(
      "[data-guru-strategic-foundation-company]"
    )];
    const foundation = window.__guruCompanyFoundationAudit(panels[0]);
    const rows = foundation.rows;
    return {
      panelCount: panels.length,
      rows,
      foundation,
      renderCount: window.__companyFoundationGate2RenderCountV310,
      segmentRecords: guruV194ExactRecords("segments", "project", null, state).length,
      positioningRecords: guruV194ExactRecords("positioning", "project", null, state).length,
      offerRecords: guruV194ExactRecords("company_offer", "project", null, state).length,
      keywordRecords: guruV194ExactRecords("keyword_foundation", "project", null, state).length,
    };
  })()`);

  assert(filled.panelCount === 1, "Live refresh did not preserve the single Gate 2 panel");
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
    `Unified company values did not update live in Gate 2: ${JSON.stringify(filled.rows)}`,
  );
  assert(
    !filled.foundation.panelText.includes("СТАРАЯ КАТЕГОРИЯ") &&
      !filled.foundation.panelText.includes("СТАРОЕ ОТЛИЧИЕ") &&
      !filled.foundation.panelText.includes("СТАРОЕ ОСНОВАНИЕ") &&
      !filled.foundation.panelText.includes("СТАРЫЙ CTA"),
    "Structured positioning/offer parts leaked into Gate 2",
  );
  assert(
    filled.foundation.keyword.summary === "Подтверждённые фразы" &&
      filled.foundation.keyword.count === "2 ключевых слова" &&
      JSON.stringify(filled.foundation.keyword.phrases) === JSON.stringify([
        "авторская мастерская",
        "тёплые вещи с характером",
      ]),
    `Gate 2 confirmed-only keywords are wrong: ${JSON.stringify(filled.foundation.keyword)}`,
  );

  await evaluate(page, `document.querySelector("details[data-guru-strategic-company-keyword-foundation] > summary")?.click(); true`);
  await waitFor(page, 'document.querySelector("details[data-guru-strategic-company-keyword-foundation]")?.open === true');
  const expanded = await evaluate(page, `(() => {
    guruStrategicFoundationCompanyRefreshV310();
    saveState();
    return window.__guruCompanyFoundationAudit(
      document.querySelector("[data-guru-strategic-foundation-company]")
    );
  })()`);
  assert(expanded.keyword.open, "Gate 2 keyword foundation collapsed during live refresh");
  assert(
    JSON.stringify(expanded.keyword.phrases) === JSON.stringify(filled.foundation.keyword.phrases),
    "Gate 2 expanded keyword list changed during live refresh",
  );

  await wait(700);
  await evaluate(page, `(() => {
    document.querySelector('[data-g2-scope="company"] > .gate0-section-heading')
      ?.scrollIntoView({ block: "start" });
    return true;
  })()`);
  await wait(150);
  const screenshot = await page.call("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
  });
  await writeFile(
    "artifacts/gate2-company-strategic-foundation-v310.png",
    Buffer.from(screenshot.data, "base64"),
  );

  await evaluate(page, "location.reload(); true");
  await waitFor(
    page,
    'typeof state !== "undefined" && Boolean(state) && activeProjectId === ' +
      JSON.stringify(projectId),
  );
  const afterReload = await evaluate(page, `(() => {
    activeGateId = "gate-2";
    renderGate();
    const company = document.querySelector('[data-g2-scope="company"]');
    const product = document.querySelector('[data-g2-scope="product"]');
    const panels = [...document.querySelectorAll(
      "[data-guru-strategic-foundation-company]"
    )];
    const first = panels[0];
    const gate2 = state.gates.find((gate) => gate.id === "gate-2");
    const foundation = window.__guruCompanyFoundationAudit(first);
    return {
      panelCount: panels.length,
      directCompanyPanelCount: company?.querySelectorAll(
        ":scope > [data-guru-strategic-foundation-company]"
      ).length || 0,
      insideCardCount: document.querySelectorAll(
        ".g2-check-row [data-guru-strategic-foundation-company]"
      ).length,
      foundation,
      segmentRecords: guruV194ExactRecords("segments", "project", null, state).length,
      positioningRecords: guruV194ExactRecords("positioning", "project", null, state).length,
      offerRecords: guruV194ExactRecords("company_offer", "project", null, state).length,
      keywordRecords: guruV194ExactRecords("keyword_foundation", "project", null, state).length,
      scopeCount: document.querySelectorAll("[data-g2-scope]").length,
      productSignature: {
        heading: product?.querySelector(
          ":scope > .gate0-section-heading .gate0-section-heading-title"
        )?.textContent.trim() || "",
        modelCount: product?.dataset.g2ModelCardCount || "",
        visibleCount: product?.dataset.g2VisibleCardCount || "",
        cardIds: [...(product?.querySelectorAll(".g2-check-row[data-card]") || [])]
          .map((node) => node.dataset.card),
        selectorCount: product?.querySelectorAll(
          '[data-gate0-scope-product-select="gate2-product"]'
        ).length || 0,
      },
      gate2CardIds: gate2.cards.map((card) => card.id),
      otherGateCardIds: state.gates
        .filter((gate) => gate.id !== "gate-2")
        .map((gate) => [gate.id, gate.cards.map((card) => card.id)]),
      errors: window.__guruErrors,
    };
  })()`);

  assert(afterReload.panelCount === 1, "Single Gate 2 panel did not survive hard reload");
  assert(afterReload.directCompanyPanelCount === 1, "Panel moved out of the company scope after reload");
  assert(afterReload.insideCardCount === 0, "Panel moved inside a Gate 2 card after reload");
  assert(
    JSON.stringify(afterReload.foundation.rows.map((row) => row.label)) ===
      JSON.stringify(initial.rows.map((row) => row.label)),
    "Gate 2 five-row order changed after reload",
  );
  assert(
    JSON.stringify(afterReload.foundation.rows.slice(0, 4).map((row) => row.value)) ===
      JSON.stringify(filled.rows.slice(0, 4).map((row) => row.value)),
    "Gate 2 unified values changed after reload",
  );
  assert(afterReload.foundation.keyword.open, "Gate 2 keyword expansion did not survive reload");
  assert(
    JSON.stringify(afterReload.foundation.keyword.phrases) ===
      JSON.stringify(filled.foundation.keyword.phrases),
    "Gate 2 confirmed keywords changed after reload",
  );
  assert(afterReload.segmentRecords === 1, "Segment record duplicated after reload");
  assert(afterReload.positioningRecords === 1, "Positioning record duplicated after reload");
  assert(afterReload.offerRecords === 1, "Offer record duplicated after reload");
  assert(afterReload.keywordRecords === 1, "Keyword record duplicated after reload");
  assert(afterReload.scopeCount === initial.scopeCount, "Gate 2 scope structure changed after reload");
  assert(
    JSON.stringify(afterReload.productSignature) === JSON.stringify(initial.productSignature),
    "Gate 2 product section changed",
  );
  assert(
    JSON.stringify(afterReload.gate2CardIds) === JSON.stringify(initial.gate2CardIds),
    "Gate 2 card structure changed",
  );
  assert(
    JSON.stringify(afterReload.otherGateCardIds) === JSON.stringify(initial.otherGateCardIds),
    "Another gate card structure changed",
  );
  assert(afterReload.errors.length === 0, `Browser errors: ${afterReload.errors.join(" | ")}`);

  console.log(JSON.stringify({ initial, filled, expanded, afterReload }, null, 2));
  console.log("gate2 company strategic foundation smoke: OK");
} finally {
  page.close();
  await browser.call("Target.closeTarget", { targetId }).catch(() => {});
  await browser.call("Target.disposeBrowserContext", { browserContextId }).catch(() => {});
  browser.close();
}
