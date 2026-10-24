/* «Сейчас»: временное состояние просмотра, без собственного хранилища. */
let nowGuideReviewKey = "";
let nowGuideContextKey = "";
let nowGuideNavigationTicket = 0;
let nowGuideHighlightedNode = null;
let nowGuideHighlightTimer = 0;
let nowGuideDisplayedPath = [];
let nowGuideDisplayedMissing = [];
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
const nowGuideMissingProviders = new Map([["gate-0", nowGuideGate0Missing]]);
function nowGuideMissingDetails(item) {
  const provider = item && nowGuideMissingProviders.get(item.gateId);
  if (!provider) return null;
  if (item.status === "not_required") return { text: "Не требуется", items: [], unresolved: [] };
  if (item.status === "ready") return { text: "Всё заполнено", items: [], unresolved: [] };
  return provider(item);
}

function nowGuideMissingHtml(item) {
  const details = nowGuideMissingDetails(item);
  nowGuideDisplayedMissing = details?.items || [];
  if (!details) return "";
  if (details.text) return `<div class="now-guide-missing" aria-live="polite">${details.text}</div>`;
  return `<div class="now-guide-missing" aria-live="polite"><span>Не хватает:</span><ul>${details.items.slice(0, 3)
    .map((check, index) => `<li><button type="button" data-now-missing="${index}">${escapeHtml(check.label)}</button></li>`).join("")}</ul>${details.items.length > 3
    ? `<span>и ещё ${details.items.length - 3}</span>` : ""}</div>`;
}

function nowGuideGate1Items(gate) {
  const selectedId = state?.project?.gate0ScopeUiV194?.selectedProductId || "";
  const maps = (state?.painV130?.productMaps || []).map((map, index) => ({ map, index }))
    .filter(({ map }) => map?.product_id === selectedId)
    .map(({ map, index }) => ({ id: String(index), title: map.product || map.name || "Карта продукта",
      kind: "map", productId: selectedId }));
  const extras = new Map([
    ["unit_economics", typeof getUnitEconomicsStatus === "function"
      ? { id: "unit-economics", title: "Юнит-экономика", kind: "unit" } : null],
    ["project-comparison", typeof projectComparisonStatus === "function"
      ? { id: "project-comparison", title: "Сравнение проекта", kind: "comparison" } : null],
    ["target-audience", typeof ensureTargetAudience === "function" &&
      typeof targetAudienceStatus === "function"
      ? { id: "target-audience", title: "Целевая аудитория", kind: "audience" } : null],
  ]);
  const tech = new Map((gate.cards || []).filter((card) => isTechCard(card))
    .map((card) => [card.id, { id: card.id, title: card.title, kind: "card" }]));
  const sections = getGate1Sections(gate, gate.cards).filter((section) => !section.hidden);
  const ordered = [];
  const audit = sections.find((section) => section.key === "site_audit");
  const grouped = { seo: [], structure: [], legal: [] };
  for (const card of audit?.allInnerCards || []) {
    if (!tech.has(card.id)) continue;
    const group = typeof gate1CompanyAuditGroupV299 === "function"
      ? gate1CompanyAuditGroupV299(card) : "seo";
    (grouped[group] || grouped.structure).push(tech.get(card.id));
  }
  ordered.push(...grouped.seo);
  if (extras.get("project-comparison")) ordered.push(extras.get("project-comparison"));
  ordered.push(...grouped.structure, ...grouped.legal);
  if (extras.get("target-audience")) ordered.push(extras.get("target-audience"));
  for (const section of sections) {
    if (section.key === "site_audit") continue;
    for (const card of section.allInnerCards || []) {
      if (tech.has(card.id)) ordered.push(tech.get(card.id));
    }
    if (section.key === "pain_jtbd_offer") ordered.push(...maps);
    if (section.key === "unit_economics" && extras.get("unit_economics"))
      ordered.push(extras.get("unit_economics"));
  }
  return ordered;
}

