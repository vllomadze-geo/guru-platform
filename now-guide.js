/* «Сейчас»: временное состояние просмотра, без собственного хранилища. */
let nowGuideReviewKey = "";
let nowGuideContextKey = "";
let nowGuideNavigationTicket = 0;
let nowGuideHighlightedNode = null;
let nowGuideHighlightTimer = 0;
let nowGuideDisplayedPath = [];
let nowGuideDisplayedMissing = [];
let nowGuideGate1NavigationPending = false;
let nowGuideGate1PassiveCalculators = false;
const nowGuideEditedCalculatorWindows = new WeakSet();

// Embedded calculators publish their initial defaults on load. Opening the
// guide is a read action; publish results only after a calculator edit.
function nowGuideBindCalculatorEdits() {
  if (!nowGuideGate1PassiveCalculators) return;
  document.querySelectorAll("iframe[data-brown-calculator]").forEach((frame) => {
    if (frame.dataset.nowGuideCalculatorBound) return;
    frame.dataset.nowGuideCalculatorBound = "1";
    frame.addEventListener("load", () => {
      const edited = () => nowGuideEditedCalculatorWindows.add(frame.contentWindow);
      const doc = frame.contentDocument;
      if (!doc) return;
      doc.addEventListener("input", edited, true);
      doc.addEventListener("change", edited, true);
      doc.addEventListener("click", (event) => {
        if (event.target.closest('[data-add], [data-remove], [data-action="reset"]')) edited();
      }, true);
    });
  });
}
const nowGuidePreviousApplyBrownCalculatorData = guruApplyBrownCalculatorData;
guruApplyBrownCalculatorData = function (payload) {
  if (nowGuideGate1PassiveCalculators) {
    const edited = [...document.querySelectorAll("iframe[data-brown-calculator]")].some((frame) =>
      new URL(frame.src, location.href).searchParams.get("key") === String(payload?.key || "") &&
      nowGuideEditedCalculatorWindows.has(frame.contentWindow));
    if (!edited) return;
  }
  return nowGuidePreviousApplyBrownCalculatorData.apply(this, arguments);
};
const nowGuideExpanded = new Set();
const nowGuideEphemeralGate7Sections = new Set();
const NOW_STAGE_NAMES = {
  aware: "Узнал (Aware)", appeal: "Понравился (Appeal)",
  ask: "Изучает (Ask)", act: "Покупает (Act)",
  advocate: "Рекомендует (Advocate)",
};
const NOW_GATE_NAMES = {
  "gate-0": "Компания", "gate-1": "Аналитика",
  "gate-2": "Готовность к трафику", "gate-3": "Стратегия",
  "gate-4": "Реализация", "gate-5": "Оценка и оптимизация",
  "gate-6": "Календарь", "gate-7": "Отчёты и задачи",
  "gate-8": "Прогноз",
};
const NOW_GATE5_BLOCKS = [
  ["setup", "Настройка отчётности"], ["input", "Импорт данных и снимки периодов"],
  ["ad", "Рекламная оценка"], ["bridge", "Связка с бизнесом"],
  ["finance", "Финансовая оценка"], ["journal", "Журнал изменений"],
];

// Gate 0 keeps legacy records for exports, while its page renders only these
// cards and groups them into the same three sections.
function nowGuideGate0Cards(gate) {
  const displayGate = { id: "gate-0", cards: [...(gate.cards || [])] };
  guruV350NormalizeCompanyStrategyCardOrder({ gates: [displayGate] });
  const visible = displayGate.cards.filter((item) =>
    !item._merged &&
    !(typeof isOfferPsychCard === "function" && isOfferPsychCard(item)) &&
    !(typeof guruPassportMovedGate0CardV527 === "function" &&
      guruPassportMovedGate0CardV527(item)));
  const company = (item) => GATE0_COMPANY_SECTION_TITLES.includes(item.title) ||
    guruV349IsCompanyBrandPurposeCard(item) ||
    guruV351IsCompanyKeywordFoundationCard(item) ||
    gate0DiagnosticScope(item) === "company";
  const product = (item) => GATE0_PRODUCT_SECTION_TITLES.includes(item.title) ||
    gate0DiagnosticScope(item) === "product";
  return [
    ...visible.filter(company),
    ...visible.filter((item) => !company(item) && product(item)),
    ...visible.filter((item) => !company(item) && !product(item)),
  ];
}

function nowGuideSelectedProductFields(workspace = state) {
  const productId = workspace?.project?.gate0ScopeUiV194?.selectedProductId || "";
  const product = productId && guruV194Products(workspace).find((item) => item.id === productId);
  if (!product) return null;
  const categoryId = product.categoryId || "";
  const fields = new Map();
  const allowed = new Set(["jtbd", "segments", "positioning", "usp", "offers"]);
  for (const record of workspace?.project?.gate0ScopedValuesV194 || []) {
    if (!record || !allowed.has(record.field) || record.archived_at) continue;
    const scope = record.scope;
    const rank = scope === "product" && record.product_id === productId ? 3 :
      scope === "category" && categoryId && record.category_id === categoryId ? 2 :
      scope === "project" ? 1 : 0;
    if (!rank) continue;
    const entry = fields.get(record.field);
    if (!entry || rank > entry.rank) fields.set(record.field, {
      rank, filled: Boolean(String(record.value || "").trim()),
    });
    else if (rank === entry.rank && String(record.value || "").trim()) entry.filled = true;
  }
  return fields;
}

function nowGuideGate0MergedCards(gate, owner) {
  // Read the saved statuses of merged cards without changing project data.
  // Legacy search focus had only a hidden flag; its visible company block is
  // the keyword foundation. Offers follow positioning into the product block.
  const owners = {
    "card-4": "card-2", "card-5": "card-2",
    "card-6": "gate0-company-keyword-foundation",
    "card-8": "card-7", "card-9": "card-7",
  };
  const cards = gate.cards || [];
  const ownerId = (card) => {
    let id = card._mergedInto || owners[card.id];
    const visited = new Set([card.id]);
    while (id && !visited.has(id)) {
      visited.add(id);
      const target = cards.find((item) => item.id === id);
      if (!target) return owners[card.id];
      if (!target._merged) return target.id;
      id = target._mergedInto || owners[target.id];
    }
    return owners[card.id];
  };
  return cards.filter((card) => card._merged && ownerId(card) === owner.id);
}

// Compatibility entry points read the same visible-block assessment. Legacy
// merged statuses remain in exports but cannot lower a visible block's status.
function nowGuideGate0MergedStatus(gate, owner, status) {
  return guruNormBlockStatus(status);
}

function nowGuideGate0ProductStatus(card, selectedFields) {
  return guruGate0BlockReadiness(card).status || card.status;
}

function nowGuideGate0Inspect(card) {
  return guruGate0BlockReadiness(card);
}

