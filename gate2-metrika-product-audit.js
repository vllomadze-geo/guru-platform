/* Gate 2: three product-scoped checks before traffic. Retired cards are archived. */
const G2_METRIKA_PRODUCT_FIELD_V367 = "metrikaProductV367";
const G2_METRIKA_PRODUCT_RETIRED_V383 = new Set([
  "g2-metrika-product-webvisor", "g2-metrika-product-internal-filter", "g2-metrika-product-antibot",
]);
const G2_METRIKA_PRODUCT_LEGACY_V367 = new Set([
  "card-100", "card-101", "card-102", "card-103", "card-104",
  "g2-metrika-goals-traffic", "g2-metrika-goals-calls", "g2-metrika-goals-email",
  "g2-metrika-goals-widgets", "g2-metrika-goals-kpi", "g2-internal-filter", "g2-antibot",
  ...G2_METRIKA_PRODUCT_RETIRED_V383,
]);

const G2_METRIKA_PRODUCT_CARDS_V367 = [
  { id: "g2-metrika-product-counter", title: "Счётчик фиксирует визит на странице выбранного товара" },
  { id: "g2-metrika-goals-primary", title: "Главная конверсия товара фиксируется корректно" },
  { id: "g2-metrika-product-goals", title: "Дополнительные конверсионные цели товара работают корректно" },
];
const G2_METRIKA_PRODUCT_BY_ID_V367 = new Map(G2_METRIKA_PRODUCT_CARDS_V367.map((guide) => [guide.id, guide]));

function g2MetrikaProductDataV367(card) {
  if (card?.id === "g2-metrika-goals-primary") return card?.fields?.metrikaQualityV360 || {};
  return card?.fields?.[G2_METRIKA_PRODUCT_FIELD_V367] || {};
}

function g2MetrikaProductRowV367(card, productId, create = false) {
  if (!card || !productId) return null;
  if (create) {
    card.fields = card.fields && typeof card.fields === "object" ? card.fields : {};
    const key = card.id === "g2-metrika-goals-primary" ? "metrikaQualityV360" : G2_METRIKA_PRODUCT_FIELD_V367;
    card.fields[key] = card.fields[key] && typeof card.fields[key] === "object" ? card.fields[key] : {};
  }
  const data = g2MetrikaProductDataV367(card);
  if (create && !Array.isArray(data.perProduct)) data.perProduct = [];
  let row = (Array.isArray(data.perProduct) ? data.perProduct : [])
    .find((entry) => entry?.product_id === productId);
  if (!row && create) {
    row = { product_id: productId };
    data.perProduct.push(row);
  }
  return row || null;
}

const g2MetrikaProductTextV367 = (value) => String(value ?? "").trim();
const g2MetrikaProductHasV367 = (value) => Boolean(g2MetrikaProductTextV367(value));

