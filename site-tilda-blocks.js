/* Gate 1 site blocks: one project-level list of Tilda codes per logical block.
   Existing captions are read as defaults. Saved edits live only in the project
   workspace and are projected into every matching page editor on each render. */
const GURU_TILDA_STORE_V528 = "tildaBlockCodesV528";
const guruTildaDefaultsV528 = new Map();
const GURU_TILDA_ALIASES_V528 = Object.freeze({
  "card-24:productHeroV253": "card-24:goat-product-hero-v514",
  "card-24:productGalleryV253": "card-24:goat-product-gallery-v514",
  "card-24:productDeliveryGuaranteeV253": "card-24:goat-product-delivery-v514",
  "card-24:productMeaningV253": "card-24:goat-product-meaning-v514",
  "card-24:productCreationV253": "card-24:goat-product-creation-v514",
  "card-24:productFinalCtaImplementedV253": "card-24:goat-product-finalCta-v514",
  "card-24:productRelatedImplementedV253": "card-24:goat-product-related-v514",
});

function guruTildaKeyV528(cardId, sectionKey) {
  const key = `${String(cardId || "")}:${String(sectionKey || "")}`;
  return GURU_TILDA_ALIASES_V528[key] || key;
}

function guruTildaStoreV528(workspace = state) {
  return workspace?.project?.[GURU_TILDA_STORE_V528] || {};
}

function guruTildaSavedCodesV528(key, workspace = state) {
  const store = guruTildaStoreV528(workspace);
  return Object.prototype.hasOwnProperty.call(store, key) && Array.isArray(store[key])
    ? store[key] : null;
}

function guruTildaParseCodesV528(label) {
  const source = String(label || "").replace(/^Tilda\s*:\s*/i, "");
  const tokens = source.match(/(?:[A-Za-z]{1,5})?\d{2,5}[A-Za-z]?/g) || [];
  let prefix = "";
  return [...new Set(tokens.map((token) => {
    const value = token.toUpperCase();
    const letters = value.match(/^[A-Z]+/)?.[0];
    if (letters) prefix = letters;
    return letters ? value : `${prefix}${value}`;
  }))];
}

function guruTildaDefaultCodesV528(key, label = "") {
  const codes = guruTildaParseCodesV528(label);
  if (codes.length && !guruTildaDefaultsV528.get(key)?.length)
    guruTildaDefaultsV528.set(key, codes);
  return guruTildaDefaultsV528.get(key) || [];
}

function guruTildaDisplayV528(codes) {
  return codes.length ? `Tilda: ${codes.join(" / ")}` : "Коды Tilda не указаны";
}

function guruTildaStandardV528(standard, codes) {
  if (!codes.length) return "Коды Tilda не указаны.";
  const suffix = String(standard || "").split(/\s+[—–]\s+/).slice(1).join(" — ");
  return `${guruTildaDisplayV528(codes)}${suffix ? ` — ${suffix}` : ""}`;
}

const __guruTildaPrevTemplateV528 = v22TemplateForCard;
v22TemplateForCard = function (card) {
  const template = __guruTildaPrevTemplateV528.apply(this, arguments);
  const sections = template?.sections;
  if (!Array.isArray(sections)) return template;
  let changed = false;
  const projected = sections.map((section) => {
    const key = guruTildaKeyV528(card?.id, section.key);
    const codes = guruTildaSavedCodesV528(key);
    if (!codes || !/^Tilda\s*:/i.test(String(section.standard || ""))) return section;
    changed = true;
    return { ...section, standard: guruTildaStandardV528(section.standard, codes) };
  });
  return changed ? { ...template, sections: projected } : template;
};

function guruTildaIsSiteBlockV528(sectionKey) {
  return sectionKey && !/^(?:seo_snippet|page_semantics_v1|page_heading_description_v513|cwv|technical)/i.test(sectionKey);
}

function guruTildaSectionHeadV528(section) {
  return section.querySelector(":scope > summary, :scope > .product-card-binary-head-v253");
}

