import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const sourcePath = process.env.GURU_PROJECT_SOURCE_EXPORT ||
  "/Users/vl/Downloads/gate-4.json";
const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9342";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const goatId = "catalog-item-1786792591872-51f503";
const screenshotPath = resolve("artifacts/gate4-rsya-goat-live-preview-v469.png");
const auditPath = resolve("artifacts/gate4-rsya-live-preview-v469-audit.json");
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
const branchKey = Object.keys(source.gate4Rsya || {}).find(
  (key) => key === "catalog_item_1786792591872_51f503",
);
const sourceGroup = source.gate4Rsya?.[branchKey]?.groups?.[0];
assert(sourceGroup, "Goat RSYA group is missing from source export");
for (const field of ["jtbd", "offer", "benefit", "segment", "landing", "targetAction"])
  assert(String(sourceGroup[field] || "").trim(), `Goat group.${field} is empty`);

const fixture = {
  project: {
    catalogItemsV189: source.project.catalogItemsV189,
    productRegistryV185: source.project.productRegistryV185,
    productBindingsV185: source.project.productBindingsV185,
    gate0ScopedValuesV194: source.project.gate0ScopedValuesV194,
  },
  sharedEvidence: source.sharedEvidence || {},
  search: source.gate4SearchBuild?.[branchKey] || null,
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
    window.__g4RsyaSmokeErrors = [];
    const originalError = console.error.bind(console);
    console.error = (...args) => {
      window.__g4RsyaSmokeErrors.push(args.map((value) => {
        try { return typeof value === "string" ? value : JSON.stringify(value); }
        catch (_error) { return String(value); }
      }).join(" "));
      originalError(...args);
    };
    window.addEventListener("error", (event) => {
      window.__g4RsyaSmokeErrors.push(event.message || "Window error");
    });
    window.addEventListener("unhandledrejection", (event) => {
      window.__g4RsyaSmokeErrors.push(String(event.reason || "Unhandled rejection"));
    });
  })()`,
});
await page.call("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1400,
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
    'document.readyState === "complete" && typeof g4RsyaAdsHtmlV289 === "function" && typeof g4RsyaAdPromptDataV451 === "function"',
  );
  const audit = await evaluate(`(async () => {
    state = createFreshWorkspace({ id: "rsya-ad-prompt-v451-smoke", name: "RSYA ad prompt smoke" });
    activeProjectId = "rsya-ad-prompt-v451-smoke";
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};
    const fixture = ${JSON.stringify(fixture)};
    Object.assign(state.project, structuredClone(fixture.project));
    state.sharedEvidence = structuredClone(fixture.sharedEvidence);
    const key = normalizeAspectKey(${JSON.stringify(goatId)});
    state.gate4Rsya = { [key]: structuredClone(fixture.branch) };
    if (fixture.search) state.gate4SearchBuild = { [key]: structuredClone(fixture.search) };
    const d = ensureGate4RsyaV289(${JSON.stringify(goatId)});
    let group = d.groups[0];
    let ad = group.ads[0];
    const visualAssetData = (label, color, width, height) =>
      'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '">' +
        '<rect width="100%" height="100%" fill="' + color + '"/>' +
        '<circle cx="50%" cy="43%" r="18%" fill="#f5ead8"/>' +
        '<text x="50%" y="78%" text-anchor="middle" font-family="Arial" font-size="' + Math.round(Math.min(width, height) * .08) + '" fill="#302a24">' + label + '</text>' +
        '</svg>',
      );
    const projectPhotos = [
      {
        id: 'goat-project-standard-v465',
        name: 'Коза · стандарт 1×1.png',
        dataUrl: visualAssetData('Коза · 1:1', '#7b927c', 1200, 1200),
        type: 'image/png', size: 240000, width: 1200, height: 1200,
      },
      {
        id: 'goat-project-wide-v465',
        name: 'Коза · широкий 16×9.png',
        dataUrl: visualAssetData('Коза · 16:9', '#8e745f', 1600, 900),
        type: 'image/png', size: 280000, width: 1600, height: 900,
      },
    ];
    const projectOptions = g4RsyaProjectOptionsV289;
    g4RsyaProjectOptionsV289 = (...args) => ({
      ...projectOptions(...args),
      projectPhotos,
    });
    ad.images = projectPhotos.map((photo) => ({
      ...structuredClone(photo),
      id: 'rsya-' + photo.id,
      sourceId: photo.id,
      source: 'Файл проекта · Карточка товара',
    }));
    ad.images.push({
      id: 'rsya-live-portrait-v469',
      name: 'Коза · портрет 3×4.png',
      url: visualAssetData('Коза · 3:4', '#657d6a', 900, 1200),
      type: 'image/png', size: 190000, width: 900, height: 1200,
    });
    ad.landing = 'https://k-apple.ru/simvol-2027-koza';
    ad.headings = [
      { id: 'rsya-heading-goat-1-v473', value: 'Подарок к Новому году, который останется в доме' },
      { id: 'rsya-heading-goat-2-v473', value: 'Коза 2027 ручной работы для особенного подарка' },
      { id: 'rsya-heading-goat-3-v473', value: 'Авторский подарок к Новому году для близких' },
      { id: 'rsya-heading-goat-4-v473', value: 'Символ 2027 года для тёплого новогоднего подарка' },
      { id: 'rsya-heading-goat-5-v473', value: 'Подарок с душой к Новому году и для домашнего уюта' },
      { id: 'rsya-heading-goat-6-v473', value: 'Выберите Козу 2027 для близкого человека' },
    ];
    ad.texts = [
      { id: 'rsya-text-goat-1-v473', value: 'Авторская текстильная Коза — тёплый подарок с характером.' },
      { id: 'rsya-text-goat-2-v473', value: 'Подарок к Новому году, который останется частью домашнего уюта.' },
      { id: 'rsya-text-goat-3-v473', value: 'Выберите Козу 2027 ручной работы для близкого человека.' },
    ];
    const hiddenAdSentinels = {
      name: "Служебное имя объявления Козы",
      displayLink: "koza-2027",
      imageBrief: "Сохранённое ручное задание на изображение",
      videos: [{ id: "saved-video-v464", name: "Сохранённое видео", url: "https://example.com/koza.mp4" }],
    };
    Object.assign(ad, structuredClone(hiddenAdSentinels));
    const before = {
      headings: structuredClone(ad.headings),
      texts: structuredClone(ad.texts),
    };
    const channel = {
      key: "yandex-rsya", launchType: "media", channel: "Яндекс Директ",
      platform: "РСЯ", type: "Сети", status: "active", materials: "баннеры",
    };
    const common = {
      decision: "launch", campaignName: "РСЯ · Коза",
      budget: "30000", utm: "utm_source=yandex&utm_medium=cpc",
    };
    const host = document.createElement("main");
    host.style.cssText = "max-width:1180px;margin:0 auto;padding:24px;background:#fff";
    document.body.replaceChildren(host);
    document.body.style.cssText = "display:block;background:#f7f7f4;margin:0";
    const render = () => {
      host.innerHTML = '<h2 style="margin:0 0 16px">Символ 2027 года «Коза»</h2>' +
        g4RsyaAdsHtmlV289(${JSON.stringify(goatId)}, channel.key, common, d, {
          group: d.groups[0], index: 0, nested: true,
        });
    };
    render();
    let card = host.querySelector('[data-g4rsya-v289-ad-card]');
    let promptCard = card.querySelector('[data-g4rsya-v451-ad-prompt-card]');
    let field = promptCard.querySelector('[data-g4rsya-v451-ad-prompt]');
    let button = promptCard.querySelector('[data-g4rsya-v451-copy-ad-prompt]');
    const headingBlock = card.querySelector('.g4-rsya-variants-v289');
    const textBlock = card.querySelectorAll('.g4-rsya-variants-v289')[1];
    const headingInput = card.querySelector('[data-g4rsya-v289-store="heading"]');
    const textInput = card.querySelector('[data-g4rsya-v289-store="text"]');
    const copyColumns = card.querySelector('.g4-rsya-copy-columns-v469');
    const initialPreviewVariants = [...card.querySelectorAll(
      '[data-g4rsya-v473-preview-variant]',
    )];
    const initialPreviewCards = [...card.querySelectorAll('[data-g4rsya-v469-preview-format]')];
    const initialPreviewExpectedSources = initialPreviewVariants.flatMap(() =>
      G4_RSYA_IMAGE_FORMATS_V465.map((format) =>
        g4RsyaImageForFormatV465(ad.images, format)?.dataUrl ||
          g4RsyaImageForFormatV465(ad.images, format)?.url || '',
      ),
    );
    const initialPreviewScroll = card.querySelector('[data-g4rsya-v473-preview-scroll]');
    const initialPreviewScrollMax = Math.max(
      0,
      initialPreviewScroll.scrollWidth - initialPreviewScroll.clientWidth,
    );
    initialPreviewScroll.scrollLeft = initialPreviewScrollMax;
    await new Promise((done) => requestAnimationFrame(done));
    const initialPreviewScrollMoved = initialPreviewScroll.scrollLeft > 0;
    initialPreviewScroll.scrollLeft = 0;
    const prompt = field.value;
    const liveFoundation = g4RsyaGroupFoundationV455(${JSON.stringify(goatId)}, group);
    button.click();
    await new Promise((done) => setTimeout(done, 120));
    const copied = await navigator.clipboard.readText();
    const ready = {
      prompt,
      copied,
      copyLabel: button.textContent.trim(),
      readonly: field.readOnly,
      oneBlockPerAd: card.querySelectorAll('[data-g4rsya-v451-ad-prompt-card]').length,
      beforeHeadings: Boolean(promptCard.compareDocumentPosition(headingBlock) & Node.DOCUMENT_POSITION_FOLLOWING),
      beforeTexts: Boolean(promptCard.compareDocumentPosition(textBlock) & Node.DOCUMENT_POSITION_FOLLOWING),
      headingEditable: !headingInput.readOnly && headingInput.hasAttribute('data-g4rsya-v289-bind'),
      textEditable: !textInput.readOnly && textInput.hasAttribute('data-g4rsya-v289-bind'),
      compactColumns: {
        count: getComputedStyle(copyColumns).gridTemplateColumns.split(' ').filter(Boolean).length,
        aligned: Math.abs(headingBlock.getBoundingClientRect().top - textBlock.getBoundingClientRect().top) < 2,
        separated: textBlock.getBoundingClientRect().left > headingBlock.getBoundingClientRect().left,
      },
      variantControls: {
        rows: card.querySelectorAll(
          '.g4-rsya-copy-columns-v469 .g4-rsya-variant-row-v289',
        ).length,
        copyIcons: card.querySelectorAll(
          '.g4-rsya-copy-columns-v469 [data-g4rsya-v472-icon-copy]',
        ).length,
        textCopyButtons: [...card.querySelectorAll(
          '.g4-rsya-copy-columns-v469 [data-g4rsya-v472-icon-copy]',
        )].filter((node) => node.textContent.includes('Копировать')).length,
        actionsBeforeFields: [...card.querySelectorAll(
          '.g4-rsya-copy-columns-v469 .g4-rsya-variant-row-v289',
        )].every((row) => {
          const actions = row.querySelector('.g4-rsya-variant-actions-v472');
          const field = row.querySelector('.g4-rsya-field-v289');
          return actions && field && Boolean(
            actions.compareDocumentPosition(field) & Node.DOCUMENT_POSITION_FOLLOWING,
          );
        }),
      },
      sectionOrder: [...card.querySelectorAll(':scope > [data-g4rsya-v464-ad-section]')]
        .map((section) => section.dataset.g4rsyaV464AdSection),
      landingFields: card.querySelectorAll(
        '[data-g4rsya-v289-store="ad"][data-g4rsya-v289-field="landing"]',
      ).length,
      removedFields: card.querySelectorAll(
        '[data-g4rsya-v289-store="ad"][data-g4rsya-v289-field="name"], ' +
        '[data-g4rsya-v289-store="ad"][data-g4rsya-v289-field="displayLink"], ' +
        '[data-g4rsya-v289-store="ad"][data-g4rsya-v289-field="imageBrief"]',
      ).length,
      videoControls: card.querySelectorAll(
        '[data-g4rsya-v289-video-input], [data-g4rsya-v289-add-video-link], ' +
        '[data-g4rsya-v289-remove-video], [data-g4rsya-v289-store="video"]',
      ).length,
      imageControls: card.querySelectorAll(
        '[data-g4rsya-v289-image-input], [data-g4rsya-v289-add-image-link]',
      ).length,
      imageSection: {
        counter: card.querySelector('.g4-rsya-media-head-v289 > strong')?.textContent.trim() || '',
        order: [...card.querySelector('.g4-rsya-media-v289').children]
          .map((node) => node.matches('.g4-rsya-media-head-v289')
            ? 'controls'
            : node.matches('[data-g4rsya-v471-image-gallery]')
              ? 'gallery'
                : '')
          .filter(Boolean),
        galleries: card.querySelectorAll('[data-g4rsya-v471-image-gallery]').length,
        legacyFileLists: card.querySelectorAll('.g4-rsya-file-list-v289').length,
        files: [...card.querySelectorAll('.g4-rsya-file-v289')].map((node) => ({
          previewChoice: Boolean(node.querySelector(
            '[data-g4rsya-v470-select-preview-image]',
          )),
          actions: [...node.querySelectorAll(
            '.g4-rsya-file-actions-v289 > a, .g4-rsya-file-actions-v289 > label, ' +
            '.g4-rsya-file-actions-v289 > button',
          )].map((action) => action.textContent.trim()),
          technicalStatus: Boolean(node.querySelector(
            '.g4-rsya-ok-v289, .g4-rsya-error-v289',
          )),
        })),
      },
      previews: card.querySelectorAll('.g4-rsya-preview-v289').length,
      header: card.querySelector('.g4-rsya-ad-head-v289 strong')?.textContent.trim() || '',
      legacyImageFormats: card.querySelectorAll(
        '[data-g4rsya-v465-image-formats], [data-g4rsya-v465-format], ' +
        '[data-g4rsya-v465-source-family]',
      ).length,
      projectPhotoPicker: {
        count: card.querySelectorAll('[data-g4rsya-v289-add-project-image]').length,
        tag: card.querySelector('[data-g4rsya-v471-image-gallery]')?.tagName || '',
        sourceCards: card.querySelectorAll('[data-g4rsya-v471-project-source]').length,
      },
      imageValidation: {
        standard: g4RsyaImageIssuesV289(ad.images[0]),
        wide: g4RsyaImageIssuesV289(ad.images[1]),
        unsupported: g4RsyaImageIssuesV289({
          name: 'invalid.png', type: 'image/png', size: 1000,
          width: 1400, height: 600, url: 'https://example.com/invalid.png',
        }),
      },
      preview: {
        count: initialPreviewCards.length,
        variants: initialPreviewVariants.length,
        order: initialPreviewCards.map((node) => node.dataset.g4rsyaV469PreviewFormat),
        vertical: initialPreviewVariants.every((column) => {
          const tops = [...column.querySelectorAll('[data-g4rsya-v469-preview-format]')]
            .map((node) => node.getBoundingClientRect().top);
          return tops.every((top, index) => !index || top > tops[index - 1]);
        }),
        horizontal: initialPreviewScroll.scrollWidth > initialPreviewScroll.clientWidth,
        horizontalScrollMoved: initialPreviewScrollMoved,
        pairs: initialPreviewVariants.map((column) =>
          column.querySelector('.g4-rsya-ad-preview-variant-head-v473 small')?.textContent.trim()),
        columnHeadings: initialPreviewVariants.map((column) =>
          column.querySelector('[data-g4rsya-v469-preview-heading]')?.textContent.trim()),
        columnTexts: initialPreviewVariants.map((column) =>
          column.querySelector('[data-g4rsya-v469-preview-text]')?.textContent.trim()),
        imagesReuseFormatSelection: initialPreviewCards.every((node, index) =>
          node.querySelector('img')?.getAttribute('src') === initialPreviewExpectedSources[index]),
        headings: initialPreviewCards.map((node) =>
          node.querySelector('[data-g4rsya-v469-preview-heading]')?.textContent.trim()),
        texts: initialPreviewCards.map((node) =>
          node.querySelector('[data-g4rsya-v469-preview-text]')?.textContent.trim()),
        domains: initialPreviewCards.map((node) =>
          node.querySelector('[data-g4rsya-v469-preview-domain]')?.textContent.trim()),
        adLabels: initialPreviewCards.map((node) =>
          node.querySelector('.g4-rsya-ad-preview-ad-label-v469')?.textContent.trim()),
        disclaimer: card.querySelector('.g4-rsya-ad-preview-disclaimer-v469')?.textContent.trim() || '',
      },
      sources: Object.fromEntries(["jtbd", "offer", "benefit", "segment", "landing", "targetAction"]
        .map((name) => [name, liveFoundation[name]])),
    };
    const cardBeforeVariantActions = card;
    const previewBeforeTyping = card.querySelector('[data-g4rsya-v469-ad-preview]');
    const previewSignatureBefore = previewBeforeTyping.dataset.g4rsyaV473VariantSignature;
    const originalRenderGate = renderGate;
    let renderGateCalls = 0;
    renderGate = function (...args) {
      renderGateCalls += 1;
      return originalRenderGate.apply(this, args);
    };
    const headingsBeforeAdd = ad.headings.length;
    const addStartedAt = performance.now();
    card.querySelector('[data-g4rsya-v289-add-variant="heading"]').click();
    const addDurationMs = performance.now() - addStartedAt;
    const previewAfterAdd = card.querySelector(
      '[data-g4rsya-v469-ad-preview]',
    );
    const previewSignatureAfterAdd = previewAfterAdd.dataset.g4rsyaV473VariantSignature;
    ({ group, ad } = g4RsyaFindV289(${JSON.stringify(goatId)}, group.id, ad.id));
    const expectedSignatureAfterAdd = g4RsyaAdPreviewVariantsV473(ad).signature;
    await new Promise((done) => setTimeout(done, 0));
    const addedHeading = ad.headings.at(-1);
    const addedRemove = card.querySelector(
      '[data-g4rsya-v289-remove-variant="heading"][data-g4rsya-v289-item-id="' +
        CSS.escape(addedHeading.id) + '"]',
    );
    addedRemove.click();
    const previewAfterRemove = card.querySelector(
      '[data-g4rsya-v469-ad-preview]',
    );
    const previewSignatureAfterRemove = previewAfterRemove.dataset.g4rsyaV473VariantSignature;
    ({ group, ad } = g4RsyaFindV289(${JSON.stringify(goatId)}, group.id, ad.id));
    const expectedSignatureAfterRemove = g4RsyaAdPreviewVariantsV473(ad).signature;
    const typingInput = card.querySelector('[data-g4rsya-v289-store="heading"]');
    const originalTypingValue = typingInput.value;
    const typingStartedAt = performance.now();
    for (let index = 0; index < 30; index += 1) {
      typingInput.value = 'Быстрый ввод ' + index;
      typingInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    typingInput.value = originalTypingValue;
    typingInput.dispatchEvent(new Event('input', { bubbles: true }));
    const typingDurationMs = performance.now() - typingStartedAt;
    renderGate = originalRenderGate;
    const variantPerformance = {
      addDurationMs,
      typingDurationMs,
      previewSignatures: {
        before: previewSignatureBefore,
        afterAdd: previewSignatureAfterAdd,
        expectedAfterAdd: expectedSignatureAfterAdd,
        afterRemove: previewSignatureAfterRemove,
        expectedAfterRemove: expectedSignatureAfterRemove,
      },
      addDidNotRebuildCard: card === cardBeforeVariantActions,
      addDidNotRebuildPreview: previewAfterAdd === previewBeforeTyping,
      removeDidNotRebuildPreview: previewAfterRemove === previewAfterAdd,
      typingDidNotRebuildPreview: card.querySelector(
        '[data-g4rsya-v469-ad-preview]',
      ) === previewAfterRemove,
      renderGateCalls,
      rowCountRestored: ad.headings.length === headingsBeforeAdd,
      inputStayedConnected: typingInput.isConnected,
    };
    group = d.groups[0];
    ad = group.ads[0];
    render();
    card = host.querySelector('[data-g4rsya-v289-ad-card]');
    const selectedSource = ad.images[1].dataUrl || ad.images[1].url;
    const selectedButton = [...card.querySelectorAll(
      '[data-g4rsya-v470-select-preview-image]',
    )].find((node) => node.dataset.g4rsyaV470SelectPreviewImage === ad.images[1].id);
    selectedButton.click();
    await Promise.resolve();
    group = d.groups[0];
    ad = group.ads[0];
    const selectedPreviewCards = [...card.querySelectorAll(
      '[data-g4rsya-v469-preview-format]',
    )];
    const clonedWithSelection = g4RsyaCloneAdV289(ad);
    const selectedImagePreview = {
      selectedIdStored: ad.previewImageId === ad.images[1].id,
      previewIdExposed: card.querySelector('[data-g4rsya-v469-ad-preview]')
        ?.dataset.g4rsyaV470PreviewImageId === ad.images[1].id,
      allFormatsUseClickedImage: selectedPreviewCards.every((node) =>
        node.querySelector('img')?.getAttribute('src') === selectedSource),
      selectedFileCount: card.querySelectorAll(
        '.g4-rsya-file-v289.is-preview-selected ' +
        '[data-g4rsya-v470-select-preview-image][aria-pressed="true"]',
      ).length,
      selectedProjectSourceCount: card.querySelectorAll(
        '[data-g4rsya-v471-project-source].is-preview-selected ' +
        '[data-g4rsya-v470-select-preview-image][aria-pressed="true"]',
      ).length,
      badge: card.querySelector(
        '.g4-rsya-file-v289.is-preview-selected .g4-rsya-file-preview-selected-v470',
      )?.textContent.trim() || '',
      cloneKeepsMatchingImage: clonedWithSelection.previewImageId ===
        clonedWithSelection.images[1]?.id,
      normalizedKeepsSelection: g4RsyaBlankAdV289(
        structuredClone(ad),
      ).previewImageId === ad.images[1].id,
    };
    const visiblePrompt = card.querySelector('[data-g4rsya-v451-ad-prompt]');
    visiblePrompt.rows = 10;
    visiblePrompt.style.height = "260px";
    visiblePrompt.style.minHeight = "260px";
    visiblePrompt.style.maxHeight = "260px";
    visiblePrompt.scrollTop = 0;
    const after = {
      headings: structuredClone(ad.headings),
      texts: structuredClone(ad.texts),
    };
    const cardBeforeLiveEdit = card;
    const liveHeading = card.querySelector('[data-g4rsya-v289-store="heading"]');
    const liveText = card.querySelector('[data-g4rsya-v289-store="text"]');
    const liveLanding = card.querySelector(
      '[data-g4rsya-v289-store="ad"][data-g4rsya-v289-field="landing"]',
    );
    const liveImage = card.querySelector(
      '[data-g4rsya-v289-store="image"][data-g4rsya-v289-field="url"]',
    );
    const liveImageData = visualAssetData('Коза · LIVE', '#456c55', 1200, 1200);
    liveHeading.value = 'Живой заголовок Козы';
    liveHeading.dispatchEvent(new Event('input', { bubbles: true }));
    liveText.value = 'Живой текст объявления меняется без перезагрузки.';
    liveText.dispatchEvent(new Event('input', { bubbles: true }));
    liveLanding.value = 'https://promo.k-apple.ru/koza';
    liveLanding.dispatchEvent(new Event('input', { bubbles: true }));
    liveImage.value = liveImageData;
    liveImage.dispatchEvent(new Event('input', { bubbles: true }));
    const liveSelectedButton = [...card.querySelectorAll(
      '[data-g4rsya-v470-select-preview-image]',
    )].find((node) => node.dataset.g4rsyaV470SelectPreviewImage === ad.images[2].id);
    liveSelectedButton.click();
    await new Promise((done) => setTimeout(done, 60));
    group = d.groups[0];
    ad = group.ads[0];
    card = host.querySelector('[data-g4rsya-v289-ad-card]');
    const liveCards = [...card.querySelectorAll('[data-g4rsya-v469-preview-format]')];
    const liveVariants = [...card.querySelectorAll('[data-g4rsya-v473-preview-variant]')];
    const emptyHost = document.createElement('div');
    emptyHost.hidden = true;
    emptyHost.innerHTML = g4RsyaAdPreviewHtmlV469(
      ${JSON.stringify(goatId)},
      { id: 'empty-group-v469' },
      {
        id: 'empty-ad-v469', landing: '', images: [],
        headings: [{ id: 'empty-heading-v469', value: '' }],
        texts: [{ id: 'empty-text-v469', value: '' }],
      },
      '',
    );
    host.append(emptyHost);
    const emptyCards = [...emptyHost.querySelectorAll('[data-g4rsya-v469-preview-format]')];
    const livePreview = {
      adCardWasNotRebuilt: card === cardBeforeLiveEdit,
      variants: liveVariants.length,
      headings: liveVariants.map((column) =>
        column.querySelector('[data-g4rsya-v469-preview-heading]')?.textContent.trim()),
      texts: liveVariants.map((column) =>
        column.querySelector('[data-g4rsya-v469-preview-text]')?.textContent.trim()),
      formats: liveVariants.map((column) => [...column.querySelectorAll(
        '[data-g4rsya-v469-preview-format]',
      )].map((node) => node.dataset.g4rsyaV469PreviewFormat)),
      domains: liveCards.map((node) =>
        node.querySelector('[data-g4rsya-v469-preview-domain]')?.textContent.trim()),
      selectedIdStored: ad.previewImageId === ad.images[2].id,
      allFormatsUseSelectedImage: liveCards.every((node) =>
        node.querySelector('img')?.getAttribute('src') === liveImageData),
      selectedFileCount: card.querySelectorAll(
        '.g4-rsya-file-v289.is-preview-selected ' +
        '[data-g4rsya-v470-select-preview-image][aria-pressed="true"]',
      ).length,
      emptyCards: emptyCards.length,
      emptyImages: emptyCards.filter((node) =>
        node.querySelector('.g4-rsya-ad-preview-image-empty-v469')).length,
      emptyHeadings: emptyCards.filter((node) =>
        node.querySelector('[data-g4rsya-v469-preview-heading]')?.classList.contains('is-placeholder')).length,
      emptyTexts: emptyCards.filter((node) =>
        node.querySelector('[data-g4rsya-v469-preview-text]')?.classList.contains('is-placeholder')).length,
    };
    const multiUploadInput = card.querySelector(
      '.g4-rsya-media-head-v289 [data-g4rsya-v289-image-input]',
    );
    const originalRenderGateForUpload = renderGate;
    const originalAlertForUpload = window.alert;
    const uploadAlerts = [];
    renderGate = render;
    window.alert = (message) => uploadAlerts.push(String(message));
    const uploadTransfer = new DataTransfer();
    let firstUploadBlob = null;
    for (let index = 1; index <= 3; index += 1) {
      const canvas = document.createElement('canvas');
      canvas.width = 500;
      canvas.height = 500;
      const context = canvas.getContext('2d');
      context.fillStyle = ['#755b45', '#4b6f62', '#75556c'][index - 1];
      context.fillRect(0, 0, 500, 500);
      context.fillStyle = '#f7f3ea';
      context.fillRect(index * 90, 40, 55, 420);
      const blob = await new Promise((done) => canvas.toBlob(done, 'image/png'));
      if (index === 1) firstUploadBlob = blob;
      uploadTransfer.items.add(new File(
        [blob],
        'koza-batch-' + index + '.png',
        { type: 'image/png' },
      ));
    }
    multiUploadInput.files = uploadTransfer.files;
    multiUploadInput.dispatchEvent(new Event('change', { bubbles: true }));
    // Let the async fingerprinting finish before g4RsyaFindV289 normalizes
    // the state into fresh objects during polling.
    await new Promise((done) => setTimeout(done, 800));
    for (let attempt = 0; attempt < 30; attempt += 1) {
      await new Promise((done) => setTimeout(done, 30));
      const current = g4RsyaFindV289(${JSON.stringify(goatId)}, group.id, ad.id).ad;
      if (current?.images?.length === 6) break;
    }
    const duplicateInput = host.querySelector(
      '.g4-rsya-media-head-v289 [data-g4rsya-v289-image-input]',
    );
    const duplicateTransfer = new DataTransfer();
    duplicateTransfer.items.add(new File(
      [firstUploadBlob],
      'koza-batch-duplicate-name.png',
      { type: 'image/png' },
    ));
    duplicateInput.files = duplicateTransfer.files;
    duplicateInput.dispatchEvent(new Event('change', { bubbles: true }));
    for (let attempt = 0; attempt < 30 && !uploadAlerts.length; attempt += 1)
      await new Promise((done) => setTimeout(done, 30));
    ({ group, ad } = g4RsyaFindV289(${JSON.stringify(goatId)}, group.id, ad.id));
    card = host.querySelector('[data-g4rsya-v289-ad-card]');
    const multiImageUpload = {
      supportsMultiple: multiUploadInput.multiple,
      replacementStaysSingle: [...card.querySelectorAll(
        '[data-g4rsya-v289-image-input][data-g4rsya-v289-replace-id]',
      )].every((input) => !input.multiple),
      imageCount: ad.images.length,
      addedNames: ad.images.map((image) => image.name).filter((name) =>
        name.startsWith('koza-batch-')),
      counter: card.querySelector('.g4-rsya-media-head-v289 > strong')
        ?.textContent.trim() || '',
      duplicateNotice: uploadAlerts.join('\\n'),
      selectedIdPreserved: ad.previewImageId === ad.images[2].id,
    };
    renderGate = originalRenderGateForUpload;
    window.alert = originalAlertForUpload;
    return {
      sourceExportedAt: ${JSON.stringify(exported.exportedAt)},
      product_id: ${JSON.stringify(goatId)},
      ready,
      fieldsUnchanged: JSON.stringify(before) === JSON.stringify(after),
      selectedImagePreview,
      variantPerformance,
      livePreview,
      multiImageUpload,
      hiddenAdStored: {
        name: ad.name,
        displayLink: ad.displayLink,
        imageBrief: ad.imageBrief,
        videos: structuredClone(ad.videos),
      },
      hiddenAdSentinels,
      browserErrors: [...(window.__g4RsyaSmokeErrors || [])],
      build: window.GURU_BUILD_INFO?.version,
    };
  })()`);

  const { prompt, sources } = audit.ready;
  assert(audit.build === "2.3.236", `Unexpected build: ${audit.build}`);
  assert(audit.ready.readonly, "Prompt field is editable");
  assert(audit.ready.copied === prompt, "Clipboard does not contain the full prompt");
  assert(audit.ready.copyLabel === "Скопировано", "Copy button did not confirm success");
  assert(audit.ready.oneBlockPerAd === 1, "Prompt block count is wrong");
  assert(audit.ready.beforeHeadings && audit.ready.beforeTexts, "Prompt is not above heading/text fields");
  assert(audit.ready.headingEditable && audit.ready.textEditable, "Manual ad fields became read-only");
  assert(audit.ready.compactColumns.count === 2 &&
    audit.ready.compactColumns.aligned && audit.ready.compactColumns.separated,
  `Heading/text inputs are not a two-column layout: ${JSON.stringify(audit.ready.compactColumns)}`);
  assert(audit.ready.variantControls.rows === 9 &&
    audit.ready.variantControls.copyIcons === 9 &&
    audit.ready.variantControls.textCopyButtons === 0 &&
    audit.ready.variantControls.actionsBeforeFields,
  `Variant actions are not icon-only or are positioned after the fields: ${JSON.stringify(audit.ready.variantControls)}`);
  assert(JSON.stringify(audit.ready.sectionOrder) ===
    JSON.stringify(["landing", "prompt", "copy", "images", "preview"]),
  `Ad sections are missing or reordered: ${JSON.stringify(audit.ready.sectionOrder)}`);
  assert(audit.ready.landingFields === 1 && audit.ready.removedFields === 0 &&
    audit.ready.videoControls === 0 && audit.ready.previews === 0 &&
    audit.ready.imageControls >= 2,
  "Removed ad UI is still rendered");
  assert(audit.ready.header === "Объявление 1" &&
    !audit.ready.header.includes(audit.hiddenAdSentinels.name),
  "The hidden internal name still leaks into the ad header");
  assert(JSON.stringify(audit.hiddenAdStored) === JSON.stringify(audit.hiddenAdSentinels),
    "Hidden ad values were changed while their controls were removed");
  assert(audit.ready.legacyImageFormats === 0,
    "Legacy base-format gallery is still rendered in the Images section");
  assert(audit.ready.imageSection.counter === "Изображения · 3" &&
    JSON.stringify(audit.ready.imageSection.order) ===
      JSON.stringify(["controls", "gallery"]) &&
    audit.ready.imageSection.galleries === 1 &&
    audit.ready.imageSection.legacyFileLists === 0 &&
    audit.ready.imageSection.files.length === 3 &&
    audit.ready.imageSection.files.every((file) =>
      file.previewChoice &&
      JSON.stringify(file.actions) ===
        JSON.stringify(["Удалить", "Заменить"]) &&
      file.technicalStatus),
  `Images section order, file actions or technical status is wrong: ${JSON.stringify(audit.ready.imageSection)}`);
  assert(audit.ready.projectPhotoPicker.count === 0 &&
    audit.ready.projectPhotoPicker.tag === "SECTION" &&
    audit.ready.projectPhotoPicker.sourceCards === 2,
  "Project photos are duplicated instead of being represented once in the gallery");
  assert(audit.ready.imageValidation.standard.length === 0 &&
    audit.ready.imageValidation.wide.length === 0 &&
    audit.ready.imageValidation.unsupported.some((message) =>
      message.includes("пропорция")),
  "Official image proportions are not validated correctly");
  const expectedFormatOrder = Array.from({ length: 6 }, () =>
    ["1:1", "4:3", "3:4", "16:9"]).flat();
  assert(audit.ready.preview.count === 24 &&
    audit.ready.preview.variants === 6 &&
    JSON.stringify(audit.ready.preview.order) === JSON.stringify(expectedFormatOrder) &&
    audit.ready.preview.vertical &&
    audit.ready.preview.horizontal &&
    audit.ready.preview.horizontalScrollMoved,
  `Preview cards are missing or reordered: ${JSON.stringify(audit.ready.preview)}`);
  assert(JSON.stringify(audit.ready.preview.pairs) === JSON.stringify([
    "Заголовок 1 + Текст 1",
    "Заголовок 2 + Текст 2",
    "Заголовок 3 + Текст 3",
    "Заголовок 4 + Текст 1",
    "Заголовок 5 + Текст 2",
    "Заголовок 6 + Текст 3",
  ]),
  `Preview copy variants are paired incorrectly: ${JSON.stringify(audit.ready.preview.pairs)}`);
  assert(audit.ready.preview.imagesReuseFormatSelection,
    "Preview does not reuse the shared four-format crop selection");
  assert(audit.selectedImagePreview.selectedIdStored &&
    audit.selectedImagePreview.previewIdExposed &&
    audit.selectedImagePreview.allFormatsUseClickedImage &&
    audit.selectedImagePreview.selectedFileCount === 1 &&
    audit.selectedImagePreview.selectedProjectSourceCount === 1 &&
    audit.selectedImagePreview.badge === "В предпросмотре" &&
    audit.selectedImagePreview.cloneKeepsMatchingImage &&
    audit.selectedImagePreview.normalizedKeepsSelection,
  `Clicked image was not selected for all preview formats: ${JSON.stringify(audit.selectedImagePreview)}`);
  assert(audit.variantPerformance.addDidNotRebuildCard &&
    audit.variantPerformance.addDidNotRebuildPreview &&
    audit.variantPerformance.removeDidNotRebuildPreview &&
    audit.variantPerformance.typingDidNotRebuildPreview &&
    audit.variantPerformance.renderGateCalls === 0 &&
    audit.variantPerformance.rowCountRestored &&
    audit.variantPerformance.inputStayedConnected &&
    audit.variantPerformance.addDurationMs < 150 &&
    audit.variantPerformance.typingDurationMs < 250,
  `Variant editing still triggers a broad or slow render: ${JSON.stringify(audit.variantPerformance)}`);
  assert(JSON.stringify(audit.ready.preview.columnHeadings) === JSON.stringify([
    "Подарок к Новому году, который останется в доме",
    "Коза 2027 ручной работы для особенного подарка",
    "Авторский подарок к Новому году для близких",
    "Символ 2027 года для тёплого новогоднего подарка",
    "Подарок с душой к Новому году и для домашнего уюта",
    "Выберите Козу 2027 для близкого человека",
  ]) &&
    JSON.stringify(audit.ready.preview.columnTexts) === JSON.stringify([
      "Авторская текстильная Коза — тёплый подарок с характером.",
      "Подарок к Новому году, который останется частью домашнего уюта.",
      "Выберите Козу 2027 ручной работы для близкого человека.",
      "Авторская текстильная Коза — тёплый подарок с характером.",
      "Подарок к Новому году, который останется частью домашнего уюта.",
      "Выберите Козу 2027 ручной работы для близкого человека.",
    ]) &&
    audit.ready.preview.domains.every((value) => value === "k-apple.ru") &&
    audit.ready.preview.adLabels.every((value) => value === "Реклама"),
  "Preview does not render all paired copy variants, domain or ad label");
  assert(audit.ready.preview.disclaimer ===
    "Это пример, а не обещание точного вида рекламы: Директ и площадка могут выбрать другую комбинацию.",
  "Preview disclaimer changed");
  assert(audit.livePreview.adCardWasNotRebuilt &&
    audit.livePreview.variants === 6 &&
    JSON.stringify(audit.livePreview.headings) === JSON.stringify([
      "Живой заголовок Козы",
      "Коза 2027 ручной работы для особенного подарка",
      "Авторский подарок к Новому году для близких",
      "Символ 2027 года для тёплого новогоднего подарка",
      "Подарок с душой к Новому году и для домашнего уюта",
      "Выберите Козу 2027 для близкого человека",
    ]) &&
    JSON.stringify(audit.livePreview.texts) === JSON.stringify([
      "Живой текст объявления меняется без перезагрузки.",
      "Подарок к Новому году, который останется частью домашнего уюта.",
      "Выберите Козу 2027 ручной работы для близкого человека.",
      "Живой текст объявления меняется без перезагрузки.",
      "Подарок к Новому году, который останется частью домашнего уюта.",
      "Выберите Козу 2027 ручной работы для близкого человека.",
    ]) &&
    audit.livePreview.formats.every((formats) =>
      JSON.stringify(formats) === JSON.stringify(["1:1", "4:3", "3:4", "16:9"])) &&
    audit.livePreview.domains.every((value) => value === "promo.k-apple.ru") &&
    audit.livePreview.selectedIdStored &&
    audit.livePreview.allFormatsUseSelectedImage &&
    audit.livePreview.selectedFileCount === 1,
  `Live preview did not update in place: ${JSON.stringify(audit.livePreview)}`);
  assert(audit.livePreview.emptyCards === 4 &&
    audit.livePreview.emptyImages === 4 &&
    audit.livePreview.emptyHeadings === 4 &&
    audit.livePreview.emptyTexts === 4,
  `Preview empty state is incomplete: ${JSON.stringify(audit.livePreview)}`);
  assert(audit.multiImageUpload.supportsMultiple &&
    audit.multiImageUpload.replacementStaysSingle &&
    audit.multiImageUpload.imageCount === 6 &&
    JSON.stringify(audit.multiImageUpload.addedNames) ===
      JSON.stringify(['koza-batch-1.png', 'koza-batch-2.png', 'koza-batch-3.png']) &&
    audit.multiImageUpload.counter === 'Изображения · 6' &&
    audit.multiImageUpload.duplicateNotice.includes('повторная загрузка пропущена') &&
    audit.multiImageUpload.duplicateNotice.includes('koza-batch-duplicate-name.png') &&
    audit.multiImageUpload.selectedIdPreserved,
  `Multiple image upload is broken: ${JSON.stringify(audit.multiImageUpload)}`);
  assert(audit.fieldsUnchanged, "Prompt interaction changed headings[] or texts[]");
  assert(audit.browserErrors.length === 0,
    `Browser errors detected: ${JSON.stringify(audit.browserErrors)}`);
  for (const [field, value] of Object.entries(sources))
    assert(prompt.includes(value), `Prompt does not contain group.${field}`);
  assert(prompt.includes("Сегмент аудитории:"), "Audience segment is not used");
  assert(!prompt.includes("Ключевые фразы группы:"), "Search keyword list leaked into RSYA prompt");
  assert(!prompt.includes("[фразы группы не выбраны]"), "Search keyword placeholder leaked into RSYA prompt");
  assert(prompt.includes("до 7 вариантов заголовков"), "Heading pool limit is missing");
  assert(prompt.includes("до 3 вариантов текста объявления"), "Text pool limit is missing");
  assert(prompt.includes("до 56 знаков, слово не более 22 знаков"), "Heading limits are wrong");
  assert(prompt.includes("до 81 знака, слово не более 23 знаков"), "Text limits are wrong");
  await wait(200);
  const screenshot = await page.call("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: true,
  });
  await writeFile(screenshotPath, Buffer.from(screenshot.data, "base64"));
  await writeFile(auditPath, `${JSON.stringify(audit, null, 2)}\n`);
  console.log(JSON.stringify({ ok: true, screenshotPath, auditPath, audit }, null, 2));
} finally {
  page.close();
  await browser.call("Target.disposeBrowserContext", { browserContextId });
  browser.close();
}
