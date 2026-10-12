import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const sourcePath = process.env.GURU_PROJECT_SOURCE_EXPORT ||
  resolve("artifacts/gate-4-recovered-groups-v408.json");
const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9345";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3010/";
const goatId = "catalog-item-1786792591872-51f503";
const branchKey = "catalog_item_1786792591872_51f503";
const screenshotPath = resolve("artifacts/gate4-rsya-goat-group-layout-v461.png");
const auditPath = resolve("artifacts/gate4-rsya-group-layout-v461-audit.json");
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
assert(source?.gate4Rsya?.[branchKey]?.groups?.[0], "Goat RSYA group is missing");
assert(source?.gate4SearchBuild?.[branchKey]?.groupRows?.length === 3,
  "Goat Search must contain three JTBD groups");

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
const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
const pageTarget = targets.find((target) => target.id === targetId);
assert(pageTarget?.webSocketDebuggerUrl, "Could not create Chrome target");
const page = new CdpClient(pageTarget.webSocketDebuggerUrl);
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
    throw new Error(response.exceptionDetails.exception?.description ||
      response.exceptionDetails.text);
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
    'document.readyState === "complete" && typeof g4RsyaMigrateJtbdGroupsV459 === "function"',
  );
  const audit = await evaluate(`(async () => {
    state = createFreshWorkspace({
      id: "rsya-jtbd-groups-v459-smoke",
      name: "RSYA JTBD groups smoke",
    });
    activeProjectId = "rsya-jtbd-groups-v459-smoke";
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};
    const fixture = ${JSON.stringify(fixture)};
    Object.assign(state.project, structuredClone(fixture.project));
    state.sharedEvidence = structuredClone(fixture.sharedEvidence);
    const legacyRsya = structuredClone(fixture.rsya);
    legacyRsya.groups = legacyRsya.groups.slice(0, 1);
    delete legacyRsya.jtbdSchemaV459;
    delete legacyRsya.groups[0].jtbdId;
    state.gate4Rsya = { ${JSON.stringify(branchKey)}: legacyRsya };
    state.gate4SearchBuild = {
      ${JSON.stringify(branchKey)}: structuredClone(fixture.search),
    };
    delete state.project._gate4RsyaProductIdMigrationLog;
    delete state.project._gate4RsyaFoundationMigrationLog;
    delete state.project._gate4RsyaJtbdGroupsMigrationLog;
    g4RsyaMigrateGroupProductIdsV449(state);
    g4RsyaMigrateGroupFoundationV455(state);

    const d = ensureGate4RsyaV289(${JSON.stringify(goatId)});
    const hiddenAdSentinels = {
      name: "Служебное имя Козы",
      displayLink: "koza-2027",
      imageBrief: "Сохранённое ручное задание на изображение",
      videos: [{ id: "saved-video-v464", name: "Сохранённое видео", url: "https://example.com/koza.mp4" }],
    };
    Object.assign(d.groups[0].ads[0], structuredClone(hiddenAdSentinels));
    const options = g4RsyaJtbdOptionsV459(${JSON.stringify(goatId)}, d.groups[0]);
    const optionById = Object.fromEntries(options.map((row) => [row.id, row.text]));
    const rows = d.groups.map((group, index) => {
      const foundation = g4RsyaGroupFoundationV455(${JSON.stringify(goatId)}, group);
      const defaults = g4RsyaGroupGate1DefaultsV456(${JSON.stringify(goatId)}, group);
      const ad = group.ads[0];
      const adHasContent = [
        ...(ad.headings || []).map((row) => row.value),
        ...(ad.texts || []).map((row) => row.value),
        ...(ad.callouts || []).map((row) => row.value),
        ...(ad.sitelinks || []).flatMap((row) => [row.title, row.description, row.url]),
        ...(ad.images || []).flatMap((row) => [row.url, row.dataUrl]),
      ].some((value) => g4RsyaTextV289(value));
      return {
        index,
        id: group.id,
        productId: group.product_id,
        jtbdId: group.jtbdId,
        storedName: group.name,
        storedKeywords: group.keywords,
        foundationJtbd: foundation.jtbd,
        defaultName: defaults.name,
        phrases: defaults.phrases,
        adHasContent,
        adCount: group.ads.length,
        headings: ad.headings.length,
        texts: ad.texts.length,
        callouts: ad.callouts.length,
        sitelinks: ad.sitelinks.length,
        images: ad.images.length,
      };
    });

    const campaign = {
      decision: "launch",
      campaignName: "РСЯ · Коза",
      budget: "30000",
      utm: "",
    };
    const model3 = g4RsyaLaunchModelV454(${JSON.stringify(goatId)}, d);
    const twoGroups = structuredClone(d);
    const freedGroup = twoGroups.groups.pop();
    const model2 = g4RsyaLaunchModelV454(${JSON.stringify(goatId)}, twoGroups);

    const host = document.createElement("main");
    host.style.cssText = "max-width:1180px;margin:0 auto;padding:24px;background:#fff";
    document.body.replaceChildren(host);
    document.body.style.cssText = "display:block;background:#f7f7f4;margin:0";
    host.innerHTML = '<h2 style="margin:0 0 16px">Символ 2027 года «Коза» · 1 JTBD = 1 группа</h2>' +
      '<article class="g4-rsya-v289" data-g4rsya-product="' +
        escapeAttr(${JSON.stringify(goatId)}) + '" data-g4rsya-channel="yandex-rsya">' +
      g4RsyaGroupsBodyV453(${JSON.stringify(goatId)}, "yandex-rsya", campaign, d) +
      g4RsyaLaunchBodyV453(
        ${JSON.stringify(goatId)}, "yandex-rsya", campaign, d, model3,
      ) + '</article>';
    const groupsPanel = host.querySelector('[data-g4rsya-v453-panel-body="groups"]');
    const launchPanel = host.querySelector('[data-g4rsya-v453-panel-body="launch"]');
    const groupCards = [...groupsPanel.querySelectorAll(
      '[data-g4rsya-v458-group-card]',
    )];
    const collapsedCards = groupCards.filter((card) =>
      card.classList.contains('is-collapsed')).length;
    const visibleEditors = groupCards.filter((card) =>
      !card.querySelector('[data-g4rsya-v461-group-editor]')?.hidden).length;
    const summaryHeights = groupCards.map((card) => Math.round(
      card.querySelector('.g4-rsya-group-summary-v461')
        ?.getBoundingClientRect().height || 0,
    ));
    groupCards.forEach((card, index) => {
      const editor = card.querySelector('[data-g4rsya-v461-group-editor]');
      editor.innerHTML = g4RsyaGroupEditorBodyV470(
        ${JSON.stringify(goatId)},
        "yandex-rsya",
        campaign,
        d,
        d.groups[index],
        index,
      );
      editor.hidden = false;
      card.classList.remove('is-collapsed');
      card.classList.add('is-open');
    });
    const layout = {
      topLevelSections: groupsPanel.querySelectorAll(':scope > section').length,
      topLevelHeadings: [...groupsPanel.querySelectorAll(':scope > section > h4')]
        .map((node) => node.textContent.trim()),
      cardIds: groupCards.map((card) => card.dataset.g4rsyaV458GroupCard),
      launchSeparate: groupsPanel.nextElementSibling === launchPanel,
      collapsedCards,
      visibleEditors,
      expandedEditors: groupCards.filter((card) =>
        !card.querySelector('[data-g4rsya-v461-group-editor]')?.hidden).length,
      summaryHeights,
      globalCounts: {
        foundations: groupsPanel.querySelectorAll('.g4-rsya-foundation-v455').length,
        audience: groupsPanel.querySelectorAll('[data-g4rsya-v460-group-section="audience"]').length,
        interestsPrompts: groupsPanel.querySelectorAll('[data-g4rsya-v462-interests-prompt-card]').length,
        audienceAdditional: groupsPanel.querySelectorAll('[data-g4rsya-v462-audience-extra]').length,
        retargetingFields: groupsPanel.querySelectorAll('[data-g4rsya-v289-field="retargetingSegments"]').length,
        negativePhraseFields: groupsPanel.querySelectorAll('[data-g4rsya-v289-field="negativePhrases"]').length,
        adsSections: groupsPanel.querySelectorAll('[data-g4rsya-v460-group-section="ads"]').length,
        adCards: groupsPanel.querySelectorAll('[data-g4rsya-v289-ad-card]').length,
        adPrompts: groupsPanel.querySelectorAll('[data-g4rsya-v451-ad-prompt-card]').length,
        media: groupsPanel.querySelectorAll('.g4-rsya-media-v289').length,
        legacyImageFormatBoards: groupsPanel.querySelectorAll('[data-g4rsya-v465-image-formats]').length,
        legacyImageFormatCards: groupsPanel.querySelectorAll('[data-g4rsya-v465-format]').length,
        internalNameFields: groupsPanel.querySelectorAll(
          '[data-g4rsya-v289-store="ad"][data-g4rsya-v289-field="name"]',
        ).length,
        displayLinkFields: groupsPanel.querySelectorAll(
          '[data-g4rsya-v289-store="ad"][data-g4rsya-v289-field="displayLink"]',
        ).length,
        imageBriefs: groupsPanel.querySelectorAll(
          '[data-g4rsya-v289-store="ad"][data-g4rsya-v289-field="imageBrief"]',
        ).length,
        videoControls: groupsPanel.querySelectorAll(
          '[data-g4rsya-v289-video-input], [data-g4rsya-v289-add-video-link], [data-g4rsya-v289-remove-video]',
        ).length,
        previews: groupsPanel.querySelectorAll('.g4-rsya-preview-v289').length,
        adPreviews: groupsPanel.querySelectorAll('[data-g4rsya-v469-ad-preview]').length,
        previewFormatCards: groupsPanel.querySelectorAll('[data-g4rsya-v469-preview-format]').length,
        extrasSections: groupsPanel.querySelectorAll('[data-g4rsya-v460-group-section="extras"]').length,
        assetPrompts: groupsPanel.querySelectorAll('[data-g4rsya-v452-asset-prompt-card]').length,
        adExtras: groupsPanel.querySelectorAll('[data-g4rsya-v477-ad-extras]').length,
      },
      cards: groupCards.map((card, index) => {
        const group = d.groups[index];
        const referencedGroupIds = [...card.querySelectorAll(
          '[data-g4rsya-v289-group-id]',
        )].map((node) => node.dataset.g4rsyaV289GroupId).filter(Boolean);
        const adsGroup = card.querySelector('[data-g4rsya-v460-ads-group]');
        const adCards = [...(adsGroup?.querySelectorAll(
          ':scope > [data-g4rsya-v289-ad-card]',
        ) || [])];
        const addAdButton = adsGroup?.querySelector(
          ':scope > [data-g4rsya-v289-add-ad]',
        );
        return {
          id: card.dataset.g4rsyaV458GroupCard,
          title: card.querySelector('.g4-rsya-group-head-v289 strong')
            ?.textContent.trim() || '',
          order: [...card.querySelectorAll(
            '.g4-rsya-group-content-v460 > [data-g4rsya-v460-group-section]',
          )].map((node) => node.dataset.g4rsyaV460GroupSection),
          foundation: card.querySelectorAll('.g4-rsya-foundation-v455').length,
          audience: card.querySelectorAll('[data-g4rsya-v460-audience-group]').length,
          interestsPrompts: card.querySelectorAll('[data-g4rsya-v462-interests-prompt-card]').length,
          audienceAdditional: card.querySelectorAll('[data-g4rsya-v462-audience-extra]').length,
          retargetingFields: card.querySelectorAll('[data-g4rsya-v289-field="retargetingSegments"]').length,
          negativePhraseFields: card.querySelectorAll('[data-g4rsya-v289-field="negativePhrases"]').length,
          ads: card.querySelectorAll('[data-g4rsya-v289-ad-card]').length,
          adPrompts: card.querySelectorAll('[data-g4rsya-v451-ad-prompt-card]').length,
          media: card.querySelectorAll('.g4-rsya-media-v289').length,
          legacyImageFormatBoards: card.querySelectorAll('[data-g4rsya-v465-image-formats]').length,
          legacyImageFormatCards: card.querySelectorAll('[data-g4rsya-v465-format]').length,
          adSectionOrders: [...card.querySelectorAll('[data-g4rsya-v289-ad-card]')]
            .map((adCard) => [...adCard.querySelectorAll(':scope > [data-g4rsya-v464-ad-section]')]
              .map((section) => section.dataset.g4rsyaV464AdSection)),
          removedAdFields: card.querySelectorAll(
            '[data-g4rsya-v289-store="ad"][data-g4rsya-v289-field="name"], ' +
            '[data-g4rsya-v289-store="ad"][data-g4rsya-v289-field="displayLink"], ' +
            '[data-g4rsya-v289-store="ad"][data-g4rsya-v289-field="imageBrief"]',
          ).length,
          videoControls: card.querySelectorAll(
            '[data-g4rsya-v289-video-input], [data-g4rsya-v289-add-video-link], [data-g4rsya-v289-remove-video]',
          ).length,
          previews: card.querySelectorAll('.g4-rsya-preview-v289').length,
          adPreviews: card.querySelectorAll('[data-g4rsya-v469-ad-preview]').length,
          previewFormatCards: card.querySelectorAll('[data-g4rsya-v469-preview-format]').length,
          assetPrompts: card.querySelectorAll('[data-g4rsya-v452-asset-prompt-card]').length,
          adExtras: card.querySelectorAll('[data-g4rsya-v477-ad-extras]').length,
          selectedProductLanding: g4RsyaGroupFoundationV455(${JSON.stringify(goatId)}, group).landing,
          ctaUrls: [...card.querySelectorAll(
            '[data-g4rsya-v289-store="ad"][data-g4rsya-v289-field="ctaUrl"]',
          )].map((input) => input.value),
          addAdAfterLastCard: Boolean(addAdButton) &&
            addAdButton.previousElementSibling === adCards.at(-1),
          ownReferencesOnly: referencedGroupIds.every((id) => id === group.id),
        };
      }),
      legacyTopLevelHeadings: [...groupsPanel.querySelectorAll('h4')]
        .map((node) => node.textContent.trim())
        .filter((title) => [
          'Условия аудитории групп',
          'Объявления групп',
        ].includes(title)),
    };
    const addBlock = host.querySelector('.g4-rsya-add-group-v459');
    const allCovered = {
      selectDisabled: Boolean(addBlock?.querySelector('select')?.disabled),
      buttonDisabled: Boolean(addBlock?.querySelector('button')?.disabled),
      hint: addBlock?.querySelector('small')?.textContent.trim() || '',
      optionValues: [...(addBlock?.querySelectorAll('option') || [])]
        .map((option) => option.value).filter(Boolean),
    };
    const displayed = d.groups.map((group) => ({
      id: group.id,
      name: host.querySelector(
        '[data-g4rsya-v289-store="group"][data-g4rsya-v289-field="name"]' +
        '[data-g4rsya-v289-group-id="' + CSS.escape(group.id) + '"]',
      )?.value || '',
      phrases: (host.querySelector(
        '[data-g4rsya-v289-store="group"][data-g4rsya-v289-field="keywords"]' +
        '[data-g4rsya-v289-group-id="' + CSS.escape(group.id) + '"]',
      )?.value || '').split(/\\n/).map((value) => value.trim()).filter(Boolean),
    }));

    const gapHost = document.createElement('div');
    gapHost.innerHTML = g4RsyaAudienceHtmlV289(
      ${JSON.stringify(goatId)}, "yandex-rsya", twoGroups,
    );
    const gapSelect = gapHost.querySelector('[data-g4rsya-v459-jtbd-select]');
    const gapOptions = [...(gapSelect?.querySelectorAll('option') || [])]
      .map((option) => option.value).filter(Boolean);

    const removedForAdd = d.groups.pop();
    const addHost = document.createElement('div');
    document.body.append(addHost);
    const renderAdd = () => {
      addHost.innerHTML = g4RsyaAudienceHtmlV289(
        ${JSON.stringify(goatId)}, "yandex-rsya", d,
      );
    };
    renderAdd();
    const originalRenderGate = renderGate;
    renderGate = renderAdd;
    const liveSelect = addHost.querySelector('[data-g4rsya-v459-jtbd-select]');
    liveSelect.value = removedForAdd.jtbdId;
    liveSelect.dispatchEvent(new Event('change', { bubbles: true }));
    const liveButton = addHost.querySelector('[data-g4rsya-v459-add-group]');
    const enabledAfterChoice = !liveButton.disabled;
    liveButton.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
    }));
    const addedGroup = d.groups.at(-1);
    const addedAd = addedGroup.ads[0];
    const addAction = {
      enabledAfterChoice,
      count: d.groups.length,
      jtbdId: addedGroup.jtbdId,
      expectedJtbdId: removedForAdd.jtbdId,
      productId: addedGroup.product_id,
      blank: ![
        ...(addedAd.headings || []).map((row) => row.value),
        ...(addedAd.texts || []).map((row) => row.value),
        ...(addedAd.callouts || []).map((row) => row.value),
        ...(addedAd.sitelinks || []).flatMap((row) => [row.title, row.url]),
        ...(addedAd.images || []).flatMap((row) => [row.url, row.dataUrl]),
      ].some((value) => g4RsyaTextV289(value)),
      headings: addedAd.headings.length,
      texts: addedAd.texts.length,
    };
    renderGate = originalRenderGate;
    addHost.remove();

    saveState();
    await new Promise((resolve) => setTimeout(resolve, 250));
    const persisted = JSON.parse(localStorage.getItem(
      WORKSPACE_STORAGE_PREFIX + activeProjectId,
    ) || "null")?.gate4Rsya?.[${JSON.stringify(branchKey)}];
    return {
      build: window.GURU_BUILD_INFO?.version,
      optionIds: options.map((row) => row.id),
      optionById,
      rows,
      migration: state.project._gate4RsyaJtbdGroupsMigrationLog?.at(-1) || null,
      allCovered,
      gap: {
        selectDisabled: Boolean(gapSelect?.disabled),
        optionValues: gapOptions,
        freedJtbdId: freedGroup.jtbdId,
        occupiedIds: twoGroups.groups.map((group) => group.jtbdId),
      },
      addAction,
      layout,
      hiddenAdStored: {
        name: d.groups[0].ads[0].name,
        displayLink: d.groups[0].ads[0].displayLink,
        imageBrief: d.groups[0].ads[0].imageBrief,
        videos: structuredClone(d.groups[0].ads[0].videos),
      },
      hiddenAdSentinels,
      displayed,
      launch: {
        groups3: model3.groups.length,
        total3: model3.total,
        autoTotal3: model3.autoTotal,
        groups2: model2.groups.length,
        total2: model2.total,
        autoTotal2: model2.autoTotal,
        uiText: host.querySelector('[data-g4rsya-v453-panel-body="launch"]')
          ?.textContent.replace(/\\s+/g, ' ').trim() || '',
      },
      persistedJtbdIds: (persisted?.groups || []).map((group) => group.jtbdId),
      campaignStoredOnce: Boolean(d.campaign) &&
        d.groups.every((group) => group.campaign === undefined),
      repeatedEnsureCount: ensureGate4RsyaV289(${JSON.stringify(goatId)}).groups.length,
      errorOverlay: Boolean(document.querySelector(
        '[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay',
      )),
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
  assert(audit.optionIds.length === 3, "Expected exactly three source JTBDs");
  assert(audit.rows.length === 3 && audit.repeatedEnsureCount === 3,
    "Migration did not create exactly three stable groups");
  assert(new Set(audit.rows.map((row) => row.jtbdId)).size === 3,
    "Groups do not have unique jtbdId values");
  assert(audit.rows.every((row) => audit.optionIds.includes(row.jtbdId)),
    "A group jtbdId is outside the Search source list");
  assert(audit.rows[0].jtbdId === audit.optionIds[0],
    "Legacy Goat group was not assigned the primary JTBD");
  assert(audit.rows.every((row) =>
    row.foundationJtbd === audit.optionById[row.jtbdId] &&
    row.defaultName === row.foundationJtbd),
  "Foundation or automatic name is not resolved by group.jtbdId");
  assert(new Set(audit.rows.map((row) => row.foundationJtbd)).size === 3,
    "Group foundations are not distinct");
  assert(audit.rows.every((row) => row.phrases.length >= 5 && row.phrases.length <= 8),
    "Every group must receive 5–8 Gate 1 phrases");
  assert(new Set(audit.rows.map((row) => row.phrases.join("\n"))).size === 3,
    "Groups received the same phrase subset");
  assert(audit.rows.slice(1).every((row) => !row.adHasContent &&
    row.adCount === 1 && row.headings === 0 && row.texts === 0 &&
    row.callouts === 0 && row.sitelinks === 0 && row.images === 0),
  "New groups are not blank");
  assert(Boolean(audit.rows[0].productId) &&
    audit.rows.every((row) => row.productId === audit.rows[0].productId &&
    row.storedName === "" && row.storedKeywords === ""),
  "Migration copied derived text or lost product_id");
  assert(audit.migration?.groups_before === 1 &&
    audit.migration?.groups_after === 3 && audit.migration?.created?.length === 2,
  "Migration log does not describe the 1→3 transition");
  assert(audit.campaignStoredOnce, "Campaign was duplicated into groups");
  assert(audit.allCovered.selectDisabled && audit.allCovered.buttonDisabled &&
    audit.allCovered.hint === "все JTBD этого товара уже имеют группу" &&
    audit.allCovered.optionValues.length === 0,
  "All-covered add-group state is wrong");
  assert(!audit.gap.selectDisabled &&
    JSON.stringify(audit.gap.optionValues) === JSON.stringify([audit.gap.freedJtbdId]) &&
    audit.gap.occupiedIds.every((id) => !audit.gap.optionValues.includes(id)),
  "JTBD selector exposes an occupied value or hides the freed value");
  assert(audit.addAction.enabledAfterChoice && audit.addAction.count === 3 &&
    audit.addAction.jtbdId === audit.addAction.expectedJtbdId &&
    audit.addAction.productId === audit.rows[0].productId && audit.addAction.blank &&
    audit.addAction.headings === 0 && audit.addAction.texts === 0,
  "Add-group action did not create a blank group for the selected JTBD");
  assert(audit.layout.topLevelSections === 1 &&
    JSON.stringify(audit.layout.topLevelHeadings) ===
      JSON.stringify(["Редактирование групп объявлений"]) &&
    audit.layout.legacyTopLevelHeadings.length === 0,
  "Legacy all-groups top-level feeds are still rendered");
  assert(audit.layout.launchSeparate,
    "Launch block is no longer separate below the group feed");
  assert(JSON.stringify(audit.layout.cardIds) ===
    JSON.stringify(audit.rows.map((row) => row.id)),
  "Group cards are missing or rendered out of order");
  assert(audit.layout.collapsedCards === 3 && audit.layout.visibleEditors === 0 &&
    audit.layout.expandedEditors === 3 &&
    audit.layout.summaryHeights.every((height) => height > 0 && height < 90),
  "RSYA group feed is not compact by default");
  assert(audit.layout.cards.every((card, index) =>
    card.title === `Группа ${index + 1}` &&
    JSON.stringify(card.order) === JSON.stringify(["audience", "extras", "ads"]) &&
    card.foundation === 1 && card.audience === 1 &&
    card.interestsPrompts === 1 && card.audienceAdditional === 0 &&
    card.retargetingFields === 0 && card.negativePhraseFields === 0 &&
    card.ads === audit.rows[index].adCount &&
    card.adPrompts === audit.rows[index].adCount &&
    card.media === audit.rows[index].adCount &&
    card.legacyImageFormatBoards === 0 && card.legacyImageFormatCards === 0 &&
    card.adSectionOrders.every((order) =>
      JSON.stringify(order) === JSON.stringify(["landing", "prompt", "copy", "images", "preview"])) &&
    card.removedAdFields === 0 && card.videoControls === 0 && card.previews === 0 &&
    card.adPreviews === audit.rows[index].adCount &&
    card.previewFormatCards === audit.rows[index].adCount * 4 &&
    card.assetPrompts === audit.rows[index].adCount &&
    card.adExtras === audit.rows[index].adCount &&
    card.ctaUrls.length === audit.rows[index].adCount &&
    card.ctaUrls.every((url) => url === card.selectedProductLanding) &&
    card.addAdAfterLastCard && card.ownReferencesOnly),
  "A group card lost, duplicated, reordered, or borrowed nested content");
  assert(JSON.stringify(audit.layout.globalCounts) === JSON.stringify({
    foundations: 3,
    audience: 3,
    interestsPrompts: 3,
    audienceAdditional: 0,
    retargetingFields: 0,
    negativePhraseFields: 0,
    adsSections: 3,
    adCards: 3,
    adPrompts: 3,
    media: 3,
    legacyImageFormatBoards: 0,
    legacyImageFormatCards: 0,
    internalNameFields: 0,
    displayLinkFields: 0,
    imageBriefs: 0,
    videoControls: 0,
    previews: 0,
    adPreviews: 3,
    previewFormatCards: 12,
    extrasSections: 3,
    assetPrompts: 3,
    adExtras: 3,
  }), "Nested group content was lost or duplicated globally");
  assert(JSON.stringify(audit.hiddenAdStored) === JSON.stringify(audit.hiddenAdSentinels),
    "Hidden ad fields were altered while being removed from render");
  assert(audit.displayed.every((row, index) =>
    row.name === audit.rows[index].foundationJtbd && row.phrases.length >= 5),
  "Live fields do not show per-JTBD defaults");
  assert(audit.launch.groups3 === 3 && audit.launch.groups2 === 2 &&
    audit.launch.total3 > audit.launch.total2 &&
    audit.launch.autoTotal3 > audit.launch.autoTotal2 &&
    /Групп:\s*3/.test(audit.launch.uiText),
  "Launch checklist counters are not based on the real group count");
  assert(JSON.stringify(audit.persistedJtbdIds) ===
    JSON.stringify(audit.rows.map((row) => row.jtbdId)),
  "jtbdId values were not persisted");
  assert(audit.bodyHasContent && !audit.errorOverlay,
    "Live page failed basic verification");
  assert(!audit.runtimeExceptions.length,
    `Runtime exceptions: ${audit.runtimeExceptions.join("\n")}`);

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
  console.log(JSON.stringify({
    audit: auditPath,
    screenshot: screenshotPath,
    groups: audit.rows.length,
    jtbdIds: audit.rows.map((row) => row.jtbdId),
    phraseCounts: audit.rows.map((row) => row.phrases.length),
    launch: {
      groups: audit.launch.groups3,
      total: audit.launch.total3,
      autoTotal: audit.launch.autoTotal3,
    },
  }, null, 2));
} finally {
  await browser.call("Target.disposeBrowserContext", { browserContextId })
    .catch(() => {});
  page.close();
  browser.close();
}
