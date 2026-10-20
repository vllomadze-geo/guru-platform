/* Gate 0 marketing overview: one registry for the blocks behind its rows.
   The overview retains the saved statuses and legacy comments; navigation
   never creates a second editable copy of those values. */
const G0_MARKETING_INFRA_SOURCES = Object.freeze({
  "Яндекс Метрика": { gate: "gate-2", card: "g2-metrika-company-counter", label: "Яндекс Метрика · счётчик проекта" },
  "Google Analytics 4": { gate: "gate-2", card: "g2-marketing-ga4", label: "Google Analytics 4" },
  CRM: { gate: "gate-2", card: "card-122", label: "CRM · карточка лида" },
  "UTM-разметка": { gate: "gate-2", card: "card-105", label: "UTM-разметка" },
  "Коллтрекинг": { gate: "gate-2", card: "card-129", label: "Коллтрекинг" },
  "Уведомления о заявках": { gate: "gate-2", card: "card-127", label: "Email-уведомления" },
  "Google Search Console": { gate: "gate-2", card: "g2-marketing-gsc", label: "Google Search Console" },
  "Яндекс Директ": { gate: "gate-2", card: "g2-marketing-yandex-direct", label: "Яндекс Директ · рекламный кабинет" },
  "Google Ads": { gate: "gate-2", card: "g2-marketing-google-ads", label: "Google Ads · рекламный кабинет" },
  "VK Ads": { gate: "gate-2", card: "g2-marketing-vk-ads", label: "VK Ads · рекламный кабинет" },
  "Meta Ads": { gate: "gate-2", card: "g2-marketing-meta-ads", label: "Meta Ads · рекламный кабинет" },
  "Telegram Ads": { gate: "gate-2", card: "g2-marketing-telegram-ads", label: "Telegram Ads · рекламный кабинет" },
});

const G0_MARKETING_CHANNEL_SOURCES = Object.freeze({
  "Яндекс Директ|Поиск": { tool: "yandex_search", label: "Яндекс Директ · Поиск" },
  "Яндекс Директ|РСЯ": { tool: "rsya", label: "Яндекс Директ · РСЯ" },
  "Яндекс Директ|Мастер кампаний": { tool: "master_campaign", label: "Яндекс Директ · Мастер кампаний" },
  "Google Ads|Search": { tool: "google_search", label: "Google Ads · Search" },
  "Google Ads|Display": { tool: "display", label: "Google Ads · Display" },
  "VK Ads|Таргет": { tool: "vk_target", label: "VK Реклама · Таргет" },
  "Meta Ads|Feed / Reels": { tool: "meta", label: "Meta Ads · Feed / Reels" },
  "Telegram Ads|Посевы / Ads": { tool: "telegram_ads", label: "Telegram Ads" },
  "SEO|Страницы сайта": { tool: "seo", label: "SEO · страницы сайта" },
  "Яндекс Карты|Карточка организации": { tool: "yandex_organization", scope: "company", label: "Яндекс Карты · карточка организации" },
  "Google Business Profile|Карточка организации": { tool: "google_organization", scope: "company", label: "Google Business Profile · карточка организации" },
  "VK|Контент": { tool: "vk_content", label: "Контент · VK" },
  "Telegram|Контент / посевы": { tool: "telegram_content", label: "Контент · Telegram" },
  "Instagram|Reels / Stories": { tool: "instagram", label: "Контент · Instagram" },
  "YouTube|Shorts / Pre-roll": { tool: "youtube", label: "Видео · YouTube" },
});

// These company checks have no existing Gate 2 block. Their status is read
// directly from Gate 0, so adding a destination cannot make the two Gates drift.
const G0_MARKETING_GATE2_CHECKS = Object.freeze([
  { id: "g2-marketing-ga4", title: "Google Analytics 4", section: "analytics", infra: "Google Analytics 4" },
  { id: "g2-marketing-gsc", title: "Google Search Console", section: "search", infra: "Google Search Console" },
  { id: "g2-marketing-yandex-direct", title: "Яндекс Директ · рекламный кабинет", section: "ad_accounts", infra: "Яндекс Директ" },
  { id: "g2-marketing-google-ads", title: "Google Ads · рекламный кабинет", section: "ad_accounts", infra: "Google Ads" },
  { id: "g2-marketing-vk-ads", title: "VK Ads · рекламный кабинет", section: "ad_accounts", infra: "VK Ads" },
  { id: "g2-marketing-meta-ads", title: "Meta Ads · рекламный кабинет", section: "ad_accounts", infra: "Meta Ads" },
  { id: "g2-marketing-telegram-ads", title: "Telegram Ads · рекламный кабинет", section: "ad_accounts", infra: "Telegram Ads" },
]);
const G0_MARKETING_GATE2_BY_ID = new Map(G0_MARKETING_GATE2_CHECKS.map((row) => [row.id, row]));
G2_SECTIONS.splice(G2_SECTIONS.findIndex((row) => row.key === "crm"), 0,
  { key: "ad_accounts", title: "Рекламные кабинеты", match: /^(?:яндекс директ|google ads|vk ads|meta ads|telegram ads).*рекламный кабинет/i });
