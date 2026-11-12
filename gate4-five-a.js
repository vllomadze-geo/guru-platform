/* Gate 4 only: company and product presentations. Source records and shared
   Gate 3 definitions keep their original identities and payloads. */
const G4_FIVE_A_VERSION_V523 = "gate4-five-a-v523";
const G4_FIVE_A_STAGES_V523 = Object.freeze([
  { key: "aware", title: "Узнал (Aware)" },
  { key: "appeal", title: "Понравился (Appeal)" },
  { key: "ask", title: "Изучает (Ask)" },
  { key: "act", title: "Покупает (Act)" },
  { key: "advocate", title: "Рекомендует (Advocate)" },
]);

const G4_FIVE_A_COMPANY_V523 = Object.freeze({
  aware: [{ id: "pr_publications", title: "PR-публикации", service: "Сервис требует выбора", chooseService: true, channel: /(?:^|\s)pr(?:\s|$)|pr-публикац|пиар/i }],
  appeal: [{ id: "articles_cases", title: "Статьи / кейсы", service: "Tilda Потоки" }],
  ask: [
    { id: "yandex_organization", title: "Карточка организации", service: "Яндекс Бизнес / Яндекс Карты", channel: /яндекс.*(?:бизнес|карты)|yandex.*(?:business|maps)/i },
    { id: "google_organization", title: "Карточка организации", service: "Google Business Profile", channel: /google.*business/i },
    { id: "online_chat", title: "Онлайн-чат", service: "JivoChat (виджет Tilda)" },
  ],
  act: [
    { id: "online_payment", title: "Онлайн-оплата", service: "ЮKassa / CloudPayments / Т-Банк / Робокасса", note: "Платёжные системы Tilda" },
    { id: "abandoned_cart", title: "Письма о брошенной корзине", service: "Внешний сервис — требует выбора", note: "Tilda не умеет отправлять письма о брошенной корзине", chooseService: true },
  ],
  advocate: [
    { id: "email_crm", title: "Email-рассылки", service: "Unisender", channel: /email|e-mail|unisender|рассылк/i },
    { id: "review_collection", title: "Сбор отзывов", service: "Яндекс Отзывы и Яндекс Карты", channel: /яндекс.*(?:карты|отзывы)/i },
    { id: "referral", title: "Реферальная программа", service: "Промокоды Tilda", instanceId: "g3-5a-advocate-referral" },
    { id: "loyalty", title: "Программа лояльности", service: "Внешний сервис — требует выбора", note: "В Tilda нет программы лояльности", chooseService: true },
  ],
});

const G4_FIVE_A_PRODUCT_CHANNELS_V523 = Object.freeze({
  aware: [
    { id: "rsya", title: "Яндекс Директ / РСЯ", service: "Яндекс Директ / РСЯ", protected: true, matches: (channel) => g4IsYandexRsyaChannel(channel) },
    { id: "master_campaign", title: "Яндекс Директ / Мастер кампаний", service: "Яндекс Директ / Мастер кампаний", matches: (channel) => /яндекс.*директ.*мастер кампаний/i.test(g4FiveChannelTextV523(channel)) },
    { id: "display", title: "Медийная реклама · Google Ads / Display", service: "Google Ads / Display", matches: (channel) => /google.*ads.*display/i.test(g4FiveChannelTextV523(channel)) },
    { id: "vk_target", title: "Таргет · VK Реклама", service: "VK Реклама", matches: (channel) => /(?:vk|вк|вконтакте).*?(?:ads|таргет|реклама)/i.test(g4FiveChannelTextV523(channel)) && !/контент/i.test(g4FiveChannelTextV523(channel)) },
    { id: "meta", title: "Таргет · Meta Ads / Feed / Reels", service: "Meta Ads / Feed / Reels", matches: (channel) => /meta.*ads|facebook.*ads/i.test(g4FiveChannelTextV523(channel)) },
    { id: "telegram_ads", title: "Telegram Ads · Telegram Ads", service: "Telegram Ads", matches: (channel) => /telegram.*ads|телеграм.*реклам/i.test(g4FiveChannelTextV523(channel)) },
    { id: "vk_content", title: "Контент · VK", service: "VK", matches: (channel) => /(?:vk|вк|вконтакте).*контент/i.test(g4FiveChannelTextV523(channel)) },
    { id: "telegram_content", title: "Канал и посевы · Telegram", service: "Telegram", matches: (channel) => /telegram|телеграм/i.test(g4FiveChannelTextV523(channel)) && !/ads/i.test(g4FiveChannelTextV523(channel)) },
    { id: "instagram", title: "Контент · Instagram / Reels / Stories", service: "Instagram / Reels / Stories", matches: (channel) => /instagram|инстаграм/i.test(g4FiveChannelTextV523(channel)) },
    { id: "youtube", title: "Видео · YouTube / Shorts / Pre-roll", service: "YouTube / Shorts / Pre-roll", matches: (channel) => /youtube/i.test(g4FiveChannelTextV523(channel)) },
  ],
  ask: [
    { id: "yandex_search", title: "Яндекс Директ / Поиск", service: "Яндекс Директ / Поиск", protected: true, matches: (channel) => g4IsYandexSearchChannel(channel) },
    { id: "google_search", title: "Поисковая реклама · Google Ads / Search", service: "Google Ads / Search", matches: (channel) => /google.*ads.*search/i.test(g4FiveChannelTextV523(channel)) },
  ],
});

