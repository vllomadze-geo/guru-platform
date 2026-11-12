/* Gate 2 company Metrika: one view over the existing wizard, register and audit records.
   The new review log lives in the canonical counter record; no counter or goal is copied. */
const G2MU_DOC = Object.freeze({
  counter: "https://yandex.ru/support/metrica/ru/general/creating-counter",
  check: "https://yandex.ru/support/metrica/ru/general/check-counter",
  popular: "https://yandex.ru/support/metrica/ru/content/popular",
  processing: "https://yandex.ru/support/metrica/ru/general/how-it-works",
  goal: "https://yandex.ru/support/metrica/ru/general/check-goal",
  filters: "https://yandex.ru/support/metrica/ru/general/filters.html",
  robots: "https://yandex.ru/support/metrica/ru/general/robots",
  robotReport: "https://yandex.ru/support/metrica/ru/reports/robots",
  access: "https://yandex.ru/support/metrica/ru/general/access",
  transfer: "https://yandex.ru/support/metrica/ru/troubleshooting/move-counter-gen",
  webvisor: "https://yandex.ru/support/metrica/ru/webvisor/settings",
  tilda: "https://help-ru.tilda.cc/statistics/yandex-metrika",
  tildaGoal: "https://help-ru.tilda.cc/statistics-goal",
});

const G2MU_SECTIONS = Object.freeze([
  { title: "Подключение счётчика", purpose: "Найти счётчик, установить его и подтвердить передачу визитов.", steps: [
    { id: "s11", title: "Найти или создать счётчик", what: "Найдите один счётчик для домена компании или создайте его, если счётчика ещё нет.", where: ["Откройте Яндекс Метрику и войдите под учётной записью компании.", "На странице «Мои счётчики» найдите основной домен из Gate 0.", "Если счётчика нет, нажмите «Добавить счётчик», укажите название и адрес сайта, выберите часовой пояс и валюту, затем сохраните."], compare: ["Сравните адрес в списке счётчиков с адресом сайта из Gate 0.", "Успех: счётчик существует и для того же сайта нет случайного дубля. При расхождении откройте настройки нужного счётчика и исправьте адрес перед подтверждением."], doc: "counter" },
    { id: "s12", title: "Сохранить ID счётчика", what: "Скопируйте числовой ID действующего счётчика в GURU.", where: ["Откройте найденный счётчик в Метрике и перейдите в «Настройки» → «Счётчик».", "Скопируйте номер счётчика и вставьте его в поле ниже. Сохранение в GURU выполняется автоматически."], compare: ["Сравните номер в настройках Метрики с номером ниже посимвольно.", "Успех: оба номера совпадают и состоят только из цифр. При ошибке исправьте номер и повторите проверку установки."], doc: "counter" },
    { id: "s13", title: "Подключить счётчик к сайту", what: "Добавьте этот же ID на рабочий сайт и опубликуйте изменения.", where: ["Откройте панель платформы, на которой размещён сайт, и войдите в рабочий проект.", "Найдите настройку подключения Яндекс Метрики; вставьте ID из GURU, сохраните и опубликуйте сайт.", "Для Tilda: «Настройки сайта» → «Аналитика» → «Яндекс Метрика» → ID → сохранить → «Опубликовать все страницы»."], compare: ["Сравните ID в платформе с ID в GURU и откройте опубликованный адрес из Gate 0.", "Успех: в настройке сайта стоит тот же ID, опубликованы все нужные страницы. Если платформа другая, используйте её официальный способ установки и затем выполните шаг проверки."], doc: "tilda" },
    { id: "s14", title: "Проверить установку и передачу данных", what: "Подтвердите наличие счётчика, отправку PageView и просмотры проверенной страницы в Метрике.", compare: ["Сверьте ID на вкладке Counters с ID счётчика в GURU, затем проверьте просмотры нужной страницы в том же счётчике.", "Просмотры страницы подтверждают сбор данных, но просмотры других посетителей не доказывают получение именно вашего тестового визита. Для точного автоматического сопоставления нужен отдельный идентификатор теста. Сохраните ссылку на отчёт или описание результата ниже."], doc: "check", evidence: true },
  ] },
  { title: "Базовые настройки", purpose: "Параметры счётчика, автоцели, Вебвизор, фильтры и доступ.", steps: [
    { id: "s21", title: "Проверить параметры счётчика", what: "Проверьте адрес сайта, часовой пояс, валюту и дополнительные адреса в Метрике.", where: ["Откройте нужный счётчик в Метрике → «Настройка» → «Счётчик».", "Сверьте основной адрес с адресом сайта ниже, проверьте часовой пояс, валюту и дополнительные адреса. При необходимости исправьте настройки в Метрике и сохраните их."], compare: ["Основной адрес должен соответствовать сайту из Gate 0; дополнительные адреса должны относиться к этому же сайту.", "После проверки отметьте шаг галочкой. Если основной адрес неверен, исправьте его в Метрике или уточните адрес сайта в Gate 0."], doc: "counter" },
    { id: "s22", title: "Проверить автоматические цели", what: "Зафиксируйте реальный режим автоматических целей.", where: ["В Метрике откройте «Настройки» → «Счётчик» и найдите «Автоматические цели».", "При необходимости переключите режим и сохраните; в GURU выберите фактическое состояние."], compare: ["Сверьте переключатель в Метрике с полем ниже.", "Успех: состояния совпадают. Автоцели не заменяют основную подтверждённую бизнес-конверсию."], doc: "counter" },
    { id: "s23", title: "Настроить Вебвизор", what: "Зафиксируйте состояние записи визитов и проверьте защиту полей форм.", where: ["Метрика → «Настройки» → «Счётчик»: включите «Вебвизор, карта скроллинга, аналитика форм», если он нужен.", "Откройте вкладку «Вебвизор», проверьте скрытие конфиденциальных полей, сохраните изменения и при необходимости обновите код счётчика.", "После новых визитов откройте записи Вебвизора."], compare: ["Сверьте состояние с GURU и просмотрите новую запись без раскрытия личных данных.", "Успех: записи доступны, содержимое чувствительных полей защищено. Если записей нет, проверьте код, фильтры и наличие новых визитов."], doc: "webvisor" },
    { id: "s24", title: "Настроить внутренние визиты", what: "Включите «Не учитывать мои визиты» и проверьте, что собственный тест исключён, а визит из приватного окна учтён.", doc: "filters" },
    { id: "s25", title: "Проверить учёт роботов", what: "Проверьте фильтрацию роботов и их влияние на отчёты Метрики для сайта проекта.", doc: "robots" },
    { id: "s26", title: "Проверить права доступа", what: "Проверьте владельца счётчика проекта, права сотрудников и подрядчиков, представительский и публичный доступ.", doc: "access" },
  ] },
  { title: "Конверсионные цели", purpose: "", subsections: [
    { number: "3.1", title: "Основные конверсии", stepIds: ["s311", "s312", "s313", "s314", "s315", "s316", "s317"] },
    { number: "3.2", title: "Промежуточные конверсии", stepIds: ["s321", "s322"] },
    { number: "3.3", title: "Поведенческие цели", stepIds: ["s331", "s332", "s333", "s334", "s335"] },
  ], steps: [
    { id: "s311", number: "3.1.1", title: "Оформленный заказ", what: "Настроить передачу сведений об оформленных заказах с сайта в Яндекс Метрику и подтвердить корректную работу конверсионной цели «Ecommerce: покупка»." },
    { id: "s312", number: "3.1.2", title: "Полученная заявка", what: "Настроить Яндекс Метрику для регистрации успешно отправленных заявок с сайта и подтвердить, что каждое зарегистрированное целевое действие соответствует фактическому обращению.", optional: true },
    { id: "s313", number: "3.1.3", title: "Подтверждённая оплата", what: "Настроить в Яндекс Метрике отдельную конверсию, которая фиксирует фактически оплаченную покупку и может использоваться для оптимизации Яндекс Директа по оплаченным заказам.", optional: true },
    { id: "s314", number: "3.1.4", title: "Состоявшийся целевой звонок", what: "Настроить Яндекс Метрику для регистрации реальных телефонных обращений клиентов и подтвердить, что целевые звонки корректно учитываются как конверсии.", optional: true },
    { id: "s315", number: "3.1.5", title: "Подтверждённая запись", what: "Настроить Яндекс Метрику для регистрации успешно созданных записей на услуги и проверить, что каждая конверсия соответствует реальной записи клиента.", optional: true },
    { id: "s316", number: "3.1.6", title: "Успешная регистрация", what: "Настроить Яндекс Метрику для учёта новых пользователей, которые успешно создали учётную запись на сайте.", optional: true },
    { id: "s317", number: "3.1.7", title: "Полученная заявка из окна (Pop-up)", what: "Настроить Яндекс Метрику для регистрации успешно отправленных заявок из всплывающих окон (Pop-up) сайта и убедиться, что каждое достижение цели соответствует фактически полученному обращению.", optional: true },
    { id: "s321", number: "3.2.1", title: "Добавление товара в корзину", what: "Настроить регистрацию добавлений товаров в корзину средствами Яндекс Метрики и подтвердить корректную передачу сведений о выбранном товаре.", optional: true },
    { id: "s322", number: "3.2.2", title: "Клик по номеру телефона", what: "Настроить Яндекс Метрику для регистрации нажатий на телефонные номера сайта и подтвердить, что цель фиксирует именно клики, а не простое наведение курсора.", optional: true },
    { id: "s331", number: "3.3.1", title: "Поиск по сайту", what: "Настроить и проверить внутренний поиск сайта, чтобы посетители могли находить товары, услуги или информацию по поисковому запросу.", optional: true },
    { id: "s332", number: "3.3.2", title: "Посещение ключевого раздела", what: "Настроить Яндекс Метрику для регистрации посещений коммерчески значимого раздела сайта и проверить, что соответствующая конверсия корректно передаётся и отображается в отчётах.", optional: true },
    { id: "s333", number: "3.3.3", title: "Просмотр нескольких товаров", what: "Проверить, передаёт ли интернет-магазин в Яндекс Метрику данные о просмотре товаров, и определить возможность анализа нескольких просмотров в рамках одного визита.", optional: true },
    { id: "s334", number: "3.3.4", title: "Количество просмотров страниц", what: "Настроить Яндекс Метрику для регистрации визитов, в которых посетитель просмотрел определённое количество страниц сайта, и проверить корректность достижения цели.", optional: true },
    { id: "s335", number: "3.3.5", title: "Продолжительность визита", what: "Настроить Яндекс Метрику для регистрации визитов, продолжительность которых превышает установленное время, и проверить, что соответствующая конверсия корректно отображается в отчётах.", optional: true },
  ] },
  { title: "Дополнительные инструменты", purpose: "Контентная аналитика и Яндекс Тег Менеджер при необходимости.", steps: [
    { id: "s4content", number: "4.1", title: "Контентная аналитика", what: "Настроить контентную аналитику Яндекс Метрики для сбора статистики о просмотрах, доскроллах и дочитываниях текстовых материалов сайта, затем проверить правильность передачи данных и их отображение в отчётах.", optional: true },
    { id: "s4tags", number: "4.2", title: "Яндекс Тег Менеджер", what: "Проверить подключение Яндекс Тег Менеджера к действующему счётчику Яндекс Метрики, убедиться в доступности контейнера и сохранении работоспособности существующих аналитических интеграций.", optional: true },
  ] },
]);

