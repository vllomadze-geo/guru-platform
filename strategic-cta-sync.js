/* CTA choices are a read-only view of the offer records shown in the two
   strategic foundations. Picking one uses the destination's existing input
   handler; no offer record is copied or changed here. */
function guruStrategicCtaChoicesV1(level, productId = "", workspace = state, { dedupe = true } = {}) {
  const project = workspace?.project || {};
  const rows = Array.isArray(project.gate0ScopedValuesV194)
    ? project.gate0ScopedValuesV194 : [];
  const projectId = String(project.id || project.projectId || "");
  const live = rows.filter((row) => row && !row.archived_at &&
    (!row.project_id || !projectId || String(row.project_id) === projectId));
  let offers = [];
  let scope = "project";
  if (level === "company") {
    offers = live.filter((row) => row.scope === "project" && row.field === "company_offer");
  } else if (level === "product") {
    const product = (project.catalogItemsV189 || []).find((item) => String(item.id) === String(productId));
    if (!product) return [];
    // A product's CTA picker must never inherit category or company offers.
    offers = live.filter((row) => row.field === "offers" && row.scope === "product" &&
      String(row.product_id) === String(product.id));
    scope = "product";
  } else return [];
  const labels = { primary: "Основной", secondary: "Вторичный", alternative: "Альтернативный" };
  const seen = new Set();
  return offers.flatMap((record) => {
    const parts = guruV194OfferParts(record).ctaV2;
    return ["primary", "secondary", "alternative"].flatMap((role) => {
      const approved = level === "company" && typeof guruCompanyCtaStoredVersionsV1 === "function"
        ? guruCompanyCtaStoredVersionsV1(record, role)?.at(-1)?.value : null;
      // A company CTA being edited in Gate 0 is not approved until blur or
      // explicit approval records its version. Legacy records have no history.
      const value = String(approved ?? parts[role] ?? "").trim();
      const normalized = value.replace(/\s+/g, " ").toLocaleLowerCase("ru-RU");
      if (!normalized || (dedupe && seen.has(normalized))) return [];
      seen.add(normalized);
      return [{ id: `${record.id}::${role}`, role, label: labels[role], value,
        recordId: record.id, scope }];
    });
  });
}

// Editors expose their existing field identity. This single adapter covers
// current and future page CTA fields without maintaining a page-by-page list.
const GURU_STRATEGIC_CTA_INPUT_SELECTOR_V1 = [
  'input[data-page-context-key]', 'textarea[data-page-context-key]',
  'textarea[data-gate1-page-field="finalCta"]',
  'input[data-gate1-page-field="finalCta"]',
  'input[data-goat-hero-cta-v515]',
  'input[data-guru-hub-showcase-field="buttonText"]',
  'input[data-guru-home-category-field-v541="buttonText"]',
  'input[data-guru-category-card-field-v516="orderLabel"]',
  'input[data-guru-category-card-field-v516="detailsLabel"]',
  'input[data-g4-product-smm-base-field-v529="cta"]',
  'input[data-g4-product-smm-override-field-v529="cta"]',
  'textarea[data-g4-smm-brief-field-v325="cta"]',
  'input[data-g4-paid-field-v1="targetAction"]',
  'select[data-g4-paid-field-v1="ctaRef"]',
  'select[data-g4-paid-card-field-v1="primaryCTARef"]',
].join(',');
let guruStrategicCtaPickerV1 = null;

function guruStrategicCtaIsPageKeyV1(key) {
  if (!key || !/(?:cta|button)/i.test(key)) return false;
  return !/(?:target|url|link|mode|status|present|implemented|flag|note|check|enabled|needed)/i.test(key);
}