const G4_FIVE_A_AWARE_BLOCKS_V544 = Object.freeze([
  { id: "content_smm", title: "Органический контент · Продукт/Услуга" },
  { id: "paid_social", title: "Рекламный контент · Продукт/Услуга" },
  { id: "media", title: "Медийная реклама" },
]);

const __g4FivePrevProductionHtmlV523 = gate4ProductionHtml;
const __g4FivePrevLaunchHtmlV523 = g4CampaignLaunchCenterHtml;

function g4FiveTextV523(value) {
  return String(value ?? "").replace(/Банне\uFFFD+ы/gi, "Баннеры");
}

function g4FiveChannelTextV523(channel) {
  return [channel?.channel, channel?.platform, channel?.type].filter(Boolean).join(" ");
}

function g4FiveChannelExcludedV523(channel) {
  return /^(?:not_required|not_needed|not_applicable|excluded|не требуется)$/i
    .test(String(channel?.status || "").trim());
}

function g4FiveServiceRequiredV523(channels, matches) {
  const rows = channels.filter(matches);
  return !rows.length || rows.some((channel) => !g4FiveChannelExcludedV523(channel));
}

/* Legacy renderers contain ensure helpers for other Gates. Their read view
   runs on a private copy; input handlers still address the original stores. */
function g4FiveReadViewV523(render) {
  if (!state) return render();
  const original = state;
  state = structuredClone(original);
  try { return render(); }
  finally { state = original; }
}

/* Disclosure clicks keep the existing Gate 4 DOM. Render an individual body
   only on its first opening; closing and reopening reuse that body. */
function g4FiveCampaignElementV546(button) {
  const key = button?.dataset.g4campToggle;
  if (!key) return null;
  const html = g4FiveReadViewV523(() => {
    const channels = g4LaunchChannels();
    const campaigns = g4EnsureLaunchCampaigns();
    const selected = g4ProductPickSelected(state);
    const products = [...new Set([selected?.id, selected?.name,
      campaigns[key]?.product, ...g4LaunchProducts()].filter(Boolean))];
    for (const product of products) {
      const channel = channels.find((item) => g4CampaignStateKey(product, item.key) === key);
      if (!channel) continue;
      const index = channels.filter((item) => item.launchType === channel.launchType).indexOf(channel);
      return g4CampaignRowHtml(channel, campaigns[key] || {}, index, product);
    }
    return "";
  });
  if (!html) return null;
  const template = document.createElement("template");
  template.innerHTML = html;
  return template.content.firstElementChild;
}

function g4FiveDirectBodyV546(card) {
  return [...(card?.children || [])].find((node) =>
    node.matches?.(".g1-card-body, .g4-campaign-row")) || null;
}

function g4FiveSetBodyOpenV546(card, body, open, button, marker) {
  card.classList.toggle("is-open", open);
  if (body) body.style.display = open ? "" : "none";
  button?.setAttribute("aria-expanded", String(open));
  if (marker) marker.textContent = open ? "свернуть ▾" : "развернуть ▸";
}

function g4FiveFastCampaignToggleV546(button, open) {
  if (!button?.closest(".g4five-map-v523")) return false;
  const card = button.closest(".g1-card, .g4-campaign-shell");
  if (!card) return false;
  let body = g4FiveDirectBodyV546(card);
  if (open && !body) {
    const rendered = g4FiveCampaignElementV546(button);
    body = g4FiveDirectBodyV546(rendered);
    if (!body) return false;
    [...rendered.attributes].filter((attr) => attr.name.startsWith("data-")).forEach((attr) =>
      card.setAttribute(attr.name, attr.value));
    card.insertBefore(body, card.querySelector(":scope > .g4-aware-banners-v522"));
  }
  g4FiveSetBodyOpenV546(card, body, open, button);
  const mark = button.querySelector(".g4-toggle-mark");
  if (mark) mark.textContent = open ? "Свернуть" : "Открыть";
  return true;
}

function g4FiveFastCampaignStepToggleV546(button, open) {
  if (!button?.closest(".g4five-map-v523")) return false;
  const card = button.closest(".g1-card");
  if (!card) return false;
  let body = g4FiveDirectBodyV546(card);
  if (open && !body) {
    const campaignCard = card.parentElement?.closest(".g1-card, .g4-campaign-shell");
    const campaignButton = campaignCard?.querySelector(":scope > [data-g4camp-toggle]");
    const rendered = g4FiveCampaignElementV546(campaignButton);
    const attr = button.hasAttribute("data-g4sb-step") ? "data-g4sb-step" : "data-g4rsya-v453-step";
    const key = button.getAttribute(attr);
    const renderedButton = [...(rendered?.querySelectorAll(`[${attr}]`) || [])]
      .find((node) => node.getAttribute(attr) === key);
    body = g4FiveDirectBodyV546(renderedButton?.closest(".g1-card"));
    if (!body) return false;
    card.append(body);
  }
  g4FiveSetBodyOpenV546(card, body, open, button,
    button.lastElementChild?.lastElementChild);
  return true;
}

