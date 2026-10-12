import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const sourcePath = process.env.GURU_PROJECT_SOURCE_EXPORT ||
  "/Users/vl/Downloads/guru-project-korichnoe-yabloko-all.json";
const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9341";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const goatCatalogItemId = "catalog-item-1786792591872-51f503";
const expectedCounter = "105213127";
const expectedGoal = "ID 573230679";
const screenshotPath = resolve("artifacts/gate4-rsya-goat-metrika-v450.png");
const auditPath = resolve("artifacts/gate4-rsya-metrika-v450-audit.json");
const wait = (ms) => new Promise((done) => setTimeout(done, ms));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

class CdpClient {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.sequence = 0;
    this.pending = new Map();
    this.ready = new Promise((resolveReady, reject) => {
      this.socket.addEventListener("open", resolveReady, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
    });
  }

  async call(method, params = {}) {
    await this.ready;
    return new Promise((resolveCall, reject) => {
      const id = ++this.sequence;
      this.pending.set(id, { resolve: resolveCall, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.socket.close();
  }
}

const exported = JSON.parse(await readFile(sourcePath, "utf8"));
const source = exported.workspace;
assert(source, "Full workspace export is required");
const gate2 = source.gates.find((gate) => gate.id === "gate-2");
const counterCard = gate2?.cards?.find(
  (card) => card.id === "g2-metrika-company-counter",
);
const goalCard = gate2?.cards?.find(
  (card) => card.id === "g2-metrika-goals-primary",
);
const goatGoalRow = goalCard?.fields?.metrikaQualityV360?.perProduct?.find(
  (row) => row.product_id === goatCatalogItemId,
);
assert(
  counterCard?.fields?.metrikaCompanyV374?.counterId === expectedCounter,
  "Expected company counter is missing from source export",
);
assert(goatGoalRow?.goalId === expectedGoal, "Expected goat goal is missing");
const goalProductIds = new Set(
  (goalCard?.fields?.metrikaQualityV360?.perProduct || [])
    .filter((row) => String(row.goalId || "").trim())
    .map((row) => row.product_id),
);
const missingGoalItem = source.project.catalogItemsV189.find(
  (item) => item.id !== goatCatalogItemId && !goalProductIds.has(item.id),
);
assert(missingGoalItem, "A catalog item without a Gate 2 goal is required");
const goatBranchKey = Object.keys(source.gate4Rsya || {}).find(
  (key) => key === "catalog_item_1786792591872_51f503",
);
assert(goatBranchKey, "Goat RSYA branch is missing from source export");

const fixture = {
  project: {
    catalogItemsV189: source.project.catalogItemsV189,
    productRegistryV185: source.project.productRegistryV185,
    productBindingsV185: source.project.productBindingsV185,
  },
  gate2,
  goatBranch: source.gate4Rsya[goatBranchKey],
  missingGoalItem,
};

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
const targets = await (
  await fetch(`http://127.0.0.1:${debugPort}/json`)
).json();
const pageTarget = targets.find((target) => target.id === targetId);
assert(pageTarget?.webSocketDebuggerUrl, "Could not create Chrome target");
const page = new CdpClient(pageTarget.webSocketDebuggerUrl);
await page.ready;
await page.call("Runtime.enable");
await page.call("Page.enable");
await page.call("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1050,
  deviceScaleFactor: 1,
  mobile: false,
});

async function evaluate(expression) {
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

async function waitFor(expression, timeoutMs = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await wait(100);
  }
  throw new Error(`Timed out waiting for: ${expression}`);
}

try {
  await page.call("Page.navigate", { url: appUrl });
  await waitFor(
    'document.readyState === "complete" && typeof g4RsyaChannelCardV289 === "function" && typeof g2MetrikaCompanyDataV374 === "function"',
  );
  const audit = await evaluate(`(() => {
    state = createFreshWorkspace({ id: "rsya-metrika-v450-smoke", name: "RSYA Metrika smoke" });
    activeProjectId = "rsya-metrika-v450-smoke";
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};
    const fixture = ${JSON.stringify(fixture)};
    Object.assign(state.project, structuredClone(fixture.project));
    const gate2Index = state.gates.findIndex((gate) => gate.id === "gate-2");
    state.gates[gate2Index] = structuredClone(fixture.gate2);
    const goatKey = normalizeAspectKey(${JSON.stringify(goatCatalogItemId)});
    const missingId = fixture.missingGoalItem.id;
    const missingKey = normalizeAspectKey(missingId);
    state.gate4Rsya = {
      [goatKey]: {
        ...structuredClone(fixture.goatBranch),
        campaign: {
          strategy: "target_cpa",
          geography: "Москва",
          budgetPeriod: "week",
          paymentModel: "conversions",
          metrikaCounter: "legacy-counter",
          metrikaGoal: "legacy-goal",
        },
      },
      [missingKey]: {
        campaign: {
          strategy: "max_conversions",
          geography: "Санкт-Петербург",
          budgetPeriod: "month",
          paymentModel: "clicks",
          metrikaCounter: "",
          metrikaGoal: "",
        },
        groups: [{
          id: "missing-goal-group",
          product_id: fixture.missingGoalItem.categoryId,
          category: fixture.missingGoalItem.name,
          ads: [{}],
        }],
        exclusions: { themes: "", audiences: "", minusWords: "" },
      },
    };
    delete state.project._gate4RsyaMetrikaLinkLog;
    const manualBefore = {
      strategy: state.gate4Rsya[goatKey].campaign.strategy,
      geography: state.gate4Rsya[goatKey].campaign.geography,
      budgetPeriod: state.gate4Rsya[goatKey].campaign.budgetPeriod,
      paymentModel: state.gate4Rsya[goatKey].campaign.paymentModel,
    };
    const migration = g4RsyaMigrateCampaignMetrikaV450(state);
    const goat = state.gate4Rsya[goatKey];
    const missing = state.gate4Rsya[missingKey];
    goat.ui = goat.ui && typeof goat.ui === "object" ? goat.ui : {};
    missing.ui = missing.ui && typeof missing.ui === "object" ? missing.ui : {};
    goat.ui.workflowStepOpenV453 = { groups: false, launch: true };
    missing.ui.workflowStepOpenV453 = { groups: false, launch: true };
    const channel = {
      key: "yandex-rsya", launchType: "media", channel: "Яндекс Директ",
      platform: "РСЯ", type: "Сети", status: "active", materials: "баннеры",
    };
    const common = {
      decision: "launch", campaignName: "РСЯ · Коза",
      budget: "30000", utm: "utm_source=yandex&utm_medium=cpc",
    };
    g4EnsureLaunchUiState().rows[g4CampaignStateKey(${JSON.stringify(goatCatalogItemId)}, channel.key)] = true;
    const host = document.createElement("main");
    host.style.cssText = "max-width:1180px;margin:0 auto;padding:24px;background:#fff";
    document.body.replaceChildren(host);
    document.body.style.cssText = "display:block;background:#f7f7f4;margin:0";
    host.innerHTML = '<h2 data-v450-product style="margin:0 0 16px">Символ 2027 года «Коза»</h2>' +
      g4RsyaChannelCardV289(channel, common, 0, ${JSON.stringify(goatCatalogItemId)});
    const counter = host.querySelector('[data-g4rsya-v289-field="metrikaCounter"]');
    const goal = host.querySelector('[data-g4rsya-v289-field="metrikaGoal"]');
    const readonlyUi = {
      counter: { value: counter?.value, readOnly: counter?.readOnly,
        bound: counter?.hasAttribute("data-g4rsya-v289-bind") },
      goal: { value: goal?.value, readOnly: goal?.readOnly,
        bound: goal?.hasAttribute("data-g4rsya-v289-bind") },
      badges: [...host.querySelectorAll(".g4-rsya-source-badge-v450")]
        .map((node) => node.textContent.trim()),
    };
    counter.value = "tampered-counter";
    counter.dispatchEvent(new Event("input", { bubbles: true }));
    goal.value = "tampered-goal";
    goal.dispatchEvent(new Event("input", { bubbles: true }));
    const protectedStore = {
      metrikaCounter: goat.campaign.metrikaCounter,
      metrikaGoal: goat.campaign.metrikaGoal,
    };
    g4EnsureLaunchUiState().rows[g4CampaignStateKey(missingId, channel.key)] = true;
    host.innerHTML = g4RsyaChannelCardV289(channel, {
      ...common, campaignName: "РСЯ · без цели",
    }, 0, missingId);
    const missingCounter = host.querySelector('[data-g4rsya-v289-field="metrikaCounter"]');
    const missingGoal = host.querySelector('[data-g4rsya-v289-field="metrikaGoal"]');
    const missingUi = {
      counterValue: missingCounter?.value,
      counterReadOnly: missingCounter?.readOnly,
      goalValue: missingGoal?.value,
      goalReadOnly: missingGoal?.readOnly,
      goalBound: missingGoal?.hasAttribute("data-g4rsya-v289-bind"),
    };
    g4EnsureLaunchUiState().rows[g4CampaignStateKey(${JSON.stringify(goatCatalogItemId)}, channel.key)] = true;
    host.innerHTML = '<h2 data-v450-product style="margin:0 0 16px">Символ 2027 года «Коза»</h2>' +
      g4RsyaChannelCardV289(channel, common, 0, ${JSON.stringify(goatCatalogItemId)});
    const section = host.querySelector("#g4-rsya-launch-settings-v453");
    const labels = [...section.querySelectorAll(".g4-rsya-field-v289")]
      .filter((label) => label.querySelector('[data-g4rsya-v289-field="metrikaCounter"], [data-g4rsya-v289-field="metrikaGoal"]'));
    const proof = document.createElement("section");
    proof.setAttribute("data-v450-proof", "");
    proof.style.cssText = "display:grid;gap:12px;margin:16px 0 0;padding:18px;border:1px solid #d9dfda;border-radius:14px;background:#fff";
    proof.innerHTML = '<h3 style="margin:0">Настройки Метрики · карточка РСЯ</h3>';
    labels.forEach((label) => proof.append(label.cloneNode(true)));
    host.replaceChildren(host.querySelector("[data-v450-product]"), proof);
    const log = state.project._gate4RsyaMetrikaLinkLog.find(
      (item) => item.id === GATE4_RSYA_METRIKA_LINK_V450,
    );
    const runsBefore = log.runs.length;
    const rerun = g4RsyaMigrateCampaignMetrikaV450(state);
    return {
      sourceExportedAt: ${JSON.stringify(exported.exportedAt)},
      source: {
        counterId: g4RsyaMetrikaSourceV450(${JSON.stringify(goatCatalogItemId)}, state).counterId,
        product_id: ${JSON.stringify(goatCatalogItemId)},
        goalId: g4RsyaMetrikaSourceV450(${JSON.stringify(goatCatalogItemId)}, state).goalId,
      },
      campaign: {
        metrikaCounter: goat.campaign.metrikaCounter,
        metrikaGoal: goat.campaign.metrikaGoal,
      },
      manualBefore,
      manualAfter: {
        strategy: goat.campaign.strategy,
        geography: goat.campaign.geography,
        budgetPeriod: goat.campaign.budgetPeriod,
        paymentModel: goat.campaign.paymentModel,
      },
      migration,
      readonlyUi,
      protectedStore,
      missingProduct: { id: missingId, name: fixture.missingGoalItem.name,
        campaign: missing.campaign, ui: missingUi },
      log,
      idempotence: { changed: rerun.changed, valuesChanged: rerun.valuesChanged,
        runsBefore, runsAfter: log.runs.length },
    };
  })()`);

  assert(audit.source.counterId === expectedCounter, "Counter source mismatch");
  assert(audit.source.goalId === expectedGoal, "Goal source mismatch");
  assert(audit.campaign.metrikaCounter === expectedCounter, "Counter was not linked");
  assert(audit.campaign.metrikaGoal === expectedGoal, "Goal was not linked");
  assert(
    JSON.stringify(audit.manualBefore) === JSON.stringify(audit.manualAfter),
    "Manual campaign fields changed",
  );
  assert(audit.readonlyUi.counter.readOnly, "Connected counter is editable");
  assert(audit.readonlyUi.goal.readOnly, "Connected goal is editable");
  assert(!audit.readonlyUi.counter.bound, "Connected counter still has a write binding");
  assert(!audit.readonlyUi.goal.bound, "Connected goal still has a write binding");
  assert(
    audit.readonlyUi.badges.filter((text) => text === "подключено из Gate 2").length === 2,
    "Gate 2 source badges are missing",
  );
  assert(audit.protectedStore.metrikaCounter === expectedCounter, "Counter was overwritten");
  assert(audit.protectedStore.metrikaGoal === expectedGoal, "Goal was overwritten");
  assert(audit.missingProduct.campaign.metrikaGoal === "", "Missing goal was invented");
  assert(audit.missingProduct.ui.goalValue === "", "Missing goal UI is not empty");
  assert(!audit.missingProduct.ui.goalReadOnly, "Missing goal must allow manual input");
  assert(audit.missingProduct.ui.goalBound, "Missing goal lost its manual binding");
  assert(audit.missingProduct.ui.counterValue === expectedCounter, "Company counter missing");
  assert(audit.missingProduct.ui.counterReadOnly, "Company counter is editable");
  assert(!audit.idempotence.changed, "Second migration changed state");
  assert(
    audit.idempotence.runsBefore === audit.idempotence.runsAfter,
    "Second migration duplicated the log",
  );

  await wait(200);
  const screenshot = await page.call("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  await writeFile(screenshotPath, Buffer.from(screenshot.data, "base64"));
  await writeFile(auditPath, `${JSON.stringify(audit, null, 2)}\n`);
  console.log(JSON.stringify({ ok: true, screenshotPath, auditPath, audit }, null, 2));
} finally {
  page.close();
  await browser.call("Target.disposeBrowserContext", { browserContextId });
  browser.close();
}