G2_NEW_CARDS.push(...G0_MARKETING_GATE2_CHECKS.map((row) => ({
  id: row.id, title: row.title,
  instruction: `Состояние ${row.infra} берётся из Gate 0 → Инфраструктура.`,
  status: "not_started", evidence: "", pages: "", notes: "", fields: {},
})));

const g0MarketingPreviousRenderGate = renderGate;
renderGate = function () {
  if (activeGateId === "gate-2")
    ensureGate2Structure(state?.gates?.find((gate) => gate.id === "gate-2"));
  return g0MarketingPreviousRenderGate.apply(this, arguments);
};

const g0MarketingPreviousG2Section = g2SectionKeyForCardV271;
g2SectionKeyForCardV271 = function (card) {
  return G0_MARKETING_GATE2_BY_ID.get(card?.id)?.section || g0MarketingPreviousG2Section(card);
};
const g0MarketingPreviousG2Scope = g2CardScopeV267;
g2CardScopeV267 = function (card, workspace = state) {
  const check = G0_MARKETING_GATE2_BY_ID.get(card?.id);
  return check
    ? { scope: "company", sectionKey: check.section, sourceCardId: "card-7", reason: "gate0_infrastructure" }
    : g0MarketingPreviousG2Scope(card, workspace);
};

function g0MarketingInfraRow(name, workspace = state) {
  const card = workspace?.gates?.find((gate) => gate.id === "gate-0")?.cards?.find(isMegaMarketingCard);
  const row = card?.megaMarketing?.infra?.find((item) => item.name === name);
  return { card, row };
}

function g0MarketingDerivedStatus(card, workspace = state) {
  const check = G0_MARKETING_GATE2_BY_ID.get(card?.id);
  if (!check) return null;
  const value = guruCanonStatus(g0MarketingInfraRow(check.infra, workspace).row?.status);
  if (value === "works") return "ready";
  if (value === "not_needed") return "not_needed";
  if (value === "needs_improvement") return "in_progress";
  if (value === "broken" || value === "missing") return "problem";
  return "not_started";
}

const g0MarketingPreviousG2Status = g2CardStatus;
g2CardStatus = function (card) {
  return g0MarketingDerivedStatus(card) || g0MarketingPreviousG2Status(card);
};
const g0MarketingPreviousRecalculate = recalculateStatusForCard;
recalculateStatusForCard = function (card, workspace = state) {
  const derived = g0MarketingDerivedStatus(card, workspace);
  if (derived) { card.status = derived; return; }
  return g0MarketingPreviousRecalculate.apply(this, arguments);
};

const g0MarketingPreviousG2Source = g2ResolvedSourceV267;
g2ResolvedSourceV267 = function (card) {
  const check = G0_MARKETING_GATE2_BY_ID.get(card?.id);
  if (!check) return g0MarketingPreviousG2Source(card);
  const { card: sourceCard, row } = g0MarketingInfraRow(check.infra);
  return sourceCard && row ? {
    key: "I", gateId: "gate-0", cardId: sourceCard.id, itemId: check.infra,
    title: check.infra, path: `Gate 0 · Инфраструктура · ${check.infra}`,
    result: g0MarketingDerivedStatus(card), found: true,
  } : null;
};

function g0MarketingSourceButton(target) {
  if (!target) return '<span class="mega-system-empty-v1" title="Связанный блок не указан">—</span>';
  const gateNumber = target.gate === "gate-2" ? "2" : "4";
  const encoded = escapeAttr(JSON.stringify(target));
  const title = target.requiresProduct
    ? `Открыть: Gate 4 · Добавить продукт для «${target.label}»`
    : `Открыть: Gate ${gateNumber} · ${target.label}`;
  return `<button type="button" class="mega-system-source-v1" title="${escapeAttr(title)}" aria-label="${escapeAttr(title)}" data-g0-marketing-source="${encoded}">Gate ${gateNumber} ↗</button>`;
}

