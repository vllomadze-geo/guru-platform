/* Technical SEO belongs to the existing Gate 2 services. Gate 1 is an archive.
   Migration runs at workspace loading, never from a renderer or a getter. */
const G2_SEO_CARDS = Object.freeze({
  "company-domain": ["card-16", "card-20"],
  "company-webmaster": ["card-13", "card-14", "card-17", "card-18", "card-19"],
});
const G2_SEO_ARCHIVED_IDS = new Set(Object.values(G2_SEO_CARDS).flat());
const G2_SEO_OLD_CHECKS = new Set(["card-97", "card-98", "card-107", "card-108", "card-109", "card-110", "card-111", "g2-cwv", "g2-canonical"]);
const G2_SEO_PAGE_FIELDS = ["metaRobotsStatus", "cwvStatus", "imagesStatus", "auditEvidence", "cwvData"];
let g2SeoProjecting = false;
let g2SeoMigrating = false;
let g2SeoPreparingPage = false;
const g2SeoClone = (value) => value === undefined ? undefined : structuredClone(value);
const g2SeoGate1 = (workspace) => workspace?.gates?.find(gate => gate.id === "gate-1");
const g2SeoRecord = (id, productId = "", workspace = state) =>
  g2ServiceBlockRecord(G2_SERVICE_BLOCK_CONFIGS.get(id), productId, false, workspace);
const g2SeoStore = (id, productId = "", workspace = state) => g2SeoRecord(id, productId, workspace)?.technicalSeoV1;
const g2SeoPageKey = (card, row) => `${card.id}:${row.id}`;
function g2SeoEmpty(value) {
  return value === undefined || value === null || value === "" ||
    typeof value === "object" && !Object.keys(value).length;
}
function g2SeoMerge(target, source, path, conflicts) {
  if (g2SeoEmpty(target)) return g2SeoClone(source);
  if (g2SeoEmpty(source)) return g2SeoClone(target);
  if (JSON.stringify(target) === JSON.stringify(source)) return g2SeoClone(target);
  if (Array.isArray(target) || Array.isArray(source) || typeof target !== "object" || typeof source !== "object") {
    conflicts.push({ path, gate2: g2SeoClone(target), gate1: g2SeoClone(source) });
    return g2SeoClone(target);
  }
  const result = g2SeoClone(target);
  for (const [key, value] of Object.entries(source)) result[key] = g2SeoMerge(target[key], value, `${path}.${key}`, conflicts);
  return result;
}
function g2SeoMigrationPlan(workspace) {
  if (g2SeoStore("company-webmaster", "", workspace)?.migrated === true) return { changes: [], conflicts: [] };
  const gate = g2SeoGate1(workspace), changes = [], conflicts = [];
  if (!gate || !g2wGate(workspace)) return { changes, conflicts };
  const payloads = new Map();
  const payload = (id, productId = "") => {
    const key = `${id}:${productId}`;
    if (!payloads.has(key)) payloads.set(key, { id, productId, data: { schema: 1 } });
    return payloads.get(key).data;
  };
  for (const [id, ids] of Object.entries(G2_SEO_CARDS)) {
    const data = payload(id); data.cards = {};
    for (const card of gate.cards || []) if (ids.includes(card.id)) data.cards[card.id] = g2SeoClone(card);
  }
  const products = workspace.project?.catalogItemsV189 || [];
  for (const product of products) {
    if (!product.id) continue;
    const data = payload("product-landing", product.id);
    if (product.webmasterV298 !== undefined) data.webmasterV298 = g2SeoClone(product.webmasterV298);
  }
  for (const card of gate.cards || []) for (const row of card.pageRows || []) {
    if (!G2_SEO_PAGE_FIELDS.some(key => row[key] !== undefined)) continue;
    if (!row.id) {
      conflicts.push({ path: `gate-1.${card.id}.pageRows`, reason: "У строки технической проверки нет стабильного id", name: row.name });
      continue;
    }
    const productId = row.catalogItemIdV189 || "";
    // Orphaned product rows retain their original product_id. They are copied
    // losslessly, but never attached to a different/current product.
    const data = payload(productId ? "product-landing" : "company-webmaster", productId);
    data.pages ||= {};
    data.pages[g2SeoPageKey(card, row)] = { cardId: card.id, rowId: row.id, product_id: productId,
      ...Object.fromEntries(G2_SEO_PAGE_FIELDS.filter(key => row[key] !== undefined).map(key => [key, g2SeoClone(row[key])])) };
  }
  for (const { id, productId, data } of payloads.values()) {
    const config = G2_SERVICE_BLOCK_CONFIGS.get(id);
    if (!g2wCard({ cardId: config.cardId }, workspace)) {
      conflicts.push({ path: `gate-2.${config.cardId}`, reason: "Нет карточки существующего сервисного блока" });
      continue;
    }
    const value = g2SeoMerge(g2SeoStore(id, productId, workspace), data, `${id}.${productId || "company"}.technicalSeoV1`, conflicts);
    changes.push({ id, productId, value });
  }
  return { changes, conflicts };
}
function g2SeoMigrate(workspace) {
  const plan = g2SeoMigrationPlan(workspace);
  for (const change of plan.changes) {
    const config = G2_SERVICE_BLOCK_CONFIGS.get(change.id);
    g2ServiceBlockRecord(config, change.productId, true, workspace).technicalSeoV1 = change.value;
  }
  if (plan.changes.length) {
    const store = g2SeoStore("company-webmaster", "", workspace);
    store.migrationConflicts = g2SeoClone(plan.conflicts);
    store.migrated = true;
  }
  return workspace;
}

