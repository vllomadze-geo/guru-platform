/* One product-scoped Yandex workflow. Existing product and company records remain the sources. */
const G2YP_DOCS = Object.freeze({
  counter: "https://yandex.ru/support/metrica/ru/general/check-counter",
  goal: "https://yandex.ru/support/metrica/ru/general/check-goal",
  webmaster: "https://yandex.ru/support/webmaster/ru/service/check-url",
  direct: "https://www.yandex.ru/support/direct/ru/campaigns/campaign-settings",
  tags: "https://yandex.ru/support/direct/ru/statistics/url-tags",
});
const G2YP_DEFS = Object.freeze([
  { id: "product-yandex-metrika", cardId: "g2-metrika-product-counter", title: "Яндекс Метрика · Продукт/Услуга",
    purpose: "Работа общего счётчика, выбранная цель и конверсия продукта.", serviceUrl: "https://metrika.yandex.ru/",
    steps: [
      { step_id: "counter", title: "Проверить счётчик на странице продукта", what: "Убедитесь, что общий счётчик компании обнаружен на странице выбранного продукта и передаёт просмотр.",
        where: ["Откройте Яндекс Метрику и выберите счётчик компании.", "Откройте «Настройка» → «Проверка счётчика», введите URL продукта и запустите проверку.", "Откройте страницу с параметром _ym_debug=2; в панели отладки сверьте номер на вкладке Counters и событие PageView на вкладке Console."],
        compare: ["Номер обнаруженного счётчика совпадает с ID компании.", "Проверен URL именно выбранного продукта, событие просмотра передаётся."], doc: G2YP_DOCS.counter },
      { step_id: "goal", title: "Проверить соответствие конверсионной цели продукту", what: "Выберите существующую цель компании, условие которой соответствует действию клиента с этим продуктом.",
        where: ["Откройте Яндекс Метрику, выберите счётчик компании и перейдите в «Цели».", "Откройте существующую цель и проверьте её название, тип и условие достижения.", "Сопоставьте условие с фактическим действием клиента; для общей страницы благодарности не считайте цель подтверждением покупки конкретного товара."],
        compare: ["ID выбранной цели есть в реестре компании.", "Тип и условие соответствуют действию; товарная атрибуция подтверждается только при наличии данных электронной коммерции."], doc: G2YP_DOCS.goal },
      { step_id: "conversion", title: "Подтвердить конверсию выбранного продукта", what: "Сверьте уже выполненное целевое действие с достижением цели в Метрике; повторная заявка для этой проверки не нужна.",
        where: ["Если тест ещё не выполнялся, откройте страницу продукта с _ym_debug=2 и выполните целевое действие один раз.", "В панели отладки Метрики проверьте достижение цели на вкладках Events или Console.", "В Метрике откройте «Конверсии» и проверьте достижение выбранной цели после обработки данных.", "При передаче электронной коммерции проверьте нужный товар в тестовом заказе."],
        compare: ["Фактическое действие успешно завершилось и цель достигнута.", "Идентификатор товара совпадает с выбранным продуктом, если товарные данные передаются; общая цель сама по себе не доказывает товарную конверсию."], doc: G2YP_DOCS.goal },
    ] },
  { id: "product-yandex-webmaster", cardId: "g2-service-product-yandex-webmaster", title: "Яндекс Вебмастер · Продукт/Услуга",
    purpose: "Фактическое состояние страницы в поиске Яндекса.", serviceUrl: "https://webmaster.yandex.ru/",
    steps: [{ step_id: "indexing", title: "Проверить состояние страницы в поиске Яндекса", what: "Проверьте доступность страницы для индексирования и её присутствие в поиске.",
      where: ["Откройте Яндекс Вебмастер и выберите сайт компании.", "Перейдите в «Индексирование» → «Проверка страницы», вставьте URL продукта и запустите проверку.", "После проверки откройте подробный результат, проверьте состояние в поиске и причину исключения, если она указана.", "При необходимости добавьте URL в «Мониторинг важных страниц»."],
      compare: ["Проверен URL выбранного продукта.", "Отдельно известны доступность для индексирования и присутствие в поиске; причина исключения сохранена, если сервис её указал."], doc: G2YP_DOCS.webmaster }] },
  { id: "product-yandex-direct", cardId: "g2-service-product-yandex-direct", title: "Яндекс Директ · Продукт/Услуга",
    purpose: "Рекламный URL и аналитика для выбранного продукта.", serviceUrl: "https://direct.yandex.ru/",
    steps: [{ step_id: "readiness", title: "Проверить готовность продукта к рекламному продвижению", what: "Убедитесь, что URL ведёт к нужному продукту, работает с тестовыми метками, а счётчик и цель подходят для рекламы.",
      where: ["Откройте опубликованный URL продукта и проверьте, что показан нужный товар.", "Добавьте тестовые UTM-параметры и повторно откройте страницу; проверьте отсутствие ошибки или неверного перенаправления.", "Если кампания уже есть, откройте её настройки в Яндекс Директе и проверьте ссылку на продвигаемую страницу, счётчик Метрики и целевые действия.", "Если кампании ещё нет, проверьте только URL и аналитику; создавать кампанию для этого шага не требуется."],
      compare: ["Ссылка открывает выбранный продукт и не ломается с параметрами.", "Счётчик совпадает с компанией, цель подходит продукту; существующая кампания использует те же значения.", "Тестовые параметры не доказывают реальный рекламный клик или атрибуцию."], doc: G2YP_DOCS.direct }] },
]);
const G2YP_OLD_CARDS = new Set(["g2-metrika-goals-primary", "g2-metrika-product-goals",
  "g2-metrika-product-counter", ...G2_METRIKA_PRODUCT_RETIRED_V383]);