const G0_MARKETING_INFRA_PRESENTATION_V1 = Object.freeze({
  "Яндекс Метрика": ["Яндекс", "Аналитика"],
  "Google Analytics 4": ["Google", "Аналитика"],
  CRM: ["", "Работа с лидами"],
  "UTM-разметка": ["", "Атрибуция"],
  "Коллтрекинг": ["", "Аналитика звонков"],
  "Уведомления о заявках": ["Email / Telegram", "Уведомления о лидах"],
  "Яндекс Вебмастер": ["Яндекс", "SEO"],
  "Google Search Console": ["Google", "SEO"],
  "Яндекс Директ": ["Яндекс", "Рекламный кабинет"],
  "Google Ads": ["Google", "Рекламный кабинет"],
  "VK Ads": ["VK", "Рекламный кабинет"],
  "Meta Ads": ["Meta", "Рекламный кабинет"],
  "Telegram Ads": ["Telegram", "Рекламный кабинет"],
});

function g0MarketingInfraPresentationV1(item) {
  const [platform, role] = Object.hasOwn(G0_MARKETING_INFRA_PRESENTATION_V1, item.name)
    ? G0_MARKETING_INFRA_PRESENTATION_V1[item.name] : ["", item.group || ""];
  // The legacy CRM comment sometimes contains a short platform name, such as AGBIS.
  const crmPlatform = item.name === "CRM" && /^[\p{L}\p{N} _-]{1,35}$/u.test((item.comment || "").trim())
    ? item.comment.trim() : "";
  return { name: item.name, platform: crmPlatform || platform, role, detail: item.hint || "", note: item.comment || "" };
}

function g0MarketingChannelPresentationV1(item) {
  return { name: item.type || item.platform || item.channel || "", platform: item.platform || "", role: item.channel || "", detail: item.materials || "" };
}

function g0MarketingSourceForRowV1(section, item) {
  if (item._custom) return null;
  if (section === "infra") {
    if (item.name === "Яндекс Вебмастер") return { gate: "gate-1", label: "Яндекс Вебмастер" };
    return Object.hasOwn(G0_MARKETING_INFRA_SOURCES, item.name) ? G0_MARKETING_INFRA_SOURCES[item.name] : null;
  }
  const match = G0_MARKETING_CHANNEL_SOURCES[`${item.platform}|${item.type}`];
  if (!match) return null;
  const productId = match.scope === "company" ? "" : g4ProductPickSelected(state)?.id || g4ProductPickProducts(state)[0]?.id || "";
  return { gate: "gate-4", ...match, productId, requiresProduct: match.scope !== "company" && !productId };
}

function g0MarketingEditableV1(cardId, section, index, field, value, placeholder) {
  return `<input class="mega-system-edit-v1" data-mega-card="${escapeAttr(cardId)}" data-mega-section="${section}" data-mega-idx="${index}" data-mega-field="${field}" value="${escapeAttr(value || "")}" placeholder="${escapeAttr(placeholder)}" aria-label="${escapeAttr(placeholder)}" />`;
}

function g0MarketingStatusV1(cardId, section, index, item) {
  if (section === "infra" && item.name === "Яндекс Вебмастер" && !item._custom) {
    const overall = gate1WebmasterOverallV295(state);
    const status = overall.readiness === "not_started" ? "Не начато" : guruStatusLabel(overall.infraStatus);
    return `<span class="mega-system-status-shell-v1" data-status="${escapeAttr(overall.infraStatus || "unselected")}" title="Автоматически из Gate 1"><span class="mega-system-status-v1">${escapeHtml(status)}</span></span>`;
  }
  const status = guruCanonStatus(item.status);
  return `<span class="mega-system-status-shell-v1" data-status="${escapeAttr(status || "unselected")}"><span class="mega-system-status-v1" aria-hidden="true">${escapeHtml(status ? guruStatusLabel(status) : "Выбрать")}</span><select class="mega-system-status-select-v1" data-mega-card="${escapeAttr(cardId)}" data-mega-section="${section}" data-mega-idx="${index}" data-mega-field="status" aria-label="Статус: ${escapeAttr(item.name || item.type || item.platform || "элемент")}">${guruStatusOptionsHtml(item.status)}</select></span>`;
}

