import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const sourcePath = process.env.GURU_PROJECT_SOURCE_EXPORT ||
  "/Users/vl/Downloads/guru-project-korichnoe-yabloko-all.json";
const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9342";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const goatId = "catalog-item-1786792591872-51f503";
const screenshotPath = resolve("artifacts/gate4-rsya-goat-launch-checklist-v454.png");
const auditPath = resolve("artifacts/gate4-rsya-launch-checklist-v454-audit.json");
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
const branchKey = "catalog_item_1786792591872_51f503";
const sourceBranch = source?.gate4Rsya?.[branchKey];
assert(sourceBranch?.groups?.length, "Goat RSYA branch is missing from source export");
const fixture = {
  project: {
    catalogItemsV189: source.project.catalogItemsV189,
    productRegistryV185: source.project.productRegistryV185,
    productBindingsV185: source.project.productBindingsV185,
  },
  gates: source.gates,
  branch: sourceBranch,
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
const target = targets.find((row) => row.id === targetId);
assert(target?.webSocketDebuggerUrl, "Could not create Chrome target");
const page = new CdpClient(target.webSocketDebuggerUrl);
await page.ready;
await page.call("Runtime.enable");
await page.call("Page.enable");
await page.call("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1500,
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
    'document.readyState === "complete" && typeof g4RsyaLaunchModelV454 === "function" && typeof g4RsyaChannelCardV289 === "function"',
  );

  const initial = await evaluate(`(() => {
    state = createFreshWorkspace({ id: "rsya-launch-v454-smoke", name: "RSYA launch checklist smoke" });
    activeProjectId = "rsya-launch-v454-smoke";
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};
    const fixture = ${JSON.stringify(fixture)};
    Object.assign(state.project, structuredClone(fixture.project));
    state.gates = structuredClone(fixture.gates || []);
    const key = normalizeAspectKey(${JSON.stringify(goatId)});
    state.gate4Rsya = { [key]: structuredClone(fixture.branch) };
    g4RsyaMigrateGroupProductIdsV449(state);
    g4RsyaMigrateCampaignMetrikaV450(state);
    const d = ensureGate4RsyaV289(${JSON.stringify(goatId)});
    d.ui.workflowStepOpenV453 = { groups: false, launch: true };
    const channel = {
      key: "yandex-rsya", launchType: "media", channel: "Яндекс Директ",
      platform: "РСЯ", type: "Сети", status: "active", materials: "баннеры",
    };
    const campaign = {
      decision: "launch", campaignName: "РСЯ · Коза",
      budget: "30000", utm: "utm_source=yandex&utm_medium=cpc",
    };
    state.gate4Production = state.gate4Production || {};
    state.gate4Production.campaigns = {
      [g4CampaignStateKey(${JSON.stringify(goatId)}, channel.key)]: campaign,
    };
    g4EnsureLaunchUiState().rows[g4CampaignStateKey(${JSON.stringify(goatId)}, channel.key)] = true;
    const host = document.createElement("main");
    host.style.cssText = "max-width:1180px;margin:0 auto;padding:24px;background:#fff";
    document.body.replaceChildren(host);
    document.body.style.cssText = "display:block;background:#f7f7f4;margin:0";
    const render = () => {
      host.innerHTML = '<h2 style="margin:0 0 16px">Яндекс Директ / РСЯ · Символ 2027 года «Коза»</h2>' +
        g4RsyaChannelCardV289(channel, campaign, 0, ${JSON.stringify(goatId)});
    };
    renderGate = render;
    flashSaving = () => {};
    saveState = () => {};
    window.__rsyaLaunchV454 = { host, render, d, channel, campaign };
    render();
    const model = g4RsyaLaunchModelV454(${JSON.stringify(goatId)}, d);
    const checklist = host.querySelector('[data-g4rsya-v454-checklist]');
    const metrika = model.campaignItems.find((item) => item.key === 'campaign:metrika');
    const productItem = model.groups[0].items.find((item) => item.key.endsWith(':product-id'));
    return {
      ready: model.ready,
      total: model.total,
      autoReady: model.autoReady,
      autoTotal: model.autoTotal,
      manualReady: model.manualReady,
      manualTotal: model.manualTotal,
      meta: host.querySelector('[data-g4rsya-v453-step-meta="launch"]')?.textContent.trim() || '',
      automaticRows: checklist.querySelectorAll('[data-g4rsya-v454-auto]').length,
      manualRows: checklist.querySelectorAll('[data-g4rsya-v454-launch-check]').length,
      product: { ready: productItem.ready, value: productItem.value, expected: productItem.expected, status: productItem.status },
      metrika: { ready: metrika.ready, counter: metrika.counter, goal: metrika.goal, status: metrika.status },
      forbiddenSearchMechanisms: /Дубли фраз|Заявки\\/неделю|прогноз заявок\\/неделю/i.test(checklist.textContent),
      separateAutoStorage: Object.hasOwn(d, 'launchAutoChecklistV454'),
      calloutComponentReused: checklist.querySelectorAll('[data-g4sb-callouts-total]').length > 0,
    };
  })()`);

  await evaluate(`document.querySelector('[data-g4rsya-v453-step="launch"]').scrollIntoView({ block: "start" }); window.scrollBy(0, -16)`);
  await wait(200);
  const capture = await page.call("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  await writeFile(screenshotPath, Buffer.from(capture.data, "base64"));

  const interaction = await evaluate(`(async () => {
    const smoke = window.__rsyaLaunchV454;
    const product = ${JSON.stringify(goatId)};
    const score = () => {
      const model = g4RsyaLaunchModelV454(product, smoke.d);
      return { ready: model.ready, total: model.total, autoReady: model.autoReady, manualReady: model.manualReady,
        meta: smoke.host.querySelector('[data-g4rsya-v453-step-meta="launch"]')?.textContent.trim() || '' };
    };
    smoke.d.ui.workflowStepOpenV453 = { groups: true, launch: true };
    smoke.render();
    const states = { before: score() };

    const interests = smoke.host.querySelector('[data-g4rsya-v289-store="group"][data-g4rsya-v289-field="interests"]');
    interests.value = 'Новогодние подарки и авторский декор';
    interests.dispatchEvent(new Event('input', { bubbles: true }));
    states.afterInterests = score();

    const heading = smoke.host.querySelector('[data-g4rsya-v289-store="heading"]');
    heading.value = 'Авторская Коза — подарок к Новому году';
    heading.dispatchEvent(new Event('input', { bubbles: true }));
    states.afterHeadingOnly = score();
    const text = smoke.host.querySelector('[data-g4rsya-v289-store="text"]');
    text.value = 'Необычный подарок для близких и домашнего уюта';
    text.dispatchEvent(new Event('input', { bubbles: true }));
    states.afterAdCopy = score();

    const geography = smoke.host.querySelector('[data-g4rsya-v289-field="geography"]');
    geography.value = 'Москва и Московская область';
    geography.dispatchEvent(new Event('input', { bubbles: true }));
    states.afterGeographyOnly = score();
    let strategy = smoke.host.querySelector('[data-g4rsya-v289-field="strategy"]');
    strategy.value = 'max_clicks';
    strategy.dispatchEvent(new Event('change', { bubbles: true }));
    let period = smoke.host.querySelector('[data-g4rsya-v289-field="budgetPeriod"]');
    period.value = 'week';
    period.dispatchEvent(new Event('change', { bubbles: true }));
    states.afterCampaignSettings = score();

    const currentAd = () => smoke.d.groups[0].ads[0];
    currentAd().images.push({ id: 'launch-image', name: 'goat.png', type: 'image/png', size: 1000,
      width: 800, height: 800, dataUrl: 'data:image/png;base64,AA==' });
    smoke.render();
    states.afterImage = score();

    currentAd().callouts = [{ id: 'launch-callout-1', value: 'Авторская работа' }];
    smoke.render();
    states.afterCallout = score();
    currentAd().callouts = Array.from({ length: 4 }, (_, index) => ({ id: 'long-' + index, value: 'А'.repeat(20) }));
    smoke.render();
    const calloutRow = smoke.host.querySelector('[data-g4rsya-v454-auto$=":callouts"]');
    states.afterCalloutOverflow = { ...score(), state: calloutRow.dataset.g4rsyaV454AutoState,
      warning: calloutRow.nextElementSibling?.querySelector('[data-g4sb-callouts-warning]')?.textContent.trim() || '' };
    currentAd().callouts = [{ id: 'launch-callout-1', value: 'Авторская работа' }];
    smoke.render();

    currentAd().sitelinks = [{ id: 'launch-link', title: 'О подарке', description: 'Подробности об авторской работе', url: 'https://k-apple.ru/simvol-2027-koza' }];
    smoke.render();
    states.afterSitelink = score();
    currentAd().sitelinks[0].title = 'С'.repeat(31);
    smoke.render();
    states.afterSitelinkOverflow = score();
    currentAd().sitelinks[0].title = 'О подарке';
    smoke.render();

    const manual = smoke.host.querySelector('[data-g4rsya-v454-launch-check="smartImageCenters"]');
    manual.click();
    states.afterManual = score();

    const missingCatalogItem = (state.project.catalogItemsV189 || []).find((item) =>
      item.id !== product && item.categoryId &&
      g4RsyaMetrikaSourceV450(item.id, state).goalStatus === 'product_row_not_found');
    let missingGoal = null;
    if (missingCatalogItem) {
      const missingKey = normalizeAspectKey(missingCatalogItem.id);
      state.gate4Rsya[missingKey] = {
        campaign: { metrikaCounter: g4RsyaMetrikaSourceV450(product, state).counterId, metrikaGoal: '' },
        groups: [{ id: 'missing-goal-group', product_id: missingCatalogItem.categoryId, category: missingCatalogItem.name, interests: '', ads: [{}] }],
        exclusions: {}, ui: {},
      };
      const missingData = ensureGate4RsyaV289(missingCatalogItem.id);
      const item = g4RsyaLaunchModelV454(missingCatalogItem.id, missingData).campaignItems
        .find((row) => row.key === 'campaign:metrika');
      missingGoal = { product: missingCatalogItem.id, ready: item.ready, state: item.state, status: item.status };
    }
    return { states, missingGoal, manualStored: smoke.d.launchChecklistV454?.smartImageCenters === true };
  })()`);

  assert(initial.autoTotal === 8 && initial.manualTotal === 4 && initial.total === 12,
    `Unexpected initial checklist cardinality: ${JSON.stringify(initial)}`);
  assert(initial.automaticRows === initial.autoTotal && initial.manualRows === initial.manualTotal,
    "Rendered checklist does not match computed model");
  assert(initial.product.ready && initial.product.value === "product-1786401011698-9e81ee",
    `Goat product_id is not ready: ${JSON.stringify(initial.product)}`);
  assert(initial.metrika.ready && initial.metrika.counter === "105213127" && initial.metrika.goal === "ID 573230679",
    `Goat Metrika is not linked: ${JSON.stringify(initial.metrika)}`);
  assert(!initial.forbiddenSearchMechanisms, "Search-only duplicates/forecast mechanisms leaked into RSYA checklist");
  assert(!initial.separateAutoStorage, "Automatic checklist state was stored separately");
  assert(initial.calloutComponentReused, "Shared callout summary component is not reused");
  assert(interaction.states.afterInterests.ready === interaction.states.before.ready + 1,
    "Interests edit did not update readiness");
  assert(interaction.states.afterHeadingOnly.ready === interaction.states.afterInterests.ready,
    "Heading without text was counted as ready");
  assert(interaction.states.afterAdCopy.ready === interaction.states.afterHeadingOnly.ready + 1,
    "Complete heading/text pair did not update readiness");
  assert(interaction.states.afterGeographyOnly.ready === interaction.states.afterAdCopy.ready,
    "Incomplete campaign settings were counted as ready");
  assert(interaction.states.afterCampaignSettings.ready === interaction.states.afterGeographyOnly.ready + 1,
    "Campaign settings did not update readiness");
  assert(interaction.states.afterImage.ready === interaction.states.afterCampaignSettings.ready + 1,
    "Valid image did not update readiness");
  assert(interaction.states.afterCallout.ready === interaction.states.afterImage.ready + 1,
    "Valid callout did not update readiness");
  assert(interaction.states.afterCalloutOverflow.ready === interaction.states.afterCallout.ready - 1 &&
    interaction.states.afterCalloutOverflow.state === "error" && interaction.states.afterCalloutOverflow.warning,
    "Shared callout limit warning did not affect readiness");
  assert(interaction.states.afterSitelink.ready === interaction.states.afterCallout.ready + 1,
    "Valid sitelink did not update readiness");
  assert(interaction.states.afterSitelinkOverflow.ready === interaction.states.afterSitelink.ready - 1,
    "31-character sitelink title was counted as ready");
  assert(interaction.states.afterManual.ready === interaction.states.afterSitelink.ready + 1 && interaction.manualStored,
    "Manual launch checkbox did not update and persist readiness");
  Object.values(interaction.states).forEach((state) => {
    assert(state.meta === `Готово ${state.ready} из ${state.total}`,
      `Header counter is stale: ${JSON.stringify(state)}`);
  });
  assert(interaction.missingGoal && !interaction.missingGoal.ready &&
    interaction.missingGoal.state === "manual" && /ручного ввода/i.test(interaction.missingGoal.status),
    `Missing Gate 2 goal is not marked for manual input: ${JSON.stringify(interaction.missingGoal)}`);

  const audit = {
    sourceExportedAt: exported.exportedAt,
    product_id: goatId,
    initial,
    interaction,
  };
  await writeFile(auditPath, `${JSON.stringify(audit, null, 2)}\n`);
  console.log(JSON.stringify({ ok: true, screenshotPath, auditPath, audit }, null, 2));
} finally {
  page.close();
  await browser.call("Target.disposeBrowserContext", { browserContextId });
  browser.close();
}
