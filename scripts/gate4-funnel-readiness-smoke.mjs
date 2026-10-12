import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const sourcePath =
  process.env.GURU_PROJECT_EXPORT ||
  "artifacts/gate-4-recovered-groups-v408.json";
const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9339";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const auditPath = resolve("artifacts/gate4-prerequisite-retirement-v468-audit.json");
const screenshotPath = resolve("artifacts/gate4-prerequisite-retirement-v468.png");
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

async function waitFor(page, expression, timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await evaluate(page, `Boolean(${expression})`)) return;
    await wait(100);
  }
  throw new Error(`Timed out waiting for ${expression}`);
}

const exported = JSON.parse(await readFile(sourcePath, "utf8"));
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
const target = targets.find((item) => item.id === targetId);
const page = new CdpClient(target.webSocketDebuggerUrl);
await page.ready;

try {
  await page.call("Runtime.enable");
  await page.call("Page.enable");
  await page.call("Emulation.setDeviceMetricsOverride", {
    width: 1680,
    height: 1200,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await page.call("Page.addScriptToEvaluateOnNewDocument", {
    source: `{
      const nativeFetch = window.fetch.bind(window);
      window.fetch = (input, init) => String(input).includes("/api/")
        ? Promise.resolve(new Response(JSON.stringify({ ok: true, smoke: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }))
        : nativeFetch(input, init);
    }`,
  });
  await page.call("Page.navigate", { url: appUrl });
  await waitFor(page, 'document.readyState === "complete"');
  await waitFor(page, 'typeof bootstrapAppOnce === "function"');
  await evaluate(page, `(() => {
    localStorage.clear();
    localStorage.setItem("guru-platform-access-v01", "unlocked");
    localStorage.setItem("guru-platform-projects-v02", JSON.stringify([{
      id: "gate4-funnel-readiness-smoke",
      name: "Gate 4 funnel readiness smoke",
      lifecycleStatus: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }]));
    location.reload();
    return true;
  })()`);
  await waitFor(page, 'document.querySelector("[data-open-project]")');
  await evaluate(page, 'document.querySelector("[data-open-project]").click(); true');
  await waitFor(page, 'Boolean(state)');

  const setup = await evaluate(page, `(() => {
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};
    const source = structuredClone(${JSON.stringify(exported)});
    const fixture = structuredClone(state);
    fixture.project = {
      ...fixture.project,
      ...(source.content?.project || source.project || {}),
      id: activeProjectId,
    };
    fixture.sharedEvidence = structuredClone(
      source.content?.sharedEvidence || fixture.sharedEvidence || {},
    );
    const gateIndex = fixture.gates.findIndex((gate) => gate.id === "gate-4");
    if (gateIndex >= 0 && source.gate) {
      fixture.gates[gateIndex] = {
        ...fixture.gates[gateIndex],
        ...structuredClone(source.gate),
      };
    }
    ["gate4", "gate4Production", "gate4SearchBuild", "gate4Rsya", "demandV130"]
      .forEach((key) => {
        if (source.content?.[key] !== undefined)
          fixture[key] = structuredClone(source.content[key]);
      });
    state = migrateWorkspace(fixture, activeProjectId);
    const product = guruV194Products(state).find((item) => /Коза/i.test(item.name));
    const ui = guruV194Ui(state);
    ui.selectedCategoryId = product.categoryId || "";
    ui.selectedProductId = product.id;
    state.gate4Production.launchProduct = product.id;
    const retiredCard = state.gates
      .find((gate) => gate.id === "gate-4")
      ?.cards?.find((card) => card.id === "card-147");
    const retiredRow = retiredCard?.instructionRows?.[0];
    retiredRow.status = "works";
    retiredRow.result = "legacy-template-result-v468";
    retiredRow.comment = "legacy-template-comment-v468";
    const retiredStore = g4ReadinessStoreV225(state);
    retiredStore.byProduct[product.id] = retiredStore.byProduct[product.id] || {};
    retiredStore.byProduct[product.id]["card-147"] = {
      rows: {
        [retiredRow.key]: {
          status: "works",
          result: "legacy-product-result-v468",
          comment: "legacy-product-comment-v468",
        },
      },
    };
    const retirement = g4PrerequisiteRetireWorkspaceV468(state);
    const archiveBeforeRerun = JSON.stringify(
      retiredStore.legacyRetiredPrerequisiteV468,
    );
    const retirementRerun = g4PrerequisiteRetireWorkspaceV468(state);
    const archiveAfterRerun = JSON.stringify(
      retiredStore.legacyRetiredPrerequisiteV468,
    );
    const gate4 = state.gates.find((gate) => gate.id === "gate-4");
    gate4.cards.forEach((card) => {
      card.status = GATE4_RETIRED_PREREQUISITE_CARD_ID_SET_V468.has(card.id)
        ? "not_started"
        : "ready";
    });
    const progressProbe = {
      trackedCards: guruProgressCardsV468(gate4.cards).length,
      rawCards: gate4.cards.length,
      progress: getProgress(gate4.cards),
      rawProgress: Math.round(
        gate4.cards.filter((card) => card.status === "ready").length /
          gate4.cards.length * 100,
      ),
    };
    progressProbe.sidebarBefore = guruGateReadiness(gate4);
    gate4.cards
      .filter((card) => GATE4_RETIRED_PREREQUISITE_CARD_ID_SET_V468.has(card.id))
      .forEach((card) => { card.status = "ready"; });
    progressProbe.sidebarWithRetiredReady = guruGateReadiness(gate4);
    gate4.cards
      .filter((card) => GATE4_RETIRED_PREREQUISITE_CARD_ID_SET_V468.has(card.id))
      .forEach((card) => { card.status = "not_started"; });
    const cards = g4ReadinessAllCardsV225(state);
    const manualCard = cards.find((card) => card.id === "card-160");
    const manualRow = g4ReadinessTemplateRowsV225(manualCard)[0];
    const manualState = g4ReadinessProductRowV225(
      product.id,
      manualCard.id,
      manualRow.key,
      state,
      true,
    );
    manualState.status = "works";
    manualState.result = "manual-value-before-v294";
    const cardIdsBefore = cards.map((card) => card.id);
    const rowKeysBefore = Object.fromEntries(cards.map((card) => [
      card.id,
      g4ReadinessTemplateRowsV225(card).map((row) => row.key),
    ]));
    const campaignKeysBefore = Object.keys(state.gate4Production?.campaigns || {});
    guruNavigateToGate("gate-4");
    renderGate();
    return {
      build: window.GURU_BUILD_INFO?.version || "",
      productId: product.id,
      productName: product.name,
      manualCardId: manualCard.id,
      manualRowKey: manualRow.key,
      cardIdsBefore,
      rowKeysBefore,
      campaignKeysBefore,
      audit: g4FunnelReadinessAuditV294(product),
      progressProbe,
      retirement,
      retirementRerun,
      retirementIdempotent: archiveBeforeRerun === archiveAfterRerun,
      retirementAudit: g4PrerequisiteRetirementAuditV468(state),
    };
  })()`);
  await waitFor(page, 'document.querySelector("[data-g4-funnel-version-v294]")');

  const rendered = await evaluate(page, `(() => {
    const channelKeys = g4LaunchChannels().map((channel) =>
      g4CampaignStateKey(${JSON.stringify("catalog-item-1786792591872-51f503")}, channel.key)
    );
    const renderedCampaignKeys = new Set(
      [...document.querySelectorAll("[data-g4camp-toggle]")]
        .map((node) => node.dataset.g4campToggle)
        .filter((key) => channelKeys.includes(key)),
    );
    const cards = [...document.querySelectorAll("[data-g4-readiness-card]")];
    const rows = [...document.querySelectorAll("[data-g4-readiness-row-key-view]")];
    const stages = [...document.querySelectorAll("[data-g4-map-stage-v290]")]
      .filter((node) => node.classList.contains("g4-funnel-stage-v294"));
    const manualInput = document.querySelector(
      '[data-g4-readiness-card="card-160"] [data-g4-readiness-row-field="result"]'
    );
    const automaticRows = rows.filter((row) => row.dataset.g4FunnelRowModeV294 === "automatic");
    const manualRows = rows.filter((row) => row.dataset.g4FunnelRowModeV294 === "manual");
    if (manualInput) {
      manualInput.value = "manual-value-after-v294";
      manualInput.dispatchEvent(new Event("input", { bubbles: true }));
    }
    const storedManual = g4ReadinessProductRowV225(
      ${JSON.stringify("catalog-item-1786792591872-51f503")},
      "card-160",
      ${JSON.stringify(setup.manualRowKey)},
      state,
    );
    const cardsAfter = g4ReadinessAllCardsV225(state);
    const funnel = document.querySelector('.g4-funnel-map-v294');
    const funnelStyle = funnel ? getComputedStyle(funnel) : null;
    return {
      stageOrder: stages.map((node) => node.dataset.g4MapStageV290),
      prerequisiteRemoved: !document.querySelector('.g4-funnel-stage-v294.is-prerequisite') &&
        ![...document.querySelectorAll('.g4-funnel-map-v294 h3')]
          .some((node) => node.textContent.includes('Вне воронки — предусловие')),
      retiredCardsRendered: ["card-147", "card-149", "card-150"].filter((cardId) =>
        document.querySelector('[data-g4-readiness-card="' + cardId + '"]')
      ).length,
      cardCount: cards.length,
      uniqueCardCount: new Set(cards.map((node) => node.dataset.g4ReadinessCard)).size,
      rowCount: rows.length,
      automaticRows: automaticRows.length,
      manualRows: manualRows.length,
      automaticControls: automaticRows.reduce(
        (sum, row) => sum + row.querySelectorAll("input,select,textarea").length,
        0,
      ),
      automaticLinks: automaticRows.reduce(
        (sum, row) => sum + row.querySelectorAll("[data-g3-execution-target-v282]").length,
        0,
      ),
      campaignCount: renderedCampaignKeys.size,
      campaignKeys: [...renderedCampaignKeys],
      wrapperRemoved: !document.querySelector(".g4-readiness-v225"),
      readinessWithinStages: cards.every((node) => Boolean(node.closest('[data-g4-map-stage-v290]'))),
      campaignsAccountedFor: [...document.querySelectorAll('[data-g4camp-toggle]')]
        .every((node) => Boolean(
          node.closest('[data-g4-map-stage-v290]') || node.closest('.g4-map-outside-v290')
        )),
      orphanCampaignsRendered: document.querySelectorAll(
        '.g4-map-outside-v290 [data-g4camp-toggle]'
      ).length,
      manualValueBefore: manualInput?.defaultValue || "",
      manualValueAfter: storedManual?.result || "",
      cardIdsAfter: cardsAfter.map((card) => card.id),
      rowKeysAfter: Object.fromEntries(cardsAfter.map((card) => [
        card.id,
        g4ReadinessTemplateRowsV225(card).map((row) => row.key),
      ])),
      campaignKeysAfter: Object.keys(state.gate4Production?.campaigns || {}),
      vertical: stages.every((node) => getComputedStyle(node).flexDirection === 'column') &&
        [...document.querySelectorAll('.g4-map-list-v290')].every((node) => getComputedStyle(node).flexDirection === 'column'),
      classicWrapper: Boolean(funnelStyle) && funnelStyle.borderTopWidth === '0px' &&
        funnelStyle.paddingTop === '0px' && funnelStyle.backgroundColor === 'rgba(0, 0, 0, 0)',
      askMixed: Boolean(
        document.querySelector('[data-g4-map-stage-v290="ask"] [data-g4-readiness-card]') &&
        document.querySelector('[data-g4-map-stage-v290="ask"] [data-g4camp-toggle]')
      ),
      actMixed: Boolean(
        document.querySelector('[data-g4-map-stage-v290="act"] [data-g4-readiness-card]') &&
        document.querySelector('[data-g4-map-stage-v290="act"] [data-g4camp-toggle]')
      ),
      strategicFoundationHidden: !document.querySelector(
        '[data-guru-product-context="gate4-launch"] [data-guru-strategic-foundation]'
      ),
      introRemoved: !document.querySelector('.g4-map-intro-v290'),
      log: state.project._gate4FunnelRestructureLogV294,
      retirementLog: state.project._gate4PrerequisiteRetirementLogV468,
      sidebarGate4: document.querySelector('[data-gate-id="gate-4"] .small')?.textContent.trim() || "",
      sidebarReadiness: guruGateReadiness(
        state.gates.find((gate) => gate.id === "gate-4"),
      ),
      runtimeReadinessIds: guruExportRuntimeModelV223("gate-4").readinessUnits
        .map((unit) => unit.unitId),
      debugBlockIds: guruDebugGatePayloadV119("gate-4").blocks
        .map((block) => block.blockId),
      projectReadiness: projectPassportOverviewFields()
        .find((field) => field.label === "Готовность проекта")?.value || "",
      projectTrackedCards: guruProgressCardsV468(allCards()).length,
    };
  })()`);

  await evaluate(page, `(() => {
    document.querySelector('[data-g4-funnel-version-v294]')
      ?.scrollIntoView({ block: "start" });
    return true;
  })()`);
  await wait(200);
  const screenshot = await page.call("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false,
  });
  await writeFile(screenshotPath, Buffer.from(screenshot.data, "base64"));

  const liveUpdate = await evaluate(page, `(() => {
    const product = guruV194Product(${JSON.stringify(setup.productId)}, state);
    const snapshot = g3ProductJourneySnapshot(product);
    const record = snapshot.scoped.segments.records[0];
    if (!record) return { supported: false };
    const before = snapshot.segment;
    const storedRecord = state.project.gate0ScopedValuesV194.find((item) => item.id === record.id);
    if (storedRecord) storedRecord.value = "LIVE SEGMENT V294";
    const stored = storedRecord?.value || "";
    guruInvalidateGateViewCache();
    guruNavigateToGate("gate-4");
    renderGate();
    const row = [...document.querySelectorAll(
      '[data-g4-readiness-card="card-169"] [data-g4-funnel-row-mode-v294="automatic"]'
    )].find((node) => /сегмент/i.test(node.querySelector('strong')?.textContent || ""));
    return {
      supported: true,
      updated: Boolean(row?.textContent.includes("LIVE SEGMENT V294")),
      before,
      stored,
      after: g3ProductJourneySnapshot(product).segment,
      rowText: row?.textContent || "",
    };
  })()`);

  const linkTarget = await evaluate(page, `(() => {
    const link = document.querySelector(
      '[data-g4-readiness-card="card-151"] [data-g3-execution-target-v282]'
    );
    if (!link) return { clicked: false };
    const target = JSON.parse(link.dataset.g3ExecutionTargetV282);
    link.click();
    return { clicked: true, target };
  })()`);
  if (linkTarget.clicked) {
    await wait(300);
  }
  const navigation = await evaluate(page, `(() => ({
    gate: activeGateId,
    highlighted: Boolean(document.querySelector(".guru-source-target-v212")),
    selectedProductId: guruV194Ui(state).selectedProductId,
  }))()`);

  assert(setup.build === "2.3.236", `Unexpected build ${setup.build}`);
  assert(setup.audit.counts.cards === 20, `Expected 20 active cards, got ${setup.audit.counts.cards}`);
  assert(setup.audit.counts.rows === 60, `Expected 60 active rows, got ${setup.audit.counts.rows}`);
  assert(rendered.cardCount === 20 && rendered.uniqueCardCount === 20, "Active readiness cards were lost or duplicated in DOM");
  assert(rendered.rowCount === 60, `Expected 60 rendered rows, got ${rendered.rowCount}`);
  assert(rendered.automaticRows === setup.audit.counts.automaticRows, "Automatic row count differs from READ/MAP");
  assert(rendered.automaticControls === 0, "An automatic row still exposes manual controls");
  assert(rendered.automaticLinks > 0, "Automatic source links are missing");
  assert(rendered.campaignCount === setup.audit.counts.channels, "A campaign channel is missing from the funnel");
  assert(JSON.stringify(rendered.stageOrder) === JSON.stringify(["aware", "appeal", "ask", "act", "advocate"]), "Funnel order differs");
  assert(rendered.prerequisiteRemoved && rendered.retiredCardsRendered === 0, "Retired prerequisite UI is still rendered");
  assert(rendered.wrapperRemoved, "The former readiness wrapper remains");
  assert(rendered.vertical && rendered.classicWrapper, "Gate 4 funnel uses a non-classic wrapper or non-vertical layout");
  assert(rendered.strategicFoundationHidden, "The standalone strategic foundation is still visible in Gate 4");
  assert(rendered.introRemoved, "The non-functional Gate 4 map intro is still rendered");
  assert(rendered.readinessWithinStages && rendered.campaignsAccountedFor, "Readiness or campaign data remains in a separate global list");
  assert(
    rendered.orphanCampaignsRendered === setup.audit.counts.campaignsOutsideCurrentMap,
    "A preserved historical campaign is absent from Outside current map",
  );
  assert(rendered.manualValueAfter === "manual-value-after-v294", "Manual row did not preserve/update its storage");
  assert(JSON.stringify(setup.cardIdsBefore) === JSON.stringify(rendered.cardIdsAfter), "Card identities changed");
  assert(JSON.stringify(setup.rowKeysBefore) === JSON.stringify(rendered.rowKeysAfter), "Row identities changed");
  assert(JSON.stringify(setup.campaignKeysBefore) === JSON.stringify(rendered.campaignKeysAfter), "Campaign records changed");
  assert(rendered.log?.deletedCards === 0 && rendered.log?.deletedRows === 0 && rendered.log?.deletedCampaigns === 0, "Deletion invariant failed");
  assert(setup.progressProbe.progress === 100 && setup.progressProbe.rawProgress < 100, "Retired prerequisites still affect Gate 4 progress");
  assert(setup.progressProbe.rawCards - setup.progressProbe.trackedCards === 3, "Gate 4 progress did not retire exactly three cards");
  assert(JSON.stringify(setup.progressProbe.sidebarBefore) === JSON.stringify(setup.progressProbe.sidebarWithRetiredReady), "Retired prerequisites still affect the live Gate 4 sidebar model");
  assert(setup.retirement.archivedSnapshots === 1 && setup.retirementRerun.changed === false && setup.retirementIdempotent, "Legacy archive is not idempotent");
  assert(setup.retirementAudit.currentLegacyCards["card-147"], "Manual card-147 data was not captured as legacy");
  assert(rendered.retirementLog?.removedFromUi && rendered.retirementLog?.removedFromProgress, "Retirement migration log is incomplete");
  assert(rendered.sidebarGate4.includes(`${rendered.sidebarReadiness.total} блоков`) && rendered.sidebarGate4.includes(`${rendered.sidebarReadiness.percent}%`), `Sidebar progress is wrong: ${rendered.sidebarGate4}`);
  assert(!rendered.runtimeReadinessIds.some((cardId) => ["card-147", "card-149", "card-150"].includes(cardId)), "Retired cards remain in active readiness diagnostics");
  assert(!rendered.debugBlockIds.some((cardId) => ["card-147", "card-149", "card-150"].includes(cardId)), "Retired cards remain in Gate 4 debug export");
  assert(rendered.projectReadiness.includes(`из ${rendered.projectTrackedCards} блоков`), `Project readiness still counts retired cards: ${rendered.projectReadiness}`);
  assert(!liveUpdate.supported || liveUpdate.updated, `Live source update was not reflected in Gate 4: ${JSON.stringify(liveUpdate)}`);

  const report = {
    build: setup.build,
    product: setup.productName,
    counts: setup.audit.counts,
    sourceFixtureExpectedChannels: 17,
    sourceFixtureActualChannels: setup.audit.counts.channels,
    stageOrder: rendered.stageOrder,
    stageCards: Object.fromEntries(
      ["aware", "appeal", "ask", "act", "advocate"].map((stage) => [
        stage,
        setup.audit.cards.filter((card) => card.stage === stage).map((card) => card.id),
      ]),
    ),
    cards: setup.audit.cards.map((card) => ({
      id: card.id,
      title: card.title,
      stage: card.stage,
      automatic: card.rows.filter((row) => row.mode === "automatic").length,
      manual: card.rows.filter((row) => row.mode === "manual").length,
    })),
    channels: setup.audit.channels,
    rows: setup.audit.cards.flatMap((card) => card.rows.map((row) => ({
      cardId: card.id,
      key: row.key,
      stage: card.stage,
      mode: row.mode,
      source: row.source,
    }))),
    preservation: {
      cards: rendered.cardCount,
      rows: rendered.rowCount,
      campaigns: rendered.campaignKeysAfter.length,
      manualState: rendered.manualValueAfter,
      deletions: rendered.log,
    },
    liveUpdate,
    navigation,
    wrapperRemoved: rendered.wrapperRemoved,
    brokenEncoding: setup.audit.brokenEncoding,
    retirement: {
      progress: setup.progressProbe,
      migration: setup.retirement,
      migrationRerun: setup.retirementRerun,
      idempotent: setup.retirementIdempotent,
      audit: setup.retirementAudit,
      log: rendered.retirementLog,
      sidebar: rendered.sidebarGate4,
      runtimeReadinessIds: rendered.runtimeReadinessIds,
      debugBlockIds: rendered.debugBlockIds,
      projectReadiness: rendered.projectReadiness,
      prerequisiteRemovedFromDom: rendered.prerequisiteRemoved,
      retiredCardsRendered: rendered.retiredCardsRendered,
    },
    artifacts: { auditPath, screenshotPath },
  };
  await writeFile(auditPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  if (process.env.GURU_GATE4_FULL_AUDIT === "1") {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(JSON.stringify({
      build: report.build,
      product: report.product,
      counts: report.counts,
      sourceFixtureExpectedChannels: report.sourceFixtureExpectedChannels,
      sourceFixtureActualChannels: report.sourceFixtureActualChannels,
      stageOrder: report.stageOrder,
      stageCards: report.stageCards,
      cardMap: report.cards.map(({ id, stage, automatic, manual }) => ({ id, stage, automatic, manual })),
      channelMap: report.channels.map(({ key, stage }) => ({ key, stage })),
      preservation: report.preservation,
      liveUpdate: report.liveUpdate,
      navigation: report.navigation,
      wrapperRemoved: report.wrapperRemoved,
      brokenEncoding: report.brokenEncoding,
    }, null, 2));
  }
} finally {
  page.close();
  await browser.call("Target.closeTarget", { targetId }).catch(() => {});
  await browser.call("Target.disposeBrowserContext", { browserContextId }).catch(() => {});
  browser.close();
}