// Keep archived cards and technical page values byte-for-byte across legacy
// normalizers. The complete workspace is staged before the atomic migration.
const g2SeoPreviousMigrate = migrateWorkspace;
migrateWorkspace = function (workspace, projectId) {
  const source = g2SeoClone(workspace);
  g2SeoMigrating = true;
  let migrated;
  try { migrated = g2SeoPreviousMigrate.call(this, g2SeoClone(workspace), projectId); }
  finally { g2SeoMigrating = false; }
  const originals = new Map((g2SeoGate1(source)?.cards || []).map(card => [card.id, card]));
  const gate = g2SeoGate1(migrated);
  if (gate) gate.cards = gate.cards.map(card => {
    const original = originals.get(card.id);
    if (!original) return card;
    if (G2_SEO_ARCHIVED_IDS.has(card.id)) return original;
    for (const row of card.pageRows || []) {
      const saved = original.pageRows?.find(item => item.id === row.id);
      if (!saved) continue;
      for (const key of G2_SEO_PAGE_FIELDS) {
        if (Object.hasOwn(saved, key)) row[key] = g2SeoClone(saved[key]);
        else delete row[key];
      }
    }
    return card;
  });
  for (const product of migrated.project?.catalogItemsV189 || []) {
    const original = source.project?.catalogItemsV189?.find(item => item.id === product.id);
    if (!original) continue;
    if (Object.hasOwn(original, "webmasterV298")) product.webmasterV298 = g2SeoClone(original.webmasterV298);
    else delete product.webmasterV298;
  }
  // The retired tool stays at its original key as an untouched archive.
  if (Object.hasOwn(source, "gate1SeoInteractiveToolV305"))
    migrated.gate1SeoInteractiveToolV305 = g2SeoClone(source.gate1SeoInteractiveToolV305);
  else delete migrated.gate1SeoInteractiveToolV305;
  return g2SeoMigrate(migrated);
};
const g2SeoPreviousFresh = createFreshWorkspace;
createFreshWorkspace = function () {
  const nested = g2SeoMigrating;
  g2SeoMigrating = true;
  let workspace;
  try { workspace = g2SeoPreviousFresh.apply(this, arguments); }
  finally { g2SeoMigrating = nested; }
  return nested ? workspace : g2SeoMigrate(workspace);
};

function g2SeoProject(view) {
  const gate = g2SeoGate1(view);
  if (!gate) return;
  const cards = Object.assign({}, ...Object.keys(G2_SEO_CARDS).map(id => g2SeoStore(id, "", view)?.cards || {}));
  gate.cards = gate.cards.map(card => {
    if (G2_SEO_ARCHIVED_IDS.has(card.id)) return g2SeoClone(cards[card.id] || { id: card.id, title: card.title, fields: {} });
    return { ...card, ...(card.pageRows ? { pageRows: card.pageRows.map(row => {
      const productId = row.catalogItemIdV189 || "";
      const data = g2SeoStore(productId ? "product-landing" : "company-webmaster", productId, view)?.pages?.[g2SeoPageKey(card, row)] || {};
      const result = { ...row };
      for (const key of G2_SEO_PAGE_FIELDS) {
        if (Object.hasOwn(data, key)) result[key] = g2SeoClone(data[key]);
        else delete result[key];
      }
      return result;
    }) } : {}) };
  });
  view.project.catalogItemsV189 = (view.project.catalogItemsV189 || []).map(product => ({ ...product,
    webmasterV298: g2SeoClone(g2SeoStore("product-landing", product.id, view)?.webmasterV298 || {}) }));
}
function g2SeoRead(calculate, workspace = state) {
  if (g2SeoProjecting) return calculate(workspace);
  const collector = guruReadinessCollector;
  let failure;
  const result = nowGuideGate12Read(view => {
    // Projection is local to this call, including when the outer readiness pass
    // already has a private view. Other Gate 1 calculations keep the archive.
    const gate = g2SeoGate1(view), cards = gate?.cards, products = view.project?.catalogItemsV189;
    g2SeoProjecting = true;
    try { g2SeoProject(view); return calculate(view); }
    catch (error) { failure = error; throw error; }
    finally {
      if (gate) gate.cards = cards;
      if (view.project) view.project.catalogItemsV189 = products;
      g2SeoProjecting = false;
    }
  }, workspace);
  if (result.unresolved) throw failure || new Error("Не удалось прочитать технический SEO Gate 2");
  // Keep the caller's readiness trace, so the guide can point to unfinished
  // service steps while calculations still run against an isolated view.
  if (collector) collector.push(...result.missing);
  return result.status;
}

