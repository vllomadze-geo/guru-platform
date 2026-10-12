import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const sourcePath = process.env.GURU_PROJECT_SOURCE_EXPORT ||
  "/Users/vl/Downloads/guru-project-korichnoe-yabloko-all.json";
const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9345";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3010/";
const goatId = "catalog-item-1786792591872-51f503";
const groupsScreenshotPath = resolve("artifacts/gate4-rsya-goat-jtbd-groups-v453.png");
const launchScreenshotPath = resolve("artifacts/gate4-rsya-goat-launch-v453.png");
const auditPath = resolve("artifacts/gate4-rsya-two-step-workflow-v453-audit.json");
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
const source = exported.workspace || exported.content;
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

async function screenshot(path) {
  const capture = await page.call("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  await writeFile(path, Buffer.from(capture.data, "base64"));
}

try {
  await page.call("Page.navigate", { url: appUrl });
  await waitFor(
    'document.readyState === "complete" && typeof g4RsyaChannelCardV289 === "function" && typeof g4RsyaLaunchBodyV453 === "function"',
  );

  const initial = await evaluate(`(() => {
    state = createFreshWorkspace({ id: "rsya-two-step-v453-smoke", name: "RSYA two-step smoke" });
    activeProjectId = "rsya-two-step-v453-smoke";
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};
    const fixture = ${JSON.stringify(fixture)};
    Object.assign(state.project, structuredClone(fixture.project));
    state.gates = structuredClone(fixture.gates || []);
    const key = normalizeAspectKey(${JSON.stringify(goatId)});
    state.gate4Rsya = { [key]: structuredClone(fixture.branch) };
    const d = ensureGate4RsyaV289(${JSON.stringify(goatId)});
    delete d.ui.workflowStepOpenV453;
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
    const searchBefore = JSON.stringify(state.gate4SearchBuild || {});
    const groupBefore = JSON.stringify(d.groups);
    const host = document.createElement('main');
    host.style.cssText = 'max-width:1180px;margin:0 auto;padding:24px;background:#fff';
    document.body.replaceChildren(host);
    document.body.style.cssText = 'display:block;background:#f7f7f4;margin:0';
    const render = () => {
      host.innerHTML = '<h2 style="margin:0 0 16px">Яндекс Директ / РСЯ · Символ 2027 года «Коза»</h2>' +
        g4RsyaChannelCardV289(channel, campaign, 0, ${JSON.stringify(goatId)});
    };
    renderGate = render;
    flashSaving = () => {};
    window.__rsyaTwoStepSmoke = { host, render, d, campaign, channel, searchBefore, groupBefore };
    render();
    const buttons = [...host.querySelectorAll('[data-g4rsya-v453-step]')];
    const firstPanel = buttons[0].closest('.g1-card');
    const secondPanel = buttons[1].closest('.g1-card');
    const groupsBody = firstPanel.querySelector('[data-g4rsya-v453-panel-body="groups"]');
    const sharedSearchProbe = g4sbStepHtml('probe', '1', 'JTBD и группы', '1', 'clusters', true, '<p>ok</p>');
    return {
      channelTitle: host.querySelector('.g4-rsya-v289 > .g1-card-header .g1-card-title')?.textContent.trim() || '',
      titles: buttons.map((button) => button.querySelector('.g1-card-title').textContent.trim()),
      keys: buttons.map((button) => button.dataset.g4rsyaV453Step),
      firstOpen: firstPanel.classList.contains('is-open'),
      secondOpen: secondPanel.classList.contains('is-open'),
      groupsBody: Boolean(groupsBody),
      launchBody: Boolean(secondPanel.querySelector('[data-g4rsya-v453-panel-body="launch"]')),
      legacySections: host.querySelectorAll('.g4-rsya-section-v289').length,
      groupControls: {
        jtbd: groupsBody.querySelectorAll('[data-g4rsya-v289-field="jtbd"]').length,
        autotargeting: groupsBody.querySelectorAll('[data-g4rsya-v289-field="autotargeting"]').length,
        ads: groupsBody.querySelectorAll('[data-g4rsya-v289-ad-card]').length,
        adPrompts: groupsBody.querySelectorAll('[data-g4rsya-v451-ad-prompt-card]').length,
        assetPrompts: groupsBody.querySelectorAll('[data-g4rsya-v452-asset-prompt-card]').length,
        addCallout: groupsBody.querySelectorAll('[data-g4rsya-v289-add-callout]').length,
        addSitelink: groupsBody.querySelectorAll('[data-g4rsya-v289-add-sitelink]').length,
      },
      campaignFieldsInGroups: groupsBody.querySelectorAll('[data-g4rsya-v289-store="campaign"], [data-g4rsya-v289-store="campaignCommon"]').length,
      groupStateUntouched: JSON.stringify(d.groups) === groupBefore,
      searchStateUntouched: JSON.stringify(state.gate4SearchBuild || {}) === searchBefore,
      sharedSearchAttributesPreserved: sharedSearchProbe.includes('data-g4sb-step="clusters"') &&
        !sharedSearchProbe.includes('data-g4rsya-v453-step'),
      meta: buttons.map((button) => button.querySelector('[data-g4rsya-v453-step-meta]')?.textContent.trim() || ''),
    };
  })()`);

  await screenshot(groupsScreenshotPath);

  const launch = await evaluate(`(async () => {
    const smoke = window.__rsyaTwoStepSmoke;
    let launchButton = smoke.host.querySelector('[data-g4rsya-v453-step="launch"]');
    launchButton.click();
    await new Promise((done) => setTimeout(done, 30));
    let groupsButton = smoke.host.querySelector('[data-g4rsya-v453-step="groups"]');
    groupsButton.click();
    await new Promise((done) => setTimeout(done, 30));
    const launchPanel = smoke.host.querySelector('[data-g4rsya-v453-step="launch"]').closest('.g1-card');
    const launchBody = launchPanel.querySelector('[data-g4rsya-v453-panel-body="launch"]');
    const geography = launchBody.querySelector('[data-g4rsya-v289-field="geography"]');
    geography.value = 'Москва и Московская область';
    geography.dispatchEvent(new Event('input', { bubbles: true }));
    const beforeFocus = {
      steps: structuredClone(smoke.d.ui.workflowStepOpenV453),
      launchOpen: launchPanel.classList.contains('is-open'),
      groupsBody: Boolean(smoke.host.querySelector('[data-g4rsya-v453-panel-body="groups"]')),
      campaignControls: {
        geography: Boolean(geography),
        strategy: Boolean(launchBody.querySelector('[data-g4rsya-v289-field="strategy"]')),
        budgetPeriod: Boolean(launchBody.querySelector('[data-g4rsya-v289-field="budgetPeriod"]')),
        metrikaCounter: Boolean(launchBody.querySelector('[data-g4rsya-v289-field="metrikaCounter"]')),
        metrikaGoal: Boolean(launchBody.querySelector('[data-g4rsya-v289-field="metrikaGoal"]')),
        copyPackage: launchBody.querySelectorAll('[data-g4rsya-v289-copy-package]').length,
        copyAll: launchBody.querySelectorAll('[data-g4rsya-v289-copy-all]').length,
      },
      groupEditorInputs: launchBody.querySelectorAll('[data-g4rsya-v289-ad-card], [data-g4rsya-v289-field="jtbd"]').length,
      campaignLevelHeadings: [...launchBody.querySelectorAll('h4, h5')].filter((node) => node.textContent.trim() === 'Уровень кампании').length,
      geographyPersisted: smoke.d.campaign.geography,
      meta: smoke.host.querySelector('[data-g4rsya-v453-step-meta="launch"]')?.textContent.trim() || '',
      legacySections: smoke.host.querySelectorAll('.g4-rsya-section-v289').length,
    };
    return beforeFocus;
  })()`);

  await screenshot(launchScreenshotPath);

  const focus = await evaluate(`(async () => {
    const smoke = window.__rsyaTwoStepSmoke;
    const button = smoke.host.querySelector('[data-g4rsya-v289-focus-ad]');
    if (!button) return { button: false };
    button.click();
    await new Promise((done) => setTimeout(done, 80));
    const adId = button.dataset.g4rsyaV289FocusAd;
    return {
      button: true,
      groupsReopened: smoke.d.ui.workflowStepOpenV453.groups === true,
      launchStillOpen: smoke.d.ui.workflowStepOpenV453.launch === true,
      adVisible: Boolean(smoke.host.querySelector('[data-g4rsya-v289-ad-card="' + adId + '"]')),
      groupStatePreserved: JSON.stringify(smoke.d.groups) === smoke.groupBefore,
      searchStateUntouched: JSON.stringify(state.gate4SearchBuild || {}) === smoke.searchBefore,
    };
  })()`);

  assert(
    JSON.stringify(initial.titles) === JSON.stringify(["1JTBD и группы", "2Запуск"]),
    `Wrong step titles: ${JSON.stringify(initial.titles)}`,
  );
  assert(initial.channelTitle === "Яндекс Директ / РСЯ", `Wrong channel title: ${initial.channelTitle}`);
  assert(initial.meta[0] === "1 группа · 1 объявление", `Wrong group meta: ${initial.meta[0]}`);
  assert(JSON.stringify(initial.keys) === JSON.stringify(["groups", "launch"]), "Wrong step keys");
  assert(initial.firstOpen && !initial.secondOpen && initial.groupsBody && !initial.launchBody, "Default step state differs from Search");
  assert(initial.legacySections === 0, "Legacy five-section layout is still rendered");
  assert(initial.groupControls.autotargeting === 0, "Autotargeting control is still rendered");
  assert(initial.groupControls.jtbd === 0, "Legacy editable JTBD control is still rendered");
  assert(Object.entries(initial.groupControls)
    .filter(([key]) => !["autotargeting", "jtbd"].includes(key))
    .every(([, value]) => value > 0), `Group controls are missing: ${JSON.stringify(initial.groupControls)}`);
  assert(initial.campaignFieldsInGroups === 0, "Campaign controls leaked into JTBD/groups step");
  assert(initial.groupStateUntouched && initial.searchStateUntouched, "Initial render changed workspace data");
  assert(initial.sharedSearchAttributesPreserved, "Shared Search step attributes changed");
  assert(launch.steps.groups === false && launch.steps.launch === true, "Step toggle state was not persisted");
  assert(launch.launchOpen && !launch.groupsBody, "Launch-only view did not render");
  assert(Object.values(launch.campaignControls).every((value) => value > 0 || value === true), `Launch controls are missing: ${JSON.stringify(launch.campaignControls)}`);
  assert(launch.groupEditorInputs === 0, "Group editor leaked into Launch step");
  assert(launch.campaignLevelHeadings === 1, "Campaign heading is duplicated in Launch step");
  assert(launch.geographyPersisted === "Москва и Московская область", "Campaign edit did not persist in Launch step");
  assert(/^Готово \d+ из \d+$/.test(launch.meta), `Launch progress meta is wrong: ${launch.meta}`);
  assert(launch.legacySections === 0, "Legacy layout returned after toggling");
  assert(focus.button && focus.groupsReopened && focus.launchStillOpen && focus.adVisible, `Focus-to-ad flow failed: ${JSON.stringify(focus)}`);
  assert(focus.groupStatePreserved && focus.searchStateUntouched, "Step navigation changed RSYA/Search data");

  const audit = {
    sourceExportedAt: exported.exportedAt,
    product_id: goatId,
    initial,
    launch,
    focus,
  };
  await writeFile(auditPath, `${JSON.stringify(audit, null, 2)}\n`);
  console.log(JSON.stringify({
    ok: true,
    groupsScreenshotPath,
    launchScreenshotPath,
    auditPath,
    audit,
  }, null, 2));
} finally {
  page.close();
  await browser.call("Target.disposeBrowserContext", { browserContextId });
  browser.close();
}