const G2MU_ALL = G2MU_SECTIONS.flatMap(section => section.steps);
const G2MU_STEP_IDS = new Set(G2MU_ALL.map(step => step.id));
const G2MU_VERBATIM_STEP_IDS = new Set(["s311", "s312", "s313", "s314", "s315", "s316", "s317", "s321", "s322", "s331", "s332", "s333", "s334", "s335", "s4content", "s4tags"]);
const G2MU_REVIEW_FIELD = "unifiedReviewV1";
const G2MU_EVIDENCE_STEPS = new Set(G2MU_ALL.filter(step => step.evidence).map(step => step.id));
const G2MU_OPTIONAL_STEPS = new Set(G2MU_ALL.filter(step => step.optional).map(step => step.id));
const G2MU_OLD_WIZARD_STEPS = Object.freeze({
  s11: ["counter", "create"], s12: ["counter", "id"], s13: ["counter", "install"],
  s14: ["counter", "check", "visit"], s31: ["goal", "action"],
  s32: ["goal", "type"], s33: ["goal", "add", "name", "id"],
  s35: ["goal", "test"], s36: ["goal", "report"],
});

function g2muSourceCards() {
  return Object.fromEntries(["counter", "goals", "filter", "robots"].map(kind => [kind, g2MetrikaCompanyCardV374(kind)]));
}
function g2muReview(create = false) {
  const card = g2MetrikaCompanyCardV374("counter");
  if (!card) return {};
  const data = card.fields[G2_METRIKA_COMPANY_FIELD_V374];
  if (create && !data[G2MU_REVIEW_FIELD]) data[G2MU_REVIEW_FIELD] = {};
  return data[G2MU_REVIEW_FIELD] || {};
}
function g2muFingerprint(id) {
  const counter = g2MetrikaCompanyDataV374("counter");
  const goals = g2MetrikaCompanyDataV374("goals");
  const filter = g2MetrikaCompanyDataV374("filter");
  const goal = goals.primaryGoal || {};
  const site = megaPlatformUrl("fixed", "home", state) || state?.project?.website || "";
  const selectedProductId = ["s311", "s321"].includes(id) ? state?.project?.gate0ScopeUiV194?.selectedProductId || "" : "";
  const selectedProductUrl = selectedProductId ? megaPlatformProductUrl(selectedProductId, state) : "";
  const deps = { s11: [site], s12: [counter.counterId], s13: [site, counter.counterId, g2wPlatform()],
    s14: [site, counter.counterId, counter.counterCheck, g2wPlatform()],
    s21: [site, counter.counterId],
    s22: [counter.automaticGoals], s23: [counter.webvisorEnabled],
    s24: [site, counter.counterId, filter.mode, filter.internalVisitTestV1?.runId,
      filter.internalVisitTestV1?.siteUrl, filter.internalVisitTestV1?.counterId],
    s25: [site, counter.counterId], s26: [site, counter.counterId],
    s311: [site, counter.counterId, g2wPlatform(), counter.ecommerceEnabled,
      counter.ecommerceContainer, selectedProductId, selectedProductUrl],
    s312: [site, counter.counterId, g2wPlatform(), goal.name, goal.goalId, goal.condition],
    s313: [site, counter.counterId, g2wPlatform(), counter.ecommerceApplicability,
      counter.ecommerceEnabled, goal.name, goal.goalId, goal.condition],
    s314: [site, counter.counterId, g2wPlatform(), goal.name, goal.goalId, goal.condition],
    s315: [site, counter.counterId, g2wPlatform(), goal.name, goal.goalId, goal.condition],
    s316: [site, counter.counterId, g2wPlatform(), goal.name, goal.goalId, goal.condition],
    s317: [site, counter.counterId, g2wPlatform(), goal.name, goal.goalId, goal.condition],
    s321: [site, counter.counterId, g2wPlatform(), counter.ecommerceApplicability,
      counter.ecommerceEnabled, counter.ecommerceContainer, selectedProductId, selectedProductUrl],
    s322: [site, counter.counterId, g2wPlatform(), goal.name, goal.goalId, goal.condition],
    s331: [site, counter.counterId, g2wPlatform(), goal.name, goal.goalId, goal.condition],
    s332: [site, counter.counterId, g2wPlatform(), goal.name, goal.goalId, goal.condition],
    s333: [site, counter.counterId, g2wPlatform(), counter.ecommerceApplicability,
      counter.ecommerceEnabled, counter.ecommerceContainer],
    s334: [site, counter.counterId, g2wPlatform(), goal.name, goal.goalId, goal.condition],
    s335: [site, counter.counterId, g2wPlatform(), goal.name, goal.goalId, goal.condition],
    s31: [goal.businessAction], s32: [goal.trackingMethod, goal.type, goal.condition],
    s33: [goal.name, goal.type, goal.condition, goal.goalId,
      (Array.isArray(goals.archivedOtherGoalsV382) ? goals.archivedOtherGoalsV382 : [])
        .map(item => [item.entryId, item.name, item.type, item.condition, item.goalId])],
    s34: [site, goal.type, goal.condition, goal.goalId], s35: [site, goal.businessAction, goal.goalId],
    s36: [counter.counterId, goal.name, goal.type, goal.condition, goal.goalId, goal.state],
    s4content: [site, counter.counterId, g2wPlatform(), counter.contentAnalytics],
    s4tags: [site, counter.counterId, g2wPlatform(), counter.tagManagerEnabled, counter.tagManagerCustomHtml],
  };
  return JSON.stringify(deps[id] || []);
}
function g2muStatus(id) {
  if (!G2MU_STEP_IDS.has(id)) return "not_started";
  const review = g2muReview()[id];
  const counter = g2MetrikaCompanyDataV374("counter");
  if (review?.result === "stale") return "recheck";
  const current = review?.fingerprint === g2muFingerprint(id);
  if (review?.result && !current) return "recheck";
  if (review?.result === "not_needed" && G2MU_OPTIONAL_STEPS.has(id)) return "not_needed";
  if (review?.result === "pending") return "needs_check";
  if (review?.result === "failed") return "problem";
  if (review?.result === "passed") {
    if (G2MU_EVIDENCE_STEPS.has(id) && !String(review.evidence || "").trim()) return "in_progress";
    if (!g2muRequiredValues(id)) return "in_progress";
    if (id === "s14" && counter.counterCheck !== "found") return "recheck";
    if (id === "s36" && g2MetrikaCompanyDataV374("goals").primaryGoal?.state !== "works") return "recheck";
    return "ready";
  }
  const inherited = { s14: counter.counterCheck, s36: g2MetrikaCompanyDataV374("goals").primaryGoal?.state }[id];
  if (inherited || g2muLegacyEvidence(id)) return "recheck";
  return "not_started";
}
function g2muLegacyEvidence(id) {
  const mapping = G2MU_OLD_WIZARD_STEPS[id];
  if (mapping) {
    const record = g2wRecord(g2wDef(mapping[0]));
    if (mapping.slice(1).some(stepId => record?.steps?.[stepId]?.result === "done")) return true;
    if (["s14", "s36"].includes(id) && record?.verification) return true;
  }
  const counter = g2MetrikaCompanyDataV374("counter");
  const goals = g2MetrikaCompanyDataV374("goals");
  const filter = g2MetrikaCompanyDataV374("filter");
  const robots = g2MetrikaCompanyDataV374("robots");
  return Boolean(({
    s12: counter.counterId, s22: counter.automaticGoals, s23: counter.webvisorEnabled,
    s24: filter.mode, s25: robots.mode, s33: goals.primaryGoal?.goalId,
  })[id]);
}
function g2muRequiredValues(id) {
  const counter = g2MetrikaCompanyDataV374("counter");
  const goals = g2MetrikaCompanyDataV374("goals");
  const filter = g2MetrikaCompanyDataV374("filter");
  const goal = goals.primaryGoal || {};
  const text = value => Boolean(String(value || "").trim());
  return ({
    s12: () => /^\d+$/.test(String(counter.counterId || "")),
    s22: () => ["yes", "no"].includes(counter.automaticGoals),
    s23: () => ["yes", "no"].includes(counter.webvisorEnabled),
    s24: () => filter.mode === "cookie",
    s31: () => text(goal.businessAction),
    s32: () => text(goal.trackingMethod),
    s33: () => text(goal.name) && text(goal.type) && text(goal.condition) && /^\d+$/.test(String(goal.goalId || "")),
    s36: () => /^\d+$/.test(String(goal.goalId || "").replace(/^ID\s*/i, "").trim()),
  }[id] || (() => true))();
}
function g2muAggregate(statuses) {
  if (statuses.every(status => status === "not_needed")) return "not_needed";
  if (statuses.includes("problem")) return "problem";
  if (statuses.includes("recheck") || statuses.includes("needs_check")) return "recheck";
  if (statuses.every(status => ["ready", "not_needed"].includes(status))) return "ready";
  if (statuses.some(status => status === "ready" || status === "in_progress")) return "in_progress";
  return "not_started";
}
function g2muLabel(status) {
  return { ready: "Готово", in_progress: "В работе", not_started: "Не начато",
    problem: "Проблема", not_needed: "Не требуется", recheck: "Требует повторной проверки",
    needs_check: "Требует проверки" }[status] || status;
}
function g2muStepWord(count) {
  return count % 10 === 1 && count % 100 !== 11 ? "шаг" :
    count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14) ? "шага" : "шагов";
}
function g2muMarkerState(marker, step, number, status) {
  const ready = status === "ready";
  const notNeeded = status === "not_needed";
  marker.dataset.g2muMarkerStatus = status;
  marker.dataset.g2muReview = ready ? "reset" : "passed";
  marker.disabled = notNeeded;
  marker.setAttribute("aria-pressed", String(ready));
  marker.setAttribute("aria-label", `Шаг ${number}: ${step.title}. ${g2muLabel(status)}. ${ready ? "Снять подтверждение" : notNeeded ? "Отметка не требуется" : "Подтвердить сверку"}`);
  marker.textContent = ready ? "✓" : status === "problem" ? "!" : notNeeded ? "−" : "";
}
function g2muMarkerHtml(step, number, status) {
  const marker = document.createElement("button");
  marker.type = "button";
  marker.className = "g2mu-step-marker";
  marker.dataset.g2muStepId = step.id;
  g2muMarkerState(marker, step, number, status);
  return marker.outerHTML;
}
function g2muSelect(kind, key, label, options, goalId = "") {
  const card = g2MetrikaCompanyCardV374(kind);
  const data = g2MetrikaCompanyDataV374(kind);
  const record = goalId === "primary" ? data.primaryGoal || {} : data;
  return g2MetrikaCompanySelectV374(card, key, label, record[key] || "", options, goalId);
}
function g2muField(kind, key, label, type = "text", goalId = "") {
  const card = g2MetrikaCompanyCardV374(kind);
  const data = g2MetrikaCompanyDataV374(kind);
  const record = goalId === "primary" ? data.primaryGoal || {} : data;
  return g2MetrikaCompanyFieldV374(card, key, label, record[key], type, goalId);
}
function g2muFields(id) {
  const yn = G2_METRIKA_COMPANY_SETTING_STATE_V376;
  const site = megaPlatformUrl("fixed", "home", state) || state?.project?.website || "";
  const platform = g2wPlatform();
  const goal = g2MetrikaCompanyDataV374("goals").primaryGoal || {};
  const home = `<div class="g2mu-source"><span>Адрес сайта · из Gate 0</span><strong>${escapeHtml(site || "Не указан")}</strong></div>`;
  const ids = {
    s11: home, s12: g2muField("counter", "counterId", "ID счётчика", "text"),
    s13: `<div class="g2mu-source"><span>Платформа · из Gate 2</span><strong>${escapeHtml(platform || "Не указана")}</strong></div>${home}`,
    s14: `<div class="g2mu-source"><span>Результат проверки счётчика</span><strong>${escapeHtml((G2_METRIKA_COMPANY_COUNTER_CHECK_V380.find(([value]) => value === g2MetrikaCompanyDataV374("counter").counterCheck) || ["", "Не проверено"])[1])}</strong></div>`,
    s21: home,
    s22: g2muSelect("counter", "automaticGoals", "Автоматические цели", yn),
    s23: g2muSelect("counter", "webvisorEnabled", "Вебвизор", yn),
    s24: `${g2muSelect("filter", "mode", "Фактический режим в Метрике", [["", "Не указано"], ["ip", "Только фильтр по IP"], ["cookie", "«Не учитывать мои визиты» включено"], ["off", "Выключен"]])}${home}`,
    s25: home,
    s26: home,
    s311: "",
    s312: "",
    s313: "",
    s314: "",
    s315: "",
    s316: "",
    s317: "",
    s321: "",
    s322: "",
    s331: "",
    s332: "",
    s333: "",
    s334: "",
    s335: "",
    s31: g2muField("goals", "businessAction", "Подтверждённое действие", "text", "primary"),
    s32: `${g2muSelect("goals", "trackingMethod", "Способ отслеживания", [["", "Не указан"], ["virtual_page", "Виртуальная страница"], ["page_visit", "Страница благодарности"], ["reach_goal", "reachGoal"], ["other", "Другой поддерживаемый способ"]], "primary")}<div class="g2mu-source"><span>Условие цели · редактируется на шаге 3.3</span><strong>${escapeHtml(goal.condition || "Не указано")}</strong></div>`,
    s33: `${g2muField("goals", "name", "Название главной цели", "text", "primary")}${g2muSelect("goals", "type", "Тип цели", G2_METRIKA_COMPANY_GOAL_TYPES_V374, "primary")}${g2muField("goals", "condition", "Условие цели", "text", "primary")}${g2muField("goals", "goalId", "ID цели", "text", "primary")}${g2muOtherGoalsHtml()}`,
    s34: `<div class="g2mu-source"><span>Условие · из реестра целей</span><strong>${escapeHtml(goal.condition || "Не указано")}</strong></div>`,
    s36: `<div class="g2mu-source"><span>Результат проверки главной цели</span><strong>${escapeHtml((G2_METRIKA_COMPANY_THANK_YOU_STATE_V381.find(([value]) => value === goal.state) || ["", "Не проверено"])[1])}</strong></div>`,
    s4content: "",
    s4tags: "",
  };
  return ids[id] || "";
}
function g2muOtherGoalsHtml() {
  const data = g2MetrikaCompanyDataV374("goals");
  const goals = Array.isArray(data.archivedOtherGoalsV382) ? data.archivedOtherGoalsV382 : [];
  return `<details class="g2mu-other-goals" data-ui-keeper-key="g2mu:other-goals"><summary>Другие сохранённые цели · ${goals.length}</summary>${goals.map((goal, index) =>
    `<div class="g2mu-other-goal" data-g2mu-other-goal="${index}"><strong>${escapeHtml(goal.name || `Цель ${index + 1}`)}</strong>${["name", "type", "condition", "goalId"].map(key =>
      `<label><span>${escapeHtml({ name: "Название", type: "Тип", condition: "Условие", goalId: "ID" }[key])}</span>${key === "type"
        ? `<select data-g2mu-other-field="type" data-g2mu-other-index="${index}">${G2_METRIKA_COMPANY_GOAL_TYPES_V374.map(([value, title]) => `<option value="${escapeAttr(value)}"${goal.type === value ? " selected" : ""}>${escapeHtml(title)}</option>`).join("")}</select>`
        : `<input data-g2mu-other-field="${key}" data-g2mu-other-index="${index}" value="${escapeAttr(goal[key] || "")}">`}</label>`).join("")}</div>`).join("")}<button type="button" data-g2mu-add-goal>+ Записать существующую цель</button></details>`;
}
function g2muInvalidateChangedReviews() {
  const reviews = g2muReview();
  let changed = false;
  for (const [id, review] of Object.entries(reviews)) {
    if (!G2MU_STEP_IDS.has(id) || !review || !["passed", "failed", "not_needed", "pending"].includes(review.result) ||
        review.fingerprint === g2muFingerprint(id)) continue;
    (review.history ||= []).push({ result: review.result, fingerprint: review.fingerprint,
      checkedAt: review.checkedAt, evidence: review.evidence || "" });
    review.result = "stale";
    changed = true;
  }
  if (changed) guruGateReadinessCache.delete("gate-2");
  return changed;
}
function g2muPublishedSiteUrl() {
  const savedSite = String(megaPlatformUrl("fixed", "home", state) || state?.project?.website || "").trim();
  try {
    const parsed = new URL(/^https?:\/\//i.test(savedSite) ? savedSite : `https://${savedSite}`);
    if (savedSite && ["http:", "https:"].includes(parsed.protocol) && parsed.hostname) {
      parsed.hash = "";
      return parsed;
    }
  } catch (_) { /* The project needs a usable published URL before the check can start. */ }
  return null;
}
function g2muVerbatimInline(text) {
  const code = [];
  let html = escapeHtml(text).replace(/`([^`]+)`/g, (_match, value) => {
    const index = code.push(`<code>${value}</code>`) - 1;
    return `\u0000${index}\u0000`;
  });
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_match, label, url) => {
    const href = url.replaceAll("&amp;", "&").replaceAll("\\&", "&");
    const index = code.push(`<a href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer">${label}</a>`) - 1;
    return `\u0000${index}\u0000`;
  });
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/https?:\/\/[^\s<]+/g, match => {
    const url = match.replace(/[.,!?;:]+$/, "");
    return `<a href="${escapeAttr(url.replaceAll("&amp;", "&"))}" target="_blank" rel="noopener noreferrer">${url}</a>${match.slice(url.length)}`;
  });
  return html.replace(/\u0000(\d+)\u0000/g, (_match, index) => code[Number(index)])
    .replaceAll("&amp;#x20;", " ").replace(/\\([*.])/g, "$1");
}
function g2muVerbatimMarkdownHtml(markdown, copyClass, allowFourthLevel = false) {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const headingPattern = allowFourthLevel ? /^(#{1,4})\s+(.+)$/ : /^(#{1,3})\s+(.+)$/;
  let index = 0;
  const listItem = line => {
    const match = /^(\s*)(?:(\d+)\.|(-))\s+(.*)$/.exec(line);
    return match ? { indent: match[1].length, ordered: Boolean(match[2]), number: Number(match[2]), text: match[4] } : null;
  };
  const listHtml = () => {
    const first = listItem(lines[index]);
    const tag = first.ordered ? "ol" : "ul";
    const start = first.ordered && first.number !== 1 ? ` start="${first.number}"` : "";
    let html = `<${tag}${start}>`;
    while (index < lines.length) {
      let next = index;
      while (next < lines.length && !lines[next].trim()) next += 1;
      const candidate = listItem(lines[next]);
      if (next > index && candidate?.indent === first.indent && candidate.ordered === first.ordered) index = next;
      const item = listItem(lines[index]);
      if (!item || item.indent !== first.indent || item.ordered !== first.ordered) break;
      index += 1;
      html += `<li>${g2muVerbatimInline(item.text)}`;
      while (index < lines.length) {
        const nested = listItem(lines[index]);
        if (nested && nested.indent > item.indent) { html += listHtml(); continue; }
        let continuation = index;
        while (continuation < lines.length && !lines[continuation].trim()) continuation += 1;
        if (continuation > index && /^\s+\S/.test(lines[continuation] || "") &&
            !listItem(lines[continuation])) {
          index = continuation;
          const paragraph = [];
          while (index < lines.length && /^\s+\S/.test(lines[index]) && !listItem(lines[index])) {
            paragraph.push(lines[index].trim());
            index += 1;
          }
          html += `<p>${paragraph.map(g2muVerbatimInline).join("<br>")}</p>`;
          continue;
        }
        break;
      }
      html += "</li>";
    }
    return `${html}</${tag}>`;
  };
  const cells = line => line.split("|").slice(1, -1).map(value => value.trim());
  let html = "";
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) { index += 1; continue; }
    const heading = headingPattern.exec(line);
    if (heading) {
      const level = heading[1].length + 2;
      html += `<h${level}>${g2muVerbatimInline(heading[2])}</h${level}>`;
      index += 1;
      continue;
    }
    if (/^\|.*\|$/.test(line) && /^\|[\s|:-]+\|$/.test(lines[index + 1] || "")) {
      const headers = cells(line);
      index += 2;
      html += `<table><thead><tr>${headers.map(value => `<th>${g2muVerbatimInline(value)}</th>`).join("")}</tr></thead><tbody>`;
      while (index < lines.length && /^\|.*\|$/.test(lines[index])) {
        html += `<tr>${cells(lines[index]).map(value => `<td>${g2muVerbatimInline(value)}</td>`).join("")}</tr>`;
        index += 1;
      }
      html += "</tbody></table>";
      continue;
    }
    if (listItem(line)) { html += listHtml(); continue; }
    const paragraph = [];
    while (index < lines.length && lines[index].trim() &&
        !headingPattern.test(lines[index]) && !listItem(lines[index]) &&
        !(/^\|.*\|$/.test(lines[index]) && /^\|[\s|:-]+\|$/.test(lines[index + 1] || ""))) {
      paragraph.push(lines[index]);
      index += 1;
    }
    html += `<p>${paragraph.map(g2muVerbatimInline).join("<br>")}</p>`;
  }
  return `<div class="g2mu-verbatim-copy ${copyClass}">${html}</div>`;
}
function g2muOrderMarkdownHtml() {
  return g2muVerbatimMarkdownHtml(G2MU_ORDER_MARKDOWN, "g2mu-order-copy");
}
function g2muLeadMarkdownHtml() {
  return g2muVerbatimMarkdownHtml(G2MU_LEAD_MARKDOWN, "g2mu-lead-copy");
}
function g2muPaymentMarkdownHtml() {
  return g2muVerbatimMarkdownHtml(G2MU_PAYMENT_MARKDOWN, "g2mu-payment-copy");
}
function g2muCallMarkdownHtml() {
  return g2muVerbatimMarkdownHtml(G2MU_CALL_MARKDOWN, "g2mu-call-copy");
}
function g2muBookingMarkdownHtml() {
  return g2muVerbatimMarkdownHtml(G2MU_BOOKING_MARKDOWN, "g2mu-booking-copy");
}
function g2muRegistrationMarkdownHtml() {
  return g2muVerbatimMarkdownHtml(G2MU_REGISTRATION_MARKDOWN, "g2mu-registration-copy");
}
function g2muPopupLeadMarkdownHtml() {
  return g2muVerbatimMarkdownHtml(G2MU_POPUP_LEAD_MARKDOWN, "g2mu-popup-lead-copy");
}
function g2muAddToCartMarkdownHtml() {
  return g2muVerbatimMarkdownHtml(G2MU_ADD_TO_CART_MARKDOWN, "g2mu-add-to-cart-copy");
}
function g2muPhoneClickMarkdownHtml() {
  return g2muVerbatimMarkdownHtml(G2MU_PHONE_CLICK_MARKDOWN, "g2mu-phone-click-copy");
}
function g2muSiteSearchMarkdownHtml() {
  return g2muVerbatimMarkdownHtml(G2MU_SITE_SEARCH_MARKDOWN, "g2mu-site-search-copy");
}
function g2muKeySectionVisitMarkdownHtml() {
  return g2muVerbatimMarkdownHtml(G2MU_KEY_SECTION_VISIT_MARKDOWN, "g2mu-key-section-visit-copy");
}
function g2muMultipleProductViewsMarkdownHtml() {
  return g2muVerbatimMarkdownHtml(G2MU_MULTIPLE_PRODUCT_VIEWS_MARKDOWN, "g2mu-multiple-product-views-copy");
}
function g2muPageviewCountMarkdownHtml() {
  return g2muVerbatimMarkdownHtml(G2MU_PAGEVIEW_COUNT_MARKDOWN, "g2mu-pageview-count-copy");
}
function g2muVisitDurationMarkdownHtml() {
  return g2muVerbatimMarkdownHtml(G2MU_VISIT_DURATION_MARKDOWN, "g2mu-visit-duration-copy");
}
function g2muContentAnalyticsMarkdownHtml() {
  return g2muVerbatimMarkdownHtml(G2MU_CONTENT_ANALYTICS_MARKDOWN, "g2mu-content-analytics-copy");
}
function g2muTagManagerMarkdownHtml() {
  return g2muVerbatimMarkdownHtml(G2MU_TAG_MANAGER_MARKDOWN, "g2mu-tag-manager-copy");
}
function g2muCheckGuideHtml() {
  const site = g2muPublishedSiteUrl();
  const counterId = g2MetrikaCompanyCounterV374();
  const siteLink = site
    ? `<a href="${escapeAttr(site.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(site.href)}</a>`
    : "опубликованную страницу сайта";
  const debug = site ? new URL(site.href) : null;
  if (debug) debug.searchParams.set("_ym_debug", "2");
  const debugLink = debug
    ? `<a href="${escapeAttr(debug.href)}" target="_blank" rel="noopener noreferrer">сайт с включённым отладчиком Метрики</a> <code>${escapeHtml(debug.href)}</code>`
    : "страницу сайта с параметром <code>_ym_debug=2</code>";
  const domain = site ? `<code>${escapeHtml(site.hostname)}</code>` : "сайта проекта";
  const id = /^\d+$/.test(counterId)
    ? `<code>${escapeHtml(counterId)}</code>`
    : "числовой ID, сохранённый в пункте 1.2";
  return `<div class="g2mu-check-guide">
    <section class="g2mu-check-part"><p><strong>Часть А. Проверить наличие счётчика</strong></p><ol>
      <li>Откройте <a href="https://metrika.yandex.ru/" target="_blank" rel="noopener noreferrer">Яндекс Метрику</a>. Если появится форма авторизации, войдите через Яндекс ID компании.</li>
      <li>На странице «Мои счётчики» найдите счётчик для ${domain} и нажмите на его название.</li>
      <li>В левом меню выберите «Настройка» и найдите блок «Проверка счётчика».</li>
      <li>${site ? `В поле адреса укажите ${siteLink}` : "Сначала укажите опубликованный адрес сайта в Gate 0, затем вставьте его в поле адреса страницы."} Запустите проверку: сайт откроется в новой вкладке.</li>
      <li>Посмотрите уведомление о результате. <strong>Правильный результат:</strong> счётчик найден.</li>
    </ol><p>Если счётчик не найден, проверьте публикацию последних изменений сайта, расширения браузера, блокирующие Метрику, и задержку загрузки кода.</p></section>
    <section class="g2mu-check-part"><p><strong>Часть Б. Проверить отправку PageView</strong></p><ol>
      <li>${site ? `Откройте ${debugLink}.` : `Укажите опубликованный адрес сайта в Gate 0, затем откройте ${debugLink}.`} Дождитесь полной загрузки страницы.</li>
      <li>Внизу страницы нажмите значок отладчика Метрики и откройте вкладку <code>Counters</code>.</li>
      <li>${/^\d+$/.test(counterId) ? `Найдите счётчик ${id} и убедитесь, что отладчик показывает информацию именно о нём.` : `Сначала сохраните ID счётчика в пункте 1.2, затем найдите ${id} и убедитесь, что отладчик показывает информацию именно о нём.`}</li>
      <li>Откройте вкладку <code>Console</code> и найдите событие <code>PageView</code>.</li>
    </ol><p><strong>Правильный результат:</strong> ID совпадает с GURU, событие <code>PageView</code> отображается.</p>
    <p>Если панель отладки отсутствует, откройте консоль браузера: Mac — <code>Option + Command + J</code>, Windows — <code>Ctrl + Shift + J</code>. Проверьте сообщения Метрики с ID счётчика и <code>PageView</code>. Этот способ подходит и для старого кода счётчика.</p></section>
    <section class="g2mu-check-part"><p><strong>Часть В. Проверить получение данных</strong></p><ol>
      <li>Вернитесь в Яндекс Метрику, откройте «Настройка» → «Проверка счётчика» и на третьем этапе перейдите в отчёт «Популярное».</li>
      <li>Установите период, включающий время контрольного посещения.</li>
      <li>Найдите ${site ? `страницу ${siteLink}` : "проверенную страницу сайта"} и убедитесь, что для неё отображаются просмотры.</li>
    </ol><p><strong>Правильный результат:</strong> Метрика показывает просмотры проверенной страницы.</p>
    <p>Просмотры других посетителей не доказывают, что зарегистрирован именно ваш тестовый визит. Для точного автоматического сопоставления нужен отдельный идентификатор теста.</p>
    <p>Если данных нет, откройте «Настройка» → «Фильтры» и проверьте параметр «Не учитывать мои визиты». Повторите тест в приватном окне браузера, сохранив рабочие фильтры.</p></section>
  </div>`;
}
function g2muInternalVisitContext() {
  const site = g2muPublishedSiteUrl();
  const counterId = g2MetrikaCompanyCounterV374();
  const saved = g2MetrikaCompanyDataV374("filter").internalVisitTestV1 || {};
  const runId = String(saved.runId || "");
  const current = site && /^\d+$/.test(counterId) && /^[a-z0-9_]+$/i.test(runId) &&
    saved.siteUrl === site.href && saved.counterId === counterId;
  const ownerToken = current ? `owner_check_${runId}` : "";
  const guestToken = current ? `guest_check_${runId}` : "";
  const testUrl = token => {
    if (!site || !token) return "";
    const url = new URL(site.href);
    url.searchParams.set("filter_test", token);
    return url.href;
  };
  return { site, counterId, ownerToken, guestToken,
    ownerUrl: testUrl(ownerToken), guestUrl: testUrl(guestToken) };
}
function g2muInternalVisitsGuideHtml() {
  const { site, counterId, ownerToken, guestToken, ownerUrl, guestUrl } = g2muInternalVisitContext();
  const domain = site ? `<code>${escapeHtml(site.hostname)}</code>` : "сайта проекта";
  const id = /^\d+$/.test(counterId) ? `<code>${escapeHtml(counterId)}</code>` : "ID из пункта 1.2";
  const page = site ? `<code>${escapeHtml(site.href)}</code>` : "страницу сайта из Gate 0";
  const prerequisite = !site || !/^\d+$/.test(counterId)
    ? `<p>Для теста ${!site ? "укажите опубликованный адрес сайта в Gate 0" : ""}${!site && !/^\d+$/.test(counterId) ? " и " : ""}${!/^\d+$/.test(counterId) ? "сохраните числовой ID счётчика в пункте 1.2" : ""}.</p>`
    : "";
  const ownerLink = ownerUrl
    ? `<a href="${escapeAttr(ownerUrl)}" target="_blank" rel="noopener noreferrer">Открыть тест владельца ↗</a> <code>${escapeHtml(ownerUrl)}</code>`
    : "адрес владельца, созданный кнопкой выше";
  const guestLink = guestUrl
    ? `<a href="${escapeAttr(guestUrl)}" target="_blank" rel="noopener noreferrer">Открыть тест обычного посетителя ↗</a> <code>${escapeHtml(guestUrl)}</code>`
    : "адрес обычного посетителя, созданный кнопкой выше";
  return `<div class="g2mu-internal-guide">
    <section class="g2mu-check-part"><p><strong>А. Проверить и включить фильтр</strong></p><ol>
      <li>Откройте <a href="https://metrika.yandex.ru/" target="_blank" rel="noopener noreferrer">Яндекс Метрику</a> и войдите через Яндекс ID владельца счётчика.</li>
      <li>На странице «Мои счётчики» выберите счётчик для ${domain} с номером ${id}.</li>
      <li>В левом меню откройте «Настройка» → «Фильтры». В блоке «Общая фильтрация» найдите «Не учитывать мои визиты».</li>
      <li>Если переключатель уже включён, оставьте его. Если выключен, включите и нажмите «Сохранить» внизу страницы.</li>
      <li>В GURU выберите выше фактическое состояние «Не учитывать мои визиты» включено.</li>
    </ol><p>Фильтр действует в браузере, где хотя бы раз выполнен вход в Метрику под учётной записью владельца счётчика. После первой такой авторизации подождите не менее 15 минут.</p></section>
    <section class="g2mu-check-part"><p><strong>Б. Проверить остальные фильтры</strong></p>
      <p>На этой же странице посмотрите таблицу «Общая фильтрация». Если есть правило «Оставить только трафик» → «URL страницы» → «Только сайт и дополнительные домены», проверьте домены счётчика и оставьте корректное правило без изменений. Оно ограничивает учитываемые домены и не исключает ваши посещения.</p>
      <p>Не добавляйте IP-фильтры без необходимости: неверное правило может исключить посещения клиентов.</p></section>
    <section class="g2mu-check-part"><p><strong>В. Проверить исключение собственного посещения</strong></p>
      ${prerequisite}<p>Для каждого нового прогона подготовьте пару уникальных ссылок. <button type="button" data-g2mu-new-filter-test${!site || !/^\d+$/.test(counterId) ? " disabled" : ""}>${ownerUrl ? "Создать новые тестовые ссылки" : "Создать тестовые ссылки"}</button></p>
      <ol><li>Убедитесь, что «Не учитывать мои визиты» включено и после первой авторизации владельца прошло не менее 15 минут.</li>
      <li>В обычном окне браузера, где входили в Метрику, откройте ${ownerLink}.</li>
      <li>Дождитесь загрузки страницы и запомните приблизительное время посещения.</li>
      <li>Через 10–15 минут откройте в Метрике «Отчёты» → «Содержание» → «Популярное». Выберите период, включающий время теста (обычно «Сегодня»).</li>
      <li>Найдите ${page}, при необходимости раскройте вложенные URL и поищите ${ownerToken ? `<code>${escapeHtml(ownerToken)}</code>` : "метку теста владельца из ссылки"}.</li></ol>
      <p><strong>Ожидаемый результат:</strong> новый адрес владельца отсутствует в отчёте. Если он появился, проверьте браузер, время первой авторизации и момент включения фильтра.</p></section>
    <section class="g2mu-check-part"><p><strong>Г. Проверить учёт обычного посетителя</strong></p><ol>
      <li>Откройте новое приватное окно: Chrome на Mac — <code>Command + Shift + N</code>, Chrome на Windows — <code>Ctrl + Shift + N</code>. Не входите в Метрику в этом окне.</li>
      <li>Откройте ${guestLink}, дождитесь загрузки страницы и закройте приватное окно.</li>
      <li>Через 10–15 минут снова откройте «Отчёты» → «Содержание» → «Популярное» за период теста. Найдите ${page}, раскройте вложенные URL при их наличии и поищите ${guestToken ? `<code>${escapeHtml(guestToken)}</code>` : "метку теста обычного посетителя из ссылки"}.</li></ol>
      <p><strong>Ожидаемый результат:</strong> адрес обычного посетителя появился, а адрес владельца отсутствует.</p>
      <p>Если оба адреса отсутствуют, проверьте работу счётчика, блокировщики рекламы и обработку данных; при необходимости повторите просмотр отчёта позднее. Если параметры URL удаляются сайтом или операциями Метрики, эти тесты неразличимы: отсутствие строки не подтверждает работу фильтра.</p></section>
    <section class="g2mu-check-part"><p><strong>Д. После проверки</strong></p>
      <p>Оставьте «Не учитывать мои визиты» включённым. Для дальнейших тестов счётчика и целей используйте приватное окно. Не изменяйте другие работающие фильтры без причины. Повторяйте эту проверку при изменении фильтров, смене рабочего браузера или появлении подозрительных собственных посещений в статистике.</p></section>
  </div>`;
}
function g2muInternalVisitsCompareHtml() {
  const { ownerToken, guestToken } = g2muInternalVisitContext();
  return `<div class="g2mu-internal-compare"><ul>
    <li>«Не учитывать мои визиты» включено; владелец авторизован в обычном браузере не менее 15 минут назад.</li>
    <li>Новый тест владельца${ownerToken ? ` <code>${escapeHtml(ownerToken)}</code>` : ""} отсутствует в отчёте.</li>
    <li>Новый тест из приватного окна${guestToken ? ` <code>${escapeHtml(guestToken)}</code>` : ""} присутствует в отчёте.</li>
    <li>Дополнительные фильтры соответствуют доменам сайта и не исключают обычных посетителей.</li>
  </ul><p><strong>Успех:</strong> тест владельца исключён, тест обычного посетителя учтён. Отметьте сверку только после обоих результатов.</p>
  <p><strong>Проблема:</strong> тест владельца учитывается после корректной проверки или тест обычного посетителя исключён.</p>
  <p><strong>Не подтверждено:</strong> данные ещё обрабатываются, тестовые URL невозможно различить или результат неоднозначен. Повторите проверку позднее.</p>
  <p>Фильтр не меняет прошлую статистику; ранее учтённые собственные визиты не показывают состояние нынешней настройки. Исключённые данные восстановить нельзя. Настройка «Не учитывать мои визиты» не исключает автоматически всех сотрудников компании.</p></div>`;
}
function g2muRobotsGuideHtml() {
  const site = g2muPublishedSiteUrl();
  const counterId = g2MetrikaCompanyCounterV374();
  const domain = site ? `<code>${escapeHtml(site.hostname)}</code>` : "сайта проекта";
  const id = /^\d+$/.test(counterId) ? `<code>${escapeHtml(counterId)}</code>` : "ID из пункта 1.2";
  const prerequisite = !site || !/^\d+$/.test(counterId)
    ? `<p>Перед проверкой ${!site ? "укажите опубликованный адрес сайта в Gate 0" : ""}${!site && !/^\d+$/.test(counterId) ? " и " : ""}${!/^\d+$/.test(counterId) ? "сохраните ID счётчика в пункте 1.2" : ""}.</p>`
    : "";
  return `<div class="g2mu-check-guide g2mu-robots-guide">
    <p>Известные роботы, которые представляются при обходе сайта, исключаются из основной статистики автоматически. Роботов, определённых по поведению, можно учитывать или исключать при просмотре отчётов.</p>
    <section class="g2mu-check-part"><p><strong>А. Проверить настройку роботов</strong></p>${prerequisite}<ol>
      <li>Откройте <a href="https://metrika.yandex.ru/" target="_blank" rel="noopener noreferrer">Яндекс Метрику</a> и войдите через рабочий Яндекс ID.</li>
      <li>Выберите счётчик для ${domain} с номером ${id}.</li>
      <li>В левом меню откройте «Настройка» → «Фильтры» и прокрутите до блока «Роботы» под «Общей фильтрацией» и «Операциями».</li>
      <li>Проверьте переключатель «Фильтровать роботов по поведению». Выключенное положение — рекомендуемое для обычной аналитики. Если переключатель включён, выясните, почему нужна дополнительная фильтрация.</li>
      <li>Если изменили настройку, нажмите «Сохранить» внизу страницы.</li>
    </ol><p>При выключенной дополнительной фильтрации можно сравнивать отчёты с поведенческими роботами и без них. При включении их визиты удаляются из исходных данных с этого момента и впоследствии не восстанавливаются. Яндекс рекомендует включать этот режим главным образом при работе с Logs API, когда нужны исходные данные без таких роботов.</p></section>
    <section class="g2mu-check-part"><p><strong>Б. Посмотреть активность роботов</strong></p><ol>
      <li>Откройте «Отчёты» → «Мониторинг» → «Роботы» и выберите период «Последние 30 дней».</li>
      <li>Посмотрите названия известных роботов, строки поведенческой фильтрации и показатель «Отправка данных».</li>
    </ol><p>Известные роботы и поведенческие правила могут отображаться разными строками. Показатель «Отправка данных» отражает передачи счётчиком данных о действиях роботов. Отсутствие строк означает, что за выбранный период роботная активность не показана; само по себе это не ошибка. Наличие поисковых роботов тоже не является проблемой.</p></section>
    <section class="g2mu-check-part"><p><strong>В. Сравнить отчёты с роботами и без них</strong></p><ol>
      <li>Откройте «Отчёты» → «Источники» → «Источники, сводка» за период «Последние 30 дней».</li>
      <li>Выберите «Данные: без роботов», затем «Сравнить с данными с роботами».</li>
      <li>Сравните визиты, отказы, глубину просмотра и время на сайте. Совпадение показателей означает небольшое влияние роботов за этот период; заметные различия показывают влияние автоматизированной активности.</li>
    </ol><p>Если «Фильтровать роботов по поведению» включено, сравнение режимов в отчёте может быть недоступно. Не включайте дополнительную фильтрацию только из-за различий в показателях: для анализа обычно достаточно режима отчёта без роботов.</p></section>
    <section class="g2mu-check-part"><p><strong>Г. Нужен ли отдельный тест?</strong></p>
      <p>Создавать искусственный визит робота не нужно. Проверьте переключатель и отчёт «Роботы», а при наличии данных сравните режимы отображения. Повторите проверку после изменения настроек или при необъяснимом всплеске посещаемости.</p></section>
  </div>`;
}
function g2muRobotsCompareHtml() {
  const site = g2muPublishedSiteUrl();
  const counterId = g2MetrikaCompanyCounterV374();
  const target = `${site ? `для <code>${escapeHtml(site.hostname)}</code>` : "для сайта проекта"} (${/^\d+$/.test(counterId) ? `ID <code>${escapeHtml(counterId)}</code>` : "ID укажите в пункте 1.2"})`;
  return `<div class="g2mu-robots-compare"><ul>
    <li>В Метрике выбран нужный счётчик ${target}; состояние «Фильтровать роботов по поведению» проверено.</li>
    <li>Для обычной аналитики дополнительная фильтрация выключена. Если она включена, есть конкретная причина, например работа с Logs API.</li>
    <li>Отчёт «Роботы» открыт. При наличии данных и доступном сравнении проверены показатели с роботами и без них.</li>
  </ul><p><strong>Успех:</strong> текущий режим соответствует задачам анализа. После проверки отметьте шаг галочкой.</p>
  <p><strong>Проблема:</strong> поведенческие роботы исключаются из исходных данных без необходимости. Изменение настройки не вернёт уже исключённые визиты.</p>
  <p>Пустой отчёт «Роботы» и совпадение показателей при сравнении сами по себе не являются проблемой.</p></div>`;
}
function g2muAccessGuideHtml() {
  const site = g2muPublishedSiteUrl();
  const counterId = g2MetrikaCompanyCounterV374();
  const domain = site ? `<code>${escapeHtml(site.hostname)}</code>` : "сайта проекта";
  const id = /^\d+$/.test(counterId) ? `<code>${escapeHtml(counterId)}</code>` : "ID из пункта 1.2";
  const prerequisite = !site || !/^\d+$/.test(counterId)
    ? `<p>Перед проверкой ${!site ? "укажите опубликованный адрес сайта в Gate 0" : ""}${!site && !/^\d+$/.test(counterId) ? " и " : ""}${!/^\d+$/.test(counterId) ? "сохраните ID счётчика в пункте 1.2" : ""}.</p>`
    : "";
  return `<div class="g2mu-check-guide g2mu-access-guide">
    <p>Компания должна контролировать аккаунт владельца счётчика. Сотрудникам и подрядчикам выдавайте доступ через их собственные Яндекс ID по рабочей необходимости; ненужные доступы отзывайте. Публичную статистику открывайте только по решению компании.</p>
    <section class="g2mu-check-part"><p><strong>А. Узнать владельца счётчика</strong></p>${prerequisite}<ol>
      <li>Откройте <a href="https://metrika.yandex.ru/" target="_blank" rel="noopener noreferrer">Яндекс Метрику</a> и войдите через рабочий Яндекс ID.</li>
      <li>Выберите счётчик для ${domain} с номером ${id}.</li>
      <li>В левом меню откройте «Настройка» → «Доступ» и найдите сведения о владельце.</li>
      <li>Проверьте именно Яндекс-логин владельца, а не отображаемое имя, и выясните, контролирует ли этот аккаунт компания.</li>
    </ol><p>Права «Редактирование» не означают владение: пользователь с ними не может перенести счётчик на другой аккаунт.</p></section>
    <section class="g2mu-check-part"><p><strong>Б. Проверить сотрудников и подрядчиков</strong></p><ol>
      <li>На вкладке «Доступ» откройте «Индивидуальный доступ» и просмотрите логины пользователей.</li>
      <li>Для каждого пользователя проверьте, продолжает ли он работать с проектом и достаточно ли выданного уровня доступа.</li>
    </ol><p><strong>Только просмотр:</strong> просмотр статистики и настроек. <strong>Аналитика:</strong> создание целей и сегментов, сохранение отчётов без изменения настроек счётчика. <strong>Редактирование:</strong> управление счётчиком, кроме удаления и переноса.</p>
    <p>Не выдавайте «Редактирование» ради простого просмотра отчётов. Проверьте и отзовите ненужные права бывших сотрудников и подрядчиков.</p></section>
    <section class="g2mu-check-part"><p><strong>В. Дать доступ новому сотруднику, если нужно</strong></p><ol>
      <li>Если сотрудник уже есть в «Индивидуальном доступе», не добавляйте его повторно.</li>
      <li>Иначе нажмите «Добавить пользователя», введите полученный у сотрудника Яндекс-логин и выберите «Только просмотр», «Аналитика» или «Редактирование» согласно его обязанностям.</li>
      <li>Нажмите «Добавить», затем «Сохранить» и убедитесь, что логин появился с нужной ролью.</li>
    </ol><p>У сотрудника должен быть собственный Яндекс ID. Пароль аккаунта владельца передавать не нужно.</p></section>
    <section class="g2mu-check-part"><p><strong>Г. Проверить выданный доступ</strong></p><ol>
      <li>Попросите сотрудника войти в <a href="https://metrika.yandex.ru/" target="_blank" rel="noopener noreferrer">Метрику</a> под собственным Яндекс ID.</li>
      <li>На странице «Мои счётчики» он должен найти счётчик ${id} для ${domain}, открыть «Отчёты» → «Источники» → «Источники, сводка» и увидеть статистику.</li>
      <li>При необходимости проверьте доступность функций в пределах назначенной роли.</li>
    </ol><p>Если счётчик не виден, проверьте логин сотрудника, сохранение доступа, его текущий Яндекс ID и номер счётчика. Новый счётчик для решения этой проблемы создавать не нужно.</p></section>
    <section class="g2mu-check-part"><p><strong>Д. Проверить представителей и публичный доступ</strong></p><ol>
      <li>В правом верхнем углу Метрики откройте «Настройка аккаунта» → «Представители» и проверьте список. Представитель получает широкие права на все счётчики аккаунта, включая удаление; для обычной работы используйте индивидуальный доступ.</li>
      <li>Вернитесь к счётчику ${id}, откройте «Настройка» → «Доступ» и проверьте «Публичный доступ к статистике». Если публикация не согласована компанией, оставьте его выключенным. Сохраните изменение, если переключали режим.</li>
    </ol></section>
    <section class="g2mu-check-part"><p><strong>Е. Если компания не контролирует владельца</strong></p>
      <p>Не переносите счётчик в рамках обычной проверки. Сначала согласуйте, кто должен владеть им постоянно, и подготовьте корпоративный Яндекс ID. Если перенос одобрен и текущий владелец доступен, войдите под ним и откройте «Настройка» → «Счётчик» → «Перенести на другой аккаунт».</p>
      <p>Если доступ к владельцу утрачен, используйте процедуру Яндекса: подтвердите права на сайт в Вебмастере под аккаунтом будущего владельца и подайте заявку на перенос. Перенос — отдельное административное действие.</p></section>
  </div>`;
}
function g2muAccessCompareHtml() {
  const site = g2muPublishedSiteUrl();
  const counterId = g2MetrikaCompanyCounterV374();
  const target = `${site ? `для <code>${escapeHtml(site.hostname)}</code>` : "для сайта проекта"} (${/^\d+$/.test(counterId) ? `ID <code>${escapeHtml(counterId)}</code>` : "ID укажите в пункте 1.2"})`;
  return `<div class="g2mu-access-compare"><ul>
    <li>У счётчика ${target} установлен фактический владелец; компания контролирует его аккаунт либо согласовала безопасный план передачи владения.</li>
    <li>Список пользователей проверен: у сотрудников и подрядчиков только нужные права, лишние представительские доступы отсутствуют.</li>
    <li>Публичный доступ соответствует решению компании. Доступ необходимого сотрудника проверен под его Яндекс ID, если такой доступ предоставлен.</li>
  </ul><p><strong>Успех:</strong> владелец известен, компания контролирует счётчик, а права соответствуют задачам пользователей. После проверки отметьте шаг галочкой.</p>
  <p><strong>Проблема:</strong> владелец неизвестен, компания не контролирует счётчик или есть нежелательные расширенные права.</p>
  <p>Добавлять новых пользователей не требуется, если необходимые доступы уже настроены. Повторяйте проверку после смены ответственного, ухода сотрудника, подключения подрядчика, изменения прав или переноса счётчика.</p></div>`;
}
function g2muGuideHtml(step, platform) {
  if (step.id === "s311") return `<details class="g2mu-guide" data-ui-keeper-key="g2mu:guide:s311"><summary>Как сделать</summary><div class="g2mu-guide-body">${g2muOrderMarkdownHtml()}</div></details>`;
  if (step.id === "s312") return `<details class="g2mu-guide" data-ui-keeper-key="g2mu:guide:s312"><summary>Как сделать</summary><div class="g2mu-guide-body">${g2muLeadMarkdownHtml()}</div></details>`;
  if (step.id === "s313") return `<details class="g2mu-guide" data-ui-keeper-key="g2mu:guide:s313"><summary>Как сделать</summary><div class="g2mu-guide-body">${g2muPaymentMarkdownHtml()}</div></details>`;
  if (step.id === "s314") return `<details class="g2mu-guide" data-ui-keeper-key="g2mu:guide:s314"><summary>Как сделать</summary><div class="g2mu-guide-body">${g2muCallMarkdownHtml()}</div></details>`;
  if (step.id === "s315") return `<details class="g2mu-guide" data-ui-keeper-key="g2mu:guide:s315"><summary>Как сделать</summary><div class="g2mu-guide-body">${g2muBookingMarkdownHtml()}</div></details>`;
  if (step.id === "s316") return `<details class="g2mu-guide" data-ui-keeper-key="g2mu:guide:s316"><summary>Как сделать</summary><div class="g2mu-guide-body">${g2muRegistrationMarkdownHtml()}</div></details>`;
  if (step.id === "s317") return `<details class="g2mu-guide" data-ui-keeper-key="g2mu:guide:s317"><summary>Как сделать</summary><div class="g2mu-guide-body">${g2muPopupLeadMarkdownHtml()}</div></details>`;
  if (step.id === "s321") return `<details class="g2mu-guide" data-ui-keeper-key="g2mu:guide:s321"><summary>Как сделать</summary><div class="g2mu-guide-body">${g2muAddToCartMarkdownHtml()}</div></details>`;
  if (step.id === "s322") return `<details class="g2mu-guide" data-ui-keeper-key="g2mu:guide:s322"><summary>Как сделать</summary><div class="g2mu-guide-body">${g2muPhoneClickMarkdownHtml()}</div></details>`;
  if (step.id === "s331") return `<details class="g2mu-guide" data-ui-keeper-key="g2mu:guide:s331"><summary>Как сделать</summary><div class="g2mu-guide-body">${g2muSiteSearchMarkdownHtml()}</div></details>`;
  if (step.id === "s332") return `<details class="g2mu-guide" data-ui-keeper-key="g2mu:guide:s332"><summary>Как сделать</summary><div class="g2mu-guide-body">${g2muKeySectionVisitMarkdownHtml()}</div></details>`;
  if (step.id === "s333") return `<details class="g2mu-guide" data-ui-keeper-key="g2mu:guide:s333"><summary>Как сделать</summary><div class="g2mu-guide-body">${g2muMultipleProductViewsMarkdownHtml()}</div></details>`;
  if (step.id === "s334") return `<details class="g2mu-guide" data-ui-keeper-key="g2mu:guide:s334"><summary>Как сделать</summary><div class="g2mu-guide-body">${g2muPageviewCountMarkdownHtml()}</div></details>`;
  if (step.id === "s335") return `<details class="g2mu-guide" data-ui-keeper-key="g2mu:guide:s335"><summary>Как сделать</summary><div class="g2mu-guide-body">${g2muVisitDurationMarkdownHtml()}</div></details>`;
  if (step.id === "s4content") return `<details class="g2mu-guide" data-ui-keeper-key="g2mu:guide:s4content"><summary>Как сделать</summary><div class="g2mu-guide-body">${g2muContentAnalyticsMarkdownHtml()}</div></details>`;
  if (step.id === "s4tags") return `<details class="g2mu-guide" data-ui-keeper-key="g2mu:guide:s4tags"><summary>Как сделать</summary><div class="g2mu-guide-body">${g2muTagManagerMarkdownHtml()}</div></details>`;
  const installByPlatform = {
    wordpress: ["Войдите в админку WordPress и откройте «Плагины» → «Установленные». Найдите используемый модуль аналитики.",
      "В настройках этого модуля укажите ID счётчика из GURU и сохраните; если модуля нет, установите совместимый по его официальной инструкции.",
      "Откройте опубликованный сайт и перейдите к проверке кода. Не добавляйте второй код счётчика поверх работающего плагина."],
    vercel: ["Откройте исходный проект сайта, который развёрнут на Vercel, и найдите общий шаблон страниц.",
      "Разместите код счётчика из Метрики в общем шаблоне по инструкции Яндекса, выполните сборку и разверните новую версию.",
      "Проверьте код на опубликованном домене, а не только в локальном предпросмотре."],
    custom: ["Откройте шаблон страниц сайта на собственном хостинге.",
      "Установите код счётчика из Метрики на все нужные страницы по инструкции Яндекса и опубликуйте обновлённые файлы.",
      "Откройте рабочий домен и проверьте отправку визита."],
    other: ["Откройте панель своей платформы и найдите раздел аналитики или установки пользовательского кода.",
      "Сверьтесь с официальной инструкцией выбранной платформы, добавьте ID или код счётчика и опубликуйте изменения.",
      "Затем проверьте установку на рабочем домене."],
  };
  const where = step.id === "s13" && platform !== "tilda"
    ? installByPlatform[platform] || installByPlatform.other
    : step.where;
  const doc = step.doc === "tilda" || step.doc === "tildaGoal"
    ? platform === "tilda" ? G2MU_DOC[step.doc] : G2MU_DOC[step.id === "s13" ? "counter" : "goal"]
    : G2MU_DOC[step.doc];
  const whereHtml = step.id === "s14" ? g2muCheckGuideHtml()
    : step.id === "s24" ? g2muInternalVisitsGuideHtml()
    : step.id === "s25" ? g2muRobotsGuideHtml()
    : step.id === "s26" ? g2muAccessGuideHtml()
    : `<ol>${where.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ol>`;
  const compareHtml = step.id === "s24" ? g2muInternalVisitsCompareHtml()
    : step.id === "s25" ? g2muRobotsCompareHtml()
    : step.id === "s26" ? g2muAccessCompareHtml()
    : `<ol>${step.compare.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ol>`;
  const extraDocs = step.id === "s24" ? ` · <a href="${G2MU_DOC.popular}" target="_blank" rel="noopener noreferrer">Отчёт «Популярное» ↗</a> · <a href="${G2MU_DOC.processing}" target="_blank" rel="noopener noreferrer">Обработка данных ↗</a>`
    : step.id === "s25" ? ` · <a href="${G2MU_DOC.filters}" target="_blank" rel="noopener noreferrer">Фильтры и операции ↗</a> · <a href="${G2MU_DOC.robotReport}" target="_blank" rel="noopener noreferrer">Отчёт «Роботы» ↗</a>`
    : step.id === "s26" ? ` · <a href="${G2MU_DOC.transfer}" target="_blank" rel="noopener noreferrer">Перенос счётчика ↗</a>` : "";
  return `<details class="g2mu-guide" data-ui-keeper-key="g2mu:guide:${step.id}"><summary>Как сделать</summary><div class="g2mu-guide-body"><h6>Где нажать / Как проверить</h6>${whereHtml}<h6>Сверка</h6>${compareHtml}<a href="${escapeAttr(doc)}" target="_blank" rel="noopener noreferrer">Официальная справка ↗</a>${extraDocs}</div></details>`;
}
function g2muStepHtml(step, number, nested = false) {
  const status = g2muStatus(step.id);
  const review = g2muReview()[step.id] || {};
  const field = g2muFields(step.id);
  const current = g2muReview()[step.id]?.fingerprint === g2muFingerprint(step.id);
  const historicAnchor = { s12: "g2-metrika-company-counter", s24: "g2-metrika-company-internal-filter",
    s25: "g2-metrika-company-robots" }[step.id] || "";
  return `<article class="g2mu-step" data-g2mu-step="${step.id}" id="${historicAnchor || `g2mu-${step.id}`}">
    <div class="g2mu-step-heading"><span class="g2mu-number">${number}</span>${g2muMarkerHtml(step, number, status)}<div><span class="g2mu-kicker">Что сделать</span><${nested ? "h6" : "h5"}>${escapeHtml(step.title)}</${nested ? "h6" : "h5"}><p>${escapeHtml(step.what)}</p></div><span class="g2mu-step-status" data-g2mu-status="${status}">${escapeHtml(g2muLabel(status))}</span></div>
    ${field ? `<div class="g2mu-fields">${field}</div>` : ""}
    ${G2MU_EVIDENCE_STEPS.has(step.id) ? `<label class="g2mu-evidence"><span>Где проверили · ссылка или описание</span><input data-g2mu-evidence="${step.id}" value="${escapeAttr(review.evidence || "")}" placeholder="Ссылка на отчёт или результат проверки"></label>` : ""}
    <div class="g2mu-actions"><button type="button" data-g2mu-review="passed" data-g2mu-step-id="${step.id}">${G2MU_VERBATIM_STEP_IDS.has(step.id) ? "Готово" : "Подтвердить сверку"}</button>${G2MU_VERBATIM_STEP_IDS.has(step.id) ? `<button type="button" data-g2mu-review="pending" data-g2mu-step-id="${step.id}">Требует проверки</button>` : ""}<button type="button" data-g2mu-review="failed" data-g2mu-step-id="${step.id}">Проблема</button>${step.optional ? `<button type="button" data-g2mu-review="not_needed" data-g2mu-step-id="${step.id}">Не требуется</button>` : ""}${review.result && current ? `<span>Проверено ${escapeHtml(new Date(review.checkedAt || Date.now()).toLocaleDateString("ru-RU"))}</span>` : ""}</div>
    ${g2muGuideHtml(step, g2wPlatform())}
  </article>`;
}
function g2muSectionBodyHtml(section, index) {
  if (!section.subsections) return section.steps.map((step, stepIndex) =>
    g2muStepHtml(step, step.number || `${index + 1}.${stepIndex + 1}`)).join("");
  return section.subsections.map(subsection => {
    const ids = new Set(subsection.stepIds);
    const rows = section.steps.filter(step => ids.has(step.id));
    return `<section class="g2mu-subsection" data-g2mu-subsection="${escapeAttr(subsection.number)}"><h5>${escapeHtml(subsection.number)}. ${escapeHtml(subsection.title)}</h5>${rows.map(step => g2muStepHtml(step, step.number, true)).join("")}</section>`;
  }).join("");
}
function g2muSectionHtml(section, index) {
  const statuses = section.steps.map(step => g2muStatus(step.id));
  const status = g2muAggregate(statuses);
  const ready = statuses.filter(value => value === "ready").length;
  const skipped = statuses.filter(value => value === "not_needed").length;
  const total = section.steps.length - skipped;
  return `<details class="g2mu-section" data-g2mu-section="${index + 1}" ${index === 2 ? 'id="g2-metrika-company-goals"' : ""} data-ui-keeper-key="g2mu:section:${index + 1}" ${index === 0 ? "open" : ""}><summary><div><h4>${index + 1}. ${escapeHtml(section.title)}</h4>${section.purpose ? `<p>${escapeHtml(section.purpose)}</p>` : ""}</div><span class="g2mu-section-meta">${ready} из ${total} ${g2muStepWord(total)}<span class="status-pill status-${status}" data-status="${status}">${escapeHtml(g2muLabel(status))}</span></span></summary><div class="g2mu-section-body">${g2muSectionBodyHtml(section, index)}</div></details>`;
}
function g2muBlockHtml() {
  const statuses = G2MU_SECTIONS.map(section => g2muAggregate(section.steps.map(step => g2muStatus(step.id))));
  const status = g2muAggregate(statuses);
  const ready = statuses.filter(value => value === "ready").length;
  const skipped = statuses.filter(value => value === "not_needed").length;
  return `<details class="g2mu-block" data-g2mu-block data-g2y-unit="metrika" data-ui-keeper-key="g2mu:company" open><summary><div><h3>Яндекс Метрика · Компания</h3><p>Единый счётчик и цели компании · ${ready} из ${G2MU_SECTIONS.length - skipped} разделов готово${skipped ? ` · ${skipped} не требуется` : ""}</p></div><span class="status-pill status-${status}" data-status="${status}">${escapeHtml(g2muLabel(status))}</span></summary><div class="g2mu-block-body">${G2MU_SECTIONS.map(g2muSectionHtml).join("")}</div></details>`;
}
function g2muRefreshDom() {
  const block = document.querySelector("[data-g2mu-block]");
  if (!block) return;
  const sectionStatuses = [];
  G2MU_SECTIONS.forEach((section, index) => {
    const node = block.querySelector(`[data-g2mu-section="${index + 1}"]`);
    const statuses = section.steps.map((step, stepIndex) => {
      const status = g2muStatus(step.id);
      const row = node?.querySelector(`[data-g2mu-step="${step.id}"]`);
      const badge = row?.querySelector("[data-g2mu-status]");
      if (badge) { badge.dataset.g2muStatus = status; badge.textContent = g2muLabel(status); }
      const marker = row?.querySelector(".g2mu-step-marker");
      if (marker) g2muMarkerState(marker, step, step.number || `${index + 1}.${stepIndex + 1}`, status);
      return status;
    });
    const status = g2muAggregate(statuses);
    sectionStatuses.push(status);
    const meta = node?.querySelector(":scope > summary .g2mu-section-meta");
    if (meta?.firstChild) {
      const total = statuses.length - statuses.filter(value => value === "not_needed").length;
      meta.firstChild.textContent = `${statuses.filter(value => value === "ready").length} из ${total} ${g2muStepWord(total)}`;
    }
    const pill = meta?.querySelector(".status-pill");
    if (pill) { pill.className = `status-pill status-${status}`; pill.dataset.status = status;
      pill.textContent = g2muLabel(status); }
  });
  const status = g2muAggregate(sectionStatuses);
  const pill = block.querySelector(":scope > summary .status-pill");
  if (pill) { pill.className = `status-pill status-${status}`; pill.dataset.status = status;
    pill.textContent = g2muLabel(status); }
  const summary = block.querySelector(":scope > summary p");
  const skipped = sectionStatuses.filter(value => value === "not_needed").length;
  if (summary) summary.textContent = `Единый счётчик и цели компании · ${sectionStatuses.filter(value => value === "ready").length} из ${G2MU_SECTIONS.length - skipped} разделов готово${skipped ? ` · ${skipped} не требуется` : ""}`;
}