const g2SeoOriginal = {
  ssl: sslV130CardStatus, redirects: redirectV130CardStatus, cwv: cwvBlockStatus,
  webmaster: gate1WebmasterFieldStatusV295,
  sslHtml: sslV130FieldsHtml, redirectHtml: redirectV130FieldsHtml,
  robotsHtml: robotsV130FieldsHtml, cwvHtml: v22TechnicalControlHtml,
  webmasterCompanyHtml: gate1WebmasterCompanyHtmlV295, webmasterProductHtml: gate1WebmasterProductHtmlV295,
};
function g2SeoCombine(statuses) {
  if (!statuses.length) return "not_started";
  if (statuses.some(status => ["problem", "needs_attention"].includes(status))) return "problem";
  if (statuses.every(status => ["ready", "not_required", "not_needed"].includes(status))) return "ready";
  return statuses.some(status => status !== "not_started") ? "in_progress" : "not_started";
}
function g2SeoRows(productId, view) {
  return (g2SeoGate1(view)?.cards || []).flatMap(card => (card.pageRows || [])
    .filter(row => (row.catalogItemIdV189 || "") === productId && row.pageNeeded !== "not_needed")
    .map(row => ({ card, row, index: card.pageRows.indexOf(row) })));
}
function g2SeoAuditValue(value) {
  return value === "ok" ? "ready" : ["error", "closed", "improve"].includes(value) ? "problem" : "not_started";
}
function g2SeoSnapshot(productId = "", workspace = state) {
  if (!nowGuideReadPass) return nowGuideWithReadPass(() => g2SeoSnapshot(productId, workspace));
  let cache = nowGuideReadPass.get("g2-technical-seo");
  if (!cache) nowGuideReadPass.set("g2-technical-seo", cache = new WeakMap());
  let products = cache.get(workspace);
  if (!products) cache.set(workspace, products = new Map());
  if (products.has(productId)) return products.get(productId);
  const snapshot = g2SeoRead(view => {
    const card = id => g2SeoGate1(view)?.cards?.find(item => item.id === id);
    const rows = g2SeoRows(productId, view);
    const product = view.project?.catalogItemsV189?.find(item => item.id === productId);
    return {
      https: card("card-20") ? g2SeoOriginal.ssl(card("card-20")) : "not_started",
      redirect: card("card-16") ? g2SeoOriginal.redirects(card("card-16")) : "not_started",
      rights: g2SeoOriginal.webmaster("verification", view),
      robots: g2SeoOriginal.webmaster("robots", view),
      sitemap: g2SeoOriginal.webmaster("sitemap", view),
      pages: g2SeoOriginal.webmaster("indexing_company", view),
      advice: g2SeoOriginal.webmaster("crawl_errors", view),
      indexing: product?.webmasterV298?.landingIndexed === "yes" ? "ready"
        : product?.webmasterV298?.landingIndexed === "no" ? "problem" : "not_started",
      cwv: g2SeoCombine(rows.map(({ row }) => g2SeoOriginal.cwv(row))),
      meta: g2SeoCombine(rows.map(({ row }) => g2SeoAuditValue(row.metaRobotsStatus))),
      images: g2SeoCombine(rows.map(({ row }) => g2SeoAuditValue(row.imagesStatus))),
    };
  }, workspace);
  products.set(productId, snapshot);
  return snapshot;
}

// Compatibility readers resolve to Gate 2. The archive is used only while
// running the previous migrations or inside our private calculation view.
for (const name of ["gate1WebmasterVerificationStatusV295", "gate1WebmasterSitemapStatusV295",
  "gate1WebmasterRobotsStatusV295", "gate1WebmasterErrorsStatusV295", "gate1WebmasterIndexAggregateV295",
  "gate1WebmasterOverallV295", "gate1SeoCanonicalSitemapStatusV298", "gate1SeoCanonicalRobotsStatusV298"]) {
  const previous = window[name];
  window[name] = function (workspace = state) {
    if (g2SeoProjecting || g2SeoMigrating) return previous.apply(this, arguments);
    return g2SeoRead(view => previous.call(this, view), workspace);
  };
}
const g2SeoPreviousMeta = gate1SeoCanonicalCompanyMetaV298;
const g2SeoPreviousCanonicalCards = gate1SeoCanonicalCardsV298;
gate1SeoCanonicalCardsV298 = function (workspace = state) {
  if (g2SeoProjecting || g2SeoMigrating) return g2SeoPreviousCanonicalCards.apply(this, arguments);
  const source = g2SeoPreviousCanonicalCards(workspace);
  const saved = Object.assign({}, ...Object.keys(G2_SEO_CARDS).map(id => g2SeoStore(id, "", workspace)?.cards || {}));
  const cards = (source.gate?.cards || []).map(card => G2_SEO_ARCHIVED_IDS.has(card.id)
    ? g2SeoClone(saved[card.id] || { id: card.id, title: card.title, fields: {} }) : card);
  return { gate: source.gate ? { ...source.gate, cards } : null,
    audit: cards.find(card => card.id === "card-13") || null,
    robots: cards.find(card => card.id === "card-14") || null, sitemap: source.sitemap };
};
gate1SeoCanonicalCompanyMetaV298 = function (workspace = state, create = true) {
  if (g2SeoProjecting || g2SeoMigrating) return g2SeoPreviousMeta.apply(this, arguments);
  return g2SeoClone(g2SeoStore("company-webmaster", "", workspace)?.cards?.["card-13"]?.webmasterCompanyV298 || {});
};
const g2SeoPreviousProduct = gate1SeoCanonicalProductV298;
gate1SeoCanonicalProductV298 = function (productId, workspace = state, create = true) {
  if (g2SeoProjecting || g2SeoMigrating) return g2SeoPreviousProduct.apply(this, arguments);
  return g2SeoClone(g2SeoStore("product-landing", productId, workspace)?.webmasterV298 || {});
};
sslV130CardStatus = function (card) {
  return g2SeoMigrating || g2SeoProjecting ? g2SeoOriginal.ssl(card) : g2SeoSnapshot().https;
};
redirectV130CardStatus = function (card) {
  return g2SeoMigrating || g2SeoProjecting ? g2SeoOriginal.redirects(card) : g2SeoSnapshot().redirect;
};