function g2MetrikaProductStatusV367(card, productId = guruV194SelectedProduct(state)?.id || "", workspace = state) {
  if (!productId) return "not_started";
  const row = g2MetrikaProductRowV367(card, productId);
  const companyStatus = (kind) => {
    const source = g2MetrikaCompanyCardV374(kind, workspace);
    return source && g2MetrikaCompanyStatusV374(source) === "ready";
  };
  const relevantFields = {
    "g2-metrika-product-counter": ["visitAt"],
    "g2-metrika-goals-primary": ["mainAction", "goalRefId", "testConversionAt"],
    "g2-metrika-product-goals": ["notNeededReason"],
  }[card.id] || [];
  if (!row || (!relevantFields.some((key) => g2MetrikaProductHasV367(row[key])) &&
      !(card.id === "g2-metrika-product-goals" && Array.isArray(row.goals) && row.goals.length)))
    return "not_started";
  const goals = Array.isArray(row.goals) ? row.goals : [];
  const primaryGoal = card.id === "g2-metrika-goals-primary"
    ? g2MetrikaCompanyGoalV374(row.goalRefId, workspace) : null;
  const thankYouGoalState = g2MetrikaCompanyDataV374("goals", workspace).primaryGoal?.state;
  if (primaryGoal?.type === "page_visit" && thankYouGoalState === "not_works") return "problem";
  if (card.id === "g2-metrika-product-goals" && goals.length === 0 &&
      g2MetrikaProductHasV367(row.notNeededReason)) return "not_needed";
  const checks = {
    "g2-metrika-product-counter": () => companyStatus("counter") && g2MetrikaProductHasV367(row.visitAt),
    "g2-metrika-goals-primary": () =>
      companyStatus("counter") && companyStatus("goals") &&
      g2MetrikaProductHasV367(row.mainAction) &&
      Boolean(primaryGoal) &&
      (primaryGoal.type !== "page_visit" || thankYouGoalState === "works") &&
      g2MetrikaProductHasV367(row.testConversionAt),
    "g2-metrika-product-goals": () => companyStatus("counter") && companyStatus("goals") &&
      goals.length > 0 && goals.every((goal) =>
        ["action", "goalRefId", "actionSteps", "testAt"]
          .every((key) => g2MetrikaProductHasV367(goal[key])) &&
        Boolean(g2MetrikaCompanyGoalV374(goal.goalRefId, workspace))) &&
      new Set(goals.map((goal) => goal.goalRefId)).size === goals.length &&
      !goals.some((goal) => goal.goalRefId === g2MetrikaProductRowV367(
        workspace.gates.find((gate) => gate.id === "gate-2")?.cards.find((item) => item.id === "g2-metrika-goals-primary"),
        productId)?.goalRefId),
  };
  if (checks[card.id]?.()) return "ready";
  return "in_progress";
}

const __g2MetrikaProductPrevEnsureV367 = ensureGate2Structure;
ensureGate2Structure = function (gate) {
  __g2MetrikaProductPrevEnsureV367(gate);
  if (gate?.id !== "gate-2" || !Array.isArray(gate.cards)) return;
  const retired = gate.cards.filter((card) => G2_METRIKA_PRODUCT_RETIRED_V383.has(card.id));
  if (retired.length) {
    gate.archivedMetrikaProductCardsV383 ||= [];
    retired.forEach((card) => {
      if (!gate.archivedMetrikaProductCardsV383.some((entry) => entry.id === card.id))
        gate.archivedMetrikaProductCardsV383.push(card);
    });
    for (let index = gate.cards.length - 1; index >= 0; index -= 1)
      if (G2_METRIKA_PRODUCT_RETIRED_V383.has(gate.cards[index].id)) gate.cards.splice(index, 1);
  }
  // The per-step checklist was removed from the UI; discard its stored data too.
  for (const card of gate.cards) {
    if (G2_METRIKA_PRODUCT_BY_ID_V367.has(card.id) && card.fields)
      delete card.fields.metrikaGuideChecklistV368;
  }
  const existing = new Set(gate.cards.map((card) => card.id));
  const added = G2_METRIKA_PRODUCT_CARDS_V367.filter((guide) => !existing.has(guide.id))
    .map((guide) => ({
      id: guide.id, title: guide.title, instruction: "", status: "not_started",
      evidence: "", pages: "", notes: "",
      fields: { [G2_METRIKA_PRODUCT_FIELD_V367]: { perProduct: [] } },
      generatedBy: "gate2-metrika-product-audit-v367",
    }));
  const primary = gate.cards.find((card) => card.id === "g2-metrika-goals-primary");
  if (primary) primary.title = G2_METRIKA_PRODUCT_BY_ID_V367.get(primary.id).title;
  if (added.length) {
    const index = gate.cards.findIndex((card) => card.id === "card-105");
    gate.cards.splice(index < 0 ? gate.cards.length : index + 1, 0, ...added);
  }
};

const __g2MetrikaProductPrevSectionKeyV367 = g2SectionKeyForCardV271;
g2SectionKeyForCardV271 = function (card) {
  return G2_METRIKA_PRODUCT_BY_ID_V367.has(card?.id)
    ? G2_METRIKA_QUALITY_PRODUCT_SECTION_V361
    : __g2MetrikaProductPrevSectionKeyV367(card);
};

