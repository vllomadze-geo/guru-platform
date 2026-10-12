import { writeFile } from "node:fs/promises";

const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9362";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const projectId = "gate0-company-brand-purpose-v349-smoke";
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
    workspace.project.name = "Gate 0 brand purpose smoke";
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
    'typeof state !== "undefined" && Boolean(state) && typeof guruV349ProjectBrandPurposeRecord === "function"',
  );

  const initial = await evaluate(page, `(() => {
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};
    activeGateId = "gate-0";
    renderGate();
    const gate0 = state.gates.find((gate) => gate.id === "gate-0");
    const ids = gate0.cards.map((card) => card.id);
    const card = document.querySelector('[data-card-row="gate0-company-brand-purpose"]');
    const gate0Children = [...document.querySelector(".gate0-vertical")?.children || []];
    const sectionHeadings = gate0Children.filter((element) =>
      element.classList.contains("gate0-section-heading")
    );
    return {
      ids,
      recordCount: guruV194ExactRecords("brand_purpose", "project", null, state).length,
      cardCount: ids.filter((id) => id === "gate0-company-brand-purpose").length,
      fieldCount: card?.querySelectorAll("[data-gate0-company-brand-purpose-field]").length || 0,
      positioningPurposeCount: document.querySelectorAll(
        '[data-gate0-company-positioning-field="purpose"]'
      ).length,
      order: [
        ids.indexOf("gate0-project-goal"),
        ids.indexOf("gate0-company-brand-purpose"),
        ids.indexOf("gate0-company-segmentation"),
        ids.indexOf("gate0-company-positioning"),
        ids.indexOf("gate0-company-offer")
      ],
      brandPurposeInCompanySection:
        gate0Children.indexOf(card) > gate0Children.indexOf(sectionHeadings[0]) &&
        gate0Children.indexOf(card) < gate0Children.indexOf(sectionHeadings[1]),
      productAllowlistHasBrandPurpose: GURU_GATE0_SCOPE_FIELDS_V194.some(
        ([key]) => key === "brand_purpose"
      ),
      companyAllowlistHasBrandPurpose: GURU_GATE0_COMPANY_SCOPE_FIELDS_V347.some(
        ([key]) => key === "brand_purpose"
      ),
    };
  })()`);

  assert(initial.recordCount === 0, "Empty project created a brand_purpose record");
  assert(initial.cardCount === 1, "Brand purpose card is missing or duplicated");
  assert(initial.fieldCount === 3, "Brand purpose card must contain three inputs");
  assert(initial.positioningPurposeCount === 0, "Legacy purpose input is still rendered in positioning");
  assert(initial.order.every((index) => index >= 0), "A company strategy card is missing");
  assert(
    initial.order.every((index, position, order) => !position || index === order[position - 1] + 1),
    `Company strategy card order is wrong: ${JSON.stringify({ order: initial.order, ids: initial.ids })}`,
  );
  assert(initial.brandPurposeInCompanySection, "Brand purpose is not rendered inside the company section");
  assert(!initial.productAllowlistHasBrandPurpose, "brand_purpose leaked into product fields");
  assert(initial.companyAllowlistHasBrandPurpose, "brand_purpose is absent from company fields");

  const migrated = await evaluate(page, `(() => {
    const positioning = guruV308ProjectPositioningRecord(state, true);
    positioning.positioning.purpose = "Старая цель бренда";
    const first = guruV349ProjectBrandPurposeRecord(state, false);
    const second = guruV349ProjectBrandPurposeRecord(state, false);
    const records = guruV194ExactRecords("brand_purpose", "project", null, state);
    guruV349EnsureCompanyBrandPurposeCard(state);
    renderGate();
    const target = guruStrategicFoundationContextCompanyV310(state)
      .fields.brandPurpose.target;
    g3ProductJourneyPrepareSource(target);
    renderGate();
    const source = g3ProductJourneyFindSource(target);
    return {
      sameId: first?.id === second?.id,
      recordCount: records.length,
      value: records[0]?.value || "",
      legacyValue: guruV349BrandPurposeParts(records[0] || {}).legacy_value,
      oldValue: guruV194PositioningParts(
        guruV308ProjectPositioningRecord(state, false) || {}
      ).purpose,
      scope: records[0]?.scope || "",
      productId: records[0]?.product_id || "",
      status: state.gates.find((gate) => gate.id === "gate-0").cards.find(
        (card) => card.id === "gate0-company-brand-purpose"
      )?.status || "",
      panelValue: guruStrategicFoundationContextCompanyV310(state).fields.brandPurpose.value,
      target,
      sourceFound: source?.matches?.(
        '[data-gate0-company-brand-purpose-field="unified"]'
      ) || false,
    };
  })()`);

  assert(migrated.sameId && migrated.recordCount === 1, "Legacy migration is not idempotent");
  assert(migrated.value === "Старая цель бренда", "Legacy purpose was not copied to value");
  assert(migrated.legacyValue === migrated.value, "Legacy provenance value was not preserved");
  assert(migrated.oldValue === migrated.value, "Legacy positioning.purpose was modified");
  assert(migrated.scope === "project" && !migrated.productId, "Brand purpose is not project-only");
  assert(migrated.status === "in_progress", "Migrated partial card status is wrong");
  assert(migrated.panelValue === migrated.value, "Panel does not read the new brand purpose record");
  assert(
    migrated.target.kind === "gate0-company-brand-purpose" &&
      migrated.target.cardId === "gate0-company-brand-purpose" &&
      migrated.target.field === "unified" && migrated.sourceFound,
    "Panel source does not navigate to the unified brand purpose field",
  );

  const completed = await evaluate(page, `(() => {
    const values = {
      functional: "Помогать выбирать долговечные вещи",
      higher: "Поддерживать осознанное потребление",
      unified: "Делать осознанный выбор вещей простым и естественным"
    };
    Object.entries(values).forEach(([key, value]) => {
      const input = document.querySelector(
        '[data-gate0-company-brand-purpose-field="' + key + '"]'
      );
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const record = guruV349ProjectBrandPurposeRecord(state, false);
    const card = state.gates.find((gate) => gate.id === "gate-0").cards.find(
      (item) => item.id === "gate0-company-brand-purpose"
    );
    return {
      value: record?.value || "",
      parts: guruV349BrandPurposeParts(record || {}),
      status: card?.status || "",
      badge: document.querySelector(
        '[data-card-row="gate0-company-brand-purpose"] .gate0-card-status'
      )?.textContent.trim() || "",
      panelValue: guruStrategicFoundationContextCompanyV310(state).fields.brandPurpose.value,
    };
  })()`);

  assert(completed.status === "ready" && completed.badge === "Готово", "Completed card status is wrong");
  assert(completed.parts.functional && completed.parts.higher, "Brand purpose parts were not saved");
  assert(completed.panelValue === completed.value, "Panel did not refresh from the unified value");

  await evaluate(page, `(() => {
    document.querySelector('[data-card-row="gate0-company-brand-purpose"]')
      ?.scrollIntoView({ block: "start" });
    return true;
  })()`);
  await wait(150);
  const screenshot = await page.call("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
  });
  await writeFile(
    "artifacts/gate0-company-brand-purpose-v349.png",
    Buffer.from(screenshot.data, "base64"),
  );

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
    const record = guruV349ProjectBrandPurposeRecord(state, false);
    return {
      recordCount: guruV194ExactRecords("brand_purpose", "project", null, state).length,
      value: record?.value || "",
      legacyPurpose: guruV194PositioningParts(
        guruV308ProjectPositioningRecord(state, false) || {}
      ).purpose,
      cardCount: state.gates.find((gate) => gate.id === "gate-0").cards.filter(
        (card) => card.id === "gate0-company-brand-purpose"
      ).length,
      errors: window.__guruErrors,
    };
  })()`);

  assert(afterReload.recordCount === 1, "Brand purpose duplicated after reload");
  assert(afterReload.value === completed.value, "Brand purpose changed after reload");
  assert(afterReload.legacyPurpose === migrated.oldValue, "Legacy purpose changed after reload");
  assert(afterReload.cardCount === 1, "Brand purpose card duplicated after reload");
  assert(afterReload.errors.length === 0, `Browser errors: ${afterReload.errors.join(" | ")}`);

  console.log(JSON.stringify({ initial, migrated, completed, afterReload }, null, 2));
  console.log("gate0 company brand purpose smoke: OK");
} finally {
  page.close();
  await browser.call("Target.closeTarget", { targetId }).catch(() => {});
  await browser.call("Target.disposeBrowserContext", { browserContextId }).catch(() => {});
  browser.close();
}