// Gate 1 page readiness now describes preparation. Technical checks have
// their own status in Gate 2, without altering the saved page values.
cwvBlockStatus = function (row) {
  if (g2SeoMigrating || g2SeoProjecting) return g2SeoOriginal.cwv(row);
  if (g2SeoPreparingPage) return "ready";
  return g2SeoRead(view => {
    const source = g2SeoGate1(view)?.cards?.flatMap(card => card.pageRows || []).find(item => item.id && item.id === row?.id);
    return g2SeoOriginal.cwv(source || g2SeoClone(row));
  });
};
const g2SeoPreviousPageStatus = pageStructureStatus;
pageStructureStatus = function (row) {
  if (g2SeoMigrating || g2SeoProjecting) return g2SeoPreviousPageStatus.apply(this, arguments);
  const previous = g2SeoPreparingPage; g2SeoPreparingPage = true;
  try {
    // Category and catalog readiness resolves the owning card by row identity.
    // Passing a copy would detach the row from its Platform URL and template.
    const owner = g2SeoGate1(state)?.cards?.find(card =>
      (card.id === "card-22" || card.id === "card-22-hub") &&
      card.pageRows?.includes(row));
    if (owner) return guruCatalogAuditPageStatusV493(row, owner);
    // Other page templates still need a private technical-field projection.
    // Carry the canonical Platform URL into it because the copy has no owner.
    const status = g2SeoPreviousPageStatus.call(this, { ...row,
      url: megaPlatformAuditRowUrl(row) || row?.url,
      contextFields: { ...row?.contextFields },
      metaRobotsStatus: "ok", cwvStatus: "ok", imagesStatus: "ok",
      auditEvidence: "Техническая проверка в Gate 2" });
    if (status !== "not_started") return status;
    // A missing URL prevents completion, but content already entered on the
    // page must still count as work in progress.
    const entered = [row?.h1, row?.title, row?.description, row?.body,
      row?.offer, row?.finalCta,
      ...Object.entries(row?.contextFields || {})
        .filter(([key]) => !/__(?:mode|flag)$/.test(key))
        .map(([, value]) => value)]
      .some(value => typeof value === "string" ? value.trim().length > 0
        : Array.isArray(value) ? value.length > 0
          : value && typeof value === "object" ? Object.keys(value).length > 0
            : Boolean(value));
    return entered ? "in_progress" : "not_started";
  }
  finally { g2SeoPreparingPage = previous; }
};
const g2SeoPreviousCatalogStatus = guruCatalogAuditPageStatusV493;
guruCatalogAuditPageStatusV493 = function () {
  const previous = g2SeoPreparingPage; g2SeoPreparingPage = !g2SeoMigrating && !g2SeoProjecting;
  try { return g2SeoPreviousCatalogStatus.apply(this, arguments); }
  finally { g2SeoPreparingPage = previous; }
};
const g2SeoPreviousAuditRows = auditSummaryRows;
auditSummaryRows = function (type) {
  return g2SeoMigrating || g2SeoProjecting ? g2SeoPreviousAuditRows.apply(this, arguments)
    : g2SeoRead(() => g2SeoPreviousAuditRows(type));
};
const g2SeoPreviousExportAuditRows = guruExportGate1AuditRowsV359;
guruExportGate1AuditRowsV359 = function (workspace, kind) {
  if (g2SeoMigrating || g2SeoProjecting || !["meta_robots", "cwv", "images"].includes(kind))
    return g2SeoPreviousExportAuditRows.apply(this, arguments);
  return g2SeoRead(view => g2SeoPreviousExportAuditRows(view, kind), workspace);
};
const g2SeoPreviousRecalculate = recalculateStatusForCard;
recalculateStatusForCard = function (card, workspace = state) {
  if (!g2SeoMigrating && !g2SeoProjecting && G2_SEO_ARCHIVED_IDS.has(card?.id)) return;
  return g2SeoPreviousRecalculate.apply(this, arguments);
};