const __g2MetrikaProductPrevSectionsV367 = g2GetSections;
g2GetSections = function (gate, visibleIds) {
  const active = new Set([...visibleIds].filter((id) => !G2_METRIKA_PRODUCT_LEGACY_V367.has(id)));
  const sections = __g2MetrikaProductPrevSectionsV367(gate, active);
  const product = sections.find((section) => section.key === G2_METRIKA_QUALITY_PRODUCT_SECTION_V361);
  if (product) product.cards.sort((a, b) =>
    G2_METRIKA_PRODUCT_CARDS_V367.findIndex((guide) => guide.id === a.id) -
    G2_METRIKA_PRODUCT_CARDS_V367.findIndex((guide) => guide.id === b.id));
  return sections;
};

const __g2MetrikaProductPrevScopeAuditV367 = g2ScopeAuditV267;
g2ScopeAuditV267 = function (gate, workspace = state) {
  const audit = __g2MetrikaProductPrevScopeAuditV367(gate, workspace);
  const active = audit.rows.filter((row) => !G2_METRIKA_PRODUCT_LEGACY_V367.has(row.cardId));
  return { rows: active, company: active.filter((row) => row.scope === "company"),
    product: active.filter((row) => row.scope === "product") };
};

const __g2MetrikaProductPrevCardStatusV367 = g2CardStatus;
g2CardStatus = function (card) {
  return G2_METRIKA_PRODUCT_BY_ID_V367.has(card?.id)
    ? g2MetrikaProductStatusV367(card)
    : __g2MetrikaProductPrevCardStatusV367(card);
};

const __g2MetrikaProductPrevRecalculateV367 = recalculateStatusForCard;
recalculateStatusForCard = function (card, workspace = state) {
  if (!G2_METRIKA_PRODUCT_BY_ID_V367.has(card?.id))
    return __g2MetrikaProductPrevRecalculateV367.apply(this, arguments);
  const productId = guruV194SelectedProduct(workspace)?.id || "";
  card.status = g2MetrikaProductStatusV367(card, productId, workspace);
};

// Gate 4's goal quality lookup uses this existing function and the same goalId row.
g2MetrikaQualityPrimaryStatusV361 = function (card, productId) {
  return g2MetrikaProductStatusV367(card, productId);
};

const __g2MetrikaProductPrevBlockStatusesV367 = guruGateBlockStatuses;
guruGateBlockStatuses = function (gate) {
  if (gate?.id !== "gate-2") return __g2MetrikaProductPrevBlockStatusesV367(gate);
  return (gate.cards || [])
    .filter((card) => !G2_METRIKA_PRODUCT_LEGACY_V367.has(card.id))
    .map((card) => G2_METRIKA_PRODUCT_BY_ID_V367.has(card.id)
      ? g2MetrikaProductStatusV367(card)
      : G2_METRIKA_COMPANY_BY_ID_V374.has(card.id)
        ? g2MetrikaCompanyStatusV374(card)
        : card.status || "not_started");
};

const __g2MetrikaProductPrevProgressV367 = getProgress;
getProgress = function (cards = allCards()) {
  const gate2 = state?.gates?.find((gate) => gate.id === "gate-2");
  return gate2 && cards === gate2.cards
    ? guruGateReadiness(gate2).percent
    : __g2MetrikaProductPrevProgressV367(cards);
};

const __g2MetrikaProductPrevGate4StatusV367 = g4ReadGate2Status;
g4ReadGate2Status = function () {
  const gate2 = state?.gates?.find((gate) => gate.id === "gate-2");
  if (!gate2) return __g2MetrikaProductPrevGate4StatusV367();
  const readiness = guruGateReadiness(gate2);
  return { ready: readiness.total > 0 && readiness.done === readiness.total,
    total: readiness.total, done: readiness.done };
};

const __g2MetrikaProductPrevSchemeV367 = renderScheme;
renderScheme = function () {
  __g2MetrikaProductPrevSchemeV367();
  const gateIndex = state?.gates?.findIndex((gate) => gate.id === "gate-2") ?? -1;
  if (gateIndex < 0) return;
  const readiness = guruGateReadiness(state.gates[gateIndex]);
  const meta = els.contentArea.querySelectorAll(".flow-node .flow-meta")[gateIndex];
  if (meta) meta.textContent = `${readiness.total} блоков, готово ${readiness.percent}%`;
};

