/* Gate 2 setup wizard. Existing Gate 0 URLs and Metrika registers remain the
   source of truth; this layer stores only actions and verification evidence. */
const G2W_DOC = Object.freeze({
  tildaDomain: "https://help-ru.tilda.cc/customdomain",
  tildaMetrika: "https://help-ru.tilda.cc/statistics/yandex-metrika",
  tildaVk: "https://help-ru.tilda.cc/statistics/mail-ru",
  vercelDomain: "https://vercel.com/docs/domains/working-with-domains/add-a-domain",
  wordpress: "https://wordpress.org/documentation/article/settings-general-screen/",
  metrika: "https://metrika.yandex.ru/",
  metrikaCheck: "https://yandex.ru/support/metrica/ru/general/check-counter",
  metrikaGoal: "https://yandex.ru/support/metrica/ru/general/check-goal.html",
  metrikaEvent: "https://www.yandex.ru/support/metrica/ru/general/goal-js-event",
  vk: "https://object2-ac.vk-apps.com/vk-education-0554ff56-27eb-4093-a702-685722cef6d9/media/ad/79ad8eafc5324d46a3c153cd5e9a2a32.pdf",
  webmaster: "https://webmaster.yandex.ru/",
  robots: "https://yandex.ru/support/webmaster/ru/indexing-options/robots-txt-analyzer",
  sitemap: "https://yandex.ru/support/webmaster/ru/controlling-robot/sitemap",
  bitrixHelp: "https://helpdesk.bitrix24.ru/",
  amoHelp: "https://www.amocrm.ru/support",
});

const G2W_CARDS = [
  { id: "domain", scope: "company", cardId: "card-96", title: "Домен и хостинг", purpose: "Сайт открывается по основному адресу и защищён HTTPS.", steps: [
    ["address", "Укажите основной адрес сайта.", "homeUrl", "URL сайта", "url"],
    ["platform", "Выберите платформу сайта.", "platform", "Платформа", "platform"],
    ["provider", "Укажите регистратора домена и провайдера размещения.", "registrar", "Регистратор домена"],
    ["dns_source", "Откройте настройки домена у провайдера и получите его DNS-записи.", "hosting", "Провайдер размещения"],
    ["dns_set", "Добавьте полученные записи в панели DNS. Не используйте чужой IP или шаблон.", "dnsRecord", "Запись от провайдера"],
    ["open", "Проверьте открытие основного адреса.", null, null, null, "auto"],
    ["https", "Проверьте HTTPS и сертификат в браузере."],
    ["redirect", "Проверьте перенаправления на основной адрес."],
  ] },
  { id: "counter", scope: "company", cardId: "g2-metrika-company-counter", title: "Яндекс Метрика · счётчик", purpose: "Один счётчик проекта фиксирует реальные визиты.", steps: [
    ["create", "Откройте Метрику и создайте или выберите существующий счётчик.", null, null, null, G2W_DOC.metrika],
    ["id", "Скопируйте ID счётчика в GURU.", "counterId", "ID счётчика", "digits"],
    ["install", "Установите код на сайт и опубликуйте изменения.", null, null, null, "platformMetrika"],
    ["check", "В Метрике проверьте наличие счётчика на рабочем URL.", null, null, null, G2W_DOC.metrikaCheck],
    ["visit", "Откройте сайт с _ym_debug=2 и убедитесь, что контрольный визит зарегистрирован.", null, null, null, G2W_DOC.metrikaCheck],
  ] },
  { id: "goal", scope: "company", cardId: "g2-metrika-company-goals", title: "Яндекс Метрика · конверсионная цель", purpose: "Цель отражает подтверждённое бизнес-действие.", steps: [
    ["action", "Определите действие клиента: отправка заявки, заказ или другое событие."],
    ["add", "Откройте Метрика → Цели → Добавить цель.", null, null, null, G2W_DOC.metrika],
    ["type", "Выберите тип, который соответствует фактическому действию.", "goalType", "Тип цели", "goalType", G2W_DOC.metrikaEvent],
    ["name", "Сохраните название цели.", "goalName", "Название цели"],
    ["id", "Сохраните ID цели.", "goalId", "ID цели", "digits"],
    ["test", "Выполните реальное действие на сайте."],
    ["report", "Проверьте срабатывание цели в отладке и отчёте Метрики.", null, null, null, G2W_DOC.metrikaGoal],
  ] },
  { id: "vk", scope: "company", cardId: "g2-marketing-vk-ads", title: "VK Реклама и пиксель", purpose: "Проверяется только если используется VK Реклама.", optional: "vk", steps: [
    ["account", "Откройте VK Рекламу и выберите рекламный кабинет.", "vkAccount", "Название или ID кабинета", "text", G2W_DOC.vk],
    ["existing", "Проверьте, есть ли пиксель для выбранного домена.", null, null, null, G2W_DOC.vk],
    ["pixel", "Используйте найденный пиксель или создайте новый только при его отсутствии.", null, null, null, G2W_DOC.vk],
    ["id", "Получите ID выбранного пикселя.", "pixelId", "ID пикселя / Top.Mail.ru", "text", G2W_DOC.tildaVk],
    ["install", "Tilda: Настройки сайта → Аналитика → MAIL.RU COUNTER ID (VK PIXEL) → вставьте ID и сохраните.", null, null, null, "platformVk"],
    ["publish", "Tilda: список страниц → «Опубликовать все страницы».", null, null, null, "https://help-ru.tilda.cc/folders"],
    ["visit", "Проверьте тестовый визит: top.mail.ru → Мои счётчики → Real-Time → Обзор.", null, null, null, "https://help-ru.tilda.cc/statistics/mail-ru"],
  ] },
  { id: "crm", scope: "company", cardId: "card-122", title: "CRM и получение обращений", purpose: "Тестовая заявка доходит до используемой системы.", steps: [
    ["system", "Выберите CRM или фактически используемый способ получения заявок.", "crmName", "Система приёма заявок", "crm"],
    ["connect", "Подключите формы сайта к выбранной системе."],
    ["fields", "Проверьте передачу имени, контакта, источника и страницы обращения."],
    ["utm", "Проверьте UTM и привязку к продукту, если эти данные доступны."],
    ["send", "Отправьте тестовую заявку."],
    ["receive", "Убедитесь, что обращение получено и сохранено."],
    ["storage", "Проверьте срок хранения заявок."],
  ] },
  { id: "webmaster", scope: "company", cardId: "card-107", title: "Яндекс Вебмастер", purpose: "Поисковые страницы доступны роботу, если используется SEO.", optional: "seo", steps: [] },
  { id: "safety", scope: "company", cardId: "card-134", title: "Безопасность и персональные данные", purpose: "Формы защищены, необходимые документы опубликованы.", steps: [
    ["https", "Проверьте HTTPS на рабочем сайте."],
    ["policy", "Откройте опубликованную политику обработки данных.", "privacyUrl", "URL политики", "url"],
    ["consent", "Проверьте необходимые согласия и уведомления в формах."],
    ["spam", "Проверьте защиту форм от спама."],
    ["test", "Отправьте тестовую заявку и проверьте получение."],
  ] },
  { id: "landing", scope: "product", cardId: "card-90", title: "Посадочная или целевой маршрут", purpose: "Клиент может выполнить целевое действие.", steps: [
    ["route", "Выберите маршрут трафика: сайт, мессенджер или нативная лид-форма.", "route", "Куда ведёт трафик", "route"],
    ["url", "Укажите адрес маршрута выбранного продукта.", "productUrl", "URL страницы или маршрута", "url"],
    ["open", "Откройте адрес и проверьте доступность.", null, null, null, "auto"],
    ["mobile", "Проверьте отображение на телефоне."],
    ["cta", "Проверьте основной призыв к действию."],
    ["action", "Выполните предусмотренное действие клиента."],
  ] },
  { id: "productCounter", scope: "product", cardId: "g2-metrika-product-counter", title: "Метрика продукта", purpose: "Использует счётчик компании и фиксирует визит на страницу.", steps: [
    ["inherit", "Сверьте ID общего счётчика с настройками компании."],
    ["open", "Откройте страницу выбранного продукта."],
    ["code", "Проверьте наличие счётчика на странице.", null, null, null, G2W_DOC.metrikaCheck],
    ["visit", "Выполните контрольный визит."],
    ["report", "Подтвердите регистрацию визита в Метрике.", null, null, null, G2W_DOC.metrikaCheck],
  ] },
  { id: "productGoal", scope: "product", cardId: "g2-metrika-goals-primary", title: "Конверсионная цель продукта", purpose: "Цель соответствует реальному действию по продукту.", steps: [
    ["action", "Укажите основное целевое действие продукта.", "mainAction", "Действие клиента"],
    ["select", "Выберите существующую цель компании.", "goalRefId", "Цель Метрики", "goalRef"],
    ["id", "Сверьте ID привязанной цели с Метрикой.", null, null, null, G2W_DOC.metrika],
    ["test", "Выполните реальное тестовое действие."],
    ["report", "Проверьте регистрацию конверсии.", null, null, null, G2W_DOC.metrikaGoal],
  ] },
  { id: "productVk", scope: "product", cardId: "g2-marketing-vk-ads", title: "События VK Рекламы", purpose: "Событие продукта проверяется только для канала VK.", optional: "vkProduct", steps: [
    ["inherit", "Сверьте пиксель с настройками компании."],
    ["event", "Укажите нужное событие: заявка, покупка или другое.", "vkEvent", "Событие VK"],
    ["install", "Настройте передачу события через сайт или поддерживаемую интеграцию.", null, null, null, "platformVk"],
    ["test", "Выполните тестовое действие."],
    ["report", "Проверьте регистрацию события в кабинете VK.", null, null, null, G2W_DOC.vk],
  ] },
  { id: "lead", scope: "product", cardId: "card-92", title: "Сквозная проверка заявки", purpose: "Фактическое обращение совпадает с источником и аналитикой.", steps: [
    ["open", "Откройте страницу или другой целевой маршрут продукта."],
    ["action", "Выполните действие клиента."],
    ["receive", "Проверьте получение обращения."],
    ["source", "Проверьте источник и привязку к выбранному продукту."],
    ["compare", "Сверьте событие в аналитике с фактическим обращением."],
  ] },
];

