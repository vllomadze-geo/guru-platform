/* Paid social workspace. Reads Gate 0 and organic SMM; owns only gate4PaidSmmV1. */
const G4_PAID_SMM_PLATFORMS_V1 = Object.freeze({
  vk: { label: "VK Реклама", note: "Аудитория → размещения → креатив → запуск", formats: ["Короткое видео", "Изображение", "Карусель", "Универсальная запись", "Другой формат"] },
  telegram: { label: "Telegram Ads", note: "Канал или бот → sponsored message → показы", formats: ["Sponsored message"] },
  meta: { label: "Meta Ads", note: "Campaign → Ad Set → Ad → проверка", formats: ["Изображение", "Видео", "Карусель", "Reels", "Stories", "Другой формат"] },
});

const G4_PAID_SMM_STAGES_V1 = Object.freeze({
  vk: [
    { id: "goal", title: "Цель и объект продвижения", fields: [
      ["campaignGoal", "Цель кампании", "text", true],
      ["promotionObject", "Объект продвижения", "text", true],
      ["targetAction", "Целевое действие", "text", true],
      ["landingUrl", "Landing / URL", "url", true],
    ] },
    { id: "audience", title: "Аудитория и таргетинг", fields: [
      ["segmentRef", "Сегмент из Gate 0", "source:segments", true],
      ["geography", "География", "text", true],
      ["age", "Возраст", "text", true],
      ["gender", "Пол", "select:Любой|Женский|Мужской", true],
      ["interests", "Интересы", "text"],
      ["keyPhrases", "Ключевые фразы", "text"],
      ["communities", "Сообщества", "text"],
      ["retargeting", "Ретаргетинг", "text"],
    ] },
    { id: "placements", title: "Размещения", fields: [
      ["placementMode", "Выбор размещений", "select:Автоматический|Ручной", true],
      ["placements", "Размещения из текущего кабинета", "textarea", true],
    ] },
    { id: "format", title: "Рекламный формат", fields: [
      ["adFormat", "Формат", "format", true],
      ["formatNotes", "Особенности формата", "text"],
    ] },
    { id: "creative", title: "Креатив и оффер", fields: [
      ["creativeCardId", "Рекламная идея / креатив", "creative", true],
      ["jtbdRef", "JTBD из Gate 0", "source:jtbd"],
      ["positioningRef", "Позиционирование из Gate 0", "source:positioning"],
      ["uspRef", "УТП из Gate 0", "source:usp"],
      ["offerRef", "Оффер из Gate 0", "source:offers", true],
      ["ctaRef", "CTA из Gate 0", "source:cta", true],
    ] },
    { id: "budget", title: "Бюджет и стратегия", fields: [
      ["budget", "Бюджет, ₽", "number", true],
      ["periodStart", "Начало периода", "date", true],
      ["periodEnd", "Конец периода", "date", true],
      ["biddingStrategy", "Стратегия", "text", true],
      ["optimization", "Оптимизация", "text", true],
      ["bidCap", "Ставка / ограничение стоимости", "number"],
    ] },
    { id: "review", title: "Проверка и модерация", fields: [
      ["labeling", "Маркировка", "text", true],
      ["policyChecked", "Соответствие требованиям проверено", "checkbox", true],
      ["requiredChecked", "Обязательные поля проверены", "checkbox", true],
      ["moderationStatus", "Модерация", "select:Не отправлено|На модерации|Одобрено|Отклонено", true],
    ] },
    { id: "launch", title: "Запуск", fields: [
      ["launchStatus", "Статус запуска", "launch"],
      ["launchDate", "Дата фактического запуска", "date"],
    ] },
    { id: "analytics", title: "Аналитика и оптимизация", fields: [
      ["impressions", "Показы", "number"], ["clicks", "Клики", "number"],
      ["leads", "Лиды", "number"], ["spend", "Расход, ₽", "number"],
      ["conclusion", "Вывод", "textarea"], ["nextAdjustment", "Следующая корректировка", "textarea"],
    ] },
  ],
  telegram: [
    { id: "object", title: "Объект продвижения", fields: [
      ["objectType", "Канал или бот", "select:Канал|Бот", true],
      ["telegramUrl", "Ссылка t.me", "text", true],
      ["campaignGoal", "Цель продвижения", "text", true],
    ] },
    { id: "message", title: "Сообщение", fields: [
      ["creativeCardId", "Sponsored message · карточка креатива", "creative", true],
      ["offerRef", "Оффер из Gate 0", "source:offers"],
      ["ctaRef", "CTA из Gate 0", "source:cta"],
    ] },
    { id: "targeting", title: "Таргетинг", fields: [
      ["channelTargets", "Каналы показа", "textarea", true],
      ["segmentRef", "Сегмент из Gate 0", "source:segments"],
      ["languages", "Языки, если доступны", "text"],
      ["geography", "География, если доступна", "text"],
      ["topics", "Тематики / аудитории из кабинета", "text"],
    ] },
    { id: "budget", title: "Бюджет", fields: [
      ["cpm", "CPM", "number", true], ["budget", "Общий бюджет", "number", true],
      ["limits", "Лимиты", "text"], ["periodStart", "Начало периода", "date", true],
      ["periodEnd", "Конец периода", "date", true],
    ] },
    { id: "review", title: "Проверка", fields: [
      ["policyChecked", "Правила Telegram Ads проверены", "checkbox", true],
      ["requiredChecked", "Ссылка, текст и ограничения проверены", "checkbox", true],
    ] },
    { id: "moderation", title: "Модерация", fields: [
      ["moderationStatus", "Результат модерации", "select:Не отправлено|На модерации|Одобрено|Отклонено", true],
      ["moderationComment", "Комментарий", "textarea"],
    ] },
    { id: "launch", title: "Запуск", fields: [
      ["launchStatus", "Статус запуска", "launch"], ["launchDate", "Дата фактического запуска", "date"],
    ] },
    { id: "analytics", title: "Статистика и оптимизация", fields: [
      ["impressions", "Impressions", "number"], ["views", "Views", "number"],
      ["clicks", "Clicks, если доступны", "number"], ["actualCpm", "Фактический CPM", "number"],
      ["spend", "Расход", "number"], ["transitions", "Переходы", "number"],
      ["subscriptions", "Подписки / целевое действие", "number"], ["conclusion", "Вывод", "textarea"],
    ] },
  ],
  meta: [
    { id: "campaign", title: "Campaign · цель кампании", fields: [
      ["campaignGoal", "Objective", "text", true], ["result", "Ожидаемый результат", "text", true],
      ["conversionLocation", "Conversion location", "text", true],
      ["jtbdRef", "JTBD из Gate 0", "source:jtbd"],
    ] },
    { id: "adset", title: "Ad Set · аудитория и бюджет", fields: [
      ["segmentRef", "Аудитория из Gate 0", "source:segments", true],
      ["geography", "География", "text", true], ["age", "Возраст", "text", true],
      ["budget", "Бюджет", "number", true], ["periodStart", "Начало", "date", true],
      ["periodEnd", "Окончание", "date", true], ["optimizationEvent", "Optimization event", "text", true],
    ] },
    { id: "placements", title: "Placements", fields: [
      ["placementMode", "Размещения", "select:Advantage+ placements|Ручной выбор", true],
      ["placements", "Feed / Reels / Stories / другие из кабинета", "text"],
    ] },
    { id: "creative", title: "Ad · креатив", fields: [
      ["creativeCardId", "Рекламный креатив", "creative", true],
      ["offerRef", "Оффер из Gate 0", "source:offers", true],
      ["ctaRef", "CTA из Gate 0", "source:cta", true],
    ] },
    { id: "tracking", title: "Tracking", fields: [
      ["dataset", "Pixel / Dataset / Conversion API при наличии", "text"],
      ["utm", "UTM", "text"],
    ] },
    { id: "review", title: "Review", fields: [
      ["policyChecked", "Policy проверена", "checkbox", true],
      ["previewChecked", "Preview placements проверен", "checkbox", true],
    ] },
    { id: "launch", title: "Launch", fields: [
      ["launchStatus", "Статус запуска", "launch"], ["launchDate", "Дата фактического запуска", "date"],
    ] },
    { id: "optimization", title: "A/B test и optimization", fields: [
      ["creativeTest", "Creative test", "text"], ["audienceTest", "Audience test", "text"],
      ["placementTest", "Placement test", "text"], ["results", "Результаты", "textarea"],
      ["conclusion", "Выводы", "textarea"],
    ] },
  ],
});