function g4FiveFastSearchUnitToggleV546(button, open) {
  if (!button?.closest(".g4five-map-v523")) return false;
  const card = button.closest(".g1-card");
  if (!card) return false;
  let body = g4FiveDirectBodyV546(card);
  if (open && !body) {
    const product = button.dataset.g4sbProduct;
    const id = button.dataset.g4sbUnitToggle;
    const html = g4FiveReadViewV523(() => {
      const build = ensureGate4SearchBuild(product);
      const index = build.groupRows.findIndex((row) => row.clusterId === id);
      if (index < 0) return "";
      return g4sbGroupCardHtml(product, build.groupRows[index], index,
        build.groupRows, (build.adsRows || {})[index] || [{}]);
    });
    const template = document.createElement("template");
    template.innerHTML = html;
    body = g4FiveDirectBodyV546(template.content.firstElementChild);
    if (!body) return false;
    card.append(body);
  }
  g4FiveSetBodyOpenV546(card, body, open, button,
    button.lastElementChild?.lastElementChild);
  return true;
}

function g4FiveFastSectionToggleV546(button, open) {
  const section = button?.closest(".g4-campaign-section, .g1-section");
  if (!section?.closest(".g4five-map-v523")) return false;
  const body = [...section.children].find((node) =>
    node.matches?.(".g4-campaign-list, .g1-section-body"));
  if (open && !body) return false;
  section.classList.toggle("is-open", open);
  if (body) body.style.display = open ? "" : "none";
  button.setAttribute("aria-expanded", String(open));
  return true;
}

function g4FiveLegacyItemsV523(productId = "") {
  const models = state?.gate3Gate4StructureV290?.byProduct || {};
  const selected = productId ? [models[productId]].filter(Boolean) : Object.values(models);
  return selected.flatMap((model) => [
    ...Object.values(model?.stages || {}).flatMap((stage) =>
      (stage?.groups || []).flatMap((group) => group?.items || [])),
    ...(model?.outside || []),
  ]);
}

function g4FiveLegacyItemV523(id, stageKey, productId = "") {
  const item = g4FiveLegacyItemsV523(productId).find((row) =>
    row?.toolId === id || row?.id === id || row?.instanceId === `g3-5a-${stageKey}-${id}`);
  const definition = (GATE3_EXECUTION_ITEMS_V282[stageKey] || []).find((row) => row.id === id);
  return { ...(definition || { id, resolver: "none" }), ...(item || {}),
    instanceId: item?.instanceId || `g3-5a-${stageKey}-${id}` };
}

function g4FiveServiceHtmlV523(service, note = "") {
  return `<span class="g4five-service-v523">${escapeHtml(g4FiveTextV523(service))}</span>${note ? `<span class="g4five-note-v523">${escapeHtml(note)}</span>` : ""}`;
}

function g4FiveSavedImplementationsV523(id, productId = "") {
  const ids = new Set(g4FiveLegacyItemsV523(productId)
    .filter((item) => item?.id === id || item?.toolId === id)
    .map((item) => item.implementationId).filter(Boolean));
  return (state?.gate4?.implementations || []).filter((row) => ids.has(row.id));
}

function g4FiveToolCardHtmlV523(tool, stageKey, productId = "") {
  let serviceChannels = [];
  if (tool.channel) {
    serviceChannels = g4LaunchChannels().filter((channel) => tool.channel.test(g4FiveChannelTextV523(channel)));
  }
  const item = g4FiveLegacyItemV523(tool.id, stageKey, productId);
  const stored = productId
    ? state?.gate4FiveAV523?.byProduct?.[productId]?.[tool.id]
    : state?.gate4FiveAV523?.company?.[tool.id];
  const service = stored?.service || tool.service;
  const implementations = g4FiveSavedImplementationsV523(tool.id, productId);
  const channelRecords = !productId && /_organization$/.test(tool.id)
    ? serviceChannels.filter((channel) => !g4FiveChannelExcludedV523(channel)).flatMap((channel) =>
      Object.entries(state?.gate4Production?.campaigns || {}).filter(([key, campaign]) =>
        campaign?.product && key === g4CampaignStateKey(campaign.product, channel.key) &&
        ["decision", "campaignName", "objective", "landing", "budget", "utm", "creative", "launchStatus", "notes"]
          .some((field) => String(campaign[field] || "").trim())).map(([key, campaign]) => ({ key, channel, campaign })))
    : [];
  const source = tool.id === "articles_cases"
    ? g3ExecutionGate0ExtraResultV282("Портфолио / кейсы", "Gate 0 · Портфолио / кейсы")
    : null;
  const status = serviceChannels.length && serviceChannels.every(g4FiveChannelExcludedV523)
    ? "not_needed"
    : implementations.length ? g4ImplItemStatus(implementations[0]) : channelRecords.length ? "ready" : source?.target ? source.status : "no_implementation";
  const title = tool.fullTitle ? tool.title : `${tool.title} · ${service}`;
  return `<article class="g1-card g4five-card-v523" data-g4five-tool-v523="${escapeAttr(tool.id)}" data-g4five-scope-v523="${productId ? "product" : "company"}" data-g4five-instance-v523="${escapeAttr(tool.instanceId || item.instanceId)}" ${productId ? `data-product-id="${escapeAttr(productId)}"` : ""}>
    <div class="g1-card-header-static"><span class="g1-section-left"><span class="g1-card-title">${escapeHtml(title)}</span>${g4FiveServiceHtmlV523(service, tool.note)}</span><span class="status-pill status-${escapeAttr(status)}">${escapeHtml(status === "not_needed" ? "Не требуется" : STATUS_LABELS[status] || g3ExecutionStatusLabelV282(status))}</span></div>
    ${source?.target || implementations.length || channelRecords.length || tool.chooseService ? `<div class="g4five-card-body-v523">
      ${source?.target ? g4Gate3MapTargetLinkV290(source.target) : ""}
      ${tool.chooseService ? `<label class="g1-field"><span>Сервис</span><input class="g1-input ${stored?.service ? "is-filled" : "is-empty"}" value="${escapeAttr(stored?.service || "")}" placeholder="Название выбранного сервиса" data-g4five-service-input-v523="${escapeAttr(tool.id)}" /></label>` : ""}
      ${implementations.map((implementation) => g4Gate3MapImplementationCardV290({ ...item, label: title }, implementation, { embedded: true })).join("")}
      ${channelRecords.map(({ channel, campaign }, index) => `<details class="g4five-company-saved-v523"><summary>Сохранённая запись · ${escapeHtml(g4ProductIdDisplayNameV224(campaign.product))}</summary>${g4CampaignRowHtml(channel, campaign, index, campaign.product)}</details>`).join("")}
    </div>` : ""}
  </article>`;
}