function g2wGate(workspace = state) { return workspace?.gates?.find((gate) => gate.id === "gate-2"); }
function g2wCard(def, workspace = state) { return g2wGate(workspace)?.cards?.find((card) => card.id === def.cardId); }
function g2wRecord(def, productId = "", create = false, workspace = state) {
  const card = g2wCard(def, workspace);
  if (!card || (def.scope === "product" && !productId)) return null;
  if (create) {
    card.fields ||= {};
    card.fields.g2SetupWizardV1 ||= { company: {}, byProduct: {} };
    card.fields.g2SetupWizardV1.byProduct ||= {};
  }
  const store = card.fields?.g2SetupWizardV1;
  if (!store) return null;
  const record = def.scope === "company" ? store.company : store.byProduct?.[productId];
  if (!record && create) {
    const fresh = { steps: {}, values: {}, verification: null, history: [] };
    if (def.scope === "company") store.company = fresh;
    else store.byProduct[productId] = fresh;
    return fresh;
  }
  if (record && create) {
    record.steps ||= {};
    record.values ||= {};
    record.history ||= [];
  }
  return record || null;
}
function g2wText(value) { return String(value ?? "").trim(); }
function g2wCompanyValue(key, workspace = state) {
  if (key === "homeUrl") return megaPlatformUrl("fixed", "home", workspace) || workspace?.project?.websiteUrl || "";
  if (key === "privacyUrl") return megaPlatformUrl("fixed", "privacy", workspace);
  if (key === "counterId") return g2MetrikaCompanyDataV374("counter", workspace).counterId || "";
  if (["goalName", "goalType", "goalId"].includes(key)) {
    const goal = g2MetrikaCompanyDataV374("goals", workspace).primaryGoal || {};
    return goal[{ goalName: "name", goalType: "type", goalId: "goalId" }[key]] || "";
  }
  return "";
}
function g2wValue(def, productId, key, workspace = state) {
  if (["homeUrl", "privacyUrl", "counterId", "goalName", "goalType", "goalId"].includes(key)) return g2wCompanyValue(key, workspace);
  if (key === "productUrl") {
    const product = guruV194Products(workspace).find((item) => item.id === productId);
    return g2wRoute(productId, workspace) === "website"
      ? megaPlatformProductUrl(product, workspace)
      : g2wRecord(def, productId, false, workspace)?.values?.routeUrl || "";
  }
  if (["mainAction", "goalRefId"].includes(key)) {
    const row = g2MetrikaProductRowV367(g2wCard(def, workspace), productId);
    return row?.[key] || "";
  }
  return g2wRecord(def, productId, false, workspace)?.values?.[key] || "";
}
function g2wRoute(productId, workspace = state) {
  return g2wRecord(G2W_CARDS.find((def) => def.id === "landing"), productId, false, workspace)?.values?.route || "website";
}
function g2wPlatform(workspace = state) {
  return g2wValue(G2W_CARDS[0], "", "platform", workspace);
}
function g2wSetValue(def, productId, key, value) {
  const record = g2wRecord(def, productId, true);
  const clean = g2wText(value);
  if (["homeUrl", "privacyUrl"].includes(key)) {
    megaPlatformSetUrl("fixed", key === "homeUrl" ? "home" : "privacy", clean);
    return;
  }
  if (key === "productUrl") {
    if (g2wRoute(productId) === "website") megaPlatformSetUrl("products", productId, clean);
    else record.values.routeUrl = clean;
    return;
  }
  if (key === "counterId") {
    const counter = g2MetrikaCompanyDataV374("counter");
    if (counter.counterId !== clean) counter.counterCheck = "";
    counter.counterId = clean;
    return;
  }
  if (["goalName", "goalType", "goalId"].includes(key)) {
    const goal = g2MetrikaCompanyDataV374("goals").primaryGoal;
    if (!goal) return;
    const field = { goalName: "name", goalType: "type", goalId: "goalId" }[key];
    if (goal[field] !== clean) goal.state = "";
    goal[field] = clean;
    return;
  }
  if (["mainAction", "goalRefId"].includes(key)) {
    const row = g2MetrikaProductRowV367(g2wCard(def), productId, true);
    if (row[key] !== clean) row.testConversionAt = "";
    row[key] = clean;
    return;
  }
  record.values[key] = clean;
}
function g2wUsage(kind, workspace = state) {
  const def = G2W_CARDS.find((item) => item.id === (kind === "vk" ? "vk" : "webmaster"));
  return g2wRecord(def, "", false, workspace)?.values?.used || "";
}
function g2wApplicability(def, productId = "", workspace = state) {
  if (def.scope === "product" && !productId) return "pending";
  if (def.optional === "vk" || def.optional === "vkProduct") {
    const used = g2wUsage("vk", workspace);
    if (used === "no") return "not_needed";
    if (!used) return "pending";
  }
  if (def.optional === "seo") {
    const used = g2wUsage("seo", workspace);
    if (used === "no") return "not_needed";
    if (!used) return "pending";
  }
  if (["productCounter", "productGoal"].includes(def.id) && g2wRoute(productId, workspace) !== "website") return "not_needed";
  return "required";
}
function g2wInputs(def, productId = "", workspace = state) {
  const fields = def.steps.filter((step) => step[2]).map((step) => [step[2], g2wValue(def, productId, step[2], workspace)]);
  const dependencies = {
    domain: [], counter: [g2wCompanyValue("homeUrl", workspace), g2wPlatform(workspace)],
    goal: [g2wCompanyValue("counterId", workspace), g2wCompanyValue("homeUrl", workspace)],
    vk: [g2wCompanyValue("homeUrl", workspace), g2wPlatform(workspace)],
    crm: [g2wCompanyValue("homeUrl", workspace), g2wValue(def, "", "crmServiceName", workspace)],
    webmaster: [g2wCompanyValue("homeUrl", workspace)],
    safety: [g2wCompanyValue("homeUrl", workspace)],
    landing: [], productCounter: [g2wValue(G2W_CARDS[7], productId, "productUrl", workspace), g2wCompanyValue("counterId", workspace)],
    productGoal: [g2wValue(G2W_CARDS[7], productId, "productUrl", workspace), g2wCompanyValue("counterId", workspace),
      g2wCompanyValue("goalId", workspace)],
    productVk: [g2wValue(G2W_CARDS[3], "", "pixelId", workspace), g2wValue(G2W_CARDS[7], productId, "productUrl", workspace)],
    lead: [g2wValue(G2W_CARDS[7], productId, "productUrl", workspace), g2wValue(G2W_CARDS[4], "", "crmName", workspace)],
  }[def.id] || [];
  return JSON.stringify([fields, dependencies, g2wRoute(productId, workspace), g2wUsage("vk", workspace), g2wUsage("seo", workspace)]);
}
function g2wFieldValid(def, productId, key, workspace = state) {
  const value = g2wText(g2wValue(def, productId, key, workspace));
  if (!value) return false;
  if (["counterId", "goalId", "pixelId"].includes(key)) return /^\d+$/.test(value);
  if (["homeUrl", "privacyUrl", "productUrl"].includes(key)) {
    try { return new URL(value).protocol === "https:"; } catch { return false; }
  }
  if (key === "goalRefId") return Boolean(g2MetrikaCompanyGoalV374(value, workspace));
  if (key === "crmName" && value === "other") return Boolean(g2wValue(def, productId, "crmServiceName", workspace));
  return true;
}
function g2wUpstreamIds(def) {
  return {
    goal: ["counter"], productCounter: ["counter"], productGoal: ["counter", "goal"],
    productVk: ["vk"], lead: ["crm"],
  }[def.id] || [];
}
// The visible service workflow and the wizard share the same completion
// checks. Configuration describes existing controls; no result is persisted.
function g2wStepChecks(def, productId = "", workspace = state) {
  if (typeof g2StepWizardDef === "function") def = g2StepWizardDef(def, productId, workspace);
  const baseConfig = typeof G2_SERVICE_BLOCK_CONFIGS !== "undefined"
    ? [...G2_SERVICE_BLOCK_CONFIGS.values()].find((config) => config.wizardUnitId === def.id && config.scope === def.scope)
    : null;
  const config = typeof g2StepServiceConfig === "function" ? g2StepServiceConfig(baseConfig, productId, workspace) : baseConfig;
  const record = g2wRecord(def, productId, false, workspace);
  const visibleSteps = config?.steps || def.steps;
  const fieldOwners = new Map();
  for (const source of def.steps.filter((step) => step[2])) {
    const owner = config?.steps.find((step) => step.existingFields?.includes(source[2]) ||
      (step.existingField && step.step_id === source[0])) ||
      config?.steps.find((step) => step.step_id === source[0]);
    fieldOwners.set(source[2], owner?.step_id || source[0]);
  }
  return visibleSteps.map((step) => {
    const id = config ? step.step_id : step[0];
    const done = config ? g2ServiceBlockStepDone(config, step, record, productId, workspace)
      : record?.steps?.[id]?.result === "done";
    const keys = [...fieldOwners].filter(([, owner]) => owner === id).map(([key]) => key);
    const valid = keys.every((key) => g2wFieldValid(def, productId, key, workspace));
    return { id, done, valid, serviceId: config?.id || "" };
  });
}
function g2wCanConfirm(def, productId = "", workspace = state) {
  if (g2wApplicability(def, productId, workspace) !== "required") return false;
  const record = g2wRecord(def, productId, false, workspace);
  if (record?.auto?.result === "failed" && record.auto.fingerprint === g2wInputs(def, productId, workspace)) return false;
  return g2wStepChecks(def, productId, workspace).every((step) => step.done && step.valid) &&
    g2wUpstreamIds(def).every((id) => g2wStatus(G2W_CARDS.find((item) => item.id === id), "", workspace) === "ready");
}
function g2wStatus(def, productId = "", workspace = state) {
  const applicability = g2wApplicability(def, productId, workspace);
  if (applicability === "not_needed") return "not_needed";
  const record = g2wRecord(def, productId, false, workspace);
  const stepChecks = g2wStepChecks(def, productId, workspace);
  stepChecks.forEach((step) => guruReadinessValue(step.done && step.valid,
    { wizardId: def.id, serviceId: step.serviceId, stepId: step.id }));
  if (!record) return "not_started";
  const checked = stepChecks.filter((step) => step.done).length;
  const valid = stepChecks.every((step) => step.valid);
  const verification = record.verification;
  const current = verification?.fingerprint === g2wInputs(def, productId, workspace);
  const upstream = g2wUpstreamIds(def);
  const inheritedReady = upstream.every((id) => g2wStatus(G2W_CARDS.find((item) => item.id === id), "", workspace) === "ready");
  guruReadinessValue(verification?.result === "passed" && current && inheritedReady,
    { wizardId: def.id, verification: true });
  if (record.auto?.result === "failed" && record.auto.fingerprint === g2wInputs(def, productId, workspace)) return "problem";
  if (applicability === "required" && checked === stepChecks.length && valid &&
      verification?.result === "passed" && current && inheritedReady) return "ready";
  if (verification?.result === "failed" && current) return "problem";
  return checked || verification || Object.values(record.values || {}).some(Boolean) ? "in_progress" : "not_started";
}
function g2wProgress(def, productId = "") {
  if (typeof g2StepWizardDef === "function") def = g2StepWizardDef(def, productId);
  const record = g2wRecord(def, productId);
  const done = def.steps.filter((step) => record?.steps?.[step[0]]?.result === "done").length;
  return `${done} из ${def.steps.length} шагов`;
}
function g2wStatusLabel(status) {
  return { ready: "Готово", not_needed: "Не требуется", problem: "Проблема",
    in_progress: "В работе", not_started: "Не начато" }[status] || status;
}
function g2wVerificationLabel(def, productId = "") {
  const record = g2wRecord(def, productId);
  const verification = record?.verification;
  if (!verification) return "Проверка ещё не выполнена.";
  const stale = verification.fingerprint !== g2wInputs(def, productId);
  return `${verification.verification_type === "automatic" ? "Автоматическая" : "Подтверждено пользователем"} · ${verification.result === "passed" ? "работает" : verification.result === "failed" ? "не работает" : "результат неясен"} · ${new Date(verification.checked_at).toLocaleString("ru-RU")}${stale ? " · требуется повторная проверка после изменения настроек" : ""}`;
}
function g2wAutoLabel(def, productId = "") {
  const auto = g2wRecord(def, productId)?.auto;
  if (!auto) return "";
  const stale = auto.fingerprint !== g2wInputs(def, productId);
  return `Проверка URL: ${auto.result === "passed" ? "адрес доступен" : auto.result === "failed" ? "адрес вернул ошибку" : "браузер не получил подтверждение; проверьте вручную"}${stale ? " · результат устарел" : ""} · ${new Date(auto.checked_at).toLocaleString("ru-RU")}`;
}
function g2wDocForStep(step, workspace = state, def = null) {
  if (step[5] === "platformMetrika") return g2wPlatform(workspace) === "tilda" ? G2W_DOC.tildaMetrika : G2W_DOC.metrikaCheck;
  if (step[5] === "platformVk") return g2wPlatform(workspace) === "tilda" ? G2W_DOC.tildaVk : G2W_DOC.vk;
  if (step[5] && step[5] !== "auto") return step[5];
  const providerDoc = (key) => {
    const value = g2wValue(def, "", key, workspace);
    try { return new URL(value).protocol === "https:" ? value : ""; } catch { return ""; }
  };
  return {
    domain: { tilda: G2W_DOC.tildaDomain, wordpress: G2W_DOC.wordpress, vercel: G2W_DOC.vercelDomain }[g2wPlatform(workspace)] || providerDoc("hostingDocsUrl"),
    counter: G2W_DOC.metrikaCheck, goal: G2W_DOC.metrikaGoal,
    vk: g2wPlatform(workspace) === "tilda" ? G2W_DOC.tildaVk : G2W_DOC.vk,
    crm: { bitrix24: G2W_DOC.bitrixHelp, amocrm: G2W_DOC.amoHelp }[g2wValue(def, "", "crmName", workspace)] || providerDoc("crmDocsUrl"),
    webmaster: G2W_DOC.webmaster, productCounter: G2W_DOC.metrikaCheck,
    productGoal: G2W_DOC.metrikaGoal, productVk: G2W_DOC.vk,
  }[def?.id] || "";
}
function g2wOpenUrl(def, productId, step) {
  let url = "";
  if (def.id === "domain" && ["address", "open", "https", "redirect"].includes(step[0])) url = g2wValue(def, productId, "homeUrl");
  if (def.id === "counter" && step[0] === "visit") {
    try { const debug = new URL(g2wCompanyValue("homeUrl")); debug.searchParams.set("_ym_debug", "2"); url = debug.href; } catch {}
  }
  if (def.id === "landing" && ["url", "open", "mobile", "cta", "action"].includes(step[0])) url = g2wValue(def, productId, "productUrl");
  if (def.id === "safety" && step[0] === "policy") url = g2wValue(def, productId, "privacyUrl");
  if (def.id === "crm" && step[0] === "system") url = {
    bitrix24: "https://www.bitrix24.ru/", amocrm: "https://www.amocrm.ru/",
  }[g2wValue(def, "", "crmName")] || "";
  try { return ["http:", "https:"].includes(new URL(url).protocol) ? url : ""; } catch { return ""; }
}
function g2wHasOpenStep(def, step) {
  return (def.id === "domain" && ["address", "open", "https", "redirect"].includes(step[0])) ||
    (def.id === "counter" && step[0] === "visit") ||
    (def.id === "landing" && ["url", "open", "mobile", "cta", "action"].includes(step[0])) ||
    (def.id === "safety" && step[0] === "policy") ||
    (def.id === "crm" && step[0] === "system");
}
function g2wPlatformHint() {
  const platform = g2wPlatform();
  return {
    tilda: ["Tilda: Настройки сайта → Аналитика для Метрики; для VK используйте интеграцию Top.Mail.ru. Опубликуйте страницы.", G2W_DOC.tildaMetrika],
    wordpress: ["WordPress: используйте подходящий плагин или код темы; после установки проверьте рабочую страницу.", G2W_DOC.wordpress],
    vercel: ["Vercel: добавьте домен в настройках проекта и скопируйте показанные там DNS-записи.", G2W_DOC.vercelDomain],
    custom: ["Собственный сайт: разместите код на всех нужных страницах и проверьте его в сервисе.", G2W_DOC.metrikaCheck],
    other: ["Следуйте инструкции своего провайдера; DNS-записи и способ установки кода зависят от него.", ""],
  }[platform] || ["Сначала выберите платформу сайта — мастер покажет подходящий путь.", ""];
}
function g2wSelectOptions(kind, current) {
  const options = kind === "platform" ? [["", "Выберите платформу"], ["tilda", "Tilda"], ["wordpress", "WordPress"], ["vercel", "Vercel"], ["custom", "Собственный хостинг"], ["other", "Другая"]]
    : kind === "goalType" ? G2_METRIKA_COMPANY_GOAL_TYPES_V374
    : kind === "route" ? [["website", "Сайт"], ["messenger", "Мессенджер"], ["lead_form", "Нативная лид-форма"]]
    : kind === "crm" ? [["", "Выберите способ"], ["bitrix24", "Битрикс24"], ["amocrm", "amoCRM"], ["email", "Почта"], ["messenger", "Мессенджер"], ["other", "Другая система"]]
    : [["", "Выберите цель"], ...g2MetrikaCompanyGoalsV374().filter((goal) => goal.entryId && goal.goalId)
      .map((goal) => [goal.entryId, `${goal.name || "Цель"} · ${goal.goalId}`])];
  return options.map(([value, label]) => `<option value="${escapeAttr(value)}" ${current === value ? "selected" : ""}>${escapeHtml(label)}</option>`).join("");
}
function g2wFieldHtml(def, productId, step, options = {}) {
  const [,, key, label, type] = step;
  if (!key) return "";
  const value = g2wValue(def, productId, key);
  const attr = `data-g2w-field="${escapeAttr(key)}" data-g2w-card="${escapeAttr(def.id)}" data-g2w-product="${escapeAttr(productId)}"`;
  const control = ["platform", "goalType", "route", "goalRef", "crm"].includes(type)
    ? `<select ${attr}>${g2wSelectOptions(type, value)}</select>`
    : `<input ${attr} type="${type === "url" ? "url" : "text"}" value="${escapeAttr(value)}" ${type === "digits" ? 'inputmode="numeric" pattern="[0-9]*"' : ""} placeholder="${escapeAttr(label)}">`;
  const extra = def.id === "crm" && key === "crmName" && value && !["bitrix24", "amocrm"].includes(value)
    ? `${value === "other" ? `<label class="g2w-field"><span>Название системы</span><input data-g2w-field="crmServiceName" data-g2w-card="crm" data-g2w-product="" value="${escapeAttr(g2wValue(def, "", "crmServiceName"))}" placeholder="Название"></label>` : ""}<label class="g2w-field"><span>Официальная инструкция сервиса</span><input data-g2w-field="crmDocsUrl" data-g2w-card="crm" data-g2w-product="" type="url" value="${escapeAttr(g2wValue(def, "", "crmDocsUrl"))}" placeholder="https://"></label>` : "";
  const provider = !options.suppressProviderDocs && def.id === "domain" && key === "registrar" && ["custom", "other"].includes(g2wPlatform())
    ? `<label class="g2w-field"><span>Официальная инструкция провайдера</span><input data-g2w-field="hostingDocsUrl" data-g2w-card="domain" data-g2w-product="" type="url" value="${escapeAttr(g2wValue(def, "", "hostingDocsUrl"))}" placeholder="https://"></label>` : "";
  return `<label class="g2w-field"><span>${escapeHtml(label)}</span>${control}${value && !g2wFieldValid(def, productId, key) ? `<small>${type === "url" ? "Нужен рабочий адрес https://" : "Проверьте значение"}</small>` : ""}</label>${extra}${provider}`;
}
function g2wStepHtml(def, productId, step, index) {
  const record = g2wRecord(def, productId);
  const checked = record?.steps?.[step[0]]?.result === "done";
  const doc = g2wDocForStep(step, state, def);
  const openUrl = g2wOpenUrl(def, productId, step);
  return `<li class="g2w-step ${checked ? "is-done" : ""}"><label class="g2w-step-label"><input type="checkbox" data-g2w-step="${escapeAttr(step[0])}" data-g2w-card="${escapeAttr(def.id)}" data-g2w-product="${escapeAttr(productId)}" ${checked ? "checked" : ""}><span class="g2w-step-index">${String(index + 1).padStart(2, "0")}</span><span>${escapeHtml(step[1])}</span></label>
    <div class="g2w-step-tools">${g2wFieldHtml(def, productId, step)}${g2wHasOpenStep(def, step) ? `<a data-g2w-open-step="${escapeAttr(step[0])}" ${openUrl ? `href="${escapeAttr(openUrl)}"` : "hidden"} target="_blank" rel="noopener noreferrer">${def.id === "counter" ? "Открыть с отладкой" : def.id === "crm" ? "Открыть сервис" : "Открыть адрес"} ↗</a>` : ""}<a data-g2w-doc-step="${escapeAttr(step[0])}" ${doc ? `href="${escapeAttr(doc)}"` : "hidden"} target="_blank" rel="noopener noreferrer">${[G2W_DOC.metrika, G2W_DOC.vk, G2W_DOC.webmaster].includes(doc) ? "Открыть сервис" : "Инструкция"} ↗</a>${step[5] === "auto" ? `<button type="button" data-g2w-auto="${escapeAttr(def.id)}" data-g2w-product="${escapeAttr(productId)}">Проверить URL</button>` : ""}</div></li>`;
}
function g2wCardHtml(def, productId = "", knownStatus = "") {
  const applicable = g2wApplicability(def, productId);
  const record = g2wRecord(def, productId);
  const status = knownStatus || g2wStatus(def, productId);
  const verification = record?.verification;
  const stale = verification && verification.fingerprint !== g2wInputs(def, productId);
  const summary = g2wStatusLabel(status);
  const used = g2wUsage(def.optional === "seo" ? "seo" : "vk");
  const platformHint = ["domain", "counter", "vk"].includes(def.id) ? g2wPlatformHint() : null;
  const inherited = {
    productCounter: `Счётчик компании: ${escapeHtml(g2wCompanyValue("counterId") || "не указан")}`,
    productGoal: `Цель компании: ${escapeHtml(g2wCompanyValue("goalName") || "не указана")}`,
    productVk: `Пиксель компании: ${escapeHtml(g2wValue(G2W_CARDS[3], "", "pixelId") || "не указан")}`,
  }[def.id];
  return `<details class="g2w-card" data-g2w-card-view="${escapeAttr(def.id)}" data-ui-keeper-key="g2w:${escapeAttr(def.scope)}:${escapeAttr(productId)}:${escapeAttr(def.id)}" ${status === "in_progress" ? "open" : ""}><summary><span class="g2w-card-title"><strong>${escapeHtml(def.title)}</strong><small>${escapeHtml(def.purpose)}</small></span><span class="g2w-card-meta"><span>${escapeHtml(g2wProgress(def, productId))}</span><span class="status-pill status-${status}">${summary}</span></span></summary>
    <div class="g2w-card-body">${def.optional && def.scope === "company" ? `<div class="g2w-usage"><span>Используется ${def.optional === "seo" ? "поисковое продвижение" : "VK Реклама"}?</span><select data-g2w-use="${escapeAttr(def.optional)}"><option value="" ${!used ? "selected" : ""}>Решить позже</option><option value="yes" ${used === "yes" ? "selected" : ""}>Да</option><option value="no" ${used === "no" ? "selected" : ""}>Нет, не требуется</option></select></div>` : ""}
    ${applicable === "not_needed" ? '<p class="g2w-note">Канал или сайт для этого маршрута не используется. Настройка не снижает готовность.</p>' : applicable === "pending" ? '<p class="g2w-note">Сначала выберите продукт или укажите, используется ли канал.</p>' : `
    ${inherited ? `<p class="g2w-inherited">${inherited}</p>` : ""}
    ${platformHint ? `<p class="g2w-hint">${escapeHtml(platformHint[0])}${platformHint[1] ? ` <a href="${escapeAttr(platformHint[1])}" target="_blank" rel="noopener noreferrer">Инструкция ↗</a>` : ""}</p>` : ""}
    <ol class="g2w-steps">${def.steps.map((step, index) => g2wStepHtml(def, productId, step, index)).join("")}</ol>
    <div class="g2w-verify"><div><strong>Проверка результата</strong><small>Отметки выше фиксируют действия. Здесь подтвердите работу настройки отдельно.</small></div><label>Где проверили<input data-g2w-source="${escapeAttr(def.id)}" data-g2w-product="${escapeAttr(productId)}" value="${escapeAttr(verification?.source_url || "")}" placeholder="Ссылка на отчёт или название сервиса"></label><div class="g2w-verify-actions"><button type="button" data-g2w-verify="passed" data-g2w-card="${escapeAttr(def.id)}" data-g2w-product="${escapeAttr(productId)}" ${g2wCanConfirm(def, productId) ? "" : 'disabled title="Сначала завершите шаги, заполните поля и проверьте настройки компании"'}>Работает</button><button type="button" data-g2w-verify="failed" data-g2w-card="${escapeAttr(def.id)}" data-g2w-product="${escapeAttr(productId)}">Не работает</button></div>
    <small class="g2w-verification-state" data-g2w-verify-state>${escapeHtml(g2wVerificationLabel(def, productId))}</small><small class="g2w-verification-state" data-g2w-auto-state>${escapeHtml(g2wAutoLabel(def, productId))}</small></div>`}</div></details>`;
}
function g2wScopeHtml(scope, productId = "") {
  const defs = G2W_CARDS.filter((def) => def.scope === scope);
  const statuses = Object.fromEntries(defs.map((def) => [def.id, g2wStatus(def, productId)]));
  const ready = Object.values(statuses).filter((status) => status === "ready").length;
  const skipped = Object.values(statuses).filter((status) => status === "not_needed").length;
  return `<div class="g2w-scope" data-g2w-scope="${scope}" data-g2w-statuses="${escapeAttr(JSON.stringify(statuses))}"><div class="g2w-scope-summary"><strong>${scope === "company" ? "Техническая основа компании" : "Готовность выбранного продукта"}</strong><span>${ready} из ${defs.length - skipped} готово${skipped ? ` · ${skipped} не требуется` : ""}</span></div>${defs.map((def) => g2wCardHtml(def, productId, statuses[def.id])).join("")}</div>`;
}
function g2wLegacyHtml(gate, scope, visibleIds) {
  const retired = gate?.id === "gate-2" && typeof G2YP_OLD_CARDS !== "undefined" ? G2YP_OLD_CARDS : new Set();
  const hiddenVkAdsCard = gate?.id === "gate-2" && scope === "company";
  const omit = (card) => retired.has(card.id) || (hiddenVkAdsCard && card.id === "g2-marketing-vk-ads");
  const sections = g2GetSections(gate, visibleIds).map((section) => ({
    ...section, cards: section.cards.filter((card) => !omit(card)),
  })).filter((section) => section.cards.length);
  const rendered = new Set(sections.flatMap((section) => section.cards.map((card) => card.id)));
  const hidden = (gate.cards || []).filter((card) => !omit(card) && !rendered.has(card.id) && g2CardScopeV267(card).scope === scope);
  return `<details class="g2w-additional" data-ui-keeper-key="g2w:additional:${scope}"><summary>Дополнительные настройки <span>${sections.reduce((sum, section) => sum + section.cards.length, 0) + hidden.length} карточек</span></summary><div class="g2w-additional-body">${sections.map((section) => g2CompanySectionHtmlV226(section, scope)).join("")}${hidden.length ? `<section class="g2w-legacy-list"><h3>Ранее сохранённые карточки</h3>${hidden.map((card) => g2CardHtml(card)).join("")}</section>` : ""}</div></details>`;
}
function g2wOpenHash() {
  if (activeGateId !== "gate-2") return;
  let id = "";
  try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
  if (!id) return;
  // Historic card links must land on the service block that now owns the
  // workflow, including when its product scope and disclosure are closed.
  const service = typeof G2_SERVICE_BLOCK_CONFIGS !== "undefined" &&
    typeof g2ServiceBlockCardId === "function"
    ? [...G2_SERVICE_BLOCK_CONFIGS.values()].find((config) =>
      g2ServiceBlockCardId(config) === id)
    : null;
  const serviceBlock = service && els.contentArea.querySelector(
    `[data-g2sb-id="${CSS.escape(service.id)}"]`);
  if (serviceBlock) {
    gate0RevealSectionForNode(serviceBlock);
    guruDisclosureOpenStateV512()[guruDisclosureKeyV512(serviceBlock)] = true;
    serviceBlock.open = true;
    requestAnimationFrame(() => serviceBlock.scrollIntoView({ block: "start" }));
    return;
  }
  const target = document.getElementById(id) ||
    els.contentArea.querySelector(`[data-card="${CSS.escape(id)}"]`);
  if (!target) return;
  if (target.matches?.("details[data-g2mu-section]")) {
    target.open = true;
    for (const parent of [target.closest("[data-g2mu-block]"), target.closest("[data-g2y-company]")]) {
      if (parent) parent.open = true;
    }
  }
  const additional = target.closest(".g2w-additional");
  if (additional) {
    guruDisclosureOpenStateV512()[guruDisclosureKeyV512(additional)] = true;
    additional.open = true;
  }
  const section = target.closest(".g2-open-section");
  const header = section?.querySelector(":scope > [data-g2-toggle-section]");
  const body = section?.querySelector(":scope > .g2-section-body");
  if (header && body?.hidden) {
    getGate2AccordionState().sections[header.dataset.g2ToggleSection] = true;
    section.classList.add("is-open");
    header.setAttribute("aria-expanded", "true");
    body.hidden = false;
  }
  requestAnimationFrame(() => target.scrollIntoView({ block: "start" }));
}