function g4PaidSmmStoreV1(productId, workspace = state, create = false) {
  const id = guruV185Text(productId);
  if (!id || !workspace?.project) return null;
  if (!create) return workspace.gate4PaidSmmV1?.byProduct?.[id] || null;
  const root = workspace.gate4PaidSmmV1 ||= { version: 1, byProduct: {} };
  root.byProduct ||= {};
  const product = g4SmmProductReadOnlyV299(id, workspace);
  const bucket = root.byProduct[id] ||= {
    productId: id, categoryId: megaPlatformProductCategoryId(product || id, workspace),
    selectedPlatform: "vk", platforms: {}, creativeCards: [],
  };
  bucket.productId = id;
  bucket.categoryId = megaPlatformProductCategoryId(product || id, workspace);
  bucket.platforms ||= {};
  bucket.creativeCards ||= [];
  return bucket;
}

function g4PaidSmmSourceOptionsV1(product, kind, workspace = state) {
  if (kind === "cta") {
    return guruStrategicCtaChoicesV1("product", product?.id, workspace, { dedupe: false })
      .map((choice) => ({ id: choice.id, scope: choice.scope,
        value: `${choice.label} · ${choice.value}` }));
  }
  const resolved = g4SmmScopedRecordsReadOnlyV299(product, kind, workspace);
  return resolved.records.map((record) => ({
    id: record.id,
    scope: resolved.scope,
    value: guruV185Text(record.value) ||
      (kind === "offers" ? guruV194OfferParts(record).rational : ""),
  })).filter((item) => item.value);
}

function g4PaidSmmOrganicOptionsV1(productId, workspace = state) {
  const bucket = workspace.gate4ProductSmmV523?.byProduct?.[productId];
  if (!bucket) return [];
  return (bucket.content?.ideas || []).map((idea) => {
    const format = (bucket.strategy?.formats || []).find((item) => item.id === idea.primaryTaskFormatId);
    const topic = (bucket.strategy?.topics || []).find((item) => item.id === idea.topicId);
    const publication = (bucket.content?.publications || []).find((item) =>
      item.id === idea.publicationId || item.sourceIdeaId === idea.id);
    return { id: idea.id, name: guruV185Text(idea.name) || guruV185Text(idea.insight) || "Идея",
      format: guruV185Text(format?.format), topic: guruV185Text(topic?.value),
      media: guruV185Text(publication?.link || publication?.publicationPackage?.cover || publication?.creativeBrief?.storyboard),
      ideaText: guruV185Text(idea.insight || idea.digestionNotes),
    };
  });
}

/* Resolve inherited values on read. Manual values stay in this workspace;
   Gate 0 and existing product campaigns remain the source of truth. */
function g4PaidSmmProductUrlReadOnlyV1(product, workspace = state) {
  const card = workspace?.gates?.find((gate) => gate.id === "gate-0")?.cards
    ?.find((item) => item?.megaMarketing?.platformV2?.urlsV1?.products?.[product?.id]);
  return guruV185Text(card?.megaMarketing?.platformV2?.urlsV1?.products?.[product?.id]);
}

function g4PaidSmmUpstreamV1(product, platform, workspace = state) {
  const sources = {};
  const values = {};
  const add = (key, value, origin) => {
    const text = guruV185Text(value);
    if (text && !values[key]) { values[key] = text; sources[key] = origin; }
  };
  add("promotionObject", product?.name, "Выбранный продукт");
  const url = g4PaidSmmProductUrlReadOnlyV1(product, workspace);
  if (platform !== "telegram") add("landingUrl", url, "Gate 0 · URL продукта");
  if (platform === "meta" && url) add("conversionLocation", "Website", "Gate 0 · URL продукта");
  const cta = g4PaidSmmSourceOptionsV1(product, "cta", workspace)[0];
  if (cta) add("targetAction", cta.value.replace(/^(?:Основной|Вторичный|Альтернативный) · /, ""), "Gate 0 · CTA продукта");
  const gate0 = workspace?.gates?.find((gate) => gate.id === "gate-0");
  const channels = gate0?.cards?.find((card) => Array.isArray(card?.megaMarketing?.channels))?.megaMarketing?.channels || [];
  const matches = {
    vk: /(?:vk|вк|вконтакте).*?(?:ads|таргет|реклама)/i,
    telegram: /telegram.*ads|телеграм.*реклам/i,
    meta: /meta.*ads|facebook.*ads/i,
  };
  const campaignStore = workspace?.gate4Production?.campaigns || {};
  const campaignKeyMatches = {
    vk: /(?:vk|вк|вконтакте).*?(?:ads|реклама|таргет)/i,
    telegram: /telegram.*ads|телеграм.*реклам/i,
    meta: /meta.*ads|facebook.*ads/i,
  };
  channels.forEach((channel, index) => {
    const descriptor = [channel.channel, channel.platform, channel.type].filter(Boolean).join(" ");
    if (!matches[platform].test(descriptor)) return;
    const rawKey = g4LaunchChannelKey(channel, index);
    const canonicalKey = g4CampaignCanonicalChannelV301({ ...channel, key: rawKey }, index).key;
    const directKeys = [g4CampaignStateKey(product.id, canonicalKey),
      g4CampaignStateKey(product.id, rawKey)];
    const campaign = Object.entries(campaignStore)
      .filter(([key, item]) => item?.product === product.id &&
        (directKeys.includes(key) || campaignKeyMatches[platform].test(key)))
      .map(([key, item]) => ({ key, item }))
      .sort((left, right) => {
        const score = (item) => [item.objective, item.budget, item.landing,
          item.channelTargeting?.geography, item.channelTargeting?.age].filter(Boolean).length;
        return score(right.item) - score(left.item) ||
          Number(directKeys.includes(right.key)) - Number(directKeys.includes(left.key));
      })[0]?.item;
    if (!campaign || campaign.product !== product.id) return;
    const origin = "Gate 4 · кампания выбранного продукта";
    add("campaignGoal", campaign.objective, origin);
    add("geography", campaign.channelTargeting?.geography, origin);
    add("age", campaign.channelTargeting?.age, origin);
    const gender = { all: "Любой", any: "Любой", female: "Женский", male: "Мужской" }
      [guruV185Text(campaign.channelTargeting?.gender).toLowerCase()] || campaign.channelTargeting?.gender;
    if (["Любой", "Женский", "Мужской"].includes(gender)) add("gender", gender, origin);
    add("interests", campaign.channelTargeting?.interests, origin);
    add("keyPhrases", campaign.channelTargeting?.searchQueries, origin);
    add("communities", campaign.channelTargeting?.communities, origin);
    add("retargeting", campaign.channelTargeting?.siteVisitors, origin);
    if (/^\d+(?:[.,]\d+)?$/.test(guruV185Text(campaign.budget)))
      add("budget", campaign.budget, origin);
    if (platform !== "telegram") add("landingUrl", campaign.landing, origin);
    if (platform === "telegram") add("telegramUrl", campaign.landing, origin);
    if (platform === "meta") add("utm", campaign.utmTemplate || campaign.utm, origin);
  });
  return { values, sources };
}

