/* Gate 2 product services and one canonical readiness list. */
const G2S4_DOC = Object.freeze({
  counter: "https://yandex.ru/support/metrica/ru/general/check-counter",
  goalCheck: "https://yandex.ru/support/metrica/ru/general/check-goal.html",
  goals: "https://yandex.ru/support/metrica/ru/general/goals",
  forms: "https://help-ru.tilda.cc/forms",
  vkGuide: "https://object2-ac.vk-apps.com/vk-education-0554ff56-27eb-4093-a702-685722cef6d9/media/ad/79ad8eafc5324d46a3c153cd5e9a2a32.pdf",
  vkCounter: "https://help-ru.tilda.cc/statistics/mail-ru",
});
const G2S4_PRODUCT_UNITS = ["landing", "productCounter", "productGoal", "productVk", "lead"];
function g2s4ProductUrl(productId, workspace = state) {
  return megaPlatformUrl("products", productId, workspace) || "";
}
function g2s4UrlContext({ product_id, workspace }) {
  const url = g2s4ProductUrl(product_id, workspace);
  return { label: `Адрес продукта из ${guruGateLabel("gate-0")}`, value: url || "URL не указан", href: url };
}
function g2s4CounterContext({ workspace }) {
  const id = g2MetrikaCompanyCounterV374(workspace);
  return { label: "ID счётчика компании", value: id || "ID не указан", href: "#g2-metrika-company-counter" };
}
function g2s4PixelContext({ workspace }) {
  const id = g2wValue(g2wDef("vk"), "", "pixelId", workspace);
  return { label: "ID пикселя компании", value: id || "ID не указан", href: "#g2sb-company-vk-company" };
}
function g2s4GoalContext({ product_id, workspace }) {
  const ref = g2wValue(g2wDef("productGoal"), product_id, "goalRefId", workspace);
  const goal = g2MetrikaCompanyGoalV374(ref, workspace);
  return { label: "ID цели компании", value: goal?.goalId || "Цель не выбрана",
    href: "#g2-metrika-company-goals" };
}
function g2s4GoalField({ product_id, workspace }) {
  const goals = g2MetrikaCompanyGoalsV374(workspace).filter((goal) => goal?.entryId && goal?.goalId);
  if (!goals.length) return `<p class="g2s4-empty">Цели компании пока не заданы. Добавьте цель в блоке «Яндекс Метрика · Компания».</p>`;
  const current = g2wValue(g2wDef("productGoal"), product_id, "goalRefId", workspace);
  return `<fieldset class="g2s4-goal-field"><legend>Цель Метрики</legend>${goals.map((goal) =>
    `<label><input type="radio" name="g2s4-goal-${escapeAttr(product_id)}" data-g2s4-goal-ref="${escapeAttr(product_id)}" value="${escapeAttr(goal.entryId)}" ${current === goal.entryId ? "checked" : ""}><span>${escapeHtml(goal.name || "Цель")} · ${escapeHtml(goal.goalId)}</span></label>`).join("")}</fieldset>${current && !goals.some((goal) => goal.entryId === current)
      ? '<p class="g2s4-empty">Ранее выбранная цель сейчас недоступна. Выберите цель из списка.</p>' : ""}`;
}
function g2s4Step(id, what, where, how, source_url = "", extra = {}) {
  return { step_id: id, what, where, how, source_url,
    helpUnconfirmed: !source_url, ...extra };
}
function g2s4WizardStatus(unitId) {
  return ({ product_id, workspace }) => g2wStatus(g2wDef(unitId), product_id, workspace);
}
function g2s4WizardApplicability(unitId) {
  return ({ product_id, workspace }) => g2wApplicability(g2wDef(unitId), product_id, workspace);
}