function nowGuideMissingNode(check, root = document.getElementById("contentArea")) {
  if (!root) return null;
  if (check.members?.length) {
    const candidates = check.members.map(member => ({ member, node: nowGuideMissingNode(member, root) })).filter(entry => entry.node);
    candidates.sort((a, b) => a.node === b.node ? 0 : a.node.compareDocumentPosition(b.node) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
    if (candidates.length) {
      // Only transient guide metadata changes. The group follows the first
      // missing cell in the table's current visible order, including sorting.
      const { label, groupedCount, members } = check;
      Object.assign(check, candidates[0].member, { label, groupedCount, members });
      return candidates[0].node;
    }
  }
  if (check.scopeField) return [...root.querySelectorAll(
    `[data-gate0-scope-field-row="${CSS.escape(check.scopeField)}"] [data-gate0-scope-record]`,
  )].find((node) => !node.disabled && !String(node.value || "").trim()) || null;
  try { return check.selector ? root.querySelector(check.selector) : null; }
  catch (_) { return null; }
}

function nowGuideGate0Missing(item) {
  const gate = state.gates.find((gate) => gate.id === item.gateId);
  const owner = gate?.cards.find((card) => card.id === item.id);
  if (!owner) return { items: [{ fallback: true, label: "Заполните блок" }], unresolved: [item.id] };
  const missing = [];
  const unresolved = [];
  for (const source of [owner]) {
    if (source._merged) {
      if (!["ready", "not_required"].includes(guruNormBlockStatus(source.status))) unresolved.push(source.id);
      continue;
    }
    const assessment = nowGuideGate0Inspect(source);
    const sourceStatus = source === owner ? assessment.status : guruNormBlockStatus(source.status);
    if (["ready", "not_required"].includes(sourceStatus)) continue;
    // A hidden legacy field has no editable counterpart merely because its
    // owner contains a similarly named product or company field.
    if (!assessment.missing.length || assessment.unresolved) {
      unresolved.push(source.id);
      continue;
    }
    for (const check of assessment.missing) {
      const node = nowGuideMissingNode(check);
      if (document.querySelector(`details.gate0-card[data-card-row="${CSS.escape(owner.id)}"]`) &&
          (!node || node.disabled || node.readOnly)) {
        unresolved.push(source.id);
        continue;
      }
      missing.push({ ...check, label: nowGuideSafeText(check.label), cardId: owner.id });
    }
  }
  const unique = [...new Map(missing.map((check) => [check.selector || check.scopeField, check])).values()];
  if (unresolved.length || !unique.length) unique.push({ fallback: true, label: "Заполните блок" });
  return { items: unique, unresolved };
}

// Other gates can register a provider without changing rendering or focus.
const nowGuideMissingProviders = new Map([["gate-0", nowGuideGate0Missing], ["gate-1", nowGuideGate1Missing], ["gate-2", nowGuideGate2Missing], ["gate-3", nowGuideGate3Missing], ["gate-4", nowGuideGate4Missing]]);
function nowGuideMissingDetails(item) {
  const provider = item && nowGuideMissingProviders.get(item.gateId);
  if (!provider) return null;
  if (item.status === "not_required") return { text: "Не требуется", items: [], unresolved: [] };
  if (item.status === "ready") return { text: "Всё заполнено", items: [], unresolved: [] };
  const details = provider(item);
  return { ...details, items: nowGuideGroupMissing(details.items) };
}

function nowGuideMissingHtml(item) {
  const details = nowGuideMissingDetails(item);
  nowGuideDisplayedMissing = details?.items || [];
  if (!details) return "";
  if (details.text) return `<div class="now-guide-missing" aria-live="polite">${details.text}</div>`;
  return `<div class="now-guide-missing" aria-live="polite"><span>Не хватает:</span><ul>${details.items.slice(0, 3)
    .map((check, index) => `<li><button type="button" data-now-missing="${index}">${escapeHtml(check.label)}</button></li>`).join("")}</ul>${details.items.length > 3
    ? `<span>и ещё ${details.items.length - 3} групп</span>` : ""}</div>`;
}

// Gate 1 and Gate 2 readers also isolate legacy calculators which read the
// global workspace. No normalisation or deferred save escapes this view.
function nowGuideGate12WithView(calculate, view) {
  const live = state;
  const microtask = window.queueMicrotask;
  const frame = window.requestAnimationFrame;
  const idle = window.requestIdleCallback;
  const preferences = guruScheduleUiPreferenceSave;
  state = view;
  window.queueMicrotask = () => {};
  window.requestAnimationFrame = () => 0;
  window.requestIdleCallback = () => 0;
  guruScheduleUiPreferenceSave = () => {};
  try { return calculate(view); }
  finally {
    state = live;
    window.queueMicrotask = microtask;
    window.requestAnimationFrame = frame;
    window.requestIdleCallback = idle;
    guruScheduleUiPreferenceSave = preferences;
  }
}
function nowGuideGate12Read(calculate, workspace = state) {
  return guruReadinessInspect(workspace, (view) => nowGuideGate12WithView(calculate, view));
}

function nowGuideGate1Items(gate) {
  return nowGuideGate12Read((workspace) => {
    const source = workspace.gates.find((item) => item.id === gate.id);
    const sections = getGate1Sections(source, source.cards).filter((section) => !section.hidden);
    const descriptor = (card) => ({ id: card.id, title: card.title, kind: "card" });
    const groups = { seo: [], structure: [], legal: [] };
    for (const card of sections.find((section) => section.key === "site_audit")?.allInnerCards || []) {
      if (card._merged || !getGate1CardMode(card) || getGate1CardMode(card) === "page_audit_summary") continue;
      (groups[gate1CompanyAuditGroupV299(card)] || groups.structure).push(descriptor(card));
    }
    const section = (id, title, calculate) => ({ id, title, kind: "gate1-section", calculate });
    const productId = workspace.project?.gate0ScopeUiV194?.selectedProductId || "";
    const items = [
      section("company_demand_positioning", "Спрос, ценность, позиционирование · Компания", "company-demand"),
      ...groups.seo,
      { id: "project-comparison", title: "Сравнение проекта", kind: "comparison" },
      section("gate1-seo-v300-company-webmaster", "Яндекс Вебмастер · Компания", "webmaster-company"),
      { id: "interactive-tool", title: "Собственный интерактивный инструмент", kind: "gate1-tool" },
      ...groups.structure, ...groups.legal,
      { id: "target-audience", title: "Целевая аудитория", kind: "audience" },
      section("gate1-blog-v304-company", "Блог · Компания", "blog-company"),
      ...sections.filter((entry) => entry.bare).flatMap((entry) => entry.allInnerCards || [])
        .filter((card) => !card._merged && getGate1CardMode(card)).map(descriptor),
    ];
    if (productId) items.push(
      section("gate1-seo-v300-product-webmaster", "Яндекс Вебмастер · Продукт/Услуга", "webmaster-product"),
      section("pain_jtbd_offer", "Спрос, ценность, позиционирование · Продукт/Услуга", "product-demand"),
      section("gate1-blog-v304-product", "Блог · Продукт/Услуга", "blog-product"),
    );
    if (sections.some((entry) => entry.key === "unit_economics"))
      items.push({ id: "unit-economics", title: "Юнит-экономика", kind: "unit" });
    return [...new Map(items.map((item) => [`${item.kind}:${item.id}`, item])).values()];
  }).status || [];
}

let nowGuideGate1Trace = null;
function nowGuideGate1PageTarget(row, field, title = "") {
  if (!nowGuideGate1Trace?.card) return undefined;
  const { card, rows } = nowGuideGate1Trace;
  const index = rows.indexOf(row);
  if (index < 0) return undefined;
  const key = field.kind === "row" ? field.field : field.key;
  return { selector: field.kind === "row"
      ? `[data-gate1-page-card-id="${CSS.escape(card.id)}"][data-gate1-page-index="${index}"][data-gate1-page-field="${CSS.escape(key)}"]`
      : `[data-page-context-card-id="${CSS.escape(card.id)}"][data-page-context-index="${index}"][data-page-context-key="${CSS.escape(key)}"]`,
    label: `${row.name || card.title}: ${title || field.label || key}` };
}

function nowGuideGate1UnitTarget(data, step, field) {
  const entry = nowGuideGate1Trace?.unitEntries?.find(({ item }) => item.steps?.[step.key] === data);
  return entry ? { selector: `[data-uv130-item="${entry.index}"][data-uv130-step="${CSS.escape(step.key)}"][data-uv130-field="${CSS.escape(field.k)}"]`,
    label: `${entry.item.name}: ${field.l}` } : undefined;
}

function nowGuideGate1EditorHtml(item) {
  return nowGuideGate12Read((workspace) => {
    if (item.kind === "card") return cardUserFieldsHtml(workspace.gates.find((gate) => gate.id === "gate-1").cards.find((card) => card.id === item.id));
    if (item.kind === "gate1-tool") return gate1SeoInteractiveToolHtmlV305(gate1SeoInteractiveToolStoreV305(workspace));
    if (item.kind === "comparison") return projectComparisonHtml();
    if (item.kind === "audience") return targetAudienceHtml();
    if (item.kind === "unit") return g1RenderUnitEconomics();
    if (item.calculate === "company-demand") return gate1CompanySemanticsHtmlV264(workspace);
    if (item.calculate === "product-demand") return g1RenderPainOffer();
    if (item.calculate === "webmaster-company") return gate1WebmasterCompanyHtmlV295();
    if (item.calculate === "webmaster-product") return gate1WebmasterProductHtmlV295();
    if (item.calculate === "blog-company") return gate1BlogCompanyHtmlV304(gate1BlogStoreV304(workspace));
    if (item.calculate === "blog-product") return gate1BlogProductHtmlV304(gate1BlogStoreV304(workspace), guruV194SelectedProduct(workspace));
    return "";
  }).status || "";
}

function nowGuideGate1Assessment(item, workspace = state) {
  return nowGuideGate12Read((view) => {
    const previous = nowGuideGate1Trace;
    try {
      if (item.kind === "card") {
        const card = view.gates.find((gate) => gate.id === "gate-1")?.cards.find((card) => card.id === item.id);
        if (!card) return null;
        const rows = [...(card.pageRows || [])];
        nowGuideGate1Trace = { card, rows };
        // Product page editors show only the selected product's content.
        if (gate1LandingCardKindV234(card)) {
          const id = view.project?.gate0ScopeUiV194?.selectedProductId;
          card.pageRows = rows.filter((row) => row.catalogItemIdV189 === id);
          if (!card.pageRows.length) return "not_started";
        }
        recalculateStatusForCard(card, view);
        return card.status;
      }
      if (item.kind === "gate1-tool") return gate1SeoInteractiveToolStatusV305(gate1SeoInteractiveToolStoreV305(view));
      if (item.kind === "comparison") return projectComparisonStatus().status;
      if (item.kind === "audience") return targetAudienceStatus(ensureTargetAudience()).status;
      if (item.kind === "unit") {
        const id = view.project?.gate0ScopeUiV194?.selectedProductId;
        const entries = (ensureUnitV130().items || []).map((item, index) => ({ item, index }))
          .filter(({ item }) => item.product_id === id);
        nowGuideGate1Trace = { unitEntries: entries };
        const statuses = entries.map(({ item }) => uv130ItemStatus(item));
        if (!statuses.length || statuses.every((status) => status === "not_started")) return "not_started";
        return statuses.every((status) => status === "ready") ? "ready" : "in_progress";
      }
      if (item.calculate === "company-demand") return gate1CompanyDemandPositioningCompletionV357(view).status;
      if (item.calculate === "product-demand") return getPainOfferStatus();
      if (item.calculate === "webmaster-company") return gate1WebmasterOverallV295(view).readiness;
      if (item.calculate === "webmaster-product") {
        const id = view.project?.gate0ScopeUiV194?.selectedProductId;
        const value = guruReadinessValue(gate1WebmasterProductV295(id, view, false)?.landingIndexed,
          { selector: '[data-g1-webmaster-product-v295="landingIndexed"]', label: "Результат" });
        return value === "yes" ? "ready" : value === "no" ? "problem" : "not_started";
      }
      if (item.calculate === "blog-company") return gate1BlogCompanyStatusV304(gate1BlogStoreV304(view));
      if (item.calculate === "blog-product") return gate1BlogProductStatusV304(
        gate1BlogStoreV304(view).articles, view.project?.gate0ScopeUiV194?.selectedProductId || "");
      return null;
    } finally { nowGuideGate1Trace = previous; }
  }, workspace);
}

function nowGuideGate1Missing(item) {
  const assessment = nowGuideGate1Assessment(item);
  const template = document.createElement("template");
  template.innerHTML = nowGuideGate1EditorHtml(item);
  const checks = assessment.missing.filter(Boolean).flatMap((check) => {
    const node = nowGuideMissingNode(check, template.content);
    if (!node || node.disabled || node.readOnly || (node.tagName === "SELECT" && node.options.length < 2)) return [];
    const label = check.label || node.closest("label")?.querySelector("span, strong")?.textContent || "Заполните поле";
    return [{ ...check, label: nowGuideSafeText(label) }];
  });
  const unique = [...new Map(checks.filter((check) => check.selector).map((check) => [check.selector, check])).values()];
  return unique.length ? { items: unique, unresolved: [] }
    : { items: [{ fallback: true, label: "Заполните блок" }], unresolved: [item.id] };
}

function nowGuideGate2Missing(item) {
  const result = nowGuideGate12Read((workspace) => {
    const unit = g2s4Units(workspace).find((unit) => unit.id === item.id && unit.productId === (item.productId || ""));
    if (!unit) return null;
    return unit.def ? g2wStatus(unit.def, unit.productId, workspace)
      : g2ServiceBlockStatus(unit.config, unit.productId, workspace);
  });
  const config = G2_SERVICE_BLOCK_CONFIGS.get(item.id);
  const wizardId = config?.wizardUnitId || item.wizardId;
  const root = config ? `[data-g2sb-id="${CSS.escape(item.id)}"]`
    : `[data-g2w-card-view="${CSS.escape(wizardId)}"]`;
  const checks = result.missing.filter((check) => check && (
    check.serviceId === item.id || check.wizardId === wizardId)).map((check) => {
    if (check.stepId) {
      const index = config ? config.steps.findIndex((step) => step.step_id === check.stepId)
        : g2wDef(wizardId).steps.findIndex((step) => step[0] === check.stepId);
      if (index < 0) return null;
      const name = config ? nowGuideGate12Read((workspace) =>
        g2ServiceBlockStepValue(config, config.steps[index], "what", item.productId, workspace)).status
        : g2wDef(wizardId).steps[index][1];
      return { selector: config ? `${root} [data-g2sb-step-id="${CSS.escape(check.stepId)}"]`
        : `${root} .g2w-step:nth-child(${index + 1})`,
        label: `Шаг ${String(index + 1).padStart(2, "0")}: ${nowGuideSafeText(name)}`, step: true };
    }
    return { selector: `${root} .g2w-verify`, label: "Проверка результата: подтвердите работу настройки", step: true };
  }).filter(Boolean);
  const unique = [...new Map(checks.map((check) => [check.selector, check])).values()];
  return unique.length ? { items: unique, unresolved: [] }
    : { items: [{ fallback: true, label: "Заполните блок" }], unresolved: [item.id] };
}

function nowGuideGate1Node(item) {
  const root = document.getElementById("contentArea");
  if (!root) return null;
  if (item.kind === "card") return root.querySelector(`[data-card="${CSS.escape(item.id)}"] > .g1-card-header`);
  if (item.kind === "gate1-tool") return root.querySelector("[data-g1-seo-interactive-tool-v305] > header");
  if (item.kind === "gate1-section") return root.querySelector(`[data-gate1-toggle-section="${CSS.escape(item.id)}"]`);
  if (item.kind === "unit") return root.querySelector('[data-gate1-toggle-section="unit_economics"]');
  return root.querySelector(item.kind === "comparison" ? "[data-project-comparison-toggle]" : "[data-target-audience-toggle]");
}

function nowGuideGate1Refresh(items = nowGuideGate1Items(state.gates.find((gate) => gate.id === "gate-1"))) {
  if (activeGateId !== "gate-1") return;
  for (const item of items) {
    const header = nowGuideGate1Node(item);
    const badge = header?.querySelector(".status-pill");
    if (!badge) continue;
    const status = nowGuideGate1Assessment(item).status;
    if (!status) continue;
    badge.className = `status-pill status-${guruNormBlockStatus(status)}`;
    badge.textContent = item.kind === "card" ? g1CardStatusLabel({ ...findCard(item.id), status })
      : STATUS_LABELS[status] || nowGuideStatusText(guruNormBlockStatus(status));
  }
}

// Guide disclosure is DOM state. Legacy accordion preferences and project
// data are not written when the guide opens a lazily rendered editor.
function nowGuideGate1Reveal(item) {
  const header = nowGuideGate1Node(item);
  if (!header) return false;
  const article = header.closest("[data-card]");
  if (article && !article.querySelector(":scope > .g1-card-body")) {
    const html = nowGuideGate12Read((workspace) => {
      const card = workspace.gates.find((gate) => gate.id === "gate-1").cards.find((card) => card.id === item.id);
      return `<div class="g1-card-body">${instructionToggleHtml(card)}<div class="card-fields">${cardUserFieldsHtml(card)}</div></div>`;
    }).status;
    if (html) article.insertAdjacentHTML("beforeend", html);
    bindCardInputs();
  }
  const section = header.closest(".g1-section");
  if (section && !section.querySelector(":scope > .g1-section-body") && item.kind === "gate1-section") {
    const html = nowGuideGate12Read(() => item.calculate === "company-demand"
      ? gate1CompanySemanticsHtmlV264(state)
      : item.calculate === "product-demand" ? g1RenderPainOffer() : "").status;
    if (html) {
      section.insertAdjacentHTML("beforeend", `<div class="g1-section-body"><div class="g1-route">${html}</div></div>`);
      bindCardInputs(); bindPainOfferRouteEvents();
    }
  }
  // Unit content is also lazy; use its existing renderer and bind handlers
  // after leaving the protected read view.
  if (section && item.kind === "unit" && !section.querySelector(":scope > .g1-section-body")) {
    const html = nowGuideGate12Read(() => g1RenderUnitEconomics()).status;
    section.insertAdjacentHTML("beforeend", `<div class="g1-section-body">${html}</div>`);
    bindUnitEconomicsRouteEvents();
  }
  for (let parent = header.parentElement; parent && parent !== els.contentArea; parent = parent.parentElement) {
    if (parent.matches(".g1-section, .analytics-subblock, .g1-card")) {
      parent.classList.add("is-open");
      parent.classList.remove("is-collapsed");
      const body = parent.querySelector(":scope > .g1-section-body, :scope > .g1-card-body, :scope > .pv140-product-body, :scope > .project-comparison-body, :scope > .target-audience-body");
      if (body) body.hidden = false;
      parent.querySelector(":scope > button[aria-expanded]")?.setAttribute("aria-expanded", "true");
    }
  }
  nowGuideBindCalculatorEdits();
  return true;
}

// A read pass shares the existing render cache. Its results never survive a
// render/input cycle and are never written to the workspace.
let nowGuideReadPass = null;
function nowGuideWithReadPass(calculate) {
  if (nowGuideReadPass) return calculate();
  const previousCache = guruRenderReadCacheV470;
  nowGuideReadPass = new Map();
  guruRenderReadCacheV470 ||= guruCreateRenderReadCacheV470();
  try { return calculate(); }
  finally { nowGuideReadPass = null; guruRenderReadCacheV470 = previousCache; }
}
function nowGuidePlainRead(calculate) {
  return nowGuideWithReadPass(() => guruExportWithoutPersistenceV223(() => nowGuideGate12WithView(calculate,
    guruExportDiagnosticCloneV223(state))));
}

function nowGuidePlainAssessment(calculate) {
  const missing = [];
  const previous = guruReadinessCollector;
  let status;
  try {
    status = nowGuidePlainRead(() => {
      guruReadinessCollector = missing;
      return calculate();
    });
  } finally { guruReadinessCollector = previous; }
  return { status, missing };
}

function nowGuideGroupMissing(items) {
  const groups = new Map();
  const unique = [...new Map((items || []).map(check => [check.selector || check.scopeField || check.label, check])).values()];
  let tables;
  for (const check of unique) {
    let group = check.group;
    if (!group && check.selector) {
      const node = nowGuideMissingNode(check);
      const row = node?.closest("tr");
      const table = row?.closest("table");
      const cell = node?.closest("td");
      if (table && cell) {
        tables ||= [...document.querySelectorAll("#contentArea table")];
        const column = [...row.children].indexOf(cell);
        const label = table.querySelector("thead tr")?.children[column]?.textContent.trim();
        if (label) group = { key: `table-${tables.indexOf(table)}-${column}`, label: `${label}: не заполнено`,
          row: [...table.rows].indexOf(row), total: table.querySelectorAll("tbody tr").length };
      }
      // Structured list editors expose stable field and record identifiers.
      if (!group) {
        const field = check.selector.match(/\[data-([^\]]*(?:field|key|col))="([^"]+)"\]/g)?.at(-1);
        const record = check.selector.match(/\[data-([^\]]*(?:record|row-id|index|item))="([^"]+)"\]/)?.[0];
        if (field && record) group = { key: check.selector.replace(record, "[row]").replace(/index="\d+"/g, 'index="row"'),
          row: record, label: check.label.replace(/^(?:.*: запись \d+, |.*: |.*?, )/, "") + ": не заполнено" };
      }
    }
    const key = group?.key || Symbol();
    if (!groups.has(key)) groups.set(key, { first: check, group, rows: new Set(), members: [] });
    groups.get(key).rows.add(group?.row ?? check.selector ?? check.scopeField ?? key);
    groups.get(key).members.push(check);
  }
  return [...groups.values()].map(({ first, group, rows, members }) => {
    if (!group || rows.size === 1) return first;
    const count = rows.size;
    const label = group.noun === "слов" ? `Спрос: у ${count} из ${group.total} слов нет метрик`
      : group.key === "catalog-url-products" ? `Каталог: URL не указан у ${count} товаров`
      : `${group.label} у ${count}${group.total ? ` из ${group.total}` : ""} записей`;
    return { ...first, label, groupedCount: count, members };
  });
}