const __g2MetrikaProductPrevExportDiagnosticV367 = guruExportGate2CardDiagnosticV223;
guruExportGate2CardDiagnosticV223 = function (card, rawStatus) {
  const diagnostic = __g2MetrikaProductPrevExportDiagnosticV367(card, rawStatus);
  if (G2_METRIKA_PRODUCT_LEGACY_V367.has(card?.id)) {
    diagnostic.includedInUi = false;
    diagnostic.includedInGateReadiness = false;
    diagnostic.displayedStatus = null;
    diagnostic.readinessStatus = null;
    diagnostic.readinessNormalizedStatus = null;
    diagnostic.readinessRole = "legacy";
    return diagnostic;
  }
  if (!G2_METRIKA_PRODUCT_BY_ID_V367.has(card?.id)) return diagnostic;
  const product = guruV194SelectedProduct(state);
  const status = g2MetrikaProductStatusV367(card, product?.id || "");
  const key = card.id === "g2-metrika-goals-primary" ? "metrikaQualityV360" : G2_METRIKA_PRODUCT_FIELD_V367;
  const path = `state.gates[gate-2].cards[${card.id}].fields.${key}.perProduct[product_id=${product?.id || "not-selected"}]`;
  const source = guruExportDiagnosticSourceV223({
    key: "PRODUCT_ID", sourceType: "gate2_metrika_product_check", gateId: "gate-2",
    cardId: card.id, path, title: `${card.title} · ${product?.name || "товар не выбран"}`,
    rawStatus: status, found: Boolean(g2MetrikaProductRowV367(card, product?.id || "")),
    lookup: { kind: "card_id_and_product_id", cardId: card.id, productId: product?.id || "" },
  });
  source.consulted = true;
  source.decision = "selected";
  source.result = status;
  return {
    ...diagnostic, includedInUi: true, includedInGateReadiness: true,
    readinessRole: "direct", displayedStatus: status, readinessStatus: status,
    readinessNormalizedStatus: guruExportDiagnosticNormalizedV223(status),
    statusLabel: STATUS_LABELS[status] || status,
    resolver: { name: "g2MetrikaProductStatusV367", codeAnchor: "gate2-metrika-product-audit.js" },
    fallbackOrder: ["PRODUCT_ID"], fallbackExpression: "Результат выбранного product_id",
    selectedProduct: product ? { id: product.id, name: product.name || "" } : null,
    sourceChain: [source],
    selectedSource: { key: source.key, sourceType: source.sourceType, cardId: source.cardId,
      gateId: source.gateId, path: source.path, title: source.title,
      rawStatus: source.rawStatus, result: status }, result: status,
  };
};

function g2MetrikaProductAttrV367(card, productId, key, index = "") {
  return `data-g2-mp-card="${escapeAttr(card.id)}" data-g2-mp-product="${escapeAttr(productId)}" data-g2-mp-field="${escapeAttr(key)}"${index === "" ? "" : ` data-g2-mp-index="${escapeAttr(index)}"`}`;
}

function g2MetrikaProductFieldV367(card, productId, key, label, value, type = "text", index = "") {
  const attr = g2MetrikaProductAttrV367(card, productId, key, index);
  return `<label class="g2-mp-field-v367"><span>${escapeHtml(label)}</span><input type="${escapeAttr(type)}" ${attr} value="${escapeAttr(value || "")}" /></label>`;
}

function g2MetrikaProductSelectV367(card, productId, key, label, value, options, index = "") {
  const attr = g2MetrikaProductAttrV367(card, productId, key, index);
  const values = options.some(([key]) => key === value) || !value ? options :
    [...options, [value, `Ранее сохранено: ${value} — проверьте заново`]];
  return `<label class="g2-mp-field-v367"><span>${escapeHtml(label)}</span><select ${attr}>${values.map(([key, text]) =>
    `<option value="${escapeAttr(key)}"${value === key ? " selected" : ""}>${escapeHtml(text)}</option>`).join("")}</select></label>`;
}

