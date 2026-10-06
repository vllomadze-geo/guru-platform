/* Gate 2: one project-wide Metrika register. Product cards only reference it. */
const G2_METRIKA_COMPANY_FIELD_V374 = "metrikaCompanyV374";
const G2_METRIKA_COMPANY_CARDS_V374 = Object.freeze([
  { id: "g2-metrika-company-counter", kind: "counter", title: "Счётчик проекта" },
  { id: "g2-metrika-company-goals", kind: "goals", title: "Главная цель конверсии (Спасибо-страница)" },
  { id: "g2-metrika-company-internal-filter", kind: "filter", title: "Фильтр внутренних визитов" },
  { id: "g2-metrika-company-robots", kind: "robots", title: "Учёт роботов" },
]);
const G2_METRIKA_COMPANY_BY_ID_V374 = new Map(G2_METRIKA_COMPANY_CARDS_V374.map((item) => [item.id, item]));
const G2_METRIKA_COMPANY_BY_KIND_V374 = new Map(G2_METRIKA_COMPANY_CARDS_V374.map((item) => [item.kind, item]));
const G2_METRIKA_COMPANY_GOAL_TYPES_V374 = [
  ["", "Не выбран"], ["page_visit", "Посещение страниц"], ["js_event", "JS-событие"],
  ["form_submit", "Отправка формы"], ["compound", "Составная"], ["multi", "Мультицель"],
];
const G2_METRIKA_COMPANY_YES_NO_V374 = [["", "Не указано"], ["yes", "Включено"], ["no", "Выключено"]];
const G2_METRIKA_COMPANY_SETTING_STATE_V376 = [["", "Не указано"], ["yes", "Вкл"], ["no", "Откл"]];
const G2_METRIKA_COMPANY_COUNTER_CHECK_V380 = [["", "Не указано"], ["found", "Найден"], ["not_found", "Не найден"]];
const G2_METRIKA_COMPANY_THANK_YOU_STATE_V381 = [["", "Выберите состояние"], ["works", "Работает"], ["not_works", "Не работает"]];
const G2_METRIKA_COMPANY_THANK_YOU_INSTRUCTION_V382 = `
  <p class="g2-mc-instruction-heading-v377">Настройка:</p>
  <ol>
    <li>Метрика → Цели → Добавить цель → тип «Посещение страниц».</li>
    <li>Условие: URL «Содержит» + адрес страницы благодарности, <strong>без протокола</strong> (<code>http://</code>/<code>https://</code> ломают совпадение).</li>
    <li>Все формы и корзина сайта должны вести на одну и ту же страницу благодарности после отправки.</li>
  </ol>
  <p class="g2-mc-instruction-heading-v377">Проверка:</p>
  <ul>
    <li>Отправить тестовую заявку или заказ с реального устройства.</li>
    <li>Дождаться редиректа на страницу благодарности.</li>
    <li>Через 15-30 минут открыть Метрика → Конверсии, проверить прирост «Достижения цели».</li>
  </ul>
  <p class="g2-mc-instruction-heading-v377">Сверка:</p>
  <p>Метрика → Конверсии → цель по названию, прирост должен совпадать с числом тестовых отправок.</p>`;

function g2MetrikaCompanyCardV374(kind, workspace = state) {
  const id = G2_METRIKA_COMPANY_BY_KIND_V374.get(kind)?.id;
  return workspace?.gates?.find((gate) => gate.id === "gate-2")?.cards?.find((card) => card.id === id) || null;
}

function g2MetrikaCompanyDataV374(kind, workspace = state) {
  const data = g2MetrikaCompanyCardV374(kind, workspace)?.fields?.[G2_METRIKA_COMPANY_FIELD_V374];
  return data && typeof data === "object" && !Array.isArray(data) ? data : {};
}

function g2MetrikaCompanyCounterV374(workspace = state) {
  return String(g2MetrikaCompanyDataV374("counter", workspace).counterId || "").trim();
}

function g2MetrikaCompanyGoalsV374(workspace = state) {
  const data = g2MetrikaCompanyDataV374("goals", workspace);
  if (data.primaryGoal) {
    const primary = data.primaryGoal;
    const archived = Array.isArray(data.archivedOtherGoalsV382) ? data.archivedOtherGoalsV382 : [];
    return [...(primary.name || primary.goalId ? [primary] : []),
      ...archived.filter((goal) => goal.entryId !== primary.entryId &&
        (!primary.goalId || String(goal.goalId || "").trim() !== String(primary.goalId).trim()))];
  }
  return Array.isArray(data.goals) ? data.goals : [];
}