function nowGuideGate3Stages() {
  return nowGuidePlainRead(() => {
    const product = g3ProductJourneySelected(state);
    return product ? g3ProductJourneyStages(g3ProductJourneySnapshot(product)) : [];
  }) || [];
}
const nowGuidePreviousJourneyStages = g3ProductJourneyStages;
g3ProductJourneyStages = function (...args) {
  return nowGuidePreviousJourneyStages.apply(this, args).map(stage => ({ ...stage,
    title: activeGateId === "gate-3" ? NOW_STAGE_NAMES[stage.key] || stage.title : stage.title }));
};
function nowGuideSourceHint(target, label) {
  if (!target) return null;
  const path = nowGuideDisplayedPath;
  const owner = target.gateId === "gate-0" ? path.find(item => item.gateId === target.gateId &&
    item.id === (target.cardId || (target.kind === "gate0-scoped" ? "card-2" : "card-7")))
    : target.kind === "gate1-unit" ? path.find(item => item.gateId === "gate-1" && item.kind === "unit")
    : target.kind === "gate1-page" ? path.find(item => item.gateId === "gate-1" && item.id === target.cardId)
    : target.kind === "gate1-analysis" ? path.find(item => item.gateId === "gate-1" && item.calculate === "product-demand")
    : target.kind === "gate4-campaign" ? path.find(item => item.gateId === "gate-4" && item.id === target.channelKey) : null;
  if (!owner) return null;
  let checks = owner.gateId === "gate-0" ? guruGate0BlockReadiness(findCard(owner.id)).missing
    : owner.gateId === "gate-1" ? nowGuideGate1Assessment(owner).missing : [];
  if (target.kind === "gate0-landing") checks = checks.filter(check => check?.selector?.includes(`data-mega-url-id="${CSS.escape(target.productId)}"`) || check?.selector?.includes(`data-mega-product-id="${CSS.escape(target.productId)}"`));
  if (target.kind === "gate0-channel") checks = checks.filter(check => check?.selector?.includes(`data-mega-section="channels"`) && check.selector.includes(`data-mega-idx="${target.channelIndex || 0}"`));
  if (target.kind === "gate1-page") checks = checks.filter(check => check?.selector?.includes(`index="${target.rowIndex}"`) &&
    (!(target.contextKey || target.rowField) || check.selector.includes(`="${CSS.escape(target.contextKey || target.rowField)}"`)));
  if (target.kind === "gate1-unit") checks = checks.filter(check => check?.selector?.includes(`data-uv130-step="${target.step || "ltv"}"`));
  if (target.kind === "gate0-scoped") checks = checks.filter(check =>
    (target.recordId && check?.selector?.includes(CSS.escape(target.recordId))) || check?.scopeField === target.field ||
    check?.selector?.includes(`data-gate0-scope-add="${CSS.escape(target.field)}"`) ||
    check?.selector?.includes(`data-gate0-scope-draft="${CSS.escape(target.field)}"`));
  const editor = document.createElement("template");
  editor.innerHTML = owner.gateId === "gate-1" ? nowGuideGate1EditorHtml(owner)
    : owner.gateId === "gate-0" ? nowGuidePlainRead(() => cardUserFieldsHtml(findCard(owner.id))) : "";
  const check = checks.find(check => {
    if (!check?.selector && !check?.scopeField) return false;
    const node = editor ? nowGuideMissingNode(check, editor.content) : nowGuideMissingNode(check);
    return node && !node.disabled && !node.readOnly && node.matches("input,textarea,select,button");
  });
  if (!check) return null;
  const name = nowGuideSafeText(check.label);
  return { ...check, label: name.startsWith(label) ? name : `${label}: ${name}`, sourceItem: owner };
}
function nowGuideGate3Missing(item) {
  const stage = nowGuideGate3Stages().find(stage => stage.key === item.id);
  const items = [], unresolved = [];
  for (const cell of stage?.cells || []) {
    if (guruV185Text(cell.value)) continue;
    const check = nowGuideSourceHint(cell.target, cell.label);
    if (check) items.push(check);
    else unresolved.push(cell.label);
  }
  if (unresolved.length || !items.length) items.push({ fallback: true, label: "Заполните блок" });
  return { items, unresolved: unresolved.length ? [item.id] : [] };
}