// The existing Gate 4 menu counted every product. Use the same campaign
// calculator for the product selected by the shared product_id control.
const nowGuidePreviousGateBlockStatuses = guruGateBlockStatuses;
guruGateBlockStatuses = function (gate) {
  if (gate?.id === "gate-0") {
    const cards = nowGuideGate0Cards(gate);
    return cards.map((card) => guruGate0BlockReadiness(card).status || card.status);
  }
  if (gate?.id === "gate-1") {
    const items = nowGuideGate1Items(gate);
    const byKey = new Map();
    const safeStatus = (calculate) => {
      try { return calculate(); } catch (_) { return "not_started"; }
    };
    items.filter((item) => item.kind === "map").forEach((item) => {
      const map = state?.painV130?.productMaps?.[Number(item.id)];
      byKey.set(`map:${item.id}`, map ? pv140ProductMapStatus(map).status : null);
    });
    if (typeof getUnitEconomicsStatus === "function")
      byKey.set("unit:unit-economics", state?.unitEconomicsRoute
        ? safeStatus(getUnitEconomicsStatus) : "not_started");
    if (typeof projectComparisonStatus === "function")
      byKey.set("comparison:project-comparison", state?.projectComparison
        ? safeStatus(() => projectComparisonStatus(state.projectComparison).status) : "not_started");
    if (typeof targetAudienceStatus === "function")
      byKey.set("audience:target-audience", state?.targetAudience
        ? safeStatus(() => targetAudienceStatus(state.targetAudience).status) : "not_started");
    (gate.cards || []).filter((card) => isTechCard(card)).forEach((card) =>
      byKey.set(`card:${card.id}`, card.status));
    return items.map((item) => byKey.get(`${item.kind}:${item.id}`))
      .filter((status) => status !== undefined && status !== null);
  }
  if (gate?.id !== "gate-4") return nowGuidePreviousGateBlockStatuses(gate);
  const productId = state?.project?.gate0ScopeUiV194?.selectedProductId || "";
  if (!productId) return [];
  const campaigns = g4EnsureLaunchCampaigns();
  return g4LaunchChannels().map((channel) => {
    const campaign = campaigns[g4CampaignStateKey(productId, channel.key)] || {};
    return g4IsYandexSearchChannel(channel)
      ? g4sbCampaignStatus(productId, campaign, ensureGate4SearchBuild(productId))
      : g4CampaignStatus(campaign);
  });
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
    const keys = ["aware", "appeal", "ask", "act", "advocate"];
    const productId = state?.project?.gate0ScopeUiV194?.selectedProductId || "";
    return keys.map((key, index) => ({ id: key, title: NOW_STAGE_NAMES[key],
      kind: "stage", productId, status: statuses[index] }));
  }
  if (id === "gate-4") {
    const productId = state?.project?.gate0ScopeUiV194?.selectedProductId || "";
    return productId ? g4LaunchChannels().map((channel, index) => ({
      id: channel.key, title: g4LaunchChannelLabel(channel), kind: "channel",
      productId, status: statuses[index],
    })) : [];
  }
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
  return [...state.gates].sort((a, b) =>
    Number(a.id.replace("gate-", "")) - Number(b.id.replace("gate-", "")))
    .flatMap((gate) => {
      const statuses = guruGateBlockStatuses(gate);
      const items = nowGuideDescriptors(gate, statuses);
      // A unit without a readiness status is outside the path.
      return items.filter((item) => item.status !== undefined && item.status !== null)
        .map((item) => ({ ...item, gateId: gate.id,
          key: `${gate.id}:${item.kind}:${item.productId || ""}:${item.id}`,
          status: guruNormBlockStatus(item.status) }));
    });
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
       <div class="now-guide-meta"><span>Шаг ${index + 1} из ${path.length}</span><span class="now-guide-status is-${current.status}">${nowGuideStatusText(current.status)}</span></div>
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
  let node = nowGuideFindNode(item);
  if (node) {
    const closedSection = node.closest(".g1-section:not(.is-open), .analytics-subblock:not(.is-open)");
    if (closedSection) {
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
  const ticket = ++nowGuideNavigationTicket;
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
      if (missing && !missing.fallback) {
        const field = nowGuideMissingNode(missing);
        if (field) {
          for (let parent = field.parentElement; parent && parent !== els.contentArea; parent = parent.parentElement) {
            if (parent.matches("details") && !parent.open) {
              parent._guruRenderedOpen = true;
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
          field.focus({ preventScroll: true });
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
  const result = nowGuidePreviousRenderGateNav.apply(this, args);
  if (!(guruUserEditDispatchActive && guruUserEditEventType === "input") && !guruFastGateNavigation)
    nowGuideRender();
  return result;
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