function g2MetrikaCompanyGoalV374(refId, workspace = state) {
  return g2MetrikaCompanyGoalsV374(workspace).find((goal) => goal?.entryId === refId) || null;
}

function g2MetrikaCompanyGoalTypeV374(type) {
  return G2_METRIKA_COMPANY_GOAL_TYPES_V374.find(([key]) => key === type)?.[1] || "Тип не указан";
}

function g2MetrikaCompanyStatusV374(card) {
  const kind = G2_METRIKA_COMPANY_BY_ID_V374.get(card?.id)?.kind;
  if (!kind) return "not_started";
  const data = card.fields?.[G2_METRIKA_COMPANY_FIELD_V374] || {};
  const goal = data.primaryGoal;
  const touched = {
    counter: () => Boolean(String(data.counterId || "").trim() || data.counterCheck),
    goals: () => Boolean(goal && (goal.name || goal.goalId || goal.state)),
    filter: () => Boolean(data.mode),
    robots: () => Boolean(data.mode || data.strictFiltering || data.strictReason),
  }[kind]();
  if (!touched) return "not_started";
  if (kind === "counter" && data.counterCheck === "not_found") return "problem";
  if (kind === "goals" && goal.state === "not_works") return "problem";
  const complete = {
    counter: () => /^\d+$/.test(String(data.counterId || "").trim()) && data.counterCheck === "found",
    goals: () => String(goal.name || "").trim() && String(goal.goalId || "").trim() &&
      G2_METRIKA_COMPANY_GOAL_TYPES_V374.some(([type]) => type && type === goal.type) &&
      goal.state === "works",
    filter: () => ["ip", "cookie", "off"].includes(data.mode),
    robots: () => ["with_robots", "without_robots"].includes(data.mode) &&
      ["yes", "no"].includes(data.strictFiltering) &&
      (data.strictFiltering !== "yes" || String(data.strictReason || "").trim()),
  }[kind];
  return complete() ? "ready" : "in_progress";
}