const g2wPrevRender = renderGate2Redesign;
renderGate2Redesign = function (gate, cards) {
  if (gate?.id !== "gate-2") return g2wPrevRender.apply(this, arguments);
  ensureGate2Structure(gate);
  const visible = new Set((cards || gate.cards).map((card) => card.id));
  const audit = g2ScopeAuditV267(gate, state);
  const productIds = new Set(audit.product.map((row) => row.cardId));
  const companyVisible = new Set([...visible].filter((id) => !productIds.has(id)));
  const productVisible = new Set([...visible].filter((id) => productIds.has(id)));
  const product = guruV194SelectedProduct(state);
  els.contentArea.innerHTML = `<div class="g1-redesign g2-company-product-v226 g2w-workspace">
    <section class="g2-scope-v226" data-g2-scope="company">${gate0SectionHeadingHtml("Компания", "Пошаговая настройка и проверка технической основы.")}${g2wScopeHtml("company")}${g2wLegacyHtml(gate, "company", companyVisible)}</section>
    <section class="g2-scope-v226 g2-product-scope-v226" data-g2-scope="product">${gate0SectionHeadingHtml("Продукт/Услуга", "Проверка целевого маршрута и заявок для выбранной позиции.")}${guruV194ProductSelectHtml("gate2-product", { compact: true })}${product ? g2wScopeHtml("product", product.id) : '<p class="g2w-note">Выберите категорию и продукт, чтобы начать проверку.</p>'}${g2wLegacyHtml(gate, "product", productVisible)}</section>
  </div>`;
  bindGate2Events();
  bindCardInputs();
  renderGateNav();
  g2wOpenHash();
};
window.addEventListener("hashchange", g2wOpenHash);