function g4PaidSmmEffectiveFieldsV1(product, platform, config, bucket, workspace = state) {
  const inherited = g4PaidSmmUpstreamV1(product, platform, workspace);
  const fields = { ...inherited.values, ...Object.fromEntries(Object.entries(config.fields || {})
    .filter(([, value]) => value !== "" && value !== null && value !== undefined)) };
  for (const stage of G4_PAID_SMM_STAGES_V1[platform]) for (const [key, , type] of stage.fields) {
    if (type.startsWith("source:")) {
      const options = g4PaidSmmSourceOptionsV1(product, type.slice(7), workspace);
      if (!fields[key]) fields[key] = options[0]?.id || "";
    }
  }
  const cards = (bucket.creativeCards || []).filter((card) => card.platform === platform);
  if (!fields.creativeCardId && cards.length === 1) fields.creativeCardId = cards[0].id;
  if (platform === "vk" && !fields.adFormat && fields.creativeCardId)
    fields.adFormat = cards.find((card) => card.id === fields.creativeCardId)?.format || "";
  return { fields, sources: inherited.sources };
}

function g4PaidSmmFieldValidV1(key, value, fields) {
  if (value === true) return true;
  const text = String(value ?? "").trim();
  if (!text) return false;
  if (["budget", "cpm"].includes(key)) return Number(text) > 0;
  if (key === "telegramUrl") return /^(?:https?:\/\/)?(?:t\.me\/|@)[\w/]+$/i.test(text);
  if (key === "landingUrl") return /^https?:\/\/\S+\.\S+/i.test(text);
  if (key === "periodEnd") return !fields.periodStart || text >= fields.periodStart;
  if (key === "placements" && fields.placementMode === "Advantage+ placements") return true;
  return true;
}

function g4PaidSmmCreativeValidV1(card, platform, config = {}, bucket = null, effective = null) {
  const product = g4SmmProductReadOnlyV299(card?.productId || bucket?.productId);
  const fields = effective?.fields || (product ? g4PaidSmmEffectiveFieldsV1(product, platform, config,
    bucket || { creativeCards: [] }).fields : config.fields || {});
  if (!card || !["Готово", "Запущено"].includes(card.status) ||
      !G4_PAID_SMM_PLATFORMS_V1[platform].formats.includes(card.format) ||
      !guruV185Text(card.text) || !(Number(card.budget) > 0)) return false;
  if (platform === "telegram") {
    return Array.from(String(card.text)).length <= 160 &&
      g4PaidSmmFieldValidV1("telegramUrl", fields.telegramUrl, {});
  }
  return Boolean(guruV185Text(card.asset) && guruV185Text(card.headline) &&
    g4PaidSmmFieldValidV1("landingUrl", card.destination || fields.landingUrl, {}));
}

function g4PaidSmmStageStatusV1(platform, stage, config, bucket, effective = null) {
  const product = g4SmmProductReadOnlyV299(bucket.productId);
  const fields = effective?.fields || (product ? g4PaidSmmEffectiveFieldsV1(product, platform, config, bucket).fields
    : config.fields || {});
  if (platform === "meta" && config.legalUnavailable && stage.id === "launch") return "Юридически недоступно";
  const override = config.stageOverrides?.[stage.id];
  if (override && override !== "Авто") return override;
  if (stage.id === "launch") {
    if (fields.launchStatus && !g4PaidSmmCanReadyV1(platform, config, bucket, effective))
      return "Требует внимания";
    if (fields.launchStatus === "Запущено" && fields.launchDate) return "Запущено";
    if (fields.launchStatus === "Готово к запуску") return "Готово";
    return "Не начато";
  }
  if (stage.id === "analytics" || stage.id === "optimization") {
    const core = stage.id === "optimization" ? ["results", "conclusion"]
      : ["impressions", "spend", "conclusion"];
    if (core.every((key) => g4PaidSmmFieldValidV1(key, fields[key], fields))) return "Готово";
    return stage.fields.some(([key]) => g4PaidSmmFieldValidV1(key, fields[key], fields)) ? "В работе" : "Не начато";
  }
  if (stage.id === "tracking") {
    return fields.dataset || fields.utm ? "Готово" : "Не требуется";
  }
  if (stage.id === "placements" && platform === "meta" &&
      fields.placementMode === "Ручной выбор" && !guruV185Text(fields.placements))
    return "В работе";
  const moderationStage = stage.id === "moderation" || platform === "vk" && stage.id === "review";
  if (moderationStage && fields.moderationStatus === "Отклонено") return "Отклонено";
  if (moderationStage && fields.moderationStatus === "На модерации") return "На модерации";
  const required = stage.fields.filter((field) => field[3]);
  const filled = required.filter(([key, , type]) => g4PaidSmmFieldValidV1(key, fields[key], fields) &&
    (!type.startsWith("source:") || g4PaidSmmSourceOptionsV1(product, type.slice(7))
      .some((item) => item.id === fields[key])) &&
    (key !== "creativeCardId" || bucket.creativeCards.some((card) =>
      card.id === fields[key] && card.platform === platform && g4PaidSmmCreativeValidV1(card, platform, config, bucket, effective))));
  if (stage.id === "placements" && platform === "meta" && fields.placementMode === "Advantage+ placements")
    return "Готово";
  if (required.length && filled.length === required.length &&
      (!moderationStage || fields.moderationStatus === "Одобрено")) return "Готово";
  return stage.fields.some(([key]) => g4PaidSmmFieldValidV1(key, fields[key], fields)) ? "В работе" : "Не начато";
}

function g4PaidSmmCanReadyV1(platform, config, bucket, effective = null) {
  if (platform === "meta" && config.legalUnavailable) return false;
  return G4_PAID_SMM_STAGES_V1[platform].filter((stage) =>
    !["launch", "analytics", "optimization"].includes(stage.id)).every((stage) => {
    const status = g4PaidSmmStageStatusV1(platform, stage, config, bucket, effective);
    return stage.fields.some((field) => field[3]) ? status === "Готово"
      : ["Готово", "Не требуется"].includes(status);
  });
}