let nowGuideGate4Trace = null;
function nowGuideGate4CampaignTarget(field, label = "") {
  const item = nowGuideGate4Trace;
  if (!item) return undefined;
  return { selector: `[data-g4c2-product="${CSS.escape(item.productId)}"][data-g4c2-key="${CSS.escape(item.id)}"][data-g4c2-field="${field}"]`, field, label };
}
function nowGuideGate4SearchTarget(product, row, index, field) {
  const prefix = `[data-g4sb-product="${CSS.escape(product)}"]`;
  return { selector: ["col2", "col3", "col4"].includes(field)
    ? `${prefix}[data-g4sb-group="${index}"][data-g4sb-col="${field}"]`
    : `${prefix}[data-g4sb-unit-toggle="${CSS.escape(row.clusterId || "")}"]`,
    searchGroup: row.clusterId || "", step: !field.startsWith("col"),
    label: field === "phrases" ? "Кластер-группа: добавьте ключевые фразы" : field === "ad0" ? "Кластер-группа: добавьте объявление" :
      ({ col2: "Прогноз показов", col3: "Прогноз кликов", col4: "Бюджет без НДС" })[field],
    group: { key: `search-${field}`, label: ({ col2: "Прогноз показов", col3: "Прогноз кликов", col4: "Бюджет без НДС", phrases: "Ключевые фразы", ad0: "Объявление" })[field] + ": не заполнено", row: index } };
}
// The actual page renderer is also the registry: no hidden legacy card or
// duplicate presentation of a campaign can create another navigation unit.
function nowGuideGate4Items() {
  const key = `gate4:${state?.project?.gate0ScopeUiV194?.selectedProductId || ""}`;
  if (nowGuideReadPass?.has(key)) return nowGuideReadPass.get(key);
  const items = nowGuidePlainRead(() => {
    const template = document.createElement("template");
    template.innerHTML = gate4ProductionHtml();
    const productId = state?.project?.gate0ScopeUiV194?.selectedProductId || "";
    const channels = g4LaunchChannels();
    const seen = new Set(), result = [];
    for (const node of template.content.querySelectorAll('[data-g4five-tool-v523], [data-g4-readiness-card], [data-g4camp-toggle]')) {
      // A host and its inner card may carry the same tool marker. Campaign
      // hosts are represented by their own existing header, once per key.
      if (node.matches('[data-g4five-tool-v523]') && (node.matches('.g4five-campaign-host-v523') || node.querySelector('[data-g4camp-toggle]'))) continue;
      const header = node.matches('[data-g4camp-toggle]') ? node : node.querySelector(':scope > .g1-card-header-static, :scope > summary, :scope > .g1-card-header');
      const badge = header?.querySelector('.status-pill');
      if (!badge) continue;
      const channel = node.matches('[data-g4camp-toggle]') ? channels.find(channel => g4CampaignStateKey(productId, channel.key) === node.dataset.g4campToggle) : null;
      if (node.matches('[data-g4camp-toggle]') && !channel) continue;
      const scope = node.closest('[data-g4five-company-v523]') ? 'company' : 'product';
      const kind = channel ? 'channel' : node.hasAttribute('data-g4-readiness-card') ? 'gate4-readiness' : 'gate4-tool';
      const id = channel?.key || node.dataset.g4ReadinessCard || node.dataset.g4fiveToolV523;
      const identity = `${scope}:${kind}:${id}`;
      if (seen.has(identity)) continue;
      seen.add(identity);
      const raw = [...badge.classList].find(name => name.startsWith('status-') && name !== 'status-pill')?.slice(7);
      const status = guruNormBlockStatus(raw);
      const title = header.querySelector('.g1-card-title')?.textContent.trim() || id;
      const selector = channel ? `[data-g4camp-toggle="${CSS.escape(node.dataset.g4campToggle)}"]`
        : kind === 'gate4-readiness' ? `[data-g4-readiness-card="${CSS.escape(id)}"] > summary`
        : `[data-g4five-${scope === 'company' ? 'company' : 'product'}-v523] [data-g4five-tool-v523="${CSS.escape(id)}"] > .g1-card-header-static`;
      result.push({ id, title, kind, scope, productId: scope === 'product' ? productId : '', status,
        selector, pageBadge: badge.textContent.trim(), rawStatus: raw });
    }
    return result;
  }) || [];
  nowGuideReadPass?.set(key, items);
  return items;
}
function nowGuideGate4Missing(item) {
  if (item.kind !== 'channel') {
    // These source blocks already own their status calculators. Manual
    // readiness rows emit targets in that same calculator below.
    if (item.kind === 'gate4-readiness') {
      const assessment = nowGuidePlainAssessment(() => {
        const product = g3ProductJourneySelected(state);
        const card = g4ReadinessAllCardsV225(state).find(card => card.id === item.id);
        return card && product ? g4FunnelCardStatusV294(card, product, g3ProductJourneySnapshot(product)) : null;
      });
      const checks = assessment.missing.filter(check => check?.selector?.includes(`data-g4-readiness-card-id="${item.id}"`));
      if (checks.length) return { items: checks, unresolved: [] };
    }
    return { items: [{ fallback: true, label: "Заполните блок" }], unresolved: [item.id] };
  }
  const assessment = nowGuidePlainAssessment(() => {
    const channel = g4LaunchChannels().find(channel => channel.key === item.id);
    const campaign = g4EnsureLaunchCampaigns()[g4CampaignStateKey(item.productId, item.id)] || {};
    const build = g4IsYandexSearchChannel(channel) ? ensureGate4SearchBuild(item.productId) : null;
    guruReadinessCollector.length = 0;
    const previous = nowGuideGate4Trace;
    nowGuideGate4Trace = item;
    try {
      return build ? g4sbCampaignStatus(item.productId, campaign, build) : g4CampaignStatus(campaign);
    } finally { nowGuideGate4Trace = previous; }
  });
  const editor = nowGuideGate4EditorTemplate(item);
  const items = assessment.missing.filter(check => check?.selector &&
    (check.selector.includes(`data-g4c2-key="${CSS.escape(item.id)}"`) || check.selector.includes(`data-g4sb-product="${CSS.escape(item.productId)}"`))).map(check => {
    const node = nowGuideMissingNode(check) || nowGuideMissingNode(check, editor);
    const label = check.label || node?.closest('label')?.querySelector('span')?.textContent.trim() || check.field;
    return node ? { ...check, label: nowGuideSafeText(label) } : null;
  }).filter(Boolean);
  return items.length ? { items, unresolved: [] } : { items: [{ fallback: true, label: "Заполните блок" }], unresolved: [item.id] };
}

