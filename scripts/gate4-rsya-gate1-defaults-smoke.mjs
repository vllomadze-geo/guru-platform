import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const sourcePath = process.env.GURU_PROJECT_SOURCE_EXPORT ||
  resolve("artifacts/gate-4-recovered-groups-v408.json");
const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9345";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3010/";
const goatId = "catalog-item-1786792591872-51f503";
const branchKey = "catalog_item_1786792591872_51f503";
const screenshotPath = resolve("artifacts/gate4-rsya-goat-audience-core-v463.png");
const auditPath = resolve("artifacts/gate4-rsya-audience-core-v463-audit.json");
const wait = (ms) => new Promise((done) => setTimeout(done, ms));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

class CdpClient {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.sequence = 0;
    this.pending = new Map();
    this.events = [];
    this.ready = new Promise((resolveReady, reject) => {
      this.socket.addEventListener("open", resolveReady, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      const pending = this.pending.get(message.id);
      if (!pending) {
        if (message.method) this.events.push(message);
        return;
      }
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
assert(source, "Workspace or Gate 4 export content is required");
assert(source.gate4Rsya?.[branchKey]?.groups?.[0], "Goat RSYA group is missing");
assert(source.gate4SearchBuild?.[branchKey], "Goat Search build is missing");

const fixture = {
  project: {
    catalogItemsV189: source.project.catalogItemsV189,
    productRegistryV185: source.project.productRegistryV185,
    productBindingsV185: source.project.productBindingsV185,
    gate0ScopedValuesV194: source.project.gate0ScopedValuesV194,
  },
  sharedEvidence: source.sharedEvidence || {},
  rsya: source.gate4Rsya[branchKey],
  search: source.gate4SearchBuild[branchKey],
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
  height: 1300,
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
    'document.readyState === "complete" && typeof g4RsyaGroupGate1DefaultsV456 === "function"',
  );
  const audit = await evaluate(`(async () => {
    state = createFreshWorkspace({
      id: "rsya-gate1-defaults-v456-smoke",
      name: "RSYA Gate 1 defaults smoke",
    });
    activeProjectId = "rsya-gate1-defaults-v456-smoke";
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};
    const fixture = ${JSON.stringify(fixture)};
    Object.assign(state.project, structuredClone(fixture.project));
    state.sharedEvidence = structuredClone(fixture.sharedEvidence);
    state.gate4Rsya = { ${JSON.stringify(branchKey)}: structuredClone(fixture.rsya) };
    state.gate4SearchBuild = { ${JSON.stringify(branchKey)}: structuredClone(fixture.search) };
    delete state.project._gate4RsyaProductIdMigrationLog;
    delete state.project._gate4RsyaFoundationMigrationLog;
    g4RsyaMigrateGroupProductIdsV449(state);
    g4RsyaMigrateGroupFoundationV455(state);

    const d = ensureGate4RsyaV289(${JSON.stringify(goatId)});
    const group = d.groups[0];
    group.retargetingSegments = 'Сегмент Метрики · посетители карточки Козы';
    group.negativePhrases = 'бесплатно\\nскачать';
    const foundation = g4RsyaGroupFoundationV455(${JSON.stringify(goatId)}, group);
    const beforeStorage = {
      name: group.name,
      keywords: group.keywords,
      interests: group.interests,
    };
    const defaults = g4RsyaGroupGate1DefaultsV456(${JSON.stringify(goatId)}, group);
    const searchGroup = state.gate4SearchBuild[${JSON.stringify(branchKey)}].groupRows
      .find((row) => row.groupId === defaults.searchGroupId || row.clusterId === defaults.searchGroupId);
    const sourceRows = (searchGroup?.demandRows || []).map(g4sbKeywordRow);
    const sourceCpc = g4sbV392GroupCost(sourceRows).cpc;
    const sourceStatuses = Object.fromEntries(sourceRows.map((row) => [
      guruV247KeywordNormalize(row.kw),
      g4sbV392PhraseCost(row, sourceCpc).status,
    ]));

    const channel = {
      key: "yandex-rsya", launchType: "media", channel: "Яндекс Директ",
      platform: "РСЯ", type: "Сети", status: "active", materials: "баннеры",
    };
    const common = { decision: "launch", campaignName: "РСЯ · Коза", budget: "30000", utm: "" };
    const host = document.createElement("main");
    host.style.cssText = "max-width:1180px;margin:0 auto;padding:24px;background:#fff";
    document.body.replaceChildren(host);
    document.body.style.cssText = "display:block;background:#f7f7f4;margin:0";
    host.innerHTML = '<h2 style="margin:0 0 16px">Символ 2027 года «Коза»</h2>' +
      '<section data-smoke-foundation>' + g4RsyaAudienceHtmlV289(${JSON.stringify(goatId)}, channel.key, d) + '</section>' +
      '<section data-smoke-settings>' + g4RsyaSettingsHtmlV289(${JSON.stringify(goatId)}, channel.key, common, d, "groups") + '</section>';

    const field = (name) => host.querySelector(
      '[data-g4rsya-v289-store="group"][data-g4rsya-v289-field="' + name + '"]',
    );
    const nameInput = field('name');
    const keywordsInput = field('keywords');
    const interestsInput = field('interests');
    const audienceCard = host.querySelector(
      '[data-g4rsya-v460-audience-group="' + CSS.escape(group.id) + '"]',
    );
    const interestsPrompt = audienceCard?.querySelector(
      '[data-g4rsya-v462-interests-prompt]',
    );
    const interestsPromptButton = audienceCard?.querySelector(
      '[data-g4rsya-v462-copy-interests-prompt]',
    );
    const nameLabel = nameInput?.closest('.g4-rsya-field-v289');
    const keywordsLabel = keywordsInput?.closest('.g4-rsya-field-v289');
    const displayedPhrases = (keywordsInput?.value || '').split(/\\n/).map((value) => value.trim()).filter(Boolean);

    const manualGroup = structuredClone(group);
    manualGroup.name = 'Ручное название группы';
    manualGroup.keywords = 'ручной сигнал 1\\nручной сигнал 2';
    const manual = g4RsyaGroupGate1DefaultsV456(${JSON.stringify(goatId)}, manualGroup);
    const packageText = g4RsyaAdPackageV289(common, d, group, group.ads[0], ${JSON.stringify(goatId)});
    const primaryOrder = [...(audienceCard?.querySelector('.g4-rsya-form-v289')?.children || [])]
      .map((node) => {
        if (node.matches?.('[data-g4rsya-v462-interests-prompt-card]')) return 'interestsPrompt';
        const groupField = node.querySelector?.('[data-g4rsya-v289-store="group"]')
          ?.dataset.g4rsyaV289Field;
        if (groupField) return groupField;
        return '';
      }).filter(Boolean);
    const secondaryFields = {
      disclosure: Boolean(audienceCard?.querySelector('[data-g4rsya-v462-audience-extra]')),
      disclosureText: audienceCard?.textContent.includes('Показать дополнительно') || false,
      retargetingRendered: Boolean(audienceCard?.querySelector('[data-g4rsya-v289-field="retargetingSegments"]')),
      negativePhrasesRendered: Boolean(audienceCard?.querySelector('[data-g4rsya-v289-field="negativePhrases"]')),
      storedRetargeting: group.retargetingSegments,
      storedNegativePhrases: group.negativePhrases,
    };
    const originalCopyText = g4sbV141CopyText;
    let copiedInterestsPrompt = '';
    g4sbV141CopyText = async (text) => { copiedInterestsPrompt = text; };
    interestsPromptButton?.click();
    await new Promise((resolve) => setTimeout(resolve, 30));
    g4sbV141CopyText = originalCopyText;
    const emptyPromptHtml = g4RsyaInterestsPromptInnerHtmlV462(
      '__missing-product__',
      { id: 'empty-group', product_id: '', jtbdId: '__missing-jtbd__' },
    );
    const visualCard = host.querySelector('[data-g4rsya-v458-group-card]');
    visualCard?.classList.remove('is-collapsed');
    visualCard?.classList.add('is-open');
    const visualEditor = visualCard?.querySelector('[data-g4rsya-v461-group-editor]');
    if (visualEditor) visualEditor.hidden = false;

    return {
      build: window.GURU_BUILD_INFO?.version,
      foundationJtbd: foundation.jtbd,
      beforeStorage,
      afterStorage: {
        name: group.name,
        keywords: group.keywords,
        interests: group.interests,
      },
      defaults,
      audience: {
        primaryOrder,
        prompt: {
          readonly: Boolean(interestsPrompt?.readOnly),
          text: interestsPrompt?.value || '',
          copied: copiedInterestsPrompt,
          copyButton: Boolean(interestsPromptButton),
          copyFeedback: interestsPromptButton?.textContent.trim() || '',
          hasJtbd: Boolean(foundation.jtbd && interestsPrompt?.value.includes(foundation.jtbd)),
          hasSegment: Boolean(foundation.segment && interestsPrompt?.value.includes(foundation.segment)),
          hasOffer: Boolean(foundation.offer && interestsPrompt?.value.includes(foundation.offer)),
          hasDisclaimer: interestsPrompt?.value.includes('Это направления для поиска, не точные названия категорий Яндекса — сверь их с живым списком в интерфейсе Директа.') || false,
        },
        secondaryFields,
        emptyPromptUsesStrategicMessage:
          emptyPromptHtml.includes('Сначала заполните карточку товара (Стратегическая основа)') &&
          emptyPromptHtml.includes('disabled'),
      },
      displayed: {
        name: nameInput?.value || '',
        nameBadge: nameLabel?.querySelector('.g4-rsya-derived-badge-v456')?.textContent || '',
        nameEditable: Boolean(nameInput && !nameInput.readOnly && !nameInput.disabled),
        keywords: keywordsInput?.value || '',
        keywordBadge: keywordsLabel?.querySelector('.g4-rsya-derived-badge-v456')?.textContent || '',
        keywordEditable: Boolean(keywordsInput && !keywordsInput.readOnly && !keywordsInput.disabled),
        phrases: displayedPhrases,
        interests: interestsInput?.value || '',
        interestsEditable: Boolean(interestsInput && !interestsInput.readOnly && !interestsInput.disabled),
      },
      phraseStatuses: displayedPhrases.map((phrase) => ({
        phrase,
        status: sourceStatuses[guruV247KeywordNormalize(phrase)] || 'missing',
      })),
      manual: {
        name: manual.name,
        nameAuto: manual.nameAuto,
        keywords: manual.keywords,
        keywordsAuto: manual.keywordsAuto,
      },
      packageUsesDefaults:
        packageText.includes('ГРУППА: ' + defaults.name) &&
        defaults.phrases.every((phrase) => packageText.includes(phrase)),
      errorOverlay: Boolean(document.querySelector('[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay')),
      bodyHasContent: document.body.innerText.trim().length > 0,
    };
  })()`);

  audit.runtimeExceptions = page.events
    .filter((event) => event.method === "Runtime.exceptionThrown")
    .map((event) => event.params?.exceptionDetails?.exception?.description ||
      event.params?.exceptionDetails?.text || "Unknown runtime exception");

  if (process.env.GURU_SMOKE_DEBUG === "1")
    console.log(JSON.stringify(audit, null, 2));

  assert(audit.build === "2.3.236", `Unexpected build: ${audit.build}`);
  assert(audit.beforeStorage.name === "" && audit.afterStorage.name === "", "JTBD fallback was copied into group.name");
  assert(audit.beforeStorage.keywords === "" && audit.afterStorage.keywords === "", "Gate 1 phrases were copied into group.keywords");
  assert(audit.displayed.name === audit.foundationJtbd, "Empty group name did not show JTBD");
  assert(audit.displayed.nameBadge.includes("← равно JTBD"), "JTBD equality marker is missing");
  assert(audit.displayed.nameEditable, "Group name must remain editable");
  assert(audit.displayed.phrases.length >= 5 && audit.displayed.phrases.length <= 8, "Expected 5–8 Gate 1 phrases");
  assert(audit.displayed.keywordBadge.includes("Gate 1") && audit.displayed.keywordBadge.includes("Норма"), "Gate 1 normal-source marker is missing");
  assert(audit.displayed.keywordEditable, "Keyword signals must remain editable");
  assert(audit.phraseStatuses.every((row) => row.status === "normal"), "A non-normal phrase was prefilled");
  assert(audit.displayed.interests === "", "Interests must stay empty");
  assert(audit.displayed.interestsEditable, "Interests must remain manually editable");
  assert(audit.afterStorage.interests === "", "Interests storage was changed");
  assert(JSON.stringify(audit.audience.primaryOrder) === JSON.stringify([
    "name", "keywords", "interestsPrompt", "interests",
  ]), `Wrong primary audience order: ${JSON.stringify(audit.audience.primaryOrder)}`);
  assert(audit.audience.prompt.readonly && audit.audience.prompt.copyButton,
    "Interests prompt is not read-only or has no copy button");
  assert(audit.audience.prompt.hasJtbd && audit.audience.prompt.hasSegment &&
    audit.audience.prompt.hasOffer && audit.audience.prompt.hasDisclaimer,
  "Interests prompt does not use the live foundation or required disclaimer");
  assert(audit.audience.prompt.copied === audit.audience.prompt.text &&
    audit.audience.prompt.copyFeedback === "Скопировано",
  "Interests prompt copy action failed");
  assert(!audit.audience.secondaryFields.disclosure &&
    !audit.audience.secondaryFields.disclosureText &&
    !audit.audience.secondaryFields.retargetingRendered &&
    !audit.audience.secondaryFields.negativePhrasesRendered,
  "Retargeting, negative phrases, or the additional disclosure still render");
  assert(audit.audience.secondaryFields.storedRetargeting ===
    "Сегмент Метрики · посетители карточки Козы" &&
    audit.audience.secondaryFields.storedNegativePhrases === "бесплатно\nскачать",
  "Hidden secondary audience values were removed from group data");
  assert(audit.audience.emptyPromptUsesStrategicMessage,
    "Empty interests prompt does not show the Strategic foundation message");
  assert(audit.manual.name === "Ручное название группы" && !audit.manual.nameAuto, "Manual group name lost priority");
  assert(audit.manual.keywords === "ручной сигнал 1\nручной сигнал 2" && !audit.manual.keywordsAuto, "Manual keywords lost priority");
  assert(audit.packageUsesDefaults, "Transfer package did not use live defaults");
  assert(audit.bodyHasContent && !audit.errorOverlay, "Live page failed basic verification");
  assert(!audit.runtimeExceptions.length, `Runtime exceptions: ${audit.runtimeExceptions.join("\n")}`);

  const screenshot = await page.call("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: true,
  });
  await writeFile(screenshotPath, Buffer.from(screenshot.data, "base64"));
  await writeFile(auditPath, JSON.stringify({
    auditedAt: new Date().toISOString(),
    source: sourcePath,
    screenshot: screenshotPath,
    ...audit,
  }, null, 2) + "\n");
  console.log(JSON.stringify({ audit: auditPath, screenshot: screenshotPath, ...audit }, null, 2));
} finally {
  await browser.call("Target.disposeBrowserContext", { browserContextId }).catch(() => {});
  page.close();
  browser.close();
}