function g4FiveDisplayCampaignHtmlV523(html, tool) {
  if (tool.protected) return html;
  const template = document.createElement("template");
  template.innerHTML = html;
  const title = template.content.querySelector(".g1-card-title");
  if (title) title.textContent = tool.title;
  const caption = template.content.querySelector(".g1-section-progress");
  if (caption) {
    caption.textContent = tool.service;
    caption.classList.add("g4five-service-v523");
  }
  const card = template.content.firstElementChild;
  card?.classList.add("g4five-card-v523");
  if (card) card.dataset.g4fiveToolV523 = tool.id;
  return template.innerHTML;
}

function g4FiveCampaignHtmlV523(context, tool) {
  const allMatches = context.channels.filter(tool.matches);
  const channels = allMatches.filter((channel) => !g4FiveChannelExcludedV523(channel));
  if (!channels.length) {
    const html = g4FiveToolCardHtmlV523({ ...tool, fullTitle: true }, "aware", context.productId);
    if (!allMatches.length) return html;
    const template = document.createElement("template");
    template.innerHTML = html;
    const card = template.content.firstElementChild;
    const pill = card?.querySelector(".status-pill");
    if (pill) {
      pill.className = "status-pill status-not_needed";
      pill.textContent = "Не требуется";
    }
    return template.innerHTML;
  }
  return channels.map((channel, index) => {
    const key = g4CampaignStateKey(context.productId, channel.key);
    context.renderedCampaigns.add(key);
    const html = g4CampaignRowHtml(channel, context.campaigns[key], index, context.productId);
    return `<div class="g4five-campaign-host-v523${tool.protected ? " g4five-protected-v523" : ""}" data-g4five-channel-v523="${escapeAttr(channel.key)}" data-g4five-tool-v523="${escapeAttr(tool.id)}">${g4FiveDisplayCampaignHtmlV523(html, tool)}</div>`;
  }).join("");
}

function g4FiveAwareBlockHtmlV544(block, content, productId) {
  const openBlocks = state?.gate4FiveAV523?.byProduct?.[productId]?.openBlocksV547;
  const open = Array.isArray(openBlocks) && openBlocks.includes(block.id);
  return `<details class="g4five-aware-block-v544" data-g4five-aware-block-v544="${escapeAttr(block.id)}"${open ? " open" : ""}>
    <summary class="g4five-aware-block-head-v544" data-g4five-aware-summary-v547><h4>${escapeHtml(block.title)}</h4><span class="g4five-aware-chevron-v547" aria-hidden="true">›</span></summary>
    <div class="g4five-aware-block-content-v544">${content}</div>
  </details>`;
}

function g4FivePillStatusV545(pills, fallback = "idle") {
  const statuses = [...pills].map((pill) =>
    [...pill.classList].find((name) => name.startsWith("status-") && name !== "status-pill")?.slice(7) || "");
  if (!statuses.length) return fallback;
  if (statuses.every((status) => status === "not_needed")) return "unavailable";
  if (statuses.every((status) => status === "ready")) return "ready";
  if (statuses.some((status) => ["ready", "in_progress", "working", "done"].includes(status))) return "active";
  return fallback;
}

function g4FiveRowStatusV545(content, fallback = "idle") {
  const template = document.createElement("template");
  template.innerHTML = content;
  return g4FivePillStatusV545(template.content.querySelectorAll(".status-pill"), fallback);
}

