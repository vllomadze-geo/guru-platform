/* The two company Metrika wizard units use the same Gate 2 step template as services.
   Storage, event handlers and readiness remain in gate2-setup-wizard.js. */
const g2UnifiedPreviousWizardCardHtml = g2wCardHtml;
g2wCardHtml = function (def, productId = "", knownStatus = "") {
  if (def?.scope === "company" && ["counter", "goal"].includes(def.id))
    return g2UnifiedWizardCardHtml(def, productId, knownStatus);
  return g2UnifiedPreviousWizardCardHtml.apply(this, arguments);
};

const g2UnifiedPreviousWizardRefresh = g2wRefresh;
g2wRefresh = function (options = {}) {
  const result = g2UnifiedPreviousWizardRefresh.apply(this, arguments);
  if (activeGateId !== "gate-2") return result;
  for (const card of document.querySelectorAll(".g2w-workspace .g2u-wizard")) {
    const original = g2wDef(card.dataset.g2wCardView);
    const def = typeof g2StepWizardDef === "function" ? g2StepWizardDef(original, card.dataset.g2wProductId || "") : original;
    if (!def) continue;
    const productId = card.dataset.g2wProductId || "";
    const status = g2wStatus(def, productId);
    const record = g2wRecord(def, productId);
    const done = def.steps.filter(([id]) => record?.steps?.[id]?.result === "done").length;
    const badge = card.querySelector(":scope > summary .status-pill");
    if (badge) {
      badge.className = `g2sb-status status-pill status-${status}`;
      badge.dataset.status = status;
      badge.textContent = g2wStatusLabel(status);
    }
    const meter = card.querySelector(":scope > summary .g2u-progress");
    if (meter) meter.value = done;
    for (const row of card.querySelectorAll(".g2u-step")) {
      const checked = row.querySelector("[data-g2w-step]")?.checked || false;
      row.dataset.g2uStepState = checked ? "ready" : "pending";
      row.classList.toggle("is-done", checked);
    }
    for (const guide of card.querySelectorAll(".g2u-guide"))
      guide.hidden = ![...guide.querySelectorAll("a")].some((link) => !link.hidden);
    if (options.changedCardId === def.id) {
      const current = def.steps.find(([id]) => record?.steps?.[id]?.result !== "done")?.[0];
      for (const guide of card.querySelectorAll(".g2u-guide"))
        guide.open = guide.closest("[data-g2sb-step-id]")?.dataset.g2sbStepId === current;
    }
  }
  return result;
};