function g2MetrikaCompanyNextGoalIdV374(data) {
  const goals = Array.isArray(data.goals) ? data.goals : [];
  const highest = goals.reduce((max, goal) => {
    const match = /^company-goal-(\d+)$/.exec(goal?.entryId || "");
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  let index = Math.max(Number(data.nextGoalSequence) || 1, highest + 1);
  while (goals.some((goal) => goal?.entryId === `company-goal-${index}`)) index += 1;
  data.nextGoalSequence = index + 1;
  return `company-goal-${index}`;
}

function g2MetrikaCompanyLegacyTypeV374(value) {
  if (value === "thank_you_page") return "page_visit";
  if (value === "explicit_event") return "js_event";
  return G2_METRIKA_COMPANY_GOAL_TYPES_V374.some(([type]) => type && type === value) ? value : "";
}

function g2MetrikaCompanyMigrateV374(gate) {
  const cards = gate.cards;
  const data = (kind) => cards.find((card) => card.id === G2_METRIKA_COMPANY_BY_KIND_V374.get(kind).id)
    .fields[G2_METRIKA_COMPANY_FIELD_V374];
  const productRows = (id, key = "metrikaProductV367") =>
    cards.find((card) => card.id === id)?.fields?.[key]?.perProduct || [];
  const counter = data("counter");
  if (!counter.legacyImportDone) {
    const oldTraffic = cards.find((card) => card.id === "g2-metrika-goals-traffic");
    const old = oldTraffic?.fields?.metrikaQualityV360 || {};
    const values = [...new Set(productRows("g2-metrika-product-counter")
      .map((row) => String(row.counterId || "").trim()).filter(Boolean))];
    if (!counter.counterId) {
      if (String(old.counterId || "").trim()) counter.counterId = String(old.counterId).trim();
      else if (values.length === 1) counter.counterId = values[0];
    }
    if (values.length > 1 || values.some((value) => counter.counterId && value !== counter.counterId))
      counter.migrationNotice = "В прежних товарных проверках найдены разные номера счётчика. Сверьте общий номер проекта.";
    if (!counter.testedAt && old.testedAt) counter.testedAt = String(old.testedAt).slice(0, 10);
    if (!counter.evidenceUrl && old.evidenceUrl) counter.evidenceUrl = old.evidenceUrl;
    if (!counter.comment && old.comment) counter.comment = old.comment;
    if (oldTraffic && typeof g2MetrikaQualityStatusV360 === "function" &&
      g2MetrikaQualityStatusV360(oldTraffic) === "ready" && !counter.migrationNotice)
      counter.verificationStatus ||= "ready";
    counter.legacyImportDone = true;
  }
  if (!counter.counterCheckMigratedV380) {
    if (!counter.counterCheck && counter.verificationStatus === "ready") counter.counterCheck = "found";
    counter.counterCheckMigratedV380 = true;
  }
  const oldWebvisorIndex = cards.findIndex((card) => card.id === "g2-metrika-company-webvisor");
  if (oldWebvisorIndex >= 0) {
    const oldWebvisorCard = cards[oldWebvisorIndex];
    const oldEnabled = oldWebvisorCard.fields?.[G2_METRIKA_COMPANY_FIELD_V374]?.enabled;
    if (!counter.webvisorEnabled && ["yes", "no"].includes(oldEnabled)) counter.webvisorEnabled = oldEnabled;
    counter.legacyWebvisorCardV379 ||= oldWebvisorCard;
    cards.splice(oldWebvisorIndex, 1);
  }
  if (!counter.webvisorSettingMigratedV379) {
    const values = [...new Set(productRows("g2-metrika-product-webvisor")
      .map((row) => row.webvisorEnabled).filter((value) => ["yes", "no"].includes(value)))];
    if (!counter.webvisorEnabled && values.length === 1) counter.webvisorEnabled = values[0];
    counter.webvisorSettingMigratedV379 = true;
  }

  const catalog = data("goals");
  if (!catalog.singleGoalMigratedV382) {
    catalog.goals = Array.isArray(catalog.goals) ? catalog.goals : [];
    catalog.goals.forEach((goal) => { goal.entryId ||= g2MetrikaCompanyNextGoalIdV374(catalog); });
    catalog.nextGoalSequence = Math.max(Number(catalog.nextGoalSequence) || 1, ...catalog.goals.map((goal) => {
      const match = /^company-goal-(\d+)$/.exec(goal.entryId || "");
      return match ? Number(match[1]) + 1 : 1;
    }));
    if (!catalog.legacyImportDone) {
      const importGoal = (row, name, goalId, legacyType) => {
        const cleanId = String(goalId || "").trim();
        const cleanName = String(name || "").trim();
        if (!cleanId && !cleanName) return;
        const type = g2MetrikaCompanyLegacyTypeV374(legacyType);
        const referenced = row.goalRefId && catalog.goals.find((goal) => goal.entryId === row.goalRefId);
        const existing = referenced || catalog.goals.find((goal) => cleanId
          ? String(goal.goalId || "").trim().toLowerCase() === cleanId.toLowerCase()
          : !goal.goalId && goal.name === cleanName && goal.type === type);
        const goal = existing || { entryId: row.goalRefId && !catalog.goals.some((item) => item.entryId === row.goalRefId)
          ? row.goalRefId : g2MetrikaCompanyNextGoalIdV374(catalog),
          name: cleanName || cleanId, type, goalId: cleanId };
        if (existing && !referenced && ((cleanName && existing.name && existing.name !== cleanName) ||
          (type && existing.type && existing.type !== type)))
          catalog.migrationNotice = "Один ID цели встречался с разными названиями или типами. Проверьте главную цель конверсии.";
        if (!existing) catalog.goals.push(goal);
        if (!row.goalRefId) row.goalRefId = goal.entryId;
      };
      productRows("g2-metrika-goals-primary", "metrikaQualityV360").forEach((row) =>
        importGoal(row, row.goalName, row.goalId, row.triggerType));
      productRows("g2-metrika-product-goals").forEach((row) =>
        (Array.isArray(row.goals) ? row.goals : []).forEach((goal) =>
          importGoal(goal, goal.goalName, goal.goalId, goal.triggerType)));
      [["g2-metrika-goals-calls", "callRoutes", "Звонок", "phoneNumber"],
        ["g2-metrika-goals-email", "emailRoutes", "Email", "emailAddress"],
        ["g2-metrika-goals-widgets", "widgets", "Виджет", "name"]].forEach(([id, key, label, nameKey]) => {
        const rows = cards.find((card) => card.id === id)?.fields?.metrikaQualityV360?.[key] || [];
        if (Array.isArray(rows)) rows.forEach((row) =>
          importGoal(row, `${label}${row?.[nameKey] ? ` · ${row[nameKey]}` : ""}`, row?.goalId, ""));
      });
      catalog.nextGoalSequence = Math.max(Number(catalog.nextGoalSequence) || 1, ...catalog.goals.map((goal) => {
        const match = /^company-goal-(\d+)$/.exec(goal.entryId || "");
        return match ? Number(match[1]) + 1 : 1;
      }));
      catalog.legacyImportDone = true;
    }
    const primaryRows = productRows("g2-metrika-goals-primary", "metrikaQualityV360");
    const selected = catalog.goals.find((goal) => String(goal.goalId || "").trim() === "573230679") ||
      catalog.goals.find((goal) => primaryRows.some((row) => row.goalRefId === goal.entryId)) ||
      catalog.goals[0];
    const isKnownThankYouGoal = String(selected?.goalId || "").trim() === "573230679";
    catalog.primaryGoal = selected ? {
      ...selected,
      name: isKnownThankYouGoal ? "THANK YOU PAGE" : selected.name || "",
      type: isKnownThankYouGoal ? "page_visit" : selected.type || "page_visit",
      state: selected.state || counter.thankYouGoalState || "",
    } : {
      entryId: g2MetrikaCompanyNextGoalIdV374(catalog), name: "", type: "page_visit",
      goalId: "", state: counter.thankYouGoalState || "",
    };
    catalog.archivedOtherGoalsV382 = catalog.goals.filter((goal) => goal !== selected);
    delete catalog.goals;
    delete catalog.nextGoalSequence;
    delete counter.thankYouGoalState;
    catalog.singleGoalMigratedV382 = true;
  }

  const filter = data("filter");
  if (!filter.legacyImportDone) {
    const modes = productRows("g2-metrika-product-internal-filter").map((row) => {
      const raw = String(row.filterMode || "").toLowerCase();
      if (!raw) return "";
      if (raw.includes("ip") || raw.includes("айпи")) return "ip";
      if (raw.includes("cookie") || raw.includes("куки") || raw.includes("мои визиты")) return "cookie";
      if (raw.includes("выключ") || raw.includes("отключ")) return "off";
      return "";
    }).filter(Boolean);
    const unique = [...new Set(modes)];
    if (!filter.mode && unique.length === 1) filter.mode = unique[0];
    if (unique.length > 1) filter.migrationNotice = "Прежние товары содержат разные режимы фильтра. Уточните настройку сайта.";
    filter.legacyImportDone = true;
  }
  const robots = data("robots");
  if (!robots.legacyImportDone) {
    const rows = productRows("g2-metrika-product-antibot");
    const modes = [...new Set(rows.map((row) => {
      const raw = String(row.robotMode || "").toLowerCase();
      return raw.includes("без робот") ? "without_robots" : raw.includes("с робот") ? "with_robots" : "";
    }).filter(Boolean))];
    const strict = [...new Set(rows.map((row) => row.strictFiltering).filter((value) => ["yes", "no"].includes(value)))];
    if (!robots.mode && modes.length === 1) robots.mode = modes[0];
    if (!robots.strictFiltering && strict.length === 1) robots.strictFiltering = strict[0];
    if (!robots.strictReason) robots.strictReason = rows.find((row) => row.strictReason)?.strictReason || "";
    if (modes.length > 1 || strict.length > 1)
      robots.migrationNotice = "Прежние товары содержат разные настройки роботов. Уточните настройку сайта.";
    robots.legacyImportDone = true;
  }
}

const __g2MetrikaCompanyPrevEnsureV374 = ensureGate2Structure;
ensureGate2Structure = function (gate) {
  __g2MetrikaCompanyPrevEnsureV374(gate);
  if (gate?.id !== "gate-2" || !Array.isArray(gate.cards)) return;
  const existing = new Set(gate.cards.map((card) => card.id));
  const added = G2_METRIKA_COMPANY_CARDS_V374.filter((item) => !existing.has(item.id)).map((item) => ({
    id: item.id, title: item.title, instruction: "", status: "not_started",
    evidence: "", pages: "", notes: "", generatedBy: "gate2-metrika-company-source-v374",
    fields: { [G2_METRIKA_COMPANY_FIELD_V374]: {} },
  }));
  if (added.length) {
    const index = gate.cards.findIndex((card) => card.id === "card-105");
    gate.cards.splice(index < 0 ? gate.cards.length : index + 1, 0, ...added);
  }
  G2_METRIKA_COMPANY_CARDS_V374.forEach((item) => {
    const card = gate.cards.find((entry) => entry.id === item.id);
    card.fields ||= {};
    card.fields[G2_METRIKA_COMPANY_FIELD_V374] ||= {};
    if (item.kind === "goals") card.title = item.title;
  });
  g2MetrikaCompanyMigrateV374(gate);
};

const __g2MetrikaCompanyPrevSectionV374 = g2SectionKeyForCardV271;
g2SectionKeyForCardV271 = function (card) {
  return G2_METRIKA_COMPANY_BY_ID_V374.has(card?.id)
    ? G2_METRIKA_QUALITY_COMPANY_SECTION_V361
    : __g2MetrikaCompanyPrevSectionV374(card);
};

const __g2MetrikaCompanyPrevStatusV374 = g2CardStatus;
g2CardStatus = function (card) {
  return G2_METRIKA_COMPANY_BY_ID_V374.has(card?.id)
    ? g2MetrikaCompanyStatusV374(card) : __g2MetrikaCompanyPrevStatusV374(card);
};

const __g2MetrikaCompanyPrevDiagnosticV374 = guruExportGate2CardDiagnosticV223;
guruExportGate2CardDiagnosticV223 = function (card, rawStatus) {
  if (!G2_METRIKA_COMPANY_BY_ID_V374.has(card?.id))
    return __g2MetrikaCompanyPrevDiagnosticV374.apply(this, arguments);
  const status = g2MetrikaCompanyStatusV374(card);
  const path = `state.gates[gate-2].cards[${card.id}].fields.${G2_METRIKA_COMPANY_FIELD_V374}`;
  const source = guruExportDiagnosticSourceV223({
    key: "METRIKA_COMPANY", sourceType: "gate2_metrika_company_register",
    gateId: "gate-2", cardId: card.id, path, title: `${card.title} · настройки компании`,
    rawStatus: status, found: status !== "not_started",
    lookup: { kind: "card_id", value: card.id },
  });
  source.consulted = true;
  source.decision = "selected";
  source.result = status;
  return {
    unitId: card.id, unitKind: "card", gateId: "gate-2", title: card.title,
    includedInUi: true, includedInGateReadiness: true, readinessRole: "direct",
    rawStoredStatus: rawStatus ?? null, recalculatedStatus: status,
    readinessStatus: status, readinessNormalizedStatus: guruExportDiagnosticNormalizedV223(status),
    displayedStatus: status, statusLabel: STATUS_LABELS[status] || status,
    resolver: { name: "g2MetrikaCompanyStatusV374", codeAnchor: "gate2-metrika-company-source.js" },
    fallbackOrder: ["METRIKA_COMPANY"], fallbackExpression: "Реестр Метрики компании",
    sourceChain: [source],
    selectedSource: { key: source.key, sourceType: source.sourceType, gateId: source.gateId,
      cardId: source.cardId, path: source.path, title: source.title,
      rawStatus: source.rawStatus, result: status },
    result: status, warnings: [],
  };
};

const __g2MetrikaCompanyPrevRecalculateV374 = recalculateStatusForCard;
recalculateStatusForCard = function (card, workspace = state) {
  if (G2_METRIKA_COMPANY_BY_ID_V374.has(card?.id)) {
    card.status = g2MetrikaCompanyStatusV374(card);
    return;
  }
  return __g2MetrikaCompanyPrevRecalculateV374.apply(this, arguments);
};

function g2MetrikaCompanyFieldV374(card, key, label, value, type = "text", goalId = "") {
  const goal = goalId ? ` data-g2-mc-goal="${escapeAttr(goalId)}"` : "";
  return `<label class="g2-mp-field-v367"><span>${escapeHtml(label)}</span><input type="${escapeAttr(type)}" data-g2-mc-card="${escapeAttr(card.id)}" data-g2-mc-field="${escapeAttr(key)}"${goal} value="${escapeAttr(value || "")}" /></label>`;
}

function g2MetrikaCompanySelectV374(card, key, label, value, options, goalId = "") {
  const goal = goalId ? ` data-g2-mc-goal="${escapeAttr(goalId)}"` : "";
  const choices = options.some(([option]) => option === value) || !value ? options :
    [...options, [value, `Ранее сохранено: ${value} — уточните`]];
  return `<label class="g2-mp-field-v367"><span>${escapeHtml(label)}</span><select data-g2-mc-card="${escapeAttr(card.id)}" data-g2-mc-field="${escapeAttr(key)}"${goal}>${choices.map(([option, text]) =>
    `<option value="${escapeAttr(option)}"${value === option ? " selected" : ""}>${escapeHtml(text)}</option>`).join("")}</select></label>`;
}

function g2MetrikaCompanySettingsHtmlV376(card, data) {
  const row = (key, title, explanation, fieldCard, fieldKey, value, extra = "", rich = false,
    options = G2_METRIKA_COMPANY_SETTING_STATE_V376) =>
    `<div id="g2-mc-setting-${escapeAttr(key)}" class="g2-mc-setting-v376" data-g2-mc-setting-row="${escapeAttr(key)}">
      <div class="g2-mc-setting-copy-v376">
        <strong>${escapeHtml(title)}</strong>
        ${rich ? `<div class="g2-mc-setting-explanation-v376">${explanation}</div>` :
          `<p class="g2-mc-setting-explanation-v376">${escapeHtml(explanation)}</p>`}
      </div>
      ${g2MetrikaCompanySelectV374(fieldCard, fieldKey, "Состояние", value || "", options)}
      ${extra ? `<div class="g2-mc-setting-extra-v376">${extra}</div>` : ""}
    </div>`;
  const ecommerceInstruction = `
    <p class="g2-mc-instruction-heading-v377">Настройка:</p>
    <ol>
      <li>Метрика → Настройки → Счётчик → Электронная коммерция → Вкл, контейнер <code>dataLayer</code>.</li>
      <li>Карточка товара подключена к блоку «Каталог товаров».</li>
      <li>Блок корзины (ST100) → Доп. настройки → галочка «Отправлять данные о добавлении в корзину».</li>
      <li>Опубликовать все страницы Tilda.</li>
    </ol>
    <p class="g2-mc-instruction-heading-v377">Проверка:</p>
    <ul>
      <li>URL товара + <code>?_ym_debug=1</code>, консоль (Cmd+Option+J), выполнить действие.</li>
      <li>Просмотр карточки → событие <code>detail</code> с ID товара. Нет → карточка не подключена к каталогу.</li>
      <li>В корзину → событие <code>add</code>. Нет → не включена галочка в ST100.</li>
      <li>Оформление заказа → событие <code>purchase</code> с суммой и ID. Нет → не опубликованы страницы после включения опции.</li>
    </ul>
    <p class="g2-mc-instruction-heading-v377">Сверка:</p>
    <p>Метрика → Отчёты → Электронная коммерция, тестовый заказ должен появиться там с задержкой до нескольких минут.</p>`;
  const customHtml = `<label class="g2-mc-checkbox-v376">
    <input type="checkbox" data-g2-mc-card="${escapeAttr(card.id)}" data-g2-mc-field="tagManagerCustomHtml"${data.tagManagerCustomHtml ? " checked" : ""} />
    <span>Пользовательский HTML</span>
  </label>`;
  return `<section class="g2-mc-settings-v376" aria-label="Настройки счётчика">
    <h3>Настройки счётчика</h3>
    ${row("automatic-goals", "Автоматические цели",
      "Метрика сама создаёт цели на клики по телефону, email и подобные действия, без ручной настройки.",
      card, "automaticGoals", data.automaticGoals)}
    ${row("webvisor", "Вебвизор сайта",
      "Запись движений мыши, скролла и кликов посетителя. Нужно для диагностики поведения на карточках товара.",
      card, "webvisorEnabled", data.webvisorEnabled)}
    ${row("ecommerce", "Электронная коммерция",
      ecommerceInstruction,
      card, "ecommerceEnabled", data.ecommerceEnabled,
      g2MetrikaCompanyFieldV374(card, "ecommerceContainer", "Имя контейнера данных", data.ecommerceContainer), true)}
    ${row("content-analytics", "Контентная аналитика",
      "Отчёты по текстовым материалам сайта — какой контент вовлекает аудиторию.",
      card, "contentAnalytics", data.contentAnalytics)}
    ${row("tag-manager", "Тег менеджер",
      "Нужен для правил, которых нет в панели «Аналитика» конструктора (там только вставка номеров счётчиков). Пример: показать пиксель ретаргетинга не всем, а только тем, кто провёл на странице больше 30 сек, или тем, кто дошёл до оплаты и не завершил (брошенная корзина). Если тумблер «Вкл», но пользовательский код не добавлен — функционально ничего не делает.",
      card, "tagManagerEnabled", data.tagManagerEnabled, customHtml)}
    ${row("counter-check", "Проверка счётчика", `
      <p>Настройки → указать адрес страницы → «Проверить»)</p>
      <p>Если код счётчика установлен корректно появится зелёное уведомление.</p>
      <p>Если счётчик не найден уведомления не будет вообще (частые причины: блокировщик рекламы, счётчик удалён со страницы, редирект без передачи URL-параметров).</p>`,
      card, "counterCheck", data.counterCheck, "", true, G2_METRIKA_COMPANY_COUNTER_CHECK_V380)}
  </section>`;
}

function g2MetrikaCompanyCardHtmlV374(card) {
  const definition = G2_METRIKA_COMPANY_BY_ID_V374.get(card.id);
  const data = card.fields?.[G2_METRIKA_COMPANY_FIELD_V374] || {};
  const status = g2MetrikaCompanyStatusV374(card);
  const kind = definition.kind;
  const specific = {
    counter: () => `${g2MetrikaCompanyFieldV374(card, "counterId", "Номер счётчика проекта", data.counterId)}
      ${g2MetrikaCompanySettingsHtmlV376(card, data)}`,
    goals: () => `<div class="g2-mc-setting-v376" data-g2-mc-setting-row="thank-you-goal">
      <div class="g2-mc-setting-copy-v376"><div class="g2-mc-setting-explanation-v376">${G2_METRIKA_COMPANY_THANK_YOU_INSTRUCTION_V382}</div></div>
      <div class="g2-mc-setting-extra-v376"><span>URL страницы «Спасибо» · из Платформы</span><span class="mega-platform-source-value">${escapeHtml(megaPlatformUrl("fixed", "thank_you", state) || "URL не указан")}</span></div>
      ${g2MetrikaCompanySelectV374(card, "state", "Состояние", data.primaryGoal?.state || "", G2_METRIKA_COMPANY_THANK_YOU_STATE_V381, "primary")}
      <div class="g2-mc-setting-extra-v376 g2-mc-primary-goal-fields-v382">
        ${g2MetrikaCompanyFieldV374(card, "name", "Название цели", data.primaryGoal?.name, "text", "primary")}
        ${g2MetrikaCompanySelectV374(card, "type", "Тип цели", data.primaryGoal?.type || "page_visit", G2_METRIKA_COMPANY_GOAL_TYPES_V374, "primary")}
        ${g2MetrikaCompanyFieldV374(card, "goalId", "ID цели", data.primaryGoal?.goalId, "text", "primary")}
      </div>
    </div>`,
    filter: () => g2MetrikaCompanySelectV374(card, "mode", "Режим фильтра внутренних визитов", data.mode || "",
      [["", "Не указан"], ["ip", "По IP"], ["cookie", "По cookie"], ["off", "Выключен"]]),
    robots: () => `${g2MetrikaCompanySelectV374(card, "mode", "Режим учёта роботов", data.mode || "",
      [["", "Не указан"], ["without_robots", "Без роботов"], ["with_robots", "С роботами"]])}
      ${g2MetrikaCompanySelectV374(card, "strictFiltering", "Строгая фильтрация", data.strictFiltering || "", G2_METRIKA_COMPANY_YES_NO_V374)}
      ${data.strictFiltering === "yes" ? g2MetrikaCompanyFieldV374(card, "strictReason", "Основание строгой фильтрации", data.strictReason) : ""}`,
  }[kind]();
  return `<article id="${escapeAttr(card.id)}" class="g2-check-row g2-mp-card-v367 g2-mc-card-v374" data-card="${escapeAttr(card.id)}" data-g2-scope-kind="company">
    <div class="g2-check-title"><span>${escapeHtml(definition.title)}</span><span class="status-pill status-${status}">${escapeHtml(STATUS_LABELS[status] || status)}</span></div>
    <div class="g2-mc-fields-v374">
      ${specific}
      ${data.migrationNotice ? `<p class="g2-mc-notice-v374">${escapeHtml(data.migrationNotice)}</p>` : ""}
    </div>
  </article>`;
}

const __g2MetrikaCompanyPrevCardHtmlV374 = g2CardHtml;
g2CardHtml = function (card) {
  return G2_METRIKA_COMPANY_BY_ID_V374.has(card?.id)
    ? g2MetrikaCompanyCardHtmlV374(card) : __g2MetrikaCompanyPrevCardHtmlV374(card);
};

function g2MetrikaCompanyUpdateV374(target) {
  const card = state?.gates?.find((gate) => gate.id === "gate-2")?.cards
    ?.find((item) => item.id === target.dataset.g2McCard);
  if (!card || !G2_METRIKA_COMPANY_BY_ID_V374.has(card.id)) return;
  const data = card.fields[G2_METRIKA_COMPANY_FIELD_V374];
  const goalId = target.dataset.g2McGoal;
  if (goalId && goalId !== "primary") return;
  const record = goalId === "primary" ? data.primaryGoal : data;
  if (!record) return;
  const field = target.dataset.g2McField;
  const value = target.type === "checkbox" ? target.checked : target.value;
  const changed = record[field] !== value;
  record[field] = value;
  if (changed) delete data.migrationNotice;
  recalculateStatusForCard(card, state);
  flashSaving();
  guruGateReadinessCache.delete("gate-2");
}

document.addEventListener("input", (event) => {
  const target = event.target?.closest?.("[data-g2-mc-field]");
  if (target && target.tagName !== "SELECT" && !["date", "checkbox"].includes(target.type))
    g2MetrikaCompanyUpdateV374(target);
});
document.addEventListener("change", (event) => {
  const target = event.target?.closest?.("[data-g2-mc-field]");
  if (!target) return;
  g2MetrikaCompanyUpdateV374(target);
  renderGate();
});
document.addEventListener("click", (event) => {
  const link = event.target?.closest?.("[data-g2-mc-link]");
  if (!link) return;
  event.preventDefault();
  const section = document.querySelector('[data-g2-metrika-quality-section-v360="company"]');
  const header = section?.querySelector(":scope > [data-g2-toggle-section]");
  if (header?.getAttribute("aria-expanded") === "false") header.click();
  document.getElementById(link.dataset.g2McLink)?.scrollIntoView({ behavior: "smooth", block: "start" });
});

// Gate 4 uses the same company counter and goal register as Gate 2.
g4RsyaGoalQualityV363 = function (product, campaign) {
  const gate = state?.gates?.find((item) => item.id === "gate-2");
  const selected = String(campaign?.metrikaGoal || "").trim().toLocaleLowerCase("ru-RU");
  const productId = g4RsyaCatalogProductV289(product)?.id || "";
  const counter = g2MetrikaCompanyCounterV374();
  const campaignCounter = String(campaign?.metrikaCounter || "").trim();
  const mismatch = Boolean(counter && campaignCounter && counter !== campaignCounter);
  if (!selected) return { status: "not_started", message: "Выберите цель Метрики для сопоставления с Gate 2.", matched: false };
  if (mismatch) return { status: "problem", message: `Счётчик РСЯ не совпадает со счётчиком Gate 2 (${counter}).`, matched: false };
  const matches = g2MetrikaCompanyGoalsV374().filter((goal) =>
    [goal.goalId, goal.name].some((value) => String(value || "").trim().toLocaleLowerCase("ru-RU") === selected));
  if (matches.length !== 1) return { status: "in_progress", message: matches.length
    ? "Цель неоднозначна в списке компании: уточните её ID."
    : "Цель РСЯ не найдена в списке целей счётчика компании.", matched: false };
  const goal = matches[0];
  const primary = gate?.cards?.find((card) => card.id === "g2-metrika-goals-primary");
  const primaryRow = primary?.fields?.metrikaQualityV360?.perProduct?.find((row) => row.product_id === productId);
  const extra = gate?.cards?.find((card) => card.id === "g2-metrika-product-goals");
  const extraRows = extra?.fields?.metrikaProductV367?.perProduct?.find((row) => row.product_id === productId)?.goals || [];
  const candidates = [];
  if (primaryRow?.goalRefId === goal.entryId) candidates.push({ label: "главная цель товара", card: primary });
  extraRows.filter((row) => row.goalRefId === goal.entryId).forEach(() =>
    candidates.push({ label: "дополнительная цель товара", card: extra }));
  if (candidates.length !== 1) return { status: "in_progress", message: candidates.length
    ? "Цель привязана к нескольким проверкам товара: уточните назначение."
    : "Цель компании не привязана к выбранному товару.", matched: false };
  const sourceReady = ["counter", "goals"].every((kind) =>
    g2MetrikaCompanyStatusV374(g2MetrikaCompanyCardV374(kind)) === "ready");
  const productStatus = typeof g2MetrikaProductStatusV367 === "function"
    ? g2MetrikaProductStatusV367(candidates[0].card, productId) : "not_started";
  const status = sourceReady ? productStatus : "in_progress";
  return { status, message: `${candidates[0].label}: ${STATUS_LABELS[status] || status}.`, matched: true };
};

const __g2MetrikaCompanyPrevPrepareV374 = prepareSystemCards;
prepareSystemCards = function (workspace) {
  __g2MetrikaCompanyPrevPrepareV374(workspace);
  const gate = workspace?.gates?.find((item) => item.id === "gate-2");
  if (gate) ensureGate2Structure(gate);
};

if (state) {
  const gate = state.gates?.find((item) => item.id === "gate-2");
  if (gate) ensureGate2Structure(gate);
  guruGateReadinessCache.delete("gate-2");
}