let nowGuideProtectedGate = "";
function nowGuideOpenAncestors(node) {
  for (let parent = node?.parentElement; parent && parent !== els.contentArea; parent = parent.parentElement) {
    if (parent.matches("details") && !parent.open) {
      parent._guruRenderedOpen = true;
      parent.dataset.guruDisclosureExpectedV512 = "1";
      parent.open = true;
    }
    if (parent.hidden) parent.hidden = false;
    if (parent.matches(".g1-section, .g1-card")) parent.classList.add("is-open");
    parent.classList.remove("is-collapsed", "gate0-section-content-hidden");
  }
}
function nowGuideReveal34(item) {
  const header = nowGuideFindNode(item);
  if (!header) return;
  if (item.gateId === "gate-3") {
    const article = header.closest("[data-g3-product-stage]");
    if (!article.querySelector(":scope > .g1-card-body")) {
      const stage = nowGuideGate3Stages().find(stage => stage.key === item.id);
      if (stage) {
        const html = nowGuidePlainRead(() => `<div class="g1-card-body">${g3ProductJourneyStageExplanationHtmlV296(stage.key)}<p class="g1-task">${escapeHtml(stage.subtitle)}</p><div class="g3-product-journey-grid">${stage.cells.map((cell,index) => g3ProductJourneyCellHtml(cell,index,stage)).join("")}</div>${g3ExecutionBlockHtmlV282(stage)}</div>`);
        article.insertAdjacentHTML("beforeend", html);
      }
    }
    article.classList.add("is-open");
    article.querySelectorAll("select option").forEach(option => {
      if (NOW_STAGE_NAMES[option.value]) option.textContent = NOW_STAGE_NAMES[option.value];
    });
    const toggle = header.querySelector(".g1-section-toggle");
    if (toggle) toggle.textContent = "Свернуть";
  } else if (item.kind === "channel") {
    nowGuidePlainRead(() => {
      g4EnsureLaunchUiState().rows[g4CampaignStateKey(item.productId, item.id)] = true;
      g4FiveFastCampaignToggleV546(header, true);
    });
  }
  nowGuideOpenAncestors(header);
}
function nowGuideGate4EditorTemplate(item) {
  const html = nowGuidePlainRead(() => {
    const channel = g4LaunchChannels().find(channel => channel.key === item.id);
    const campaign = g4EnsureLaunchCampaigns()[g4CampaignStateKey(item.productId, item.id)] || {};
    g4EnsureLaunchUiState().rows[g4CampaignStateKey(item.productId, item.id)] = true;
    return g4CampaignRowHtml(channel, campaign, 0, item.productId);
  });
  const template = document.createElement("template");
  template.innerHTML = html || "";
  return template.content;
}
function nowGuideGate4RevealMissing(item, missing) {
  if (!missing.searchGroup) return;
  const header = nowGuideFindNode(item);
  nowGuidePlainRead(() => {
    const build = ensureGate4SearchBuild(item.productId);
    build.searchStepOpen ||= {};
    build.searchStepOpen.clusters = true;
    const step = header?.parentElement.querySelector('[data-g4sb-step="clusters"]');
    if (step) g4FiveFastCampaignStepToggleV546(step, true);
    build.clusterListOpen ||= {};
    build.clusterListOpen[missing.searchGroup] = true;
    const group = els.contentArea.querySelector(`[data-g4sb-product="${CSS.escape(item.productId)}"][data-g4sb-unit-toggle="${CSS.escape(missing.searchGroup)}"]`);
    if (group) g4FiveFastSearchUnitToggleV546(group, true);
  });
}
// Rendering a guide destination can call legacy ensure helpers. The DOM is
// retained, while all normalisation stays on a private workspace.
const nowGuidePreviousRenderGateTable34 = renderGateTable;
renderGateTable = function (gate, cards) {
  if (gate.id !== nowGuideProtectedGate || !["gate-3", "gate-4"].includes(gate.id))
    return nowGuidePreviousRenderGateTable34.apply(this, arguments);
  return nowGuidePlainRead(view => {
    const source = view.gates.find(source => source.id === gate.id);
    return nowGuidePreviousRenderGateTable34.call(this, source, source.cards);
  });
};
const nowGuidePreviousStageOptions = g3Gate4StageOptionsV290;
g3Gate4StageOptionsV290 = function (selected, model) {
  if (activeGateId !== "gate-3") return nowGuidePreviousStageOptions.apply(this, arguments);
  return (model?.stageOrder || []).map(key => `<option value="${escapeAttr(key)}" ${key === selected ? "selected" : ""}>${escapeHtml(NOW_STAGE_NAMES[key] || model.stages[key]?.title || key)}</option>`).join("");
};
const nowGuidePreviousRenderJourney = renderGate3Redesign;
renderGate3Redesign = function (gate, cards) {
  if (nowGuideProtectedGate !== "gate-3") return nowGuidePreviousRenderJourney.apply(this, arguments);
  return nowGuidePlainRead(view => {
    const source = view.gates.find(source => source.id === "gate-3");
    return nowGuidePreviousRenderJourney.call(this, source, source.cards);
  });
};