function g4PaidSmmVkPlacementsV1() {
  const gate0 = state?.gates?.find((gate) => gate.id === "gate-0");
  const channels = gate0?.cards?.find((card) => Array.isArray(card?.megaMarketing?.channels))
    ?.megaMarketing?.channels || [];
  return channels.filter((channel) => /(?:vk|вк|вконтакте).*?(?:ads|таргет|реклама)/i
    .test([channel.channel, channel.platform, channel.type].join(" "))).flatMap((channel) => {
    const placements = channel.availablePlacements || channel.adPlacements ||
      channel.placements || channel.placement || [];
    return Array.isArray(placements) ? placements
      : placements && typeof placements === "object" ? Object.values(placements) : [placements];
  }).map((item) => guruV185Text(item?.name || item)).filter(Boolean);
}

function g4PaidSmmOptionHtmlV1(options, selected) {
  return options.map(([value, label]) => '<option value="' + escapeAttr(value) + '"' +
    (String(value) === String(selected ?? "") ? " selected" : "") + '>' + escapeHtml(label) + '</option>').join("");
}

function g4PaidSmmSourceLabelV1(scope) {
  return { product: "продукт", category: "категория", project: "проект" }[scope] || "Gate 0";
}

function g4PaidSmmFieldHtmlV1(product, platform, field, config, bucket, effective) {
  const [key, label, type, required] = field;
  const value = effective.fields[key] ?? "";
  const name = 'data-g4-paid-field-v1="' + escapeAttr(key) + '"';
  let control = "";
  if (type.startsWith("source:")) {
    const options = g4PaidSmmSourceOptionsV1(product, type.slice(7));
    const missing = value && !options.some((option) => option.id === value);
    control = '<select ' + name + '>' + g4PaidSmmOptionHtmlV1([["", "Выбрать из Gate 0"],
      ...(missing ? [[value, "Источник удалён · выберите заново"]] : []),
      ...options.map((option) => [option.id, option.value])], value) + '</select>';
  } else if (type === "creative") {
    const cards = bucket.creativeCards.filter((card) => card.platform === platform);
    control = '<select ' + name + '>' + g4PaidSmmOptionHtmlV1([["", "Выбрать карточку"],
      ...cards.map((card) => [card.id, card.headline || card.text || card.format || "Креатив"])], value) + '</select>';
  } else if (type === "format") {
    control = '<select ' + name + '>' + g4PaidSmmOptionHtmlV1([["", "Выбрать формат"],
      ...G4_PAID_SMM_PLATFORMS_V1[platform].formats.map((format) => [format, format])], value) + '</select>';
  } else if (type.startsWith("select:")) {
    const choices = type.slice(7).split("|");
    control = '<select ' + name + '>' + g4PaidSmmOptionHtmlV1([["", "Выбрать"],
      ...choices.map((choice) => [choice, choice])], value) + '</select>';
  } else if (type === "launch") {
    control = '<select ' + name + '>' + g4PaidSmmOptionHtmlV1([["", "Не начато"],
      ["Готово к запуску", "Готово к запуску"], ["Запущено", "Запущено"], ["Пауза", "Пауза"]], value) + '</select>';
  } else if (type === "checkbox") {
    control = '<input type="checkbox" ' + name + (value === true ? " checked" : "") + '>';
  } else if (type === "textarea") {
    control = '<textarea ' + name + ' rows="2">' + escapeHtml(value) + '</textarea>';
  } else {
    control = '<input type="' + type + '" ' + name + (type === "number" ? ' min="0" step="any"' : "") +
      ' value="' + escapeAttr(value) + '">';
  }
  const invalid = required && value && (!g4PaidSmmFieldValidV1(key, value, effective.fields) ||
    type.startsWith("source:") && !g4PaidSmmSourceOptionsV1(product, type.slice(7))
      .some((item) => item.id === value));
  const origin = !config.fields?.[key] && value
    ? type.startsWith("source:") ? "Gate 0 · " + g4PaidSmmSourceLabelV1(
      g4PaidSmmSourceOptionsV1(product, type.slice(7)).find((item) => item.id === value)?.scope)
      : key === "creativeCardId" ? "Единственный креатив этой платформы"
        : key === "adFormat" ? "Выбранный рекламный креатив"
        : effective.sources[key] : "";
  return '<label class="g4-paid-field-v1' + (invalid ? " is-invalid" : "") + '"><span>' +
    escapeHtml(label) + (required ? ' <em>*</em>' : "") + '</span>' + control +
    (origin ? '<small class="g4-paid-origin-v1">↳ ' + escapeHtml(origin) + '</small>' : "") + '</label>';
}

function g4PaidSmmStageHtmlV1(product, platform, stage, index, config, bucket, open, effective) {
  const status = g4PaidSmmStageStatusV1(platform, stage, config, bucket, effective);
  const fields = stage.fields.map((field) => g4PaidSmmFieldHtmlV1(product, platform, field, config, bucket, effective)).join("");
  const currentVkPlacements = platform === "vk" && stage.id === "placements" ? g4PaidSmmVkPlacementsV1() : [];
  const vkPlacements = platform === "vk" && stage.id === "placements"
    ? '<p class="g4-paid-hint-v1">' + (currentVkPlacements.length
      ? 'Из текущей карты каналов: ' + escapeHtml([...new Set(currentVkPlacements)].join(", "))
      : 'В карте каналов нет списка размещений. Укажите доступные места из текущего кабинета VK Реклама.') +
      '</p>' : "";
  const telegramCard = platform === "telegram" && stage.id === "message"
    ? bucket.creativeCards.find((card) => card.id === config.fields?.creativeCardId) : null;
  const telegramLink = platform === "telegram" && stage.id === "message"
    ? '<p class="g4-paid-hint-v1" data-g4-paid-telegram-message-v1>Текст: ' +
      escapeHtml(telegramCard?.text || "выберите карточку креатива") +
      ' · ' + Array.from(String(telegramCard?.text || "")).length + ' / 160 символов. Ссылка: ' +
      escapeHtml(effective.fields.telegramUrl ||
        "укажите в этапе «Объект продвижения»") + '.</p>' : "";
  const metrics = platform === "vk" && stage.id === "analytics"
    ? '<p class="g4-paid-hint-v1">CTR: ' + (Number(config.fields.clicks) && Number(config.fields.impressions)
      ? (100 * Number(config.fields.clicks) / Number(config.fields.impressions)).toFixed(2) + "%" : "—") +
      ' · CPL / CPA: ' + (Number(config.fields.leads) && Number(config.fields.spend)
        ? (Number(config.fields.spend) / Number(config.fields.leads)).toFixed(2) + " ₽" : "—") + '</p>' : "";
  const action = stage.id === "launch"
    ? '<div class="g4-paid-launch-actions-v1"><button type="button" data-g4-paid-ready-v1' +
      (g4PaidSmmCanReadyV1(platform, config, bucket, effective) ? "" : " disabled") +
      '>Готово к запуску</button><button type="button" data-g4-paid-launched-v1' +
      (!g4PaidSmmCanReadyV1(platform, config, bucket, effective) || !config.fields.launchDate ? " disabled" : "") +
      '>Зафиксировать запуск</button></div>' +
      '<p class="g4-paid-hint-v1">Запуск выполняется в рекламном кабинете. Здесь фиксируются готовность и фактическая дата.</p>' +
      (!g4PaidSmmCanReadyV1(platform, config, bucket, effective)
        ? '<p class="g4-paid-hint-v1">Заполните обязательные этапы и подтвердите проверку. Для Meta снимите юридическое ограничение.</p>' : "")
    : "";
  const moderation = stage.id === "review" || stage.id === "moderation"
    ? '<p class="g4-paid-hint-v1">Фактический статус модерации отмечается после проверки в рекламном кабинете.</p>' : "";
  const override = stage.id === "launch" ? "" :
    '<label class="g4-paid-field-v1 g4-paid-override-v1"><span>Статус этапа</span><select data-g4-paid-stage-override-v1="' +
      stage.id + '">' + g4PaidSmmOptionHtmlV1(["Авто", "Требует внимания", "Проблема", "Не требуется"]
        .map((item) => [item, item]), config.stageOverrides?.[stage.id] || "Авто") + '</select></label>';
  return '<details class="g4-paid-stage-v1" data-g4-paid-stage-v1="' + stage.id + '"' +
    (open ? " open" : "") + '><summary><span class="g4-paid-stage-number-v1">' + (index + 1) +
    '</span><strong>' + escapeHtml(stage.title) + '</strong><span class="g4-paid-status-v1">' +
    escapeHtml(status) + '</span><span aria-hidden="true">⌄</span></summary><div class="g4-paid-stage-body-v1">' +
    vkPlacements + telegramLink + '<div class="g4-paid-fields-v1">' + fields +
    '</div>' + metrics + moderation + override + action + '</div></details>';
}