function guruTildaDecorateV528(root = els.contentArea) {
  if (!root || activeGateId !== "gate-1") return;
  const templates = new Map();
  root.querySelectorAll(
    ".g1-redesign .page-structure-card [data-v22-site-section]",
  ).forEach((section) => {
    const sectionKey = section.dataset.v22SiteSection;
    if (!guruTildaIsSiteBlockV528(sectionKey)) return;
    const head = guruTildaSectionHeadV528(section);
    const cardId = section.closest("[data-card]")?.dataset.card;
    if (!head || !cardId) return;
    const key = guruTildaKeyV528(cardId, sectionKey);
    let label = head.querySelector(".guru-category-page-tilda-v493, .product-card-tilda-v253, [data-guru-tilda-label-v528]");
    if (label && /^не блок Tilda/i.test(label.textContent.trim())) return;
    if (!templates.has(cardId))
      templates.set(cardId, __guruTildaPrevTemplateV528(findCard(cardId)));
    const rawTemplate = templates.get(cardId);
    const standard = rawTemplate?.sections?.find((item) => item.key === sectionKey)?.standard || "";
    const defaultSource = label?.textContent || (/^Tilda\s*:/i.test(standard) ? standard : "");
    const defaults = guruTildaDefaultCodesV528(key, defaultSource);
    const saved = guruTildaSavedCodesV528(key);
    if (!label && (defaults.length || saved)) {
      label = document.createElement("small");
      label.className = "guru-tilda-label-v528";
      head.append(label);
    }
    if (label) {
      label.dataset.guruTildaLabelV528 = key;
      if (saved) label.textContent = guruTildaDisplayV528(saved);
      else if (!label.textContent.trim()) label.textContent = guruTildaDisplayV528(defaults);
    }

    let button = head.querySelector(":scope [data-guru-tilda-edit-v528]");
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.className = "guru-tilda-edit-v528";
      button.textContent = "✎";
      button.title = "Изменить коды Tilda";
      button.setAttribute("aria-label", "Изменить коды Tilda");
      if (label) label.after(button);
      else head.append(button);
    }
    button.dataset.guruTildaEditV528 = key;
    button.dataset.guruTildaBlockTitleV528 = head.querySelector(".v22-section-title, strong")?.textContent?.trim() || "Блок сайта";

    const guidance = section.querySelector(":scope > .v22-section-body .v22-section-guidance > div:last-child p");
    if (guidance && /^Tilda\s*:|^Коды Tilda не указаны/.test(guidance.textContent.trim())) {
      guidance.dataset.guruTildaStandardV528 = key;
      if (saved) guidance.textContent = guruTildaStandardV528(standard, saved);
    }
  });
}

const __guruTildaPrevRenderAccordionV528 = renderGate1Accordion;
renderGate1Accordion = function () {
  const result = __guruTildaPrevRenderAccordionV528.apply(this, arguments);
  guruTildaDecorateV528();
  return result;
};

const __guruTildaPrevMountBodyV528 = gate1MountAccordionBodyV302;
gate1MountAccordionBodyV302 = function () {
  const body = __guruTildaPrevMountBodyV528.apply(this, arguments);
  if (body) guruTildaDecorateV528(els.contentArea);
  return body;
};

function guruTildaDialogV528() {
  let dialog = document.querySelector("#guru-tilda-dialog-v528");
  if (!dialog) {
    dialog = document.createElement("dialog");
    dialog.id = "guru-tilda-dialog-v528";
    dialog.className = "guru-tilda-dialog-v528";
    dialog.innerHTML = `<form method="dialog" class="guru-tilda-form-v528">
      <header><div><small>Блоки Tilda</small><h2 data-guru-tilda-dialog-title-v528></h2></div><button type="button" class="guru-tilda-close-v528" data-guru-tilda-action-v528="cancel" aria-label="Закрыть">×</button></header>
      <p class="guru-tilda-dialog-note-v528">Перетащите код за маркер. Порядок сохранённых кодов обновится сразу.</p>
      <div class="guru-tilda-rows-v528" data-guru-tilda-rows-v528></div>
      <span class="guru-tilda-order-status-v529" role="status" aria-live="polite" data-guru-tilda-order-status-v529></span>
      <button type="button" class="guru-tilda-add-v528" data-guru-tilda-action-v528="add">+ Добавить код</button>
      <p class="guru-tilda-error-v528" data-guru-tilda-error-v528 role="alert" hidden></p>
      <footer><button type="button" data-guru-tilda-action-v528="cancel">Отмена</button><button type="button" class="guru-tilda-save-v528" data-guru-tilda-action-v528="save">Сохранить</button></footer>
    </form>`;
    document.body.append(dialog);
  }
  return dialog;
}

