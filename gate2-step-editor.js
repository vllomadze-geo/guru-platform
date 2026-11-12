/* Project-scoped step layouts for the numbered Gate 2 blocks. The registered
   service and wizard definitions stay immutable templates; answers stay in
   their existing card records, keyed by the original step_id/product_id. */
const G2_STEP_EDITOR_UI = new Map();
let g2StepUndo = null;

function g2StepKey(kind, id, productId = "") { return `${kind}:${id}:${productId}`; }
function g2StepUi(kind, id, productId = "") {
  const key = g2StepKey(kind, id, productId);
  if (!G2_STEP_EDITOR_UI.has(key)) G2_STEP_EDITOR_UI.set(key, { editing: false, draft: null, confirming: "" });
  return G2_STEP_EDITOR_UI.get(key);
}
function g2StepIsEditing(kind, id, productId = "") { return g2StepUi(kind, id, productId).editing; }
function g2StepRoot(workspace = state, create = false) {
  if (!workspace?.project) return null;
  if (create) workspace.project.gate2StepLayoutsV1 ||= { company: {}, products: {} };
  return workspace.project.gate2StepLayoutsV1 || null;
}
function g2StepBucket(kind, id, productId = "", workspace = state, create = false) {
  const root = g2StepRoot(workspace, create);
  if (!root) return null;
  const scope = kind === "wizard" ? "company" : G2_SERVICE_BLOCK_CONFIGS.get(id)?.scope;
  if (scope === "company") return root.company || (create ? (root.company = {}) : null);
  if (!productId) return null;
  if (create) { root.products ||= {}; root.products[productId] ||= {}; }
  return root.products?.[productId] || null;
}
function g2StepSaved(kind, id, productId = "", workspace = state) {
  return g2StepBucket(kind, id, productId, workspace)?.[`${kind}:${id}`] || null;
}
function g2StepWizardGroups(def) {
  return def.id === "counter"
    ? [{ title: "Счётчик", steps: ["create", "id", "install"] }, { title: "Проверка", steps: ["check", "visit"] }]
    : [{ title: "Действие", steps: ["action", "add", "type"] }, { title: "Данные цели", steps: ["name", "id"] }, { title: "Проверка", steps: ["test", "report"] }];
}
function g2StepEnsure(kind, id, productId = "") {
  const bucket = g2StepBucket(kind, id, productId, state, true);
  if (!bucket) return null;
  const key = `${kind}:${id}`;
  if (bucket[key]) return bucket[key];
  const base = kind === "service" ? G2_SERVICE_BLOCK_CONFIGS.get(id) : g2wDef(id);
  const groups = kind === "service"
    ? g2UnifiedStepGroups(base).map((group) => ({ title: group.title, steps: group.steps.map((step) => step.step_id) }))
    : g2StepWizardGroups(base);
  bucket[key] = { groups: structuredClone(groups), edits: {}, added: {}, templateIds: kind === "service"
    ? base.steps.map((step) => step.step_id) : base.steps.map((step) => step[0]) };
  return bucket[key];
}
function g2StepServiceConfig(base, productId = "", workspace = state) {
  // Keep historical layouts in the project, but do not revive retired steps in an empty scaffold.
  if (!base || base.g2StepLayout || base.emptyStepScaffold) return base;
  const layout = g2StepSaved("service", base.id, productId, workspace);
  if (!layout) return base;
  const original = new Map(base.steps.map((step) => [step.step_id, step]));
  const seen = new Set();
  const ids = layout.groups.flatMap((group) => group.steps || []);
  const steps = ids.map((id) => {
    if (seen.has(id)) return null;
    seen.add(id);
    const template = original.get(id);
    if (!template && !layout.added[id]) return null;
    return { ...(template || { step_id: id, resultType: "checkbox" }), ...(layout.edits[id] || {}) };
  }).filter(Boolean);
  for (const step of base.steps) if (!seen.has(step.step_id) && !layout.templateIds?.includes(step.step_id)) steps.push(step);
  return { ...base, steps, stepGroups: layout.groups, g2StepLayout: layout };
}
function g2StepWizardDef(base, productId = "", workspace = state) {
  if (!base || base.g2StepLayout || !["counter", "goal"].includes(base.id) || base.scope !== "company") return base;
  const layout = g2StepSaved("wizard", base.id, productId, workspace);
  if (!layout) return base;
  const original = new Map(base.steps.map((step) => [step[0], step]));
  const seen = new Set();
  const steps = layout.groups.flatMap((group) => group.steps || []).map((id) => {
    if (seen.has(id)) return null;
    seen.add(id);
    const template = original.get(id);
    if (!template && !layout.added[id]) return null;
    const edit = layout.edits[id] || {};
    const step = template ? [...template] : [id, edit.what || "Новый шаг"];
    if (edit.what !== undefined) step[1] = edit.what;
    step.g2StepEdit = edit;
    return step;
  }).filter(Boolean);
  for (const step of base.steps) if (!seen.has(step[0]) && !layout.templateIds?.includes(step[0])) steps.push(step);
  return { ...base, steps, g2StepLayout: layout };
}
function g2StepHeaderButton(kind, id, productId = "") {
  return `<button type="button" class="g2step-header-button" data-g2step-action="mode" data-g2step-kind="${escapeAttr(kind)}" data-g2step-id="${escapeAttr(id)}" data-g2step-product="${escapeAttr(productId)}">${g2StepIsEditing(kind, id, productId) ? "Готово" : "Изменить"}</button>`;
}
function g2StepBase(kind, id, productId = "") {
  const base = kind === "service" ? G2_SERVICE_BLOCK_CONFIGS.get(id) : g2wDef(id);
  return kind === "service" ? g2StepServiceConfig(base, productId) : g2StepWizardDef(base, productId);
}
function g2StepById(kind, base, id) { return kind === "service" ? base.steps.find((step) => step.step_id === id) : base.steps.find((step) => step[0] === id); }
function g2StepId(kind, step) { return kind === "service" ? step.step_id : step[0]; }
function g2StepWhat(kind, base, step, productId) {
  return kind === "service" ? g2ServiceBlockStepValue(base, step, "what", productId) : step[1];
}
function g2StepSystemFields(kind, base, step, productId) {
  if (kind === "wizard") return step[2] ? [step[3] || step[2]] : [];
  const names = [];
  const wizard = base.wizardUnitId ? g2wDef(base.wizardUnitId) : null;
  for (const key of step.existingFields || []) names.push(g2ServiceBlockValue(step.fieldLabels?.[key], base, step, productId) || wizard?.steps.find((item) => item[2] === key)?.[3] || key);
  if (step.existingField && !names.length) {
    const source = wizard?.steps.find((item) => item[0] === step.step_id);
    if (source?.[3]) names.push(source[3]);
  }
  if (step.resultType === "text") names.push(step.resultLabel || "Результат");
  const context = g2ServiceBlockValue(step.context, base, step, productId);
  for (const item of Array.isArray(context) ? context : context ? [context] : []) if (item.label) names.push(item.label);
  const html = g2ServiceBlockValue(step.customField, base, step, productId);
  if (html) names.push("Поля системной проверки");
  return [...new Set(names.filter(Boolean))];
}
function g2StepCustomList(kind, step) { return kind === "service" ? step.customFields || [] : step.g2StepEdit?.fields || []; }
function g2StepFieldNames(kind, base, step, productId) {
  return [...g2StepSystemFields(kind, base, step, productId), ...g2StepCustomList(kind, step).map((field) => field.label)].filter(Boolean);
}
function g2StepCustomFieldControl(kind, blockId, productId, stepId, field, value) {
  const inputType = field.type === "url" ? "url" : "text";
  return `<label class="g2step-value"><span>${escapeHtml(field.label)}</span><input type="${inputType}" ${field.type === "digits" ? 'inputmode="numeric" pattern="[0-9]*"' : ""} data-g2step-value="${escapeAttr(field.id)}" data-g2step-kind="${escapeAttr(kind)}" data-g2step-id="${escapeAttr(blockId)}" data-g2step-product="${escapeAttr(productId)}" data-g2step-step="${escapeAttr(stepId)}" value="${escapeAttr(value || "")}"></label>`;
}
function g2StepCustomFieldsHtml(config, step, productId, record) {
  const fields = step.customFields || [];
  return fields.length ? `<div class="g2step-values">${fields.map((field) => g2StepCustomFieldControl("service", config.id, productId, step.step_id, field,
    record?.steps?.[step.step_id]?.params?.customFields?.[field.id])).join("")}</div>` : "";
}
function g2StepWizardFieldsHtml(def, productId, step, record) {
  const fields = step.g2StepEdit?.fields || [];
  return fields.length ? `<div class="g2step-values">${fields.map((field) => g2StepCustomFieldControl("wizard", def.id, productId, step[0], field,
    record?.steps?.[step[0]]?.params?.customFields?.[field.id])).join("")}</div>` : "";
}
function g2StepWizardInstructionsHtml(step) {
  const edit = step.g2StepEdit || {};
  return [["Где нажать", edit.where], ["Как проверить", edit.how], ["Если не получилось", edit.troubleshooting], ["Сверка", edit.reconciliation]]
    .filter(([, value]) => value).map(([label, value]) => `<div class="g2u-guide-item"><span>${label}</span><p>${g2UnifiedGuideText(value)}</p></div>`).join("");
}
function g2StepFormValue(kind, base, step, key, productId) {
  if (!step) return "";
  if (kind === "service") return g2ServiceBlockStepValue(base, step, key, productId);
  if (key === "what") return step[1];
  if (key === "source_url") return step.g2StepEdit?.source_url ?? g2wDocForStep(step, state, base);
  return step.g2StepEdit?.[key] || "";
}
function g2StepFieldRow(field) {
  return `<div class="g2step-field-row" data-g2step-field-id="${escapeAttr(field.id)}"><label><span>Название</span><input data-g2step-field-name value="${escapeAttr(field.label || "")}"></label><label><span>Тип</span><select data-g2step-field-type>${[["text", "Текст"], ["digits", "Число"], ["url", "Ссылка"]].map(([value, label]) => `<option value="${value}" ${field.type === value ? "selected" : ""}>${label}</option>`).join("")}</select></label><button type="button" class="g2step-text-button g2step-danger" data-g2step-action="remove-field">Удалить поле</button></div>`;
}
function g2StepEditorForm(kind, base, productId, step, groupIndex, isNew = false) {
  const id = step ? g2StepId(kind, step) : "";
  const system = step ? g2StepSystemFields(kind, base, step, productId) : [];
  const fields = step ? g2StepCustomList(kind, step) : [];
  const input = (name, label, required = false) => `<label class="g2step-form-field"><span>${label}</span><textarea data-g2step-edit-field="${name}" rows="${name === "what" ? 2 : 1}" ${required ? "required" : ""}>${escapeHtml(g2StepFormValue(kind, base, step, name, productId))}</textarea></label>`;
  return `<li class="g2step-editor-row" data-g2step-editor="${escapeAttr(id || "new")}" data-g2step-group="${groupIndex}"><form class="g2step-editor-form" data-g2step-form><h5>${isNew ? "Новый шаг" : "Изменить шаг"}</h5>${input("what", "Что сделать", true)}<small class="g2step-error" data-g2step-error hidden>Укажите, что нужно сделать.</small>
    <div class="g2step-instruction-fields">${input("where", "Где нажать")}${input("how", "Как проверить")}${input("troubleshooting", "Если не получилось")}${input("reconciliation", "Сверка")}
      <label class="g2step-form-field"><span>Справка (ссылка)</span><input type="url" data-g2step-edit-field="source_url" value="${escapeAttr(g2StepFormValue(kind, base, step, "source_url", productId))}"></label></div>
    <div class="g2step-field-editor"><strong>Поля шага</strong>${system.length ? `<p>Поля шага заданы системой: ${escapeHtml(system.join(", "))}</p>` : `<div data-g2step-field-list>${fields.map(g2StepFieldRow).join("")}</div><button type="button" class="g2step-text-button" data-g2step-action="add-field">+ Поле</button>`}</div>
    <div class="g2step-form-actions"><button type="button" class="g2step-text-button" data-g2step-action="cancel">Отмена</button><button type="submit" class="g2step-text-button g2step-save">Готово</button></div></form></li>`;
}
function g2StepEditingHtml(kind, base, productId, groups, record) {
  const ui = g2StepUi(kind, base.id, productId);
  let index = 0;
  return groups.map((group, groupIndex) => {
    const rows = group.steps.map((item) => {
    const step = kind === "service" ? item : g2StepById(kind, base, item.step_id);
    const id = g2StepId(kind, step);
    if (ui.draft?.id === id) { index++; return g2StepEditorForm(kind, base, productId, step, groupIndex); }
    const title = g2StepWhat(kind, base, step, productId);
    const fields = g2StepFieldNames(kind, base, step, productId);
    const done = kind === "service" ? g2UnifiedStepState(base, step, record, productId) : record?.steps?.[id]?.result === "done" ? "ready" : "pending";
    const number = String(++index).padStart(2, "0");
    return `<li class="g2step-compact" data-g2step-step="${escapeAttr(id)}"><span class="g2u-index">${number}</span><span class="g2u-step-circle" aria-hidden="true">${done === "ready" ? "✓" : done === "problem" ? "!" : ""}</span><span class="g2step-compact-copy"><strong>${g2UnifiedGuideText(title)}</strong><small>${fields.length ? `Поля: ${escapeHtml(fields.join(", "))}` : "Без полей"}</small></span><span class="g2step-compact-actions"><button type="button" class="g2step-text-button" data-g2step-action="edit" data-g2step-step="${escapeAttr(id)}">Изменить</button><button type="button" class="g2step-text-button g2step-danger" data-g2step-action="delete" data-g2step-step="${escapeAttr(id)}">Удалить</button></span></li>${ui.confirming === id ? `<li class="g2step-confirm" data-g2step-confirm><span>Удалить шаг «${escapeHtml(title)}»? Данные шага будут удалены.</span><span><button type="button" class="g2step-text-button" data-g2step-action="cancel-delete">Отмена</button><button type="button" class="g2step-text-button g2step-danger" data-g2step-action="confirm-delete" data-g2step-step="${escapeAttr(id)}">Удалить</button></span></li>` : ""}`;
    }).join("");
    const content = `<ol>${rows}${ui.draft?.new && ui.draft.groupIndex === groupIndex ? g2StepEditorForm(kind, base, productId, null, groupIndex, true) : ""}</ol>${!group.steps.length && !(ui.draft?.new && ui.draft.groupIndex === groupIndex) ? '<p class="g2step-empty">Шагов нет</p>' : ""}<button type="button" class="g2step-text-button g2step-add" data-g2step-action="add" data-g2step-group="${groupIndex}">+ Добавить шаг</button>`;
    return `<section class="g2u-group g2step-edit-group" data-g2step-group="${groupIndex}">${group.title ? `<h4>${escapeHtml(group.title)}</h4>` : ""}${content}</section>`;
  }).join("");
}
function g2StepContext(target) {
  const block = target.closest(".g2u-block[data-g2sb-id], .g2u-wizard[data-g2w-card-view]");
  if (!block) return null;
  const kind = block.dataset.g2sbId ? "service" : "wizard";
  const id = block.dataset.g2sbId || block.dataset.g2wCardView;
  return { block, kind, id, productId: block.dataset.g2sbProductId || block.dataset.g2wProductId || "", ui: g2StepUi(kind, id, block.dataset.g2sbProductId || block.dataset.g2wProductId || "") };
}
function g2StepRender(context, focus = "") {
  const { block, kind, id, productId } = context;
  const open = block.open;
  const html = kind === "service" ? g2UnifiedBlockHtml(G2_SERVICE_BLOCK_CONFIGS.get(id), productId)
    : g2UnifiedWizardCardHtml(g2wDef(id), productId);
  block.outerHTML = html;
  const next = kind === "service"
    ? document.querySelector(`.g2w-workspace [data-g2sb-id="${CSS.escape(id)}"][data-g2sb-product-id="${CSS.escape(productId)}"]`)
    : document.querySelector(`.g2w-workspace [data-g2w-card-view="${CSS.escape(id)}"]`);
  if (next) {
    next.open = open;
    if (focus) next.querySelector(focus)?.focus();
  }
  return next;
}
function g2StepCloseOtherEditors(context) {
  for (const form of [...document.querySelectorAll(".g2w-workspace [data-g2step-form]")]) {
    const other = g2StepContext(form);
    if (!other || g2StepKey(other.kind, other.id, other.productId) === g2StepKey(context.kind, context.id, context.productId)) continue;
    other.ui.draft = null;
    g2StepRender(other);
  }
}
function g2StepPersist(context) {
  guruGateReadinessCache.delete("gate-2");
  g2wSave();
  const node = g2StepRender(context);
  if (node) g2wRefresh({ changedCardId: context.kind === "wizard" ? context.id : G2_SERVICE_BLOCK_CONFIGS.get(context.id)?.wizardUnitId || "" });
}
function g2StepRecord(context, create = false) {
  if (context.kind === "service") {
    const config = G2_SERVICE_BLOCK_CONFIGS.get(context.id);
    if (create) g2ServiceBlockEnsureCard(config);
    return g2ServiceBlockRecord(config, context.productId, create);
  }
  return g2wRecord(g2wDef(context.id), context.productId, create);
}
function g2StepSourceHasData(context, base, step) {
  if (context.kind === "wizard") return Boolean(step?.[2] && g2wValue(base, context.productId, step[2]));
  const wizard = base.wizardUnitId ? g2wDef(base.wizardUnitId) : null;
  const keys = step.existingFields || (step.existingField && wizard?.steps.find((item) => item[0] === step.step_id)?.[2]
    ? [wizard.steps.find((item) => item[0] === step.step_id)[2]] : []);
  if (wizard && keys.some((key) => Boolean(g2wValue(wizard, context.productId, key)))) return true;
  const contextValue = g2ServiceBlockValue(step.context, base, step, context.productId);
  if ((Array.isArray(contextValue) ? contextValue : contextValue ? [contextValue] : [])
    .some((item) => item.value && !/^(?:не указано|url не указан)$/i.test(String(item.value).trim()))) return true;
  const html = g2ServiceBlockValue(step.customField, base, step, context.productId);
  if (!html) return false;
  const node = document.createElement("div"); node.innerHTML = html;
  return [...node.querySelectorAll("input, textarea, select")].some((field) =>
    field.matches(":checked") || (field.matches("select") ? field.selectedIndex > 0 : Boolean(String(field.value || "").trim())));
}
function g2StepRemove(context, id) {
  const savedBefore = g2StepSaved(context.kind, context.id, context.productId);
  const snapshot = savedBefore ? structuredClone(savedBefore) : null;
  const record = g2StepRecord(context);
  const answer = record?.steps?.[id] ? structuredClone(record.steps[id]) : null;
  const layout = g2StepEnsure(context.kind, context.id, context.productId);
  for (const group of layout.groups) group.steps = group.steps.filter((item) => item !== id);
  delete layout.added[id]; delete layout.edits[id];
  if (record?.steps) delete record.steps[id];
  context.ui.confirming = ""; context.ui.draft = null;
  g2StepPersist(context);
  clearTimeout(g2StepUndo?.timer);
  document.querySelector("[data-g2step-toast]")?.remove();
  const toast = document.createElement("div"); toast.className = "g2step-toast"; toast.dataset.g2stepToast = "";
  toast.innerHTML = 'Шаг удалён · <button type="button" data-g2step-undo>Отменить</button>';
  document.body.append(toast);
  g2StepUndo = { ...context, snapshot, answer, stepId: id, timer: setTimeout(() => { toast.remove(); g2StepUndo = null; }, 6000) };
}
function g2StepSaveForm(context, form) {
  const what = form.querySelector('[data-g2step-edit-field="what"]')?.value.trim() || "";
  if (!what) {
    form.querySelector("[data-g2step-error]").hidden = false;
    form.querySelector('[data-g2step-edit-field="what"]').focus();
    return;
  }
  const layout = g2StepEnsure(context.kind, context.id, context.productId);
  const edit = Object.fromEntries([...form.querySelectorAll("[data-g2step-edit-field]")].map((field) => [field.dataset.g2stepEditField, field.value.trim()]));
  const base = g2StepBase(context.kind, context.id, context.productId);
  const old = context.ui.draft?.id ? g2StepById(context.kind, base, context.ui.draft.id) : null;
  const system = old ? g2StepSystemFields(context.kind, base, old, context.productId) : [];
  if (!system.length) edit[context.kind === "service" ? "customFields" : "fields"] = [...form.querySelectorAll("[data-g2step-field-id]")].map((row) => ({
    id: row.dataset.g2stepFieldId, label: row.querySelector("[data-g2step-field-name]")?.value.trim() || "Поле",
    type: row.querySelector("[data-g2step-field-type]")?.value || "text",
  }));
  const id = context.ui.draft?.id || `custom_${crypto.randomUUID().replaceAll("-", "")}`;
  if (!context.ui.draft?.id) {
    layout.groups[context.ui.draft.groupIndex].steps.push(id);
    layout.added[id] = true;
  }
  layout.edits[id] = edit;
  context.ui.draft = null;
  g2StepPersist(context);
}