function g2ypRecord(productId, create = false, workspace = state) {
  const config = G2_SERVICE_BLOCK_CONFIGS.get("product-yandex-metrika");
  if (create) g2ServiceBlockEnsureCard(config, workspace);
  const record = g2ServiceBlockRecord(config, productId, create, workspace);
  if (record && create) { record.yandexProductV1 ||= { reviews: {}, history: [] }; }
  return record?.yandexProductV1 || null;
}
function g2ypSource(productId, workspace = state, kind = "") {
  const goalDef = g2wDef("productGoal"), goalRow = g2MetrikaProductRowV367(g2wCard(goalDef, workspace), productId) || {};
  const companyCounter = g2MetrikaCompanyDataV374("counter", workspace);
  const counterId = g2MetrikaCompanyCounterV374(workspace);
  const goal = g2MetrikaCompanyGoalV374(goalRow.goalRefId, workspace);
  const legacyCounter = g2MetrikaProductRowV367(g2wCard(g2wDef("productCounter"), workspace), productId) || {};
  const lead = g2wRecord(g2wDef("lead"), productId, false, workspace);
  const leadCurrent = lead?.verification?.fingerprint === g2wInputs(g2wDef("lead"), productId, workspace);
  const indexing = g2SeoStore("product-landing", productId, workspace)?.webmasterV298 || {};
  return { productId, route: g2wRoute(productId, workspace), url: g2s4ProductUrl(productId, workspace),
    counterId, counterCheck: companyCounter.counterCheck || "",
    ecommerceEnabled: companyCounter.ecommerceEnabled || "",
    directAccountStatus: kind === "product-yandex-direct" ? g2directStepStatus("account", workspace) : "",
    goal, goalRefId: goalRow.goalRefId || "", mainAction: goalRow.mainAction || "", goalRow, legacyCounter,
    leadPassed: leadCurrent && lead?.verification?.result === "passed",
    leadEvidence: leadCurrent ? lead?.verification?.source_url || "" : "",
    indexing, companyIndex: g2SeoSnapshot("", workspace).pages,
    directApplicable: g2c2Applicability("direct", workspace) === "required",
    webmasterApplicable: g2c2Applicability("webmaster", workspace) === "required" };
}
function g2ypFingerprint(kind, stepId, source) {
  const base = [source.productId, source.route, source.url];
  if (kind === "product-yandex-metrika") {
    base.push(source.counterId, source.counterCheck);
    if (stepId !== "counter") base.push(source.goalRefId, source.goal?.goalId || "", source.goal?.name || "",
      source.goal?.type || "", source.goal?.condition || "", source.mainAction);
    if (stepId === "conversion") base.push(source.leadPassed, source.leadEvidence, source.ecommerceEnabled);
  } else if (kind === "product-yandex-webmaster") base.push(source.indexing.landingIndexed || "", source.indexing.checkedNote || "", source.companyIndex);
  else base.push(source.counterId, source.goalRefId, source.goal?.goalId || "", source.directApplicable, source.directAccountStatus);
  return JSON.stringify(base);
}
function g2ypApplicable(kind, source) {
  if (source.route !== "website") return false;
  if (kind === "product-yandex-webmaster") return source.webmasterApplicable;
  if (kind === "product-yandex-direct") return source.directApplicable;
  return true;
}
function g2ypPrerequisites(kind, stepId, source) {
  if (kind === "product-yandex-metrika") {
    if (stepId === "counter") return Boolean(source.url && /^\d+$/.test(source.counterId) && source.counterCheck === "found");
    if (stepId === "goal") return Boolean(source.goal?.goalId && source.goal?.name && source.mainAction);
    return Boolean(source.goal?.goalId && source.url && (source.leadPassed || source.goalRow.testConversionAt));
  }
  if (kind === "product-yandex-webmaster") return source.indexing.landingIndexed === "yes" && Boolean(source.url);
  return Boolean(source.url && /^\d+$/.test(source.counterId) && source.goal?.goalId);
}
function g2ypStepStatus(kind, stepId, productId, workspace = state, source = g2ypSource(productId, workspace, kind)) {
  if (!g2ypApplicable(kind, source)) return "not_needed";
  const review = g2ypRecord(productId, false, workspace)?.reviews?.[`${kind}:${stepId}`];
  const fingerprint = g2ypFingerprint(kind, stepId, source);
  if (kind === "product-yandex-webmaster" && source.indexing.landingIndexed === "no") return "problem";
  if (review?.result && review.fingerprint !== fingerprint) return "recheck";
  if (review?.result === "failed") return "problem";
  const prerequisites = g2ypPrerequisites(kind, stepId, source);
  if (review?.result === "passed" && prerequisites) return "ready";
  if (review || prerequisites || (kind === "product-yandex-webmaster" && source.indexing.landingIndexed)) return "in_progress";
  return "not_started";
}
function g2ypStatus(kind, productId, workspace = state, source = g2ypSource(productId, workspace, kind)) {
  const config = G2_SERVICE_BLOCK_CONFIGS.get(kind);
  const statuses = config.steps.map(step => g2ypStepStatus(kind, step.step_id, productId, workspace, source));
  if (statuses.every(status => status === "not_needed")) return "not_needed";
  if (statuses.includes("problem")) return "problem";
  if (statuses.includes("recheck")) return "needs_attention";
  if (statuses.every(status => ["ready", "not_needed"].includes(status))) return "ready";
  return statuses.some(status => status !== "not_started") ? "in_progress" : "not_started";
}
function g2ypLabel(status) {
  return { ready: "Готово", in_progress: "В работе", not_started: "Не начато", problem: "Проблема",
    recheck: "Повторная сверка", needs_attention: "Требует внимания", not_needed: "Не требуется" }[status] || "Не начато";
}
for (const definition of G2YP_DEFS) g2ServiceBlockRegister({
  ...definition, scope: "product", customMount: true,
  steps: definition.steps.map(step => ({ ...step, where: step.where.join(" "), how: step.compare.join(" "), source_url: step.doc,
    doneResolver: ({ product_id, workspace }) => g2ypStepStatus(definition.id, step.step_id, product_id, workspace) === "ready" })),
  statusResolver: ({ product_id, workspace }) => g2ypStatus(definition.id, product_id, workspace),
  gate0Applicability: ({ product_id, workspace }) => g2ypApplicable(definition.id, g2ypSource(product_id, workspace)) ? "required" : "not_needed",
});