function g4PaidSmmCreativeHtmlV1(product, platform, card, open, resolved = null) {
  const formats = G4_PAID_SMM_PLATFORMS_V1[platform].formats;
  const availableFormats = card.format && !formats.includes(card.format) ? [card.format, ...formats] : formats;
  const bucket = g4PaidSmmStoreV1(product.id) || { creativeCards: [] };
  const config = bucket.platforms?.[platform] || { fields: {} };
  const upstream = resolved || g4PaidSmmEffectiveFieldsV1(product, platform, config, bucket);
  const field = (key, label, type = "text") => {
    const fallback = key === "campaignGoal" ? upstream.fields.campaignGoal
      : key === "destination" ? upstream.fields.landingUrl : "";
    const value = card[key] || fallback || "";
    const attrs = 'data-g4-paid-card-field-v1="' + key + '"';
    const control = type === "textarea"
      ? '<textarea ' + attrs + (platform === "telegram" && key === "text" ? ' maxlength="160"' : "") +
        ' rows="2">' + escapeHtml(value) + '</textarea>'
      : type === "number" ? '<input ' + attrs + ' type="number" min="0" step="any" value="' + escapeAttr(value) + '">'
        : '<input ' + attrs + ' type="' + type + '" value="' + escapeAttr(value) + '">';
    return '<label class="g4-paid-field-v1"><span>' + label + '</span>' + control +
      (!card[key] && fallback ? '<small class="g4-paid-origin-v1">↳ ' +
        escapeHtml(upstream.sources[key === "destination" ? "landingUrl" : key] || "Выбранный продукт") + '</small>' : "") +
      (platform === "telegram" && key === "text"
        ? '<small data-g4-paid-card-count-v1>' + Array.from(String(value)).length + ' / 160</small>' : "") +
      '</label>';
  };
  const sourceSelect = (key, label, kind) => {
    const options = g4PaidSmmSourceOptionsV1(product, kind)
      .filter((item) => key !== "primaryCTARef" || item.id.includes("::"));
    const selected = card[key] || options[0]?.id || "";
    const missing = selected && !options.some((item) => item.id === selected);
    return '<label class="g4-paid-field-v1"><span>' + label +
      '</span><select data-g4-paid-card-field-v1="' + key + '">' +
      g4PaidSmmOptionHtmlV1([["", "Выбрать из Gate 0"],
        ...(missing ? [[selected, "Ранее выбранный CTA · источник недоступен"]] : []),
        ...options.map((item) => [item.id, item.value])], selected) + '</select>' +
      (!card[key] && selected ? '<small class="g4-paid-origin-v1">↳ Gate 0 · ' +
        g4PaidSmmSourceLabelV1(options[0]?.scope) + '</small>' : "") + '</label>';
  };
  return '<details class="g4-paid-creative-v1" data-g4-paid-card-v1="' + escapeAttr(card.id) + '"' +
    (open ? " open" : "") + '><summary><strong>' + escapeHtml(card.headline || card.text ||
      card.sourceSnapshot?.ideaText || "Новый креатив") + '</strong><span>' +
      escapeHtml(card.format || "Формат не выбран") + '</span><em>' +
      escapeHtml(card.status || "Не начато") + '</em><span aria-hidden="true">⌄</span></summary>' +
    '<div class="g4-paid-creative-body-v1">' +
    (card.sourceIdeaId ? '<p class="g4-paid-hint-v1">Из органической идеи: ' +
      escapeHtml([card.sourceSnapshot?.format, card.sourceSnapshot?.topic].filter(Boolean).join(" · ")) +
      (card.sourceSnapshot?.media ? ' · Медиа: ' + escapeHtml(card.sourceSnapshot.media) : "") + '</p>' : "") +
    '<div class="g4-paid-fields-v1">' +
    field("campaignGoal", "Цель кампании") +
    '<label class="g4-paid-field-v1"><span>Формат</span><select data-g4-paid-card-field-v1="format">' +
      g4PaidSmmOptionHtmlV1([["", "Выбрать формат"], ...availableFormats.map((item) => [item, item])], card.format) +
      '</select></label>' +
    field("creativeAngle", "Креативный угол") +
    sourceSelect("offerRef", "Оффер из Gate 0", "offers") +
    sourceSelect("primaryCTARef", "CTA из Gate 0", "cta") +
    (platform === "telegram" ? "" : field("asset", "Визуал / ссылка на файл")) +
    field("text", platform === "telegram" ? "Sponsored message · до 160 символов" : "Текст", "textarea") +
    (platform === "telegram" ? "" : field("headline", "Заголовок")) +
    (platform === "telegram"
      ? '<p class="g4-paid-hint-v1">Ссылка назначения берётся из этапа «Объект продвижения».</p>'
      : field("destination", "Destination URL")) +
    field("budget", "Бюджет", "number") +
    field("spend", "Потрачено", "number") +
    field("result", "Результат") +
    '<label class="g4-paid-field-v1"><span>Статус</span><select data-g4-paid-card-field-v1="status">' +
      g4PaidSmmOptionHtmlV1(["Не начато", "В работе", "Готово", "Требует внимания", "Проблема",
        "Не требуется", "На модерации", "Отклонено", "Запущено"].map((item) => [item, item]), card.status) +
    '</select></label></div><p class="g4-paid-hint-v1">Для статуса «Готово» нужны формат, текст, адрес, бюджет' +
    (platform === "telegram" ? " и соблюдение лимита 160 символов." : ", визуал и заголовок.") +
    '</p><button type="button" class="g4-paid-remove-v1" data-g4-paid-remove-v1="' +
    escapeAttr(card.id) + '">Удалить карточку</button></div></details>';
}