// The existing Gate 4 menu counted every product. Use the same campaign
// calculator for the product selected by the shared product_id control.
const nowGuidePreviousGateBlockStatuses = guruGateBlockStatuses;
guruGateBlockStatuses = function (gate) {
  if (gate?.id === "gate-0") {
    const cards = nowGuideGate0Cards(gate);
    return cards.map((card) => guruGate0BlockReadiness(card).status || card.status);
  }
  if (gate?.id === "gate-1") return nowGuideGate1Items(gate)
    .map((item) => nowGuideGate1Assessment(item).status || "not_started");
  if (gate?.id === "gate-3") return nowGuideGate3Stages().map(g3ProductJourneyStageStatus);
  if (gate?.id === "gate-4") return nowGuideWithReadPass(() => nowGuideGate4Items().map(item => item.status));
  return nowGuidePreviousGateBlockStatuses(gate);
};

function nowGuideSafeText(value) {
  return String(value || "").replace(/\u2014/g, "-")
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}]/gu, "").trim();
}

function nowGuideDescriptors(gate, statuses) {
  const id = gate.id;
  const card = (item) => ({ id: item.id, title: item.title, kind: "card", status: item.status });
  if (id === "gate-0") return nowGuideGate0Cards(gate)
    .map((item, index) => ({ ...card(item), status: statuses[index] }));
  if (id === "gate-1") return nowGuideGate1Items(gate)
    .map((item, index) => ({ ...item, status: statuses[index] }));
  if (id === "gate-2") {
    return g2s4Readiness(state).units.map((unit) => ({ id: unit.id,
      title: unit.title, kind: unit.def ? "wizard" : "service",
      wizardId: unit.def?.id || "", status: unit.status,
      scope: unit.scope, productId: unit.productId }));
  }
  if (id === "gate-3") {
    const keys = nowGuideGate3Stages().map(stage => stage.key);
    const productId = state?.project?.gate0ScopeUiV194?.selectedProductId || "";
    return keys.map((key, index) => ({ id: key, title: NOW_STAGE_NAMES[key],
      kind: "stage", productId, status: statuses[index] }));
  }
  if (id === "gate-4") return nowGuideGate4Items().map((item, index) => ({ ...item, status: statuses[index] }));
  if (id === "gate-5") return NOW_GATE5_BLOCKS.map(([key, title], index) =>
    ({ id: key, title, kind: "gate5", status: statuses[index] }));
  if (id === "gate-6") return GATE6_QUARTERS.flatMap((quarter) => quarter.events.map((event) => ({
    id: gate6QuarterEventKey(quarter.key, event.key), title: event.name || event.title,
    kind: "event", quarter: quarter.key,
  }))).map((item, index) => ({ ...item, status: statuses[index] }));
  if (id === "gate-7") {
    const tasks = ensureGate7State().tasks;
    const statusById = new Map(tasks.map((task, index) => [task.id, statuses[index]]));
    const order = new Map(GATE7_BASE_SECTIONS.map((section, index) => [section.id, index]));
    return [...tasks].sort((a, b) => (order.get(a.sectionId) ?? 99) - (order.get(b.sectionId) ?? 99) ||
      Number(a.order || 0) - Number(b.order || 0)).map((task) => ({
      id: task.id, title: task.task || task.title || "Задача", kind: "task",
      section: task.sectionId, status: statusById.get(task.id),
    }));
  }
  if (id === "gate-8") return statuses.map((status, index) => ({
    id: String(index), title: "Прогноз проекта", kind: "forecast", status,
  }));
  return [];
}

function nowGuideBuildPath() {
  if (!state?.gates) return [];
  return nowGuideWithReadPass(() => [...state.gates].sort((a, b) =>
    Number(a.id.replace("gate-", "")) - Number(b.id.replace("gate-", "")))
    .flatMap((gate) => {
      const statuses = guruGateBlockStatuses(gate);
      const items = nowGuideDescriptors(gate, statuses);
      // A unit without a readiness status is outside the path.
      return items.filter((item) => item.status !== undefined && item.status !== null)
        .map((item) => ({ ...item, gateId: gate.id,
          key: `${gate.id}:${item.kind}:${item.productId || ""}:${item.id}`,
          status: guruNormBlockStatus(item.status) }));
    }));
}

function nowGuideCurrent(path) {
  const context = `${activeProjectId || ""}:${state?.project?.gate0ScopeUiV194?.selectedProductId || ""}`;
  if (context !== nowGuideContextKey) {
    nowGuideContextKey = context;
    nowGuideReviewKey = "";
    nowGuideExpanded.clear();
    nowGuideEphemeralGate7Sections.clear();
  }
  if (!nowGuideReviewKey || !path.some((item) => item.key === nowGuideReviewKey))
    nowGuideReviewKey = (path.find((item) => !["ready", "not_required"].includes(item.status)) || path[0])?.key || "";
  return path.find((item) => item.key === nowGuideReviewKey) || null;
}

function nowGuideStatusText(status) {
  return { ready: "Готово", not_required: "Не требуется", in_progress: "В работе",
    problem: "Проблема", not_started: "Не начато" }[status] || "Не начато";
}

function nowGuideRender(path = nowGuideBuildPath()) {
  const panel = document.getElementById("nowGuide");
  if (!panel || !state?.gates) return;
  nowGuideDisplayedPath = path;
  const current = nowGuideCurrent(path);
  const done = path.filter((item) => item.status === "ready" || item.status === "not_required").length;
  const finished = !path.length || done === path.length;
  const index = current ? path.findIndex((item) => item.key === current.key) : -1;
  const ready = current && ["ready", "not_required"].includes(current.status);
  panel.innerHTML = finished
    ? `<h2>Сейчас</h2><strong class="now-guide-finished">Проект готов к запуску</strong><button type="button" class="now-guide-link" data-now-launch>Перейти к Gate 4</button>`
    : `<h2>Сейчас</h2>
       <div class="now-guide-meta"><span>Шаг ${index + 1} из ${path.length}</span><span class="now-guide-status is-${current.status}">${escapeHtml(current.gateId === "gate-4" && current.pageBadge ? nowGuideSafeText(current.pageBadge) : nowGuideStatusText(current.status))}</span></div>
       <div class="now-guide-track" role="progressbar" aria-valuenow="${done}" aria-valuemin="0" aria-valuemax="${path.length}" aria-label="Готово ${done} из ${path.length}"><span style="width:${(done / path.length) * 100}%"></span></div>
       <div class="now-guide-block">${escapeHtml(nowGuideSafeText(current.title))}</div>
       ${nowGuideMissingHtml(current)}
       <div class="now-guide-gate">Gate ${current.gateId.replace("gate-", "")} · ${escapeHtml(NOW_GATE_NAMES[current.gateId] || "")}</div>
       <div class="now-guide-actions"><button type="button" data-now-prev ${index === 0 ? "disabled" : ""}>◀ Назад</button><button type="button" data-now-next class="${ready ? "is-ready" : ""}" ${index + 1 >= path.length ? "disabled" : ""} title="${ready ? "Следующий блок" : "Сначала заполните этот блок"}">Далее ▶</button></div>
       <button type="button" class="now-guide-link" data-now-current>К текущему</button>`;
  const nav = document.getElementById("gateNav");
  if (!nav) return;
  nav.querySelectorAll("[data-now-children]").forEach((node) => node.remove());
  nav.querySelectorAll(".gate-btn[data-gate-id]").forEach((button) => {
    const gateId = button.dataset.gateId;
    const children = path.filter((item) => item.gateId === gateId);
    if (!children.length) return;
    button.classList.toggle("now-guide-gate-current",
      children.some((item) => item.key === current?.key));
    const expanded = nowGuideExpanded.has(gateId);
    button.setAttribute("aria-expanded", String(expanded));
    const list = document.createElement("div");
    list.className = "now-guide-children";
    list.dataset.nowChildren = gateId;
    list.hidden = !expanded;
    list.innerHTML = children.map((item) => `<button type="button" class="now-guide-child ${item.key === current?.key ? "is-current" : ""}" data-now-step="${escapeAttr(item.key)}" title="${escapeAttr(nowGuideSafeText(item.title))}"><span class="now-guide-dot ${item.status === "ready" || item.status === "not_required" ? "is-done" : ""}"></span><span>${escapeHtml(nowGuideSafeText(item.title))}</span></button>`).join("");
    button.insertAdjacentElement("afterend", list);
  });
}

function nowGuideSelect(item, path = nowGuideBuildPath()) {
  if (!item) return;
  nowGuideReviewKey = item.key;
  nowGuideExpanded.add(item.gateId);
  nowGuideRender(path);
  nowGuideOpen(item);
}

