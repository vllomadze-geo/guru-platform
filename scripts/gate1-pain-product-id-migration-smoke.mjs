import { readFile } from "node:fs/promises";

const sourceExportPath =
  process.env.GURU_GATE1_SOURCE_EXPORT ||
  "/Users/vl/Downloads/guru-project-korichnoe-yabloko-all.json";
const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9337";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const smokeProjectId = "gate1-pain-product-id-migration-smoke";
const shirtId = "catalog-item-1786792591872-c8b1e9";
const islandkaId = "catalog-item-1786792591872-98358d";
const goatId = "catalog-item-1786792591872-51f503";
const giftsCategoryId = "product-1786401011698-9e81ee";
const shirtMain = "рубашка с кружевными вставками";
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

async function waitFor(page, expression, timeoutMs = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await evaluate(page, `Boolean(${expression})`)) return;
    await wait(100);
  }
  throw new Error(`Timed out waiting for: ${expression}`);
}

const payload = JSON.parse(await readFile(sourceExportPath, "utf8"));
const source = payload.workspace || payload.content;
assert(source?.painV130?.productMaps, "painV130.productMaps missing in fixture");
const sourcePageItems = source.painV130.productMaps.flatMap((row, rowIndex) =>
  Object.entries(row.items || {}).map(([sourceKey, data]) => ({
    rowIndex,
    direction: row.product,
    sourceKey,
    data,
  })),
);
assert(sourcePageItems.length === 10, `Expected 10 legacy page items, got ${sourcePageItems.length}`);