g2ServiceBlockRegister({
  id: "product-landing", cardId: "card-90", scope: "product", wizardUnitId: "landing",
  title: "Посадочная товара", serviceUrl: ({ product_id, workspace }) => g2s4ProductUrl(product_id, workspace),
  serviceLabel: "Открыть маршрут", serviceUnavailableLabel: "URL не указан",
  statusResolver: g2s4WizardStatus("landing"), gate0Applicability: g2s4WizardApplicability("landing"),
  steps: [
    g2s4Step("route", "Выберите маршрут трафика: сайт, мессенджер или нативная лид-форма.",
      "Список справа.", "Маршрут выбран.", "", { existingFields: ["route"] }),
    g2s4Step("url", `Адрес маршрута берётся из «Платформы» ${guruGateLabel("gate-0")}.`,
      `${guruGateLabel("gate-0")} → Платформа.`, "Адрес показан, иначе «URL не указан».", "", { context: g2s4UrlContext }),
    g2s4Step("open", "Откройте адрес в браузере.", "Кнопка «Проверить URL».",
      "Страница открывается.", "", { context: g2s4UrlContext,
        autoCheck: ({ product_id, workspace }) => Boolean(g2s4ProductUrl(product_id, workspace)) }),
    g2s4Step("mobile", "Откройте страницу на телефоне или в режиме эмуляции браузера.",
      "Телефон или инструменты разработчика браузера.", "Текст и кнопки читаются без горизонтальной прокрутки."),
    g2s4Step("cta", "Проверьте основной призыв к действию.", "Страница продукта.",
      "Кнопка или форма заметна и ведёт к целевому действию."),
    g2s4Step("action", "Выполните действие клиента: отправьте форму или нажмите кнопку.",
      "Страница продукта.", "Действие проходит без ошибки."),
  ],
});

g2ServiceBlockRegister({
  id: "product-vk", cardId: "g2-marketing-vk-ads", scope: "product", wizardUnitId: "productVk",
  title: "События VK Рекламы", serviceUrl: "https://ads.vk.com/",
  statusResolver: g2s4WizardStatus("productVk"), gate0Applicability: g2s4WizardApplicability("productVk"),
  steps: [
    g2s4Step("inherit", "Сверьте пиксель с блоком «VK Реклама и пиксель».",
      `${guruGateLabel("gate-2")} → Компания → «VK Реклама и пиксель» → шаг «Получите ID»; VK Реклама → «Конверсии» → «Пиксели» → выбранный пиксель.`,
      "ID в карточке продукта совпадает с ID пикселя компании и выбранного пикселя в VK.", G2S4_DOC.vkGuide,
      { context: g2s4PixelContext }),
    g2s4Step("event", "Выберите целевое событие продукта: отправка формы, покупка или другое действие.",
      "VK Реклама → «Конверсии» → «Пиксели» → выбранный пиксель → «События»; название сохраните в поле справа.",
      "Событие есть в списке выбранного пикселя и соответствует действию продукта.", G2S4_DOC.vkGuide,
      { existingFields: ["vkEvent"] }),
    g2s4Step("install", "Настройте передачу события. Для форм и корзины на Tilda используйте события установленного счётчика; для другого действия настройте событие в пикселе VK.",
      "Tilda → «Настройки сайта» → «Аналитика» → «MAIL.RU COUNTER ID (VK PIXEL)»; затем VK Реклама → «Конверсии» → «Пиксели» → выбранный пиксель → «События».",
      "Счётчик установлен на опубликованной странице продукта, условие события соответствует действию.", G2S4_DOC.vkCounter),
    g2s4Step("test", "На опубликованной странице продукта выполните целевое действие.",
      `${guruGateLabel("gate-0")} → Платформа → ссылка продукта → форма, корзина или нужная кнопка.`,
      "Действие завершилось успешно; зафиксируйте время теста.", G2S4_DOC.vkCounter,
      { context: g2s4UrlContext }),
    g2s4Step("report", "Проверьте регистрацию события в кабинете VK.",
      "VK Реклама → «Конверсии» → «Пиксели» → выбранный пиксель → «События»; для данных счётчика: top.mail.ru → «Мои счётчики» → Real-Time → «Обзор».",
      "После теста есть срабатывание нужного события; одно лишь введённое название или отметка шага не подтверждает передачу.", G2S4_DOC.vkCounter),
  ],
});