function g4FivePaidPlatformStatusV545(product, platform) {
  const bucket = g4PaidSmmStoreV1(product.id);
  const config = bucket?.platforms?.[platform];
  if (config?.legalUnavailable) return "unavailable";
  if (config && g4PaidSmmCanReadyV1(platform, config, bucket)) return "ready";
  if (config && (Object.values(config.fields || {}).some((value) => value !== "" && value !== false) ||
      (bucket.creativeCards || []).some((card) => card.platform === platform))) return "active";
  return "idle";
}

function g4FivePaidRowStatusV545(product, platform, campaignStatus, knownWorkspaceStatus = "") {
  const workspaceStatus = knownWorkspaceStatus || g4FivePaidPlatformStatusV545(product, platform);
  if (workspaceStatus === "unavailable") return "unavailable";
  if (workspaceStatus === "ready") return "ready";
  if (workspaceStatus === "active" || ["active", "ready"].includes(campaignStatus)) return "active";
  return campaignStatus === "unavailable" ? "unavailable" : "idle";
}

function g4FiveNavSyncPaidV545(node, knownWorkspaceStatus = "") {
  const row = node?.closest?.("[data-g4five-nav-row-v545]");
  const platform = node?.closest?.("[data-g4-paid-platform-v1]")?.dataset.g4PaidPlatformV1 ||
    node?.querySelector?.("[data-g4-paid-platform-v1]")?.dataset.g4PaidPlatformV1;
  const productId = row?.closest("[data-g4five-product-v523]")?.dataset.g4fiveProductV523;
  const product = productId && g4SmmProductReadOnlyV299(productId);
  if (!row || !platform || !product) return;
  const campaignStatus = g4FivePillStatusV545(row.querySelectorAll(".g4five-nav-body-v545 .status-pill"));
  const status = g4FivePaidRowStatusV545(product, platform, campaignStatus, knownWorkspaceStatus);
  const pill = row.querySelector(".g4five-nav-status-v545");
  if (pill) {
    pill.className = "g4five-nav-status-v545 status-pill " + g4FiveNavStatusClassV545(status);
    pill.textContent = g4FiveNavStatusLabelV545(status);
  }
  row.classList.toggle("is-unavailable-v545", status === "unavailable");
}

function g4FiveNavStatusClassV545(status) {
  return status === "ready" ? "status-ready" : status === "active" ? "status-in_progress"
    : status === "unavailable" ? "status-not_needed" : "status-not_started";
}

function g4FiveNavStatusLabelV545(status) {
  return status === "ready" ? "Готово" : status === "active" ? "В работе"
    : status === "unavailable" ? "Недоступно" : "Не начато";
}

function g4FiveRowHtmlV545(product, id, name, destination, format, content, status = "idle", foundation = false) {
  const openRows = state?.gate4FiveAV523?.byProduct?.[product.id]?.openRowsV545 || [];
  const open = Array.isArray(openRows) && openRows.includes(id);
  return `<details class="g4five-nav-row-v545${foundation ? " is-foundation-v545" : ""}${status === "unavailable" ? " is-unavailable-v545" : ""}" data-g4five-nav-row-v545="${escapeAttr(id)}"${open ? " open" : ""}>
    <summary data-g4five-nav-summary-v545><strong>${escapeHtml(name)}</strong><span>${escapeHtml(destination)}</span><span>${escapeHtml(format)}</span>${foundation ? "" : `<span class="g4five-nav-status-v545 status-pill ${g4FiveNavStatusClassV545(status)}">${g4FiveNavStatusLabelV545(status)}</span>`}<span class="g4five-nav-chevron-v545" aria-hidden="true">${foundation ? '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/><circle cx="12" cy="15.5" r="1"/></svg>' : "›"}</span></summary>
    <div class="g4five-nav-body-v545">${content}</div>
  </details>`;
}

function g4FiveExpandedOrganicHtmlV545(product) {
  const template = document.createElement("template");
  template.innerHTML = g4ProductSmmStrategyHtmlV523(product);
  const workspace = template.content.querySelector(".g4-product-smm-v523");
  workspace?.classList.remove("is-collapsed");
  workspace?.querySelector("[data-g4-product-smm-collapse-v2]")?.setAttribute("aria-expanded", "true");
  return template.innerHTML;
}

function g4FiveTelegramSeedingV545(channel) {
  const text = g4FiveChannelTextV523(channel);
  return /telegram|телеграм/i.test(text) && /посев|seeding/i.test(text) &&
    !/ads|реклам/i.test(text);
}

function g4FiveYouTubePreRollV545(channel) {
  const text = g4FiveChannelTextV523(channel);
  return /youtube/i.test(text) && /pre.?roll|преролл/i.test(text);
}