function g2MetrikaProductNoteV367(card, productId, key, label, value, index = "") {
  return `<label class="g2-mp-field-v367"><span>${escapeHtml(label)}</span><textarea rows="2" ${g2MetrikaProductAttrV367(card, productId, key, index)}>${escapeHtml(value || "")}</textarea></label>`;
}

function g2MetrikaProductGoalOptionsV374() {
  return [["", "Выберите цель из блока «Компания»"], ...g2MetrikaCompanyGoalsV374().map((goal) => {
    const id = String(goal.goalId || "").trim().replace(/^(?:ID\s*)+/i, "").trim();
    const rawName = String(goal.name || "").trim();
    const nameWithoutIdPrefix = rawName.replace(/^(?:ID\s*)+/i, "").trim();
    const name = nameWithoutIdPrefix && nameWithoutIdPrefix !== id ? rawName
      : id === "573230679" ? "THANK YOU PAGE" : "Без названия";
    return [goal.entryId, `${id || "не задан"} · ${g2MetrikaCompanyGoalTypeV374(goal.type)} · ${name}`];
  })];
}

function g2MetrikaProductGoalRowsV367(card, productId, row) {
  const goals = Array.isArray(row.goals) ? row.goals : [];
  return `<div class="g2-mp-goals-v367">
    ${goals.map((goal, index) => `<div class="g2-mp-goal-v367" data-g2-mp-goal-index="${index}">
      <div class="g2-mp-goal-head-v367"><strong>Дополнительная цель ${index + 1}</strong><button type="button" class="small-btn" data-g2-mp-remove="${escapeAttr(card.id)}" data-g2-mp-product="${escapeAttr(productId)}" data-g2-mp-index="${index}">Удалить</button></div>
      ${g2MetrikaProductFieldV367(card, productId, "action", "Действие", goal.action, "text", index)}
      ${g2MetrikaProductSelectV367(card, productId, "goalRefId", "Цель из блока «Компания»", goal.goalRefId || "", g2MetrikaProductGoalOptionsV374(), index)}
      ${g2MetrikaProductNoteV367(card, productId, "actionSteps", "Что нажать или выполнить", goal.actionSteps, index)}
      ${g2MetrikaProductFieldV367(card, productId, "testAt", "Время теста", goal.testAt, "datetime-local", index)}
    </div>`).join("")}
    <button type="button" class="small-btn" data-g2-mp-add="${escapeAttr(card.id)}" data-g2-mp-product="${escapeAttr(productId)}">+ Добавить цель</button>
  </div>`;
}

function g2MetrikaProductFieldsV367(card, productId, row) {
  const field = (key, label, type = "text") => g2MetrikaProductFieldV367(card, productId, key, label, row[key], type);
  if (card.id === "g2-metrika-product-counter") return field("visitAt", "Время контрольного визита", "datetime-local");
  if (card.id === "g2-metrika-goals-primary") {
    return `${field("mainAction", "Главное действие")}
      ${g2MetrikaProductSelectV367(card, productId, "goalRefId", "Главная цель из блока «Компания»", row.goalRefId || "", g2MetrikaProductGoalOptionsV374())}
      <a class="g2-mp-company-goals-link-v374" href="#g2-metrika-company-goals" data-g2-mc-link="g2-metrika-company-goals">Открыть список целей компании</a>
      ${field("testConversionAt", "Время теста", "datetime-local")}`;
  }
  if (card.id === "g2-metrika-product-goals") return `${g2MetrikaProductGoalRowsV367(card, productId, row)}
    ${!row.goals?.length ? field("notNeededReason", "Почему дополнительные цели не требуются") : ""}`;
  return "";
}

