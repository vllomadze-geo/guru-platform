import { writeFile } from "node:fs/promises";

const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9362";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const projectId = "gate1-company-foundation-v310-smoke";
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
    workspace.project.name = "Gate 1 company foundation smoke";
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
    activeGateId = "gate-1";
    getGate1AccordionState().subblocks[
      GATE1_COMPANY_DEMAND_POSITIONING_SECTION_V357
    ] = true;
    renderGate();
    const root = document.querySelector(".g1-redesign");
    const panels = [...document.querySelectorAll(
      "[data-guru-strategic-foundation-company]"
    )];
    const panel = panels[0];
    const companyHeading = [...document.querySelectorAll(".gate0-section-heading")]
      .find((heading) => heading.querySelector(".gate0-section-heading-title")
        ?.textContent.trim() === "Компания");
    const companyContainer = document.querySelector(
      "[data-gate1-company-demand-positioning-v357]",
    );
    const companyToggle = companyContainer?.querySelector(
      ':scope > [data-gate1-toggle-section="company_demand_positioning"]',
    );
    const brandSemantics = document.querySelector("[data-gate1-company-semantics-v264]");
    const foundation = window.__guruCompanyFoundationAudit(panel);
    const rows = foundation.rows;
    const gate1 = state.gates.find((gate) => gate.id === "gate-1");
    window.__companyFoundationGate1RenderCountV310 = 0;
    window.__companyFoundationGate1OriginalRenderV310 = renderGate;
    renderGate = function () {
      window.__companyFoundationGate1RenderCountV310 += 1;
      return window.__companyFoundationGate1OriginalRenderV310.apply(this, arguments);
    };
    return {
      segmentRecords: guruV194ExactRecords("segments", "project", null, state).length,
      positioningRecords: guruV194ExactRecords("positioning", "project", null, state).length,
      offerRecords: guruV194ExactRecords("company_offer", "project", null, state).length,
      keywordRecords: guruV194ExactRecords("keyword_foundation", "project", null, state).length,
      panelCount: panels.length,
      rows,
      foundation,
      projectIds: panels.map((item) => item.dataset.projectId),
      hasProductMarker: panels.some((item) => item.hasAttribute("data-product-id")),
      companyContainerCount: document.querySelectorAll(
        "[data-gate1-company-demand-positioning-v357]",
      ).length,
      legacyHeadingCount: document.querySelectorAll(
        "[data-gate1-company-demand-positioning-heading-v346]",
      ).length,
      companyContainerTitle: companyToggle
        ?.querySelector(".g1-section-title")?.textContent.trim() || "",
      companyContainerKey: companyToggle?.dataset.gate1ToggleSection || "",
      companyContainerExpanded: companyToggle?.getAttribute("aria-expanded") || "",
      panelInsideContainer: panel?.closest(
        "[data-gate1-company-demand-positioning-v357]",
      ) === companyContainer,
      semanticsInsideContainer: brandSemantics?.closest(
        "[data-gate1-company-demand-positioning-v357]",
      ) === companyContainer,
      topLevelContainer: companyContainer?.parentElement === root,
      sectionPlacement: Boolean(
        companyHeading && companyContainer &&
        companyHeading.nextElementSibling === companyContainer
      ),
      sectionOrder: [...(root?.children || [])].slice(0, 8).map((node) => ({
        tag: node.tagName,
        className: node.className,
        companyContainer: node.hasAttribute("data-gate1-company-demand-positioning-v357"),
        strategic: node.hasAttribute("data-guru-strategic-foundation-company"),
        semantics: node.hasAttribute("data-gate1-company-semantics-v264"),
        heading: node.querySelector(".gate0-section-heading-title")?.textContent.trim() || ""
      })),
      productHeadingCount: [...document.querySelectorAll(".gate0-section-heading-title")]
        .filter((node) => node.textContent.trim() === "Продукт / Услуга").length,
      gate1CardIds: gate1.cards.map((card) => card.id),
      otherGateCardIds: state.gates
        .filter((gate) => gate.id !== "gate-1")
        .map((gate) => [gate.id, gate.cards.map((card) => card.id)]),
    };
  })()`);

  assert(initial.segmentRecords === 0, "Panel render created a segment record");
  assert(initial.positioningRecords === 0, "Panel render created a positioning record");
  assert(initial.offerRecords === 0, "Panel render created a company offer record");
  assert(initial.keywordRecords === 0, "Panel render created a company keyword record");
  assert(initial.panelCount === 1, "Company foundation must render exactly once in Gate 1");
  assert(initial.companyContainerCount === 1, "Company container must render exactly once in Gate 1");
  assert(initial.legacyHeadingCount === 0, "Legacy standalone company heading is still rendered");
  assert(
    initial.companyContainerTitle === "Спрос, ценность, позиционирование · Компания",
    `Wrong company container heading: ${initial.companyContainerTitle}`,
  );
  assert(
    initial.companyContainerKey === "company_demand_positioning",
    `Wrong company accordion key: ${initial.companyContainerKey}`,
  );
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
    "Brand Purpose row is missing from the Gate 1 company foundation",
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
    `Empty Gate 1 keyword foundation state is wrong: ${JSON.stringify(initial.foundation.keyword)}`,
  );
  assert(initial.projectIds.every((id) => id === projectId), "Panel project_id marker is wrong");
  assert(!initial.hasProductMarker, "Company panel must not have data-product-id");
  assert(initial.panelInsideContainer, "Company foundation is outside the unified container");
  assert(initial.semanticsInsideContainer, "Company semantics is outside the unified container");
  assert(initial.topLevelContainer, "Company container is not a single top-level Gate 1 node");
  assert(initial.companyContainerExpanded === "true", "Company container did not open");
  assert(
    initial.sectionPlacement,
    `Approved company container placement is broken: ${JSON.stringify(initial.sectionOrder)}`,
  );
  assert(initial.productHeadingCount === 1, "Gate 1 product section heading changed");

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
      renderCount: window.__companyFoundationGate1RenderCountV310,
      segmentRecords: guruV194ExactRecords("segments", "project", null, state).length,
      positioningRecords: guruV194ExactRecords("positioning", "project", null, state).length,
      offerRecords: guruV194ExactRecords("company_offer", "project", null, state).length,
      keywordRecords: guruV194ExactRecords("keyword_foundation", "project", null, state).length,
    };
  })()`);

  assert(filled.panelCount === 1, "Live refresh did not preserve the single Gate 1 panel");
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
    `Unified company values did not update live in Gate 1: ${JSON.stringify(filled.rows)}`,
  );
  assert(
    !filled.foundation.panelText.includes("СТАРАЯ КАТЕГОРИЯ") &&
      !filled.foundation.panelText.includes("СТАРОЕ ОТЛИЧИЕ") &&
      !filled.foundation.panelText.includes("СТАРОЕ ОСНОВАНИЕ") &&
      !filled.foundation.panelText.includes("СТАРЫЙ CTA"),
    "Structured positioning/offer parts leaked into Gate 1",
  );
  assert(
    filled.foundation.keyword.summary === "Подтверждённые фразы" &&
      filled.foundation.keyword.count === "2 ключевых слова" &&
      JSON.stringify(filled.foundation.keyword.phrases) === JSON.stringify([
        "авторская мастерская",
        "тёплые вещи с характером",
      ]),
    `Gate 1 confirmed-only keywords are wrong: ${JSON.stringify(filled.foundation.keyword)}`,
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
  assert(expanded.keyword.open, "Gate 1 keyword foundation collapsed during live refresh");
  assert(
    JSON.stringify(expanded.keyword.phrases) === JSON.stringify(filled.foundation.keyword.phrases),
    "Gate 1 expanded keyword list changed during live refresh",
  );

  await evaluate(page, `(() => {
    document.querySelector(".gate0-section-heading")
      ?.scrollIntoView({ block: "start" });
    return true;
  })()`);
  await wait(150);
  const screenshot = await page.call("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
  });
  await writeFile(
    "artifacts/gate1-company-strategic-foundation-v310.png",
    Buffer.from(screenshot.data, "base64"),
  );

  await evaluate(page, "location.reload(); true");
  await waitFor(
    page,
    'typeof state !== "undefined" && Boolean(state) && activeProjectId === ' +
      JSON.stringify(projectId),
  );
  const afterReload = await evaluate(page, `(() => {
    activeGateId = "gate-1";
    renderGate();
    const panels = [...document.querySelectorAll(
      "[data-guru-strategic-foundation-company]"
    )];
    const first = panels[0];
    const companyContainer = document.querySelector(
      "[data-gate1-company-demand-positioning-v357]",
    );
    const companyToggle = companyContainer?.querySelector(
      ':scope > [data-gate1-toggle-section="company_demand_positioning"]',
    );
    const companyHeading = [...document.querySelectorAll(".gate0-section-heading")]
      .find((heading) => heading.querySelector(".gate0-section-heading-title")
        ?.textContent.trim() === "Компания");
    const brandSemantics = document.querySelector("[data-gate1-company-semantics-v264]");
    const gate1 = state.gates.find((gate) => gate.id === "gate-1");
    const foundation = window.__guruCompanyFoundationAudit(first);
    return {
      panelCount: panels.length,
      companyContainerCount: document.querySelectorAll(
        "[data-gate1-company-demand-positioning-v357]",
      ).length,
      legacyHeadingCount: document.querySelectorAll(
        "[data-gate1-company-demand-positioning-heading-v346]",
      ).length,
      companyContainerTitle: companyToggle
        ?.querySelector(".g1-section-title")?.textContent.trim() || "",
      companyContainerKey: companyToggle?.dataset.gate1ToggleSection || "",
      companyContainerExpanded: companyToggle?.getAttribute("aria-expanded") || "",
      panelInsideContainer: first?.closest(
        "[data-gate1-company-demand-positioning-v357]",
      ) === companyContainer,
      semanticsInsideContainer: brandSemantics?.closest(
        "[data-gate1-company-demand-positioning-v357]",
      ) === companyContainer,
      topLevelContainer: companyContainer?.parentElement === document.querySelector(".g1-redesign"),
      sectionPlacement: Boolean(
        companyHeading && companyContainer &&
        companyHeading.nextElementSibling === companyContainer
      ),
      foundation,
      segmentRecords: guruV194ExactRecords("segments", "project", null, state).length,
      positioningRecords: guruV194ExactRecords("positioning", "project", null, state).length,
      offerRecords: guruV194ExactRecords("company_offer", "project", null, state).length,
      keywordRecords: guruV194ExactRecords("keyword_foundation", "project", null, state).length,
      productHeadingCount: [...document.querySelectorAll(".gate0-section-heading-title")]
        .filter((node) => node.textContent.trim() === "Продукт / Услуга").length,
      gate1CardIds: gate1.cards.map((card) => card.id),
      otherGateCardIds: state.gates
        .filter((gate) => gate.id !== "gate-1")
        .map((gate) => [gate.id, gate.cards.map((card) => card.id)]),
      errors: window.__guruErrors,
    };
  })()`);

  assert(afterReload.panelCount === 1, "Single Gate 1 panel did not survive hard reload");
  assert(afterReload.companyContainerCount === 1, "Company container duplicated after reload");
  assert(afterReload.legacyHeadingCount === 0, "Legacy company heading returned after reload");
  assert(
    afterReload.companyContainerTitle === "Спрос, ценность, позиционирование · Компания",
    "Company container heading changed after reload",
  );
  assert(
    afterReload.companyContainerKey === "company_demand_positioning",
    "Company accordion key changed after reload",
  );
  assert(afterReload.companyContainerExpanded === "true", "Company container expansion did not survive reload");
  assert(afterReload.panelInsideContainer, "Company foundation escaped the container after reload");
  assert(afterReload.semanticsInsideContainer, "Company semantics escaped the container after reload");
  assert(afterReload.topLevelContainer, "Company container is not top-level after reload");
  assert(afterReload.sectionPlacement, "Company container order changed after reload");
  assert(
    JSON.stringify(afterReload.foundation.rows.map((row) => row.label)) ===
      JSON.stringify(initial.rows.map((row) => row.label)),
    "Gate 1 five-row order changed after reload",
  );
  assert(
    JSON.stringify(afterReload.foundation.rows.slice(0, 4).map((row) => row.value)) ===
      JSON.stringify(filled.rows.slice(0, 4).map((row) => row.value)),
    "Gate 1 unified values changed after reload",
  );
  assert(afterReload.foundation.keyword.open, "Gate 1 keyword expansion did not survive reload");
  assert(
    JSON.stringify(afterReload.foundation.keyword.phrases) ===
      JSON.stringify(filled.foundation.keyword.phrases),
    "Gate 1 confirmed keywords changed after reload",
  );
  assert(afterReload.segmentRecords === 1, "Segment record duplicated after reload");
  assert(afterReload.positioningRecords === 1, "Positioning record duplicated after reload");
  assert(afterReload.offerRecords === 1, "Offer record duplicated after reload");
  assert(afterReload.keywordRecords === 1, "Keyword record duplicated after reload");
  assert(afterReload.productHeadingCount === initial.productHeadingCount, "Product section changed after reload");
  assert(
    JSON.stringify(afterReload.gate1CardIds) === JSON.stringify(initial.gate1CardIds),
    "Gate 1 card structure changed",
  );
  assert(
    JSON.stringify(afterReload.otherGateCardIds) === JSON.stringify(initial.otherGateCardIds),
    "Another gate card structure changed",
  );
  assert(afterReload.errors.length === 0, `Browser errors: ${afterReload.errors.join(" | ")}`);

  console.log(JSON.stringify({ initial, filled, expanded, afterReload }, null, 2));
  console.log("gate1 company strategic foundation smoke: OK");
} finally {
  page.close();
  await browser.call("Target.closeTarget", { targetId }).catch(() => {});
  await browser.call("Target.disposeBrowserContext", { browserContextId }).catch(() => {});
  browser.close();
}