const g2wPrevBlockStatuses = guruGateBlockStatuses;
guruGateBlockStatuses = function (gate) {
  if (gate?.id !== "gate-2") return g2wPrevBlockStatuses(gate);
  const product = guruV194SelectedProduct(state);
  return G2W_CARDS.filter((def) => def.scope === "company" || product)
    .map((def) => g2wStatus(def, def.scope === "product" ? product.id : ""));
};

// Downstream Gate 4 checks read the Metrika resolvers directly. Keep those
// resolvers aligned with the wizard's verified result without rewriting old
// form values or historical timestamps.
const g2wPrevCompanyMetrikaStatus = g2MetrikaCompanyStatusV374;
g2MetrikaCompanyStatusV374 = function (card) {
  const def = G2W_CARDS.find((item) => item.cardId === card?.id &&
    ["counter", "goal"].includes(item.id));
  return def ? g2wStatus(def) : g2wPrevCompanyMetrikaStatus.apply(this, arguments);
};
const g2wPrevProductMetrikaStatus = g2MetrikaProductStatusV367;
g2MetrikaProductStatusV367 = function (card, productId = guruV194SelectedProduct(state)?.id || "", workspace = state) {
  const def = G2W_CARDS.find((item) => item.cardId === card?.id &&
    ["productCounter", "productGoal"].includes(item.id));
  return def ? g2wStatus(def, productId, workspace)
    : g2wPrevProductMetrikaStatus.apply(this, arguments);
};

