import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const sourcePath = process.env.GURU_PROJECT_SOURCE_EXPORT ||
  "/Users/vl/Downloads/guru-project-korichnoe-yabloko-all.json";
const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9342";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const goatId = "catalog-item-1786792591872-51f503";
const sourceScreenshotPath = resolve("artifacts/gate4-rsya-goat-assets-prompt-v452.png");
const compactScreenshotPath = resolve("artifacts/gate4-rsya-goat-extras-compact-v484.png");
const counterScreenshotPath = resolve("artifacts/gate4-rsya-goat-callout-counter-v452.png");
const finalVerificationScreenshotPath = resolve("artifacts/gate4-rsya-cta-v479.png");
const auditPath = resolve("artifacts/gate4-rsya-assets-prompt-v452-audit.json");
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
assert(source, "Full workspace export is required");
const branchKey = "catalog_item_1786792591872_51f503";
const sourceGroup = source.gate4Rsya?.[branchKey]?.groups?.[0];
assert(sourceGroup, "Goat RSYA group is missing from source export");
for (const field of ["jtbd", "offer", "benefit", "segment"])
  assert(String(sourceGroup[field] || "").trim(), `Goat group.${field} is empty`);

const fixture = {
  project: {
    catalogItemsV189: source.project.catalogItemsV189,
    productRegistryV185: source.project.productRegistryV185,
    productBindingsV185: source.project.productBindingsV185,
    gate0ScopedValuesV194: source.project.gate0ScopedValuesV194,
  },
  sharedEvidence: source.sharedEvidence || {},
  branch: source.gate4Rsya[branchKey],
};