function g2SeoEditorHtml(kind, productId = "", workspace = state) {
  const html = g2SeoRead(view => {
    const cards = g2SeoGate1(view)?.cards || [];
    const card = id => cards.find(item => item.id === id);
    if (kind === "https") return g2SeoOriginal.sslHtml(card("card-20"));
    if (kind === "redirect") return g2SeoOriginal.redirectHtml(card("card-16"));
    if (kind === "robots") return g2SeoOriginal.robotsHtml(card("card-14"));
    if (kind === "rights" || kind === "advice") {
      const template = document.createElement("template");
      template.innerHTML = g2SeoOriginal.webmasterCompanyHtml();
      return template.content.querySelector(`[data-g1-webmaster-field="${kind === "rights" ? "verification" : "crawl_errors"}"]`)?.outerHTML || "";
    }
    if (kind === "indexing") {
      const data = view.project.catalogItemsV189.find(product => product.id === productId)?.webmasterV298 || {};
      return `<div class="g1-webmaster-fields-v295"><label><span>Страница в индексе</span><select class="g1-input" data-g1-webmaster-product-v295="landingIndexed"><option value="" ${!data.landingIndexed ? "selected" : ""}>Не проверено</option><option value="yes" ${data.landingIndexed === "yes" ? "selected" : ""}>Да</option><option value="no" ${data.landingIndexed === "no" ? "selected" : ""}>Нет</option></select></label><label><span>Когда и что проверялось</span><input class="g1-input" data-g1-webmaster-product-v295="checkedNote" value="${escapeAttr(data.checkedNote || "")}"></label></div>`;
    }
    if (kind === "sitemap") return '<p>URL и результаты Sitemap редактируются в проверке «robots.txt и Sitemap» этого блока.</p>';
    if (kind === "pages") {
      const aggregate = gate1WebmasterIndexAggregateV295(view);
      return `<p>${escapeHtml(aggregate.label)}</p><p>Результат для каждого продукта редактируется в блоке «Посадочная товара» ниже.</p>`;
    }
    const rows = g2SeoRows(productId, view);
    if (!rows.length) return '<p class="g2s4-empty">Страниц для проверки пока нет. Добавьте страницу в «Платформе» Gate 0.</p>';
    return rows.map(({ card, row, index }) => `<details class="instruction-toggle" data-g2seo-page="${escapeAttr(g2SeoPageKey(card, row))}"><summary>${escapeHtml(row.name || card.title)}</summary><div class="instruction-text">${kind === "cwv"
      ? g2SeoOriginal.cwvHtml(card, row, index)
      : `<label class="g1-field"><span>${kind === "meta" ? "Meta Robots" : "Изображения"}</span><select class="g1-input" data-gate1-page-field="${kind === "meta" ? "metaRobotsStatus" : "imagesStatus"}" data-gate1-page-card-id="${escapeAttr(card.id)}" data-gate1-page-index="${index}">${auditStatusOptions(row[kind === "meta" ? "metaRobotsStatus" : "imagesStatus"], kind === "meta" ? "meta" : "images")}</select></label>${kind === "meta" ? `<label class="g1-field"><span>Доказательство технического аудита</span><input class="g1-input" data-gate1-page-field="auditEvidence" value="${escapeAttr(row.auditEvidence || "")}" placeholder="Ссылка на отчёт или скриншот"></label>` : ""}`}</div></details>`).join("");
  }, workspace);
  const template = document.createElement("template"); template.innerHTML = html;
  const unifiedDomain = productId === "" && ["https", "redirect"].includes(kind) &&
    G2_SERVICE_BLOCK_CONFIGS.get("company-domain")?.layout === "unified";
  if (unifiedDomain) {
    // The block header owns the status. Keep all persisted inputs and checks.
    template.content.querySelectorAll(".ssl-v130-summary").forEach(node => node.remove());
    if (kind === "https") {
      template.content.querySelectorAll('select[data-ssl-v130-field]').forEach(select => {
        const sourceLabel = select.closest('label');
        const legend = sourceLabel?.querySelector('span')?.textContent || '';
        const group = document.createElement('fieldset');
        group.className = 'g2u-segments';
        const title = document.createElement('legend'); title.textContent = legend; group.append(title);
        const choices = document.createElement('div');
        choices.className = 'g2u-segment-options';
        for (const option of select.options) {
          const label = document.createElement('label');
          const input = document.createElement('input');
          input.type = 'radio'; input.name = `g2u-${kind}-${select.dataset.sslV130Field}`;
          input.value = option.value;
          input.dataset.sslV130Field = select.dataset.sslV130Field;
          input.checked = option.selected;
          const caption = document.createElement('span');
          caption.textContent = option.value ? option.textContent : 'Не задано';
          label.append(input, caption); choices.append(label);
        }
        group.append(choices); sourceLabel?.replaceWith(group);
      });
    }
    if (kind === "redirect") {
      template.content.querySelectorAll(".redirect-v130-table tbody tr").forEach(row => {
        const code = row.querySelector('[data-rdr-v130-col="code"]');
        const result = row.querySelector('[data-rdr-v130-col="result"]');
        const expected = row.children[1]?.textContent?.trim().slice(0, 3);
        const automatic = code?.value.trim() ? code.value.trim() === expected ? "Ок" : "Ошибка" : "Не проверено";
        const empty = result?.querySelector('option[value=""]');
        if (empty) empty.textContent = 'Авто';
        result?.insertAdjacentHTML("afterend", `<small class="g2u-derived-result">Авто: ${automatic}</small>`);
      });
    }
  }
  // New delegates own these inputs. Legacy Gate 1 listeners cannot write to
  // their archived cards, even when a field has focus during navigation.
  for (const node of template.content.querySelectorAll("*")) {
    const attrs = {};
    for (const attr of [...node.attributes]) if (/^data-(rv2|ssl-v130|rdr-v130|cwv|g1-webmaster-(company|product)-v295|gate1-page-)/.test(attr.name)) {
      attrs[attr.name] = attr.value; node.removeAttribute(attr.name);
    }
    if (Object.keys(attrs).length) node.setAttribute("data-g2seo-control", JSON.stringify(attrs));
  }
  const status = g2SeoSnapshot(productId, workspace)[kind];
  return `<div data-g2seo-editor="${kind}" data-g2seo-product="${escapeAttr(productId)}">${unifiedDomain ? "" : `<span class="status-pill status-${status}" data-g2seo-status>${escapeHtml(STATUS_LABELS[status] || "Не начато")}</span>`}${unifiedDomain ? template.innerHTML : template.innerHTML.replace(/\u2014/g, " · ")}</div>`;
}