function g2ypSourceHtml(kind, stepId, source) {
  const item = (label, value, href = "") => `<div class="g2yp-source"><span>${escapeHtml(label)}</span>${href
    ? `<a href="${escapeAttr(href)}">${escapeHtml(value || "Не указано")} ↗</a>`
    : `<strong>${escapeHtml(value || "Не указано")}</strong>`}</div>`;
  const url = source.url ? item(`URL продукта · Платформа ${guruGateLabel("gate-0")}`, source.url, source.url)
    : `<div class="g2yp-source"><span>URL продукта · Платформа ${guruGateLabel("gate-0")}</span><button type="button" data-g2yp-open-platform>Не указан · открыть Платформу →</button></div>`;
  if (kind === "product-yandex-webmaster") return `${url}${item("Проверки сайта · компания", g2ypLabel(source.companyIndex), "#g2sb-company-webmaster-company")}${g2ypIndexEditorHtml(source.productId)}`;
  if (kind === "product-yandex-direct") return `${url}${item("Кабинет Директа · компания", g2ypLabel(source.directAccountStatus), "#g2sb-company-yandex-direct-company")}${item("ID счётчика · компания", source.counterId, "#g2-metrika-company-counter")}${item("Цель · компания", source.goal ? `${source.goal.name || "Цель"} · ${source.goal.goalId}` : "Не выбрана", "#g2-metrika-company-goals")}`;
  if (stepId === "counter") return `${url}${item("ID счётчика · компания", source.counterId, "#g2-metrika-company-counter")}${source.legacyCounter.visitAt ? item("Ранее сохранённый визит", source.legacyCounter.visitAt) : ""}`;
  if (stepId === "goal") {
    const goals = g2MetrikaCompanyGoalsV374().filter(goal => goal?.entryId && goal?.goalId);
    return `<label class="g2yp-field"><span>Основное действие продукта · сохранённое поле</span><input data-g2yp-main-action="${escapeAttr(source.productId)}" value="${escapeAttr(source.mainAction)}" placeholder="Например, оформление заказа"></label>
      <label class="g2yp-field"><span>Существующая цель компании</span><select data-g2yp-goal="${escapeAttr(source.productId)}"><option value="">Выберите цель</option>${goals.map(goal => `<option value="${escapeAttr(goal.entryId)}"${source.goalRefId === goal.entryId ? " selected" : ""}>${escapeHtml(`${goal.name || "Цель"} · ${goal.goalId}`)}</option>`).join("")}</select></label>
      ${source.goalRefId && !source.goal ? `<p>Ранее выбранная цель сейчас отсутствует в реестре компании. Ссылка на неё сохранена.</p>` : ""}`;
  }
  return `${item("Выбранная цель", source.goal ? `${source.goal.name || "Цель"} · ${source.goal.goalId}` : "Не выбрана")}
    ${item("Тест заявки · сквозная проверка", source.leadPassed ? "Успешно подтверждён" : "Нет текущего подтверждения", "#g2sb-product-lead")}
    ${item("Электронная коммерция · компания", source.ecommerceEnabled === "yes" ? "Включена" : source.ecommerceEnabled === "no" ? "Выключена" : "Не определена", "#g2-metrika-company-counter")}
    ${source.goalRow.testConversionAt ? item("Ранее сохранённая тестовая конверсия", source.goalRow.testConversionAt) : ""}`;
}
function g2ypIndexEditorHtml(productId) {
  const editor = g2SeoEditorHtml("indexing", productId);
  return `<div class="g2yp-index-owner" data-g2sb-id="product-landing" data-g2sb-product-id="${escapeAttr(productId)}">${editor}</div>`;
}
function g2ypLegacyHtml(productId) {
  const gate = g2wGate();
  const ids = ["g2-metrika-product-counter", "g2-metrika-goals-primary", "g2-metrika-product-goals"];
  const labels = { visitAt: "Контрольный визит", mainAction: "Основное действие", goalRefId: "Выбранная цель", testConversionAt: "Тестовая конверсия",
    goalFired: "Цель сработала", result: "Итог", evidenceUrl: "Доказательство", testedAt: "Дата проверки", comment: "Комментарий",
    goals: "Дополнительные цели", notNeededReason: "Причина неприменимости" };
  const rows = ids.flatMap(id => {
    const card = gate?.cards?.find(item => item.id === id);
    const row = g2MetrikaProductRowV367(card, productId);
    const values = row ? Object.entries(row).filter(([key, value]) => key !== "product_id" && value !== "" && value != null && (!Array.isArray(value) || value.length))
      .map(([key, value]) => ({ group: card.title || id, key, value: typeof value === "object" ? JSON.stringify(value) : String(value) })) : [];
    const old = card?.fields?.g2SetupWizardV1?.byProduct?.[productId];
    if (old && (Object.keys(old.steps || {}).length || old.verification || old.history?.length))
      values.push({ group: card.title || id, key: "Прежние результаты и история", value: JSON.stringify({ steps: old.steps, verification: old.verification, history: old.history }) });
    return values;
  });
  if (!rows.length) return "";
  return `<details class="g2yp-history"><summary>Ранее сохранённые данные Метрики · ${rows.length}</summary><dl>${rows.map(row =>
    `<div><dt>${escapeHtml(row.group)} · ${escapeHtml(labels[row.key] || row.key)}</dt><dd>${escapeHtml(row.value)}</dd></div>`).join("")}</dl></details>`;
}
function g2ypStepHtml(kind, step, number, productId, source) {
  const status = g2ypStepStatus(kind, step.step_id, productId, state, source);
  const canConfirm = g2ypPrerequisites(kind, step.step_id, source);
  const review = g2ypRecord(productId)?.reviews?.[`${kind}:${step.step_id}`] || {};
  const current = review.fingerprint === g2ypFingerprint(kind, step.step_id, source);
  return `<article class="g2yp-step" data-g2yp-step="${step.step_id}" id="g2yp-${kind}-${step.step_id}">
    <div class="g2yp-step-head"><span class="g2yp-number">${number}</span><div><small>Что сделать</small><h5>${escapeHtml(step.title)}</h5><p>${escapeHtml(step.what)}</p></div><span class="status-pill status-${status}" data-status="${status}">${escapeHtml(g2ypLabel(status))}</span></div>
    <div class="g2yp-step-content">${g2ypSourceHtml(kind, step.step_id, source)}
      ${status !== "not_needed" ? `<label class="g2yp-field"><span>Где проверили · ссылка или описание</span><input data-g2yp-evidence="${escapeAttr(`${kind}:${step.step_id}`)}" value="${escapeAttr(review.evidence || "")}" placeholder="Ссылка на отчёт или результат"></label>
      <div class="g2yp-actions"><button type="button" data-g2yp-review="passed" data-g2yp-kind="${kind}" data-g2yp-step-id="${step.step_id}" ${canConfirm ? "" : "disabled"}>Подтвердить сверку</button><button type="button" data-g2yp-review="failed" data-g2yp-kind="${kind}" data-g2yp-step-id="${step.step_id}">Проблема</button>${review.result && current ? `<span>Проверено ${escapeHtml(new Date(review.checkedAt).toLocaleDateString("ru-RU"))}</span>` : ""}</div>${canConfirm ? "" : `<p class="g2yp-recheck">Для подтверждения не хватает исходных данных или успешного результата проверки.</p>`}` : ""}
      ${review.result && !current ? `<p class="g2yp-recheck">Данные источника изменились. Прежний результат сохранён в истории; требуется повторная сверка.</p>` : ""}
      <details class="g2yp-guide" data-ui-keeper-key="g2yp:guide:${kind}:${step.step_id}"><summary>Как сделать</summary><div><h6>Где нажать / Как проверить</h6><ol>${step.where.map(line => `<li>${escapeHtml(line)}</li>`).join("")}</ol><h6>Сверка</h6><ol>${step.compare.map(line => `<li>${escapeHtml(line)}</li>`).join("")}</ol><a href="${escapeAttr(step.doc)}" target="_blank" rel="noopener noreferrer">Официальная справка Яндекса ↗</a>${kind === "product-yandex-direct" ? ` · <a href="${G2YP_DOCS.tags}" target="_blank" rel="noopener noreferrer">Параметры URL ↗</a>` : ""}</div></details>
    </div></article>`;
}
function g2ypBlockHtml(definition, productId) {
  const source = g2ypSource(productId, state, definition.id), status = g2ypStatus(definition.id, productId, state, source);
  const done = definition.steps.filter(step => g2ypStepStatus(definition.id, step.step_id, productId, state, source) === "ready").length;
  const open = guruDisclosureOpenStateV512()?.[`g2yp:${definition.id}:${productId}`] !== false;
  return `<details class="g2yp-block" data-g2sb-id="${definition.id}" data-g2sb-product-id="${escapeAttr(productId)}" data-ui-keeper-key="g2yp:${definition.id}:${escapeAttr(productId)}" ${open ? "open" : ""}>
    <summary><div><h4>${escapeHtml(definition.title)}</h4><p>${escapeHtml(definition.purpose)}</p><span>${done} из ${definition.steps.length} шагов</span><div class="g2yp-progress"><span style="width:${100 * done / definition.steps.length}%"></span></div></div><span class="status-pill status-${status}" data-status="${status}">${escapeHtml(g2ypLabel(status))}</span></summary>
    <div class="g2yp-steps">${definition.steps.map((step, index) => g2ypStepHtml(definition.id, step, index + 1, productId, source)).join("")}${definition.id === "product-yandex-metrika" ? g2ypLegacyHtml(productId) : ""}</div></details>`;
}
function g2ypMount() {
  const scope = document.querySelector('.g2w-workspace [data-g2-scope="product"]');
  const productId = guruV194SelectedProduct(state)?.id || "";
  if (!scope || !productId || scope.querySelector('[data-g2yp-group]')) return;
  const landing = scope.querySelector('details[data-g2sb-id="product-landing"]');
  const anchor = scope.querySelector(':scope > [data-g2sb-id="product-vk"]') || scope.querySelector('.g2w-additional');
  const html = `<details class="g2y-company g2yp-group" data-g2yp-group data-ui-keeper-key="g2yp:group:${escapeAttr(productId)}" open>
    <summary class="g2y-company-header"><div><h3>Яндекс · Продукт/Услуга</h3><p>Аналитика, поиск и реклама выбранного продукта</p></div><span data-g2yp-summary></span></summary>
    <div class="g2yp-blocks">${G2YP_DEFS.map(def => g2ypBlockHtml(def, productId)).join("")}</div></details>`;
  if (landing) landing.insertAdjacentHTML("afterend", html);
  else if (anchor) anchor.insertAdjacentHTML("beforebegin", html);
  else scope.insertAdjacentHTML("beforeend", html);
  g2ypSyncSummary();
  g2ypRevealHash();
}
function g2ypSyncSummary() {
  const group = document.querySelector('[data-g2yp-group]');
  const productId = guruV194SelectedProduct(state)?.id || "";
  if (!group || !productId) return;
  const statuses = G2YP_DEFS.map(def => g2ypStatus(def.id, productId));
  const skipped = statuses.filter(status => status === "not_needed").length;
  const ready = statuses.filter(status => status === "ready").length;
  group.querySelector('[data-g2yp-summary]').textContent = `${ready} из ${statuses.length - skipped} разделов готово${skipped ? ` · ${skipped} не требуется` : ""}`;
}
function g2ypRefreshBlock(kind, productId) {
  const block = document.querySelector(`[data-g2yp-group] [data-g2sb-id="${CSS.escape(kind)}"]`);
  const definition = G2YP_DEFS.find(def => def.id === kind);
  if (!block || !definition) return;
  const open = block.open;
  const guides = [...block.querySelectorAll('.g2yp-guide[open]')].map(node => node.closest('[data-g2yp-step]')?.dataset.g2ypStep);
  block.outerHTML = g2ypBlockHtml(definition, productId);
  const next = document.querySelector(`[data-g2yp-group] [data-g2sb-id="${CSS.escape(kind)}"]`);
  next.open = open;
  for (const id of guides) next.querySelector(`[data-g2yp-step="${CSS.escape(id)}"] .g2yp-guide`)?.setAttribute("open", "");
  g2ypSyncSummary();
  g2s4UpdateScopeSummaries({ forceFull: true });
  g2wUpdateNav();
}
function g2ypSaveReview(kind, stepId, result, evidence, productId) {
  const config = G2_SERVICE_BLOCK_CONFIGS.get(kind);
  g2ServiceBlockEnsureCard(config);
  const data = g2ypRecord(productId, true);
  const key = `${kind}:${stepId}`;
  const previous = data.reviews[key];
  if (previous) data.history.push({ key, ...previous });
  data.reviews[key] = { result, evidence, fingerprint: g2ypFingerprint(kind, stepId, g2ypSource(productId, state, kind)), checkedAt: new Date().toISOString() };
  g2wSave({ afterPaint: true });
  g2ypRefreshBlock(kind, productId);
  guruV194ScheduleProductSelectorRefreshV1?.();
}
function g2ypSetGoalField(productId, key, value) {
  const card = g2wCard(g2wDef("productGoal"));
  const row = g2MetrikaProductRowV367(card, productId, true);
  const clean = String(value || "").trim();
  if (row[key] === clean) return false;
  const data = g2ypRecord(productId, true);
  data.history.push({ key: `g2-metrika-goals-primary:${key}`, previous: row[key] || "", changedAt: new Date().toISOString() });
  row[key] = clean;
  // The old test timestamp is historical evidence. The new source fingerprint
  // invalidates the review without deleting that saved value.
  return true;
}
document.addEventListener("click", event => {
  const platform = event.target.closest?.("[data-g2yp-open-platform]");
  if (platform) {
    guruNavigateToGate("gate-0");
    let attempts = 0;
    const reveal = () => {
      const section = document.querySelector(".mega-platform-section");
      if (section) { gate0RevealSectionForNode(section); section.scrollIntoView({ block: "start" }); }
      else if (++attempts < 16) requestAnimationFrame(reveal);
    };
    requestAnimationFrame(reveal);
    return;
  }
  const button = event.target.closest?.("[data-g2yp-review]");
  if (!button) return;
  const productId = button.closest('[data-g2yp-group]') && guruV194SelectedProduct(state)?.id;
  if (!productId) return;
  const kind = button.dataset.g2ypKind, stepId = button.dataset.g2ypStepId;
  const evidence = button.closest('[data-g2yp-step]')?.querySelector('[data-g2yp-evidence]')?.value.trim() || "";
  if (button.dataset.g2ypReview === "passed" && !evidence) {
    const input = button.closest('[data-g2yp-step]')?.querySelector('[data-g2yp-evidence]');
    input?.setCustomValidity("Укажите, где проверили результат."); input?.reportValidity(); input?.focus(); return;
  }
  g2ypSaveReview(kind, stepId, button.dataset.g2ypReview, evidence, productId);
});
document.addEventListener("input", event => {
  if (event.target.matches?.('[data-g2yp-evidence]')) event.target.setCustomValidity("");
});
document.addEventListener("change", event => {
  const action = event.target.closest?.('[data-g2yp-main-action]');
  if (action) {
    const productId = action.dataset.g2ypMainAction;
    if (!g2ypSetGoalField(productId, "mainAction", action.value)) return;
    g2wSave({ afterPaint: true });
    g2ypRefreshBlock("product-yandex-metrika", productId);
    guruV194ScheduleProductSelectorRefreshV1?.();
    return;
  }
  const select = event.target.closest?.('[data-g2yp-goal]');
  if (select) {
    const productId = select.dataset.g2ypGoal;
    if (!g2ypSetGoalField(productId, "goalRefId", select.value)) return;
    g2wSave({ afterPaint: true });
    g2ypRefreshBlock("product-yandex-metrika", productId);
    g2ypRefreshBlock("product-yandex-direct", productId);
    guruV194ScheduleProductSelectorRefreshV1?.();
    return;
  }
  if (event.target.closest?.('[data-g2yp-group] [data-g2seo-editor="indexing"]')) {
    const productId = guruV194SelectedProduct(state)?.id;
    if (productId) setTimeout(() => g2ypRefreshBlock("product-yandex-webmaster", productId), 0);
  }
});
function g2ypRevealHash() {
  const hash = decodeURIComponent(location.hash.slice(1));
  const target = ({ "g2-metrika-product-counter": "product-yandex-metrika", "g2-metrika-goals-primary": "product-yandex-metrika",
    "g2-metrika-product-goals": "product-yandex-metrika" })[hash];
  const block = target && document.querySelector(`[data-g2yp-group] [data-g2sb-id="${target}"]`);
  if (block) { block.closest('[data-g2yp-group]').open = true; block.open = true;
    requestAnimationFrame(() => block.scrollIntoView({ block: "start" })); }
}
window.addEventListener("hashchange", g2ypRevealHash);

const g2ypPreviousRender = renderGate2Redesign;
renderGate2Redesign = function (gate, cards) {
  const result = g2ypPreviousRender.apply(this, arguments);
  if (gate?.id === "gate-2") g2ypMount();
  return result;
};