function guruStrategicCtaTargetV1(input) {
  if (!input?.matches?.(GURU_STRATEGIC_CTA_INPUT_SELECTOR_V1) ||
      input.disabled || input.readOnly) return null;
  const smmField = input.dataset.g4ProductSmmBaseFieldV529 ||
    input.dataset.g4ProductSmmOverrideFieldV529 || input.dataset.g4SmmBriefFieldV325;
  if (input.dataset.g4PaidFieldV1 === "targetAction" ||
      input.dataset.g4PaidFieldV1 === "ctaRef" ||
      input.dataset.g4PaidCardFieldV1 === "primaryCTARef") {
    const productId = input.closest("[data-g4-paid-smm-v1]")?.dataset.g4PaidSmmV1;
    return productId && state.project?.catalogItemsV189?.some((item) =>
      String(item.id) === String(productId))
      ? { level: "product", productId } : null;
  }
  if (smmField === "cta") {
    const productId = input.closest("[data-g4-product-smm-product-id-v523]")
      ?.dataset.g4ProductSmmProductIdV523;
    return productId && state.project?.catalogItemsV189?.some((item) =>
      String(item.id) === String(productId))
      ? { level: "product", productId } : null;
  }
  if (input.matches('[data-guru-hub-showcase-field="buttonText"], [data-guru-home-category-field-v541="buttonText"]'))
    return { level: "company", productId: "" };
  if (input.matches('[data-guru-category-card-field-v516="orderLabel"], [data-guru-category-card-field-v516="detailsLabel"]')) {
    const productId = input.dataset.guruCategoryCardProductV516;
    return productId && state.project?.catalogItemsV189?.some((item) =>
      String(item.id) === String(productId))
      ? { level: "product", productId } : null;
  }
  const key = input.dataset.pageContextKey;
  if (key && !guruStrategicCtaIsPageKeyV1(key)) return null;
  if (!key && !input.matches('[data-goat-hero-cta-v515], [data-gate1-page-field="finalCta"]')) return null;
  const cardId = input.dataset.pageContextCardId || input.dataset.gate1PageCardId ||
    input.dataset.goatProductCardIdV514;
  const index = Number(input.dataset.pageContextIndex ?? input.dataset.gate1PageIndex ??
    input.dataset.goatProductPageIndexV514);
  if (!cardId || !Number.isInteger(index) || index < 0) return null;
  const row = state?.gates?.find((gate) => gate.id === "gate-1")?.cards
    ?.find((card) => card.id === cardId)?.pageRows?.[index];
  if (!row) return null;
  if (["card-23", "card-24"].includes(cardId)) {
    return row.catalogItemIdV189
      ? { level: "product", productId: row.catalogItemIdV189 } : null;
  }
  return { level: "company", productId: "" };
}

function guruStrategicCtaCloseV1(restoreFocus = false) {
  const picker = guruStrategicCtaPickerV1;
  if (!picker) return;
  guruStrategicCtaPickerV1 = null;
  picker.button?.setAttribute("aria-expanded", "false");
  picker.input.setAttribute("aria-expanded", "false");
  picker.panel.remove();
  if (restoreFocus && picker.input.isConnected) picker.input.focus({ preventScroll: true });
}

function guruStrategicCtaPositionV1() {
  const picker = guruStrategicCtaPickerV1;
  if (!picker || !picker.input.isConnected) return;
  const anchor = picker.input.getBoundingClientRect();
  const panel = picker.panel;
  panel.style.left = `${Math.max(8, Math.min(anchor.left, innerWidth - panel.offsetWidth - 8))}px`;
  const below = innerHeight - anchor.bottom - 8;
  const top = below < panel.offsetHeight && anchor.top > below
    ? anchor.top - panel.offsetHeight - 6 : anchor.bottom + 6;
  panel.style.top = `${Math.max(8, Math.min(top, innerHeight - panel.offsetHeight - 8))}px`;
}

function guruStrategicCtaRefreshReferenceOptionsV1(input, choices) {
  const selected = input.value;
  const previous = input.selectedOptions[0];
  const placeholder = input.options[0];
  const options = [new Option(placeholder?.textContent || "Выбрать CTA", "")];
  if (selected && !choices.some((choice) => choice.id === selected))
    options.push(new Option(previous?.textContent || "Ранее выбранный CTA", selected));
  choices.forEach((choice) => options.push(new Option(`${choice.label} · ${choice.value}`, choice.id)));
  input.replaceChildren(...options);
  input.value = selected;
}

function guruStrategicCtaOpenV1(input) {
  const target = guruStrategicCtaTargetV1(input);
  guruStrategicCtaCloseV1();
  if (!target) return;
  const button = input.nextElementSibling?.matches("[data-strategic-cta-trigger-v1]")
    ? input.nextElementSibling : null;
  const isReference = input.tagName === "SELECT";
  const choices = guruStrategicCtaChoicesV1(target.level, target.productId,
    state, { dedupe: !isReference });
  if (isReference) guruStrategicCtaRefreshReferenceOptionsV1(input, choices);
  const panel = document.createElement("div");
  panel.className = "strategic-cta-picker-v1";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "CTA из стратегической основы");
  panel.innerHTML = `<strong>Стратегическая основа · ${target.level === "company" ? "Компания" : "Продукт/Услуга"}</strong>${choices.length
    ? choices.map((choice, index) => `<button type="button" data-strategic-cta-choice-v1="${index}" ${input.value === (isReference ? choice.id : choice.value) ? "disabled" : ""}><small>${escapeHtml(choice.label)}</small><span>${escapeHtml(choice.value)}</span></button>`).join("")
    : '<p>CTA пока не зафиксированы в стратегической основе.</p>'}`;
  document.body.appendChild(panel);
  guruStrategicCtaPickerV1 = { button, input, panel, choices, target, projectId: state.project?.id };
  button?.setAttribute("aria-expanded", "true");
  input.setAttribute("aria-expanded", "true");
  guruStrategicCtaPositionV1();
}