function guruTildaAddRowV528(dialog, value = "", savedCode = null) {
  const row = document.createElement("div");
  row.className = "guru-tilda-row-v528";
  if (savedCode !== null) row.dataset.guruTildaSavedCodeV528 = savedCode;
  row.innerHTML = `<button type="button" class="guru-tilda-drag-v529" data-guru-tilda-drag-v529 aria-label="Изменить порядок кода ${escapeAttr(value || "Tilda")}" title="Перетащить · стрелки вверх/вниз"><svg viewBox="0 0 12 18" width="12" height="18" aria-hidden="true" focusable="false"><circle cx="3" cy="3" r="1.25"/><circle cx="9" cy="3" r="1.25"/><circle cx="3" cy="9" r="1.25"/><circle cx="9" cy="9" r="1.25"/><circle cx="3" cy="15" r="1.25"/><circle cx="9" cy="15" r="1.25"/></svg></button><input type="text" data-guru-tilda-code-v528 aria-label="Код блока Tilda" placeholder="Например, ST340" autocomplete="off" spellcheck="false" maxlength="32" value="${escapeAttr(value)}"><button type="button" data-guru-tilda-action-v528="remove" aria-label="Удалить код" title="Удалить код">×</button>`;
  dialog.querySelector("[data-guru-tilda-rows-v528]").append(row);
  return row;
}

function guruTildaOpenV528(button) {
  const dialog = guruTildaDialogV528();
  const key = button.dataset.guruTildaEditV528;
  dialog.dataset.guruTildaKeyV528 = key;
  dialog.dataset.guruTildaProjectV528 = activeProjectId || "";
  dialog.querySelector("[data-guru-tilda-dialog-title-v528]").textContent =
    button.dataset.guruTildaBlockTitleV528 || "Блок сайта";
  dialog.querySelector("[data-guru-tilda-rows-v528]").replaceChildren();
  dialog.querySelector("[data-guru-tilda-error-v528]").hidden = true;
  dialog.querySelector("[data-guru-tilda-order-status-v529]").textContent = "";
  const codes = guruTildaSavedCodesV528(key) || guruTildaDefaultsV528.get(key) || [];
  (codes.length ? codes : [""]).forEach((code) =>
    guruTildaAddRowV528(dialog, code, code || null));
  if (!dialog.open) dialog.showModal();
  dialog.querySelector("[data-guru-tilda-code-v528]")?.focus();
}

function guruTildaPersistCodesV529(dialog, codes) {
  const key = dialog.dataset.guruTildaKeyV528;
  (state.project[GURU_TILDA_STORE_V528] ||= {})[key] = codes;
  gate1ScheduleDurablePersist();
  flashSaving();
  guruTildaDecorateV528();
  window.dispatchEvent(new CustomEvent("guru:tilda-codes-changed", { detail: { key, codes } }));
}

function guruTildaSaveV528(dialog) {
  if (!state?.project || dialog.dataset.guruTildaProjectV528 !== activeProjectId) {
    dialog.close();
    return;
  }
  const raw = [...dialog.querySelectorAll("[data-guru-tilda-code-v528]")]
    .flatMap((input) => input.value.toUpperCase().split(/[\s,;/+]+/))
    .map((code) => code.trim()).filter(Boolean);
  const invalid = raw.find((code) => !/^[A-Z0-9][A-Z0-9_-]{0,31}$/.test(code));
  const error = dialog.querySelector("[data-guru-tilda-error-v528]");
  if (invalid) {
    error.textContent = `Проверьте код «${invalid}»: используйте буквы, цифры и дефис.`;
    error.hidden = false;
    return;
  }
  const codes = [...new Set(raw)];
  guruTildaPersistCodesV529(dialog, codes);
  dialog.close();
}

function guruTildaPersistOrderV529(dialog) {
  if (!state?.project || dialog.dataset.guruTildaProjectV528 !== activeProjectId) return;
  const key = dialog.dataset.guruTildaKeyV528;
  const previous = guruTildaSavedCodesV528(key) || guruTildaDefaultsV528.get(key) || [];
  const rows = [...dialog.querySelectorAll(".guru-tilda-row-v528")];
  // Keep draft additions, edits, and deletions pending until the user saves the form.
  const visible = rows.map((row) => row.dataset.guruTildaSavedCodeV528)
    .filter((code) => code && previous.includes(code));
  if (visible.length < 2) return;
  const visibleSet = new Set(visible);
  let index = 0;
  const codes = previous.map((code) => visibleSet.has(code) ? visible[index++] : code);
  if (codes.every((code, position) => code === previous[position])) return;
  guruTildaPersistCodesV529(dialog, codes);
  dialog.querySelector("[data-guru-tilda-order-status-v529]").textContent = "Порядок сохранён";
}