let browser;
let page;
try {
  const browserVersion = await (
    await fetch(`http://127.0.0.1:${debugPort}/json/version`)
  ).json();
  browser = new CdpClient(browserVersion.webSocketDebuggerUrl);
  await browser.ready;
  const { targetId } = await browser.call("Target.createTarget", {
    url: "about:blank",
  });
  const targets = await (
    await fetch(`http://127.0.0.1:${debugPort}/json`)
  ).json();
  const target = targets.find((candidate) => candidate.id === targetId);
  assert(target?.webSocketDebuggerUrl, "Chrome target missing");
  page = new CdpClient(target.webSocketDebuggerUrl);
  await page.ready;
  await page.call("Runtime.enable");
  await page.call("Page.enable");
  await page.call("Page.addScriptToEvaluateOnNewDocument", {
    source: `{
      const nativeFetch = window.fetch.bind(window);
      window.fetch = (input, init) => String(input).includes("/api/")
        ? Promise.resolve(new Response(JSON.stringify({ ok: true, isolatedSmokeTest: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }))
        : nativeFetch(input, init);
    }`,
  });
  await page.call("Page.navigate", { url: appUrl });
  await waitFor(page, 'document.readyState === "complete"');
  await waitFor(page, 'typeof bootstrapAppOnce === "function"');

  const fixture = structuredClone(source);
  fixture.project = { ...fixture.project, id: smokeProjectId };
  delete fixture.project._gate1ProductIdMigrationLog;
  await evaluate(
    page,
    `(() => {
      localStorage.clear();
      localStorage.setItem("guru-platform-access-v01", "unlocked");
      localStorage.setItem("guru-platform-projects-v02", JSON.stringify([{
        id: ${JSON.stringify(smokeProjectId)},
        name: "Gate 1 pain product_id migration smoke",
        lifecycleStatus: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }]));
      localStorage.setItem(
        WORKSPACE_STORAGE_PREFIX + ${JSON.stringify(smokeProjectId)},
        ${JSON.stringify(JSON.stringify(fixture))}
      );
      location.reload();
      return true;
    })()`,
  );
  await waitFor(page, 'document.readyState === "complete"');
  await waitFor(
    page,
    `document.querySelector('[data-open-project="${smokeProjectId}"]')`,
  );
  await evaluate(
    page,
    `document.querySelector('[data-open-project="${smokeProjectId}"]').click(); true`,
  );
  await waitFor(
    page,
    `activeProjectId === ${JSON.stringify(smokeProjectId)} && Boolean(state)`,
  );
  await wait(800);

  const result = await evaluate(
    page,
    `(async () => {
      scheduleCloudSync = () => {};
      scheduleProjectsCloudSync = () => {};
      const catalogIds = new Set(guruV194Products(state).map((item) => item.id));
      const active = state.painV130.productMaps.flatMap((row, rowIndex) =>
        Object.entries(row.items || {}).map(([key, data]) => ({
          rowIndex,
          direction: row.product,
          key,
          product_id: data.product_id,
        }))
      );
      const archive = state.painV130.productMaps.flatMap((row, rowIndex) =>
        Object.entries(row.legacyPageItemsV237 || {}).map(([key, value]) => ({
          rowIndex,
          direction: row.product,
          key,
          value,
        }))
      );
      const shirtRow = state.painV130.productMaps.find(
        (row) => row.items?.[${JSON.stringify(shirtId)}]
      );
      const shirt = shirtRow.items[${JSON.stringify(shirtId)}];
      const shirtGroup = shirt.semL3Groups[0];
      const shirtQueries = [
        shirtGroup.mainQuery,
        ...shirtGroup.keywords.map(pv181KeywordText),
      ];
      const shirtMirror = [...shirt.semL3];
      const allMappedDataPreserved = archive
        .filter((item) => item.value.mapped_product_id)
        .every((item) => {
          const activeData = state.painV130.productMaps[item.rowIndex]
            ?.items?.[item.value.mapped_product_id];
          const expected = structuredClone(item.value.data);
          expected.product_id = item.value.mapped_product_id;
          if (item.value.mapped_product_id === ${JSON.stringify(shirtId)})
            gate1PainNormalizeShirtQueriesV237(expected);
          for (const group of expected.semL3Groups || [])
            group.keywords = (group.keywords || []).map((keyword) =>
              pv181KeywordEntry(keyword, {
                source: "manual",
                status: "confirmed",
              })
            );
          return JSON.stringify(activeData) === JSON.stringify(expected);
        });
      const downstreamShirt = g4ProductSemantics(${JSON.stringify(shirtId)});
      const firstSnapshot = JSON.stringify({
        maps: state.painV130.productMaps,
        log: state.project._gate1ProductIdMigrationLog,
      });
      const rerun1 = gate1PainMigrateWorkspaceV237(state);
      const rerun2 = gate1PainMigrateWorkspaceV237(state);
      const keywordRerun1 = gate1PainMigrateKeywordMetadataV238(state);
      const keywordRerun2 = gate1PainMigrateKeywordMetadataV238(state);
      const secondSnapshot = JSON.stringify({
        maps: state.painV130.productMaps,
        log: state.project._gate1ProductIdMigrationLog,
      });

      const ui = guruV194Ui(state);
      ui.selectedCategoryId = "product-1786401011698-231009";
      ui.selectedProductId = ${JSON.stringify(shirtId)};
      guruNavigateToGate("gate-1");
      renderGate();
      const shirtMainInput = document.querySelector(
        '[data-pv181-item="${shirtId}"][data-pv181-main-query]'
      );
      const shirtKeywordInputs = [...document.querySelectorAll(
        '[data-pv181-item="${shirtId}"][data-pv181-query-keyword]'
      )].map((input) => input.value);
      const confirmedLegacyRows = [...document.querySelectorAll(
        '.pv181-keyword-row[data-pv181-keyword-source="manual"][data-pv181-keyword-status="confirmed"]'
      )].filter((row) => row.querySelector('[data-pv181-item="${shirtId}"]'));
      const legacyDraftRows = confirmedLegacyRows.filter((row) =>
        row.classList.contains("is-draft")
      );

      document.querySelector(
        '[data-pv181-query-keyword-add][data-pv181-item-i="${shirtId}"]'
      ).click();
      const manualInputs = [...document.querySelectorAll(
        '[data-pv181-item="${shirtId}"][data-pv181-query-keyword]'
      )];
      const manualInput = manualInputs.at(-1);
      manualInput.value = "новая ручная фраза smoke";
      manualInput.dispatchEvent(new Event("input", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
      let currentShirtGroup = shirtRow.items[${JSON.stringify(shirtId)}]
        .semL3Groups[0];
      const manualEntry = structuredClone(currentShirtGroup.keywords.at(-1));

      document.querySelector(
        '[data-pv181-query-keyword-add][data-pv181-item-i="${shirtId}"]'
      ).click();
      currentShirtGroup = shirtRow.items[${JSON.stringify(shirtId)}]
        .semL3Groups[0];
      currentShirtGroup.keywords[currentShirtGroup.keywords.length - 1] = pv181KeywordEntry({
        value: "сгенерированная фраза smoke",
        source: "generated",
        status: "draft",
      });
      pv181SyncQueryGroups(shirtRow.items[${JSON.stringify(shirtId)}]);
      renderGate();
      const draftTextarea = [...document.querySelectorAll(
        '[data-pv181-item="${shirtId}"][data-pv181-query-keyword]'
      )].find((input) => input.value === "сгенерированная фраза smoke");
      const draftRow = draftTextarea?.closest('.pv181-keyword-row');
      const draftConfirm = draftRow?.querySelector('[data-pv181-query-keyword-confirm]');
      const draftVisual = {
        row: Boolean(draftRow),
        isDraft: Boolean(draftRow?.classList.contains('is-draft')),
        badge: draftRow?.querySelector('.pv181-keyword-draft-badge')?.textContent || "",
        confirm: Boolean(draftConfirm),
      };
      draftConfirm?.click();
      currentShirtGroup = shirtRow.items[${JSON.stringify(shirtId)}]
        .semL3Groups[0];
      const generatedEntry = structuredClone(currentShirtGroup.keywords.at(-1));
      const downstreamAfterMetadataActions = g4ProductSemantics(
        ${JSON.stringify(shirtId)}
      );

      ui.selectedProductId = ${JSON.stringify(islandkaId)};
      renderGate();
      const islandkaMainInput = document.querySelector(
        '[data-pv181-item="${islandkaId}"][data-pv181-main-query]'
      );
      const shirtVisibleForIslandka = Boolean(document.querySelector(
        '[data-pv181-item="${shirtId}"][data-pv181-main-query]'
      ));

      ui.selectedCategoryId = ${JSON.stringify(giftsCategoryId)};
      ui.selectedProductId = ${JSON.stringify(goatId)};
      const giftsRow = state.painV130.productMaps.find(
        (row) => row.product_id === ${JSON.stringify(giftsCategoryId)}
      );
      giftsRow.items[${JSON.stringify(goatId)}].semL2 = ["goat-stability-sentinel"];
      const beforeSibling = structuredClone(giftsRow.items[${JSON.stringify(goatId)}]);
      const sibling = {
        id: "catalog-item-gate1-smoke-gift-b",
        name: "Тестовый второй подарок",
        categoryId: ${JSON.stringify(giftsCategoryId)},
        continuum: "pure_product",
        createdAt: new Date().toISOString(),
      };
      state.project.catalogItemsV189.push(sibling);
      const siblingMigration = gate1PainMigrateWorkspaceV237(state);
      const afterSibling = giftsRow.items[${JSON.stringify(goatId)}];

      return {
        catalogCount: catalogIds.size,
        active,
        archive,
        allActiveCanonical: active.every(
          (item) => catalogIds.has(item.key) && item.product_id === item.key
        ),
        shirtMain: shirtGroup.mainQuery,
        shirtKeywords: shirtGroup.keywords,
        shirtQueries,
        shirtMirror,
        allMappedDataPreserved,
        downstreamShirt: {
          itemKeys: Object.keys(downstreamShirt.row?.items || {}),
          containsAllQueries: shirtQueries.every((query) =>
            downstreamShirt.queries.includes(query)
          ),
        },
        rerun1,
        rerun2,
        keywordRerun1,
        keywordRerun2,
        idempotent: firstSnapshot === secondSnapshot,
        ui: {
          shirtMain: shirtMainInput?.value || null,
          shirtKeywords: shirtKeywordInputs,
          confirmedLegacyRows: confirmedLegacyRows.length,
          legacyDraftRows: legacyDraftRows.length,
          manualEntry,
          draftVisual,
          generatedEntry,
          downstreamAfterMetadataActions: {
            manual: downstreamAfterMetadataActions.queries.includes(
              "новая ручная фраза smoke"
            ),
            generated: downstreamAfterMetadataActions.queries.includes(
              "сгенерированная фраза smoke"
            ),
          },
          islandkaMain: islandkaMainInput?.value ?? null,
          shirtVisibleForIslandka,
        },
        sibling: {
          migration: siblingMigration,
          goatStable:
            JSON.stringify(beforeSibling) === JSON.stringify(afterSibling),
          siblingCreated: Boolean(giftsRow.items[sibling.id]),
          activeKeys: Object.keys(giftsRow.items),
        },
        log: state.project._gate1ProductIdMigrationLog.find(
          (entry) => entry.id === GATE1_PAIN_PRODUCT_ID_STORAGE_V237
        ),
        keywordLog: state.project._gate1ProductIdMigrationLog.find(
          (entry) => entry.id === GATE1_PAIN_KEYWORD_METADATA_V238
        ),
      };
    })()`,
  );

  assert(result.catalogCount === 8, `Expected eight catalog products, got ${result.catalogCount}`);
  assert(result.active.length === 8, `Expected eight active semantic items, got ${result.active.length}`);
  assert(result.allActiveCanonical, "A non-product_id key remains active");
  assert(result.archive.length === 10, `Expected ten archived page snapshots, got ${result.archive.length}`);
  assert(
    result.archive.filter((item) => !item.value.mapped_product_id).length === 2,
    "Expected two preserved unmatched legacy items",
  );
  assert(result.shirtMain === shirtMain, `Unexpected Shirt main query: ${result.shirtMain}`);
  assert(result.shirtKeywords.length === 9, `Expected nine Shirt keywords, got ${result.shirtKeywords.length}`);
  assert(
    result.shirtKeywords.every(
      (keyword) => keyword.source === "manual" && keyword.status === "confirmed"
    ),
    "A legacy Shirt phrase is not manual/confirmed",
  );
  assert(new Set(result.shirtQueries).size === 10, "Shirt query split lost or duplicated a phrase");
  assert(
    JSON.stringify(result.shirtQueries) === JSON.stringify(result.shirtMirror),
    "semL3 compatibility mirror does not match mainQuery + keywords",
  );
  assert(result.allMappedDataPreserved, "A mapped item field changed or was lost");
  for (const sourceItem of sourcePageItems) {
    const archived = result.archive.find(
      (item) =>
        item.rowIndex === sourceItem.rowIndex && item.key === sourceItem.sourceKey,
    );
    assert(archived, `Legacy snapshot missing: ${sourceItem.sourceKey}`);
    assert(
      JSON.stringify(archived.value.data) === JSON.stringify(sourceItem.data),
      `Legacy snapshot changed: ${sourceItem.sourceKey}`,
    );
  }
  assert(
    result.downstreamShirt.itemKeys.length === 1 &&
      result.downstreamShirt.itemKeys[0] === shirtId,
    "Gate 4 semantic reader is not using the Shirt product_id key",
  );
  assert(
    result.downstreamShirt.containsAllQueries,
    "Gate 4 semantic reader lost one of the ten Shirt queries",
  );
  assert(result.rerun1.changed === false && result.rerun2.changed === false, "Migration rerun changed data");
  assert(
    result.keywordRerun1.changed === false && result.keywordRerun2.changed === false,
    "Keyword metadata migration rerun changed data",
  );
  assert(result.idempotent, "Migration or audit log is not idempotent");
  assert(result.ui.shirtMain === shirtMain, "Gate 1 UI does not show canonical Shirt main query");
  assert(result.ui.shirtKeywords.length === 9, "Gate 1 UI does not show nine Shirt keywords");
  assert(result.ui.confirmedLegacyRows === 9, "Legacy confirmed keyword rows changed appearance/metadata");
  assert(result.ui.legacyDraftRows === 0, "A legacy confirmed phrase is styled as draft");
  assert(
    result.ui.manualEntry.value === "новая ручная фраза smoke" &&
      result.ui.manualEntry.source === "manual" &&
      result.ui.manualEntry.status === "confirmed",
    "A newly typed phrase is not manual/confirmed",
  );
  assert(
    result.ui.draftVisual.row &&
      result.ui.draftVisual.isDraft &&
      result.ui.draftVisual.badge === "Черновик" &&
      result.ui.draftVisual.confirm,
    `Generated draft phrase is not visibly marked or confirmable: ${JSON.stringify(result.ui.draftVisual)}`,
  );
  assert(
    result.ui.generatedEntry.value === "сгенерированная фраза smoke" &&
      result.ui.generatedEntry.source === "generated" &&
      result.ui.generatedEntry.status === "confirmed",
    "One-click confirmation did not preserve generated source and set confirmed status",
  );
  assert(
    result.ui.downstreamAfterMetadataActions.manual &&
      result.ui.downstreamAfterMetadataActions.generated,
    "Gate 4 reader lost object-backed keyword text",
  );
  assert(result.ui.islandkaMain === "", "Islandka received Shirt semantics");
  assert(!result.ui.shirtVisibleForIslandka, "Shirt remained visible after selecting Islandka");
  assert(result.sibling.goatStable, "Adding a sibling orphaned or changed Goat semantics");
  assert(result.sibling.siblingCreated, "New product did not receive a product_id semantic item");
  assert(result.sibling.activeKeys.includes(goatId), "Goat product_id key disappeared");
  assert(result.log?.runs?.[0]?.mappings?.length === 8, "Audit log did not record eight mappings");
  assert(
    result.keywordLog?.runs?.[0]?.keywords === 9 &&
      result.keywordLog.runs[0].legacyStrings === 9,
    "Keyword metadata audit log did not record nine legacy strings",
  );

  console.log(
    JSON.stringify(
      {
        status: "ok",
        migrated: result.log.runs[0].mappings.length,
        activeProductItems: result.active.length,
        archivedLegacyItems: result.archive.length,
        archivedUnmatched: result.archive.filter(
          (item) => !item.value.mapped_product_id,
        ).length,
        shirt: {
          mainQuery: result.shirtMain,
          keywordCount: result.shirtKeywords.length,
          totalQueries: result.shirtQueries.length,
        },
        keywordMetadata: {
          legacyManualConfirmed: result.ui.confirmedLegacyRows,
          newManualConfirmed: result.ui.manualEntry.status === "confirmed",
          draftVisual: result.ui.draftVisual,
          confirmedGeneratedSourcePreserved:
            result.ui.generatedEntry.source === "generated",
          gate4Compatible:
            result.ui.downstreamAfterMetadataActions.manual &&
            result.ui.downstreamAfterMetadataActions.generated,
        },
        islandkaIsolated: result.ui.islandkaMain === "",
        siblingStability: result.sibling.goatStable,
        idempotent: result.idempotent,
      },
      null,
      2,
    ),
  );
} finally {
  page?.close();
  browser?.close();
}