function guruStrategicCtaEnhanceV1(root = document) {
  const inputs = root.matches?.(GURU_STRATEGIC_CTA_INPUT_SELECTOR_V1)
    ? [root] : root.querySelectorAll(GURU_STRATEGIC_CTA_INPUT_SELECTOR_V1);
  inputs.forEach((input) => {
    if (input.dataset.strategicCtaInputV1 !== undefined ||
        !guruStrategicCtaTargetV1(input)) return;
    input.dataset.strategicCtaInputV1 = "";
    input.setAttribute("aria-haspopup", "dialog");
    input.setAttribute("aria-expanded", "false");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "strategic-cta-trigger-v1";
    button.dataset.strategicCtaTriggerV1 = "";
    button.setAttribute("aria-label", "Выбрать CTA из стратегической основы");
    button.setAttribute("aria-haspopup", "dialog");
    button.setAttribute("aria-expanded", "false");
    button.title = "Выбрать CTA из стратегической основы";
    button.textContent = "⌄";
    input.insertAdjacentElement("afterend", button);
    input.parentElement?.classList.add("strategic-cta-field-v1");
  });
}

const guruStrategicCtaRenderGateV1 = renderGate;
renderGate = function () {
  const result = guruStrategicCtaRenderGateV1.apply(this, arguments);
  guruStrategicCtaCloseV1();
  if (activeGateId === "gate-1" || activeGateId === "gate-4")
    guruStrategicCtaEnhanceV1(els.contentArea);
  return result;
};

document.addEventListener("focusin", (event) => {
  const input = event.target;
  if (input?.matches?.(GURU_STRATEGIC_CTA_INPUT_SELECTOR_V1) &&
      input.dataset.strategicCtaInputV1 === undefined) {
    guruStrategicCtaEnhanceV1(input);
  }
});
document.addEventListener("pointerdown", (event) => {
  if (event.target?.matches?.('select[data-g4-paid-field-v1="ctaRef"], select[data-g4-paid-card-field-v1="primaryCTARef"]') &&
      guruStrategicCtaTargetV1(event.target)) event.preventDefault();
});
document.addEventListener("click", (event) => {
  const trigger = event.target.closest?.("[data-strategic-cta-trigger-v1]");
  if (trigger) {
    event.preventDefault();
    if (guruStrategicCtaPickerV1?.button === trigger) guruStrategicCtaCloseV1(true);
    else {
      const input = trigger.previousElementSibling?.matches("[data-strategic-cta-input-v1]")
        ? trigger.previousElementSibling : null;
      if (input) guruStrategicCtaOpenV1(input);
    }
    return;
  }
  const choiceButton = event.target.closest?.("[data-strategic-cta-choice-v1]");
  if (choiceButton && guruStrategicCtaPickerV1) {
    const { input, choices, target, projectId } = guruStrategicCtaPickerV1;
    const choice = choices[Number(choiceButton.dataset.strategicCtaChoiceV1)];
    guruStrategicCtaCloseV1();
    if (!choice || !input.isConnected || projectId !== state.project?.id) return;
    if (!guruStrategicCtaChoicesV1(target.level, target.productId, state, { dedupe: input.tagName !== "SELECT" })
      .some((current) => current.id === choice.id && current.value === choice.value)) return;
    input.dispatchEvent(new CustomEvent("guru-strategic-cta-select", {
      bubbles: true, detail: { choice, input },
    }));
    input.value = input.tagName === "SELECT" ? choice.id : choice.value;
    if (input.tagName !== "SELECT") input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    input.focus({ preventScroll: true });
    return;
  }
  const input = event.target;
  if (input?.matches?.(GURU_STRATEGIC_CTA_INPUT_SELECTOR_V1) &&
      guruStrategicCtaTargetV1(input)) {
    if (input.tagName === "SELECT") event.preventDefault();
    guruStrategicCtaEnhanceV1(input);
    if (guruStrategicCtaPickerV1?.input !== input) guruStrategicCtaOpenV1(input);
    return;
  }
  if (guruStrategicCtaPickerV1 && !guruStrategicCtaPickerV1.panel.contains(event.target))
    guruStrategicCtaCloseV1();
});
document.addEventListener("input", (event) => {
  if (guruStrategicCtaPickerV1?.input === event.target) guruStrategicCtaCloseV1();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && guruStrategicCtaPickerV1) {
    event.preventDefault();
    guruStrategicCtaCloseV1(true);
  }
  if ((event.key === "ArrowDown" || event.target?.tagName === "SELECT" &&
       (event.key === "Enter" || event.key === " ")) &&
      event.target?.matches?.(GURU_STRATEGIC_CTA_INPUT_SELECTOR_V1) &&
      guruStrategicCtaTargetV1(event.target)) {
    event.preventDefault();
    guruStrategicCtaEnhanceV1(event.target);
    guruStrategicCtaOpenV1(event.target);
    guruStrategicCtaPickerV1?.panel.querySelector("button:not(:disabled)")?.focus({ preventScroll: true });
  }
});
window.addEventListener("resize", guruStrategicCtaPositionV1);
document.addEventListener("scroll", guruStrategicCtaPositionV1, true);