function g4PaidSmmPlatformHtmlV1(product, platform, bucket, workspace, ui = {}) {
  const productId = product.id;
  const config = bucket.platforms?.[platform] || { fields: {}, formatPlans: {} };
  const effective = g4PaidSmmEffectiveFieldsV1(product, platform, config, bucket, workspace);
  const stages = G4_PAID_SMM_STAGES_V1[platform];
  const readyStages = stages.filter((stage) =>
    ["Готово", "Запущено", "Не требуется"].includes(g4PaidSmmStageStatusV1(platform, stage, config, bucket, effective))).length;
  const cards = (bucket.creativeCards || []).filter((card) => card.platform === platform);
  const totalPlan = Object.values(config.formatPlans || {}).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
  const readyCards = cards.filter((card) => g4PaidSmmCreativeValidV1(card, platform, config, bucket, effective)).length;
  const launched = cards.filter((card) => card.status === "Запущено" &&
    g4PaidSmmCreativeValidV1(card, platform, config, bucket, effective)).length;
  const spent = cards.reduce((sum, card) => sum + (Number(card.spend) || 0), 0);
  const results = cards.map((card) => guruV185Text(card.result)).filter(Boolean).join(" · ");
  const formatRows = G4_PAID_SMM_PLATFORMS_V1[platform].formats.map((format) => {
    const matching = cards.filter((card) => card.format === format);
    const plan = Math.max(0, Number(config.formatPlans?.[format]) || 0);
    const completed = matching.filter((card) => g4PaidSmmCreativeValidV1(card, platform, config, bucket, effective)).length;
    const status = !plan && !matching.length ? "Не начато" : completed >= plan && plan ? "Готово" : "В работе";
    return '<div class="g4-paid-format-row-v1" data-g4-paid-format-row-v1="' + escapeAttr(format) + '">' +
      '<strong>' + escapeHtml(format) + '</strong><label>План <input type="number" min="0" data-g4-paid-plan-v1="' +
      escapeAttr(format) + '" value="' + plan + '" aria-label="План: ' + escapeAttr(format) + '"></label>' +
      '<span data-g4-paid-format-fact-v1>Готово: ' + completed + '</span>' +
      '<em data-g4-paid-format-status-v1>' + status + '</em>' +
      (matching.some((card) => card.creativeAngle) ? '<small>' +
        escapeHtml(matching.map((card) => card.creativeAngle).filter(Boolean).join(" · ")) + '</small>' : "") +
      '</div>';
  }).join("");
  const organic = g4PaidSmmOrganicOptionsV1(productId, workspace);
  const isOpen = ui.openPlatforms?.includes(platform) ?? bucket.openPlatforms?.includes(platform) ?? false;
  return '<details class="g4-paid-platform-v1" data-g4-paid-platform-v1="' + platform + '"' +
    (isOpen ? ' open' : '') + '><summary data-g4-paid-platform-toggle-v1><span class="g4-paid-platform-name-v1">' +
    escapeHtml(G4_PAID_SMM_PLATFORMS_V1[platform].label) + '<small>' +
    escapeHtml(G4_PAID_SMM_PLATFORMS_V1[platform].note) + '</small></span><span class="g4-paid-platform-count-v1">' +
    readyStages + ' / ' + stages.length + ' этапов</span><span aria-hidden="true">⌄</span></summary>' +
    '<div class="g4-paid-platform-body-v1">' +
    (platform === "meta" ? '<label class="g4-paid-legal-v1"><input type="checkbox" data-g4-paid-legal-v1' +
      (config.legalUnavailable ? " checked" : "") + '> Юридически недоступно</label>' : "") +
    '<div class="g4-paid-progress-v1"><strong>Готово ' + readyStages + ' из ' + stages.length +
    '</strong><progress max="' + stages.length + '" value="' + readyStages + '"></progress></div>' +
    '<div class="g4-paid-stages-v1">' + stages.map((stage, index) =>
      g4PaidSmmStageHtmlV1(product, platform, stage, index, config, bucket,
        ui.openStages?.[platform]?.includes(stage.id), effective)).join("") + '</div>' +
    '<details class="g4-paid-section-v1 g4-paid-formats-v1"' +
    (ui.openFormats?.includes(platform) ? ' open' : '') + '><summary>Форматы и план <span aria-hidden="true">⌄</span></summary>' +
    '<div class="g4-paid-format-list-v1">' + formatRows + '</div></details>' +
    '<section class="g4-paid-section-v1"><div class="g4-paid-section-head-v1"><h4>Карточки рекламных креативов · ' +
    cards.length + '</h4><button type="button" data-g4-paid-add-v1>+ Креатив</button></div>' +
    '<div class="g4-paid-import-v1"><label>Использовать идею из органического SMM<select data-g4-paid-organic-v1>' +
    g4PaidSmmOptionHtmlV1([["", "Выбрать идею"], ...organic.map((idea) => [idea.id, idea.name])], "") +
    '</select></label><button type="button" data-g4-paid-import-v1>Создать из идеи</button></div>' +
    '<div class="g4-paid-cards-v1">' + cards.map((card) =>
      g4PaidSmmCreativeHtmlV1(product, platform, card, ui.openCards?.[platform]?.includes(card.id), effective)).join("") +
    (cards.length ? "" : '<p class="g4-paid-hint-v1">Креативов пока нет.</p>') + '</div></section>' +
    '<section class="g4-paid-section-v1"><h4>План / факт</h4><div class="g4-paid-facts-v1">' +
    [["План креативов", totalPlan], ["Готово", readyCards], ["Запущено", launched],
      ["Потрачено", spent.toLocaleString("ru-RU") + " ₽"], ["Результат", results || "—"]]
      .map(([label, value]) => '<div><small>' + label + '</small><strong>' + escapeHtml(value) +
        '</strong></div>').join("") + '</div></section></div></details>';
}

function g4PaidSmmContextHtmlV1(product, workspace = state) {
  if (!guruV185Text(product?.id)) return "";
  const segment = g4PaidSmmSourceOptionsV1(product, "segments", workspace)[0]?.value;
  const offer = g4PaidSmmSourceOptionsV1(product, "offers", workspace)[0]?.value;
  const cta = (g4PaidSmmSourceOptionsV1(product, "cta", workspace)[0]?.value || "")
    .replace(/^(?:Основной|Вторичный|Альтернативный) · /, "");
  const url = g4PaidSmmProductUrlReadOnlyV1(product, workspace);
  const sourceRows = [["Сегмент", segment], ["Оффер", offer], ["Действие", cta], ["Страница", url]];
  return '<div class="g4-paid-context-v1"><div><small>Данные выбранного продукта · Gate 0</small><strong>' +
    escapeHtml(product.name || "Продукт") + '</strong></div><div class="g4-paid-context-rows-v1">' +
    sourceRows.map(([label, value]) => '<div><span>' + label + '</span><b>' +
      escapeHtml(value || "Нет источника") + '</b></div>').join("") + '</div></div>';
}

function g4PaidSmmPlatformRootHtmlV1(product, platform, workspace = state) {
  const productId = guruV185Text(product?.id);
  if (!productId || !G4_PAID_SMM_PLATFORMS_V1[platform]) return "";
  const bucket = g4PaidSmmStoreV1(productId, workspace) || {
    productId, platforms: {}, creativeCards: [],
  };
  return '<section class="g4-paid-smm-v1" data-g4-paid-smm-v1="' + escapeAttr(productId) + '">' +
    g4PaidSmmContextHtmlV1(product, workspace) +
    g4PaidSmmPlatformHtmlV1(product, platform, bucket, workspace, { openPlatforms: [platform] }) +
    '</section>';
}