g2ServiceBlockRegister({
  id: "product-lead", cardId: "card-92", scope: "product", wizardUnitId: "lead",
  title: "Сквозная проверка заявки", serviceUrl: ({ product_id, workspace }) => g2s4ProductUrl(product_id, workspace),
  serviceLabel: "Открыть маршрут", serviceUnavailableLabel: "URL не указан",
  statusResolver: g2s4WizardStatus("lead"),
  gate0Applicability: ({ workspace }) => g2s3Applicability("CRM", "", workspace),
  steps: [
    g2s4Step("open", "Откройте страницу продукта.", "Адрес из «Платформы».",
      "Страница открыта.", "", { context: g2s4UrlContext }),
    g2s4Step("action", "Отправьте форму или совершите действие клиента.",
      "Страница продукта.", "Отправлено."),
    g2s4Step("receive", "Проверьте получение обращения в сервисе из блока «Приём заявок».",
      "Сервис заявок; в Tilda раздел «Заявки».", "Обращение получено.", G2S4_DOC.forms,
      { context: ({ workspace }) => ({ label: `Сервис заявок из ${guruGateLabel("gate-0")}`,
        value: g2s3CrmName(workspace) || `Не указан в ${guruGateLabel("gate-0")}`, href: "#g2sb-company-leads-company" }) }),
    g2s4Step("source", "Проверьте, что в обращении указаны источник и выбранный продукт.",
      "Заявка в сервисе.", "Поля заполнены."),
    g2s4Step("compare", "Сверьте событие в Метрике с фактическим обращением.",
      "Метрика → отчёты по целям.", "Количество совпадает.", G2S4_DOC.goalCheck),
  ],
});

const g2s4PreviousCardHtml = g2wCardHtml;
g2wCardHtml = function (def, productId = "") {
  if (def?.scope === "product" && G2S4_PRODUCT_UNITS.includes(def.id)) return "";
  return g2s4PreviousCardHtml.apply(this, arguments);
};
const g2s4PreviousValue = g2wValue;
g2wValue = function (def, productId, key, workspace = state) {
  if (def?.scope === "product" && key === "productUrl") return g2s4ProductUrl(productId, workspace);
  return g2s4PreviousValue.apply(this, arguments);
};
const g2s4PreviousFieldValid = g2wFieldValid;
g2wFieldValid = function (def, productId, key, workspace = state) {
  if (def?.id === "productGoal" && key === "goalRefId") {
    const goal = g2MetrikaCompanyGoalV374(g2wValue(def, productId, key, workspace), workspace);
    return Boolean(goal?.entryId && goal?.goalId);
  }
  return g2s4PreviousFieldValid.apply(this, arguments);
};
const g2s4PreviousApplicability = g2wApplicability;
g2wApplicability = function (def, productId = "", workspace = state) {
  if (def?.id === "productVk") {
    if (!productId) return "pending";
    return g2s3Applicability("VK Ads", "VK Ads", workspace);
  }
  if (def?.id === "lead" && g2s3Applicability("CRM", "", workspace) === "not_needed")
    return "not_needed";
  return g2s4PreviousApplicability.apply(this, arguments);
};
const g2s4PreviousInputs = g2wInputs;
g2wInputs = function (def, productId = "", workspace = state) {
  const original = g2s4PreviousInputs.apply(this, arguments);
  if (def?.scope !== "product") return original;
  return JSON.stringify([original, g2s4ProductUrl(productId, workspace),
    def.id === "lead" ? g2s3CrmName(workspace) : ""]);
};

document.addEventListener("change", (event) => {
  const target = event.target?.closest?.("[data-g2s4-goal-ref]");
  if (!target) return;
  const productId = target.dataset.g2s4GoalRef;
  const def = g2wDef("productGoal");
  if (!g2wCanEdit(def, productId)) return;
  g2wSetValue(def, productId, "goalRefId", target.value);
  g2wSave();
  g2wRefresh({ changedCardId: def.id, field: "goalRefId" });
  g2wRefreshProductSelectorIfNeeded(def.id, "goalRefId");
});

