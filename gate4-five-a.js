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
  { id: "yandex_media", title: "Медийная реклама · Яндекс Директ / РСЯ", toolIds: ["rsya"] },
  { id: "google_media", title: "Медийная реклама · Google Ads / Display", toolIds: ["display"] },
  { id: "content_smm", title: "Контентная SMM-стратегия", toolIds: ["vk_content", "telegram_content", "instagram", "youtube"] },
  { id: "paid_social", title: "Платное продвижение", toolIds: ["vk_target", "meta", "telegram_ads"] },
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
    if (serviceChannels.length && serviceChannels.every(g4FiveChannelExcludedV523)) return "";
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
  const status = implementations.length ? g4ImplItemStatus(implementations[0]) : channelRecords.length ? "ready" : source?.target ? source.status : "no_implementation";
  const title = tool.fullTitle ? tool.title : `${tool.title} · ${service}`;
  return `<article class="g1-card g4five-card-v523" data-g4five-tool-v523="${escapeAttr(tool.id)}" data-g4five-scope-v523="${productId ? "product" : "company"}" data-g4five-instance-v523="${escapeAttr(tool.instanceId || item.instanceId)}" ${productId ? `data-product-id="${escapeAttr(productId)}"` : ""}>
    <div class="g1-card-header-static"><span class="g1-section-left"><span class="g1-card-title">${escapeHtml(title)}</span>${g4FiveServiceHtmlV523(service, tool.note)}</span><span class="status-pill status-${escapeAttr(status)}">${escapeHtml(STATUS_LABELS[status] || g3ExecutionStatusLabelV282(status))}</span></div>
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
  if (!channels.length) return allMatches.length ? "" : g4FiveToolCardHtmlV523({ ...tool, fullTitle: true }, "aware", context.productId);
  return channels.map((channel, index) => {
    const key = g4CampaignStateKey(context.productId, channel.key);
    context.renderedCampaigns.add(key);
    const html = g4CampaignRowHtml(channel, context.campaigns[key], index, context.productId);
    return `<div class="g4five-campaign-host-v523${tool.protected ? " g4five-protected-v523" : ""}" data-g4five-channel-v523="${escapeAttr(channel.key)}" data-g4five-tool-v523="${escapeAttr(tool.id)}">${g4FiveDisplayCampaignHtmlV523(html, tool)}</div>`;
  }).join("");
}

function g4FiveAwareBlockHtmlV544(block, number, content) {
  return `<section class="g4five-aware-block-v544" data-g4five-aware-block-v544="${escapeAttr(block.id)}">
    <header class="g4five-aware-block-head-v544"><span aria-hidden="true">${number}</span><h4>${escapeHtml(block.title)}</h4></header>
    <div class="g4five-aware-block-content-v544">${content}</div>
  </section>`;
}

function g4FiveAwareHtmlV544(context, product) {
  const tools = new Map(G4_FIVE_A_PRODUCT_CHANNELS_V523.aware.map((tool) => [tool.id, tool]));
  const groupedIds = new Set(G4_FIVE_A_AWARE_BLOCKS_V544.flatMap((block) => block.toolIds));
  return G4_FIVE_A_AWARE_BLOCKS_V544.map((block, index) => {
    const toolIds = block.id === "paid_social"
      ? [...block.toolIds, ...[...tools.keys()].filter((id) => !groupedIds.has(id))]
      : block.toolIds;
    const cards = toolIds.map((id) => tools.get(id))
      .filter(Boolean).map((tool) => g4FiveCampaignHtmlV523(context, tool)).join("");
    const content = block.id === "content_smm"
      ? g4ProductSmmStrategyHtmlV523(product) + cards : cards;
    return g4FiveAwareBlockHtmlV544(block, index + 1, content);
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
  const preparation = `<section class="g4five-preparation-v523" data-g4five-preparation-v523 data-product-id="${escapeAttr(productId)}"><header><span>0</span><h3>Подготовка к запуску</h3></header>${g4FunnelReadinessGroupHtmlV294("preparation", cards, product, snapshot)}</section>`;
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
      if (g4FiveServiceRequiredV523(channels, (channel) => /seo|вебмастер/i.test(g4FiveChannelTextV523(channel)))) content += g4FiveLinkedToolHtmlV523(context, "seo", "ask", "SEO / Страницы сайта · Яндекс Вебмастер", "Яндекс Вебмастер", "", { channels: [] });
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
      </section>
      <section class="guru-gate-scope-v230" data-gate-scope="product">
        ${gate0SectionHeadingHtml("Продукт / Услуга", "Селектор и стратегическая основа относятся к выбранной позиции каталога.")}
        ${guruV194ProductSelectHtml("gate4-launch")}
        ${product ? guruStrategicFoundationHtmlV237(product) : ""}
        ${g4FiveProductHtmlV523(product)}
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
  if (title && tool) title.textContent = `${tool.title} · ${service}`;
  if (caption) caption.textContent = service;
  input.classList.toggle("is-empty", !input.value.trim());
  input.classList.toggle("is-filled", Boolean(input.value.trim()));
  flashSaving();
});
window.GURU_GATE4_FIVE_A_BUILD = new URL(document.currentScript?.src || "gate4-five-a.js", location.href).searchParams.get("v") || "dev";
