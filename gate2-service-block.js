/* Reusable Gate 2 service block. Service configs are registered by callers;
   this module does not add any service to the working Gate 2 screen. */
const G2_SERVICE_BLOCK_CONFIGS = new Map();
const G2_SERVICE_BLOCK_INPUT_START = new WeakMap();
const g2ServiceBlockCardId = (config) => config.cardId || `g2-service-${config.id}`;

function g2ServiceBlockSafeText(value) {
  return String(value ?? "").replace(/\u2014/g, " - ");
}

function g2ServiceBlockSafeHref(value) {
  const href = String(value || "").trim();
  if (/^#[a-z0-9_-]+$/i.test(href)) return href;
  try {
    const url = new URL(href);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch { return ""; }
}

function g2ServiceBlockValue(value, config, step, productId = "", workspace = state) {
  return typeof value === "function" ? value({ config, step, product_id: productId, workspace }) : value;
}

function g2ServiceBlockStepValue(config, step, key, productId = "", workspace = state) {
  return g2ServiceBlockValue(step[key], config, step, productId, workspace) || "";
}

function g2ServiceBlockRegister(config) {
  if (!config || !/^[a-z][a-z0-9-]*$/.test(config.id || "") ||
      !["company", "product"].includes(config.scope) ||
      !config.title || !Array.isArray(config.steps) ||
      (!config.steps.length && !config.emptyStepScaffold))
    throw new TypeError(`Некорректный конфиг блока сервиса ${guruGateLabel("gate-2")}`);
  if (typeof config.serviceUrl !== "function" && !/^https:\/\//.test(config.serviceUrl || ""))
    throw new TypeError("Для сервиса нужен адрес HTTPS");
  const ids = new Set();
  for (const step of config.steps) {
    const source = step && typeof step.source_url === "function" ? "" : step?.source_url || "";
    if (!step || !/^[a-z][a-z0-9_-]*$/.test(step.step_id || "") ||
        ids.has(step.step_id) || !step.what || !step.where || !step.how ||
        (source && !/^https:\/\//.test(source)) ||
        !["checkbox", "text", "reference"].includes(step.resultType || "checkbox"))
      throw new TypeError(`Некорректный шаг блока сервиса ${guruGateLabel("gate-2")}`);
    ids.add(step.step_id);
  }
  if ([...G2_SERVICE_BLOCK_CONFIGS.values()].some((item) =>
    item.id !== config.id && item.scope === config.scope &&
    g2ServiceBlockCardId(item) === g2ServiceBlockCardId(config)))
    throw new TypeError(`У сервисов одной области ${guruGateLabel("gate-2")} должен быть разный cardId`);
  G2_SERVICE_BLOCK_CONFIGS.set(config.id, config);
  return config;
}

function g2ServiceBlockEnsureCard(config, workspace = state) {
  const gate = g2wGate(workspace);
  if (!gate) throw new TypeError(`${guruGateLabel("gate-2")} отсутствует`);
  const cardId = g2ServiceBlockCardId(config);
  let card = gate.cards.find((item) => item.id === cardId);
  if (!card) {
    card = { id: cardId, title: config.title, instruction: "", status: "not_started",
      evidence: "", pages: "", notes: "", generatedBy: "gate2-service-block", fields: {} };
    gate.cards.push(card);
  }
  return card;
}

function g2ServiceBlockApplicability(config, productId = "", workspace = state) {
  const result = typeof config.gate0Applicability === "function"
    ? config.gate0Applicability({ workspace, product_id: productId })
    : "required";
  return result === "not_needed" ? "not_needed" : "required";
}

function g2ServiceBlockRecord(config, productId = "", create = false, workspace = state) {
  return g2wRecord({ cardId: g2ServiceBlockCardId(config), scope: config.scope }, productId, create, workspace);
}

function g2ServiceBlockStepDone(config, step, record, productId = "", workspace = state) {
  if (step.requireEvidence && !String(record?.steps?.[step.step_id]?.params?.value || "").trim()) return false;
  return typeof step.doneResolver === "function"
    ? Boolean(step.doneResolver({ config, step, product_id: productId, workspace }))
    : record?.steps?.[step.step_id]?.result === "done";
}

function g2ServiceBlockStatus(config, productId = "", workspace = state) {
  if (typeof g2StepServiceConfig === "function") config = g2StepServiceConfig(config, productId, workspace);
  if (g2ServiceBlockApplicability(config, productId, workspace) === "not_needed") return "not_needed";
  if (typeof config.statusResolver === "function")
    return config.statusResolver({ config, product_id: productId, workspace });
  const record = g2ServiceBlockRecord(config, productId, false, workspace);
  const done = config.steps.filter((step) => guruReadinessValue(
    g2ServiceBlockStepDone(config, step, record, productId, workspace),
    { serviceId: config.id, stepId: step.step_id })).length;
  return done === config.steps.length ? "ready" : done ? "in_progress" : "not_started";
}

function g2ServiceBlockStatusLabel(config, status, productId = "", workspace = state) {
  if (status === "not_needed") return g2ServiceBlockSafeText(
    g2ServiceBlockValue(config.notNeededReason, config, null, productId, workspace) || `Не требуется по ${guruGateLabel("gate-0")}`);
  return { ready: "Готово", in_progress: "В работе", not_started: "Не начато",
    problem: "Проблема" }[status] || "Не начато";
}

function g2ServiceBlockVerificationHtml(config, productId) {
  const def = g2wDef(config.wizardUnitId);
  if (!def) return "";
  const verification = g2wRecord(def, productId)?.verification;
  return `<div class="g2w-verify g2sb-verification"><div><strong>Проверка результата</strong><small>Шаги выше фиксируют действия. Здесь подтвердите работу настройки.</small></div>
    <label>Где проверили<input data-g2w-source="${escapeAttr(def.id)}" data-g2w-product="${escapeAttr(productId)}" value="${escapeAttr(verification?.source_url || "")}" placeholder="Ссылка на отчёт или название сервиса"></label>
    <div class="g2w-verify-actions"><button type="button" data-g2w-verify="passed" data-g2w-card="${escapeAttr(def.id)}" data-g2w-product="${escapeAttr(productId)}" ${g2wCanConfirm(def, productId) ? "" : "disabled"}>Работает</button>
    <button type="button" data-g2w-verify="failed" data-g2w-card="${escapeAttr(def.id)}" data-g2w-product="${escapeAttr(productId)}">Не работает</button></div>
    <small class="g2w-verification-state" data-g2w-verify-state>${escapeHtml(g2wVerificationLabel(def, productId))}</small>
    <small class="g2w-verification-state" data-g2w-auto-state>${escapeHtml(g2wAutoLabel(def, productId))}</small></div>`;
}

function g2ServiceBlockFieldParts(config, step, productId, record) {
  const saved = record?.steps?.[step.step_id];
  const value = String(saved?.params?.value || "");
  const context = g2ServiceBlockValue(step.context, config, step, productId);
  const contextHtml = (Array.isArray(context) ? context : context ? [context] : []).map((item) => {
    const href = g2ServiceBlockSafeHref(item.href);
    return `<div class="g2sb-context"><span>${escapeHtml(g2ServiceBlockSafeText(item.label))}</span>${href
      ? `<a href="${escapeAttr(href)}">${escapeHtml(g2ServiceBlockSafeText(item.value || "Не указано"))}</a>`
      : `<strong>${escapeHtml(g2ServiceBlockSafeText(item.value || "Не указано"))}</strong>`}</div>`;
  }).join("");
  const wizardDef = config.wizardUnitId ? g2wDef(config.wizardUnitId) : null;
  const wizardStep = wizardDef?.steps.find((item) => item[0] === step.step_id);
  const fieldKeys = step.existingFields || (step.existingField && wizardStep?.[2] ? [wizardStep[2]] : []);
  const customField = g2ServiceBlockValue(step.customField, config, step, productId);
  const existingField = customField ? `<div class="g2sb-existing-field">${customField}</div>` : wizardDef && fieldKeys.length ? `<div class="g2sb-existing-field">${fieldKeys.map((key) => {
    const sourceStep = wizardDef.steps.find((item) => item[2] === key);
    if (!sourceStep) return "";
    const label = g2ServiceBlockValue(step.fieldLabels?.[key], config, step, productId);
    const fieldStep = label ? sourceStep.map((item, index) => index === 3 ? label : item) : sourceStep;
    return g2wFieldHtml(wizardDef, productId, fieldStep, { suppressProviderDocs: true });
  }).join("")}</div>` : "";
  return { value, contextHtml, existingField: existingField +
    (typeof g2StepCustomFieldsHtml === "function" ? g2StepCustomFieldsHtml(config, step, productId, record) : ""), wizardDef };
}

function g2UnifiedStepState(config, step, record, productId = "") {
  if (typeof step.uiStatusResolver === "function") {
    const status = step.uiStatusResolver({ config, step, product_id: productId, workspace: state });
    if (["ready", "not_required", "not_needed"].includes(status)) return "ready";
    if (status === "problem") return "problem";
    return "pending";
  }
  return g2ServiceBlockStepDone(config, step, record, productId) ? "ready" : "pending";
}
const G2_UNIFIED_GROUPS = Object.freeze({
  "company-yandex-business": [["Карточка организации", ["add", "rights", "info"]], ["Сайт и отзывы", ["site", "reviews"]]],
  "company-yandex-direct": [["Кабинет и Метрика", ["account", "counter", "link", "access"]], ["Запуск", ["yclid", "payment"]]],
  "company-ga4": [["Ресурс и поток", ["account", "property", "stream"]], ["Установка и проверка", ["install", "check"]]],
  "company-leads": [["Система заявок", ["system", "connect"]], ["Передача данных", ["fields", "utm"]], ["Проверка заявки", ["send", "receive", "storage"]]],
  "company-safety": [["Защита сайта", ["https", "policy", "consent"]], ["Проверка формы", ["spam", "test"]]],
  "product-landing": [["Маршрут", ["route", "url", "open"]], ["Действие клиента", ["mobile", "cta", "action"]], ["Техническая проверка", ["indexing", "meta", "images", "cwv"]]],
  "product-counter": [["Счётчик и страница", ["inherit", "open", "code"]], ["Контрольный визит", ["visit", "report"]]],
  "product-goal": [["Цель продукта", ["action", "select", "id"]], ["Проверка конверсии", ["test", "report"]]],
  "product-vk": [["Пиксель и событие", ["inherit", "event", "install"]], ["Проверка события", ["test", "report"]]],
  "product-lead": [["Действие клиента", ["open", "action", "receive"]], ["Сверка заявки", ["source", "compare"]]],
});
function g2UnifiedStepGroups(config) {
  if (config.steps.length <= 4 && !config.g2StepLayout) return [{ title: "", steps: config.steps }];
  const planned = config.stepGroups || G2_UNIFIED_GROUPS[config.id]?.map(([title, steps]) => ({ title, steps }));
  if (!planned?.length)
    return [{ title: "", steps: config.steps }];
  const seen = new Set();
  const grouped = planned.map((group) => ({ title: group.title, steps: group.steps
    .map((id) => config.steps.find((step) => step.step_id === id))
    .filter((step) => {
      if (!step || seen.has(step.step_id)) return false;
      seen.add(step.step_id);
      return true;
  }) }));
  const remaining = config.steps.filter((step) => !seen.has(step.step_id));
  if (remaining.length) grouped.push({ title: "Дополнительно", steps: remaining });
  return grouped;
}
function g2UnifiedGuideText(value) {
  return escapeHtml(g2ServiceBlockSafeText(value).replace(/справа/gi, (match) =>
    match[0] === match[0].toUpperCase() ? "Ниже" : "ниже"));
}
function g2WebmasterGuideHtml(where, how, troubleshooting, reconciliation) {
  const actions = g2ServiceBlockSafeText(where).split(/\n+/).map((line) =>
    line.replace(/^\s*\d+[.)]\s*/, "").trim()).filter(Boolean);
  const numbered = actions.length ? `<ol class="g2u-guide-actions">${actions.map((action) =>
    `<li>${g2UnifiedGuideText(action)}</li>`).join("")}</ol>` : "";
  const detail = [how, troubleshooting].filter(Boolean).map((value) =>
    `<p>${g2UnifiedGuideText(value)}</p>`).join("");
  return `<div class="g2u-guide-item"><span>Где нажать / Как проверить</span>${numbered}${detail}</div>
    <div class="g2u-guide-item"><span>Сверка</span><p>${g2UnifiedGuideText(reconciliation || "Сравните фактический результат с данными GURU.")}</p></div>`;
}
function g2UnifiedCardPanelHtml({ card, scope, status, title, body, hint = "", className = "" }) {
  return `<details id="${escapeAttr(card.id)}" class="g2-check-row g2sb-block g2u-block g2u-panel ${className}" data-card="${escapeAttr(card.id)}" data-g2-scope-kind="${escapeAttr(scope)}" data-ui-keeper-key="g2-panel:${escapeAttr(scope)}:${escapeAttr(card.id)}" ${status === "in_progress" || status === "problem" ? "open" : ""}>
    <summary class="g2-check-title g2sb-header"><span class="g2sb-title">${escapeHtml(title)}</span><span class="g2sb-status status-pill status-${escapeAttr(status)}" data-status="${escapeAttr(status)}">${escapeHtml(STATUS_LABELS[status] || status)}</span></summary>
    <div class="g2sb-body">${hint ? `<p class="g2u-purpose">${escapeHtml(hint)}</p>` : ""}${body}</div>
  </details>`;
}
function g2UnifiedStepFrame({ id, index, status, circle, badge = "", title, content = "", guide = "", guideLinks = "", guideHidden = false, open = false, keeperKey, extraClass = "" }) {
  return `<li class="g2sb-step g2u-step ${extraClass} ${status === "ready" ? "is-done" : ""}" data-g2sb-step-id="${escapeAttr(id)}" data-g2u-step-state="${status}">
    <div class="g2u-step-head"><span class="g2u-index">${String(index + 1).padStart(2, "0")}</span>${circle}<div class="g2u-title"><small>Что сделать</small><strong>${g2UnifiedGuideText(title)}</strong></div>${badge}</div>
    <div class="g2u-step-body">${content}<details class="g2u-guide" data-ui-keeper-key="${escapeAttr(keeperKey)}" ${open ? "open" : ""} ${guideHidden ? "hidden" : ""}><summary>Как сделать</summary><div class="g2u-guide-content">${guide}${guideLinks}</div></details></div></li>`;
}
function g2UnifiedStepHtml(config, step, index, productId, record, notNeeded, currentId) {
  const { value, contextHtml, existingField, wizardDef } = g2ServiceBlockFieldParts(config, step, productId, record);
  const status = g2UnifiedStepState(config, step, record, productId);
  const automatic = step.resultType === "reference" || typeof step.uiStatusResolver === "function";
  const manual = !automatic && ((step.resultType || "checkbox") === "checkbox" || step.confirmAfterText);
  const what = g2ServiceBlockStepValue(config, step, "what", productId);
  const where = g2ServiceBlockStepValue(config, step, "where", productId);
  const how = g2ServiceBlockStepValue(config, step, "how", productId);
  const troubleshooting = g2ServiceBlockStepValue(config, step, "troubleshooting", productId);
  const reconciliation = g2ServiceBlockStepValue(config, step, "reconciliation", productId);
  const help = g2ServiceBlockSafeHref(g2ServiceBlockStepValue(config, step, "source_url", productId));
  const guide = config.id === "company-webmaster" && step.webmasterGuidance
    ? g2WebmasterGuideHtml(where, how, troubleshooting, reconciliation)
    : [["Где нажать", where], ["Как проверить", how], ["Если не получилось", troubleshooting],
      ["Сверка", reconciliation]].filter(([, text]) => text).map(([label, text]) =>
      `<div class="g2u-guide-item"><span>${label}</span><p>${g2UnifiedGuideText(text)}</p></div>`).join("");
  const additionalHelp = config.id === "company-webmaster" && step.webmasterGuidance
    ? g2ServiceBlockValue(step.additionalHelp, config, step, productId) || [] : [];
  const guideLinks = [help ? { label: "Справка", href: help } : null, ...additionalHelp]
    .filter(Boolean).map(({ label, href }) => ({ label, href: g2ServiceBlockSafeHref(href) }))
    .filter(({ href }) => href).map(({ label, href }) =>
      `<a class="g2sb-help" href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)} ↗</a>`).join("");
  const circle = manual
    ? `<input class="g2u-step-toggle" type="checkbox" ${step.confirmAfterText ? `data-g2sb-confirm="${escapeAttr(step.step_id)}"` : `data-g2sb-step="${escapeAttr(step.step_id)}"`} aria-label="Шаг ${index + 1}: ${escapeAttr(g2ServiceBlockSafeText(what))}" ${status === "ready" ? "checked" : ""} ${notNeeded || (step.confirmAfterText && !value) ? "disabled" : ""}>`
    : `<span class="g2u-step-circle" data-g2u-step-circle data-status="${status}" role="img" aria-label="${status === "ready" ? "Готово" : status === "problem" ? "Проблема" : "Не проверено"}">${status === "ready" ? "✓" : status === "problem" ? "!" : ""}</span>`;
  const badge = automatic ? `<span class="g2u-step-badge" data-g2u-step-badge data-status="${status}">${status === "ready" ? "Готово" : status === "problem" ? "Проблема" : "Не проверено"}</span>` : "";
  const textResult = step.resultType === "text"
    ? `<label class="g2sb-result"><span>${escapeHtml(step.resultLabel || "Результат")}</span><input type="text" data-g2sb-step="${escapeAttr(step.step_id)}" value="${escapeAttr(value)}" placeholder="${escapeAttr(step.resultPlaceholder || "Введите результат")}" ${notNeeded ? "disabled" : ""}></label>` : "";
  const autoCheck = g2ServiceBlockValue(step.autoCheck, config, step, productId) && wizardDef && !notNeeded
    ? `<button type="button" class="g2sb-auto" data-g2w-auto="${escapeAttr(wizardDef.id)}" data-g2w-product="${escapeAttr(productId)}">Проверить URL</button>` : "";
  return g2UnifiedStepFrame({ id: step.step_id, index, status, circle, badge, title: what,
    content: `${contextHtml}${existingField}${textResult}${autoCheck}`, guide,
    guideLinks,
    open: currentId === step.step_id, keeperKey: `g2u-guide:${config.id}:${productId}:${step.step_id}` });
}
function g2UnifiedBlockHtml(config, productId = "") {
  if (typeof g2StepServiceConfig === "function") config = g2StepServiceConfig(config, productId);
  if (config.scope === "product" && !productId) throw new TypeError("Блоку продукта нужен product_id");
  const record = g2ServiceBlockRecord(config, productId);
  const status = g2ServiceBlockStatus(config, productId);
  const done = config.steps.filter((step) => g2ServiceBlockStepDone(config, step, record, productId)).length;
  const notNeeded = status === "not_needed";
  const serviceUrl = g2ServiceBlockSafeHref(g2ServiceBlockValue(config.serviceUrl, config, null, productId));
  const serviceLabel = g2ServiceBlockValue(config.serviceLabel, config, null, productId) || "Открыть сервис";
  const headingId = `g2sb-${config.id}-${productId || "company"}`;
  const groups = g2UnifiedStepGroups(config);
  const currentId = config.steps
    .find((step) => g2UnifiedStepState(config, step, record, productId) !== "ready")?.step_id || "";
  let index = 0;
  return `<details class="g2sb-block g2u-block ${notNeeded ? "is-not-needed" : ""}" data-g2sb-id="${escapeAttr(config.id)}" data-g2sb-product-id="${escapeAttr(productId)}" data-ui-keeper-key="g2sb:${escapeAttr(config.scope)}:${escapeAttr(productId)}:${escapeAttr(config.id)}">
    <summary class="g2sb-header"><span class="g2sb-header-main"><span class="g2sb-heading"><strong id="${escapeAttr(headingId)}" class="g2sb-title">${escapeHtml(g2ServiceBlockSafeText(config.title))}</strong><span class="g2sb-status" data-g2sb-status data-status="${status}" aria-live="polite">${escapeHtml(g2ServiceBlockStatusLabel(config, status, productId))}</span></span><span class="g2sb-progress" data-g2sb-progress>${done} из ${config.steps.length} шагов</span><progress class="g2u-progress" value="${done}" max="${config.steps.length}" aria-label="Готовность блока"></progress></span>
    <span class="g2step-heading-actions">${serviceUrl ? `<a href="${escapeAttr(serviceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(g2ServiceBlockSafeText(serviceLabel))} ↗</a>` : `<span class="g2sb-help-note">${escapeHtml(g2ServiceBlockSafeText(config.serviceUnavailableLabel || "Адрес сервиса не указан"))}</span>`}${typeof g2StepHeaderButton === "function" ? g2StepHeaderButton("service", config.id, productId) : ""}</span></summary>
    <div class="g2sb-body">${config.notice ? `<p class="g2sb-notice">${escapeHtml(g2ServiceBlockSafeText(g2ServiceBlockValue(config.notice, config, null, productId)))}</p>` : ""}
      <div class="g2sb-steps">${typeof g2StepEditingHtml === "function" && g2StepIsEditing("service", config.id, productId) ? g2StepEditingHtml("service", config, productId, groups, record) : groups.map((group) => `<section class="g2u-group">${group.title ? `<h4>${escapeHtml(group.title)}</h4>` : ""}<ol>${group.steps.map((step) => g2UnifiedStepHtml(config, step, index++, productId, record, notNeeded, currentId)).join("")}</ol></section>`).join("")}</div>
      ${config.wizardUnitId && !notNeeded ? g2ServiceBlockVerificationHtml(config, productId) : ""}
    </div></details>`;
}
function g2UnifiedWizardStepHtml(def, productId, step, index, record, currentId) {
  const id = step[0], done = record?.steps?.[id]?.result === "done";
  const doc = step.g2StepEdit?.source_url !== undefined
    ? g2ServiceBlockSafeHref(step.g2StepEdit.source_url) : g2wDocForStep(step, state, def);
  const openUrl = g2wOpenUrl(def, productId, step);
  const openLabel = def.id === "counter" ? "Открыть с отладкой" : "Открыть адрес";
  const links = `${g2wHasOpenStep(def, step) ? `<a data-g2w-open-step="${escapeAttr(id)}" ${openUrl ? `href="${escapeAttr(openUrl)}"` : "hidden"} target="_blank" rel="noopener noreferrer">${openLabel} ↗</a>` : ""}
    <a data-g2w-doc-step="${escapeAttr(id)}" ${doc ? `href="${escapeAttr(doc)}"` : "hidden"} target="_blank" rel="noopener noreferrer">${[G2W_DOC.metrika, G2W_DOC.vk, G2W_DOC.webmaster].includes(doc) ? "Открыть сервис" : "Инструкция"} ↗</a>`;
  const circle = `<input class="g2u-step-toggle" type="checkbox" data-g2w-step="${escapeAttr(id)}" data-g2w-card="${escapeAttr(def.id)}" data-g2w-product="${escapeAttr(productId)}" aria-label="Шаг ${index + 1}: ${escapeAttr(step[1])}" ${done ? "checked" : ""}>`;
  const auto = step[5] === "auto" ? `<button type="button" class="g2sb-auto" data-g2w-auto="${escapeAttr(def.id)}" data-g2w-product="${escapeAttr(productId)}">Проверить URL</button>` : "";
  const custom = typeof g2StepWizardFieldsHtml === "function" ? g2StepWizardFieldsHtml(def, productId, step, record) : "";
  const instructions = typeof g2StepWizardInstructionsHtml === "function" ? g2StepWizardInstructionsHtml(step) : "";
  return g2UnifiedStepFrame({ id, index, status: done ? "ready" : "pending", circle,
    title: step[1], content: `${g2wFieldHtml(def, productId, step)}${custom}${auto}`, guide: instructions, guideLinks: links,
    guideHidden: !instructions && !doc && !(g2wHasOpenStep(def, step) && openUrl),
    open: id === currentId, keeperKey: `g2u-guide:wizard:${def.id}:${productId}:${id}`, extraClass: "g2w-step" });
}
function g2UnifiedWizardCardHtml(def, productId = "", knownStatus = "") {
  if (typeof g2StepWizardDef === "function") def = g2StepWizardDef(def, productId);
  const status = knownStatus || g2wStatus(def, productId);
  const applicable = g2wApplicability(def, productId);
  const record = g2wRecord(def, productId);
  const done = def.steps.filter(([id]) => record?.steps?.[id]?.result === "done").length;
  const current = def.steps.find(([id]) => record?.steps?.[id]?.result !== "done")?.[0] || "";
  const groups = g2UnifiedStepGroups({ id: `wizard-${def.id}`, steps: def.steps.map(([id]) => ({ step_id: id })), g2StepLayout: def.g2StepLayout,
    stepGroups: def.g2StepLayout?.groups || (def.id === "counter"
      ? [{ title: "Счётчик", steps: ["create", "id", "install"] }, { title: "Проверка", steps: ["check", "visit"] }]
      : [{ title: "Действие", steps: ["action", "add", "type"] }, { title: "Данные цели", steps: ["name", "id"] }, { title: "Проверка", steps: ["test", "report"] }]) });
  const source = G2W_DOC.metrika;
  let index = 0;
  return `<details class="g2w-card g2sb-block g2u-block g2u-wizard ${status === "not_needed" ? "is-not-needed" : ""}" data-g2w-card-view="${escapeAttr(def.id)}" data-g2w-product-id="${escapeAttr(productId)}" data-ui-keeper-key="g2w:${escapeAttr(def.scope)}:${escapeAttr(productId)}:${escapeAttr(def.id)}" ${status === "in_progress" ? "open" : ""}>
    <summary class="g2sb-header"><span class="g2sb-header-main"><span class="g2sb-heading"><strong class="g2sb-title">${escapeHtml(def.title)} · Компания</strong><span class="g2sb-status status-pill status-${status}" data-status="${status}" aria-live="polite">${escapeHtml(g2wStatusLabel(status))}</span></span><small class="g2u-purpose">${escapeHtml(def.purpose)}</small><span class="g2w-card-meta"><span class="g2sb-progress">${done} из ${def.steps.length} шагов</span></span><progress class="g2u-progress" value="${done}" max="${Math.max(1, def.steps.length)}" aria-label="Готовность блока"></progress></span><span class="g2step-heading-actions"><a href="${escapeAttr(source)}" target="_blank" rel="noopener noreferrer">Открыть сервис ↗</a>${typeof g2StepHeaderButton === "function" ? g2StepHeaderButton("wizard", def.id, productId) : ""}</span></summary>
    <div class="g2w-card-body g2sb-body">${applicable === "not_needed" ? '<p class="g2w-note">Канал или сайт для этого маршрута не используется. Настройка не снижает готовность.</p>' : applicable === "pending" ? '<p class="g2w-note">Сначала выберите продукт или укажите, используется ли канал.</p>' : `<div class="g2sb-steps">${typeof g2StepEditingHtml === "function" && g2StepIsEditing("wizard", def.id, productId) ? g2StepEditingHtml("wizard", def, productId, groups, record) : groups.map(group => `<section class="g2u-group">${group.title ? `<h4>${escapeHtml(group.title)}</h4>` : ""}<ol>${group.steps.map(({ step_id }) => g2UnifiedWizardStepHtml(def, productId, def.steps.find(([id]) => id === step_id), index++, record, current)).join("")}</ol></section>`).join("")}</div>${g2ServiceBlockVerificationHtml({ wizardUnitId: def.id }, productId)}`}</div>
  </details>`;
}
function g2ServiceBlockHtml(config, productId = "") {
  g2ServiceBlockRegister(config);
  return g2UnifiedBlockHtml(config, productId);
}

function g2ServiceBlockMountRegistered() {
  const workspace = document.querySelector(".g2w-workspace");
  if (!workspace || !G2_SERVICE_BLOCK_CONFIGS.size) return;
  const productId = guruV194SelectedProduct(state)?.id || "";
  const afterUnits = new Map();
  for (const config of G2_SERVICE_BLOCK_CONFIGS.values()) {
    if (config.customMount) continue;
    if (config.scope === "product" && !productId) continue;
    const scope = workspace.querySelector(`[data-g2-scope="${config.scope}"]`);
    if (!scope || scope.querySelector(`[data-g2sb-id="${CSS.escape(config.id)}"]`)) continue;
    const legacy = scope?.querySelector(":scope > .g2w-additional");
    const html = g2ServiceBlockHtml(config, config.scope === "product" ? productId : "");
    const before = config.beforeUnit && scope.querySelector(`[data-g2w-card-view="${CSS.escape(config.beforeUnit)}"]`);
    const after = config.afterUnit && scope.querySelector(`[data-g2w-card-view="${CSS.escape(config.afterUnit)}"]`);
    if (before) before.insertAdjacentHTML("beforebegin", html);
    else if (after) {
      const anchor = afterUnits.get(config.afterUnit) || after;
      anchor.insertAdjacentHTML("afterend", html);
      afterUnits.set(config.afterUnit, anchor.nextElementSibling);
    } else if (legacy) legacy.insertAdjacentHTML("beforebegin", html);
    else scope.insertAdjacentHTML("beforeend", html);
  }
  queueMicrotask(() => {
    for (const block of document.querySelectorAll('.g2w-workspace .g2u-block')) {
      if (block.querySelector('.g2u-guide[open]')) continue;
      if (block.classList.contains('g2u-wizard')) {
        const def = g2wDef(block.dataset.g2wCardView);
        const record = def && g2wRecord(def, block.dataset.g2wProductId || '');
        const current = def?.steps.find(([id]) => record?.steps?.[id]?.result !== 'done')?.[0];
        if (current) block.querySelector(`[data-g2sb-step-id="${CSS.escape(current)}"] .g2u-guide`)?.setAttribute('open', '');
        continue;
      }
      const config = G2_SERVICE_BLOCK_CONFIGS.get(block.dataset.g2sbId);
      if (!config) continue;
      const productId = block.dataset.g2sbProductId || '';
      const record = g2ServiceBlockRecord(config, productId);
      const current = config.steps.find(step => g2UnifiedStepState(config, step, record, productId) !== 'ready');
      block.querySelector(`[data-g2sb-step-id="${CSS.escape(current?.step_id || '')}"] .g2u-guide`)?.setAttribute('open', '');
    }
  });
}

const g2ServiceBlockPreviousLegacy = g2wLegacyHtml;
g2wLegacyHtml = function (gate, scope, visibleIds) {
  if (!gate?.cards?.some((card) => card.generatedBy === "gate2-service-block"))
    return g2ServiceBlockPreviousLegacy.apply(this, arguments);
  return g2ServiceBlockPreviousLegacy.call(this, {
    ...gate, cards: gate.cards.filter((card) => card.generatedBy !== "gate2-service-block"),
  }, scope, visibleIds);
};

const g2ServiceBlockPreviousRender = renderGate2Redesign;
renderGate2Redesign = function (gate, cards) {
  const result = g2ServiceBlockPreviousRender.apply(this, arguments);
  if (gate?.id === "gate-2") g2ServiceBlockMountRegistered();
  return result;
};

function g2ServiceBlockRefresh(block, config, productId) {
  if (typeof g2StepServiceConfig === "function") config = g2StepServiceConfig(config, productId);
  const status = g2ServiceBlockStatus(config, productId);
  const record = g2ServiceBlockRecord(config, productId);
  const done = config.steps.filter((step) => g2ServiceBlockStepDone(config, step, record, productId)).length;
  const statusNode = block.querySelector("[data-g2sb-status]");
  const progressNode = block.querySelector("[data-g2sb-progress]");
  if (statusNode) statusNode.textContent = g2ServiceBlockStatusLabel(config, status, productId);
  if (progressNode) progressNode.textContent = `${done} из ${config.steps.length} шагов`;
  if (block.classList.contains("g2u-block")) {
    if (statusNode) statusNode.dataset.status = status;
    const meter = block.querySelector(".g2u-progress");
    if (meter) meter.value = done;
  }
  block.classList.toggle("is-not-needed", status === "not_needed");
  for (const step of config.steps) {
    const control = [...block.querySelectorAll("[data-g2sb-step]")]
      .find((node) => node.dataset.g2sbStep === step.step_id);
    const row = block.querySelector(`[data-g2sb-step-id="${CSS.escape(step.step_id)}"]`);
    row?.classList.toggle("is-done", g2ServiceBlockStepDone(config, step, record, productId));
    if (block.classList.contains("g2u-block") && row) {
      const stepState = g2UnifiedStepState(config, step, record, productId);
      row.dataset.g2uStepState = stepState;
      const circle = row.querySelector("[data-g2u-step-circle]");
      const badge = row.querySelector("[data-g2u-step-badge]");
      const label = stepState === "ready" ? "Готово" : stepState === "problem" ? "Проблема" : "Не проверено";
      if (circle) { circle.dataset.status = stepState; circle.textContent = stepState === "ready" ? "✓" : stepState === "problem" ? "!" : ""; circle.setAttribute("aria-label", label); }
      if (badge) { badge.dataset.status = stepState; badge.textContent = label; }
    }
    if (control) control.disabled = status === "not_needed";
    const confirmation = row?.querySelector("[data-g2sb-confirm]");
    if (confirmation) confirmation.disabled = status === "not_needed" ||
      !String(record?.steps?.[step.step_id]?.params?.value || "").trim();
  }
  if (block.classList.contains("g2u-block")) {
    const current = config.steps
      .find((step) => g2UnifiedStepState(config, step, record, productId) !== "ready")?.step_id;
    for (const guide of block.querySelectorAll(".g2u-guide")) {
      const row = guide.closest("[data-g2sb-step-id]");
      if (row?.dataset.g2sbStepId === current && !block.querySelector(".g2u-guide[open]")) guide.open = true;
    }
  }
  if (config.wizardUnitId) {
    const def = g2wDef(config.wizardUnitId);
    const passed = block.querySelector('[data-g2w-verify="passed"]');
    if (passed) passed.disabled = !g2wCanConfirm(def, productId);
    const verification = block.querySelector("[data-g2w-verify-state]");
    if (verification) verification.textContent = g2wVerificationLabel(def, productId);
    const auto = block.querySelector("[data-g2w-auto-state]");
    if (auto) auto.textContent = g2wAutoLabel(def, productId);
  }
}

function g2ServiceBlockRefreshInputStep(block, config, step, record, productId) {
  const row = block.querySelector(`[data-g2sb-step-id="${CSS.escape(step.step_id)}"]`);
  const progress = block.querySelector("[data-g2sb-progress]");
  if (!row || !progress) return;
  const wasDone = row.classList.contains("is-done");
  const done = g2ServiceBlockStepDone(config, step, record, productId);
  if (wasDone === done) return;
  row.classList.toggle("is-done", done);
  if (block.classList.contains("g2u-block")) row.dataset.g2uStepState = done ? "ready" : "pending";
  const count = Math.max(0, (Number.parseInt(progress.textContent, 10) || 0) + (done ? 1 : -1));
  progress.textContent = `${count} из ${config.steps.length} шагов`;
  if (block.classList.contains("g2u-block")) {
    const meter = block.querySelector(".g2u-progress");
    if (meter) meter.value = count;
  }
  if (!config.statusResolver) {
    const status = count === config.steps.length ? "ready" : count ? "in_progress" : "not_started";
    const label = block.querySelector("[data-g2sb-status]");
    if (label) label.textContent = g2ServiceBlockStatusLabel(config, status, productId);
  }
}

const g2ServiceBlockPreviousRefresh = g2wRefresh;
g2wRefresh = function (options = {}) {
  const result = g2ServiceBlockPreviousRefresh.apply(this, arguments);
  const affected = g2wAffectedIds(options.changedCardId, options.field);
  document.querySelectorAll(".g2w-workspace [data-g2sb-id]").forEach((block) => {
    const config = G2_SERVICE_BLOCK_CONFIGS.get(block.dataset.g2sbId);
    if (config && (!affected || affected.has(config.wizardUnitId) || config.id === options.changedServiceId))
      g2ServiceBlockRefresh(block, config, block.dataset.g2sbProductId || "");
  });
  return result;
};

let g2ServiceBlockPendingCommit = null;
function g2ServiceBlockFlushCommit(refreshUi = true) {
  const pending = g2ServiceBlockPendingCommit;
  if (!pending) return;
  g2ServiceBlockPendingCommit = null;
  clearTimeout(pending.timer);
  guruQueueWorkspaceSave({ durable: true, workspace: pending.workspace, projectId: pending.projectId });
  if (refreshUi && state === pending.workspace && activeProjectId === pending.projectId && activeGateId === "gate-2") {
    g2wRefresh({ changedCardId: pending.changedCardId, changedServiceId: pending.changedServiceId,
      stepToggle: pending.stepToggle });
    if (pending.refreshProductSelector && typeof guruV194ScheduleProductSelectorRefreshV1 === "function")
      guruV194ScheduleProductSelectorRefreshV1();
  }
}
function g2ServiceBlockScheduleCommit(changedCardId, changedServiceId, refreshProductSelector, stepToggle = false) {
  if (!state || !activeProjectId) return;
  // A tab closed before the scheduled flush must still save this edit.
  if (typeof _guruTabDirty !== "undefined") _guruTabDirty = true;
  if (g2ServiceBlockPendingCommit && (g2ServiceBlockPendingCommit.workspace !== state ||
      g2ServiceBlockPendingCommit.projectId !== activeProjectId)) g2ServiceBlockFlushCommit();
  if (g2ServiceBlockPendingCommit) {
    if (g2ServiceBlockPendingCommit.changedCardId !== changedCardId)
      g2ServiceBlockPendingCommit.changedCardId = "";
    if (g2ServiceBlockPendingCommit.changedServiceId !== changedServiceId)
      g2ServiceBlockPendingCommit.changedServiceId = "";
    g2ServiceBlockPendingCommit.refreshProductSelector ||= refreshProductSelector;
    g2ServiceBlockPendingCommit.stepToggle &&= stepToggle;
    clearTimeout(g2ServiceBlockPendingCommit.timer);
    g2ServiceBlockPendingCommit.timer = setTimeout(g2ServiceBlockFlushCommit, 180);
    return;
  }
  const pending = { workspace: state, projectId: activeProjectId,
    changedCardId, changedServiceId, refreshProductSelector, stepToggle,
    timer: null };
  g2ServiceBlockPendingCommit = pending;
  pending.timer = setTimeout(g2ServiceBlockFlushCommit, 180);
}
window.addEventListener("pagehide", () => g2ServiceBlockFlushCommit(false));

function g2ServiceBlockStore(target, commit) {
  const block = target.closest("[data-g2sb-id]");
  const baseConfig = G2_SERVICE_BLOCK_CONFIGS.get(block?.dataset.g2sbId);
  const productId = block?.dataset.g2sbProductId || "";
  const config = typeof g2StepServiceConfig === "function" ? g2StepServiceConfig(baseConfig, productId) : baseConfig;
  const step = config?.steps.find((item) => item.step_id === (target.dataset.g2sbStep || target.dataset.g2sbConfirm));
  if (!block || !step || (config.scope === "product" && !productId) ||
      g2ServiceBlockApplicability(config, productId) === "not_needed") return;
  g2ServiceBlockEnsureCard(config);
  const record = g2ServiceBlockRecord(config, productId, true);
  if (!record) return;
  const previous = record.steps[step.step_id];
  const isText = target.type === "text";
  const isConfirmation = Boolean(target.dataset.g2sbConfirm);
  const value = isText ? target.value.trim() : isConfirmation ? String(previous?.params?.value || "") : "";
  const result = isText ? (step.confirmAfterText
    ? value && value === String(previous?.params?.value || "") && previous?.result === "done" ? "done" : "pending"
    : value ? "done" : "pending") : (target.checked ? "done" : "pending");
  const wizardDef = config.wizardUnitId ? g2wDef(config.wizardUnitId) : null;
  const wizardStep = wizardDef?.steps.find((item) => item[0] === step.step_id);
  const baseline = isText ? G2_SERVICE_BLOCK_INPUT_START.get(target) : previous;
  if (commit && baseline && (baseline.result !== result ||
      String(baseline.params?.value || "") !== value))
    record.history.push({ ...baseline, params: { ...baseline.params } });
  record.steps[step.step_id] = {
    step_id: step.step_id, scope: config.scope, project_id: guruV194ProjectId(),
    product_id: productId, result, params: { ...(isText || isConfirmation ? { value } : wizardStep?.[2]
      ? { [wizardStep[2]]: g2wValue(wizardDef, productId, wizardStep[2]) } : {}),
      ...(previous?.params?.customFields ? { customFields: previous.params.customFields } : {}) },
    verification_type: step.verification_type || "self_reported_action",
    source_url: g2ServiceBlockSafeHref(g2ServiceBlockStepValue(config, step, "source_url", productId)),
    checked_at: new Date().toISOString(),
  };
  if (commit) {
    G2_SERVICE_BLOCK_INPUT_START.delete(target);
    guruGateReadinessCache.delete("gate-2");
    g2ServiceBlockScheduleCommit(config.wizardUnitId || "__service_only__", config.id,
      config.scope === "product" || g2wAffectsProductReadiness(config.wizardUnitId),
      target.type === "checkbox" && !step.uiStatusResolver && !step.doneResolver);
    if (target.type === "checkbox" && !step.uiStatusResolver && !step.doneResolver) {
      // The queued refresh recomputes dependent and automatic statuses after
      // the browser paints. Manual feedback needs only this row right now.
      g2ServiceBlockRefreshInputStep(block, config, step, record, productId);
      const row = block.querySelector(`[data-g2sb-step-id="${CSS.escape(step.step_id)}"]`);
      const circle = row?.querySelector("[data-g2u-step-circle]");
      const badge = row?.querySelector("[data-g2u-step-badge]");
      const stepState = result === "done" ? "ready" : "pending";
      if (row) row.dataset.g2uStepState = stepState;
      if (circle) {
        circle.dataset.status = stepState;
        circle.textContent = stepState === "ready" ? "✓" : "";
        circle.setAttribute("aria-label", stepState === "ready" ? "Готово" : "Не проверено");
      }
      if (badge) {
        badge.dataset.status = stepState;
        badge.textContent = stepState === "ready" ? "Готово" : "Не проверено";
      }
      const current = [...block.querySelectorAll("[data-g2sb-step-id]")]
        .find(item => item.dataset.g2uStepState !== "ready")?.dataset.g2sbStepId;
      for (const guide of block.querySelectorAll(".g2u-guide"))
        guide.open = guide.closest("[data-g2sb-step-id]")?.dataset.g2sbStepId === current;
    } else nowGuideWithReadPass(() => {
      g2ServiceBlockRefresh(block, config, productId);
      if (block.classList.contains("g2u-block")) {
        const current = config.steps
          .find(item => g2UnifiedStepState(config, item, record, productId) !== "ready")?.step_id;
        for (const guide of block.querySelectorAll(".g2u-guide"))
          guide.open = guide.closest("[data-g2sb-step-id]")?.dataset.g2sbStepId === current;
      }
    });
  } else {
    flashSaving({ skipProductSelectorRefresh: true });
    g2ServiceBlockRefreshInputStep(block, config, step, record, productId);
  }
}

document.addEventListener("focusin", (event) => {
  const target = event.target?.closest?.('[data-g2sb-step][type="text"]');
  if (!target) return;
  const block = target.closest("[data-g2sb-id]");
  const config = G2_SERVICE_BLOCK_CONFIGS.get(block?.dataset.g2sbId);
  const previous = config && g2ServiceBlockRecord(config, block.dataset.g2sbProductId || "")
    ?.steps?.[target.dataset.g2sbStep];
  if (previous) G2_SERVICE_BLOCK_INPUT_START.set(target, { ...previous, params: { ...previous.params } });
});
document.addEventListener("input", (event) => {
  const target = event.target?.closest?.('[data-g2sb-step][type="text"]');
  if (target) {
    g2ServiceBlockStore(target, false);
    const confirm = target.closest("[data-g2sb-step-id]")?.querySelector("[data-g2sb-confirm]");
    if (confirm) {
      confirm.disabled = !target.value.trim();
      if (confirm.disabled) confirm.checked = false;
    }
  }
});
document.addEventListener("change", (event) => {
  const target = event.target?.closest?.("[data-g2sb-step], [data-g2sb-confirm]");
  if (target) g2ServiceBlockStore(target, true);
});