const G2S4_REPLACED = Object.freeze({
  "card-96": "Домен и HTTPS", "card-97": "Домен и HTTPS", "card-98": "Домен и HTTPS",
  "card-100": "Яндекс Метрика · счётчик", "g2-metrika-goals-traffic": "Яндекс Метрика · конверсионная цель",
  "card-101": "Яндекс Метрика · конверсионная цель", "card-102": "Яндекс Метрика · конверсионная цель",
  "g2-marketing-vk-ads": ["VK Реклама и пиксель", "События VK Рекламы"],
  "card-122": "Приём заявок", "card-123": "Приём заявок", "card-124": "Приём заявок", "card-126": "Приём заявок",
  "card-107": "Яндекс Вебмастер", "card-108": "Яндекс Вебмастер", "card-109": "Яндекс Вебмастер",
  "card-110": "Яндекс Вебмастер", "card-111": "Яндекс Вебмастер",
  "card-134": "Юридическая защита", "card-135": "Юридическая защита", "card-136": "Юридическая защита",
  "card-90": "Посадочная товара", "card-91": "Посадочная товара", "card-94": "Посадочная товара",
  "g2-metrika-product-counter": "Метрика продукта · визит",
  "g2-metrika-goals-primary": "Метрика продукта · цель", "card-92": "Сквозная проверка заявки",
  "g2-internal-filter": "Фильтр внутренних визитов",
  "g2-antibot": "Учёт роботов",
});
function g2s4ReplacementText(replacement) {
  return Array.isArray(replacement)
    ? `Заменено блоками ${replacement.map((title) => `«${title}»`).join(" и ")}`
    : `Заменено блоком «${replacement}»`;
}
const G2S4_CONTEXT_CARDS = Object.freeze({
  "product-landing": ["card-90", "card-91", "card-93", "card-94", "g2-cwv"],
  "product-lead": ["card-92"],
  "company-domain": ["card-96", "card-97", "card-98"],
  "company-counter": ["card-100", "card-103", "card-104", "g2-internal-filter", "g2-antibot",
    "g2-metrika-goals-traffic"],
  "company-goal": ["card-101", "card-102", "g2-metrika-goals-calls", "g2-metrika-goals-email",
    "g2-metrika-goals-widgets", "g2-metrika-goals-kpi"],
  "company-yandex-direct": ["card-105", "card-116", "card-117", "card-118", "card-119", "card-120",
    "card-132", "g2-marketing-yandex-direct"],
  "company-yandex-business": ["card-113", "card-114"],
  "company-leads": ["card-122", "card-123", "card-124", "card-126", "card-127", "card-128", "card-129", "card-131"],
  "company-safety": ["card-134", "card-135", "card-136"],
  "company-ga4": ["g2-marketing-ga4"],
  "company-gsc": ["g2-marketing-gsc"],
  "company-google-ads": ["g2-marketing-google-ads"],
  "company-meta-ads": ["g2-marketing-meta-ads"],
  "company-telegram-ads": ["g2-marketing-telegram-ads"],
});
function g2s4ContextBody(workspace, unitId) {
  return ["company-counter", "company-goal"].includes(unitId)
    ? workspace.querySelector(`[data-g2w-card-view="${unitId.slice(8)}"] > .g2w-card-body`)
    : workspace.querySelector(`[data-g2sb-id="${unitId}"] > .g2sb-body`);
}
function g2s4MoveLegacyCards() {
  const workspace = document.querySelector(".g2w-workspace");
  if (!workspace || activeGateId !== "gate-2") return;
  for (const [unitId, cardIds] of Object.entries(G2S4_CONTEXT_CARDS)) {
    const body = g2s4ContextBody(workspace, unitId);
    if (!body) continue;
    let related = null;
    for (const cardId of cardIds) {
      const card = workspace.querySelector(`.g2w-additional [data-card="${CSS.escape(cardId)}"]`);
      if (!card) continue;
      if (!related) {
        related = document.createElement("details");
        related.className = "g2s4-related g2u-related";
        related.innerHTML = "<summary>Связанные настройки</summary>";
        body.append(related);
      }
      related.append(card);
    }
  }
  for (const [scope, anchorSelector] of [
    ["company", '[data-g2w-card-view="goal"]'],
    ["product", '[data-g2sb-id="product-goal"]'],
  ]) {
    const section = workspace.querySelector(`.g2w-additional [data-g2-metrika-quality-section-v360="${scope}"]`);
    const anchor = workspace.querySelector(anchorSelector);
    if (section && anchor) {
      anchor.insertAdjacentElement("afterend", section);
      const button = section.querySelector(":scope > [data-g2-toggle-section]");
      const body = section.querySelector(":scope > .g2-section-body");
      if (button && body) {
        const open = getGate2AccordionState().sections[button.dataset.g2ToggleSection] === true;
        section.classList.toggle("is-open", open);
        button.setAttribute("aria-expanded", String(open));
        body.hidden = !open;
      }
    }
  }
  workspace.querySelectorAll(".g2w-additional").forEach((additional) => {
    additional.querySelectorAll(".g2-open-section").forEach((section) => {
      if (!section.querySelector("[data-card]")) section.remove();
    });
    const oldList = additional.querySelector(".g2w-legacy-list");
    if (oldList && !oldList.querySelector("[data-card]")) oldList.remove();
    const remaining = additional.querySelectorAll("[data-card]").length;
    if (!remaining) additional.remove();
    else additional.querySelector(":scope > summary").innerHTML =
      `Ранее сохранённые разделы <span>${remaining} карточек</span>`;
  });
  g2s4RevealHash(workspace);
}
function g2s4RevealHash(workspace) {
  if (!location.hash) return;
  let id = "";
  try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
  const target = document.getElementById(id) || workspace.querySelector(`[data-card="${CSS.escape(id)}"]`);
  if (!target || !workspace.contains(target)) return;
  for (let parent = target.parentElement; parent && parent !== workspace; parent = parent.parentElement) {
    if (parent instanceof HTMLDetailsElement) {
      parent.open = true;
      const key = guruDisclosureKeyV512(parent);
      if (key) guruDisclosureOpenStateV512()[key] = true;
    } else if (parent.classList.contains("g2-open-section")) {
      const button = parent.querySelector(":scope > [data-g2-toggle-section]");
      const body = parent.querySelector(":scope > .g2-section-body");
      if (button && body) {
        getGate2AccordionState().sections[button.dataset.g2ToggleSection] = true;
        parent.classList.add("is-open");
        button.setAttribute("aria-expanded", "true");
        body.hidden = false;
      }
    }
  }
  requestAnimationFrame(() => target.scrollIntoView({ block: "start" }));
}
const g2s4PreviousLegacyCardHtml = g2CardHtml;
g2CardHtml = function (card) {
  const html = g2s4PreviousLegacyCardHtml.apply(this, arguments);
  const replacement = G2S4_REPLACED[card?.id];
  if (!replacement || activeGateId !== "gate-2") return html;
  const note = `<div class="g2s4-replacement" data-g2s4-replaced-by="${escapeAttr(Array.isArray(replacement) ? replacement.join(", ") : replacement)}">${escapeHtml(g2s4ReplacementText(replacement))}</div>`;
  return html.replace(/(<div class="g2-check-title"[^>]*>[\s\S]*?<\/div>)/, `$1${note}`);
};