function g4FiveAwareHtmlV544(context, product) {
  const tools = new Map(G4_FIVE_A_PRODUCT_CHANNELS_V523.aware.map((tool) => [tool.id, tool]));
  const campaign = (id, matches = null) => g4FiveCampaignHtmlV523(context,
    matches ? { ...tools.get(id), matches } : tools.get(id));
  const telegramOrganic = (channel) => tools.get("telegram_content").matches(channel) &&
    !tools.get("telegram_ads").matches(channel);
  const rsyaContent = campaign("rsya");
  const masterCampaignContent = campaign("master_campaign");
  const rows = {
    content_smm: [
      g4FiveRowHtmlV545(product, "organic_strategy", "SMM-стратегия продукта", "Основа, не изменяется", "",
        g4FiveExpandedOrganicHtmlV545(product), "idle", true),
      ["organic_vk", "VK", "Сообщество", "Пост, клип", campaign("vk_content")],
      ["organic_telegram", "Telegram", "Канал", "Пост, видео", campaign("telegram_content", telegramOrganic)],
      ["organic_instagram", "Instagram", "Профиль", "Reels, Stories", campaign("instagram")],
      ["organic_youtube", "YouTube", "Канал", "Shorts, видео", campaign("youtube")],
    ],
    paid_social: [
      ["paid_vk", "VK Реклама", "Лента, клипы", "Карусель, баннер, видео", g4PaidSmmPlatformRootHtmlV1(product, "vk") + campaign("vk_target"), "vk"],
      ["paid_telegram_ads", "Telegram Ads", "Каналы", "Спонсорское сообщение", g4PaidSmmPlatformRootHtmlV1(product, "telegram") + campaign("telegram_ads"), "telegram"],
      ["paid_telegram_seeding", "Telegram", "Посевы", "Пост", campaign("telegram_content", g4FiveTelegramSeedingV545)],
      ["paid_meta", "Meta Ads", "Feed, Reels", "Пост, видео", g4PaidSmmPlatformRootHtmlV1(product, "meta") + campaign("meta"), "meta"],
    ],
    media: [
      ["media_yandex", "Яндекс Директ", "РСЯ", "Баннер, видео",
        rsyaContent + masterCampaignContent, null, g4FiveRowStatusV545(rsyaContent)],
      ["media_google", "Google Ads", "Display", "Баннер", campaign("display")],
      ["media_youtube", "YouTube", "Pre-roll", "Видео", campaign("youtube", g4FiveYouTubePreRollV545)],
    ],
  };
  return G4_FIVE_A_AWARE_BLOCKS_V544.map((block) => {
    const content = rows[block.id].map((row) => Array.isArray(row)
      ? g4FiveRowHtmlV545(product, row[0], row[1], row[2], row[3], row[4],
        row[6] || (row[5] ? g4FivePaidRowStatusV545(product, row[5], g4FiveRowStatusV545(row[4]))
          : g4FiveRowStatusV545(row[4])))
      : row).join("");
    return g4FiveAwareBlockHtmlV544(block, content, product.id);
  }).join("");
}

function g4FiveLinkedToolHtmlV523(context, id, legacyStage, title, service, note = "", options = {}) {
  const item = { ...g4FiveLegacyItemV523(id, legacyStage, context.productId), label: title };
  const html = g4Gate3MapToolHtmlV290(context, item, options);
  const template = document.createElement("template");
  template.innerHTML = html;
  template.content.querySelector(".g4-map-tool-title-v290")?.remove();
  const root = template.content.firstElementChild;
  root?.classList.add("g4five-linked-tool-v523");
  if (root) root.dataset.g4fiveToolV523 = id;
  template.content.querySelectorAll(".g1-section-left").forEach((left) => {
    const label = document.createElement("span");
    label.className = "g4five-service-v523";
    label.textContent = service;
    left.querySelector(".g1-card-title")?.after(label);
  });
  if (note && root) {
    const label = document.createElement("p");
    label.className = "g4five-note-v523";
    label.textContent = note;
    root.append(label);
  }
  return template.innerHTML;
}

function g4FiveStageHtmlV523(stage, index, content, scope, productId = "") {
  return `<section class="g4-map-stage-v290 g4-funnel-stage-v294 g4five-stage-v523" data-g4-map-stage-v290="${escapeAttr(stage.key)}" data-g4five-stage-scope-v523="${scope}" ${productId ? `data-product-id="${escapeAttr(productId)}"` : ""}>
    <header><span>${index + 1}</span><h3>${escapeHtml(stage.title)}</h3></header>
    ${g3ProductJourneyStageExplanationHtmlV296(stage.key, "gate4")}
    <div class="g4five-tool-list-v523">${content}</div>
  </section>`;
}

function g4FiveCompanyHtmlV523() {
  const stableProduct = g4ProductPickProducts()[0] || null;
  return `<div class="g4five-map-v523" data-g4five-company-v523><h3 class="g4five-map-title-v523">5А Компании</h3>${G4_FIVE_A_STAGES_V523.map((stage, index) => {
    const strategy = stage.key === "aware" ? g4SmmStrategyHtmlV298(stableProduct) : "";
    const tools = (G4_FIVE_A_COMPANY_V523[stage.key] || []).map((tool) =>
      g4FiveToolCardHtmlV523(tool, stage.key)).join("");
    return g4FiveStageHtmlV523(stage, index, strategy + tools, "company");
  }).join("")}</div>`;
}