const browserVersion = await (
  await fetch(`http://127.0.0.1:${debugPort}/json/version`)
).json();
const browser = new CdpClient(browserVersion.webSocketDebuggerUrl);
await browser.ready;
const { browserContextId } = await browser.call("Target.createBrowserContext");
await browser.call("Browser.grantPermissions", {
  browserContextId,
  origin: appUrl.replace(/\/$/, ""),
  permissions: ["clipboardReadWrite", "clipboardSanitizedWrite"],
});
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
await page.call("Page.addScriptToEvaluateOnNewDocument", {
  source: `(() => {
    window.__consoleErrors = [];
    const originalError = console.error.bind(console);
    console.error = (...args) => {
      window.__consoleErrors.push(args.map((value) => String(value)).join(" "));
      originalError(...args);
    };
    window.addEventListener("error", (event) => {
      window.__consoleErrors.push(String(event.error?.stack || event.message || "window error"));
    });
    window.addEventListener("unhandledrejection", (event) => {
      window.__consoleErrors.push(String(event.reason?.stack || event.reason || "unhandled rejection"));
    });
  })();`,
});
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
    'document.readyState === "complete" && typeof g4RsyaAdExtrasHtmlV477 === "function" && typeof g4RsyaAssetPromptDataV452 === "function"',
  );

  const initial = await evaluate(`(() => {
    state = createFreshWorkspace({ id: "rsya-assets-prompt-v452-smoke", name: "RSYA assets prompt smoke" });
    activeProjectId = "rsya-assets-prompt-v452-smoke";
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};
    const fixture = ${JSON.stringify(fixture)};
    Object.assign(state.project, structuredClone(fixture.project));
    state.sharedEvidence = structuredClone(fixture.sharedEvidence);
    const key = normalizeAspectKey(${JSON.stringify(goatId)});
    state.gate4Rsya = { [key]: structuredClone(fixture.branch) };
    const d = ensureGate4RsyaV289(${JSON.stringify(goatId)});
    const channel = {
      key: "yandex-rsya", launchType: "media", channel: "Яндекс Директ",
      platform: "РСЯ", type: "Сети", status: "active", materials: "баннеры",
    };
    const common = {
      decision: "launch", campaignName: "РСЯ · Коза",
      budget: "30000", utm: "utm_source=legacy",
      utmTemplate: "utm_source=yandex&utm_medium=cpc",
    };
    const group = d.groups[0];
    const ad = group.ads[0];
    ad.landing = "https://k-apple.ru/simvol-2027-koza?ref=kept&utm_source=old#details";
    ad.callouts = [];
    ad.sitelinks = [];
    g4RsyaCampaignV289 = () => common;
    const host = document.createElement("main");
    host.style.cssText = "max-width:1180px;margin:0 auto;padding:24px;background:#fff";
    document.body.replaceChildren(host);
    document.body.style.cssText = "display:block;background:#f7f7f4;margin:0";
    const render = () => {
      host.innerHTML = '<h2 style="margin:0 0 16px">Символ 2027 года «Коза»</h2>' +
        '<section data-smoke-campaign>' + g4RsyaFieldV289({
          product: ${JSON.stringify(goatId)}, channel: channel.key,
          store: 'campaignCommon', field: 'utmTemplate', label: 'UTM-шаблон кампании',
          value: common.utmTemplate, textarea: true,
        }) + '</section>' +
        '<section data-smoke-ads>' + g4RsyaAdsHtmlV289(${JSON.stringify(goatId)}, channel.key, common, d) + '</section>';
    };
    window.__rsyaAssetsSmoke = { d, channel, common, host, render };
    render();
    const extras = host.querySelector('[data-g4rsya-v477-ad-extras]');
    const promptCard = extras.querySelector('[data-g4rsya-v452-asset-prompt-card]');
    const promptField = promptCard.querySelector('[data-g4rsya-v452-asset-prompt]');
    const callouts = extras.querySelector('[data-g4rsya-v452-callouts]');
    const sitelinks = [...extras.querySelectorAll('.g4-rsya-extra-block-v289')]
      .find((node) => node.querySelector('strong')?.textContent.startsWith('Быстрые ссылки'));
    const sourceAdCopyInitiallyEmpty =
      !ad.headings.some((row) => String(row.value || '').trim()) &&
      !ad.texts.some((row) => String(row.value || '').trim());
    const searchProbe = document.createElement('div');
    const searchRows = ['А'.repeat(67), '', '', ''];
    searchProbe.innerHTML = g4GroupCalloutsSummaryHtml(searchRows);
    g4GroupCalloutsUpdateSummary(searchProbe, searchRows);
    const sharedSearchSummary = {
      progress: searchProbe.querySelector('[data-g4sb-callouts-progress]').textContent.trim(),
      total: searchProbe.querySelector('[data-g4sb-callouts-total]').textContent.trim(),
      warning: searchProbe.querySelector('[data-g4sb-callouts-warning]').textContent.trim(),
      warningHidden: searchProbe.querySelector('[data-g4sb-callouts-warning]').hidden,
    };
    const ctaRecommendation = g4RsyaCtaRecommendationV479(${JSON.stringify(goatId)}, group);
    const ctaRecommendationNode = extras.querySelector('[data-g4rsya-v479-cta-recommendation]');
    const selectedProductLanding = g4RsyaGroupFoundationV455(${JSON.stringify(goatId)}, group).landing;
    const foundation = g4RsyaGroupFoundationV455(${JSON.stringify(goatId)}, group);
    const canonicalProduct = g4RsyaCatalogProductV289(${JSON.stringify(goatId)}, group);
    const canonicalModel = guruStrategicFoundationModelV286(canonicalProduct);
    const assetPromptData = g4RsyaAssetPromptDataV452(${JSON.stringify(goatId)}, group, ad);
    const canonicalJtbd = canonicalModel.descriptors
      .find((descriptor) => descriptor.id === group.jtbdId)?.text || '';
    const alternateSegment = foundation.sources.segment
      .find((row) => !row.canonicalV483 && row.value !== canonicalModel.fields.segment.value)?.value || '';
    const automaticCtaUrlInput = extras.querySelector(
      '[data-g4rsya-v289-store="ad"][data-g4rsya-v289-field="ctaUrl"]',
    );
    const compactEditor = extras.querySelector('.g4-rsya-extra-editor-grid-v483');
    const firstCalloutRow = compactEditor?.querySelector('[data-g4rsya-v483-callout-row]');
    const firstCalloutCopy = firstCalloutRow?.querySelector('[data-g4rsya-v472-icon-copy]');
    const firstCalloutInput = firstCalloutRow?.querySelector('[data-g4rsya-v289-store="callout"]');
    const firstSitelinkRow = compactEditor?.querySelector('[data-g4rsya-v483-sitelink-row]');
    const firstSitelinkInputs = [...(firstSitelinkRow?.querySelectorAll(
      '[data-g4rsya-v289-store="sitelink"]',
    ) || [])];
    const firstSitelinkVisibleInputs = firstSitelinkInputs.filter((input) =>
      !input.closest('[data-g4rsya-v484-conditional-url]')?.hidden,
    );
    const firstSitelinkCopy = firstSitelinkRow?.querySelector('[data-g4rsya-v472-icon-copy]');
    const calloutRect = callouts.getBoundingClientRect();
    const sitelinkRect = sitelinks.getBoundingClientRect();
    const legacyMain = g4RsyaBlankAdV289({
      ctaUseMain: true,
      ctaUrl: 'https://legacy.example/hidden',
    });
    const legacyAlternative = g4RsyaBlankAdV289({
      ctaUseMain: false,
      ctaUrl: 'https://legacy.example/alternative',
    });
    promptField.style.height = '620px';
    promptField.style.minHeight = '620px';
    return {
      pageHealth: {
        hasContent: document.body.innerText.trim().length > 0,
        errorOverlay: Boolean(document.querySelector('[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay')),
        consoleErrors: [...(window.__consoleErrors || [])],
      },
      prompt: promptField.value,
      readonly: promptField.readOnly,
      note: promptCard.querySelector('.g4-rsya-asset-prompt-note-v452')?.textContent.trim() || '',
      sourceAdCopyInitiallyEmpty,
      promptBeforeCallouts: Boolean(promptCard.compareDocumentPosition(callouts) & Node.DOCUMENT_POSITION_FOLLOWING),
      promptBeforeSitelinks: Boolean(promptCard.compareDocumentPosition(sitelinks) & Node.DOCUMENT_POSITION_FOLLOWING),
      sources: Object.fromEntries(["jtbd", "offer", "benefit", "segment"].map((name) => [name, group[name]])),
      canonicalAlignment: {
        canonical: {
          segment: canonicalModel.fields.segment.value,
          positioning: canonicalModel.fields.positioning.value,
          usp: canonicalModel.fields.usp.value,
          offer: canonicalModel.fields.offer.value,
          targetAction: canonicalModel.fields.offer.cta,
          landing: canonicalModel.fields.landing.value,
          jtbd: canonicalJtbd,
        },
        foundation: Object.fromEntries(
          ['segment', 'positioning', 'usp', 'offer', 'targetAction', 'landing', 'jtbd']
            .map((field) => [field, foundation[field]]),
        ),
        prompt: assetPromptData.values,
        alternateSegment,
        firstSegmentIsCanonical: foundation.sources.segment[0]?.canonicalV483 === true,
      },
      sharedSearchSummary,
      finalUrl: extras.querySelector('[data-g4rsya-v478-final-url] code')?.textContent.trim() || '',
      ctaHint: [...extras.querySelectorAll('.g4-rsya-field-v289')]
        .find((field) => field.querySelector('b')?.textContent.trim() === 'Кнопка действия')
        ?.querySelector('.g4-rsya-hint-v289')?.textContent.trim() || '',
      ctaRecommendation,
      ctaRecommendationText: ctaRecommendationNode?.textContent.trim() || '',
      ctaRecommendationHasCopy: Boolean(ctaRecommendationNode?.querySelector('[data-g4rsya-v289-copy]')),
      ctaUrlFieldCount: extras.querySelectorAll('[data-g4rsya-v289-store="ad"][data-g4rsya-v289-field="ctaUrl"]').length,
      ctaUrlLabel: [...extras.querySelectorAll('.g4-rsya-field-v289')]
        .find((field) => field.querySelector('[data-g4rsya-v289-field="ctaUrl"]'))
        ?.querySelector('b')?.textContent.trim() || '',
      selectedProductLanding,
      automaticCtaUrlValue: automaticCtaUrlInput?.value || '',
      automaticCtaUrlStoredValue: ad.ctaUrl,
      automaticCtaUrlHint: automaticCtaUrlInput?.closest('.g4-rsya-field-v289')
        ?.querySelector('.g4-rsya-hint-v289')?.textContent.trim() || '',
      ctaUseMainControlCount: extras.querySelectorAll('[data-g4rsya-v289-field="ctaUseMain"]').length,
      stateHasCtaUseMain: Object.hasOwn(ad, 'ctaUseMain'),
      legacyMigration: {
        main: { hasFlag: Object.hasOwn(legacyMain, 'ctaUseMain'), ctaUrl: legacyMain.ctaUrl },
        alternative: { hasFlag: Object.hasOwn(legacyAlternative, 'ctaUseMain'), ctaUrl: legacyAlternative.ctaUrl },
      },
      defaultExtraSlots: {
        callouts: callouts.querySelectorAll('[data-g4rsya-v289-store="callout"]').length,
        sitelinks: sitelinks.querySelectorAll('.g4-rsya-sitelink-v289').length,
        filledCallouts: callouts.querySelector('[data-g4rsya-v482-filled-count="callouts"]')?.textContent.trim() || '',
        filledSitelinks: sitelinks.querySelector('[data-g4rsya-v482-filled-count="sitelinks"]')?.textContent.trim() || '',
        calloutAddDisabled: callouts.querySelector('[data-g4rsya-v289-add-callout]')?.disabled ?? true,
        sitelinkAddDisabled: sitelinks.querySelector('[data-g4rsya-v289-add-sitelink]')?.disabled ?? false,
        storedCallouts: ad.callouts.length,
        storedSitelinks: ad.sitelinks.length,
        extraIssues: g4RsyaAdIssuesV289(ad, selectedProductLanding)
          .filter((issue) => /^(Уточнение|Быстрая ссылка)/.test(issue)),
        neutralCallouts: [...callouts.querySelectorAll('[data-g4rsya-v289-store="callout"]')]
          .every((input) => input.classList.contains('is-optional') && !input.classList.contains('has-error')),
        neutralSitelinks: [...sitelinks.querySelectorAll('[data-g4rsya-v289-store="sitelink"]')]
          .every((input) => input.classList.contains('is-optional') && !input.classList.contains('has-error')),
        hiddenSitelinkUrls: sitelinks.querySelectorAll(
          '[data-g4rsya-v484-conditional-url][hidden]',
        ).length,
      },
      compactUi: {
        gridExists: Boolean(compactEditor),
        panelsShareTop: Math.abs(calloutRect.top - sitelinkRect.top) < 2,
        calloutsBeforeSitelinks: calloutRect.left < sitelinkRect.left,
        renderedHeight: Math.round(compactEditor?.getBoundingClientRect().height || 0),
        iconCopyButtons: compactEditor?.querySelectorAll('[data-g4rsya-v472-icon-copy]').length || 0,
        visibleIconCopyButtons: [...(compactEditor?.querySelectorAll('[data-g4rsya-v472-icon-copy]') || [])]
          .filter((button) => !button.closest('[hidden]')).length,
        textCopyButtons: [...(compactEditor?.querySelectorAll('button') || [])]
          .filter((button) => button.textContent.trim() === 'Копировать').length,
        calloutCopyBeforeInput: Boolean(firstCalloutCopy && firstCalloutInput &&
          (firstCalloutCopy.compareDocumentPosition(firstCalloutInput) & Node.DOCUMENT_POSITION_FOLLOWING)),
        sitelinkCopyBeforeInput: Boolean(firstSitelinkCopy && firstSitelinkInputs[0] &&
          (firstSitelinkCopy.compareDocumentPosition(firstSitelinkInputs[0]) & Node.DOCUMENT_POSITION_FOLLOWING)),
        sitelinkFieldsShareTop: firstSitelinkVisibleInputs.length === 2 &&
          new Set(firstSitelinkVisibleInputs.map((input) => Math.round(input.getBoundingClientRect().top))).size === 1,
      },
      paddingProbe: {
        calloutsFromThree: g4RsyaExtraSlotRowsV482(
          ${JSON.stringify(goatId)}, group,
          { ...ad, id: 'padding-callouts', callouts: Array.from({ length: 3 }, (_, index) => ({ id: 'c' + index, value: 'Факт ' + index })) },
          'callouts',
        ).length,
        sitelinksFromThree: g4RsyaExtraSlotRowsV482(
          ${JSON.stringify(goatId)}, group,
          { ...ad, id: 'padding-sitelinks', sitelinks: Array.from({ length: 3 }, (_, index) => ({ id: 's' + index, title: 'Ссылка ' + index, url: 'https://example.com/' + index, description: '' })) },
          'sitelinks',
        ).length,
      },
      initialButtonFinalUrl: g4RsyaButtonFinalUrlV479(common, ${JSON.stringify(goatId)}, group, ad),
    };
  })()`);

  await evaluate(`(() => {
    document.querySelector('[data-g4rsya-v452-asset-prompt-card]')
      ?.scrollIntoView({ block: 'start' });
    window.scrollBy(0, -16);
  })()`);
  await wait(100);
  await screenshot(sourceScreenshotPath);
  await evaluate(`(() => {
    document.querySelector('.g4-rsya-extra-editor-grid-v483')
      ?.scrollIntoView({ block: 'start' });
    window.scrollBy(0, -16);
  })()`);
  await wait(100);
  await screenshot(compactScreenshotPath);

  const interaction = await evaluate(`(async () => {
    const smoke = window.__rsyaAssetsSmoke;
    smoke.host.querySelector('[data-smoke-ads]').hidden = false;
    let headingInput = smoke.host.querySelector('[data-g4rsya-v289-store="heading"]');
    let textInput = smoke.host.querySelector('[data-g4rsya-v289-store="text"]');
    const testHeading = 'Авторская Коза для новогоднего подарка';
    const testText = 'Необычный подарок для близких, который останется частью домашнего уюта';
    headingInput.value = testHeading;
    headingInput.dispatchEvent(new Event('input', { bubbles: true }));
    textInput.value = testText;
    textInput.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((done) => setTimeout(done, 380));
    let promptCard = smoke.host.querySelector('[data-g4rsya-v452-asset-prompt-card]');
    let promptField = promptCard.querySelector('[data-g4rsya-v452-asset-prompt]');
    let copyButton = promptCard.querySelector('[data-g4rsya-v452-copy-asset-prompt]');
    const populatedPrompt = promptField.value;
    const noteAfterAdCopy = promptCard.querySelector('.g4-rsya-asset-prompt-note-v452')?.textContent.trim() || '';
    copyButton.click();
    await new Promise((done) => setTimeout(done, 120));
    const copied = await navigator.clipboard.readText();
    const copyLabel = copyButton.textContent.trim();
    const filledReference = smoke.host.querySelector(
      '[data-g4rsya-v289-store="heading"]',
    );
    const filledReferenceBackground = getComputedStyle(filledReference).backgroundColor;

    let group = smoke.d.groups[0];
    let ad = group.ads[0];
    let extras = smoke.host.querySelector('[data-g4rsya-v477-ad-extras]');
    let virtualCallout = extras.querySelector('[data-g4rsya-v289-store="callout"][data-g4rsya-v482-virtual="1"]');
    const storageBeforeVirtualInput = ad.callouts.length;
    virtualCallout.value = 'Ручная работа';
    virtualCallout.dispatchEvent(new Event('input', { bubbles: true }));
    const materializedCalloutRow = virtualCallout.closest('[data-g4rsya-v483-callout-row]');
    const materializedCalloutRemove = materializedCalloutRow
      ?.querySelector('[data-g4rsya-v289-remove-callout]');
    materializedCalloutRow
      ?.querySelector('[data-g4rsya-v472-icon-copy]')?.click();
    await new Promise((done) => setTimeout(done, 80));
    const compactCalloutCopied = await navigator.clipboard.readText();
    let currentAfterVirtualInput = g4RsyaFindV289(${JSON.stringify(goatId)}, group.id, ad.id);
    const virtualCalloutMaterialized = {
      before: storageBeforeVirtualInput,
      after: currentAfterVirtualInput.ad.callouts.length,
      value: currentAfterVirtualInput.ad.callouts[0]?.value || '',
      filledCounter: extras.querySelector('[data-g4rsya-v482-filled-count="callouts"]')?.textContent.trim() || '',
      filledClass: virtualCallout.classList.contains('is-filled'),
      optionalClass: virtualCallout.classList.contains('is-optional'),
      virtualAttribute: virtualCallout.hasAttribute('data-g4rsya-v482-virtual'),
      guruOptionalAttribute: virtualCallout.hasAttribute('data-guru-optional'),
      backgroundColor: getComputedStyle(virtualCallout).backgroundColor,
      matchesFilledReference: getComputedStyle(virtualCallout).backgroundColor === filledReferenceBackground,
      rowMaterializedClass: materializedCalloutRow?.classList.contains('is-materialized-v485') || false,
      removeVisible: Boolean(materializedCalloutRemove && !materializedCalloutRemove.hidden),
    };
    virtualCallout.value = '';
    virtualCallout.dispatchEvent(new Event('input', { bubbles: true }));
    const clearedVirtualCalloutUi = {
      optionalClass: virtualCallout.classList.contains('is-optional'),
      virtualAttribute: virtualCallout.hasAttribute('data-g4rsya-v482-virtual'),
      rowMaterializedClass: materializedCalloutRow?.classList.contains('is-materialized-v485') || false,
      removeHidden: materializedCalloutRemove?.hidden ?? false,
    };
    currentAfterVirtualInput = g4RsyaFindV289(${JSON.stringify(goatId)}, group.id, ad.id);
    let virtualSitelinkTitle = extras.querySelector(
      '[data-g4rsya-v289-store="sitelink"][data-g4rsya-v289-field="title"][data-g4rsya-v482-virtual="1"]',
    );
    virtualSitelinkTitle.value = 'Подробнее';
    virtualSitelinkTitle.dispatchEvent(new Event('input', { bubbles: true }));
    const materializedSitelinkRow = virtualSitelinkTitle.closest('.g4-rsya-sitelink-v289');
    const virtualSitelinkDescription = materializedSitelinkRow
      ?.querySelector('[data-g4rsya-v289-field="description"]');
    virtualSitelinkDescription.value = 'Авторская ручная работа';
    virtualSitelinkDescription.dispatchEvent(new Event('input', { bubbles: true }));
    const materializedSitelinkRemove = materializedSitelinkRow
      ?.querySelector('[data-g4rsya-v289-remove-sitelink]');
    const conditionalUrl = materializedSitelinkRow
      ?.querySelector('[data-g4rsya-v484-conditional-url]');
    const urlVisibleAfterTitle = conditionalUrl ? !conditionalUrl.hidden : false;
    virtualSitelinkTitle.closest('.g4-rsya-sitelink-field-v483')
      ?.querySelector('[data-g4rsya-v472-icon-copy]')?.click();
    await new Promise((done) => setTimeout(done, 80));
    const compactSitelinkCopied = await navigator.clipboard.readText();
    let currentAfterVirtualSitelink = g4RsyaFindV289(${JSON.stringify(goatId)}, group.id, ad.id);
    const virtualSitelinkMaterialized = {
      stored: currentAfterVirtualSitelink.ad.sitelinks.length,
      title: currentAfterVirtualSitelink.ad.sitelinks[0]?.title || '',
      urlVisibleAfterTitle,
      filledClass: virtualSitelinkTitle.classList.contains('is-filled'),
      optionalClass: virtualSitelinkTitle.classList.contains('is-optional'),
      virtualAttribute: virtualSitelinkTitle.hasAttribute('data-g4rsya-v482-virtual'),
      guruOptionalAttribute: virtualSitelinkTitle.hasAttribute('data-guru-optional'),
      backgroundColor: getComputedStyle(virtualSitelinkTitle).backgroundColor,
      matchesFilledReference: getComputedStyle(virtualSitelinkTitle).backgroundColor === filledReferenceBackground,
      descriptionFilledClass: virtualSitelinkDescription.classList.contains('is-filled'),
      descriptionGuruOptionalAttribute: virtualSitelinkDescription.hasAttribute('data-guru-optional'),
      descriptionBackgroundColor: getComputedStyle(virtualSitelinkDescription).backgroundColor,
      descriptionMatchesFilledReference: getComputedStyle(virtualSitelinkDescription).backgroundColor === filledReferenceBackground,
      rowMaterializedClass: materializedSitelinkRow?.classList.contains('is-materialized-v485') || false,
      removeVisible: Boolean(materializedSitelinkRemove && !materializedSitelinkRemove.hidden),
      missingUrl: virtualSitelinkTitle.closest('.g4-rsya-sitelink-v289')
        ?.querySelector('[data-g4rsya-v289-field="url"]')
        ?.closest('.g4-rsya-field-v289')
        ?.querySelector('[data-g4rsya-v289-error]')?.textContent.trim() || '',
    };
    virtualSitelinkTitle.value = '';
    virtualSitelinkTitle.dispatchEvent(new Event('input', { bubbles: true }));
    virtualSitelinkDescription.value = '';
    virtualSitelinkDescription.dispatchEvent(new Event('input', { bubbles: true }));
    const urlHiddenAfterClear = conditionalUrl?.hidden ?? false;
    const clearedVirtualSitelinkUi = {
      optionalClass: virtualSitelinkTitle.classList.contains('is-optional'),
      virtualAttribute: virtualSitelinkTitle.hasAttribute('data-g4rsya-v482-virtual'),
      rowMaterializedClass: materializedSitelinkRow?.classList.contains('is-materialized-v485') || false,
      removeHidden: materializedSitelinkRemove?.hidden ?? false,
    };
    currentAfterVirtualSitelink = g4RsyaFindV289(${JSON.stringify(goatId)}, group.id, ad.id);
    const clearedVirtualStorage = {
      callouts: currentAfterVirtualSitelink.ad.callouts.length,
      sitelinks: currentAfterVirtualSitelink.ad.sitelinks.length,
    };
    const clearedVirtualExtraIssues = g4RsyaAdIssuesV289(
      currentAfterVirtualSitelink.ad,
      g4RsyaGroupFoundationV455(${JSON.stringify(goatId)}, currentAfterVirtualSitelink.group).landing,
    ).filter((issue) => /^(Уточнение|Быстрая ссылка)/.test(issue));
    await new Promise((done) => setTimeout(done, 380));
    const previousLaunchAdRefresh = g4RsyaRefreshLaunchAdV472;
    const previousGroupCardsRefresh = g4RsyaRefreshGroupCardsV458;
    const previousAssetPromptsRefresh = g4RsyaRefreshAssetPromptsV452;
    const refreshCounts = { launchAd: 0, groupCards: 0, assetPrompts: 0 };
    g4RsyaRefreshLaunchAdV472 = function () {
      refreshCounts.launchAd += 1;
      return previousLaunchAdRefresh.apply(this, arguments);
    };
    g4RsyaRefreshGroupCardsV458 = function () {
      refreshCounts.groupCards += 1;
      return previousGroupCardsRefresh.apply(this, arguments);
    };
    g4RsyaRefreshAssetPromptsV452 = function () {
      refreshCounts.assetPrompts += 1;
      return previousAssetPromptsRefresh.apply(this, arguments);
    };
    const burstStartedAt = performance.now();
    for (let index = 0; index < 24; index += 1) {
      virtualCallout.value = 'Тест ' + index;
      virtualCallout.dispatchEvent(new Event('input', { bubbles: true }));
    }
    virtualCallout.value = '';
    virtualCallout.dispatchEvent(new Event('input', { bubbles: true }));
    const inputBurst = {
      durationMs: Math.round((performance.now() - burstStartedAt) * 10) / 10,
      synchronous: { ...refreshCounts },
    };
    await new Promise((done) => setTimeout(done, 380));
    inputBurst.deferred = { ...refreshCounts };
    g4RsyaRefreshLaunchAdV472 = previousLaunchAdRefresh;
    g4RsyaRefreshGroupCardsV458 = previousGroupCardsRefresh;
    g4RsyaRefreshAssetPromptsV452 = previousAssetPromptsRefresh;
    const storedBeforeExtraSlot = currentAfterVirtualInput.ad.callouts.length;
    g4RsyaIncreaseExtraSlotsV482(
      ${JSON.stringify(goatId)},
      currentAfterVirtualInput.group,
      currentAfterVirtualInput.ad,
      'callouts',
    );
    smoke.render();
    extras = smoke.host.querySelector('[data-g4rsya-v477-ad-extras]');
    const calloutExtension = {
      slots: extras.querySelectorAll('[data-g4rsya-v289-store="callout"]').length,
      storedBefore: storedBeforeExtraSlot,
      storedAfter: g4RsyaFindV289(${JSON.stringify(goatId)}, group.id, ad.id).ad.callouts.length,
    };
    g4RsyaExtraSlotCountsV482.delete(
      g4RsyaExtraSlotKeyV482(${JSON.stringify(goatId)}, group, ad, 'callouts'),
    );

    group = smoke.d.groups[0];
    ad = group.ads[0];
    ad.callouts = Array.from({ length: 6 }, (_, index) => ({
      id: 'rsya-callout-v452-' + index,
      value: index < 5 ? 'А'.repeat(15) : '',
    }));
    ad.sitelinks = [{
      id: 'rsya-sitelink-v452-1',
      title: 'З'.repeat(31),
      description: 'О'.repeat(61),
      url: 'https://k-apple.ru/simvol-2027-koza',
    }];
    smoke.render();
    let calloutSection = smoke.host.querySelector('[data-g4rsya-v452-callouts]');
    let total = calloutSection.querySelector('[data-g4sb-callouts-total]').textContent.trim();
    let warning = calloutSection.querySelector('[data-g4sb-callouts-warning]');
    const at75 = { total, warningHidden: warning.hidden };
    let inputs = [...calloutSection.querySelectorAll('[data-g4rsya-v289-store="callout"]')];
    inputs[5].value = 'Б'.repeat(5);
    inputs[5].dispatchEvent(new Event('input', { bubbles: true }));
    const at80 = {
      total: calloutSection.querySelector('[data-g4sb-callouts-total]').textContent.trim(),
      warning: calloutSection.querySelector('[data-g4sb-callouts-warning]').textContent.trim(),
      warningHidden: calloutSection.querySelector('[data-g4sb-callouts-warning]').hidden,
    };
    inputs.forEach((input) => {
      input.value = 'В'.repeat(22);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    inputs[0].value = 'Г'.repeat(23);
    inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
    const at133 = {
      total: calloutSection.querySelector('[data-g4sb-callouts-total]').textContent.trim(),
      warning: calloutSection.querySelector('[data-g4sb-callouts-warning]').textContent.trim(),
      warningHidden: calloutSection.querySelector('[data-g4sb-callouts-warning]').hidden,
      firstCounter: inputs[0].closest('.g4-rsya-field-v289')
        ?.querySelector('[data-g4rsya-v289-counter]')?.textContent.trim() || '',
    };
    const sitelinkBlock = [...smoke.host.querySelectorAll('.g4-rsya-extra-block-v289')]
      .find((node) => node.querySelector('strong')?.textContent.startsWith('Быстрые ссылки'));
    const sitelinkTitle = sitelinkBlock.querySelector('[data-g4rsya-v289-field="title"]');
    const sitelinkDescription = sitelinkBlock.querySelector('[data-g4rsya-v289-field="description"]');
    const sitelink = {
      titleError: sitelinkTitle.closest('.g4-rsya-field-v289')
        .querySelector('[data-g4rsya-v289-error]').textContent.trim(),
      descriptionError: sitelinkDescription.closest('.g4-rsya-field-v289')
        .querySelector('[data-g4rsya-v289-error]').textContent.trim(),
      summaryCounters: sitelinkBlock.querySelectorAll('[data-g4sb-callouts-total]').length,
      editable: !sitelinkTitle.readOnly && !sitelinkDescription.readOnly &&
        sitelinkTitle.hasAttribute('data-g4rsya-v289-bind'),
    };
    let utmInput = smoke.host.querySelector('[data-smoke-campaign] [data-g4rsya-v289-field="utmTemplate"]');
    utmInput.value = 'utm_source=updated&utm_campaign=goat';
    utmInput.dispatchEvent(new Event('input', { bubbles: true }));
    const liveFinalUrl = smoke.host.querySelector('[data-g4rsya-v478-final-url] code')?.textContent.trim() || '';
    const syncedLegacyUtm = smoke.common.utm;
    utmInput.value = '';
    utmInput.dispatchEvent(new Event('input', { bubbles: true }));
    const emptyTemplateFinalUrl = smoke.host.querySelector('[data-g4rsya-v478-final-url] code')?.textContent.trim() || '';
    utmInput.value = 'utm_source=updated&utm_campaign=goat';
    utmInput.dispatchEvent(new Event('input', { bubbles: true }));
    let landingInput = smoke.host.querySelector('[data-g4rsya-v289-store="ad"][data-g4rsya-v289-field="landing"]');
    landingInput.value = 'https://k-apple.ru/other?keep=2&utm_campaign=old#next';
    landingInput.dispatchEvent(new Event('input', { bubbles: true }));
    const liveLandingFinalUrl = smoke.host.querySelector('[data-g4rsya-v478-final-url] code')?.textContent.trim() || '';
    landingInput.value = 'https://k-apple.ru/simvol-2027-koza?ref=kept&utm_source=old#details';
    landingInput.dispatchEvent(new Event('input', { bubbles: true }));

    ad = g4RsyaFindV289(${JSON.stringify(goatId)}, group.id, ad.id).ad;
    ad.sitelinks.push({
      id: 'rsya-sitelink-v478-2',
      title: 'Доставка', description: '',
      url: 'https://k-apple.ru/simvol-2027-koza',
    });
    smoke.render();
    let sitelinkUrlInputs = [...smoke.host.querySelectorAll('[data-g4rsya-v289-store="sitelink"][data-g4rsya-v289-field="url"]:not([data-g4rsya-v482-virtual])')];
    const duplicateWarningsInitial = sitelinkUrlInputs.map((input) => input.closest('.g4-rsya-field-v289')
      .querySelector('[data-g4rsya-v478-warning]').textContent.trim());
    sitelinkUrlInputs[1].value = 'https://k-apple.ru/unique';
    sitelinkUrlInputs[1].dispatchEvent(new Event('input', { bubbles: true }));
    const duplicateWarningsCleared = sitelinkUrlInputs.map((input) => input.closest('.g4-rsya-field-v289')
      .querySelector('[data-g4rsya-v478-warning]').textContent.trim());
    sitelinkUrlInputs[1].value = 'https://k-apple.ru/simvol-2027-koza';
    sitelinkUrlInputs[1].dispatchEvent(new Event('input', { bubbles: true }));
    const duplicateWarningsLive = sitelinkUrlInputs.map((input) => input.closest('.g4-rsya-field-v289')
      .querySelector('[data-g4rsya-v478-warning]').textContent.trim());
    let current = g4RsyaFindV289(${JSON.stringify(goatId)}, group.id, ad.id);
    let ctaUrlInput = smoke.host.querySelector('[data-g4rsya-v289-store="ad"][data-g4rsya-v289-field="ctaUrl"]');
    ctaUrlInput.value = 'https://button.example/order?src=kept&utm_source=old#cta';
    ctaUrlInput.dispatchEvent(new Event('input', { bubbles: true }));
    current = g4RsyaFindV289(${JSON.stringify(goatId)}, group.id, ad.id);
    const alternativeButtonFinalUrl = g4RsyaButtonFinalUrlV479(
      smoke.common,
      ${JSON.stringify(goatId)},
      current.group,
      current.ad,
    );
    ctaUrlInput.value = '';
    ctaUrlInput.dispatchEvent(new Event('input', { bubbles: true }));
    current = g4RsyaFindV289(${JSON.stringify(goatId)}, group.id, ad.id);
    const fallbackButtonFinalUrl = g4RsyaButtonFinalUrlV479(
      smoke.common,
      ${JSON.stringify(goatId)},
      current.group,
      current.ad,
    );
    const packageButtonLine = g4RsyaAdPackageV289(
      smoke.common,
      smoke.d,
      current.group,
      current.ad,
      ${JSON.stringify(goatId)},
    ).split('\\n').find((line) => line.startsWith('ССЫЛКА КНОПКИ:')) || '';
    smoke.render();
    const restoredAutomaticCtaUrl = smoke.host.querySelector(
      '[data-g4rsya-v289-store="ad"][data-g4rsya-v289-field="ctaUrl"]',
    )?.value || '';
    const stateAfterCopy = {
      headings: smoke.d.groups[0].ads[0].headings.map((row) => row.value),
      texts: smoke.d.groups[0].ads[0].texts.map((row) => row.value),
      hasCtaUseMain: Object.hasOwn(smoke.d.groups[0].ads[0], 'ctaUseMain'),
      ctaUrl: smoke.d.groups[0].ads[0].ctaUrl,
    };
    const finalIndicatorTitle = smoke.host.querySelector(
      '[data-g4rsya-v289-store="sitelink"][data-g4rsya-v289-field="title"][data-g4rsya-v482-virtual="1"]',
    );
    const finalIndicatorRow = finalIndicatorTitle.closest('.g4-rsya-sitelink-v289');
    const finalIndicatorDescription = finalIndicatorRow.querySelector(
      '[data-g4rsya-v289-field="description"]',
    );
    finalIndicatorTitle.value = 'Зелёный индикатор';
    finalIndicatorTitle.dispatchEvent(new Event('input', { bubbles: true }));
    finalIndicatorDescription.value = 'Появляется сразу после ввода';
    finalIndicatorDescription.dispatchEvent(new Event('input', { bubbles: true }));
    const finalIndicatorUi = {
      titleBackground: getComputedStyle(finalIndicatorTitle).backgroundColor,
      descriptionBackground: getComputedStyle(finalIndicatorDescription).backgroundColor,
      titleMatchesReference: getComputedStyle(finalIndicatorTitle).backgroundColor === filledReferenceBackground,
      descriptionMatchesReference: getComputedStyle(finalIndicatorDescription).backgroundColor === filledReferenceBackground,
    };
    promptField = smoke.host.querySelector('[data-g4rsya-v452-asset-prompt]');
    promptField.style.height = '520px';
    promptField.style.minHeight = '520px';
    promptField.scrollTop = 0;
    return {
      testHeading, testText, populatedPrompt, copied, copyLabel, noteAfterAdCopy,
      at75, at80, at133, sitelink, stateAfterCopy,
      finalIndicatorUi,
      liveFinalUrl, emptyTemplateFinalUrl, liveLandingFinalUrl, syncedLegacyUtm,
      duplicateWarningsInitial, duplicateWarningsCleared, duplicateWarningsLive,
      alternativeButtonFinalUrl, fallbackButtonFinalUrl, packageButtonLine,
      restoredAutomaticCtaUrl, virtualCalloutMaterialized, virtualSitelinkMaterialized,
      clearedVirtualCalloutUi, clearedVirtualSitelinkUi,
      clearedVirtualExtraIssues, clearedVirtualStorage, calloutExtension,
      urlHiddenAfterClear, inputBurst,
      compactCopyValues: { callout: compactCalloutCopied, sitelink: compactSitelinkCopied },
      calloutsEditable: inputs.every((input) => !input.readOnly && input.hasAttribute('data-g4rsya-v289-bind')),
    };
  })()`);

  await evaluate(`(() => {
    document.querySelector('.g4-rsya-extra-editor-grid-v483')
      ?.scrollIntoView({ block: 'start' });
    window.scrollBy(0, -16);
  })()`);
  await wait(100);
  await screenshot(counterScreenshotPath);
  await evaluate(`(() => {
    const extras = document.querySelector('[data-g4rsya-v477-ad-extras]');
    extras?.querySelector('[data-g4rsya-v452-asset-prompt-card]')?.setAttribute('hidden', '');
    extras?.querySelector('[data-g4rsya-v452-callouts]')?.setAttribute('hidden', '');
    extras?.scrollIntoView({ block: 'start' });
  })()`);
  await wait(100);
  await screenshot(finalVerificationScreenshotPath);

  assert(initial.readonly, "Assets prompt is editable");
  assert(
    initial.pageHealth.hasContent &&
      !initial.pageHealth.errorOverlay &&
      initial.pageHealth.consoleErrors.length === 0,
    `Dev server browser health check failed: ${JSON.stringify(initial.pageHealth)}`,
  );
  assert(initial.promptBeforeCallouts && initial.promptBeforeSitelinks, "Prompt is not above callout/sitelink fields");
  assert(
    initial.canonicalAlignment.firstSegmentIsCanonical &&
      initial.canonicalAlignment.foundation.segment === initial.canonicalAlignment.canonical.segment &&
      initial.canonicalAlignment.foundation.positioning === initial.canonicalAlignment.canonical.positioning &&
      initial.canonicalAlignment.foundation.usp === initial.canonicalAlignment.canonical.usp &&
      initial.canonicalAlignment.foundation.offer === initial.canonicalAlignment.canonical.offer &&
      initial.canonicalAlignment.foundation.targetAction === initial.canonicalAlignment.canonical.targetAction &&
      initial.canonicalAlignment.foundation.landing === initial.canonicalAlignment.canonical.landing &&
      initial.canonicalAlignment.foundation.jtbd === initial.canonicalAlignment.canonical.jtbd,
    `RSYA foundation diverged from the canonical product model: ${JSON.stringify(initial.canonicalAlignment)}`,
  );
  assert(
    initial.canonicalAlignment.prompt.segment === initial.canonicalAlignment.canonical.segment &&
      initial.canonicalAlignment.prompt.offer === initial.canonicalAlignment.canonical.offer &&
      initial.canonicalAlignment.prompt.benefit === initial.canonicalAlignment.canonical.usp &&
      initial.canonicalAlignment.prompt.jtbd === initial.canonicalAlignment.canonical.jtbd &&
      (!initial.canonicalAlignment.alternateSegment ||
        !initial.prompt.includes(`Сегмент аудитории: ${initial.canonicalAlignment.alternateSegment}`)),
    `Assets prompt uses a non-canonical source: ${JSON.stringify(initial.canonicalAlignment)}`,
  );
  assert(
    initial.defaultExtraSlots.callouts === 5 &&
      initial.defaultExtraSlots.sitelinks === 5 &&
      initial.defaultExtraSlots.filledCallouts === "0" &&
      initial.defaultExtraSlots.filledSitelinks === "0" &&
      !initial.defaultExtraSlots.calloutAddDisabled &&
      !initial.defaultExtraSlots.sitelinkAddDisabled &&
      initial.defaultExtraSlots.hiddenSitelinkUrls === 5,
    `Recommended empty slot counts are wrong: ${JSON.stringify(initial.defaultExtraSlots)}`,
  );
  assert(
    initial.defaultExtraSlots.storedCallouts === 0 &&
      initial.defaultExtraSlots.storedSitelinks === 0 &&
      initial.defaultExtraSlots.extraIssues.length === 0 &&
      initial.defaultExtraSlots.neutralCallouts &&
      initial.defaultExtraSlots.neutralSitelinks,
    `Virtual slots affected storage, validation, or neutral styling: ${JSON.stringify(initial.defaultExtraSlots)}`,
  );
  assert(
    initial.compactUi.gridExists &&
      initial.compactUi.panelsShareTop &&
      initial.compactUi.calloutsBeforeSitelinks &&
      initial.compactUi.renderedHeight > 0 &&
      initial.compactUi.renderedHeight < 900 &&
      initial.compactUi.iconCopyButtons === 20 &&
      initial.compactUi.visibleIconCopyButtons === 15 &&
      initial.compactUi.textCopyButtons === 0 &&
      initial.compactUi.calloutCopyBeforeInput &&
      initial.compactUi.sitelinkCopyBeforeInput &&
      initial.compactUi.sitelinkFieldsShareTop,
    `Compact extensions UI does not match the ad-copy pattern: ${JSON.stringify(initial.compactUi)}`,
  );
  assert(
    initial.paddingProbe.calloutsFromThree === 5 &&
      initial.paddingProbe.sitelinksFromThree === 5,
    `Saved rows were not padded to the recommended slot count: ${JSON.stringify(initial.paddingProbe)}`,
  );
  for (const [field, value] of Object.entries(initial.sources))
    assert(initial.prompt.includes(value), `Prompt does not contain group.${field}`);
  assert(initial.prompt.includes("до 25 знаков"), "Callout item limit is missing");
  assert(initial.prompt.includes("не более 132 знаков для десктопа"), "Desktop total limit is missing");
  assert(initial.prompt.includes("не более 76 знаков для мобильного"), "Mobile total limit is missing");
  assert(initial.prompt.includes("до 30 знаков"), "Sitelink title limit is missing");
  assert(initial.prompt.includes("до 60 знаков"), "Sitelink description limit is missing");
  assert(initial.sourceAdCopyInitiallyEmpty, "Source export unexpectedly contains ad copy");
  assert(initial.note.includes("сначала заполните заголовки и тексты"), "Empty ad-copy recommendation is missing");
  assert(initial.prompt.includes("[не заполнены]"), "Empty ad-copy context is not explicit");
  assert(
    initial.finalUrl === "https://k-apple.ru/simvol-2027-koza?ref=kept&utm_source=yandex&utm_medium=cpc#details",
    `Initial campaign UTM template was not merged: ${initial.finalUrl}`,
  );
  assert(
    initial.ctaHint.includes("Без кнопки") && initial.ctaHint.includes("Узнать больше") && initial.ctaHint.includes("автоматически"),
    `CTA default behavior hint is missing: ${initial.ctaHint}`,
  );
  assert(
    initial.ctaRecommendation.targetAction &&
      initial.ctaRecommendationText.includes(initial.ctaRecommendation.targetAction) &&
      initial.ctaRecommendationText.includes(initial.ctaRecommendation.category) &&
      initial.ctaRecommendationText.includes("живом Директе") &&
      initial.ctaRecommendationText.includes("не готовое значение"),
    `CTA category recommendation is incomplete: ${JSON.stringify(initial.ctaRecommendation)}`,
  );
  assert(!initial.ctaRecommendationHasCopy, "CTA recommendation unexpectedly has a copy button");
  assert(
    initial.ctaUrlFieldCount === 1 &&
      initial.ctaUrlLabel === "Ссылка кнопки (необязательно)" &&
      initial.ctaUseMainControlCount === 0,
    `CTA link controls are wrong: ${JSON.stringify(initial)}`,
  );
  assert(
    initial.automaticCtaUrlValue === initial.selectedProductLanding &&
      initial.automaticCtaUrlStoredValue === "" &&
      initial.automaticCtaUrlHint.includes("выбранного товара или услуги"),
    `Selected product landing was not inserted into the CTA URL field: ${JSON.stringify(initial)}`,
  );
  assert(!initial.stateHasCtaUseMain, "ctaUseMain remained in normalized ad state");
  assert(
    !initial.legacyMigration.main.hasFlag &&
      initial.legacyMigration.main.ctaUrl === "" &&
      !initial.legacyMigration.alternative.hasFlag &&
      initial.legacyMigration.alternative.ctaUrl === "https://legacy.example/alternative",
    `Legacy CTA link migration failed: ${JSON.stringify(initial.legacyMigration)}`,
  );
  assert(
    initial.initialButtonFinalUrl === "https://k-apple.ru/simvol-2027-koza?utm_source=yandex&utm_medium=cpc",
    `Empty CTA URL did not use the selected product landing: ${initial.initialButtonFinalUrl}`,
  );
  assert(
    initial.sharedSearchSummary.progress === "1 из 4 минимум" &&
      initial.sharedSearchSummary.total === "67 из 66 символов суммарно" &&
      initial.sharedSearchSummary.warning === "Превышен лимит суммарной длины - уточнения могут показываться в случайном порядке вместо заданного" &&
      !initial.sharedSearchSummary.warningHidden,
    `Shared Search summary changed: ${JSON.stringify(initial.sharedSearchSummary)}`,
  );
  assert(interaction.populatedPrompt.includes(interaction.testHeading), "Live heading did not reach prompt");
  assert(interaction.populatedPrompt.includes(interaction.testText), "Live ad text did not reach prompt");
  assert(!interaction.noteAfterAdCopy, "Recommendation remained after heading/text were filled");
  assert(interaction.copied === interaction.populatedPrompt, "Clipboard does not contain the full prompt");
  assert(interaction.copyLabel === "Скопировано", "Copy button did not confirm success");
  assert(
    interaction.virtualCalloutMaterialized.before === 0 &&
      interaction.virtualCalloutMaterialized.after === 1 &&
      interaction.virtualCalloutMaterialized.value === "Ручная работа" &&
      interaction.virtualCalloutMaterialized.filledCounter === "1" &&
      interaction.virtualCalloutMaterialized.filledClass &&
      !interaction.virtualCalloutMaterialized.optionalClass &&
      !interaction.virtualCalloutMaterialized.virtualAttribute &&
      !interaction.virtualCalloutMaterialized.guruOptionalAttribute &&
      interaction.virtualCalloutMaterialized.matchesFilledReference &&
      interaction.virtualCalloutMaterialized.rowMaterializedClass &&
      interaction.virtualCalloutMaterialized.removeVisible &&
      interaction.clearedVirtualCalloutUi.optionalClass &&
      interaction.clearedVirtualCalloutUi.virtualAttribute &&
      !interaction.clearedVirtualCalloutUi.rowMaterializedClass &&
      interaction.clearedVirtualCalloutUi.removeHidden &&
      interaction.clearedVirtualStorage.callouts === 0 &&
      interaction.clearedVirtualStorage.sitelinks === 0 &&
      interaction.clearedVirtualExtraIssues.length === 0,
    `Virtual callout was not materialized lazily or remained required after clearing: ${JSON.stringify(interaction)}`,
  );
  assert(
    interaction.virtualSitelinkMaterialized.stored === 1 &&
      interaction.virtualSitelinkMaterialized.title === "Подробнее" &&
      interaction.virtualSitelinkMaterialized.urlVisibleAfterTitle &&
      interaction.virtualSitelinkMaterialized.filledClass &&
      !interaction.virtualSitelinkMaterialized.optionalClass &&
      !interaction.virtualSitelinkMaterialized.virtualAttribute &&
      !interaction.virtualSitelinkMaterialized.guruOptionalAttribute &&
      interaction.virtualSitelinkMaterialized.matchesFilledReference &&
      interaction.virtualSitelinkMaterialized.descriptionFilledClass &&
      !interaction.virtualSitelinkMaterialized.descriptionGuruOptionalAttribute &&
      interaction.virtualSitelinkMaterialized.descriptionMatchesFilledReference &&
      interaction.virtualSitelinkMaterialized.rowMaterializedClass &&
      interaction.virtualSitelinkMaterialized.removeVisible &&
      interaction.urlHiddenAfterClear &&
      interaction.clearedVirtualSitelinkUi.optionalClass &&
      interaction.clearedVirtualSitelinkUi.virtualAttribute &&
      !interaction.clearedVirtualSitelinkUi.rowMaterializedClass &&
      interaction.clearedVirtualSitelinkUi.removeHidden &&
      interaction.virtualSitelinkMaterialized.missingUrl.includes("Заполните поле"),
    `Virtual sitelink was not materialized lazily or did not validate a partially filled row: ${JSON.stringify(interaction.virtualSitelinkMaterialized)}`,
  );
  assert(
    interaction.compactCopyValues.callout === "Ручная работа" &&
      interaction.compactCopyValues.sitelink === "Подробнее",
    `Compact copy icons did not copy their fields: ${JSON.stringify(interaction.compactCopyValues)}`,
  );
  assert(
    interaction.finalIndicatorUi.titleMatchesReference &&
      interaction.finalIndicatorUi.descriptionMatchesReference,
    `Final sitelink fields did not keep the green filled indicator: ${JSON.stringify(interaction.finalIndicatorUi)}`,
  );
  assert(
    interaction.inputBurst.synchronous.launchAd === 0 &&
      interaction.inputBurst.synchronous.groupCards === 0 &&
      interaction.inputBurst.synchronous.assetPrompts === 0 &&
      interaction.inputBurst.deferred.launchAd === 1 &&
      interaction.inputBurst.deferred.groupCards === 1 &&
      interaction.inputBurst.deferred.assetPrompts === 0,
    `Heavy RSYA refreshes still run per keystroke: ${JSON.stringify(interaction.inputBurst)}`,
  );
  assert(
    interaction.calloutExtension.slots === 6 &&
      interaction.calloutExtension.storedBefore === interaction.calloutExtension.storedAfter,
    `+Уточнение did not add a render-only sixth slot: ${JSON.stringify(interaction.calloutExtension)}`,
  );
  assert(interaction.at75.warningHidden && interaction.at75.total.startsWith("75 "), "75-char summary is wrong");
  assert(!interaction.at80.warningHidden && interaction.at80.warning.includes("мобильного"), "Mobile limit warning is missing");
  assert(!interaction.at133.warningHidden && interaction.at133.warning.includes("Превышен лимит 132"), "Desktop limit warning is missing");
  assert(interaction.at133.total.startsWith("133 "), "133-char summary is wrong");
  assert(interaction.at133.firstCounter === "23/25", "Per-callout counter is wrong");
  assert(interaction.calloutsEditable, "Callout fields became read-only");
  assert(interaction.sitelink.editable, "Sitelink fields became read-only");
  assert(interaction.sitelink.titleError.includes("Сократите заголовок на 1"), "30-char sitelink title validation is missing");
  assert(interaction.sitelink.descriptionError.includes("Сократите описание на 1"), "60-char sitelink description validation is missing");
  assert(interaction.sitelink.summaryCounters === 0, "A forbidden total sitelink counter was added");
  assert(
    interaction.liveFinalUrl === "https://k-apple.ru/simvol-2027-koza?ref=kept&utm_source=updated&utm_campaign=goat#details" &&
      interaction.syncedLegacyUtm === "utm_source=updated&utm_campaign=goat",
    `Final URL did not update live: ${JSON.stringify(interaction)}`,
  );
  assert(
    interaction.emptyTemplateFinalUrl === "https://k-apple.ru/simvol-2027-koza?ref=kept&utm_source=old#details",
    `Empty UTM template did not preserve the raw ad URL: ${interaction.emptyTemplateFinalUrl}`,
  );
  assert(
    interaction.liveLandingFinalUrl === "https://k-apple.ru/other?keep=2&utm_campaign=goat&utm_source=updated#next",
    `Final URL did not react to a landing URL edit: ${interaction.liveLandingFinalUrl}`,
  );
  assert(
    interaction.duplicateWarningsInitial.every((warning) => warning.includes("Яндекс не рекомендует дублировать адреса")) &&
      interaction.duplicateWarningsCleared.every((warning) => !warning) &&
      interaction.duplicateWarningsLive[1].includes("Совпадает со ссылкой 1"),
    `Live duplicate sitelink warning failed: ${JSON.stringify(interaction)}`,
  );
  assert(
    interaction.alternativeButtonFinalUrl === "https://button.example/order?src=kept&utm_source=updated&utm_campaign=goat#cta",
    `Alternative CTA URL was not assembled with campaign UTM: ${interaction.alternativeButtonFinalUrl}`,
  );
  assert(
    interaction.fallbackButtonFinalUrl === "https://k-apple.ru/simvol-2027-koza?utm_source=updated&utm_campaign=goat" &&
      interaction.packageButtonLine === `ССЫЛКА КНОПКИ: ${interaction.fallbackButtonFinalUrl}` &&
      interaction.restoredAutomaticCtaUrl === initial.selectedProductLanding,
    `Empty CTA URL did not restore the selected product landing in UI and package: ${JSON.stringify(interaction)}`,
  );
  assert(
    interaction.stateAfterCopy.headings.includes(interaction.testHeading) &&
      interaction.stateAfterCopy.texts.includes(interaction.testText) &&
      !interaction.stateAfterCopy.hasCtaUseMain &&
      interaction.stateAfterCopy.ctaUrl === "",
    "Manual heading/text values were overwritten",
  );

  const audit = {
    sourceExportedAt: exported.exportedAt,
    product_id: goatId,
    initial,
    interaction,
  };
  await writeFile(auditPath, `${JSON.stringify(audit, null, 2)}\n`);
  console.log(JSON.stringify({
    ok: true,
    sourceScreenshotPath,
    compactScreenshotPath,
    counterScreenshotPath,
    finalVerificationScreenshotPath,
    auditPath,
    audit,
  }, null, 2));
} finally {
  page.close();
  await browser.call("Target.disposeBrowserContext", { browserContextId });
  browser.close();
}