function g2s4Units(workspace = state) {
  const productId = guruV194SelectedProduct(workspace)?.id || "";
  const companyMetrika = ["counter", "goal"].map((id) => {
    const def = g2wDef(id);
    return { id: `company-${id}`, title: def.title, scope: "company", productId: "",
      cardId: def.cardId, status: g2wStatus(def, "", workspace), def };
  });
  const services = [...G2_SERVICE_BLOCK_CONFIGS.values()]
    .filter((config) => config.scope === "company" || productId)
    .map((baseConfig) => {
      const scopedProductId = baseConfig.scope === "product" ? productId : "";
      const config = typeof g2StepServiceConfig === "function"
        ? g2StepServiceConfig(baseConfig, scopedProductId, workspace) : baseConfig;
      return { id: config.id, title: config.title, scope: config.scope,
        productId: scopedProductId, cardId: g2ServiceBlockCardId(config),
        status: g2ServiceBlockStatus(config, scopedProductId, workspace), config };
    });
  const ordered = [];
  for (const unit of companyMetrika) {
    ordered.push(...services.filter((service) => service.config.beforeUnit === unit.def.id));
    ordered.push(unit);
    ordered.push(...services.filter((service) => service.config.afterUnit === unit.def.id));
  }
  ordered.push(...services.filter((service) => !ordered.includes(service) && service.scope === "company"));
  ordered.push(...services.filter((service) => service.scope === "product"));
  return ordered;
}
function g2s4Readiness(workspace = state) {
  const allUnits = typeof nowGuideGate12Read === "function"
    ? nowGuideGate12Read((view) => g2s4Units(view), workspace).status || []
    : g2s4Units(workspace);
  const units = allUnits;
  const excluded = allUnits.filter((unit) => unit.status === "not_needed");
  return { allUnits, units, excluded,
    summary: guruReadinessFromStatuses(units.map((unit) => unit.status)) };
}
function g2s4CountedUnits(workspace = state) {
  return g2s4Readiness(workspace).units;
}
// The product picker needs every product's readiness on first render. During
// editing, only the selected product changes; keep the other results until a
// company source or the product catalogue changes.
const G2S4_PRODUCT_READY_CACHE = new WeakMap();
const g2s4PreviousProductReadinessMap = guruV194ProductReadinessMapV1;
guruV194ProductReadinessMapV1 = function (workspace = state, gateId = "gate-0") {
  if (gateId !== "gate-2" || workspace !== state || activeGateId !== "gate-2")
    return g2s4PreviousProductReadinessMap.apply(this, arguments);
  const productIds = guruV194Products(workspace).map((product) => product.id).join("\u0000");
  const cached = G2S4_PRODUCT_READY_CACHE.get(workspace);
  if (cached?.productIds === productIds) return cached.readiness;
  const readiness = g2s4PreviousProductReadinessMap.apply(this, arguments);
  G2S4_PRODUCT_READY_CACHE.set(workspace, { productIds, readiness: new Map(readiness) });
  return readiness;
};
const G2S4_VISIBLE_READINESS_CACHE = new WeakMap();
function g2s4ScreenReadiness(options = {}) {
  const workspace = document.querySelector(".g2w-workspace");
  const cached = workspace && G2S4_VISIBLE_READINESS_CACHE.get(workspace);
  if (cached && !options.forceFull && !options.changedCardId) return cached;
  if (cached && options.changedCardId) {
    const affected = g2wAffectedIds(options.changedCardId, options.field);
    const allUnits = cached.allUnits.map((unit) => {
      const changed = unit.config
        ? affected.has(unit.config.wizardUnitId) || unit.id === options.changedServiceId
        : affected.has(unit.def.id);
      if (!changed) return unit;
      const status = unit.config
        ? g2ServiceBlockStatus(unit.config, unit.productId)
        : g2wStatus(unit.def, unit.productId);
      return { ...unit, status };
    });
    const result = { allUnits, summary: guruReadinessFromStatuses(allUnits.map((unit) => unit.status)) };
    G2S4_VISIBLE_READINESS_CACHE.set(workspace, result);
    return result;
  }
  const result = g2s4Readiness();
  if (workspace) G2S4_VISIBLE_READINESS_CACHE.set(workspace, result);
  return result;
}
const g2s4PreviousStatuses = guruGateBlockStatuses;
guruGateBlockStatuses = function (gate) {
  if (gate?.id !== "gate-2") return g2s4PreviousStatuses.apply(this, arguments);
  return g2s4Readiness(state).units.map((unit) => unit.status);
};