function g2muMount(scope) {
  const counter = scope.querySelector('[data-g2w-card-view="counter"]');
  const goal = scope.querySelector('[data-g2w-card-view="goal"]');
  const quality = scope.querySelector('[data-g2-metrika-quality-section-v360="company"]');
  if (!counter || !goal || !quality) return null;
  const extraNodes = ["g2-metrika-company-counter", "g2-metrika-company-goals",
    "g2-metrika-company-internal-filter", "g2-metrika-company-robots", "g2-metrika-company-webvisor"]
    .map(id => document.getElementById(id)).filter(Boolean);
  const unified = document.createElement("div");
  unified.innerHTML = g2muBlockHtml();
  const block = unified.firstElementChild;
  counter.insertAdjacentElement("beforebegin", block);
  // Remove superseded cards from this view; their saved records remain in the workspace.
  counter.remove(); goal.remove(); quality.remove();
  extraNodes.forEach(node => node.remove());
  return block;
}

document.addEventListener("input", event => {
  const target = event.target;
  if (target?.matches?.("[data-g2-mc-field]")) {
    if (g2muInvalidateChangedReviews()) g2muRefreshDom();
    if (target.dataset.g2McField === "counterId") {
      const guide = document.querySelector('[data-g2mu-step="s14"] .g2mu-check-guide');
      if (guide) guide.outerHTML = g2muCheckGuideHtml();
      const internal = document.querySelector('[data-g2mu-step="s24"] .g2mu-internal-guide');
      if (internal) internal.outerHTML = g2muInternalVisitsGuideHtml();
      const compare = document.querySelector('[data-g2mu-step="s24"] .g2mu-internal-compare');
      if (compare) compare.outerHTML = g2muInternalVisitsCompareHtml();
      const robotsGuide = document.querySelector('[data-g2mu-step="s25"] .g2mu-robots-guide');
      if (robotsGuide) robotsGuide.outerHTML = g2muRobotsGuideHtml();
      const robotsCompare = document.querySelector('[data-g2mu-step="s25"] .g2mu-robots-compare');
      if (robotsCompare) robotsCompare.outerHTML = g2muRobotsCompareHtml();
      const accessGuide = document.querySelector('[data-g2mu-step="s26"] .g2mu-access-guide');
      if (accessGuide) accessGuide.outerHTML = g2muAccessGuideHtml();
      const accessCompare = document.querySelector('[data-g2mu-step="s26"] .g2mu-access-compare');
      if (accessCompare) accessCompare.outerHTML = g2muAccessCompareHtml();
    }
  }
  if (target?.matches?.("[data-g2mu-evidence]")) {
    const before = g2muStatus(target.dataset.g2muEvidence);
    const review = g2muReview(true);
    (review[target.dataset.g2muEvidence] ||= {}).evidence = target.value;
    if (before !== g2muStatus(target.dataset.g2muEvidence)) g2muRefreshDom();
    flashSaving({ skipProductSelectorRefresh: true });
  }
  if (target?.matches?.("[data-g2mu-other-field]")) {
    const data = g2MetrikaCompanyDataV374("goals");
    const row = data.archivedOtherGoalsV382?.[Number(target.dataset.g2muOtherIndex)];
    if (!row) return;
    row[target.dataset.g2muOtherField] = target.value;
    g2muInvalidateChangedReviews();
    guruGateReadinessCache.delete("gate-2");
    flashSaving({ skipProductSelectorRefresh: true });
  }
});
document.addEventListener("change", event => {
  if (event.target?.matches?.("[data-g2-mc-field]")) {
    if (g2muInvalidateChangedReviews()) g2muRefreshDom();
  }
  if (event.target?.matches?.("[data-g2mu-other-field]")) renderGate();
});
document.addEventListener("click", event => {
  if (event.target?.closest?.("[data-g2mu-new-filter-test]")) {
    if (!g2muPublishedSiteUrl() || !/^\d+$/.test(g2MetrikaCompanyCounterV374())) return;
    const filter = g2MetrikaCompanyDataV374("filter");
    filter.internalVisitTestV1 = {
      runId: `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      siteUrl: g2muPublishedSiteUrl().href,
      counterId: g2MetrikaCompanyCounterV374(),
    };
    g2muInvalidateChangedReviews();
    guruGateReadinessCache.delete("gate-2");
    g2wSave({ afterPaint: true });
    renderGate();
    return;
  }
  if (event.target?.closest?.("[data-g2mu-add-goal]")) {
    const data = g2MetrikaCompanyDataV374("goals");
    const goals = g2MetrikaCompanyGoalsV374();
    data.archivedOtherGoalsV382 = Array.isArray(data.archivedOtherGoalsV382) ? data.archivedOtherGoalsV382 : [];
    let sequence = Math.max(Number(data.nextGoalSequence) || 1, 1);
    while (goals.some(goal => goal.entryId === `company-goal-${sequence}`)) sequence += 1;
    data.archivedOtherGoalsV382.push({ entryId: `company-goal-${sequence}`, name: "", type: "", condition: "", goalId: "" });
    data.nextGoalSequence = sequence + 1;
    guruGateReadinessCache.delete("gate-2");
    g2wSave({ afterPaint: true }); renderGate();
    document.querySelector('[data-g2mu-other-goal]:last-of-type input')?.focus();
    return;
  }
  const button = event.target?.closest?.("[data-g2mu-review]");
  if (!button) return;
  const id = button.dataset.g2muStepId;
  const result = button.dataset.g2muReview;
  if (!G2MU_STEP_IDS.has(id)) return;
  if (!["passed", "failed", "not_needed", "pending", "reset"].includes(result)) return;
  if (result === "pending" && !G2MU_VERBATIM_STEP_IDS.has(id)) return;
  if (result === "reset" && g2muStatus(id) !== "ready") return;
  if (g2muStatus(id) === "not_needed" && result === "passed") return;
  if (result === "not_needed" && !G2MU_OPTIONAL_STEPS.has(id)) return;
  if (result === "not_needed") g2muInvalidateChangedReviews();
  const review = g2muReview(true);
  const previous = review[id] || {};
  if (result === "passed" && G2MU_EVIDENCE_STEPS.has(id) && !String(previous.evidence || "").trim()) {
    button.closest(".g2mu-step")?.querySelector("[data-g2mu-evidence]")?.focus(); return;
  }
  if (result === "passed" && !g2muRequiredValues(id)) {
    button.closest(".g2mu-step")?.querySelector(".g2mu-fields input, .g2mu-fields select")?.focus(); return;
  }
  if (result !== "reset" && id === "s14") g2MetrikaCompanyDataV374("counter").counterCheck = result === "passed" ? "found" : "not_found";
  if (result !== "reset" && id === "s36") (g2MetrikaCompanyDataV374("goals").primaryGoal ||= {}).state = result === "passed" ? "works" : "not_works";
  if (result !== "reset" && ["s14", "s36"].includes(id)) {
    const resultText = button.closest(".g2mu-step")?.querySelector(".g2mu-source strong");
    if (resultText) resultText.textContent = id === "s14"
      ? result === "passed" ? "Найден" : "Не найден"
      : result === "passed" ? "Работает" : "Не работает";
  }
  if (previous.result) (previous.history ||= []).push({ result: previous.result, fingerprint: previous.fingerprint,
    checkedAt: previous.checkedAt, evidence: previous.evidence || "" });
  review[id] = { ...previous, result: result === "reset" ? "" : result,
    fingerprint: g2muFingerprint(id), checkedAt: new Date().toISOString() };
  guruGateReadinessCache.delete("gate-2");
  g2wSave({ afterPaint: true });
  for (const kind of ["counter", "goals", "filter", "robots"]) {
    const card = g2MetrikaCompanyCardV374(kind);
    if (card) recalculateStatusForCard(card, state);
  }
  g2muRefreshDom();
  g2wRefresh({ changedCardId: id[1] === "3" || id[1] === "4" ? "goal" : "counter" });
});

// Feed the existing Gate 2 readiness calculation from the current unified view.
// Historical card IDs remain available to product and advertising dependencies.
const g2muPreviousCompanyStatus = g2MetrikaCompanyStatusV374;
g2MetrikaCompanyStatusV374 = function (card) {
  const kind = G2_METRIKA_COMPANY_BY_ID_V374.get(card?.id)?.kind;
  if (!kind) return g2muPreviousCompanyStatus(card);
  const ids = { counter: ["s11", "s12", "s13", "s14", "s21", "s22", "s23", "s26"],
    goals: ["s311", "s312", "s313", "s314", "s315", "s316", "s317", "s321", "s322", "s331", "s332", "s333", "s334", "s335", "s4content", "s4tags"],
    filter: ["s24"], robots: ["s25"] }[kind];
  const result = g2muAggregate(ids.map(g2muStatus));
  if (kind === "goals" && result === "ready" && g2muAggregate(G2MU_SECTIONS[0].steps.map(step => g2muStatus(step.id))) !== "ready")
    return "in_progress";
  return result === "recheck" ? "in_progress" : result;
};

const g2muPreviousWizardStatus = g2wStatus;
g2wStatus = function (def, productId = "", workspace = state) {
  if (def?.scope === "company" && ["counter", "goal"].includes(def.id) && workspace === state)
    return g2MetrikaCompanyStatusV374(g2MetrikaCompanyCardV374(def.id === "goal" ? "goals" : "counter", workspace));
  return g2muPreviousWizardStatus.apply(this, arguments);
};

const g2muPreviousOpenHash = g2wOpenHash;
g2wOpenHash = function () {
  g2muPreviousOpenHash.apply(this, arguments);
  const id = decodeURIComponent(location.hash.slice(1));
  const target = document.getElementById(id);
  if (!target?.closest?.("[data-g2mu-block]")) return;
  for (const ancestor of target.closest("[data-g2mu-block]")?.querySelectorAll("details") || []) {
    if (ancestor.contains(target)) {
      ancestor.open = true;
      if (ancestor.dataset.uiKeeperKey) guruDisclosureOpenStateV512()[guruDisclosureKeyV512(ancestor)] = true;
    }
  }
  const group = target.closest("[data-g2y-company]");
  if (group) { group.open = true; guruDisclosureOpenStateV512()[guruDisclosureKeyV512(group)] = true; }
  requestAnimationFrame(() => target.scrollIntoView({ block: "start" }));
};