function g4FiveProductHtmlV523(product) {
  if (!product) return '<div class="g1-empty">Добавьте продукт или услугу в каталог.</div>';
  const productId = product.id;
  const channels = g4LaunchChannels();
  const campaigns = g4EnsureLaunchCampaigns();
  const snapshot = g3ProductJourneySnapshot(product);
  const context = { product, productId, channels, campaigns, snapshot,
    renderedCampaigns: new Set(), renderedImplementations: new Set(), bindingsChanged: false };
  const rsya = channels.filter((channel) => g4IsYandexRsyaChannel(channel) && !g4FiveChannelExcludedV523(channel));
  const cards = g4ReadinessAllCardsV225(state).filter((card) =>
    ["appeal", "ask", "act"].includes(G4_FUNNEL_CARD_STAGE_V294[card.id]));
  const preparationOpen = state?.gate4FiveAV523?.byProduct?.[productId]?.preparationOpenV523 !== false;
  const preparation = `<details class="g4five-preparation-v523" data-g4five-preparation-v523 data-product-id="${escapeAttr(productId)}"${preparationOpen ? " open" : ""}>
    <summary data-g4five-preparation-toggle-v523><span>0</span><h3>Подготовка к запуску</h3><span class="g4five-preparation-chevron-v523" aria-hidden="true">⌄</span></summary>
    ${g4FunnelReadinessGroupHtmlV294("preparation", cards, product, snapshot)}
  </details>`;
  const stages = G4_FIVE_A_STAGES_V523.map((stage, index) => {
    let content = "";
    if (stage.key === "aware") {
      content = g4FiveAwareHtmlV544(context, product);
    } else if (stage.key === "appeal") {
      if (rsya.length) content += g4FiveLinkedToolHtmlV523(context, "content_creatives", "appeal", "Контент и креативы · Яндекс Директ / РСЯ", "Яндекс Директ / РСЯ", "", { channels: rsya });
      content += g4FiveToolCardHtmlV523({ id: "promo_landing", title: "ПромоСтраница / контентная посадочная", service: "Tilda" }, "appeal", productId);
    } else if (stage.key === "ask") {
      content += g4FiveCampaignHtmlV523(context, G4_FIVE_A_PRODUCT_CHANNELS_V523.ask[0]);
      if (g4FiveServiceRequiredV523(channels, (channel) => /яндекс.*директ|yandex.*direct/i.test(g4FiveChannelTextV523(channel)))) content += g4FiveToolCardHtmlV523({ id: "product_gallery", title: "Товарная галерея", service: "Яндекс Директ, ЕПК с товарными объявлениями", note: "Нужен товарный фид: название, ссылка, изображение, цена" }, "ask", productId);
      content += g4FiveCampaignHtmlV523(context, G4_FIVE_A_PRODUCT_CHANNELS_V523.ask[1]);
      content += g4FiveLinkedToolHtmlV523(context, "seo", "ask", "SEO / Страницы сайта · Яндекс Вебмастер", "Яндекс Вебмастер", "", { channels: [] });
    } else if (stage.key === "act") {
      if (rsya.length) content += g4FiveLinkedToolHtmlV523(context, "retargeting", "advocate", "Ретаргетинг · Яндекс Директ", "Яндекс Директ", "Сегменты «Брошенные корзины», «Смотрели товары, но не купили»", { channels: rsya });
      if (g4FiveServiceRequiredV523(channels, G4_FIVE_A_PRODUCT_CHANNELS_V523.aware.find((tool) => tool.id === "vk_target").matches)) content += g4FiveToolCardHtmlV523({ id: "vk_retargeting", title: "Ретаргетинг", service: "VK Реклама", note: "Пиксель VK, динамический ретаргетинг" }, "act", productId);
    } else if (stage.key === "advocate") {
      if (g4FiveServiceRequiredV523(channels, (channel) => /яндекс.*директ|yandex.*direct|(?:vk|вк).*?(?:ads|таргет|реклама)/i.test(g4FiveChannelTextV523(channel)))) content += g4FiveToolCardHtmlV523({ id: "buyer_retargeting", title: "Ретаргетинг на покупателей", service: "Яндекс Директ / VK Реклама" }, "advocate", productId);
    }
    return g4FiveStageHtmlV523(stage, index, content, "product", productId);
  }).join("");
  return `<div class="g4five-map-v523" data-g4five-product-v523="${escapeAttr(productId)}"><h3 class="g4five-map-title-v523">5А Продукта · ${escapeHtml(product.name)}</h3>${preparation}${stages}</div>`;
}

function g4FiveCleanUnprotectedControlsV523(html) {
  const template = document.createElement("template");
  template.innerHTML = html;
  template.content.querySelectorAll(".g4five-card-v523 select, .g4five-linked-tool-v523 select, .g4five-preparation-v523 select").forEach((select) => {
    if (select.closest(".g4five-protected-v523")) return;
    select.querySelectorAll("option").forEach((option) => {
      if (!option.value && /выбрать|выберите/i.test(option.textContent)) option.textContent = "Не задано";
    });
  });
  return g4FiveTextV523(template.innerHTML);
}