const g2wPrevExportRuntime = guruExportRuntimeModelV223;
guruExportRuntimeModelV223 = function (gateId) {
  const model = g2wPrevExportRuntime.apply(this, arguments);
  if (gateId !== "gate-2") return model;
  const product = guruV194SelectedProduct(state);
  const units = G2W_CARDS.filter((def) => def.scope === "company" || product)
    .map((def) => {
      const productId = def.scope === "product" ? product.id : "";
      const record = g2wRecord(def, productId);
      return guruExportModelUnitV223({
        unitId: `g2w-${def.id}${productId ? `-${productId}` : ""}`, gateId,
        title: def.title, status: g2wStatus(def, productId),
        sourceType: "gate2_setup_wizard", path: `state.gates[gate-2].cards[${def.cardId}].fields.g2SetupWizardV1.${productId ? `byProduct[${productId}]` : "company"}`,
        includedInGateReadiness: true, includedInDisplayedOverall: true,
        readinessRole: "direct", details: {
          scope: def.scope, sourceCardId: def.cardId, product_id: productId,
          progress: g2wProgress(def, productId), verification: record?.verification || null,
        },
      });
    });
  return { ...model, model: "gate2_setup_wizard", selectedProduct: product
    ? { id: product.id, name: product.name, categoryId: product.categoryId || "" } : null,
    displayedStatus: guruExportDiagnosticOverallV223(units.map((unit) => unit.status)), units };
};