function g2MetrikaProductCardHtmlV367(card) {
  const definition = G2_METRIKA_PRODUCT_BY_ID_V367.get(card.id);
  const product = guruV194SelectedProduct(state);
  const productId = product?.id || "";
  const row = g2MetrikaProductRowV367(card, productId) || {};
  const status = g2MetrikaProductStatusV367(card, productId);
  return `<article id="${escapeAttr(card.id)}" class="g2-check-row g2-mp-card-v367" data-card="${escapeAttr(card.id)}" data-g2-scope-kind="product">
    <div class="g2-check-title"><span>${escapeHtml(definition.title)}</span><span class="status-pill status-${status}">${escapeHtml(STATUS_LABELS[status] || status)}</span></div>
    ${productId ? `<div class="g2-mp-fields-v367" data-g2-mp-fields="${escapeAttr(productId)}">${g2MetrikaProductFieldsV367(card, productId, row)}</div>` :
      '<p class="g2-metrika-hint-v360">Выберите товар в общем селекторе выше, чтобы заполнить проверку.</p>'}
  </article>`;
}

const __g2MetrikaProductPrevCardHtmlV367 = g2CardHtml;
g2CardHtml = function (card) {
  return G2_METRIKA_PRODUCT_BY_ID_V367.has(card?.id)
    ? g2MetrikaProductCardHtmlV367(card)
    : __g2MetrikaProductPrevCardHtmlV367(card);
};

let g2MetrikaProductHandledHashV367 = "";
function g2MetrikaProductOpenHashV367() {
  let id = "";
  try { id = decodeURIComponent(window.location.hash.slice(1)); } catch (error) { return; }
  if (!G2_METRIKA_PRODUCT_BY_ID_V367.has(id) || id === g2MetrikaProductHandledHashV367) return;
  const target = document.getElementById(id);
  if (!target) return;
  const section = target.closest(".g2-open-section");
  const header = section?.querySelector(":scope > [data-g2-toggle-section]");
  const body = section?.querySelector(":scope > .g2-section-body");
  if (header && body?.hidden) {
    const key = header.dataset.g2ToggleSection;
    getGate2AccordionState().sections[key] = true;
    section.classList.add("is-open");
    header.setAttribute("aria-expanded", "true");
    body.hidden = false;
  }
  g2MetrikaProductHandledHashV367 = id;
  requestAnimationFrame(() => target.scrollIntoView({ block: "start" }));
}

const __g2MetrikaProductPrevRenderV367 = renderGate2Redesign;
renderGate2Redesign = function (gate, cards) {
  __g2MetrikaProductPrevRenderV367(gate, cards);
  if (gate?.id === "gate-2") g2MetrikaProductOpenHashV367();
};
window.addEventListener("hashchange", () => {
  g2MetrikaProductHandledHashV367 = "";
  if (activeGateId === "gate-2") g2MetrikaProductOpenHashV367();
});

const __g2MetrikaProductPrevSectionProgressV367 = g2SectionProgress;
const __g2MetrikaProductPrevSectionStatusV367 = g2SectionStatus;
g2SectionStatus = function (cards) {
  if (!cards?.length || !cards.every((card) => G2_METRIKA_PRODUCT_BY_ID_V367.has(card.id)))
    return __g2MetrikaProductPrevSectionStatusV367(cards);
  const statuses = cards.map((card) => g2MetrikaProductStatusV367(card));
  if (statuses.includes("problem")) return "problem";
  if (statuses.every((status) => status === "ready" || status === "not_needed")) return "ready";
  if (statuses.some((status) => status !== "not_started")) return "in_progress";
  return "not_started";
};

g2SectionProgress = function (cards) {
  if (!cards?.length || !cards.every((card) => G2_METRIKA_PRODUCT_BY_ID_V367.has(card.id)))
    return __g2MetrikaProductPrevSectionProgressV367(cards);
  const statuses = cards.map((card) => g2MetrikaProductStatusV367(card));
  const done = statuses.filter((status) => status === "ready").length;
  const skipped = statuses.filter((status) => status === "not_needed").length;
  return `${done} из ${cards.length - skipped} готово${skipped ? ` · ${skipped} не требуется` : ""}`;
};