gate4ProductionHtml = function () {
  return g4FiveReadViewV523(() => {
    const product = g4ProductPickSelected(state);
    return g4FiveCleanUnprotectedControlsV523(`<div class="g1-route g4-launch-workspace guru-company-product-layout-v230 g4five-workspace-v523" data-g4-company-product-layout-v466 data-g4five-version-v523="${G4_FIVE_A_VERSION_V523}">
      <section class="guru-gate-scope-v230" data-gate-scope="company">
        ${gate0SectionHeadingHtml("Компания", "Общая стратегическая основа проекта — без привязки к конкретному продукту или кампании.")}
        ${guruStrategicFoundationCompanyHtmlV310(state)}
        ${g4FiveCompanyHtmlV523()}
        ${gate4BlogHtmlV304("company")}
      </section>
      <section class="guru-gate-scope-v230" data-gate-scope="product">
        ${gate0SectionHeadingHtml("Продукт / Услуга", "Селектор и стратегическая основа относятся к выбранной позиции каталога.")}
        ${guruV194ProductSelectHtml("gate4-launch")}
        ${product ? guruStrategicFoundationHtmlV237(product) : ""}
        ${g4FiveProductHtmlV523(product)}
        ${gate4BlogHtmlV304("product", product)}
      </section>
    </div>`);
  });
};

g4CampaignLaunchCenterHtml = function (options = {}) {
  return g4FiveReadViewV523(() => `${options.omitPicker ? "" : g4ProductPickPickerHtml(g4ProductPickProducts(), g4ProductPickSelected())}${g4FiveProductHtmlV523(g4ProductPickSelected())}`);
};

document.addEventListener("input", (event) => {
  const input = event.target?.closest?.("[data-g4five-service-input-v523]");
  if (!input || activeGateId !== "gate-4") return;
  state.gate4FiveAV523 = state.gate4FiveAV523 || { version: G4_FIVE_A_VERSION_V523, company: {}, byProduct: {} };
  const root = state.gate4FiveAV523;
  root.company = root.company || {};
  const id = input.dataset.g4fiveServiceInputV523;
  root.company[id] = { ...(root.company[id] || {}), service: input.value };
  const tool = Object.values(G4_FIVE_A_COMPANY_V523).flat().find((item) => item.id === id);
  const card = input.closest("[data-g4five-tool-v523]");
  const service = input.value.trim() || tool?.service || "Сервис требует выбора";
  const title = card?.querySelector(".g1-card-title");
  const caption = card?.querySelector(".g4five-service-v523");
  if (title && tool) {
    title.textContent = `${tool.title} · ${service}`;
    window.GuruBlockTitles?.refresh(card);
  }
  if (caption) caption.textContent = service;
  input.classList.toggle("is-empty", !input.value.trim());
  input.classList.toggle("is-filled", Boolean(input.value.trim()));
  flashSaving();
});
document.addEventListener("click", (event) => {
  const preparationSummary = event.target?.closest?.("[data-g4five-preparation-toggle-v523]");
  const preparation = preparationSummary?.closest("[data-g4five-preparation-v523]");
  const preparationProductId = preparation?.dataset.productId;
  if (preparationProductId) {
    const store = state.gate4FiveAV523 ||= { version: G4_FIVE_A_VERSION_V523, company: {}, byProduct: {} };
    store.byProduct ||= {};
    const bucket = store.byProduct[preparationProductId] ||= {};
    bucket.preparationOpenV523 = !preparation.open;
    guruScheduleUiPreferenceSave();
    return;
  }
  const blockSummary = event.target?.closest?.("[data-g4five-aware-summary-v547]");
  const block = blockSummary?.closest("[data-g4five-aware-block-v544]");
  const blockProductId = block?.closest("[data-g4five-product-v523]")?.dataset.g4fiveProductV523;
  if (blockProductId) {
    const store = state.gate4FiveAV523 ||= { version: G4_FIVE_A_VERSION_V523, company: {}, byProduct: {} };
    store.byProduct ||= {};
    const bucket = store.byProduct[blockProductId] ||= {};
    const open = new Set(Array.isArray(bucket.openBlocksV547) ? bucket.openBlocksV547 : []);
    if (block.open) open.delete(block.dataset.g4fiveAwareBlockV544);
    else open.add(block.dataset.g4fiveAwareBlockV544);
    bucket.openBlocksV547 = [...open];
    guruScheduleUiPreferenceSave();
    return;
  }
  const summary = event.target?.closest?.("[data-g4five-nav-summary-v545]");
  const row = summary?.closest("[data-g4five-nav-row-v545]");
  const productId = row?.closest("[data-g4five-product-v523]")?.dataset.g4fiveProductV523;
  if (!productId) return;
  const store = state.gate4FiveAV523 ||= { version: G4_FIVE_A_VERSION_V523, company: {}, byProduct: {} };
  store.byProduct ||= {};
  const bucket = store.byProduct[productId] ||= {};
  const open = new Set(Array.isArray(bucket.openRowsV545) ? bucket.openRowsV545 : []);
  if (row.open) open.delete(row.dataset.g4fiveNavRowV545);
  else open.add(row.dataset.g4fiveNavRowV545);
  bucket.openRowsV545 = [...open];
  guruScheduleUiPreferenceSave();
});
window.GURU_GATE4_FIVE_A_BUILD = new URL(document.currentScript?.src || "gate4-five-a.js", location.href).searchParams.get("v") || "dev";