const G2_SEO_STEPS = {
  "company-domain": { https: "SSL / HTTPS", redirect: "Канонический URL и редиректы" },
  "company-webmaster": { rights: "Подтверждение сайта", robots: "robots.txt и Sitemap", sitemap: "Sitemap", pages: "Индексация страниц", advice: "Ошибки обхода", meta: "Meta Robots", images: "Изображения", cwv: "Скорость / Core Web Vitals" },
  "product-landing": { meta: "Meta Robots", images: "Изображения", cwv: "Скорость / Core Web Vitals" },
};
for (const [id, checks] of Object.entries(G2_SEO_STEPS)) {
  // Historical Webmaster checks remain in the SEO store and projections; the
  // clean Webmaster workspace receives new steps only when they are defined.
  if (id === "company-webmaster") continue;
  const config = G2_SERVICE_BLOCK_CONFIGS.get(id);
  for (const [key, title] of Object.entries(checks)) {
    let step = config.steps.find(item => item.step_id === key);
    if (!step) { step = { step_id: key }; config.steps.push(step); }
    Object.assign(step, { what: step.what || title, where: step.where || "Техническая проверка в Gate 2.", how: step.how || "Результат рассчитывается по полям проверки.",
      resultType: "reference", existingFields: [],
      uiStatusResolver: id === "company-domain" ? ({ product_id, workspace }) => g2SeoSnapshot(product_id, workspace)[key] : undefined,
      doneResolver: ({ product_id, workspace }) => ["ready", "not_required", "not_needed"].includes(g2SeoSnapshot(product_id, workspace)[key]),
      customField: ({ product_id, workspace }) => g2SeoEditorHtml(key, product_id, workspace) });
  }
}
const g2SeoPreviousInputs = g2wInputs;
g2wInputs = function (def, productId = "", workspace = state) {
  const original = g2SeoPreviousInputs.apply(this, arguments);
  const id = { domain: "company-domain", webmaster: "company-webmaster", landing: "product-landing" }[def?.id];
  return id ? JSON.stringify([original, g2SeoStore(id, productId, workspace) || null]) : original;
};
const g2SeoPreviousWizardStatus = g2wStatus;
g2wStatus = function (def, productId = "", workspace = state) {
  const id = def?.id === "domain" ? "company-domain" : def?.id === "webmaster" ? "company-webmaster" : def?.id === "landing" ? "product-landing" : "";
  if (!id) return g2SeoPreviousWizardStatus.apply(this, arguments);
  return g2SeoRead(view => {
    const original = g2SeoPreviousWizardStatus.call(this, def, productId, view);
    if (original === "not_needed") return original;
    const snapshot = g2SeoSnapshot(productId, view);
    return Object.keys(G2_SEO_STEPS[id]).some(key => snapshot[key] === "problem") ? "problem" : original;
  }, workspace);
};
const g2SeoPreviousG2CardStatus = g2CardStatus;
g2CardStatus = function (card) {
  const key = { "card-97": "https", "card-98": "redirect", "card-107": "rights", "card-108": "sitemap",
    "card-109": "robots", "card-110": "pages", "card-111": "advice", "g2-cwv": "cwv", "g2-canonical": "redirect" }[card?.id];
  return key ? g2SeoSnapshot(key === "cwv" ? state?.project?.gate0ScopeUiV194?.selectedProductId || "" : "")[key] : g2SeoPreviousG2CardStatus.apply(this, arguments);
};
const g2SeoPreviousSource = g2ResolvedSourceV267;
g2ResolvedSourceV267 = function (card) {
  if (!G2_SEO_OLD_CHECKS.has(card?.id)) return g2SeoPreviousSource.apply(this, arguments);
  const id = ["card-97", "card-98", "g2-canonical"].includes(card.id) ? "company-domain"
    : card.id === "g2-cwv" ? "product-landing" : "company-webmaster";
  const config = G2_SERVICE_BLOCK_CONFIGS.get(id), productId = config.scope === "product" ? state?.project?.gate0ScopeUiV194?.selectedProductId || "" : "";
  const status = g2CardStatus(card);
  return { key: "G2", sourceType: "gate2_technical_seo", gateId: "gate-2", cardId: config.cardId,
    title: config.title, path: `Gate 2 · ${config.title}`, found: true, result: status,
    rawStatus: status, normalizedStatus: status, readinessNormalizedStatus: status,
    product_id: productId, consulted: true, participatesInFinalStatus: true };
};
const g2SeoPreviousWebmasterSource = gate1WebmasterG2SourceV295;
gate1WebmasterG2SourceV295 = function (card, workspace = state) {
  if (g2SeoMigrating || g2SeoProjecting) return g2SeoPreviousWebmasterSource.apply(this, arguments);
  if (!gate1WebmasterG2ConfigV295(card)) return null;
  return g2ResolvedSourceV267(card);
};
gate1WebmasterDerivedCommentV295 = function (workspace = state) {
  const result = gate1WebmasterIndexAggregateV295(workspace);
  return `Gate 2 · Яндекс Вебмастер: ${result.label}`;
};

// Keep the existing applicability selector and its saved value. Only the
// displayed result comes from Gate 2; neither rendering nor calculation writes it.
function g2SeoInfraStatus(workspace = state) {
  const status = g2ServiceBlockStatus(G2_SERVICE_BLOCK_CONFIGS.get("company-webmaster"), "", workspace);
  return { ready: "works", not_needed: "not_needed", problem: "broken", in_progress: "needs_improvement", not_started: "" }[status] || "";
}
const g2SeoPreviousInfraStatusHtml = g0MarketingStatusV1;
g0MarketingStatusV1 = function (cardId, section, index, item) {
  if (section !== "infra" || item?.name !== "Яндекс Вебмастер" || item._custom)
    return g2SeoPreviousInfraStatusHtml.apply(this, arguments);
  const status = g2SeoInfraStatus();
  const saved = g0MarketingInfraRow("Яндекс Вебмастер").row || item;
  const template = document.createElement("template");
  template.innerHTML = g2SeoPreviousInfraStatusHtml(cardId, section, index, saved);
  template.content.querySelector("[data-status]").dataset.status = status || "unselected";
  template.content.querySelector(".mega-system-status-v1").textContent = status ? guruStatusLabel(status) : "Не начато";
  return template.innerHTML;
};
const g2SeoPreviousInfraHtml = megaInfraSectionHtml;
megaInfraSectionHtml = function (cardId, items) {
  return g2SeoPreviousInfraHtml(cardId, items.map(item => item.name === "Яндекс Вебмастер" && !item._custom
    ? { ...item, status: g2SeoInfraStatus() } : item));
};