function nowGuideFindNode(item) {
  const root = document.getElementById("contentArea");
  if (!root) return null;
  const attr = (value) => CSS.escape(String(value));
  if (item.gateId === "gate-1") return nowGuideGate1Node(item);
  if (item.gateId === "gate-4" && item.selector) return root.querySelector(item.selector);
  if (item.kind === "card") {
    const card = root.querySelector(`[data-card="${attr(item.id)}"], [data-card-row="${attr(item.id)}"]`);
    return card?.matches("details.gate0-card")
      ? card.querySelector(":scope > summary") || card
      : card?.querySelector(":scope > .g1-card-header, :scope > .work-card-header") || card;
  }
  if (item.kind === "wizard") {
    const card = root.querySelector(`[data-g2w-card-view="${attr(item.wizardId)}"]`);
    return card?.querySelector(":scope > summary") || card;
  }
  if (item.kind === "service") {
    const card = root.querySelector(`[data-g2sb-id="${attr(item.id)}"]`);
    return card?.querySelector(":scope > summary") || card;
  }
  if (item.kind === "stage") return root.querySelector(`[data-g3-product-stage-toggle="${attr(item.id)}"]`);
  if (item.kind === "channel") return root.querySelector(`[data-g4camp-toggle="${attr(g4CampaignStateKey(item.productId, item.id))}"]`);
  if (item.kind === "gate5") return root.querySelector(`[data-gate5-open="${attr(item.id)}"]`);
  if (item.kind === "event") {
    const card = root.querySelector(`[data-g6-event-detail="${attr(item.id)}"]`);
    return card?.querySelector(":scope > summary") || card;
  }
  if (item.kind === "task") return root.querySelector(`[data-g7-task="${attr(item.id)}"]`);
  if (item.kind === "forecast") return root.querySelector('[data-g8-model-scope="product"] > .g8-model-heading');
  if (item.kind === "map") {
    const card = root.querySelector(`[data-pv140-map-index="${attr(item.id)}"]`);
    return card?.querySelector(":scope > .pv140-product-head") || card || null;
  }
  if (item.kind === "demand") return root.querySelector('[data-gate1-toggle-section="demand_semantics"]');
  if (item.kind === "unit") return root.querySelector('[data-gate1-toggle-section="unit_economics"]');
  if (item.kind === "comparison") return root.querySelector("[data-project-comparison-toggle]");
  if (item.kind === "audience") return root.querySelector("[data-target-audience-toggle]");
  const candidates = [...root.querySelectorAll("h2,h3,h4,.g1-card-title,.subblock-title,.work-card-title")];
  return candidates.find((node) => nowGuideSafeText(node.textContent) === nowGuideSafeText(item.title)) || null;
}

function nowGuideReveal(item) {
  const root = document.getElementById("contentArea");
  if (!root) return false;
  if (item.gateId === "gate-1") nowGuideGate1Reveal(item);
  if (item.gateId === "gate-3" || item.gateId === "gate-4") nowGuideReveal34(item);
  let node = nowGuideFindNode(item);
  if (node) {
    const closedSection = node.closest(".g1-section:not(.is-open), .analytics-subblock:not(.is-open)");
    if (closedSection && item.gateId !== "gate-1") {
      const toggle = closedSection.querySelector(":scope > [data-gate1-toggle-section]");
      if (toggle) { toggle.click(); return false; }
    }
    const hiddenGate0Section = node.closest(".gate0-section-content-hidden");
    if (hiddenGate0Section) {
      let heading = hiddenGate0Section.previousElementSibling;
      while (heading && !heading.matches("[data-gate0-section-heading]"))
        heading = heading.previousElementSibling;
      if (heading?.dataset.gate0SectionHeading)
        gate0SetSectionOpen(heading.dataset.gate0SectionHeading, true);
    }
    const service = node.closest("details.g2sb-block, details.g2w-card");
    if (service && !service.open) {
      service._guruRenderedOpen = true;
      service.dataset.guruDisclosureExpectedV512 = "1";
      service.open = true;
    }
    const closedGate0Card = node.closest("details.gate0-card:not([open])");
    if (closedGate0Card) {
      closedGate0Card._guruRenderedOpen = true;
      closedGate0Card.open = true;
    }
    if (nowGuideHighlightedNode) nowGuideHighlightedNode.classList.remove("now-guide-highlight");
    clearTimeout(nowGuideHighlightTimer);
    nowGuideHighlightedNode = node;
    node.classList.add("now-guide-highlight");
    node.scrollIntoView({ behavior: "instant", block: "start" });
    nowGuideHighlightTimer = setTimeout(() => {
      node.classList.remove("now-guide-highlight");
      if (nowGuideHighlightedNode === node) nowGuideHighlightedNode = null;
    }, 2400);
    return true;
  }
  if (item.gateId === "gate-1") {
    const gate = state?.gates?.find((gate) => gate.id === "gate-1");
    const cardSection = item.kind === "card" && gate
      ? getGate1Sections(gate, gate.cards).find((entry) =>
        entry.allInnerCards?.some((card) => card.id === item.id))?.key : "";
    const sectionKey = item.kind === "map" ? "pain_jtbd_offer" :
      cardSection || "site_audit";
    const section = root.querySelector(`[data-gate1-toggle-section="${CSS.escape(sectionKey)}"]`);
    if (section && !section.closest(".g1-section, .analytics-subblock")?.classList.contains("is-open")) {
      section.click();
      return false;
    }
  }
  if (item.gateId === "gate-6") {
    const quarter = root.querySelector(`[data-g6-open-quarter="${CSS.escape(item.quarter)}"]`);
    if (quarter && !quarter.closest(".gate6-quarter")?.classList.contains("is-open")) {
      quarter.click(); return false;
    }
  }
  if (item.gateId === "gate-7") {
    const section = root.querySelector(`[data-g7-toggle-section="${CSS.escape(item.section || "")}"]`);
    if (section && !section.closest(".gate7-section")?.classList.contains("is-open")) {
      nowGuideEphemeralGate7Sections.add(item.section);
      renderGate();
      return false;
    }
  }
  return false;
}

function nowGuideOpen(item, missing = null) {
  if (!item) return;
  if (missing?.sourceItem) return nowGuideOpen(missing.sourceItem, { ...missing, sourceItem: null });
  nowGuideProtectedGate = item.gateId;
  const ticket = ++nowGuideNavigationTicket;
  nowGuideGate1NavigationPending = item.gateId === "gate-1";
  if (nowGuideGate1NavigationPending) nowGuideGate1PassiveCalculators = true;
  const hadFilter = Boolean(els.searchInput?.value || (els.statusFilter && els.statusFilter.value !== "all"));
  if (els.searchInput) els.searchInput.value = "";
  if (els.statusFilter) els.statusFilter.value = "all";
  const sameGate = activeView === "gate" && activeGateId === item.gateId;
  if (sameGate && hadFilter && guruRenderedGateId === item.gateId) renderGate();
  else guruNavigateToGate(item.gateId);
  document.getElementById("appShell")?.classList.remove("sidebar-open");
  document.body.style.overflow = "";
  const started = performance.now();
  let renderedAt = 0;
  const seek = () => {
    if (ticket !== nowGuideNavigationTicket || activeGateId !== item.gateId) return;
    if (guruRenderedGateId === item.gateId && !renderedAt) renderedAt = performance.now();
    if (renderedAt && nowGuideReveal(item)) {
      nowGuideGate1NavigationPending = false;
      if (missing && !missing.fallback) {
        if (item.gateId === "gate-4") nowGuideGate4RevealMissing(item, missing);
        const field = nowGuideMissingNode(missing);
        if (field) {
          for (let parent = field.parentElement; parent && parent !== els.contentArea; parent = parent.parentElement) {
            if (["gate-1", "gate-2", "gate-3", "gate-4"].includes(item.gateId)) {
              if (parent.hidden) parent.hidden = false;
              if (parent.matches(".target-audience-card, .uv130-item, .g1-card, .unit-direction-group")) {
                parent.classList.add("is-open"); parent.classList.remove("is-collapsed");
              }
            }
            if (parent.matches("details") && !parent.open) {
              parent._guruRenderedOpen = true;
              if (["gate-1", "gate-2", "gate-3", "gate-4"].includes(item.gateId)) parent.dataset.guruDisclosureExpectedV512 = "1";
              parent.open = true;
            }
          }
          if (nowGuideHighlightedNode) nowGuideHighlightedNode.classList.remove("now-guide-highlight");
          nowGuideHighlightedNode = field;
          field.classList.add("now-guide-highlight");
          clearTimeout(nowGuideHighlightTimer);
          nowGuideHighlightTimer = setTimeout(() => {
            field.classList.remove("now-guide-highlight");
            if (nowGuideHighlightedNode === field) nowGuideHighlightedNode = null;
          }, 2400);
          field.scrollIntoView({ behavior: "instant", block: "center" });
          if (!missing.step) field.focus({ preventScroll: true });
          return;
        }
        nowGuideRender(nowGuideDisplayedPath);
      }
      // Some gate renderers restore a previous scroll anchor on the next paint.
      // Check the final position once more after those callbacks have run.
      setTimeout(() => {
        if (ticket !== nowGuideNavigationTicket || activeGateId !== item.gateId) return;
        const node = nowGuideFindNode(item);
        if (!node) return;
        const rect = node.getBoundingClientRect();
        if (rect.bottom < 60 || rect.top > window.innerHeight - 60)
          node.scrollIntoView({ behavior: "instant", block: "start" });
      }, 50);
      return;
    }
    if ((renderedAt && performance.now() - renderedAt < 15000) ||
        (!renderedAt && performance.now() - started < 120000)) setTimeout(seek, 75);
  };
  setTimeout(seek, 0);
}