function g0MarketingSystemTableV1({ cardId, section, title, subtitle, rows, addLabel }) {
  let previousGroup = "";
  const body = rows.map((item, index) => {
    const group = section === "infra" ? item.group || "" : item.channel || "";
    const groupRow = group && group !== previousGroup
      ? `<tr class="mega-system-group-v1"><td colspan="5">${escapeHtml(group)}</td></tr>` : "";
    previousGroup = group;
    const view = section === "infra" ? g0MarketingInfraPresentationV1(item) : g0MarketingChannelPresentationV1(item);
    const source = g0MarketingSourceForRowV1(section, item);
    const sourceHtml = source?.gate === "gate-1"
      ? `<button type="button" class="mega-system-source-v1" data-g1-webmaster-open-v295="company" title="Открыть: Gate 1 · Яндекс Вебмастер" aria-label="Открыть: Gate 1 · Яндекс Вебмастер">Gate 1 ↗</button>`
      : g0MarketingSourceButton(source);
    const remove = item._custom ? `<button class="v116-multi-remove mega-system-remove-v1" type="button" data-mega-card="${escapeAttr(cardId)}" data-mega-section="${section}" data-mega-remove="${index}" title="Удалить" aria-label="Удалить ${escapeAttr(view.name || "элемент")}">×</button>` : "";
    const nameHtml = section === "channels" && item._custom
      ? g0MarketingEditableV1(cardId, section, index, "type", item.type, "Название канала")
      : `<span title="${escapeAttr(view.note || "")}">${escapeHtml(view.name || "—")}</span>`;
    const platformHtml = section === "channels" && item._custom
      ? g0MarketingEditableV1(cardId, section, index, "platform", item.platform, "Платформа")
      : escapeHtml(view.platform || "—");
    const roleHtml = section === "channels" && item._custom
      ? g0MarketingEditableV1(cardId, section, index, "channel", item.channel, "Роль / назначение")
      : `<span title="${escapeAttr(view.detail)}">${escapeHtml(view.role || "—")}</span>`;
    return `${groupRow}<tr class="mega-system-data-v1" data-mega-system-row="${section}">
      <td class="mega-system-name-v1">${nameHtml}</td>
      <td>${platformHtml}</td>
      <td>${roleHtml}</td>
      <td>${g0MarketingStatusV1(cardId, section, index, item)}</td>
      <td class="mega-system-source-cell-v1"><div class="mega-system-source-actions-v1">${sourceHtml}${remove}</div></td>
    </tr>`;
  }).join("");
  const working = rows.filter((row) => guruCanonStatus(row.status) === "works").length;
  return `<section class="mega-section mega-system-section-v1" data-mega-system-section="${section}">
    <div class="mega-system-heading-v1"><div><h4 class="mega-section-title">${escapeHtml(title)}</h4><p class="mega-section-hint">${escapeHtml(subtitle)}</p></div><span class="mega-system-summary-v1">${working} из ${rows.length} работают</span></div>
    <div class="mega-system-scroll-v1"><table class="cr-table mega-system-table-v1"><colgroup><col class="mega-system-col-name-v1"><col class="mega-system-col-platform-v1"><col class="mega-system-col-role-v1"><col class="mega-system-col-status-v1"><col class="mega-system-col-source-v1"></colgroup>
      <thead><tr><th scope="col">Элемент</th><th scope="col">Платформа</th><th scope="col">Роль / назначение</th><th scope="col">Статус</th><th scope="col">Источник</th></tr></thead><tbody>${body}</tbody></table></div>
    <button class="v116-multi-add mega-system-add-v1" type="button" data-mega-card="${escapeAttr(cardId)}" data-mega-add="${section}">+ Добавить ${escapeHtml(addLabel)}</button>
  </section>`;
}

megaInfraSectionHtml = (cardId, items) => g0MarketingSystemTableV1({
  cardId, section: "infra", title: "Инфраструктура",
  subtitle: "Подключены ли аналитика, настроены ли цели, есть ли CRM, размечены ли ссылки.",
  rows: items, addLabel: "инструмент",
});
megaChannelsSectionHtml = (cardId, items) => g0MarketingSystemTableV1({
  cardId, section: "channels", title: "Каналы",
  subtitle: "Что сейчас запущено — Яндекс Директ, VK, SEO, SMM, геосервисы.",
  rows: items, addLabel: "канал",
});