const g2SeoPreviousItems = nowGuideGate1Items;
nowGuideGate1Items = function (gate) {
  return g2SeoPreviousItems.apply(this, arguments).filter(item => !G2_SEO_ARCHIVED_IDS.has(item.id) &&
    !["interactive-tool", "gate1-seo-v300-company-webmaster", "gate1-seo-v300-product-webmaster"].includes(item.id))
    .map(item => item.id === "project-comparison" ? { ...item, title: "Конкуренты (Сравнение проектов)" } : item);
};
// Disable mounting, without calling the old mutating tool-store normalizer.
gate1SeoInteractiveToolInjectV305 = function () {};
gate1SeoInteractiveToolRefreshV305 = function () {};
const g2SeoPreviousRemoved = isRemovedGate1StandaloneBlock;
isRemovedGate1StandaloneBlock = function (card) { return G2_SEO_ARCHIVED_IDS.has(card?.id) || g2SeoPreviousRemoved.apply(this, arguments); };
v22TechnicalControlHtml = function () { return g2SeoProjecting ? g2SeoOriginal.cwvHtml.apply(this, arguments) : ""; };
gate1WebmasterCompanyHtmlV295 = function () { return g2SeoProjecting ? g2SeoOriginal.webmasterCompanyHtml.apply(this, arguments) : ""; };
gate1WebmasterProductHtmlV295 = function () { return g2SeoProjecting ? g2SeoOriginal.webmasterProductHtml.apply(this, arguments) : ""; };
const g2SeoPreviousRender = renderGate;
renderGate = function () {
  const result = g2SeoPreviousRender.apply(this, arguments);
  if (activeGateId === "gate-1") {
    for (const id of G2_SEO_ARCHIVED_IDS) els.contentArea.querySelectorAll(`[data-card="${id}"]`).forEach(node => node.remove());
    els.contentArea.querySelectorAll('[data-g1-webmaster-scope-v295], [data-gate1-page-field="metaRobotsStatus"], [data-gate1-page-field="imagesStatus"], [data-gate1-page-field="cwvStatus"], [data-gate1-page-field="auditEvidence"]').forEach(node => {
      (node.closest("label") || node).remove();
    });
    // The old technical container also held the independent comparison block.
    // Keep that block, without a technical SEO heading or inherited badge.
    const section = els.contentArea.querySelector('[data-g1-company-block-v299="seo-audit"]');
    const body = section?.querySelector(":scope > .g1-section-body");
    const remaining = [...(body?.children || [])].filter(node => !node.classList.contains("g1-empty") && !node.matches("[data-g1-seo-interactive-tool-v305]"));
    if (section) section.replaceWith(...remaining);
    const comparison = els.contentArea.querySelector(".g1-redesign > .project-comparison:not(.project-comparison-product-v309)");
    if (comparison) {
      comparison.classList.remove("g1-seo-embedded-source-v298");
      comparison.classList.add("g1-company-direct-v299");
      comparison.dataset.g1CompanyBlockV299 = "project-comparison";
      const title = comparison.querySelector("[data-project-comparison-toggle] b");
      if (title) title.textContent = "Конкуренты (Сравнение проектов)";
    }
  }
  if (activeGateId === "gate-2") for (const id of G2_SEO_OLD_CHECKS)
    els.contentArea.querySelectorAll(`[data-card="${id}"]`).forEach(node => node.remove());
  return result;
};

