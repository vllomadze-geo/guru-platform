const port = process.env.GURU_CHROME_DEBUG_PORT || "9371";
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
  close() { this.socket.close(); }
}

async function evaluate(page, expression) {
  const response = await page.call("Runtime.evaluate", {
    expression, returnByValue: true, awaitPromise: true,
  });
  if (response.exceptionDetails) throw new Error(
    response.exceptionDetails.exception?.description || response.exceptionDetails.text,
  );
  return response.result.value;
}

async function waitFor(page, expression) {
  for (let i = 0; i < 200; i += 1) {
    if (await evaluate(page, `Boolean(${expression})`)) return;
    await wait(100);
  }
  throw new Error(`Timed out: ${expression}`);
}

const browserVersion = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
const browser = new CdpClient(browserVersion.webSocketDebuggerUrl);
await browser.ready;
const { browserContextId } = await browser.call("Target.createBrowserContext");
const { targetId } = await browser.call("Target.createTarget", { url: "about:blank", browserContextId });
const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const page = new CdpClient(targets.find((target) => target.id === targetId).webSocketDebuggerUrl);
await page.ready;

try {
  await page.call("Runtime.enable");
  await page.call("Page.enable");
  await page.call("Page.addScriptToEvaluateOnNewDocument", { source: `{
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (input, init) => String(input).includes("/api/")
      ? Promise.resolve(new Response(JSON.stringify({ ok: true }), {
          status: 200, headers: { "Content-Type": "application/json" }
        })) : nativeFetch(input, init);
    window.__guruErrors = [];
    window.addEventListener("error", (event) => window.__guruErrors.push(event.message));
  }` });
  await page.call("Page.navigate", { url: appUrl });
  await waitFor(page, 'document.readyState === "complete" && typeof guruGate1SyncJtbdSourceV594 === "function"');

  const result = await evaluate(page, `(() => {
    const check = (value, message) => { if (!value) throw new Error(message); };
    const prepare = (name) => {
      state = structuredClone(window.GURU_SEED);
      state.project.id = "jtbd-source-smoke-" + name;
      activeProjectId = state.project.id;
      state.project.productRegistryV185 = [];
      state.project.catalogItemsV189 = [];
      state.project.gate0ScopedValuesV194 = [];
      const category = guruV189CreateCategory("Обувь", state);
      const products = ["Кроссовки", "Ботинки"].map((title, index) => ({
        id: "jtbd-source-" + name + "-" + index, name: title,
        categoryId: category.id, continuum: "pure_product",
        createdAt: new Date().toISOString(),
      }));
      guruV189CatalogItems(state).push(...products);
      products.forEach((product) =>
        megaPlatformSetProductCategoryIds(product.id, [category.id], state));
      guruV194Ui(state).selectedProductId = products[0].id;
      return { category, products };
    };
    const record = (product, value, scope = "product", categoryId = "") => ({
      id: makeId("jtbd-smoke"), project_id: state.project.id,
      category_id: categoryId, product_id: scope === "product" ? product.id : "",
      scope, field: "jtbd", value,
      source: { type: "manual", label: "Smoke" }, confirmation_status: "confirmed",
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    });
    const item = (additional) => ({
      semL4Model: { mainJtbd: "Старый основной", additionalJtbds: additional },
      semL3Groups: [], demandRows: [],
    });
    const extra = (id, situation, action, result = "") => ({
      id, situation, desired_action: action, result, source: "manual",
    });
    const first = prepare("blank");
    guruV194Records(state).push(record(first.products[0], "Основной из Gate 0"));
    const blanks = item([extra("empty-1", "", ""), extra("empty-2", "", "")]);
    guruGate1SyncJtbdSourceV594(first.products[0].id, blanks);
    check(guruV194Resolve("jtbd", first.products[0], state).records.length === 1,
      "Blank Gate 1 drafts inflated Gate 0 count");
    check(blanks.semL4Model.additionalJtbds.length === 0 &&
      blanks.gate0JtbdLegacyArchiveV594.length === 2, "Blank drafts were lost or counted");
    const blankHtml = pv181JtbdModelHtml(0, first.products[0].id, blanks,
      { title: "Уровень II — Основной и дополнительные JTBD", hints: [] });
    check(blankHtml.includes("JTBD · 1 из 4") &&
      !blankHtml.includes("data-pv181-additional-jtbd-v268="), "Gate 1 blank count differs");
    check(guruV194FieldHtml("jtbd", first.products[0]).includes("JTBD · 1 из 4"),
      "Gate 0 count differs");

    const second = prepare("filled");
    guruV194Records(state).push(record(second.products[0], "Основной из Gate 0"));
    const filled = item([
      extra("legacy-a", "Испачкались", "Очистить", "Вернуть вид"),
      extra("legacy-b", "Износились", "Восстановить", "Продлить срок"),
    ]);
    filled.semL3Groups.push({ id: "group-a", mainQuery: "чистка кроссовок",
      keywords: [], additionalJtbdIdV268: "legacy-a" });
    guruGate1SyncJtbdSourceV594(second.products[0].id, filled);
    const afterImport = guruV194Resolve("jtbd", second.products[0], state).records;
    check(afterImport.length === 3 && filled.semL4Model.additionalJtbds.length === 2,
      "Filled legacy JTBD were not migrated into Gate 0");
    check(filled.semL3Groups[0].additionalJtbdIdV268 === "legacy-a" &&
      filled.semL4Model.additionalJtbds[0].id === "legacy-a", "Keyword-group link changed");
    guruGate1SyncJtbdSourceV594(second.products[0].id, filled);
    check(guruV194Resolve("jtbd", second.products[0], state).records.length === 3,
      "Migration is not idempotent");
    const filledHtml = pv181JtbdModelHtml(0, second.products[0].id, filled,
      { title: "Уровень II — Основной и дополнительные JTBD", hints: [] });
    check(filledHtml.includes("JTBD · 3 из 4") &&
      filledHtml.includes("Когда Испачкались") &&
      filledHtml.includes("Когда Износились") &&
      filledHtml.includes("Открыть JTBD в Gate 0") &&
      !filledHtml.includes("data-pv181-jtbd-add"), "Gate 1 source view is stale");
    const edited = guruV194Records(state).find((row) => row.id === "legacy-a");
    edited.jtbd.situation = "После дождя";
    edited.value = guruV194JtbdSentence(edited.jtbd);
    guruGate1SyncJtbdSourceV594(second.products[0].id, filled);
    check(filled.semL4Model.additionalJtbds[0].situation === "После дождя",
      "Gate 0 edit did not reach Gate 1");
    state.painV130 = state.painV130 || {};
    state.painV130.productMaps = [{ product: "Обувь", items: {
      [second.products[0].id]: filled,
    } }];
    filled.product_id = second.products[0].id;
    filled.demandRows.push(
      { kw: "новогодний подарок", finalFoundationImportedAtV259: "smoke" },
      { kw: "чистка кроссовок", finalFoundationImportedAtV259: "smoke" },
    );
    filled.jtbdKeywordAssignmentsV274 = {
      "новогодний подарок": { target: "primary" },
      "чистка кроссовок": { target: "additional", additional_jtbd_id: "legacy-a" },
    };
    const canonicalProduct = guruV194Product(second.products[0].id, state);
    const strategicBefore = guruStrategicFoundationModelV286(canonicalProduct);
    guruStrategicFoundationUiV286(state, true).primaryByContext[
      strategicBefore.contextKey] = "gate1:legacy-a";
    const strategic = guruStrategicFoundationModelV286(canonicalProduct);
    const strategicHtml = guruStrategicFoundationHtmlV237(canonicalProduct);
    check(strategic.primaryId === "gate0:" + afterImport[0].id &&
      strategic.descriptors.length === 3 &&
      strategic.descriptors[0].id === strategic.primaryId &&
      strategic.descriptors[0].entries.length === 1 &&
      strategic.descriptors.find((entry) => entry.id === "gate1:legacy-a")?.entries.length === 1 &&
      strategic.keywordModel.unlinked.length === 0 &&
      !strategicHtml.includes("Выберите основной JTBD") &&
      strategicHtml.includes("№1 · Основной JTBD"),
      "Strategic foundation lost the Gate 0 primary, duplicated JTBD, or detached phrases");
    check(!guruStrategicFoundationModelV286(guruV194Product(
      second.products[1].id, state)).primaryId,
      "Strategic foundation leaked the selected product JTBD into a sibling product");
    state = JSON.parse(JSON.stringify(state));
    const reloaded = state.painV130.productMaps[0].items[second.products[0].id];
    guruGate1SyncJtbdSourceV594(second.products[0].id, reloaded);
    check(guruV194Resolve("jtbd", second.products[0], state).records.length === 3,
      "Serialized reload duplicated JTBD");
    check(reloaded.semL4Model.additionalJtbds.length === 2 &&
      reloaded.semL4Model.additionalJtbds[0].situation === "После дождя",
      "Serialized reload lost the canonical JTBD projection");
    const removedIndex = guruV194Records(state).findIndex((row) => row.id === "legacy-b");
    guruV194Records(state).splice(removedIndex, 1);
    guruGate1SyncJtbdSourceV594(second.products[0].id, reloaded);
    check(guruV194Resolve("jtbd", second.products[0], state).records.length === 2 &&
      reloaded.semL4Model.additionalJtbds.length === 1 &&
      reloaded.gate0JtbdLegacyArchiveV594.some((row) => row.id === "legacy-b"),
      "Deleting a Gate 0 JTBD did not update Gate 1 while preserving legacy data");
    guruGate1SyncJtbdSourceV594(second.products[0].id, reloaded);
    check(guruV194Resolve("jtbd", second.products[0], state).records.length === 2,
      "Deleted JTBD reappeared after a second read");

    const third = prepare("inherited");
    guruV194Records(state).push(record(third.products[0], "Общий основной", "category", third.category.id));
    const inherited = item([extra("legacy-inherited", "Обувь загрязнилась", "Очистить обувь")]);
    guruGate1SyncJtbdSourceV594(third.products[0].id, inherited);
    check(guruV194Resolve("jtbd", third.products[0], state).records.length === 2 &&
      guruV194Resolve("jtbd", third.products[1], state).records.length === 1,
      "Product legacy JTBD changed sibling's category source");

    const fourth = prepare("dedup");
    guruV194Records(state).push(record(fourth.products[0], "Основной из Gate 0"));
    const same = extra("old-link-id", "Нужна чистка", "Почистить", "Вернуть вид");
    const sameText = guruV194JtbdSentence(same);
    const existing = record(fourth.products[0], sameText);
    existing.jtbd = { situation: same.situation,
      desired_action: same.desired_action, result: same.result };
    guruV194Records(state).push(existing);
    const deduped = item([same]);
    deduped.semL3Groups.push({ id: "old-group", mainQuery: "чистка обуви",
      keywords: [], additionalJtbdIdV268: same.id });
    guruGate1SyncJtbdSourceV594(fourth.products[0].id, deduped);
    check(guruV194Resolve("jtbd", fourth.products[0], state).records.length === 2 &&
      deduped.semL4Model.additionalJtbds[0].id === same.id &&
      deduped.semL4Model.additionalJtbds[0].gate0_record_id === existing.id,
      "Equivalent JTBD duplicated or changed its keyword-group identity");

    const fifth = prepare("group");
    guruV194Records(state).push(record(fifth.products[0], "Основной из Gate 0"));
    const grouped = item([]);
    grouped.demandRows.push({ kw: "чистка кроссовок", queryCount: "50" });
    guruGate1SyncJtbdSourceV594(fifth.products[0].id, grouped);
    check(guruGate1ConfirmGroupingDraftV266(fifth.products[0].id, grouped, {
      mainQuery: "чистка кроссовок", phrases: [{ value: "чистка кроссовок", queryCount: 50 }],
    }), "Confirming a keyword group did not create a canonical JTBD");
    guruGate1SyncJtbdSourceV594(fifth.products[0].id, grouped);
    check(guruV194Resolve("jtbd", fifth.products[0], state).records.length === 2 &&
      grouped.semL4Model.additionalJtbds.length === 1 &&
      grouped.semL3Groups[0].additionalJtbdIdV268 === grouped.semL4Model.additionalJtbds[0].id,
      "Confirmed keyword group was not linked to the Gate 0 JTBD");
    const legacyOnly = item([extra("legacy-only", "Старая ситуация", "Старое действие")]);
    const legacyHtml = guruGate1AdditionalJtbdsHtmlV268(0, "unknown-page-row", legacyOnly);
    check(legacyHtml.includes("data-pv181-jtbd-part-v268") &&
      legacyHtml.includes("data-pv181-jtbd-add"),
      "Unmapped legacy Gate 1 rows lost their existing editor");
    state.painV130 = state.painV130 || {};
    state.painV130.productMaps = [{ product: "Обувь", items: {
      [fifth.products[0].id]: grouped,
    } }];
    localStorage.clear();
    localStorage.setItem("guru-platform-access-v01", "unlocked");
    localStorage.setItem("guru-platform-projects-v02", JSON.stringify([{
      id: state.project.id, name: "JTBD source smoke", lifecycleStatus: "active",
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }]));
    localStorage.setItem("guru-platform-workspace-v02-" + state.project.id,
      JSON.stringify(state));
    return { blank: 1, filled: afterImport.length, inherited: 2,
      sibling: 1, group: 2, archivedBlankDrafts: blanks.gate0JtbdLegacyArchiveV594.length,
      reloadProductId: fifth.products[0].id, reloadProjectId: state.project.id,
      errors: window.__guruErrors };
  })()`);
  if (result.errors.length) throw new Error(result.errors.join("; "));
  await page.call("Page.navigate", { url: appUrl });
  await waitFor(page, 'document.querySelector("[data-open-project]")');
  await evaluate(page, 'document.querySelector("[data-open-project]").click(); true');
  await waitFor(page, `state?.project?.id === ${JSON.stringify(result.reloadProjectId)}`);
  const hardReload = await evaluate(page, `(() => {
    const productId = ${JSON.stringify(result.reloadProductId)};
    const product = guruV194Product(productId, state);
    const records = guruV194Resolve("jtbd", product, state).records;
    const context = guruGate1FinalPainContextV259(product, false);
    if (!context) return { error: "Gate 1 product context missing", count: records.length };
    const itemData = pv181ItemData(context.row, productId);
    const html = pv181JtbdModelHtml(context.mapIndex, productId, itemData,
      { title: "Уровень II — Основной и дополнительные JTBD", hints: [] });
    return { count: records.length, additional: itemData.semL4Model.additionalJtbds.length,
      main: records[0]?.value, countVisible: html.includes("JTBD · 2 из 4"),
      errors: window.__guruErrors };
  })()`);
  if (hardReload.count !== 2 || hardReload.additional !== 1 ||
      !hardReload.countVisible || hardReload.errors.length)
    throw new Error(`Hard reload changed JTBD source: ${JSON.stringify(hardReload)}`);
  const sourceJump = await evaluate(page, `(() => {
    const productId = ${JSON.stringify(result.reloadProductId)};
    const context = guruGate1FinalPainContextV259(guruV194Product(productId, state), false);
    const probe = document.createElement("div");
    probe.innerHTML = guruGate1AdditionalJtbdsHtmlV268(
      context.mapIndex, productId, context.itemData);
    document.body.append(probe);
    probe.querySelector("[data-g4-jump-target]").click();
    return { gate: activeGateId, selectedProductId: guruV194Ui(state).selectedProductId,
      errors: window.__guruErrors };
  })()`);
  if (sourceJump.gate !== "gate-0" ||
      sourceJump.selectedProductId !== result.reloadProductId || sourceJump.errors.length)
    throw new Error(`Gate 1 source link failed: ${JSON.stringify(sourceJump)}`);
  await wait(700);
  sourceJump.fieldRendered = await evaluate(page,
    'Boolean(document.querySelector(\'[data-gate0-scope-field-row="jtbd"]\'))');
  if (!sourceJump.fieldRendered)
    throw new Error(`Gate 0 JTBD field did not render after source jump: ${JSON.stringify(sourceJump)}`);
  console.log(JSON.stringify({ ok: true, ...result, hardReload, sourceJump }, null, 2));
} finally {
  page.close();
  await browser.call("Target.disposeBrowserContext", { browserContextId });
  browser.close();
}