const g2wPrevExportCardDiagnostic = guruExportGate2CardDiagnosticV223;
guruExportGate2CardDiagnosticV223 = function (card, rawStatus) {
  const diagnostic = g2wPrevExportCardDiagnostic.apply(this, arguments);
  diagnostic.includedInUi = true;
  diagnostic.includedInGateReadiness = false;
  diagnostic.readinessRole = "additional_settings";
  diagnostic.readinessStatus = null;
  diagnostic.readinessNormalizedStatus = null;
  return diagnostic;
};
GURU_EXPORT_CODE_REFERENCES_V223["gate-2"].push({
  file: "gate2-setup-wizard.js", line: 1, symbol: "guruGateBlockStatuses",
  role: "Gate 2 step verification, selected product readiness and export units",
});

function g2wUpdateNav() {
  if (activeGateId !== "gate-2") return;
  const label = els.gateNav?.querySelector('[data-gate-id="gate-2"] .small');
  const pills = els.contentArea?.querySelectorAll('.g2w-workspace .g2w-card > summary .status-pill');
  if (!label || !pills?.length) return;
  // The card statuses are already calculated while rendering or refreshing
  // the wizard. Reading them avoids running the full readiness graph again.
  const statuses = [...pills].map((pill) => [...pill.classList]
    .find((name) => name.startsWith("status-") && name !== "status-pill")?.slice(7) || "not_started");
  const readiness = guruReadinessFromStatuses(statuses);
  label.textContent = `${readiness.total} блоков, прогресс ${readiness.percent}%`;
}
const g2wPrevRenderGateNav = renderGateNav;
renderGateNav = function () {
  const result = g2wPrevRenderGateNav.apply(this, arguments);
  g2wUpdateNav();
  return result;
};
let g2wPendingStepSave = null;
function g2wFlushPendingStepSave(synchronous = false) {
  const pending = g2wPendingStepSave;
  if (!pending) return;
  g2wPendingStepSave = null;
  if (pending.frame !== null) cancelAnimationFrame(pending.frame);
  clearTimeout(pending.timer);
  const options = { durable: true, workspace: pending.workspace, projectId: pending.projectId };
  if (synchronous) guruPersistStateFast(options);
  else guruQueueWorkspaceSave(options);
}
function g2wSave(options = {}) {
  guruGateReadinessCache.delete("gate-2");
  if (!options.afterPaint) {
    if (g2wPendingStepSave) g2wFlushPendingStepSave();
    guruQueueWorkspaceSave({ durable: true });
    return;
  }
  // Let the checked state paint before cloning a large workspace for the save
  // worker. beforeunload/pagehide retain a synchronous durability fallback.
  if (typeof _guruTabDirty !== "undefined") _guruTabDirty = true;
  if (g2wPendingStepSave?.workspace === state && g2wPendingStepSave.projectId === activeProjectId) {
    clearTimeout(g2wPendingStepSave.timer);
    g2wPendingStepSave.timer = setTimeout(() => g2wFlushPendingStepSave(), 180);
    return;
  }
  if (g2wPendingStepSave) g2wFlushPendingStepSave();
  const pending = { workspace: state, projectId: activeProjectId, frame: null, timer: null };
  g2wPendingStepSave = pending;
  pending.frame = requestAnimationFrame(() => {
    if (g2wPendingStepSave !== pending) return;
    pending.frame = null;
    clearTimeout(pending.timer);
    pending.timer = setTimeout(() => g2wFlushPendingStepSave(), 180);
  });
}
window.addEventListener("pagehide", () => g2wFlushPendingStepSave(true));
function g2wAffectedIds(changedCardId, field = "") {
  if (!changedCardId) return null;
  const affected = new Set([changedCardId]);
  // These fields feed the setup of other cards even without a verification
  // dependency. Follow explicit verification dependencies transitively.
  if (changedCardId === "domain") affected.add("safety");
  if (changedCardId === "domain" && field === "platform")
    ["counter", "vk", "crm"].forEach((id) => affected.add(id));
  if (changedCardId === "landing" && ["route", "productUrl"].includes(field))
    ["productCounter", "productGoal", "productVk", "lead"].forEach((id) => affected.add(id));
  let changed = true;
  while (changed) {
    changed = false;
    for (const def of G2W_CARDS) {
      if (!affected.has(def.id) && g2wUpstreamIds(def).some((id) => affected.has(id))) {
        affected.add(def.id);
        changed = true;
      }
    }
  }
  return affected;
}
function g2wAffectsProductReadiness(changedCardId, field = "") {
  const affected = g2wAffectedIds(changedCardId, field);
  return affected && G2W_CARDS.some((def) => def.scope === "product" && affected.has(def.id));
}
function g2wRefreshProductSelectorIfNeeded(changedCardId, field = "") {
  if (g2wAffectsProductReadiness(changedCardId, field) &&
      typeof guruV194ScheduleProductSelectorRefreshV1 === "function")
    guruV194ScheduleProductSelectorRefreshV1();
}
function g2wRefresh(options = {}) {
  if (activeGateId !== "gate-2") return;
  const affected = g2wAffectedIds(options.changedCardId, options.field);
  const product = guruV194SelectedProduct(state);
  for (const scope of ["company", "product"]) {
    const productId = scope === "product" ? product?.id || "" : "";
    const defs = G2W_CARDS.filter((def) => def.scope === scope);
    const scopeNode = els.contentArea.querySelector(`[data-g2w-scope="${scope}"]`);
    if (!scopeNode) continue;
    let statuses = {};
    try { statuses = JSON.parse(scopeNode.dataset.g2wStatuses || "{}"); } catch { /* Rebuild below. */ }
    for (const def of defs) {
      if (affected && !affected.has(def.id)) continue;
      const status = g2wStatus(def, productId);
      statuses[def.id] = status;
      const cardNode = scopeNode.querySelector(`[data-g2w-card-view="${def.id}"]`);
      if (!cardNode) continue;
      const pill = cardNode.querySelector(":scope > summary .status-pill");
      if (pill) { pill.className = `status-pill status-${status}`; pill.textContent = g2wStatusLabel(status); }
      const progress = cardNode.querySelector(":scope > summary .g2w-card-meta > span:first-child");
      if (progress) progress.textContent = g2wProgress(def, productId);
      for (const stepNode of cardNode.querySelectorAll("[data-g2w-step]"))
        stepNode.closest(".g2w-step")?.classList.toggle("is-done", stepNode.checked);
      for (const link of cardNode.querySelectorAll("[data-g2w-open-step]")) {
        const step = def.steps.find((item) => item[0] === link.dataset.g2wOpenStep);
        const url = step ? g2wOpenUrl(def, productId, step) : "";
        link.hidden = !url;
        if (url) link.href = url;
        else link.removeAttribute("href");
      }
      for (const link of cardNode.querySelectorAll("[data-g2w-doc-step]")) {
        const step = def.steps.find((item) => item[0] === link.dataset.g2wDocStep);
        const url = step ? g2wDocForStep(step, state, def) : "";
        link.hidden = !url;
        if (url) link.href = url;
        else link.removeAttribute("href");
      }
      const manual = cardNode.querySelector("[data-g2w-verify-state]");
      if (manual) manual.textContent = g2wVerificationLabel(def, productId);
      const auto = cardNode.querySelector("[data-g2w-auto-state]");
      if (auto) auto.textContent = g2wAutoLabel(def, productId);
      const pass = cardNode.querySelector('[data-g2w-verify="passed"]');
      if (pass) pass.disabled = !g2wCanConfirm(def, productId);
      const inherited = cardNode.querySelector(".g2w-inherited");
      if (inherited) inherited.textContent = ({
        productCounter: `Счётчик компании: ${g2wCompanyValue("counterId") || "не указан"}`,
        productGoal: `Цель компании: ${g2wCompanyValue("goalName") || "не указана"}`,
        productVk: `Пиксель компании: ${g2wValue(G2W_CARDS[3], "", "pixelId") || "не указан"}`,
      })[def.id] || "";
    }
    // A focused edit changes only its source and explicit dependants. Keep
    // the other status results from the last render instead of recalculating
    // the entire (potentially large) project on every character.
    for (const def of defs) if (!statuses[def.id]) statuses[def.id] = g2wStatus(def, productId);
    scopeNode.dataset.g2wStatuses = JSON.stringify(statuses);
    const ready = defs.filter((def) => statuses[def.id] === "ready").length;
    const skipped = defs.filter((def) => statuses[def.id] === "not_needed").length;
    const summary = scopeNode.querySelector(".g2w-scope-summary > span");
    if (summary) summary.textContent = `${ready} из ${defs.length - skipped} готово${skipped ? ` · ${skipped} не требуется` : ""}`;
  }
  g2wUpdateNav();
}
function g2wDef(id) { return G2W_CARDS.find((def) => def.id === id); }
function g2wProductFrom(target) { return target.dataset.g2wProduct || ""; }
function g2wCanEdit(def, productId) { return def && (def.scope === "company" || productId === guruV194SelectedProduct(state)?.id); }

