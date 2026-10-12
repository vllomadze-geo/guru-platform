const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9339";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

function assert(condition, message) {
  if (!condition) throw new Error(message);
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
const targets = await (
  await fetch(`http://127.0.0.1:${debugPort}/json`)
).json();
const pageTarget = targets.find((target) => target.id === targetId);
const page = new CdpClient(pageTarget.webSocketDebuggerUrl);
await page.ready;

async function evaluate(expression) {
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

async function waitFor(expression, timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await wait(100);
  }
  throw new Error(`Timed out waiting for ${expression}`);
}

try {
  await page.call("Runtime.enable");
  await page.call("Page.enable");
  await page.call("Emulation.setDeviceMetricsOverride", {
    width: 1440,
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
  await waitFor('document.readyState === "complete"');
  await waitFor('typeof bootstrapAppOnce === "function"');
  await evaluate(`(() => {
    localStorage.clear();
    localStorage.setItem("guru-platform-access-v01", "unlocked");
    localStorage.setItem("guru-platform-projects-v02", JSON.stringify([{
      id: "gate3-gate4-structure-sync-smoke",
      name: "Gate 3 Gate 4 structure sync smoke",
      lifecycleStatus: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }]));
    location.reload();
    return true;
  })()`);
  await waitFor('document.querySelector("[data-open-project]")');
  await evaluate('document.querySelector("[data-open-project]").click(); true');
  await waitFor('Boolean(state)');

  const setup = await evaluate(`(() => {
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};
    const now = new Date().toISOString();
    state.project.productRegistryV185 = [
      { id: "sync-category", name: "Синхронизация", legacyNames: [], createdAt: now }
    ];
    state.project.catalogItemsV189 = [
      { id: "sync-product-a", name: "Продукт A", continuum: "pure_product", categoryId: "sync-category", createdAt: now },
      { id: "sync-product-b", name: "Продукт B", continuum: "pure_product", categoryId: "sync-category", createdAt: now }
    ];
    state.project.gate0ScopedValuesV194 = [];
    const ui = guruV194Ui(state);
    ui.selectedCategoryId = "sync-category";
    ui.selectedProductId = "sync-product-a";

    const model = g3Gate4StructureForProductV290("sync-product-a");
    const aware = model.stages.aware.groups[0];
    const originalFirst = aware.items[0].instanceId;
    const movedId = aware.items[1].instanceId;

    const repeatedActive = g3Gate4AddItemV290(
      "sync-product-a", "aware", aware.id, "Повторяемый инструмент"
    );
    const appeal = model.stages.appeal.groups[0];
    const repeatedArchived = g3Gate4AddItemV290(
      "sync-product-a", "appeal", appeal.id, "Повторяемый инструмент"
    );
    const activeImpl = g3Gate4ImplementationV290(repeatedActive.implementationId);
    const archivedImpl = g3Gate4ImplementationV290(repeatedArchived.implementationId);
    activeImpl.message = "Материалы сохранены при переносе";
    activeImpl.status = "in_progress";
    archivedImpl.message = "Архивные материалы не удалять";
    archivedImpl.status = "ready";

    const otherWorkspace = createFreshWorkspace({
      id: "other-project", name: "Изолированный проект"
    });
    const otherModel = g3Gate4StructureForProductV290(
      "sync-product-a", otherWorkspace
    );
    g3Gate4AddItemV290(
      "sync-product-a",
      "aware",
      otherModel.stages.aware.groups[0].id,
      "Только другой проект",
      otherWorkspace,
    );

    state.gate3ProductJourneyV210 = state.gate3ProductJourneyV210 || {
      openStepsByProduct: {}
    };
    state.gate3ProductJourneyV210.openStepsByProduct["sync-product-a"] = {
      aware: true, appeal: true, ask: true, act: true, advocate: true
    };
    guruNavigateToGate("gate-3");
    renderGate();
    return {
      originalFirst,
      movedId,
      repeatedActive: repeatedActive.instanceId,
      repeatedArchived: repeatedArchived.instanceId,
      repeatedActiveImplementation: repeatedActive.implementationId,
      repeatedArchivedImplementation: repeatedArchived.implementationId,
      otherProjectIsolated: !JSON.stringify(model).includes("Только другой проект"),
    };
  })()`);
  await waitFor('document.querySelectorAll("[data-g3-execution-stage-v282]").length === 5');

  const uiChanges = await evaluate(`(() => {
    const movedRow = document.querySelector('[data-g3-map-instance-v290="${setup.movedId}"]');
    movedRow?.querySelector('[data-g3-map-move-v290="up"]')?.click();
    const movedFirst = document.querySelector('[data-g3-execution-stage-v282="aware"] [data-g3-map-instance-v290]')?.dataset.g3MapInstanceV290 === ${JSON.stringify(setup.movedId)};

    const transferSelect = document.querySelector('[data-g3-map-instance-v290="${setup.repeatedActive}"] [data-g3-map-stage-v290]');
    if (transferSelect) {
      transferSelect.value = "ask";
      transferSelect.dispatchEvent(new Event("change", { bubbles: true }));
    }
    const transferred = document.querySelector('[data-g3-map-instance-v290="${setup.repeatedActive}"]')
      ?.closest('[data-g3-execution-stage-v282]')?.dataset.g3ExecutionStageV282 === "ask";

    document.querySelector('[data-g3-map-instance-v290="${setup.repeatedArchived}"] [data-g3-map-exclude-v290]')?.click();
    const excluded = !document.querySelector('[data-g3-map-instance-v290="${setup.repeatedArchived}"]');

    const act = document.querySelector('[data-g3-execution-stage-v282="act"]');
    const input = act?.querySelector('[data-g3-map-new-label-v290]');
    if (input) input.value = "Новый инструмент 5A";
    act?.querySelector('[data-g3-map-add-v290]')?.click();
    const addedRow = [...document.querySelectorAll('[data-g3-map-instance-v290]')]
      .find((row) => row.querySelector('.g3-execution-label-v282')?.textContent.trim() === "Новый инструмент 5A");
    const added = addedRow?.dataset.g3MapInstanceV290 || "";
    const addedItem = added ? g3Gate4LocateItemV290("sync-product-a", added)?.item : null;
    const addedImpl = g3Gate4ImplementationV290(addedItem?.implementationId);
    if (addedImpl) addedImpl.message = "Новый блок создан существующим механизмом";
    saveState();
    return {
      moved: movedFirst,
      transferred,
      excluded,
      added,
      addedImplementation: addedItem?.implementationId || "",
    };
  })()`);

  const gate3 = await evaluate(`(() => ({
    order: [...document.querySelectorAll('[data-g3-execution-stage-v282]')].map((stage) => ({
      stage: stage.dataset.g3ExecutionStageV282,
      groups: [...stage.querySelectorAll('[data-g3-map-group-v290]')].map((group) => ({
        id: group.dataset.g3MapGroupV290,
        items: [...group.querySelectorAll('[data-g3-map-instance-v290]')]
          .filter((row) => row.classList.contains('g3-execution-item-v282'))
          .map((row) => row.dataset.g3MapInstanceV290)
      }))
    })),
    vertical: [...document.querySelectorAll('.g3-execution-list-v282')].every((grid) =>
      getComputedStyle(grid).gridTemplateColumns.split(/\\s+/).filter(Boolean).length === 1
    ),
    transferStage: document.querySelector('[data-g3-map-instance-v290="${setup.repeatedActive}"]')
      ?.closest('[data-g3-execution-stage-v282]')?.dataset.g3ExecutionStageV282 || "",
    archivedActive: Boolean(document.querySelector('[data-g3-map-instance-v290="${setup.repeatedArchived}"]')),
    addVisible: Boolean(document.querySelector('[data-g3-map-add-v290]')),
  }))()`);

  await evaluate('guruNavigateToGate("gate-4"); renderGate(); true');
  await waitFor('document.querySelector("[data-g4-map-product-v290=\\"sync-product-a\\"]")');
  const gate4 = await evaluate(`(() => ({
    order: [...document.querySelectorAll('.g4-map-stage-v290:not(.is-prerequisite)')].map((stage) => ({
      stage: stage.dataset.g4MapStageV290,
      groups: [...stage.querySelectorAll(':scope > .g4-map-group-v290')].map((group) => ({
        id: group.dataset.g4MapGroupV290,
        items: [...group.querySelectorAll(':scope > .g4-map-list-v290 > .g4-map-tool-v290')]
          .map((row) => row.dataset.g4MapInstanceV290)
      }))
    })),
    transferredMessage: document.querySelector('[data-g4-map-implementation-id-v290="${setup.repeatedActiveImplementation}"] textarea[data-g4-map-impl-field-v290="message"]')?.value || "",
    archivedMessage: document.querySelector('[data-g4-map-implementation-id-v290="${setup.repeatedArchivedImplementation}"] textarea[data-g4-map-impl-field-v290="message"]')?.value || "",
    outsideExists: Boolean(document.querySelector('.g4-map-outside-v290')),
    outsideCollapsed: !document.querySelector('.g4-map-outside-v290')?.open,
    archivedInOutside: Boolean(document.querySelector('.g4-map-outside-v290 [data-g4-map-instance-v290="${setup.repeatedArchived}"]')),
    restoreButtons: document.querySelectorAll('.g4-map-outside-v290 [data-g4-map-restore-v290]').length,
    addedVisible: Boolean(document.querySelector('.g4-map-stage-v290[data-g4-map-stage-v290="act"] [data-g4-map-instance-v290="${uiChanges.added}"]')),
    vertical: [...document.querySelectorAll('.g4-map-list-v290')].every((list) => getComputedStyle(list).flexDirection === 'column'),
    stableBindings: (() => {
      const model = g3Gate4StructureForProductV290("sync-product-a");
      const currentKeys = new Set(g4LaunchChannels().map((channel) => channel.key));
      const keys = model.stageOrder.flatMap((stageKey) =>
        model.stages[stageKey].groups.flatMap((group) =>
          group.items.flatMap((item) => item.channelKeys || [])
        )
      );
      return {
        count: keys.length,
        allCurrent: keys.every((key) => currentKeys.has(key)),
      };
    })(),
    build: window.GURU_BUILD_INFO?.version || "",
  }))()`);

  assert(uiChanges.moved, "Gate 3 reorder control did not move the item");
  assert(uiChanges.transferred, "Gate 3 stage selector did not move the item");
  assert(uiChanges.excluded, "Gate 3 exclude control did not archive the item");
  assert(uiChanges.added && uiChanges.addedImplementation, "Gate 3 add control did not create a linked implementation");
  assert(setup.otherProjectIsolated, "One project's structure leaked into another");
  assert(
    JSON.stringify(gate3.order) === JSON.stringify(gate4.order),
    `Gate 3 and Gate 4 hierarchy/order differ: ${JSON.stringify({ gate3: gate3.order, gate4: gate4.order })}`,
  );
  assert(gate3.vertical && gate4.vertical, "The structure is not vertical");
  assert(gate3.transferStage === "ask", "Transferred item is not in Ask in Gate 3");
  assert(!gate3.archivedActive, "Archived item is still active in Gate 3");
  assert(gate3.addVisible, "Gate 3 add-instrument mechanism is missing");
  assert(gate4.transferredMessage === "Материалы сохранены при переносе", "Transferred implementation lost its data");
  assert(gate4.archivedMessage === "Архивные материалы не удалять", "Archived implementation lost its data");
  assert(gate4.outsideExists && gate4.outsideCollapsed, "Outside-current-map is missing or expanded by default");
  assert(gate4.archivedInOutside, "Archived item is absent from Outside current map");
  assert(gate4.restoreButtons === 1, "Restore control is exposed for non-map legacy rows");
  assert(gate4.addedVisible, "New Gate 3 tool did not appear in Gate 4");
  assert(gate4.stableBindings.count > 0 && gate4.stableBindings.allCurrent, "Campaign relationships were not materialized as stable keys");
  assert(gate4.build === "2.3.163", `Unexpected build ${gate4.build}`);

  await page.call("Page.reload", { ignoreCache: true });
  await waitFor('document.readyState === "complete"');
  await waitFor('document.querySelector("[data-open-project]")');
  await evaluate('document.querySelector("[data-open-project]").click(); true');
  await waitFor('Boolean(state)');
  const reload = await evaluate(`(() => {
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};
    const ui = guruV194Ui(state);
    ui.selectedCategoryId = "sync-category";
    ui.selectedProductId = "sync-product-a";
    const model = g3Gate4StructureForProductV290("sync-product-a");
    const active = g3Gate4LocateItemV290("sync-product-a", ${JSON.stringify(setup.movedId)});
    const transferred = g3Gate4LocateItemV290("sync-product-a", ${JSON.stringify(setup.repeatedActive)});
    const archived = g3Gate4LocateItemV290("sync-product-a", ${JSON.stringify(setup.repeatedArchived)});
    return {
      serialized: JSON.stringify(model),
      transferredStage: transferred?.stageKey || "",
      transferredMessage: g3Gate4ImplementationV290(transferred?.item?.implementationId)?.message || "",
      archivedOutside: Boolean(archived?.outside),
      archivedMessage: g3Gate4ImplementationV290(archived?.item?.implementationId)?.message || "",
    };
  })()`);

  assert(reload.serialized.includes(setup.movedId), "Reordered stable ID was not persisted");
  assert(reload.transferredStage === "ask", "Transferred stage was not persisted");
  assert(reload.transferredMessage === "Материалы сохранены при переносе", "Transferred data was not persisted");
  assert(reload.archivedOutside, "Archived placement was not persisted");
  assert(reload.archivedMessage === "Архивные материалы не удалять", "Archived data was not persisted");

  console.log(JSON.stringify({
    build: gate4.build,
    sameHierarchyAndOrder: true,
    reorderReflected: true,
    transferPreservedData: true,
    newToolCreatedImplementation: true,
    repeatedNamesKeepSeparateStableIds: setup.repeatedActive !== setup.repeatedArchived,
    campaignLinksUseStableKeys: gate4.stableBindings,
    excludedMaterialsPreserved: true,
    outsideCollapsedByDefault: gate4.outsideCollapsed,
    reloadPersisted: true,
    projectIsolation: setup.otherProjectIsolated,
    activeStageCounts: gate4.order.map((stage) => ({
      stage: stage.stage,
      items: stage.groups.reduce((sum, group) => sum + group.items.length, 0),
    })),
  }, null, 2));
} finally {
  page.close();
  await browser.call("Target.closeTarget", { targetId }).catch(() => {});
  await browser.call("Target.disposeBrowserContext", { browserContextId }).catch(() => {});
  browser.close();
}