document.addEventListener("click", (event) => {
  const undo = event.target.closest?.("[data-g2step-undo]");
  if (undo && g2StepUndo) {
    const item = g2StepUndo; clearTimeout(item.timer); g2StepUndo = null;
    const bucket = g2StepBucket(item.kind, item.id, item.productId, state, true);
    if (item.snapshot) bucket[`${item.kind}:${item.id}`] = item.snapshot;
    else delete bucket[`${item.kind}:${item.id}`];
    if (item.answer) g2StepRecord(item, true).steps[item.stepId] = item.answer;
    undo.closest("[data-g2step-toast]")?.remove();
    const block = item.kind === "service" ? document.querySelector(`[data-g2sb-id="${CSS.escape(item.id)}"]`) : document.querySelector(`[data-g2w-card-view="${CSS.escape(item.id)}"]`);
    if (block) g2StepPersist({ ...item, block });
    else g2wSave();
    return;
  }
  const button = event.target.closest?.("[data-g2step-action]");
  if (!button) return;
  event.preventDefault(); event.stopPropagation();
  const context = g2StepContext(button); if (!context) return;
  const action = button.dataset.g2stepAction;
  if (action === "mode") { context.ui.editing = !context.ui.editing; context.ui.draft = null; context.ui.confirming = ""; g2StepRender(context, '[data-g2step-action="mode"]'); return; }
  if (action === "add") { g2StepCloseOtherEditors(context); context.ui.draft = { new: true, groupIndex: Number(button.dataset.g2stepGroup) }; context.ui.confirming = ""; g2StepRender(context, '[data-g2step-edit-field="what"]'); return; }
  if (action === "edit") { g2StepCloseOtherEditors(context); context.ui.draft = { id: button.dataset.g2stepStep }; context.ui.confirming = ""; g2StepRender(context, '[data-g2step-edit-field="what"]'); return; }
  if (action === "cancel") { context.ui.draft = null; g2StepRender(context, '[data-g2step-action="mode"]'); return; }
  if (action === "delete") {
    const record = g2StepRecord(context);
    const answer = record?.steps?.[button.dataset.g2stepStep];
    const base = g2StepBase(context.kind, context.id, context.productId);
    const step = g2StepById(context.kind, base, button.dataset.g2stepStep);
    const hasData = answer?.result === "done" || Object.values(answer?.params || {}).some((value) => typeof value === "object" ? Object.values(value).some(Boolean) : Boolean(value)) ||
      g2StepSourceHasData(context, base, step);
    if (hasData) { context.ui.confirming = button.dataset.g2stepStep; g2StepRender(context, '[data-g2step-action="cancel-delete"]'); }
    else g2StepRemove(context, button.dataset.g2stepStep);
    return;
  }
  if (action === "cancel-delete") { context.ui.confirming = ""; g2StepRender(context, '[data-g2step-action="mode"]'); return; }
  if (action === "confirm-delete") { g2StepRemove(context, button.dataset.g2stepStep); return; }
  if (action === "add-field") {
    const list = button.parentElement.querySelector("[data-g2step-field-list]");
    list?.insertAdjacentHTML("beforeend", g2StepFieldRow({ id: `field_${crypto.randomUUID().replaceAll("-", "")}`, label: "", type: "text" }));
    list?.lastElementChild?.querySelector("[data-g2step-field-name]")?.focus();
    return;
  }
  if (action === "remove-field") { button.closest("[data-g2step-field-id]")?.remove(); return; }
});
document.addEventListener("submit", (event) => {
  const form = event.target.closest?.("[data-g2step-form]"); if (!form) return;
  event.preventDefault();
  const context = g2StepContext(form); if (context) g2StepSaveForm(context, form);
});
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const form = event.target.closest?.("[data-g2step-form]") || document.querySelector(".g2w-workspace [data-g2step-form]");
  const confirm = event.target.closest?.("[data-g2step-confirm]") || document.querySelector(".g2w-workspace [data-g2step-confirm]");
  const context = g2StepContext(form || confirm || event.target);
  if (!context || (!form && !confirm)) return;
  event.preventDefault();
  context.ui.draft = null; context.ui.confirming = "";
  g2StepRender(context, '[data-g2step-action="mode"]');
});
document.addEventListener("input", (event) => {
  const input = event.target.closest?.("[data-g2step-value]"); if (!input) return;
  const context = g2StepContext(input); if (!context) return;
  const record = g2StepRecord(context, true);
  const id = input.dataset.g2stepStep;
  record.steps[id] ||= { step_id: id, scope: context.kind === "wizard" ? "company" : G2_SERVICE_BLOCK_CONFIGS.get(context.id).scope,
    project_id: guruV194ProjectId(), product_id: context.productId, result: "pending", params: {}, verification_type: "self_reported_action" };
  record.steps[id].params ||= {}; record.steps[id].params.customFields ||= {};
  record.steps[id].params.customFields[input.dataset.g2stepValue] = input.value;
  flashSaving({ skipProductSelectorRefresh: true });
});
document.addEventListener("change", (event) => {
  const input = event.target.closest?.("[data-g2step-value]"); if (!input) return;
  g2wSave();
});