function g2SeoPath(control, kind) {
  const a = JSON.parse(control.getAttribute("data-g2seo-control") || "{}");
  if (a["data-ssl-v130-field"]) return ["cards", "card-20", "sslV130", a["data-ssl-v130-field"]];
  if (a["data-rdr-v130-field"]) return ["cards", "card-16", "redirectV130", a["data-rdr-v130-field"]];
  if (a["data-rdr-v130-col"]) return ["cards", "card-16", "redirectV130", "rows", Number(a["data-rdr-v130-index"]), a["data-rdr-v130-col"]];
  const robots = ["cards", "card-14", "robotsV130"];
  if (a["data-rv2"]) return [...robots, a["data-rv2"]];
  if (a["data-rv2-sum"]) return [...robots, "summary", a["data-rv2-sum"]];
  if (a["data-rv2-sitemap-field"]) return [...robots, "yandex", "sitemaps", Number(a["data-rv2-sitemap-idx"]), a["data-rv2-sitemap-field"]];
  if (a["data-rv2-field"]) return [...robots, "yandex", a["data-rv2-field"]];
  if (a["data-rv2-table"]) return [...robots, "yandex", a["data-rv2-table"] === "url" ? "urlResults" : "serviceResults", Number(a["data-rv2-idx"]), a["data-rv2-table"] === "service-comment" ? "comment" : "result"];
  if (a["data-g1-webmaster-company-v295"]) return ["cards", "card-13", "webmasterCompanyV298", a["data-g1-webmaster-company-v295"]];
  if (a["data-g1-webmaster-product-v295"]) return ["webmasterV298", a["data-g1-webmaster-product-v295"]];
  const page = control.closest("[data-g2seo-page]")?.dataset.g2seoPage;
  if (!page) return null;
  if (a["data-cwv-field"]) return ["pages", page, "cwvData", ...(a["data-cwv-version"] ? [a["data-cwv-version"]] : []), a["data-cwv-field"]];
  if (a["data-gate1-page-field"]) return ["pages", page, a["data-gate1-page-field"]];
  return null;
}
function g2SeoEditorStore(editor, workspace = state) {
  const block = editor.closest("[data-g2sb-id]");
  return { id: block?.dataset.g2sbId, productId: block?.dataset.g2sbProductId || "", kind: editor.dataset.g2seoEditor };
}
function g2SeoEditableData(id, productId, workspace = state) {
  return g2SeoRead(view => {
    const data = g2SeoClone(g2SeoStore(id, productId, view) || { schema: 1 });
    const gate = g2SeoGate1(view);
    data.cards ||= {};
    for (const cardId of G2_SEO_CARDS[id] || []) {
      const card = gate.cards.find(card => card.id === cardId);
      if (!card) continue;
      if (cardId === "card-14") ensureRobotsV130(card, view);
      if (cardId === "card-16") ensureRedirectV130(card);
      if (cardId === "card-20") ensureSslV130(card);
      data.cards[cardId] = { ...data.cards[cardId], ...g2SeoClone(card) };
    }
    if (id !== "company-domain") data.pages ||= {};
    for (const { card, row } of id === "company-domain" ? [] : g2SeoRows(productId, view)) {
      ensureCwvData(row);
      data.pages[g2SeoPageKey(card, row)] = { ...data.pages[g2SeoPageKey(card, row)],
        cardId: card.id, rowId: row.id, product_id: productId,
        ...Object.fromEntries(G2_SEO_PAGE_FIELDS.filter(key => row[key] !== undefined).map(key => [key, g2SeoClone(row[key])])) };
    }
    return data;
  }, workspace);
}
function g2SeoCommit(id, productId, data) {
  const config = G2_SERVICE_BLOCK_CONFIGS.get(id);
  if (!config || config.scope === "product" && !productId) return;
  const record = g2ServiceBlockRecord(config, productId, true);
  if (!record) return;
  record.technicalSeoV1 = data;
  guruGateReadinessCache.delete("gate-2");
  guruGateReadinessCache.delete("gate-0");
  nowGuideRegistryCache = null;
  nowGuideReadPass?.delete("g2-technical-seo");
  nowGuideReadPass?.delete("gate12-views");
  g2ServiceBlockScheduleCommit();
}
function g2SeoRefresh(editor, replace = false) {
  const { id, productId, kind } = g2SeoEditorStore(editor);
  if (replace) editor.outerHTML = g2SeoEditorHtml(kind, productId);
  const block = document.querySelector(`[data-g2sb-id="${CSS.escape(id)}"]`);
  if (block) g2ServiceBlockRefresh(block, G2_SERVICE_BLOCK_CONFIGS.get(id), productId);
  if (id === "company-domain" && kind === "redirect") {
    const live = document.querySelector('[data-g2sb-id="company-domain"] [data-g2seo-editor="redirect"]');
    live?.querySelectorAll(".redirect-v130-table tbody tr").forEach(row => {
      const code = row.querySelector('input[data-g2seo-control]');
      const expected = row.children[1]?.textContent?.trim().slice(0, 3);
      const label = row.querySelector(".g2u-derived-result");
      if (label && code) label.textContent = `Авто: ${code.value.trim() ? code.value.trim() === expected ? "Ок" : "Ошибка" : "Не проверено"}`;
    });
  }
  for (const node of document.querySelectorAll("[data-g2seo-editor]")) {
    const status = g2SeoSnapshot(node.dataset.g2seoProduct || "")[node.dataset.g2seoEditor];
    const badge = node.querySelector("[data-g2seo-status]");
    if (badge) { badge.className = `status-pill status-${status}`; badge.textContent = STATUS_LABELS[status] || "Не начато"; }
  }
}
function g2SeoUpdate(control, commit) {
  if (!control.matches("input,select,textarea")) return;
  const editor = control.closest("[data-g2seo-editor]");
  if (!editor) return;
  const { id, productId, kind } = g2SeoEditorStore(editor), path = g2SeoPath(control, kind);
  if (!path || !id) return;
  const current = g2SeoStore(id, productId), old = path.reduce((value, key) => value?.[key], current);
  const value = control.value;
  if (String(old ?? "") === value) {
    if (commit && kind === "redirect" && path.at(-1) === "domain")
      nowGuideWithReadPass(() => g2SeoRefresh(editor, true));
    return;
  }
  const data = g2SeoEditableData(id, productId);
  let target = data;
  for (let i = 0; i < path.length - 1; i++) {
    target[path[i]] ||= typeof path[i + 1] === "number" ? [] : {};
    target = target[path[i]];
  }
  target[path.at(-1)] = value;
  if (kind === "redirect" && path.at(-1) === "domain") {
    const redirects = data.cards["card-16"].redirectV130;
    redirects.rows = redirectV130BuildRows(redirectV130NormalizeDomain(value), redirects.rows);
  }
  g2SeoCommit(id, productId, data);
  nowGuideWithReadPass(() => g2SeoRefresh(editor, commit && (path.at(-1) === "enabled" || kind === "redirect" && path.at(-1) === "domain")));
}
document.addEventListener("input", event => {
  const control = event.target.closest?.("[data-g2seo-control]");
  if (control && control.tagName !== "SELECT") g2SeoUpdate(control, false);
});
document.addEventListener("change", event => {
  const control = event.target.closest?.("[data-g2seo-control]");
  if (control) g2SeoUpdate(control, true);
});
document.addEventListener("click", async event => {
  const button = event.target.closest?.("button[data-g2seo-control]");
  const editor = button?.closest("[data-g2seo-editor]");
  if (!editor) return;
  const attrs = JSON.parse(button.dataset.g2seoControl);
  const { id, productId } = g2SeoEditorStore(editor);
  const data = g2SeoEditableData(id, productId), robots = data.cards["card-14"]?.robotsV130;
  if (!robots) return;
  if (Object.hasOwn(attrs, "data-rv2-copy-urls")) {
    const rows = attrs["data-rv2-copy-urls"] === "service" ? robots.yandex.serviceResults : robots.yandex.urlResults;
    await robotsV130CopyText(rows.map(row => row.url).filter(Boolean).join("\n"));
    return;
  }
  if (Object.hasOwn(attrs, "data-rv2-sitemap-add")) robots.yandex.sitemaps.push({ url: "", status: "" });
  else if (Object.hasOwn(attrs, "data-rv2-sitemap-remove") && robots.yandex.sitemaps.length > 1)
    robots.yandex.sitemaps.splice(Number(attrs["data-rv2-sitemap-remove"]), 1);
  else return;
  g2SeoCommit(id, productId, data); nowGuideWithReadPass(() => g2SeoRefresh(editor, true));
});