function g4PaidSmmStrategyHtmlV1(product, workspace = state, ui = {}) {
  const productId = guruV185Text(product?.id);
  if (!productId) return "";
  const bucket = g4PaidSmmStoreV1(productId, workspace) || {
    productId, selectedPlatform: "vk", platforms: {}, creativeCards: [],
  };
  return '<section class="g4-paid-smm-v1" data-g4-paid-smm-v1="' + escapeAttr(productId) + '">' +
    g4PaidSmmContextHtmlV1(product, workspace) +
    Object.keys(G4_PAID_SMM_PLATFORMS_V1).map((platform) =>
      g4PaidSmmPlatformHtmlV1(product, platform, bucket, workspace, ui)).join("") + '</section>';
}

function g4PaidSmmRefreshV1(root, options = {}) {
  if (!root) return null;
  const productId = root.dataset.g4PaidSmmV1;
  const openPlatforms = [...root.querySelectorAll("[data-g4-paid-platform-v1][open]")]
    .map((node) => node.dataset.g4PaidPlatformV1);
  const openStages = {};
  const openCards = {};
  const openFormats = [];
  root.querySelectorAll("[data-g4-paid-platform-v1]").forEach((panel) => {
    const platform = panel.dataset.g4PaidPlatformV1;
    openStages[platform] = [...panel.querySelectorAll("[data-g4-paid-stage-v1][open]")]
      .map((node) => node.dataset.g4PaidStageV1);
    openCards[platform] = [...panel.querySelectorAll("[data-g4-paid-card-v1][open]")]
      .map((node) => node.dataset.g4PaidCardV1);
    if (panel.querySelector(".g4-paid-formats-v1[open]")) openFormats.push(platform);
  });
  const product = g4SmmProductReadOnlyV299(productId);
  if (!product) return root;
  const template = document.createElement("template");
  template.innerHTML = g4PaidSmmStrategyHtmlV1(product, state,
    { openPlatforms, openStages, openCards, openFormats, ...options });
  const replacement = template.content.firstElementChild;
  root.replaceWith(replacement);
  return replacement;
}

function g4PaidSmmRefreshPlatformV1(root, platform) {
  const panel = [...root.querySelectorAll("[data-g4-paid-platform-v1]")]
    .find((node) => node.dataset.g4PaidPlatformV1 === platform);
  const product = g4SmmProductReadOnlyV299(root.dataset.g4PaidSmmV1);
  if (!panel || !product) return panel;
  const bucket = g4PaidSmmStoreV1(product.id) || {
    productId: product.id, platforms: {}, creativeCards: [],
  };
  const ui = {
    openPlatforms: panel.open ? [platform] : [],
    openStages: { [platform]: [...panel.querySelectorAll("[data-g4-paid-stage-v1][open]")]
      .map((node) => node.dataset.g4PaidStageV1) },
    openCards: { [platform]: [...panel.querySelectorAll("[data-g4-paid-card-v1][open]")]
      .map((node) => node.dataset.g4PaidCardV1) },
    openFormats: panel.querySelector(".g4-paid-formats-v1[open]") ? [platform] : [],
  };
  const template = document.createElement("template");
  template.innerHTML = g4PaidSmmPlatformHtmlV1(product, platform, bucket, state, ui);
  const replacement = template.content.firstElementChild;
  panel.replaceWith(replacement);
  if (typeof g4FiveNavSyncPaidV545 === "function") g4FiveNavSyncPaidV545(replacement);
  return replacement;
}

function g4PaidSmmPersistV1() {
  if (typeof guruScheduleUiPreferenceSave === "function") guruScheduleUiPreferenceSave();
}

function g4PaidSmmUpdateSummaryV1(root, bucket, platform) {
  const config = bucket.platforms[platform];
  const stages = G4_PAID_SMM_STAGES_V1[platform];
  const product = g4SmmProductReadOnlyV299(bucket.productId);
  const effective = product ? g4PaidSmmEffectiveFieldsV1(product, platform, config, bucket)
    : { fields: config.fields };
  const fields = effective.fields;
  let ready = 0;
  stages.forEach((stage) => {
    const status = g4PaidSmmStageStatusV1(platform, stage, config, bucket, effective);
    if (["Готово", "Запущено", "Не требуется"].includes(status)) ready += 1;
    const node = root.querySelector('[data-g4-paid-stage-v1="' + stage.id + '"] .g4-paid-status-v1');
    if (node) node.textContent = status;
  });
  const progress = root.querySelector(".g4-paid-progress-v1");
  if (progress) {
    progress.querySelector("strong").textContent = "Готово " + ready + " из " + stages.length;
    progress.querySelector("progress").value = ready;
  }
  const canReady = g4PaidSmmCanReadyV1(platform, config, bucket, effective);
  const readyButton = root.querySelector("[data-g4-paid-ready-v1]");
  const launchedButton = root.querySelector("[data-g4-paid-launched-v1]");
  if (readyButton) readyButton.disabled = !canReady;
  if (launchedButton) launchedButton.disabled = !canReady || !fields.launchDate;
  const cards = bucket.creativeCards.filter((card) => card.platform === platform);
  if (platform === "telegram") {
    const message = cards.find((card) => card.id === config.fields.creativeCardId);
    const hint = root.querySelector("[data-g4-paid-telegram-message-v1]");
    if (hint) hint.textContent = "Текст: " + (message?.text || "выберите карточку креатива") +
      " · " + Array.from(String(message?.text || "")).length + " / 160 символов. Ссылка: " +
      (fields.telegramUrl || "укажите в этапе «Объект продвижения»") + ".";
  }
  cards.forEach((card) => {
    const panel = [...root.querySelectorAll("[data-g4-paid-card-v1]")]
      .find((node) => node.dataset.g4PaidCardV1 === card.id);
    if (!panel) return;
    panel.querySelector("summary strong").textContent = card.headline || card.text ||
      card.sourceSnapshot?.ideaText || "Новый креатив";
    panel.querySelector("summary em").textContent = card.status || "Не начато";
  });
  const formats = G4_PAID_SMM_PLATFORMS_V1[platform].formats;
  root.querySelectorAll("[data-g4-paid-format-row-v1]").forEach((row) => {
    const format = row.dataset.g4PaidFormatRowV1;
    const matching = cards.filter((card) => card.format === format);
    const plan = Number(config.formatPlans?.[format]) || 0;
    const completed = matching.filter((card) => g4PaidSmmCreativeValidV1(card, platform, config, bucket, effective)).length;
    row.querySelector("[data-g4-paid-format-fact-v1]").textContent = "Готово: " + completed;
    row.querySelector("[data-g4-paid-format-status-v1]").textContent = !plan && !matching.length ? "Не начато"
      : completed >= plan && plan ? "Готово" : "В работе";
  });
  const facts = root.querySelectorAll(".g4-paid-facts-v1 strong");
  const plan = Object.values(config.formatPlans || {}).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
  const values = [plan, cards.filter((card) => g4PaidSmmCreativeValidV1(card, platform, config, bucket, effective)).length,
    cards.filter((card) => card.status === "Запущено" && g4PaidSmmCreativeValidV1(card, platform, config, bucket, effective)).length,
    cards.reduce((sum, card) => sum + (Number(card.spend) || 0), 0).toLocaleString("ru-RU") + " ₽",
    cards.map((card) => guruV185Text(card.result)).filter(Boolean).join(" · ") || "—"];
  facts.forEach((node, index) => { node.textContent = values[index]; });
  const count = root.querySelector(".g4-paid-platform-count-v1");
  if (count) count.textContent = ready + " / " + stages.length + " этапов";
  if (typeof g4FiveNavSyncPaidV545 === "function") {
    const active = Object.values(config.fields || {}).some((value) => value !== "" && value !== false) || cards.length > 0;
    g4FiveNavSyncPaidV545(root, config.legalUnavailable ? "unavailable"
      : canReady ? "ready" : active ? "active" : "idle");
  }
}

