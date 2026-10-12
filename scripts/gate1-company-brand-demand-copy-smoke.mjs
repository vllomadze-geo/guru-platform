const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9366";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const projectId = "gate1-company-brand-demand-copy-v358-smoke";
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
    'typeof gate1CompanyBrandDemandReconcileV345 === "function" && ' +
      'typeof gate1CompanyBrandDemandRefreshV345 === "function" && ' +
      'typeof guruCompanyKeywordFoundationRecordV351 === "function" && ' +
      'typeof g4sbV141CopyText === "function"',
  );

  await evaluate(page, `(() => {
    const workspace = structuredClone(window.GURU_SEED);
    workspace.project.id = ${JSON.stringify(projectId)};
    workspace.project.name = "Gate 1 company demand copy smoke";
    workspace.project.gate0ScopedValuesV194 = [];
    workspace.painV130 = workspace.painV130 || { openSteps: {}, steps: {} };
    workspace.painV130.companySemanticsV264 = {
      brandPhrases: "SMM-фраза не должна копироваться",
      demandRows: [],
      archivedDemandRows: [{
        id: "archived-demand-v358",
        candidate_id: "archived-candidate-v358",
        kw: "архивная фраза не должна копироваться",
        vol: "9901",
        queryCount: "9902",
        forecastClicks: "9903",
        clickPrice: "9904",
        bid: "9905",
        forecastBudget: "9906",
        archivedAt: "2026-09-15T00:00:00.000Z",
      }],
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
    `typeof state !== "undefined" && Boolean(state) && ` +
      `activeProjectId === ${JSON.stringify(projectId)}`,
  );

  const empty = await evaluate(page, `(async () => {
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};
    window.__companyDemandCopiedV358 = [];
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text) => window.__companyDemandCopiedV358.push(text),
      },
    });
    const record = guruCompanyKeywordFoundationRecordV351(state, true);
    record.keywords = [];
    const company = gate1CompanySemanticsV264(state);
    company.demandRows = [];
    activeView = "gate";
    activeGateId = "gate-1";
    if (typeof GATE1_COMPANY_DEMAND_POSITIONING_SECTION_V357 === "string")
      getGate1AccordionState().subblocks[
        GATE1_COMPANY_DEMAND_POSITIONING_SECTION_V357
      ] = true;
    renderGate();
    const root = document.querySelector("[data-pv181-company-demand-v345]");
    const copy = root?.querySelector(
      "[data-pv181-company-demand-copy-keywords-v358]",
    );
    const exportButton = root?.querySelector(
      "[data-pv181-company-demand-export-v356]",
    );
    const importButton = root?.querySelector(
      "[data-pv181-company-demand-import-v356]",
    );
    if (copy) copy.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 20));
    return {
      root: Boolean(root),
      buttonCount: root?.querySelectorAll(
        "[data-pv181-company-demand-copy-keywords-v358]",
      ).length || 0,
      label: copy?.textContent.trim() || "",
      disabled: Boolean(copy?.disabled),
      sameActions: Boolean(
        copy && exportButton && importButton &&
        copy.parentElement === exportButton.parentElement &&
        copy.parentElement === importButton.parentElement
      ),
      copied: [...window.__companyDemandCopiedV358],
    };
  })()`);

  assert(empty.root, "Company demand block is missing");
  assert(empty.buttonCount === 1, "Copy-all button must render exactly once");
  assert(empty.label === "Копировать все слова", `Wrong button label: ${empty.label}`);
  assert(empty.disabled, "Copy-all button must be disabled for an empty source");
  assert(empty.sameActions, "Copy-all button is not beside Export and Import");
  assert(empty.copied.length === 0, "Empty source wrote to the clipboard");

  const filled = await evaluate(page, `(async () => {
    const record = guruCompanyKeywordFoundationRecordV351(state, true);
    record.keywords = [
      {
        id: "company-copy-a-v358",
        value: "первая подтверждённая фраза",
        source: "manual",
        status: "confirmed",
      },
      {
        id: "company-copy-draft-v358",
        value: "черновик не должен копироваться",
        source: "generated",
        status: "draft",
      },
      {
        id: "company-copy-b-v358",
        value: "вторая подтверждённая фраза",
        source: "imported",
        status: "confirmed",
      },
      {
        id: "company-copy-duplicate-v358",
        value: "  ПЕРВАЯ ПОДТВЕРЖДЁННАЯ ФРАЗА  ",
        source: "imported",
        status: "confirmed",
      },
    ];
    const company = gate1CompanySemanticsV264(state);
    company.brandPhrases = "SMM-фраза не должна копироваться";
    company.archivedDemandRows = [{
      id: "archived-demand-v358",
      candidate_id: "archived-candidate-v358",
      kw: "архивная фраза не должна копироваться",
      vol: "9901",
      queryCount: "9902",
      forecastClicks: "9903",
      clickPrice: "9904",
      bid: "9905",
      forecastBudget: "9906",
      archivedAt: "2026-09-15T00:00:00.000Z",
    }];
    const model = gate1CompanyBrandDemandReconcileV345(state, { create: true });
    if (model.rows.length !== 2)
      throw new Error("Expected two unique confirmed demand rows");
    model.rows.forEach((row, index) => Object.assign(row, {
      vol: String(1001 + index),
      queryCount: String(2001 + index),
      forecastClicks: String(3001 + index),
      clickPrice: String(4001 + index),
      bid: String(5001 + index),
      forecastBudget: String(6001 + index),
    }));
    gate1CompanyBrandDemandRefreshV345({ preserveOpen: true });
    const root = document.querySelector("[data-pv181-company-demand-v345]");
    const copy = root?.querySelector(
      "[data-pv181-company-demand-copy-keywords-v358]",
    );
    const exportButton = root?.querySelector(
      "[data-pv181-company-demand-export-v356]",
    );
    const importButton = root?.querySelector(
      "[data-pv181-company-demand-import-v356]",
    );
    const before = JSON.stringify({
      keywordFoundation: guruCompanyKeywordFoundationRecordV351(state, false),
      company: gate1CompanySemanticsV264(state),
    });
    const enabledBeforeCopy = Boolean(copy && !copy.disabled);
    copy?.click();
    await new Promise((resolve) => setTimeout(resolve, 30));
    const after = JSON.stringify({
      keywordFoundation: guruCompanyKeywordFoundationRecordV351(state, false),
      company: gate1CompanySemanticsV264(state),
    });
    return {
      copied: [...window.__companyDemandCopiedV358],
      enabledBeforeCopy,
      disabledAfterCopy: Boolean(copy?.disabled),
      feedback: copy?.textContent.trim() || "",
      sameActions: Boolean(
        copy && exportButton && importButton &&
        copy.parentElement === exportButton.parentElement &&
        copy.parentElement === importButton.parentElement
      ),
      activeRows: gate1CompanyBrandDemandReconcileV345(state).rows.map((row) => row.kw),
      visibleKeywords: [...(root?.querySelectorAll(
        "[data-pv181-company-demand-keyword-v345]",
      ) || [])].map((node) => node.textContent.trim()),
      stateUnchanged: before === after,
    };
  })()`);

  const expectedCopy =
    "первая подтверждённая фраза\nвторая подтверждённая фраза";
  assert(filled.copied.length === 1, "Copy-all must perform exactly one clipboard write");
  assert(filled.enabledBeforeCopy, "Copy-all button is disabled for current confirmed rows");
  assert(
    filled.copied[0] === expectedCopy,
    `Wrong clipboard payload: ${JSON.stringify(filled.copied[0])}`,
  );
  assert(filled.sameActions, "Filled copy-all button moved away from Export/Import");
  assert(filled.stateUnchanged, "Copy-all mutated company or keyword-foundation data");
  assert(
    JSON.stringify(filled.activeRows) === JSON.stringify([
      "первая подтверждённая фраза",
      "вторая подтверждённая фраза",
    ]),
    `Unexpected active company rows: ${JSON.stringify(filled.activeRows)}`,
  );
  assert(
    !filled.copied[0].includes("SMM") &&
      !filled.copied[0].includes("черновик") &&
      !filled.copied[0].includes("архивная") &&
      !filled.copied[0].includes("1001") &&
      !filled.copied[0].includes("Спрос") &&
      !filled.copied[0].includes(";"),
    "Clipboard contains a non-current phrase, metric, heading, or CSV delimiter",
  );
  assert(
    filled.feedback.includes("Скопировано"),
    `Copy feedback is missing: ${filled.feedback}`,
  );

  const emptyAgain = await evaluate(page, `(async () => {
    guruCompanyKeywordFoundationRecordV351(state, true).keywords = [];
    gate1CompanyBrandDemandRefreshV345({ preserveOpen: true });
    const copy = document.querySelector(
      "[data-pv181-company-demand-copy-keywords-v358]",
    );
    const copiedBefore = window.__companyDemandCopiedV358.length;
    if (copy) copy.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 20));
    return {
      exists: Boolean(copy),
      disabled: Boolean(copy?.disabled),
      copiedBefore,
      copiedAfter: window.__companyDemandCopiedV358.length,
      activeRows: gate1CompanyBrandDemandReconcileV345(state).rows.length,
      errors: window.__guruErrors,
    };
  })()`);

  assert(emptyAgain.exists, "Copy-all button disappeared in the empty state");
  assert(emptyAgain.disabled, "Copy-all button is enabled after confirmed phrases are removed");
  assert(emptyAgain.activeRows === 0, "Stale or archived rows remain active after source removal");
  assert(
    emptyAgain.copiedAfter === emptyAgain.copiedBefore,
    "Empty source copied stale company demand rows",
  );
  assert(
    emptyAgain.errors.length === 0,
    `Browser errors: ${emptyAgain.errors.join(" | ")}`,
  );

  console.log(JSON.stringify({ empty, filled, emptyAgain }, null, 2));
  console.log("gate1 company brand demand copy smoke: OK");
} finally {
  page.close();
  await browser.call("Target.closeTarget", { targetId }).catch(() => {});
  await browser.call("Target.disposeBrowserContext", { browserContextId }).catch(() => {});
  browser.close();
}