const nowGuidePreviousRenderGateNav = renderGateNav;
renderGateNav = function (...args) {
  const renderNavigation = () => {
    const result = nowGuidePreviousRenderGateNav.apply(this, args);
    if (!(guruUserEditDispatchActive && guruUserEditEventType === "input") && !guruFastGateNavigation)
      nowGuideRender();
    return result;
  };
  // Navigation in these two gates reads legacy derived statuses through a
  // private view. A menu render must not synchronise other gates' evidence.
  if (["gate-1", "gate-2", "gate-3", "gate-4"].includes(activeGateId) && !guruUserEditDispatchActive)
    return nowGuideWithReadPass(() => nowGuidePlainRead(renderNavigation));
  return nowGuideWithReadPass(renderNavigation);
};

document.getElementById("nowGuide")?.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const path = nowGuideDisplayedPath;
  const current = nowGuideCurrent(path);
  const index = path.findIndex((item) => item.key === current?.key);
  if (button.hasAttribute("data-now-missing")) {
    nowGuideOpen(current, nowGuideDisplayedMissing[Number(button.dataset.nowMissing)]);
    return;
  }
  if (button.hasAttribute("data-now-launch")) { guruNavigateToGate("gate-4"); return; }
  if (button.hasAttribute("data-now-current")) {
    nowGuideSelect(path.find((item) => !["ready", "not_required"].includes(item.status)) || path[0], path);
  } else if (button.hasAttribute("data-now-prev")) {
    nowGuideSelect(path[index - 1], path);
  } else if (button.hasAttribute("data-now-next")) {
    nowGuideSelect(path[index + 1], path);
  }
});

let nowGuideMissingRefreshQueued = false;
function nowGuideScheduleMissingRefresh(event) {
  if (!event.target?.closest?.("#contentArea") || nowGuideCurrent(nowGuideDisplayedPath)?.gateId !== "gate-0") return;
  if (nowGuideMissingRefreshQueued) return;
  nowGuideMissingRefreshQueued = true;
  queueMicrotask(() => {
    nowGuideMissingRefreshQueued = false;
    const gate = state?.gates?.find((gate) => gate.id === "gate-0");
    if (!gate) return;
    const statuses = guruGateBlockStatuses(gate);
    const ids = nowGuideGate0Cards(gate).map((card) => card.id);
    // Publish this one assessment to all three Gate 0 status surfaces in
    // the same input cycle, without rebuilding or saving the form.
    ids.forEach((id, index) => {
      const badge = document.querySelector(`details.gate0-card[data-card-row="${CSS.escape(id)}"] .gate0-card-status`);
      if (!badge) return;
      const status = guruNormBlockStatus(statuses[index]);
      badge.className = `gate0-card-status status-${status}`;
      badge.textContent = STATUS_LABELS[status] || status;
    });
    const readiness = guruReadinessFromStatuses(statuses);
    guruGateReadinessCache.set(gate.id, readiness);
    const menu = document.querySelector('[data-gate-id="gate-0"] .small');
    if (menu) menu.textContent = `${readiness.total} блоков, прогресс ${readiness.percent}%`;
    const path = nowGuideDisplayedPath.map((item) => item.gateId === "gate-0"
      ? { ...item, status: guruNormBlockStatus(statuses[ids.indexOf(item.id)]) } : item);
    if (path.some((item, index) => item.status !== nowGuideDisplayedPath[index]?.status)) {
      nowGuideRender(path);
    } else {
      nowGuideDisplayedPath = path;
      const html = nowGuideMissingHtml(nowGuideCurrent(path));
      const current = document.querySelector("#nowGuide .now-guide-missing");
      if (current && current.outerHTML !== html) current.outerHTML = html;
    }
  });
}
let nowGuideGate12RefreshQueued = false;
function nowGuideScheduleGate12Refresh(event) {
  if (!event.target?.closest?.("#contentArea") ||
      (!["gate-1", "gate-2", "gate-3", "gate-4"].includes(activeGateId) &&
       !(activeGateId === "gate-0" && nowGuideCurrent(nowGuideDisplayedPath)?.gateId === "gate-3"))) return;
  if (nowGuideGate12RefreshQueued) return;
  nowGuideGate12RefreshQueued = true;
  queueMicrotask(() => {
    nowGuideGate12RefreshQueued = false;
    const gate = state.gates.find((gate) => gate.id === activeGateId);
    if (!gate || !["gate-0", "gate-1", "gate-2", "gate-3", "gate-4"].includes(gate.id)) return;
    const { statuses, descriptors } = nowGuideWithReadPass(() => {
      const statuses = guruGateBlockStatuses(gate);
      return { statuses, descriptors: nowGuideDescriptors(gate, statuses) };
    });
    const identity = item => `${item.kind}:${item.productId || ""}:${item.id}`;
    const byId = new Map(descriptors.map(item => [identity(item), { ...item, status: guruNormBlockStatus(item.status) }]));
    const path = nowGuideDisplayedPath.map(item => item.gateId === gate.id
      ? { ...item, ...byId.get(identity(item)) } : item);
    const summary = guruReadinessFromStatuses(statuses);
    guruGateReadinessCache.set(gate.id, summary);
    const menu = document.querySelector(`[data-gate-id="${gate.id}"] .small`);
    if (menu) menu.textContent = `${summary.total} блоков, прогресс ${summary.percent}%`;
    if (gate.id === "gate-1") nowGuideGate1Refresh();
    if (gate.id === "gate-4") descriptors.forEach(item => {
      // A canonical campaign can be shown in two funnel rows. Both views
      // display the same assessment; the path still contains it only once.
      els.contentArea.querySelectorAll(item.selector).forEach(header => {
        const badge = header.querySelector(".status-pill");
        if (!badge) return;
        [...badge.classList].filter(name => name !== "status-pill" && name.startsWith("status-")).forEach(name => badge.classList.remove(name));
        badge.classList.add(`status-${item.rawStatus || item.status}`);
        badge.textContent = item.pageBadge;
      });
    });
    const journey = state.gates.find(gate => gate.id === "gate-3");
    const journeyStatuses = guruGateBlockStatuses(journey);
    const journeySummary = guruReadinessFromStatuses(journeyStatuses);
    guruGateReadinessCache.set(journey.id, journeySummary);
    const journeyMenu = document.querySelector('[data-gate-id="gate-3"] .small');
    if (journeyMenu) journeyMenu.textContent = `${journeySummary.total} блоков, прогресс ${journeySummary.percent}%`;
    const journeyById = new Map(nowGuideGate3Stages().map((stage, index) => [stage.key, guruNormBlockStatus(journeyStatuses[index])]));
    const updated = path.map(item => item.gateId === "gate-3"
      ? { ...item, status: journeyById.get(item.id) || item.status } : item);
    nowGuideRender(updated);
  });
}
document.addEventListener("input", nowGuideScheduleGate12Refresh);
document.addEventListener("change", nowGuideScheduleGate12Refresh);
const nowGuidePreviousRenderGate1 = renderGate1Accordion;
renderGate1Accordion = function (...args) {
  let result;
  if (nowGuideGate1NavigationPending) {
    // Some legacy rendering migrations use structuredClone. A plain private
    // workspace supports them while keeping the live project unchanged.
    const html = guruExportWithoutPersistenceV223(() => nowGuideGate12WithView((workspace) => {
      const gate = workspace.gates.find((gate) => gate.id === "gate-1");
      const ids = new Set((args[1] || gate.cards).map((card) => card.id));
      nowGuidePreviousRenderGate1.call(this, gate, gate.cards.filter((card) => ids.has(card.id)));
      return els.contentArea.innerHTML;
    }, guruExportDiagnosticCloneV223(state)));
    if (html) {
      // Rebind controls against the live workspace after rendering the
      // private view; no event handler retains a scratch model.
      els.contentArea.innerHTML = html;
      els.contentArea.querySelectorAll("*").forEach((node) => {
        for (const attribute of [...node.attributes])
          if (/^data-.*-bound(?:-|$)/.test(attribute.name)) node.removeAttribute(attribute.name);
      });
      bindGate1Accordion(); bindDemandRouteEvents(); bindPainOfferRouteEvents();
      bindUnitEconomicsRouteEvents(); bindCardInputs();
    }
  } else {
    nowGuideGate1PassiveCalculators = false;
    result = nowGuidePreviousRenderGate1.apply(this, args);
  }
  nowGuideBindCalculatorEdits();
  nowGuideGate1Refresh();
  return result;
};

document.addEventListener("input", nowGuideScheduleMissingRefresh);
document.addEventListener("change", nowGuideScheduleMissingRefresh);

document.getElementById("gateNav")?.addEventListener("click", (event) => {
  const child = event.target.closest("[data-now-step]");
  if (child) {
    const path = nowGuideDisplayedPath;
    nowGuideSelect(path.find((item) => item.key === child.dataset.nowStep), path);
    return;
  }
  const gate = event.target.closest(".gate-btn[data-gate-id]");
  if (gate) {
    const id = gate.dataset.gateId;
    if (nowGuideExpanded.has(id)) nowGuideExpanded.delete(id);
    else nowGuideExpanded.add(id);
    nowGuideRender();
  }
});

if (state?.gates) {
  guruGateReadinessCache = new Map();
  renderGateNav({ recalculate: false });
}
