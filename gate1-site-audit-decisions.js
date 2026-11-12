/* Gate 1 company site audit: an explicit decision for each existing card.
   The decision lives beside the card's source data and never clears its fields. */
const G1_SITE_AUDIT_DECISION_IDS_V631 = new Set([
  "card-21", "card-22-hub", "card-22", "card-23", "card-24",
  "card-25", "card-26", "card-27", "card-28", "card-29",
  "card-30", "card-31", "card-32", "card-site-header-v497",
  "card-site-footer-v497", "card-35", "card-36", "card-37",
]);

function g1SiteAuditDecisionCardV631(card) {
  return G1_SITE_AUDIT_DECISION_IDS_V631.has(card?.id) && !card?._merged;
}

function g1SiteAuditDecisionV631(card) {
  const value = card?.siteAuditDecisionV631;
  return value === "implemented" || value === "excluded" ? value : "";
}

const g1SiteAuditPreviousRecalculateV631 = recalculateStatusForCard;
recalculateStatusForCard = function (card, workspace = state) {
  const result = g1SiteAuditPreviousRecalculateV631.apply(this, arguments);
  if (!g1SiteAuditDecisionCardV631(card)) return result;
  const decision = g1SiteAuditDecisionV631(card);
  if (decision === "implemented") card.status = "ready";
  else if (decision === "excluded") card.status = "not_required";
  return result;
};

const g1SiteAuditPreviousFieldsV631 = cardUserFieldsHtml;
cardUserFieldsHtml = function (card) {
  const html = g1SiteAuditPreviousFieldsV631.apply(this, arguments);
  if (!g1SiteAuditDecisionCardV631(card)) return html;
  const decision = g1SiteAuditDecisionV631(card);
  return `${html}<div class="g1-site-audit-decisions-v631" data-g1-site-audit-decisions-v631="${escapeAttr(card.id)}" role="group" aria-label="Решение по блоку ${escapeAttr(card.title || "")}">
    <label><input type="checkbox" data-g1-site-audit-decision-v631="implemented" ${decision === "implemented" ? "checked" : ""}><span>Реализовано</span></label>
    <label><input type="checkbox" data-g1-site-audit-decision-v631="excluded" ${decision === "excluded" ? "checked" : ""}><span>Не учитывать</span></label>
  </div>`;
};

const g1SiteAuditPreviousStatusLabelV631 = g1CardStatusLabel;
g1CardStatusLabel = function (card) {
  if (g1SiteAuditDecisionCardV631(card) &&
      g1SiteAuditDecisionV631(card) === "excluded") return "Не учитывается";
  return g1SiteAuditPreviousStatusLabelV631.apply(this, arguments);
};

function g1SiteAuditDecisionGroupV631(cards) {
  const excluded = cards.filter((card) => card.status === "not_required").length;
  const included = cards.length - excluded;
  const ready = cards.filter((card) => card.status === "ready").length;
  const touched = cards.some((card) => card.status && card.status !== "not_started");
  return {
    progress: `${ready} из ${included} блоков готово${excluded ? ` · ${excluded} не учитывается` : ""}`,
    status: !included ? "not_required" : ready === included ? "ready" :
      touched ? "in_progress" : "not_started",
  };
}

const g1SiteAuditPreviousSectionStatusV631 = getSectionStatus;
getSectionStatus = function (cards) {
  if (cards?.length && cards.every(g1SiteAuditDecisionCardV631))
    return g1SiteAuditDecisionGroupV631(cards).status;
  return g1SiteAuditPreviousSectionStatusV631.apply(this, arguments);
};

const g1SiteAuditPreviousSectionProgressV631 = getSectionProgressText;
getSectionProgressText = function (cards) {
  if (cards?.length && cards.every(g1SiteAuditDecisionCardV631))
    return g1SiteAuditDecisionGroupV631(cards).progress;
  return g1SiteAuditPreviousSectionProgressV631.apply(this, arguments);
};

function g1SiteAuditRefreshGroupV631(article) {
  const group = article?.closest?.('[data-g1-company-block-v299="site-structure-audit"], [data-g1-company-block-v299="legal-audit"]');
  if (!group) return;
  const cards = [...group.querySelectorAll(":scope > .g1-section-body > .g1-card[data-card]")]
    .map((node) => state?.gates?.find((gate) => gate.id === "gate-1")?.cards
      ?.find((card) => card.id === node.dataset.card))
    .filter(Boolean);
  const summary = g1SiteAuditDecisionGroupV631(cards);
  const header = group.querySelector(":scope > .g1-section-header");
  const badge = header?.querySelector(".status-pill");
  const progress = header?.querySelector(".g1-section-progress");
  if (badge) {
    badge.className = `status-pill status-${summary.status}`;
    badge.textContent = STATUS_LABELS[summary.status] || summary.status;
  }
  if (progress) progress.textContent = summary.progress;
}

document.addEventListener("change", (event) => {
  const input = event.target?.closest?.("[data-g1-site-audit-decision-v631]");
  if (!input || activeGateId !== "gate-1") return;
  const choice = input.dataset.g1SiteAuditDecisionV631;
  const controls = input.closest("[data-g1-site-audit-decisions-v631]");
  const cardId = controls?.dataset.g1SiteAuditDecisionsV631;
  const card = state?.gates?.find((gate) => gate.id === "gate-1")?.cards
    ?.find((item) => item.id === cardId);
  if (!g1SiteAuditDecisionCardV631(card) ||
      !["implemented", "excluded"].includes(choice)) return;
  if (input.checked) card.siteAuditDecisionV631 = choice;
  else delete card.siteAuditDecisionV631;
  const decision = g1SiteAuditDecisionV631(card);
  controls.querySelectorAll("[data-g1-site-audit-decision-v631]").forEach((item) => {
    item.checked = item.dataset.g1SiteAuditDecisionV631 === decision;
  });
  recalculateStatusForCard(card, state);
  const article = controls.closest(".g1-card[data-card]");
  if (article) g1PointUpdateBadge(card, { nav: false });
  g1SiteAuditRefreshGroupV631(article);
  flashSaving({ skipProductSelectorRefresh: true });
}, true);
