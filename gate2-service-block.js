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
      !config.title || !Array.isArray(config.steps) || !config.steps.length)
    throw new TypeError("Некорректный конфиг блока сервиса Gate 2");
  if (typeof config.serviceUrl !== "function" && !/^https:\/\//.test(config.serviceUrl || ""))
    throw new TypeError("Для сервиса нужен адрес HTTPS");
  const ids = new Set();
  for (const step of config.steps) {
    const source = step && typeof step.source_url === "function" ? "" : step?.source_url || "";
    if (!step || !/^[a-z][a-z0-9_-]*$/.test(step.step_id || "") ||
        ids.has(step.step_id) || !step.what || !step.where || !step.how ||
        (source && !/^https:\/\//.test(source)) ||
        !["checkbox", "text", "reference"].includes(step.resultType || "checkbox"))
      throw new TypeError("Некорректный шаг блока сервиса Gate 2");
    ids.add(step.step_id);
  }
  if ([...G2_SERVICE_BLOCK_CONFIGS.values()].some((item) =>
    item.id !== config.id && item.scope === config.scope &&
    g2ServiceBlockCardId(item) === g2ServiceBlockCardId(config)))
    throw new TypeError("У сервисов одной области Gate 2 должен быть разный cardId");
  G2_SERVICE_BLOCK_CONFIGS.set(config.id, config);
  return config;
}

function g2ServiceBlockEnsureCard(config, workspace = state) {
  const gate = g2wGate(workspace);
  if (!gate) throw new TypeError("Gate 2 отсутствует");
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
    g2ServiceBlockValue(config.notNeededReason, config, null, productId, workspace) || "Не требуется по Gate 0");
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

function g2ServiceBlockHtml(config, productId = "") {
  g2ServiceBlockRegister(config);
  if (config.scope === "product" && !productId)
    throw new TypeError("Блоку продукта нужен product_id");
  const record = g2ServiceBlockRecord(config, productId);
  const status = g2ServiceBlockStatus(config, productId);
  const done = config.steps.filter((step) => g2ServiceBlockStepDone(config, step, record, productId)).length;
  const notNeeded = status === "not_needed";
  const serviceUrl = g2ServiceBlockSafeHref(g2ServiceBlockValue(config.serviceUrl, config, null, productId));
  const serviceLabel = g2ServiceBlockValue(config.serviceLabel, config, null, productId) || "Открыть сервис";
  const headingId = `g2sb-${config.id}-${productId || "company"}`;
  const statusLabel = g2ServiceBlockStatusLabel(config, status, productId);
  return `<details class="g2sb-block ${notNeeded ? "is-not-needed" : ""}" data-g2sb-id="${escapeAttr(config.id)}" data-g2sb-product-id="${escapeAttr(productId)}" data-ui-keeper-key="g2sb:${escapeAttr(config.scope)}:${escapeAttr(productId)}:${escapeAttr(config.id)}">
    <summary class="g2sb-header"><span class="g2sb-header-main"><span class="g2sb-heading"><strong id="${escapeAttr(headingId)}" class="g2sb-title">${escapeHtml(g2ServiceBlockSafeText(config.title))}</strong><span class="g2sb-status" data-g2sb-status aria-live="polite">${statusLabel}</span></span>
      <span class="g2sb-progress" data-g2sb-progress aria-live="polite">${done} из ${config.steps.length} шагов</span></span>
      ${serviceUrl ? `<a href="${escapeAttr(serviceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(g2ServiceBlockSafeText(serviceLabel))} ↗</a>` : `<span class="g2sb-help-note">${escapeHtml(g2ServiceBlockSafeText(config.serviceUnavailableLabel || "Адрес сервиса не указан"))}</span>`}</summary>
    <div class="g2sb-body">${config.notice ? `<p class="g2sb-notice">${escapeHtml(g2ServiceBlockSafeText(g2ServiceBlockValue(config.notice, config, null, productId)))}</p>` : ""}
    <ol class="g2sb-steps">${config.steps.map((step, index) => {
      const saved = record?.steps?.[step.step_id];
      const value = String(saved?.params?.value || "");
      const checked = g2ServiceBlockStepDone(config, step, record, productId);
      const what = g2ServiceBlockStepValue(config, step, "what", productId);
      const where = g2ServiceBlockStepValue(config, step, "where", productId);
      const how = g2ServiceBlockStepValue(config, step, "how", productId);
      const troubleshooting = g2ServiceBlockStepValue(config, step, "troubleshooting", productId);
      const reconciliation = g2ServiceBlockStepValue(config, step, "reconciliation", productId);
      const help = g2ServiceBlockSafeHref(g2ServiceBlockStepValue(config, step, "source_url", productId));
      const helpClass = step.helpColumn === "right" ? " g2sb-help-right" : "";
      const helpHtml = help
        ? `<a class="g2sb-help${helpClass}" href="${escapeAttr(help)}" target="_blank" rel="noopener noreferrer">Справка ↗</a>` : "";
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
      const result = step.resultType === "reference" ? "" : (step.resultType || "checkbox") === "text"
        ? `<label class="g2sb-result"><span>${escapeHtml(step.resultLabel || "Результат")}</span><input type="text" data-g2sb-step="${escapeAttr(step.step_id)}" value="${escapeAttr(value)}" placeholder="${escapeAttr(step.resultPlaceholder || "Введите результат")}" ${notNeeded ? "disabled" : ""}></label>`
        : `<label class="g2sb-result g2sb-check${checked ? " is-checked" : ""}${step.resultColumn === "right" ? " g2sb-result-right" : ""}"><input type="checkbox" data-g2sb-step="${escapeAttr(step.step_id)}" ${checked ? "checked" : ""} ${notNeeded ? "disabled" : ""}><span>Выполнено</span></label>`;
      return `<li class="g2sb-step ${checked ? "is-done" : ""}" data-g2sb-step-id="${escapeAttr(step.step_id)}"><span class="g2sb-index">${String(index + 1).padStart(2, "0")}</span><div class="g2sb-step-content">
        <div class="g2sb-copy"><span>Что сделать</span><strong>${escapeHtml(g2ServiceBlockSafeText(what))}</strong></div>
        <div class="g2sb-copy"><span>Где нажать</span><p>${escapeHtml(g2ServiceBlockSafeText(where))}</p></div>
        <div class="g2sb-copy"><span>Как проверить</span><p>${escapeHtml(g2ServiceBlockSafeText(how))}</p></div>
        ${troubleshooting ? `<div class="g2sb-copy"><span>Если не получилось</span><p>${escapeHtml(g2ServiceBlockSafeText(troubleshooting))}</p></div>` : ""}
        ${reconciliation ? `<div class="g2sb-copy"><span>Сверка</span><p>${escapeHtml(g2ServiceBlockSafeText(reconciliation))}</p></div>` : ""}
        ${contextHtml}${existingField}${helpHtml}${g2ServiceBlockValue(step.autoCheck, config, step, productId) && wizardDef && !notNeeded
          ? `<button type="button" class="g2sb-auto" data-g2w-auto="${escapeAttr(wizardDef.id)}" data-g2w-product="${escapeAttr(productId)}">Проверить URL</button>` : ""}${result}</div></li>`;
    }).join("")}</ol>${config.wizardUnitId && !notNeeded ? g2ServiceBlockVerificationHtml(config, productId) : ""}</div>
  </details>`;
}

function g2ServiceBlockMountRegistered() {
  const workspace = document.querySelector(".g2w-workspace");
  if (!workspace || !G2_SERVICE_BLOCK_CONFIGS.size) return;
  const productId = guruV194SelectedProduct(state)?.id || "";
  const afterUnits = new Map();
  for (const config of G2_SERVICE_BLOCK_CONFIGS.values()) {
    if (config.scope === "product" && !productId) continue;
    const scope = workspace.querySelector(`[data-g2-scope="${config.scope}"]`);
    if (!scope || scope.querySelector(`:scope > [data-g2sb-id="${CSS.escape(config.id)}"]`)) continue;
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
  const status = g2ServiceBlockStatus(config, productId);
  const record = g2ServiceBlockRecord(config, productId);
  const done = config.steps.filter((step) => g2ServiceBlockStepDone(config, step, record, productId)).length;
  const statusNode = block.querySelector("[data-g2sb-status]");
  const progressNode = block.querySelector("[data-g2sb-progress]");
  if (statusNode) statusNode.textContent = g2ServiceBlockStatusLabel(config, status, productId);
  if (progressNode) progressNode.textContent = `${done} из ${config.steps.length} шагов`;
  block.classList.toggle("is-not-needed", status === "not_needed");
  for (const step of config.steps) {
    const control = [...block.querySelectorAll("[data-g2sb-step]")]
      .find((node) => node.dataset.g2sbStep === step.step_id);
    block.querySelector(`[data-g2sb-step-id="${CSS.escape(step.step_id)}"]`)
      ?.classList.toggle("is-done", g2ServiceBlockStepDone(config, step, record, productId));
    if (control) {
      control.disabled = status === "not_needed";
      control.closest(".g2sb-check")?.classList.toggle("is-checked", control.checked);
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

const g2ServiceBlockPreviousRefresh = g2wRefresh;
g2wRefresh = function () {
  const result = g2ServiceBlockPreviousRefresh.apply(this, arguments);
  document.querySelectorAll(".g2w-workspace [data-g2sb-id]").forEach((block) => {
    const config = G2_SERVICE_BLOCK_CONFIGS.get(block.dataset.g2sbId);
    if (config) g2ServiceBlockRefresh(block, config, block.dataset.g2sbProductId || "");
  });
  return result;
};

let g2ServiceBlockPendingCommit = null;
function g2ServiceBlockFlushCommit(refreshUi = true) {
  const pending = g2ServiceBlockPendingCommit;
  if (!pending) return;
  g2ServiceBlockPendingCommit = null;
  if (pending.frame !== null) cancelAnimationFrame(pending.frame);
  clearTimeout(pending.timer);
  clearTimeout(pending.fallback);
  guruPersistStateFast({ durable: true, workspace: pending.workspace, projectId: pending.projectId });
  if (refreshUi && state === pending.workspace && activeProjectId === pending.projectId && activeGateId === "gate-2")
    g2wRefresh();
}
function g2ServiceBlockScheduleCommit() {
  if (!state || !activeProjectId) return;
  if (g2ServiceBlockPendingCommit && (g2ServiceBlockPendingCommit.workspace !== state ||
      g2ServiceBlockPendingCommit.projectId !== activeProjectId)) g2ServiceBlockFlushCommit();
  if (g2ServiceBlockPendingCommit) return;
  const pending = { workspace: state, projectId: activeProjectId,
    frame: null, timer: null, fallback: null };
  g2ServiceBlockPendingCommit = pending;
  pending.frame = requestAnimationFrame(() => {
    if (g2ServiceBlockPendingCommit !== pending) return;
    pending.frame = null;
    pending.timer = setTimeout(g2ServiceBlockFlushCommit, 0);
  });
  pending.fallback = setTimeout(g2ServiceBlockFlushCommit, 120);
}
window.addEventListener("pagehide", () => g2ServiceBlockFlushCommit(false));

function g2ServiceBlockStore(target, commit) {
  const block = target.closest("[data-g2sb-id]");
  const config = G2_SERVICE_BLOCK_CONFIGS.get(block?.dataset.g2sbId);
  const productId = block?.dataset.g2sbProductId || "";
  const step = config?.steps.find((item) => item.step_id === target.dataset.g2sbStep);
  if (!block || !step || (config.scope === "product" && !productId) ||
      g2ServiceBlockApplicability(config, productId) === "not_needed") return;
  g2ServiceBlockEnsureCard(config);
  const record = g2ServiceBlockRecord(config, productId, true);
  if (!record) return;
  const previous = record.steps[step.step_id];
  const isText = target.type === "text";
  const value = isText ? target.value.trim() : "";
  const result = isText ? (value ? "done" : "pending") : (target.checked ? "done" : "pending");
  const wizardDef = config.wizardUnitId ? g2wDef(config.wizardUnitId) : null;
  const wizardStep = wizardDef?.steps.find((item) => item[0] === step.step_id);
  const baseline = isText ? G2_SERVICE_BLOCK_INPUT_START.get(target) : previous;
  if (commit && baseline && (baseline.result !== result ||
      String(baseline.params?.value || "") !== value))
    record.history.push({ ...baseline, params: { ...baseline.params } });
  record.steps[step.step_id] = {
    step_id: step.step_id, scope: config.scope, project_id: guruV194ProjectId(),
    product_id: productId, result, params: isText ? { value } : wizardStep?.[2]
      ? { [wizardStep[2]]: g2wValue(wizardDef, productId, wizardStep[2]) } : {},
    verification_type: step.verification_type || "self_reported_action",
    source_url: g2ServiceBlockSafeHref(g2ServiceBlockStepValue(config, step, "source_url", productId)),
    checked_at: new Date().toISOString(),
  };
  if (commit) {
    G2_SERVICE_BLOCK_INPUT_START.delete(target);
    guruGateReadinessCache.delete("gate-2");
    g2ServiceBlockScheduleCommit();
  } else flashSaving();
  g2ServiceBlockRefresh(block, config, productId);
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
  if (target) g2ServiceBlockStore(target, false);
});
document.addEventListener("change", (event) => {
  const target = event.target?.closest?.("[data-g2sb-step]");
  if (target) g2ServiceBlockStore(target, true);
});