g2wUpdateNav = function () {
  if (activeGateId !== "gate-2") return;
  const label = els.gateNav?.querySelector('[data-gate-id="gate-2"] .small');
  if (!label) return;
  const { total, percent } = g2s4ScreenReadiness().summary;
  label.textContent = `${total} блоков, прогресс ${percent}%`;
};

function g2s4UpdateScopeSummaries(options = {}) {
  if (activeGateId !== "gate-2") return;
  const priorUnits = G2S4_VISIBLE_READINESS_CACHE.get(document.querySelector(".g2w-workspace"))?.allUnits;
  const { allUnits, summary } = g2s4ScreenReadiness(options);
  if (options.forceFull) G2S4_PRODUCT_READY_CACHE.delete(state);
  else if (options.changedCardId) {
    const changedDef = G2W_CARDS.find((def) => def.id === options.changedCardId);
    const changedService = G2_SERVICE_BLOCK_CONFIGS.get(options.changedServiceId);
    if (changedDef?.scope === "company" && g2wAffectsProductReadiness(changedDef.id, options.field)) {
      // Product steps depend on company steps reaching "ready". A manual
      // checkmark that only changes progress does not invalidate 59 products.
      const sameReadyDependencies = priorUnits && priorUnits.filter(unit => unit.scope === "company")
        .every(unit => (unit.status === "ready") ===
          (allUnits.find(next => next.id === unit.id)?.status === "ready"));
      if (!options.stepToggle || !sameReadyDependencies) G2S4_PRODUCT_READY_CACHE.delete(state);
    }
    else if (changedDef?.scope === "product" || changedService?.scope === "product") {
      const cached = G2S4_PRODUCT_READY_CACHE.get(state);
      const selectedId = guruV194SelectedProduct(state)?.id;
      if (cached && selectedId) cached.readiness.set(selectedId,
        guruV194ProductGateStatusesV1(allUnits.filter((unit) => unit.scope === "product")
          .map((unit) => unit.status)));
    }
  }
  for (const scope of ["company", "product"]) {
    const subset = allUnits.filter((unit) => unit.scope === scope);
    const counted = subset.filter((unit) => unit.status !== "not_needed");
    const ready = counted.filter((unit) => unit.status === "ready").length;
    const skipped = subset.length - counted.length;
    const label = document.querySelector(`[data-g2w-scope="${scope}"] .g2w-scope-summary > span`);
    if (label) label.textContent = scope === "company"
      ? `${summary.done} из ${summary.total} блоков готово · ${summary.percent}%`
      : `${ready} из ${counted.length} готово${skipped ? ` · ${skipped} не требуется` : ""}`;
  }
}
const g2s4PreviousMount = g2ServiceBlockMountRegistered;
g2ServiceBlockMountRegistered = function () {
  const result = g2s4PreviousMount.apply(this, arguments);
  g2s4MoveLegacyCards();
  g2s4UpdateScopeSummaries();
  return result;
};
const g2s4PreviousRenderForCache = renderGate2Redesign;
renderGate2Redesign = function (gate) {
  if (gate?.id === "gate-2") G2S4_PRODUCT_READY_CACHE.delete(state);
  return g2s4PreviousRenderForCache.apply(this, arguments);
};
const g2s4PreviousRefresh = g2wRefresh;
g2wRefresh = function (options = {}) {
  const parentCache = guruRenderReadCacheV470;
  if (!parentCache) guruRenderReadCacheV470 = guruCreateRenderReadCacheV470();
  try {
    return nowGuideWithReadPass(() => {
      const result = g2s4PreviousRefresh.apply(this, arguments);
      g2s4UpdateScopeSummaries({ ...options, forceFull: !options.changedCardId });
      g2wUpdateNav();
      return result;
    });
  } finally {
    if (!parentCache) guruRenderReadCacheV470 = null;
  }
};