let guruTildaDragV529 = null;

document.addEventListener("pointerdown", (event) => {
  const handle = event.target?.closest?.("[data-guru-tilda-drag-v529]");
  const dialog = handle?.closest?.("#guru-tilda-dialog-v528");
  const row = handle?.closest?.(".guru-tilda-row-v528");
  if (!dialog?.open || !row || (event.pointerType === "mouse" && event.button !== 0)) return;
  if (row.parentElement.children.length < 2) return;
  event.preventDefault();
  handle.focus({ preventScroll: true });
  handle.setPointerCapture(event.pointerId);
  guruTildaDragV529 = {
    pointerId: event.pointerId, handle, row, dialog,
    rows: [...row.parentElement.children], moved: false,
  };
  row.classList.add("is-dragging-v529");
});

document.addEventListener("pointermove", (event) => {
  const drag = guruTildaDragV529;
  if (!drag || event.pointerId !== drag.pointerId) return;
  event.preventDefault();
  const target = document.elementFromPoint(event.clientX, event.clientY)
    ?.closest?.(".guru-tilda-row-v528");
  if (!target || target === drag.row || target.parentElement !== drag.row.parentElement) return;
  const before = event.clientY < target.getBoundingClientRect().top + target.offsetHeight / 2;
  const sibling = before ? target : target.nextSibling;
  if (sibling !== drag.row) {
    drag.row.parentElement.insertBefore(drag.row, sibling);
    drag.moved = true;
  }
});

function guruTildaEndDragV529(event, cancelled = false) {
  const drag = guruTildaDragV529;
  if (!drag || event.pointerId !== drag.pointerId) return;
  drag.row.classList.remove("is-dragging-v529");
  if (drag.handle.hasPointerCapture(event.pointerId))
    drag.handle.releasePointerCapture(event.pointerId);
  guruTildaDragV529 = null;
  if (cancelled) drag.rows.forEach((row) => drag.dialog.querySelector("[data-guru-tilda-rows-v528]").append(row));
  else if (drag.moved) guruTildaPersistOrderV529(drag.dialog);
}

document.addEventListener("pointerup", (event) => guruTildaEndDragV529(event));
document.addEventListener("pointercancel", (event) => guruTildaEndDragV529(event, true));

document.addEventListener("keydown", (event) => {
  const handle = event.target?.closest?.("[data-guru-tilda-drag-v529]");
  const dialog = handle?.closest?.("#guru-tilda-dialog-v528");
  const row = handle?.closest?.(".guru-tilda-row-v528");
  if (!dialog?.open || !row || !["ArrowUp", "ArrowDown"].includes(event.key)) return;
  const sibling = event.key === "ArrowUp" ? row.previousElementSibling : row.nextElementSibling;
  if (!sibling) return;
  event.preventDefault();
  if (event.key === "ArrowUp") sibling.before(row);
  else sibling.after(row);
  guruTildaPersistOrderV529(dialog);
});

document.addEventListener("click", (event) => {
  const button = event.target?.closest?.("[data-guru-tilda-edit-v528]");
  if (!button) return;
  event.preventDefault();
  event.stopPropagation();
  guruTildaOpenV528(button);
}, true);

document.addEventListener("click", (event) => {
  const action = event.target?.closest?.("[data-guru-tilda-action-v528]");
  const dialog = action?.closest?.("#guru-tilda-dialog-v528");
  if (!dialog) return;
  event.preventDefault();
  const kind = action.dataset.guruTildaActionV528;
  if (kind === "cancel") dialog.close();
  else if (kind === "add") guruTildaAddRowV528(dialog).querySelector("input")?.focus();
  else if (kind === "remove") {
    action.closest(".guru-tilda-row-v528")?.remove();
    if (!dialog.querySelector("[data-guru-tilda-code-v528]")) guruTildaAddRowV528(dialog);
  } else if (kind === "save") guruTildaSaveV528(dialog);
});

document.addEventListener("submit", (event) => {
  if (!event.target?.matches?.("#guru-tilda-dialog-v528 form")) return;
  event.preventDefault();
  guruTildaSaveV528(event.target.closest("dialog"));
});
