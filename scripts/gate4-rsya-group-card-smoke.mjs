import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const sourcePath = process.env.GURU_PROJECT_SOURCE_EXPORT ||
  resolve("artifacts/gate-4-recovered-groups-v408.json");
const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9345";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3010/";
const goatId = "catalog-item-1786792591872-51f503";
const branchKey = "catalog_item_1786792591872_51f503";
const screenshotPath = resolve("artifacts/gate4-rsya-goat-group-card-v461.png");
const auditPath = resolve("artifacts/gate4-rsya-group-card-v461-audit.json");
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
    'document.readyState === "complete" && typeof g4RsyaGroupCardReadinessV458 === "function"',
  );
  const audit = await evaluate(`(async () => {
    state = createFreshWorkspace({
      id: "rsya-group-card-v458-smoke",
      name: "RSYA group card smoke",
    });
    activeProjectId = "rsya-group-card-v458-smoke";
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};
    const fixture = ${JSON.stringify(fixture)};
    Object.assign(state.project, structuredClone(fixture.project));
    state.sharedEvidence = structuredClone(fixture.sharedEvidence);
    const rsyaFixture = structuredClone(fixture.rsya);
    rsyaFixture.groups = rsyaFixture.groups.slice(0, 1);
    rsyaFixture.jtbdSchemaV459 = 1;
    rsyaFixture.groups[0].jtbdId = fixture.search.groupRows[0].jtbdId;
    state.gate4Rsya = { ${JSON.stringify(branchKey)}: rsyaFixture };
    state.gate4SearchBuild = { ${JSON.stringify(branchKey)}: structuredClone(fixture.search) };
    delete state.project._gate4RsyaProductIdMigrationLog;
    delete state.project._gate4RsyaFoundationMigrationLog;
    delete state.project._gate4RsyaJtbdGroupsMigrationLog;
    g4RsyaMigrateGroupProductIdsV449(state);
    g4RsyaMigrateGroupFoundationV455(state);

    state.gate4Rsya[${JSON.stringify(branchKey)}].groups[0].autotargeting = "enabled";
    const d = ensureGate4RsyaV289(${JSON.stringify(goatId)});
    const channel = "yandex-rsya";
    const firstId = d.groups[0].id;
    const foundation = g4RsyaGroupFoundationV455(
      ${JSON.stringify(goatId)}, d.groups[0],
    );
    const host = document.createElement("main");
    host.style.cssText = "max-width:1180px;margin:0 auto;padding:24px;background:#fff";
    document.body.replaceChildren(host);
    document.body.style.cssText = "display:block;background:#f7f7f4;margin:0";
    const renderCards = () => {
      const current = ensureGate4RsyaV289(${JSON.stringify(goatId)});
      host.innerHTML = '<h2 style="margin:0 0 16px">Коза · Группы РСЯ</h2>' +
        g4RsyaAudienceHtmlV289(${JSON.stringify(goatId)}, channel, current);
    };
    renderCards();
    const originalRenderGate = renderGate;
    const originalConfirm = window.confirm;
    renderGate = renderCards;
    let confirmCalls = 0;
    window.confirm = () => { confirmCalls += 1; return true; };
    const card = (id) => host.querySelector(
      '[data-g4rsya-v458-group-card="' + CSS.escape(id) + '"]',
    );
    const button = (id, selector) => card(id)?.querySelector(selector);
    const click = (node) => node?.dispatchEvent(new MouseEvent("click", {
      bubbles: true, cancelable: true,
    }));

    const initialCard = card(firstId);
    const initialSwitchRect = initialCard
      ?.querySelector('.g4-rsya-group-state-switch-v458')
      ?.getBoundingClientRect();
    const initialSummaryRect = initialCard
      ?.querySelector('.g4-rsya-group-summary-v461')
      ?.getBoundingClientRect();
    const initial = {
      title: initialCard?.querySelector('.g4-rsya-group-head-v289 > div > strong')?.textContent.trim() || '',
      headerText: initialCard?.querySelector('.g4-rsya-group-head-v289')?.textContent.replace(/\\s+/g, ' ').trim() || '',
      foundationText: initialCard?.querySelector('.g4-rsya-foundation-v455')?.textContent.replace(/\\s+/g, ' ').trim() || '',
      status: button(firstId, '[data-g4rsya-v458-status]')?.textContent.trim() || '',
      fixed: g4RsyaGroupIsFixedV458(d.groups[0]),
      fixedPill: Boolean(initialCard?.querySelector('.g4-group-fixed-pill')),
      fixDisabled: Boolean(button(firstId, '[data-g4rsya-v458-fix-group]')?.disabled),
      returnDisabled: Boolean(button(firstId, '[data-g4rsya-v458-return-group]')?.disabled),
      deleteDisabled: Boolean(button(firstId, '[data-g4rsya-v289-remove-group]')?.disabled),
      duplicateVisible: Boolean(button(firstId, '[data-g4rsya-v458-duplicate-group]')),
      switchLabels: [...initialCard.querySelectorAll('.g4-group-state-segment')]
        .map((node) => node.textContent.trim()),
      switchSize: {
        width: Math.round(initialSwitchRect?.width || 0),
        height: Math.round(initialSwitchRect?.height || 0),
      },
      compact: {
        collapsed: initialCard?.classList.contains('is-collapsed') || false,
        editorHidden: Boolean(initialCard
          ?.querySelector('[data-g4rsya-v461-group-editor]')?.hidden),
        summaryHeight: Math.round(initialSummaryRect?.height || 0),
      },
      readiness: g4RsyaGroupCardReadinessV458(${JSON.stringify(goatId)}, d.groups[0]),
      autotargetingControl: Boolean(initialCard
        ?.querySelector('[data-g4rsya-v289-field="autotargeting"]')),
    };
    const autotargetingRemoved = {
      migratedFromStorage: !Object.hasOwn(d.groups[0], 'autotargeting'),
      absentFromSchema: !Object.hasOwn(
        g4RsyaBlankGroupV289({ autotargeting: 'enabled' }),
        'autotargeting',
      ),
      absentFromPackage: !g4RsyaAdPackageV289(
        { campaignName: '', budget: '', utm: '' },
        d,
        d.groups[0],
        d.groups[0].ads[0],
        ${JSON.stringify(goatId)},
      ).includes('АВТОТАРГЕТИНГ:'),
      ignoredByReadiness: !g4RsyaGroupCardReadinessV458(
        '__removed-autotargeting__',
        { autotargeting: 'enabled', keywords: '', interests: '', retargetingSegments: '', ads: [] },
      ).audienceReady,
    };

    click(button(firstId, '[data-g4rsya-v461-toggle-group]'));
    const expanded = {
      open: card(firstId)?.classList.contains('is-open') || false,
      editorHidden: Boolean(card(firstId)
        ?.querySelector('[data-g4rsya-v461-group-editor]')?.hidden),
      ariaExpanded: button(firstId, '[data-g4rsya-v461-toggle-group]')
        ?.getAttribute('aria-expanded') || '',
    };
    click(button(firstId, '[data-g4rsya-v461-toggle-group]'));

    click(button(firstId, '[data-g4rsya-v458-duplicate-group]'));
    const afterFirstDuplicate = ensureGate4RsyaV289(${JSON.stringify(goatId)});
    const firstCopy = afterFirstDuplicate.groups[1];
    const duplicate = {
      count: afterFirstDuplicate.groups.length,
      sourceId: afterFirstDuplicate.groups[0].id,
      copyId: firstCopy.id,
      sourceProductId: afterFirstDuplicate.groups[0].product_id,
      copyProductId: firstCopy.product_id,
      sourceAdId: afterFirstDuplicate.groups[0].ads[0].id,
      copyAdId: firstCopy.ads[0].id,
      isFixed: g4RsyaGroupIsFixedV458(firstCopy),
      title: card(firstCopy.id)?.querySelector('.g4-rsya-group-head-v289 > div > strong')?.textContent.trim() || '',
      fixCurrent: button(firstCopy.id, '[data-g4rsya-v458-fix-group]')?.classList.contains('is-current') || false,
      returnDisabled: Boolean(button(firstCopy.id, '[data-g4rsya-v458-return-group]')?.disabled),
      deleteDisabled: Boolean(button(firstCopy.id, '[data-g4rsya-v289-remove-group]')?.disabled),
    };

    const fixedDelete = button(firstId, '[data-g4rsya-v289-remove-group]');
    fixedDelete.disabled = false;
    click(fixedDelete);
    const fixedDeleteGuard = {
      count: ensureGate4RsyaV289(${JSON.stringify(goatId)}).groups.length,
      confirmCalls,
    };

    click(button(firstCopy.id, '[data-g4rsya-v289-remove-group]'));
    const unlockedDelete = {
      count: ensureGate4RsyaV289(${JSON.stringify(goatId)}).groups.length,
      confirmCalls,
    };

    click(button(firstId, '[data-g4rsya-v458-duplicate-group]'));
    const currentAfterDuplicate = ensureGate4RsyaV289(${JSON.stringify(goatId)});
    const finalCopyId = currentAfterDuplicate.groups[1].id;
    click(button(firstId, '[data-g4rsya-v458-return-group]'));
    let working = ensureGate4RsyaV289(${JSON.stringify(goatId)}).groups
      .find((row) => row.id === firstId);
    const unlocked = {
      isFixed: g4RsyaGroupIsFixedV458(working),
      fixCurrent: button(firstId, '[data-g4rsya-v458-fix-group]')?.classList.contains('is-current') || false,
      fixDisabled: Boolean(button(firstId, '[data-g4rsya-v458-fix-group]')?.disabled),
      returnDisabled: Boolean(button(firstId, '[data-g4rsya-v458-return-group]')?.disabled),
      deleteDisabled: Boolean(button(firstId, '[data-g4rsya-v289-remove-group]')?.disabled),
    };

    working.interests = "Покупатели авторских новогодних подарков";
    working.ads[0].headings[0].value = "Авторская Коза — подарок к Новому году";
    working.ads[0].texts[0].value = "Необычный символ 2027 года для близких и домашнего уюта";
    working.ads[0].images = [{
      id: "rsya-image-v458-smoke",
      name: "koza-2027.jpg",
      url: "https://k-apple.ru/images/koza-2027.jpg",
      type: "image/jpeg",
    }];
    g4RsyaRefreshGroupCardsV458(${JSON.stringify(goatId)});
    const ready = {
      assessment: g4RsyaGroupCardReadinessV458(${JSON.stringify(goatId)}, working),
      status: button(firstId, '[data-g4rsya-v458-status]')?.textContent.trim() || '',
      statusReadyClass: button(firstId, '[data-g4rsya-v458-status]')?.classList.contains('status-ready') || false,
      fixDisabled: Boolean(button(firstId, '[data-g4rsya-v458-fix-group]')?.disabled),
    };

    click(button(firstId, '[data-g4rsya-v458-fix-group]'));
    const fixedAgainGroup = ensureGate4RsyaV289(${JSON.stringify(goatId)}).groups
      .find((row) => row.id === firstId);
    const fixedAgain = {
      isFixed: g4RsyaGroupIsFixedV458(fixedAgainGroup),
      fixedAt: fixedAgainGroup.fixedAt || '',
      fixedPill: Boolean(card(firstId)?.querySelector('.g4-group-fixed-pill')),
      fixDisabled: Boolean(button(firstId, '[data-g4rsya-v458-fix-group]')?.disabled),
      returnDisabled: Boolean(button(firstId, '[data-g4rsya-v458-return-group]')?.disabled),
      deleteDisabled: Boolean(button(firstId, '[data-g4rsya-v289-remove-group]')?.disabled),
    };
    const finalCopy = ensureGate4RsyaV289(${JSON.stringify(goatId)}).groups
      .find((row) => row.id === finalCopyId);
    const finalCopyUi = {
      isFixed: g4RsyaGroupIsFixedV458(finalCopy),
      status: button(finalCopyId, '[data-g4rsya-v458-status]')?.textContent.trim() || '',
      deleteDisabled: Boolean(button(finalCopyId, '[data-g4rsya-v289-remove-group]')?.disabled),
    };

    saveState();
    await new Promise((resolve) => setTimeout(resolve, 250));
    const persistedWorkspace = JSON.parse(localStorage.getItem(
      WORKSPACE_STORAGE_PREFIX + activeProjectId,
    ) || "null");
    const persistedGroups = persistedWorkspace?.gate4Rsya?.[${JSON.stringify(branchKey)}]
      ?.groups || [];
    const persisted = persistedGroups.map((group) => ({
      id: group.id,
      isFixed: group.isFixed,
      fixedAt: group.fixedAt || '',
    }));

    renderCards();
    renderGate = originalRenderGate;
    window.confirm = originalConfirm;
    return {
      build: window.GURU_BUILD_INFO?.version,
      foundationJtbd: foundation.jtbd,
      autotargetingRemoved,
      initial,
      expanded,
      duplicate,
      fixedDeleteGuard,
      unlockedDelete,
      unlocked,
      ready,
      fixedAgain,
      finalCopyUi,
      persisted,
      finalCount: ensureGate4RsyaV289(${JSON.stringify(goatId)}).groups.length,
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

  assert(audit.build === "2.3.236", `Unexpected build: ${audit.build}`);
  assert(Object.values(audit.autotargetingRemoved).every(Boolean),
    `Autotargeting remains in the RSYA data model or package: ${JSON.stringify(audit.autotargetingRemoved)}`);
  assert(!audit.initial.autotargetingControl, "Autotargeting control is still rendered");
  assert(audit.initial.title === "Группа 1", "Group card title is not short");
  assert(!audit.initial.headerText.includes(audit.foundationJtbd), "JTBD is duplicated in the group header");
  assert(audit.initial.foundationText.includes(audit.foundationJtbd), "JTBD is missing from Group foundation");
  assert(audit.initial.status === "В работе" && !audit.initial.readiness.ready, "Incomplete group status is not live");
  assert(audit.initial.fixed && audit.initial.fixedPill, "Legacy group was not treated as fixed");
  assert(audit.initial.fixDisabled && !audit.initial.returnDisabled, "Fixed group switch state is wrong");
  assert(audit.initial.deleteDisabled, "Fixed group delete must be disabled");
  assert(audit.initial.duplicateVisible, "Duplicate action is missing");
  assert(JSON.stringify(audit.initial.switchLabels) === JSON.stringify([
    "Зафиксировать группу", "Вернуть в редактирование",
  ]), "Two-segment group switch is incomplete");
  assert(audit.initial.switchSize.width >= 300 && audit.initial.switchSize.height < 70, "Group switch is not compact");
  assert(audit.initial.compact.collapsed && audit.initial.compact.editorHidden &&
    audit.initial.compact.summaryHeight > 0 && audit.initial.compact.summaryHeight < 90,
  "Group does not start as the compact Search-like summary row");
  assert(audit.expanded.open && !audit.expanded.editorHidden &&
    audit.expanded.ariaExpanded === "true",
  "Compact group summary does not reveal its own editor");
  assert(audit.duplicate.count === 2 && audit.duplicate.title === "Группа 2", "Group duplication did not render the copy");
  assert(audit.duplicate.sourceId !== audit.duplicate.copyId, "Duplicated group kept the source id");
  assert(audit.duplicate.sourceAdId !== audit.duplicate.copyAdId, "Duplicated group kept an ad id");
  assert(audit.duplicate.sourceProductId === audit.duplicate.copyProductId, "Duplicated group lost product_id");
  assert(!audit.duplicate.isFixed && audit.duplicate.fixCurrent && audit.duplicate.returnDisabled, "Duplicate did not open in editing state");
  assert(!audit.duplicate.deleteDisabled, "Unlocked duplicate delete is unavailable");
  assert(audit.fixedDeleteGuard.count === 2 && audit.fixedDeleteGuard.confirmCalls === 0, "Fixed group delete guard failed");
  assert(audit.unlockedDelete.count === 1 && audit.unlockedDelete.confirmCalls === 1, "Unlocked group was not deleted");
  assert(!audit.unlocked.isFixed && audit.unlocked.fixCurrent && audit.unlocked.fixDisabled && audit.unlocked.returnDisabled, "Return-to-editing state is wrong");
  assert(!audit.unlocked.deleteDisabled, "Unlocked source group delete should be available when a copy exists");
  assert(audit.ready.assessment.ready && audit.ready.assessment.audienceReady && audit.ready.assessment.completeAds === 1, "Filled group was not assessed as ready");
  assert(audit.ready.status === "Готово" && audit.ready.statusReadyClass && !audit.ready.fixDisabled, "Ready status did not update live");
  assert(audit.fixedAgain.isFixed && audit.fixedAgain.fixedAt && audit.fixedAgain.fixedPill, "Group was not fixed again");
  assert(audit.fixedAgain.fixDisabled && !audit.fixedAgain.returnDisabled && audit.fixedAgain.deleteDisabled, "Fixed controls or delete state are wrong");
  assert(!audit.finalCopyUi.isFixed && audit.finalCopyUi.status === "В работе" && !audit.finalCopyUi.deleteDisabled, "Final duplicate state is wrong");
  assert(audit.persisted.length === 2 && audit.persisted.some((group) => group.id === audit.duplicate.sourceId && group.isFixed === true), "Fixed state was not persisted");
  assert(audit.persisted.some((group) => group.isFixed === false), "Editing state was not persisted");
  assert(audit.finalCount === 2, "Unexpected final group count");
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