const g2s4PreviousExportRuntime = guruExportRuntimeModelV223;
guruExportRuntimeModelV223 = function (gateId) {
  const model = g2s4PreviousExportRuntime.apply(this, arguments);
  if (gateId !== "gate-2") return model;
  const items = g2s4Units();
  const units = items.map((item) => {
    const record = item.config
      ? g2ServiceBlockRecord(item.config, item.productId)
      : g2wRecord(item.def, item.productId);
    return guruExportModelUnitV223({
      unitId: item.config ? `g2sb-${item.id}${item.productId ? `-${item.productId}` : ""}` : `g2w-${item.def.id}`,
      gateId, title: item.title, status: item.status,
      sourceType: item.config ? "gate2_service_block" : "gate2_setup_wizard",
      path: `state.gates[gate-2].cards[${item.cardId}].fields.g2SetupWizardV1.${item.productId ? `byProduct[${item.productId}]` : "company"}`,
      includedInGateReadiness: true, includedInDisplayedOverall: true,
      readinessRole: item.status === "not_needed" ? "not_required" : "direct",
      details: { scope: item.scope, product_id: item.productId, sourceCardId: item.cardId,
        serviceUrl: item.config ? g2ServiceBlockSafeHref(g2ServiceBlockValue(
          item.config.serviceUrl, item.config, null, item.productId)) : "",
        progress: item.config ? item.config.steps.filter((step) =>
          g2ServiceBlockStepDone(item.config, step, record, item.productId)).length :
          item.def.steps.filter((step) => record?.steps?.[step[0]]?.result === "done").length,
        total: item.config ? item.config.steps.length : item.def.steps.length,
        steps: item.config ? item.config.steps.map((step) => ({
          step_id: step.step_id,
          what: g2ServiceBlockStepValue(item.config, step, "what", item.productId),
          where: g2ServiceBlockStepValue(item.config, step, "where", item.productId),
          how: g2ServiceBlockStepValue(item.config, step, "how", item.productId),
          ...(step.troubleshooting ? { troubleshooting: g2ServiceBlockStepValue(item.config, step, "troubleshooting", item.productId) } : {}),
          ...(step.reconciliation ? { reconciliation: g2ServiceBlockStepValue(item.config, step, "reconciliation", item.productId) } : {}),
          source_url: g2ServiceBlockSafeHref(g2ServiceBlockStepValue(item.config, step, "source_url", item.productId)),
          result: record?.steps?.[step.step_id]?.result || "",
          done: g2ServiceBlockStepDone(item.config, step, record, item.productId),
        })) : item.def.steps.map((step) => ({ step_id: step[0], what: step[1],
          result: record?.steps?.[step[0]]?.result || "" })) },
    });
  });
  const readiness = g2s4Readiness().summary;
  return { ...model, model: "gate2_service_readiness", units,
    displayedStatus: guruExportDiagnosticOverallV223(g2s4CountedUnits().map((unit) => unit.status)),
    readinessFormula: { numerator: readiness.done + 0.5 * (readiness.inProgress + readiness.problem),
      denominator: readiness.total, ready: readiness.ready, inProgress: readiness.inProgress,
      problem: readiness.problem, notStarted: readiness.notStarted,
      excludedNotRequired: [] } };
};
const g2s4PreviousCardDiagnostic = guruExportGate2CardDiagnosticV223;
guruExportGate2CardDiagnosticV223 = function (card, rawStatus) {
  const diagnostic = g2s4PreviousCardDiagnostic.apply(this, arguments);
  const replacement = G2S4_REPLACED[card?.id];
  if (replacement) {
    diagnostic.replacedBy = Array.isArray(replacement) ? replacement.join(" и ") : replacement;
    diagnostic.replacementText = g2s4ReplacementText(replacement);
    diagnostic.readinessRole = "replaced";
    diagnostic.includedInGateReadiness = false;
  }
  return diagnostic;
};
GURU_EXPORT_CODE_REFERENCES_V223["gate-2"].push({
  file: "gate2-product-services-step4.js", line: 1, symbol: "g2s4Readiness",
  role: "One Gate 2 readiness list for company and selected product",
});