document.addEventListener("input", (event) => {
  const target = event.target?.closest?.("[data-g2w-field]");
  if (!target || target.tagName === "SELECT") return;
  const def = g2wDef(target.dataset.g2wCard);
  const productId = g2wProductFrom(target);
  if (!g2wCanEdit(def, productId)) return;
  g2wSetValue(def, productId, target.dataset.g2wField, target.value);
  guruGateReadinessCache.delete("gate-2");
  // The model and autosave update on every keystroke. Verification and
  // dependant cards update on change, when the field has been committed.
  flashSaving({ skipProductSelectorRefresh: true });
});
document.addEventListener("change", (event) => {
  const target = event.target;
  if (target.matches?.("[data-g2w-step]")) {
    const def = g2wDef(target.dataset.g2wCard);
    const productId = g2wProductFrom(target);
    if (!g2wCanEdit(def, productId)) return;
    const record = g2wRecord(def, productId, true);
    const effectiveDef = typeof g2StepWizardDef === "function" ? g2StepWizardDef(def, productId) : def;
    const step = effectiveDef.steps.find((item) => item[0] === target.dataset.g2wStep);
    if (!step) return;
    record.steps[step[0]] = { step_id: step[0], scope: def.scope, project_id: guruV194ProjectId(),
      product_id: productId, result: target.checked ? "done" : "pending", params: { ...(step[2] ? { [step[2]]: g2wValue(def, productId, step[2]) } : {}),
        ...(record.steps[step[0]]?.params?.customFields ? { customFields: record.steps[step[0]].params.customFields } : {}) },
      verification_type: "self_reported_action", checked_at: new Date().toISOString(), source_url: g2wDocForStep(step, state, def) || g2wOpenUrl(def, productId, step) || "" };
    g2wSave({ afterPaint: true }); g2wRefresh({ changedCardId: def.id, stepToggle: true });
    g2wRefreshProductSelectorIfNeeded(def.id);
    return;
  }
  if (target.matches?.("[data-g2w-field]") && target.tagName === "SELECT") {
    const def = g2wDef(target.dataset.g2wCard);
    const productId = g2wProductFrom(target);
    if (!g2wCanEdit(def, productId)) return;
    g2wSetValue(def, productId, target.dataset.g2wField, target.value);
    g2wSave();
    if (["platform", "route", "crmName"].includes(target.dataset.g2wField)) renderGate();
    else {
      g2wRefresh({ changedCardId: def.id, field: target.dataset.g2wField });
      g2wRefreshProductSelectorIfNeeded(def.id, target.dataset.g2wField);
    }
    return;
  }
  if (target.matches?.("[data-g2w-field]")) {
    g2wSave();
    g2wRefresh({ changedCardId: target.dataset.g2wCard, field: target.dataset.g2wField });
    g2wRefreshProductSelectorIfNeeded(target.dataset.g2wCard, target.dataset.g2wField);
    return;
  }
  if (target.matches?.("[data-g2w-use]")) {
    const def = g2wDef(target.dataset.g2wUse === "seo" ? "webmaster" : "vk");
    g2wRecord(def, "", true).values.used = target.value;
    g2wSave(); g2wRefresh({ changedCardId: def.id });
    g2wRefreshProductSelectorIfNeeded(def.id);
  }
});
function g2wVerify(def, productId, result, type, source) {
  if (result === "passed" && !g2wCanConfirm(def, productId)) return;
  const record = g2wRecord(def, productId, true);
  if (record.verification) (record.history ||= []).push(record.verification);
  record.verification = { step_id: "final_verification", scope: def.scope, project_id: guruV194ProjectId(),
    product_id: productId, result, params: JSON.parse(g2wInputs(def, productId)),
    verification_type: type, checked_at: new Date().toISOString(), source_url: source,
    fingerprint: g2wInputs(def, productId) };
  if (def.id === "counter") g2MetrikaCompanyDataV374("counter").counterCheck = result === "passed" ? "found" : result === "failed" ? "not_found" : "";
  if (def.id === "goal") g2MetrikaCompanyDataV374("goals").primaryGoal.state = result === "passed" ? "works" : result === "failed" ? "not_works" : "";
  if (def.id === "productCounter" && result === "passed") g2MetrikaProductRowV367(g2wCard(def), productId, true).visitAt = new Date().toISOString().slice(0, 16);
  if (def.id === "productGoal" && result === "passed") g2MetrikaProductRowV367(g2wCard(def), productId, true).testConversionAt = new Date().toISOString().slice(0, 16);
  g2wSave(); g2wRefresh({ changedCardId: def.id });
  g2wRefreshProductSelectorIfNeeded(def.id);
}
document.addEventListener("click", async (event) => {
  const button = event.target?.closest?.("[data-g2w-verify], [data-g2w-auto]");
  if (!button) return;
  const def = g2wDef(button.dataset.g2wCard || button.dataset.g2wAuto);
  const productId = g2wProductFrom(button);
  if (!g2wCanEdit(def, productId)) return;
  if (button.dataset.g2wVerify) {
    const source = g2wText(button.closest(".g2w-verify")?.querySelector("[data-g2w-source]")?.value);
    if (!source) { button.closest(".g2w-verify")?.querySelector("[data-g2w-source]")?.focus(); return; }
    g2wVerify(def, productId, button.dataset.g2wVerify, "manual", source);
    return;
  }
  const url = g2wValue(def, productId, def.id === "domain" ? "homeUrl" : "productUrl");
  let result = "inconclusive";
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("unsupported");
    const response = await fetch(parsed.href, { method: "GET", mode: "cors", cache: "no-store", signal: AbortSignal.timeout(7000) });
    result = response.ok ? "passed" : "failed";
  } catch { result = "inconclusive"; }
  const record = g2wRecord(def, productId, true);
  record.auto = { step_id: "url_availability", scope: def.scope, project_id: guruV194ProjectId(),
    product_id: productId, result, params: { url }, verification_type: "automatic",
    checked_at: new Date().toISOString(), source_url: url, fingerprint: g2wInputs(def, productId) };
  // URL availability is one check; HTTPS, redirects, mobile CTA and lead flow
  // still require the separate final confirmation.
  g2wSave(); g2wRefresh({ changedCardId: def.id });
  g2wRefreshProductSelectorIfNeeded(def.id);
});