document.addEventListener("change", (event) => {
  const select = event.target?.closest?.('.mega-system-status-select-v1[data-mega-field="status"]');
  if (!select) return;
  const shell = select.closest(".mega-system-status-shell-v1");
  const status = guruCanonStatus(select.value);
  shell.dataset.status = status || "unselected";
  shell.querySelector(".mega-system-status-v1").textContent = status ? guruStatusLabel(status) : "Выбрать";
  const section = select.closest(".mega-system-section-v1");
  if (section) {
    const count = [...section.querySelectorAll('.mega-system-status-shell-v1[data-status="works"]')].length;
    const total = section.querySelectorAll(".mega-system-data-v1").length;
    section.querySelector(".mega-system-summary-v1").textContent = `${count} из ${total} работают`;
  }
});

function g0MarketingFindTarget(target) {
  const esc = CSS.escape;
  if (target.gate === "gate-2")
    return document.querySelector(`[data-g2-scope="company"] [data-card="${esc(target.card)}"], [data-g2-scope="product"] [data-card="${esc(target.card)}"]`);
  if (target.requiresProduct)
    return document.querySelector('.guru-gate-scope-v230[data-gate-scope="product"]');
  if (target.scope === "company")
    return document.querySelector(`[data-g4five-company-v523] [data-g4five-tool-v523="${esc(target.tool)}"]`);
  return document.querySelector(`[data-g4five-product-v523="${esc(target.productId)}"] [data-g4five-tool-v523="${esc(target.tool)}"]`);
}

function g0MarketingScrollTarget(node) {
  const tall = node.getBoundingClientRect().height > window.innerHeight - 144;
  node.scrollIntoView({ behavior: "instant", block: tall ? "start" : "center" });
}

let g0MarketingNavigationTicket = 0;
function g0MarketingFocusTarget(target, ticket, attempt = 0) {
  if (ticket !== g0MarketingNavigationTicket || activeGateId !== target.gate) return;
  const node = g0MarketingFindTarget(target);
  if (node) {
    g3ProductJourneyRevealSource(node);
    g0MarketingScrollTarget(node);
    let revealed = node;
    // Раскрытие карточки и прежняя плавная прокрутка могут сместить цель
    // ещё раз. Корректируем только тогда, когда её заголовок вне экрана.
    [80, 300, 550, 900].forEach((delay) => setTimeout(() => {
      if (ticket !== g0MarketingNavigationTicket || activeGateId !== target.gate) return;
      const current = g0MarketingFindTarget(target);
      if (!current) return;
      if (current !== revealed) {
        g3ProductJourneyRevealSource(current);
        g0MarketingScrollTarget(current);
        revealed = current;
      }
      const box = current.getBoundingClientRect();
      const tall = box.height > window.innerHeight - 144;
      if (box.top < (tall ? 0 : 72) || box.top > window.innerHeight - 120)
        g0MarketingScrollTarget(current);
    }, delay));
    return;
  }
  if (attempt < 30) setTimeout(() => g0MarketingFocusTarget(target, ticket, attempt + 1), 50);
}

document.addEventListener("click", (event) => {
  const button = event.target?.closest?.("[data-g0-marketing-source]");
  if (!button) return;
  event.preventDefault();
  event.stopPropagation();
  let target;
  try { target = JSON.parse(button.dataset.g0MarketingSource); } catch { return; }
  if (!target || !["gate-2", "gate-4"].includes(target.gate)) return;
  if (els.searchInput) els.searchInput.value = "";
  if (els.statusFilter) els.statusFilter.value = "all";
  if (target.gate === "gate-2") {
    const gate = state.gates.find((item) => item.id === "gate-2");
    ensureGate2Structure(gate);
    const card = gate?.cards?.find((item) => item.id === target.card);
    if (!card) return;
    const scope = g2CardScopeV267(card).scope;
    getGate2AccordionState().sections[`${scope}:${g2SectionKeyForCardV271(card)}`] = true;
    getGate2AccordionState().cards[card.id] = true;
    guruGateScopeOpenStateV526("gate-2")[scope] = true;
  } else if (target.productId) {
    const product = guruV194Product(target.productId, state);
    if (!product) return;
    const ui = guruV194Ui(state);
    ui.selectedProductId = product.id;
    ui.selectedCategoryId = guruV185Text(product.categoryId) || "__uncategorized__";
    guruGateScopeOpenStateV526("gate-4").product = true;
  } else guruGateScopeOpenStateV526("gate-4")[target.scope === "company" ? "company" : "product"] = true;
  const ticket = ++g0MarketingNavigationTicket;
  guruInvalidateGateViewCache();
  guruNavigateToGate(target.gate);
  g0MarketingFocusTarget(target, ticket);
}, true);