function g2MetrikaProductRefreshV367(card) {
  const element = document.querySelector(`[data-card="${CSS.escape(card.id)}"]`);
  const status = g2MetrikaProductStatusV367(card);
  const pill = element?.querySelector(":scope > .g2-check-title .status-pill");
  if (pill) { pill.className = `status-pill status-${status}`; pill.textContent = STATUS_LABELS[status] || status; }
  const section = element?.closest(".g2-open-section");
  const cards = [...(section?.querySelectorAll(".g2-mp-card-v367") || [])]
    .map((node) => state.gates.find((gate) => gate.id === "gate-2")?.cards.find((item) => item.id === node.dataset.card))
    .filter(Boolean);
  const sectionPill = section?.querySelector(":scope > .g1-section-header .status-pill");
  const progress = section?.querySelector(":scope > .g1-section-header .g1-section-progress");
  if (sectionPill) {
    const sectionStatus = g2SectionStatus(cards);
    sectionPill.className = `status-pill status-${sectionStatus}`;
    sectionPill.textContent = STATUS_LABELS[sectionStatus] || sectionStatus;
  }
  if (progress) progress.textContent = g2SectionProgress(cards);
  guruGateReadinessCache.delete("gate-2");
  renderGateNav({ recalculate: false });
}

function g2MetrikaProductUpdateV367(target) {
  const gate = state?.gates?.find((item) => item.id === "gate-2");
  const card = gate?.cards?.find((item) => item.id === target.dataset.g2MpCard);
  const productId = target.dataset.g2MpProduct;
  if (!card || !G2_METRIKA_PRODUCT_BY_ID_V367.has(card.id) ||
      productId !== guruV194SelectedProduct(state)?.id) return;
  const row = g2MetrikaProductRowV367(card, productId, true);
  const index = target.dataset.g2MpIndex;
  const record = index === undefined ? row : row.goals?.[Number(index)];
  if (!record) return;
  const field = target.dataset.g2MpField;
  record[field] = target.value;
  recalculateStatusForCard(card, state);
  flashSaving();
  if (index === undefined && field === "goalRefId" && card.id === "g2-metrika-goals-primary") renderGate();
  else g2MetrikaProductRefreshV367(card);
}

document.addEventListener("input", (event) => {
  const target = event.target?.closest?.("[data-g2-mp-field]");
  if (target && target.tagName !== "SELECT" && !["date", "datetime-local"].includes(target.type))
    g2MetrikaProductUpdateV367(target);
});
document.addEventListener("change", (event) => {
  const target = event.target?.closest?.("[data-g2-mp-field]");
  if (target && (target.tagName === "SELECT" || ["date", "datetime-local"].includes(target.type)))
    g2MetrikaProductUpdateV367(target);
});
document.addEventListener("click", (event) => {
  const button = event.target?.closest?.("[data-g2-mp-add], [data-g2-mp-remove]");
  if (!button) return;
  const productId = button.dataset.g2MpProduct;
  if (productId !== guruV194SelectedProduct(state)?.id) return;
  const cardId = button.dataset.g2MpAdd || button.dataset.g2MpRemove;
  if (cardId !== "g2-metrika-product-goals") return;
  const card = state?.gates?.find((item) => item.id === "gate-2")?.cards.find((item) => item.id === cardId);
  const row = g2MetrikaProductRowV367(card, productId, true);
  row.goals = Array.isArray(row.goals) ? row.goals : [];
  if (button.dataset.g2MpAdd) {
    row.goals.push({});
  } else {
    const index = Number(button.dataset.g2MpIndex);
    if (!Number.isInteger(index) || index < 0 || index >= row.goals.length) return;
    row.goals.splice(index, 1);
  }
  recalculateStatusForCard(card, state);
  flashSaving();
  renderGate();
});

const __g2MetrikaProductPrevPrepareV367 = prepareSystemCards;
prepareSystemCards = function (workspace) {
  __g2MetrikaProductPrevPrepareV367(workspace);
  const gate = workspace?.gates?.find((item) => item.id === "gate-2");
  if (gate) ensureGate2Structure(gate);
  if (workspace?.ui?.gate2Accordion) delete workspace.ui.gate2Accordion.guideCells;
};

if (state) {
  const gate = state.gates?.find((item) => item.id === "gate-2");
  if (gate) ensureGate2Structure(gate);
  if (state.ui?.gate2Accordion) delete state.ui.gate2Accordion.guideCells;
  guruGateReadinessCache.delete("gate-2");
}