function g4PaidSmmUpdateV1(event, rerender) {
  const target = event.target?.closest?.("[data-g4-paid-field-v1], [data-g4-paid-card-field-v1], [data-g4-paid-plan-v1], [data-g4-paid-legal-v1], [data-g4-paid-stage-override-v1]");
  const panel = target?.closest("[data-g4-paid-platform-v1]");
  const root = panel?.closest("[data-g4-paid-smm-v1]");
  if (!root || !panel) return;
  const bucket = g4PaidSmmStoreV1(root.dataset.g4PaidSmmV1, state, true);
  const platform = panel.dataset.g4PaidPlatformV1;
  const config = bucket.platforms[platform] ||= { fields: {}, formatPlans: {}, stageOverrides: {} };
  config.fields ||= {};
  config.formatPlans ||= {};
  config.stageOverrides ||= {};
  const value = target.type === "checkbox" ? target.checked : target.value;
  if (target.hasAttribute("data-g4-paid-legal-v1")) config.legalUnavailable = Boolean(value);
  else if (target.hasAttribute("data-g4-paid-stage-override-v1")) {
    config.stageOverrides[target.dataset.g4PaidStageOverrideV1] = value;
  }
  else if (target.hasAttribute("data-g4-paid-plan-v1")) {
    config.formatPlans[target.dataset.g4PaidPlanV1] = Math.max(0, Number(value) || 0);
  } else if (target.hasAttribute("data-g4-paid-card-field-v1")) {
    const card = bucket.creativeCards.find((item) => item.id === target.closest("[data-g4-paid-card-v1]")?.dataset.g4PaidCardV1);
    if (!card) return;
    if (target.dataset.g4PaidCardFieldV1 === "status" &&
      (value === "Готово" || value === "Запущено") &&
      (!g4PaidSmmCreativeValidV1({ ...card, status: value }, platform, config, bucket) ||
        value === "Запущено" && (config.legalUnavailable || config.fields.launchStatus !== "Запущено"))) {
      target.value = card.status || "Не начато";
      return;
    }
    card[target.dataset.g4PaidCardFieldV1] = value;
    card.updatedAt = new Date().toISOString();
  } else {
    if (target.dataset.g4PaidFieldV1 === "launchStatus" &&
      ["Готово к запуску", "Запущено"].includes(value) &&
      (!g4PaidSmmCanReadyV1(platform, config, bucket) ||
        value === "Запущено" && !config.fields.launchDate)) {
      target.value = config.fields.launchStatus || "";
      return;
    }
    config.fields[target.dataset.g4PaidFieldV1] = value;
  }
  if (platform === "telegram" && target.dataset.g4PaidCardFieldV1 === "text") {
    const counter = target.parentElement.querySelector("[data-g4-paid-card-count-v1]");
    if (counter) counter.textContent = Array.from(target.value).length + " / 160";
  }
  g4PaidSmmPersistV1();
  if (rerender && (target.tagName === "SELECT" || target.type === "checkbox"))
    g4PaidSmmRefreshPlatformV1(root, platform);
  else g4PaidSmmUpdateSummaryV1(panel, bucket, platform);
}

document.addEventListener("input", (event) => g4PaidSmmUpdateV1(event, false));
document.addEventListener("change", (event) => g4PaidSmmUpdateV1(event, true));
document.addEventListener("click", (event) => {
  const target = event.target?.closest?.("[data-g4-paid-platform-toggle-v1], [data-g4-paid-add-v1], [data-g4-paid-import-v1], [data-g4-paid-remove-v1], [data-g4-paid-ready-v1], [data-g4-paid-launched-v1]");
  const panel = target?.closest("[data-g4-paid-platform-v1]");
  const root = panel?.closest("[data-g4-paid-smm-v1]");
  if (!root || !panel) return;
  const productId = root.dataset.g4PaidSmmV1;
  const bucket = g4PaidSmmStoreV1(productId, state, true);
  const platform = panel.dataset.g4PaidPlatformV1;
  if (target.hasAttribute("data-g4-paid-platform-toggle-v1")) {
    const open = [...root.querySelectorAll("[data-g4-paid-platform-v1][open]")]
      .map((item) => item.dataset.g4PaidPlatformV1);
    bucket.openPlatforms = panel.open ? open.filter((item) => item !== platform) : [...open, platform];
    g4PaidSmmPersistV1();
    return;
  }
  const config = bucket.platforms[platform] ||= { fields: {}, formatPlans: {}, stageOverrides: {} };
  config.fields ||= {};
  let newCard = "";
  if (target.hasAttribute("data-g4-paid-add-v1") || target.hasAttribute("data-g4-paid-import-v1")) {
    const ideaId = target.hasAttribute("data-g4-paid-import-v1")
      ? panel.querySelector("[data-g4-paid-organic-v1]")?.value : "";
    const source = ideaId && g4PaidSmmOrganicOptionsV1(productId).find((idea) => idea.id === ideaId);
    if (target.hasAttribute("data-g4-paid-import-v1") && !source) return;
    const now = new Date().toISOString();
    const card = { id: makeId("g4-paid-creative"), productId, categoryId: bucket.categoryId, platform,
      campaignGoal: config.fields.campaignGoal || "", format: source?.format || "",
      creativeAngle: source?.topic || "", offerRef: "", primaryCTARef: "",
      asset: source?.media || "", text: source?.ideaText || "", headline: source?.name || "",
      destination: "", destinationRef: platform === "telegram" ? "telegramUrl" : "",
      budget: "", spend: "", result: "", status: "Не начато",
      sourceIdeaId: source?.id || "", sourceSnapshot: source
        ? { format: source.format, topic: source.topic, media: source.media, ideaText: source.ideaText }
        : null, createdAt: now, updatedAt: now };
    bucket.creativeCards.push(card);
    newCard = card.id;
  } else if (target.hasAttribute("data-g4-paid-remove-v1")) {
    const id = target.dataset.g4PaidRemoveV1;
    if (!window.confirm("Удалить рекламный креатив?")) return;
    bucket.creativeCards = bucket.creativeCards.filter((card) => card.id !== id);
    if (config.fields.creativeCardId === id) config.fields.creativeCardId = "";
  } else if (target.hasAttribute("data-g4-paid-ready-v1")) {
    if (!g4PaidSmmCanReadyV1(platform, config, bucket)) return;
    config.fields.launchStatus = "Готово к запуску";
  } else if (target.hasAttribute("data-g4-paid-launched-v1")) {
    if (!g4PaidSmmCanReadyV1(platform, config, bucket) || !config.fields.launchDate) return;
    config.fields.launchStatus = "Запущено";
  } else return;
  g4PaidSmmPersistV1();
  const refreshed = g4PaidSmmRefreshPlatformV1(root, platform);
  if (newCard) {
    const panel = [...refreshed.querySelectorAll("[data-g4-paid-card-v1]")]
      .find((node) => node.dataset.g4PaidCardV1 === newCard);
    if (panel) { panel.open = true; panel.scrollIntoView({ block: "nearest" }); }
  }
});
