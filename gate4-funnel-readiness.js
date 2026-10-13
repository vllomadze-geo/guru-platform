/* ================================================================
   v2.3.94 — Gate 4 строится вокруг той же карты 5A, что и Gate 3.

   Важный инвариант: этот слой меняет только представление. Карточки
   card-147..169, все instructionRows и записи campaigns остаются в
   исходных хранилищах и продолжают адресоваться стабильными ключами.
   ================================================================ */

const G4_FUNNEL_READINESS_VERSION_V294 = "gate4-funnel-readiness-v294";

/* ================================================================
   v2.3.98 — единая SMM-стратегия проекта в Aware.

   Хранилище намеренно находится в корне workspace, а не в product-
   scoped структурах Gate 4: стратегия создаётся один раз на проект и
   остаётся той же при переключении категории или товара.
   ================================================================ */

const G4_SMM_STRATEGY_VERSION_V298 = "gate4-smm-strategy-v298";
const G4_SMM_PRINCIPLE_V298 =
  "Одно вертикальное видео = одна единица контента, даже если опубликовано на нескольких площадках.";
const G4_SMM_THRESHOLDS_NOTE_V298 =
  "Применяется к просмотрам, сохранениям, подпискам и заявкам. Сравнение — с типичным результатом аккаунта, не с абсолютным числом.";

const G4_SMM_DEFAULT_FORMATS_V298 = Object.freeze([
  Object.freeze({
    id: "g4-smm-format-v298-1",
    format: "Короткое вертикальное видео",
    task: "Охват, новая аудитория",
    platforms: "VK Клипы, RUTUBE Shorts, Instagram Reels, TikTok, YouTube Shorts",
  }),
  Object.freeze({
    id: "g4-smm-format-v298-2",
    format: "Фото / кейс",
    task: "Доверие, результат",
    platforms: "ВКонтакте, Telegram, MAX, Instagram",
  }),
  Object.freeze({
    id: "g4-smm-format-v298-3",
    format: "Карусель / подборка",
    task: "Объяснение, сохранения",
    platforms: "ВКонтакте, Instagram",
  }),
  Object.freeze({
    id: "g4-smm-format-v298-4",
    format: "Экспертный текст / статья",
    task: "Глубина, поиск, доверие",
    platforms: "Дзен, Telegram, ВКонтакте, MAX",
  }),
  Object.freeze({
    id: "g4-smm-format-v298-5",
    format: "Stories",
    task: "Удержание, контакт",
    platforms: "ВКонтакте, Telegram, Instagram",
  }),
  Object.freeze({
    id: "g4-smm-format-v298-6",
    format: "Длинное видео",
    task: "Глубокое раскрытие темы",
    platforms: "VK Видео, RUTUBE, YouTube",
  }),
]);

const G4_SMM_DEFAULT_TOPICS_V298 = Object.freeze([
  "Проблема → решение",
  "До / после",
  "Полезное объяснение",
  "Процесс / backstage",
  "Кейс / результат",
  "Тренд / реактивный контент",
]);

function g4SmmStrategyEnsureV298(workspace = state) {
  if (!workspace || typeof workspace !== "object") return null;
  const current = workspace.gate4SmmStrategyV298;
  const strategy = current && typeof current === "object" && !Array.isArray(current)
    ? current
    : {};
  strategy.version = G4_SMM_STRATEGY_VERSION_V298;
  strategy.volume = strategy.volume && typeof strategy.volume === "object"
    ? strategy.volume
    : {};
  const volumeDefaults = {
    shortVideos: 3,
    carousels: 1,
    cases: 1,
    storiesMin: 5,
    storiesMax: 7,
  };
  Object.entries(volumeDefaults).forEach(([key, value]) => {
    if (!Number.isFinite(Number(strategy.volume[key]))) strategy.volume[key] = value;
    else strategy.volume[key] = Math.max(0, Number(strategy.volume[key]));
  });
  strategy.planningPeriod = strategy.planningPeriod && typeof strategy.planningPeriod === "object"
    ? strategy.planningPeriod
    : {};
  const planningCount = Number(strategy.planningPeriod.count);
  strategy.planningPeriod.count = Number.isFinite(planningCount) && planningCount > 0
    ? Math.min(999, Math.round(planningCount))
    : 1;
  if (!["week", "month", "quarter", "year"].includes(strategy.planningPeriod.unit))
    strategy.planningPeriod.unit = "week";
  if (!Array.isArray(strategy.formats)) {
    strategy.formats = G4_SMM_DEFAULT_FORMATS_V298.map((row) => ({ ...row }));
  } else {
    strategy.formats = strategy.formats.map((row, index) => ({
      id: guruV185Text(row?.id) || `g4-smm-format-v298-${index + 1}`,
      format: guruV185Text(row?.format),
      task: guruV185Text(row?.task),
      platforms: guruV185Text(row?.platforms),
    }));
  }
  if (!Array.isArray(strategy.topics)) {
    strategy.topics = G4_SMM_DEFAULT_TOPICS_V298.map((value, index) => ({
      id: `g4-smm-topic-v298-${index + 1}`,
      value,
    }));
  } else {
    strategy.topics = strategy.topics.map((row, index) => ({
      id: guruV185Text(row?.id) || `g4-smm-topic-v298-${index + 1}`,
      value: guruV185Text(typeof row === "string" ? row : row?.value),
    }));
  }
  strategy.thresholds = strategy.thresholds && typeof strategy.thresholds === "object"
    ? strategy.thresholds
    : {};
  const thresholdDefaults = { weakMax: 70, normalMax: 130, strongMax: 200 };
  Object.entries(thresholdDefaults).forEach(([key, value]) => {
    if (!Number.isFinite(Number(strategy.thresholds[key]))) strategy.thresholds[key] = value;
    else strategy.thresholds[key] = Math.max(0, Number(strategy.thresholds[key]));
  });
  /* v2.3.109 — устаревший общий список ядра/дистрибуции удалён.
     Рабочие площадки хранятся только в соответствующих форматах. */
  if (Object.prototype.hasOwnProperty.call(strategy, "platforms")) delete strategy.platforms;
  workspace.gate4SmmStrategyV298 = strategy;
  workspace.project = workspace.project || {};
  const log = workspace.project._gate4SmmStrategyLogV298;
  if (log?.id !== G4_SMM_STRATEGY_VERSION_V298) {
    workspace.project._gate4SmmStrategyLogV298 = {
      id: G4_SMM_STRATEGY_VERSION_V298,
      status: "initialized",
      scope: "company_project",
      productScoped: false,
      defaultFormats: G4_SMM_DEFAULT_FORMATS_V298.length,
      defaultTopics: G4_SMM_DEFAULT_TOPICS_V298.length,
      createdAt: new Date().toISOString(),
    };
  }
  return strategy;
}

function g4SmmStrategyQuarterV298(weekly) {
  return Math.round((Math.max(0, Number(weekly) || 0) * 12) / 10) * 10;
}

function g4SmmStrategyTotalsV298(strategy = g4SmmStrategyEnsureV298()) {
  const volume = strategy?.volume || {};
  const weeklyMin =
    Math.max(0, Number(volume.shortVideos) || 0) +
    Math.max(0, Number(volume.carousels) || 0);
  const weeklyMax = weeklyMin + Math.max(0, Number(volume.cases) || 0);
  return {
    weeklyMin,
    weeklyMax,
    quarterMin: g4SmmStrategyQuarterV298(weeklyMin),
    quarterMax: g4SmmStrategyQuarterV298(weeklyMax),
  };
}

function g4SmmStrategyRangeV298(min, max) {
  return Number(min) === Number(max) ? String(min) : `${min}-${max}`;
}

function g4SmmStrategyTotalTextV298(strategy = g4SmmStrategyEnsureV298()) {
  const total = g4SmmStrategyTotalsV298(strategy);
  return `Итого: ${g4SmmStrategyRangeV298(total.weeklyMin, total.weeklyMax)} основных публикаций в неделю, ≈${g4SmmStrategyRangeV298(total.quarterMin, total.quarterMax)} за квартал`;
}

const G4_SMM_PERIOD_UNITS_V304 = Object.freeze([
  Object.freeze({ key: "week", label: "Недели", weeks: 1, forms: ["неделю", "недели", "недель"] }),
  Object.freeze({ key: "month", label: "Месяцы", weeks: 52 / 12, forms: ["месяц", "месяца", "месяцев"] }),
  Object.freeze({ key: "quarter", label: "Кварталы", weeks: 13, forms: ["квартал", "квартала", "кварталов"] }),
  Object.freeze({ key: "year", label: "Годы", weeks: 52, forms: ["год", "года", "лет"] }),
]);

function g4SmmPeriodUnitV304(unit) {
  return G4_SMM_PERIOD_UNITS_V304.find((item) => item.key === unit) ||
    G4_SMM_PERIOD_UNITS_V304[0];
}

function g4SmmPeriodPluralV304(value, forms) {
  const number = Math.abs(Math.round(Number(value) || 0));
  const mod100 = number % 100;
  const mod10 = number % 10;
  if (mod100 >= 11 && mod100 <= 14) return forms[2];
  if (mod10 === 1) return forms[0];
  if (mod10 >= 2 && mod10 <= 4) return forms[1];
  return forms[2];
}

function g4SmmPeriodProjectionV304(strategy = g4SmmStrategyEnsureV298()) {
  const count = Math.max(1, Math.round(Number(strategy?.planningPeriod?.count) || 1));
  const unit = g4SmmPeriodUnitV304(strategy?.planningPeriod?.unit);
  const weeks = count * unit.weeks;
  const volume = strategy?.volume || {};
  const project = (value) => Math.max(0, Math.round((Number(value) || 0) * weeks));
  const range = (min, max) => g4SmmStrategyRangeV298(project(min), project(max));
  const totals = g4SmmStrategyTotalsV298(strategy);
  const approximate = Number.isInteger(weeks) ? "" : "≈";
  return {
    count,
    unit,
    weeks,
    approximate,
    label: `${count} ${g4SmmPeriodPluralV304(count, unit.forms)}`,
    rows: [
      { label: "Короткие вертикальные видео", weekly: volume.shortVideos, projected: project(volume.shortVideos) },
      { label: "Карусели / полезные публикации", weekly: volume.carousels, projected: project(volume.carousels) },
      { label: "Кейсы / результаты", weekly: volume.cases, projected: project(volume.cases) },
      {
        label: "Stories · активные дни",
        weekly: g4SmmStrategyRangeV298(volume.storiesMin, volume.storiesMax),
        projected: range(volume.storiesMin, volume.storiesMax),
      },
    ],
    total: range(totals.weeklyMin, totals.weeklyMax),
  };
}

function g4SmmPeriodProjectionHtmlV304(strategy = g4SmmStrategyEnsureV298()) {
  const projection = g4SmmPeriodProjectionV304(strategy);
  return `<div class="g4-smm-table-wrap-v298">
    <table class="mini-table typed-table g4-smm-period-table-v304">
      <thead><tr><th>Тип контента</th><th>Норма в неделю</th><th>За ${escapeHtml(projection.label)}</th></tr></thead>
      <tbody>${projection.rows.map((row) => `<tr><td>${escapeHtml(row.label)}</td><td>${escapeHtml(row.weekly)}</td><td><strong>${projection.approximate}${escapeHtml(row.projected)}</strong></td></tr>`).join("")}</tbody>
    </table>
  </div>
  <p class="g4-smm-total-v298" data-g4-smm-total-v298>Итого за ${escapeHtml(projection.label)}: ${projection.approximate}${escapeHtml(projection.total)} основных публикаций</p>
  <p class="g1-task">Расчётный период: ${projection.weeks.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} нед. Результат округляется до целых единиц контента.</p>`;
}

function g4SmmRefreshPeriodProjectionV304() {
  const target = document.querySelector("[data-g4-smm-period-projection-v304]");
  if (!target) return;
  const selectedProduct = typeof g4ProductPickSelected === "function"
    ? g4ProductPickSelected(state)
    : null;
  const productId = selectedProduct && typeof g4ProductPickKey === "function"
    ? g4ProductPickKey(selectedProduct, state)
    : guruV185Text(selectedProduct?.id);
  target.innerHTML = g4SmmFormatsProjectionHtmlV305(
    g4SmmStrategyEnsureV298(),
    { productId, content: g4SmmContentEnsureV299() },
  );
}

function g4SmmStrategyThresholdLabelsV298(strategy = g4SmmStrategyEnsureV298()) {
  const thresholds = strategy?.thresholds || {};
  const weak = Math.max(0, Number(thresholds.weakMax) || 0);
  const normal = Math.max(weak, Number(thresholds.normalMax) || weak);
  const strong = Math.max(normal, Number(thresholds.strongMax) || normal);
  return {
    weak: `< ${weak}% медианы аккаунта`,
    normal: `${weak}-${normal}%`,
    strong: `${normal}-${strong}%`,
    veryStrong: `> ${strong}%`,
  };
}

/* v2.3.103 — порядок единой таблицы следует 5A по смыслу поля
   «Основная задача». Исходный массив и его стабильные id не меняются. */
const G4_SMM_FORMAT_STAGE_ORDER_V303 = Object.freeze([
  "aware",
  "appeal",
  "ask",
  "act",
  "advocate",
]);
const G4_SMM_FORMAT_STAGE_RULES_V303 = Object.freeze([
  Object.freeze({ stage: "advocate", pattern: /удерж|лояль|повтор|рекоменд|адвокат|отзыв|сообществ|контакт/ }),
  Object.freeze({ stage: "act", pattern: /конверс|продаж|покуп|заяв|лид|оплат|оформлен|целев.*действ/ }),
  Object.freeze({ stage: "aware", pattern: /охват|нов.*аудитор|узнаваем|привлеч|видимост|перв.*контакт|показ/ }),
  Object.freeze({ stage: "appeal", pattern: /объяснен|сохранен|интерес|вовлеч|перв.*впечат|ценност|выдел/ }),
  Object.freeze({ stage: "ask", pattern: /довер|результат|глуб|поиск|изуч|сравнен|вопрос|доказ|кейс|эксперт/ }),
]);

function g4SmmFormatStageV303(format) {
  const task = guruV185Text(format?.task).toLocaleLowerCase("ru-RU");
  if (!task) return "";
  return G4_SMM_FORMAT_STAGE_RULES_V303.find((rule) => rule.pattern.test(task))?.stage || "";
}

function g4SmmFormatsOrderedBy5AV303(formats) {
  return (Array.isArray(formats) ? formats : [])
    .map((format, sourceIndex) => ({ format, sourceIndex, stage: g4SmmFormatStageV303(format) }))
    .sort((left, right) => {
      const leftStage = G4_SMM_FORMAT_STAGE_ORDER_V303.indexOf(left.stage);
      const rightStage = G4_SMM_FORMAT_STAGE_ORDER_V303.indexOf(right.stage);
      const leftOrder = leftStage < 0 ? G4_SMM_FORMAT_STAGE_ORDER_V303.length : leftStage;
      const rightOrder = rightStage < 0 ? G4_SMM_FORMAT_STAGE_ORDER_V303.length : rightStage;
      return leftOrder - rightOrder || left.sourceIndex - right.sourceIndex;
    });
}

/* v2.3.105 — объём хранится по-прежнему в strategy.volume, но
   отображается в строке соответствующего формата по стабильному id. */
const G4_SMM_FORMAT_VOLUME_V305 = Object.freeze({
  "g4-smm-format-v298-1": Object.freeze({ minKey: "shortVideos", maxKey: "shortVideos", unit: "content" }),
  "g4-smm-format-v298-2": Object.freeze({ minKey: "cases", maxKey: "cases", unit: "content" }),
  "g4-smm-format-v298-3": Object.freeze({ minKey: "carousels", maxKey: "carousels", unit: "content" }),
  "g4-smm-format-v298-5": Object.freeze({ minKey: "storiesMin", maxKey: "storiesMax", unit: "days" }),
});

/* v2.3.108 — темы встроены в строки форматов. Связи используют
   стабильные id, а исходный справочник strategy.topics не меняется. */
const G4_SMM_FORMAT_TOPICS_V308 = Object.freeze({
  "g4-smm-format-v298-1": Object.freeze([
    "g4-smm-topic-v298-6",
    "g4-smm-topic-v298-3",
    "g4-smm-topic-v298-4",
    "g4-smm-topic-v298-5",
  ]),
  "g4-smm-format-v298-3": Object.freeze([
    "g4-smm-topic-v298-3",
    "g4-smm-topic-v298-1",
    "g4-smm-topic-v298-5",
  ]),
  "g4-smm-format-v298-2": Object.freeze([
    "g4-smm-topic-v298-5",
    "g4-smm-topic-v298-2",
  ]),
  "g4-smm-format-v298-4": Object.freeze([
    "g4-smm-topic-v298-1",
    "g4-smm-topic-v298-3",
    "g4-smm-topic-v298-5",
  ]),
  "g4-smm-format-v298-6": Object.freeze(["g4-smm-topic-v298-4"]),
  "g4-smm-format-v298-5": Object.freeze(["g4-smm-topic-v298-4"]),
});

function g4SmmFormatTopicsV308(format, strategy) {
  const topicIds = G4_SMM_FORMAT_TOPICS_V308[guruV185Text(format?.id)] || [];
  const topicsById = new Map((strategy?.topics || []).map((topic) => [guruV185Text(topic?.id), topic]));
  return topicIds.map((id) => topicsById.get(id)).filter(Boolean);
}

function g4SmmFormatVolumeV305(format, strategy, projection) {
  const binding = G4_SMM_FORMAT_VOLUME_V305[guruV185Text(format?.id)];
  if (!binding) {
    return {
      weekly: "",
      projected: "Не задан отдельно",
      note: "Формат сохранён; отдельной нормы в стратегии нет",
    };
  }
  const min = Math.max(0, Number(strategy?.volume?.[binding.minKey]) || 0);
  const max = Math.max(min, Number(strategy?.volume?.[binding.maxKey]) || min);
  const weekly = g4SmmStrategyRangeV298(min, max);
  const projected = g4SmmStrategyRangeV298(
    Math.round(min * projection.weeks),
    Math.round(max * projection.weeks),
  );
  const suffix = binding.unit === "days" ? " активных дней" : "";
  return {
    weekly: `${weekly}${suffix} в неделю`,
    projected: `${projection.approximate}${projected}${suffix} за ${projection.label}`,
    note: `Норма: ${weekly}${suffix} в неделю`,
  };
}

function g4SmmFormatsProjectionHtmlV305(
  strategy = g4SmmStrategyEnsureV298(),
  options = {},
) {
  const projection = g4SmmPeriodProjectionV304(strategy);
  const content = options?.content || (typeof g4SmmContentEnsureV299 === "function"
    ? g4SmmContentEnsureV299()
    : null);
  const productId = guruV185Text(options?.productId);
  const ideas = Array.isArray(content?.ideas) ? content.ideas : [];
  return `<div class="g4-smm-table-wrap-v298">
    <table class="mini-table typed-table g4-smm-table-v298">
      <thead><tr><th>Основная задача</th><th>Формат</th><th>Темы</th><th>Объём контента</th><th>Идеи</th><th>Площадки</th></tr></thead>
      <tbody>${g4SmmFormatsOrderedBy5AV303(strategy.formats).map(({ format: row, stage }) => {
        const volume = g4SmmFormatVolumeV305(row, strategy, projection);
        const topics = g4SmmFormatTopicsV308(row, strategy);
        const ideaCount = ideas.filter((idea) =>
          guruV185Text(idea?.primaryTaskFormatId) === guruV185Text(row.id) &&
          (!productId || guruV185Text(idea?.productId) === productId)
        ).length;
        const topicHtml = topics.map((topic) => `<span class="g4-smm-format-topic-row-v345" data-g4-smm-format-topic-v308="${escapeAttr(topic.id)}">
          <span class="g4-smm-format-topic-label-v345">${escapeHtml(topic.value)}</span>
          <button type="button" class="small-btn g4-smm-topic-idea-add-v345"
            data-g4-smm-topic-idea-add-v345
            data-g4-smm-format-id-v345="${escapeAttr(row.id)}"
            data-g4-smm-topic-id-v345="${escapeAttr(topic.id)}"
            data-g4-smm-product-id-v345="${escapeAttr(productId)}"
            ${productId ? "" : "disabled"}>+ Новая идея</button>
        </span>`).join("");
        return `<tr data-g4-smm-format-row-v298="${escapeAttr(row.id)}" data-g4-smm-format-stage-v303="${escapeAttr(stage)}">
          <td>${escapeHtml(row.task) || "—"}</td>
          <td>${escapeHtml(row.format) || "—"}</td>
          <td><span class="g4-smm-format-topics-v308">${topicHtml || "—"}</span></td>
          <td data-g4-smm-format-volume-v305="${escapeAttr(row.id)}"><span class="g4-smm-format-volume-v305"><b>${escapeHtml(volume.projected)}</b><small>${escapeHtml(volume.note)}</small></span></td>
          <td><span class="g4-smm-format-idea-count-v345" data-g4-smm-format-idea-count-v345="${escapeAttr(row.id)}">${ideaCount}</span></td>
          <td>${escapeHtml(row.platforms) || "—"}</td>
        </tr>`;
      }).join("")}</tbody>
    </table>
  </div>
  <p class="g4-smm-total-v298" data-g4-smm-total-v298>Итого за ${escapeHtml(projection.label)}: ${projection.approximate}${escapeHtml(projection.total)} основных публикаций</p>
  <p class="g1-task">Расчётный период: ${projection.weeks.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} нед. Результат округляется до целых единиц контента.</p>`;
}

function g4SmmStrategyHtmlV298(activeProduct = null) {
  const strategy = g4SmmStrategyEnsureV298();
  if (!strategy) return "";
  const collapseKey = "g4-smm-strategy-company-v298";
  const collapsed = g1CollapsedSet().has(collapseKey);
  const activeProductId = guruV185Text(activeProduct?.id);
  const content = g4SmmContentEnsureV299();
  const periodWeekLabel = content ? g4SmmCalendarWeekLabelV322(content) : "";
  return `<section class="g1-card g1-card-collapsible g4-smm-strategy-v298${collapsed ? " is-collapsed" : ""}" data-g4-smm-strategy-v298 data-g4-smm-scope-v298="company-project" data-g4-smm-readonly-v300="true">
    <div class="g1-card-header-static g1-card-collapse-header" data-g1-collapse data-g1-collapse-key="${collapseKey}">
      <span class="g1-section-left"><span class="g4-smm-idea-title-line-v343"><span class="g1-card-title">SMM-стратегия</span><span class="g4-smm-idea-collapse-mark-v343" aria-hidden="true"></span></span><span class="g1-section-progress">Компания · зафиксированный справочник</span></span>
    </div>
    <div class="g1-card-body g1-card-collapse-body">
      <section class="g4-smm-section-v298" data-g4-smm-part-v298="formats">
        <h4>Форматы, темы, объём контента и площадки</h4>
        <div class="g4-smm-period-bar-v345">
          <div><strong>Период планирования</strong><small>${escapeHtml(periodWeekLabel)}</small></div>
          <div class="g4-smm-period-controls-v304">
            <label class="g1-field"><span>Количество</span><input class="g1-input is-filled" type="number" min="1" max="999" step="1" value="${escapeAttr(strategy.planningPeriod.count)}" data-g4-smm-period-count-v304 /></label>
            <label class="g1-field"><span>Единица периода</span><select class="g1-input is-filled" data-g4-smm-period-unit-v304>${G4_SMM_PERIOD_UNITS_V304.map((item) => `<option value="${escapeAttr(item.key)}" ${item.key === strategy.planningPeriod.unit ? "selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}</select></label>
          </div>
        </div>
        <div class="g4-smm-period-projection-v304" data-g4-smm-period-projection-v304>${g4SmmFormatsProjectionHtmlV305(strategy, { productId: activeProductId, content })}</div>
      </section>

      <section class="g4-smm-section-v298" data-g4-smm-part-v298="principle">
        <h4>Правило учёта</h4>
        <p class="g4-smm-principle-v298">${escapeHtml(G4_SMM_PRINCIPLE_V298)}</p>
      </section>

      ${g4SmmContentSystemHtmlV299(activeProduct)}
    </div>
  </section>`;
}

const __g4SmmPrevMigrateWorkspaceV298 = migrateWorkspace;
migrateWorkspace = function (workspace, projectId) {
  const migrated = __g4SmmPrevMigrateWorkspaceV298(workspace, projectId);
  g4SmmStrategyEnsureV298(migrated);
  return migrated;
};

const __g4SmmPrevFreshWorkspaceV298 = createFreshWorkspace;
createFreshWorkspace = function (meta) {
  const workspace = __g4SmmPrevFreshWorkspaceV298(meta);
  g4SmmStrategyEnsureV298(workspace);
  return workspace;
};

/* ================================================================
   v2.3.99 — SMM-контент-система Gate 4.

   Все записи этого модуля находятся только в gate4SmmContentV299.
   Источники Gate 0–3 ниже читаются напрямую и никогда не ensure/migrate:
   просмотр карточки идеи не должен нормализовать или дополнять чужой Gate.
   ================================================================ */

const G4_SMM_CONTENT_VERSION_V299 = "gate4-smm-content-v299";
const G4_SMM_TITLE_DECOUPLING_MIGRATION_V331 = "gate4-smm-title-decoupling-v331";
const G4_SMM_LACONIC_TITLE_CLEANUP_MIGRATION_V334 = "gate4-smm-laconic-title-cleanup-v334";
const G4_SMM_IDEA_STAGES_V299 = Object.freeze([
  Object.freeze({ key: "collection", label: "1. Сбор материала" }),
  Object.freeze({ key: "digestion", label: "2. Переваривание" }),
  Object.freeze({ key: "incubation", label: "3. Инкубация" }),
  Object.freeze({ key: "insight", label: "4. Озарение" }),
  Object.freeze({ key: "verification", label: "5. Проверка и доработка" }),
]);
const G4_SMM_IDEA_STAGE_EXPLANATIONS_V311 = Object.freeze({
  collection: "Прежде чем родится идея, мозгу нужно сырьё — конкретное (всё о продукте, задаче, аудитории) и общее (широкий кругозор, чужие примеры, далёкие темы). Чем больше материала собрано, тем выше шанс, что два случайных факта соединятся во что-то новое. Задача этапа — набрать достаточно, не экономить на этом шаге.",
  digestion: "Собранные факты нужно мысленно покрутить — сопоставить, поискать связи между тем, что на первый взгляд не связано. Это неторопливая, внутренняя работа, её нельзя ускорить усилием воли. Задача этапа — не искать готовый ответ, а дать фактам столкнуться друг с другом в голове.",
  incubation: "Когда сознательные усилия исчерпаны, нужно отложить задачу совсем — переключиться на что-то другое, что увлекает. В это время подсознание продолжает работать без твоего участия. Задача этапа — перестать напрягаться специально, а не додумывать через силу.",
  insight: "Идея приходит сама, часто неожиданно и не в момент работы над задачей — в душе, на прогулке, во сне. Это не мистика, а закономерный итог первых трёх этапов. Задача этапа — просто заметить идею и сразу записать, пока она не забылась.",
  verification: "Сырая идея почти всегда нуждается в доработке под реальные условия — бюджет, площадку, аудиторию. Здесь же идею проверяют на других людях и честной обратной связи. Задача этапа — довести идею до практической, рабочей формы, а не оставить красивой мыслью.",
});
const G4_SMM_PUBLICATION_STATUSES_V299 = Object.freeze([
  Object.freeze(["not_started", "Не начато"]),
  Object.freeze(["in_progress", "В работе"]),
  Object.freeze(["ready", "Готово"]),
  Object.freeze(["published", "Опубликовано"]),
  Object.freeze(["cancelled", "Отменено"]),
]);
const G4_SMM_STORYBOARD_PHASES_V344 = Object.freeze([
  Object.freeze({
    key: "hook",
    field: "hook",
    label: "Хук",
    shortTime: "0–2 сек",
    longTime: "Старт",
    purpose: "Остановить просмотр.",
    reason: "Зритель решает сразу.",
    action: "Результат, проблема, вопрос или яркая деталь.",
  }),
  Object.freeze({
    key: "promise",
    field: "promise",
    label: "Обещание",
    shortTime: "2–5 сек",
    longTime: "После хука",
    purpose: "Дать причину смотреть дальше.",
    reason: "Зрителю нужна ясность.",
    action: "Что зритель узнает или увидит.",
  }),
  Object.freeze({
    key: "reveal",
    field: "storyboard",
    label: "Раскрытие",
    shortTime: "5–30 сек",
    longTime: "Основная часть",
    purpose: "Показать смысл.",
    reason: "Интерес держит новая информация.",
    action: "Процесс, этапы, сравнение или аргументы.",
  }),
  Object.freeze({
    key: "proof",
    field: "proof",
    label: "Доказательство",
    shortTime: "30–40 сек",
    longTime: "Перед финалом",
    purpose: "Вызвать доверие.",
    reason: "Словам нужен факт.",
    action: "Итог, до/после, цифра или отзыв.",
  }),
  Object.freeze({
    key: "cta",
    field: "cta",
    label: "CTA",
    shortTime: "Последние 2–4 сек",
    longTime: "Финал",
    purpose: "Направить действие.",
    reason: "Один призыв не рассеивает внимание.",
    action: "Сохранить, написать, перейти или подписаться.",
  }),
]);
const G4_SMM_PUBLICATION_PACKAGE_FIELDS_V344 = Object.freeze([
  Object.freeze({ key: "caption", label: "Подпись", norm: "150–350 знаков", task: "Контекст, ключевая фраза, один CTA", type: "textarea", rows: 5 }),
  Object.freeze({ key: "firstLine", label: "Первая строка", norm: "До 100 знаков", task: "Дополняет хук, видна без раскрытия текста", type: "textarea", rows: 2 }),
  Object.freeze({ key: "hashtags", label: "Хэштеги", norm: "0–3", task: "Уточняют тему, не создают охват сами", type: "input", placeholder: "#ручнаяработа #подарок" }),
  Object.freeze({ key: "cover", label: "Обложка", norm: "3–6 слов", task: "Помогает выбрать ролик в профиле", type: "input", placeholder: "Как рождается символ года" }),
  Object.freeze({ key: "shortsTitle", label: "Shorts-заголовок", norm: "40–70 знаков", task: "Поисковый смысл, без кликбейта", type: "input", placeholder: "Как сшить авторский подарок к Новому году" }),
]);
// Режимы редактирования — только состояние текущего интерфейса. После
// перезагрузки сохранённые идеи и публикации снова открываются read-only.
const g4SmmIdeaEditingIdsV330 = new Set();
const g4SmmPublicationEditingIdsV328 = new Set();
const G4_SMM_RESULT_METRICS_V299 = Object.freeze([
  Object.freeze(["views", "Охват / просмотры"]),
  Object.freeze(["reactions", "Реакции"]),
  Object.freeze(["saves", "Сохранения"]),
  Object.freeze(["forwards", "Пересылки"]),
  Object.freeze(["subscriptions", "Подписки"]),
  Object.freeze(["applications", "Заявки"]),
]);

function g4SmmContentEnsureV299(workspace = state) {
  if (!workspace || typeof workspace !== "object") return null;
  const current = workspace.gate4SmmContentV299;
  const content = current && typeof current === "object" && !Array.isArray(current)
    ? current
    : {};
  content.version = G4_SMM_CONTENT_VERSION_V299;
  content.ideas = Array.isArray(content.ideas) ? content.ideas : [];
  content.publications = Array.isArray(content.publications)
    ? content.publications
    : [];
  content.ideas = content.ideas.map((idea, index) => ({
    id: guruV185Text(idea?.id) || `g4-smm-idea-v299-${index + 1}`,
    name: String(idea?.name || ""),
    productId: guruV185Text(idea?.productId),
    stage: G4_SMM_IDEA_STAGES_V299.some((item) => item.key === idea?.stage)
      ? idea.stage
      : "collection",
    digestionNotes: String(idea?.digestionNotes || ""),
    primaryTaskFormatId: guruV185Text(idea?.primaryTaskFormatId),
    topicId: guruV185Text(idea?.topicId),
    insight: String(idea?.insight || ""),
    planningPeriodStart: g4SmmDateValueV299(idea?.planningPeriodStart)
      ? guruV185Text(idea.planningPeriodStart)
      : "",
    scheduledDate: g4SmmDateValueV299(idea?.scheduledDate)
      ? guruV185Text(idea.scheduledDate)
      : "",
    publicationId: guruV185Text(idea?.publicationId),
    createdAt: guruV185Text(idea?.createdAt) || new Date().toISOString(),
    updatedAt: guruV185Text(idea?.updatedAt) || guruV185Text(idea?.createdAt) || new Date().toISOString(),
  }));
  const migrations = Array.isArray(content.migrations)
    ? g3ProductJourneyUnique(content.migrations)
    : [];
  const decoupleLegacyIdeaTitles = !migrations.includes(G4_SMM_TITLE_DECOUPLING_MIGRATION_V331);
  const cleanupGeneratedPublicationTitles = !migrations.includes(G4_SMM_LACONIC_TITLE_CLEANUP_MIGRATION_V334);
  content.calendarWeekStart = g4SmmWeekStartIsoV322(content.calendarWeekStart);
  content.publications = content.publications.map((publication, index) => {
    const status = G4_SMM_PUBLICATION_STATUSES_V299.some(
      ([key]) => key === publication?.status,
    ) ? publication.status : "not_started";
    const results = publication?.results && typeof publication.results === "object"
      ? publication.results
      : {};
    const storedTitle = String(publication?.title || "");
    const sourceIdea = content.ideas.find((idea) => idea.id === guruV185Text(publication?.sourceIdeaId));
    let title = decoupleLegacyIdeaTitles && sourceIdea &&
      guruV185Text(storedTitle) === guruV185Text(sourceIdea.insight)
      ? ""
      : storedTitle;
    if (cleanupGeneratedPublicationTitles) {
      const normalizedTitle = guruV185Text(title);
      const generatedPrefix = [publication?.formatLabel, publication?.topicLabel]
        .map((value) => guruV185Text(value))
        .filter(Boolean)
        .join("+");
      const copiedIdeaName = sourceIdea && normalizedTitle === guruV185Text(sourceIdea.name);
      const generatedFormatTopicName = generatedPrefix &&
        (normalizedTitle === generatedPrefix || normalizedTitle.startsWith(`${generatedPrefix}+`));
      if (copiedIdeaName || generatedFormatTopicName) title = "";
    }
    return {
      id: guruV185Text(publication?.id) || `g4-smm-publication-v299-${index + 1}`,
      sourceIdeaId: guruV185Text(publication?.sourceIdeaId),
      productId: guruV185Text(publication?.productId),
      topicId: guruV185Text(publication?.topicId),
      topicLabel: guruV185Text(publication?.topicLabel),
      formatId: guruV185Text(publication?.formatId),
      formatLabel: guruV185Text(publication?.formatLabel),
      platforms: Array.isArray(publication?.platforms)
        ? g3ProductJourneyUnique(publication.platforms)
        : [],
      date: guruV185Text(publication?.date),
      link: String(publication?.link || ""),
      status,
      title,
      description: String(publication?.description || ""),
      creativeBrief: {
        hook: String(publication?.creativeBrief?.hook || ""),
        promise: String(publication?.creativeBrief?.promise || ""),
        storyboard: String(publication?.creativeBrief?.storyboard || ""),
        proof: String(publication?.creativeBrief?.proof || ""),
        cta: String(publication?.creativeBrief?.cta || ""),
        durationSeconds:
          publication?.creativeBrief?.durationSeconds === 0 ||
          guruV185Text(publication?.creativeBrief?.durationSeconds)
            ? String(publication.creativeBrief.durationSeconds)
            : "",
        checks: Object.fromEntries(G4_SMM_STORYBOARD_PHASES_V344.map((phase) => [
          phase.key,
          Boolean(publication?.creativeBrief?.checks?.[phase.key]),
        ])),
      },
      publicationPackage: Object.fromEntries(G4_SMM_PUBLICATION_PACKAGE_FIELDS_V344.map((field) => [
        field.key,
        String(publication?.publicationPackage?.[field.key] || ""),
      ])),
      content: String(publication?.content || ""),
      results: Object.fromEntries(
        G4_SMM_RESULT_METRICS_V299.map(([key]) => [
          key,
          results[key] === 0 || guruV185Text(results[key]) ? String(results[key]) : "",
        ]),
      ),
      sourceContext: publication?.sourceContext && typeof publication.sourceContext === "object"
        ? publication.sourceContext
        : null,
      createdAt: guruV185Text(publication?.createdAt) || new Date().toISOString(),
      updatedAt: guruV185Text(publication?.updatedAt) || guruV185Text(publication?.createdAt) || new Date().toISOString(),
    };
  });
  if (decoupleLegacyIdeaTitles) migrations.push(G4_SMM_TITLE_DECOUPLING_MIGRATION_V331);
  if (cleanupGeneratedPublicationTitles) migrations.push(G4_SMM_LACONIC_TITLE_CLEANUP_MIGRATION_V334);
  content.migrations = migrations;
  content.audit = content.audit && typeof content.audit === "object"
    ? content.audit
    : {
      id: G4_SMM_CONTENT_VERSION_V299,
      storage: "Gate 4 only · workspace.gate4SmmContentV299",
      upstreamMode: "live_read_only",
      createdAt: new Date().toISOString(),
    };
  workspace.gate4SmmContentV299 = content;
  return content;
}

const __g4SmmContentPrevMigrateWorkspaceV299 = migrateWorkspace;
migrateWorkspace = function (workspace, projectId) {
  const migrated = __g4SmmContentPrevMigrateWorkspaceV299(workspace, projectId);
  g4SmmContentEnsureV299(migrated);
  return migrated;
};

const __g4SmmContentPrevFreshWorkspaceV299 = createFreshWorkspace;
createFreshWorkspace = function (meta) {
  const workspace = __g4SmmContentPrevFreshWorkspaceV299(meta);
  g4SmmContentEnsureV299(workspace);
  return workspace;
};

function g4SmmContentTouchV299(record = null) {
  const content = state?.gate4SmmContentV299 || g4SmmContentEnsureV299();
  if (!content) return;
  const now = new Date().toISOString();
  if (record) record.updatedAt = now;
  content.updatedAt = now;
  flashSaving();
}

/* Direct read of already prepared Gate 0 scoped values. Unlike
   guruV194Resolve this function never creates the backing array. */
function g4SmmScopedRecordsReadOnlyV299(product, field, workspace = state) {
  const rows = Array.isArray(workspace?.project?.gate0ScopedValuesV194)
    ? workspace.project.gate0ScopedValuesV194
    : [];
  const categoryId = product ? megaPlatformProductCategoryId(product, workspace) : "";
  const exact = (scope) => rows.filter((record) => {
    if (record?.field !== field || record?.scope !== scope) return false;
    if (scope === "project") return true;
    if (scope === "category")
      return Boolean(categoryId) && record.category_id === categoryId;
    return Boolean(product?.id) && record.product_id === product.id;
  });
  const productRows = exact("product");
  if (productRows.length) return { scope: "product", records: productRows };
  const categoryRows = exact("category");
  if (categoryRows.length) return { scope: "category", records: categoryRows };
  return { scope: "project", records: exact("project") };
}

function g4SmmScopedValueReadOnlyV299(product, field, workspace = state) {
  const resolved = g4SmmScopedRecordsReadOnlyV299(product, field, workspace);
  const values = resolved.records.map((record) => {
    if (field === "jtbd") {
      const structured = guruV194JtbdSentence(guruV194JtbdParts(record));
      return structured || guruV185Text(record?.value);
    }
    return guruV185Text(record?.value);
  });
  return {
    scope: resolved.scope,
    value: g3ProductJourneyUnique(values).join("\n"),
  };
}

function g4SmmProductPageReadOnlyV299(product, workspace = state) {
  const cards = (workspace?.gates || []).flatMap((gate) => gate?.cards || []);
  const source = product?.source || {};
  const findInCard = (card) => {
    if (!card) return null;
    const rows = Array.isArray(card.pageRows) ? card.pageRows : [];
    if (source.rowId) {
      const byId = rows.find((row) => guruV185Text(row?.id) === guruV185Text(source.rowId));
      if (byId) return byId;
    }
    if (Number.isInteger(Number(source.rowIndex)) && rows[Number(source.rowIndex)])
      return rows[Number(source.rowIndex)];
    return rows.find((row) => guruV185Text(row?.catalogItemIdV189) === product?.id) || null;
  };
  const sourceCard = source.cardId
    ? cards.find((card) => card?.id === source.cardId)
    : null;
  const direct = findInCard(sourceCard);
  if (direct) return { card: sourceCard, row: direct };
  for (const card of cards) {
    const row = (card?.pageRows || []).find(
      (candidate) => guruV185Text(candidate?.catalogItemIdV189) === product?.id,
    );
    if (row) return { card, row };
  }
  return { card: null, row: null };
}

function g4SmmFinalKeywordsReadOnlyV299(product, workspace = state) {
  const maps = Array.isArray(workspace?.painV130?.productMaps)
    ? workspace.painV130.productMaps
    : [];
  let itemData = null;
  for (const map of maps) {
    if (map?.items && Object.prototype.hasOwnProperty.call(map.items, product?.id)) {
      itemData = map.items[product.id];
      break;
    }
  }
  if (!itemData) return [];
  const values = new Map();
  (Array.isArray(itemData.demandRows) ? itemData.demandRows : []).forEach((row) => {
    if (!guruV185Text(row?.finalFoundationImportedAtV259)) return;
    const value = guruV185Text(row?.kw);
    const key = guruV247KeywordNormalize(value);
    if (key && !values.has(key)) values.set(key, value);
  });
  return [...values.values()];
}

function g4SmmProductsReadOnlyV299(workspace = state) {
  const rows = Array.isArray(workspace?.project?.catalogItemsV189)
    ? workspace.project.catalogItemsV189
    : [];
  return rows.filter((product) => guruV185Text(product?.id) && guruV185Text(product?.name));
}

function g4SmmProductReadOnlyV299(productId, workspace = state) {
  const id = guruV185Text(productId);
  return g4SmmProductsReadOnlyV299(workspace).find((product) => product.id === id) || null;
}

function g4SmmIdeaMaterialV299(idea, workspace = state) {
  const strategy = g4SmmStrategyEnsureV298(workspace);
  const product = g4SmmProductReadOnlyV299(idea?.productId, workspace);
  const general = {
    formats: (strategy?.formats || []).map((row) => ({
      id: row.id,
      format: row.format,
      task: row.task,
      platforms: row.platforms,
    })),
    topics: (strategy?.topics || []).map((row) => ({ id: row.id, value: row.value })),
  };
  if (!product) return { product: null, concrete: [], keywords: [], general };
  const jtbd = g4SmmScopedValueReadOnlyV299(product, "jtbd", workspace);
  const segment = g4SmmScopedValueReadOnlyV299(product, "segments", workspace);
  const positioning = g4SmmScopedValueReadOnlyV299(product, "positioning", workspace);
  const usp = g4SmmScopedValueReadOnlyV299(product, "usp", workspace);
  const offer = g4SmmScopedValueReadOnlyV299(product, "offers", workspace);
  const page = g4SmmProductPageReadOnlyV299(product, workspace);
  const creation = guruV185Text(page.row?.contextFields?.productCreationV253);
  const keywords = g4SmmFinalKeywordsReadOnlyV299(product, workspace);
  const row = (key, label, source, resolved) => ({
    key,
    label,
    source,
    value: guruV185Text(resolved?.value ?? resolved),
    scope: guruV185Text(resolved?.scope),
  });
  return {
    product: { id: product.id, name: product.name },
    concrete: [
      row("jtbd", "JTBD", "Gate 0", jtbd),
      row("segment", "Сегмент", "Gate 0", segment),
      row("positioning", "Позиционирование", "Gate 0", positioning),
      row("usp", "УТП", "Gate 0", usp),
      row("offer", "Оффер", "Gate 0–1", offer),
      row("creation", "Как создаётся", "Gate 1 · Карточка товара", creation),
    ],
    keywords,
    general,
  };
}

function g4SmmCaptureIdeaContextV299(idea, workspace = state) {
  const material = g4SmmIdeaMaterialV299(idea, workspace);
  return {
    capturedAt: new Date().toISOString(),
    product: material.product ? { ...material.product } : null,
    concrete: material.concrete.map((row) => ({ ...row })),
    keywords: material.keywords.slice(),
    formats: material.general.formats.map((row) => ({ ...row })),
    topics: material.general.topics.map((row) => ({ ...row })),
  };
}

function g4SmmDateValueV299(value) {
  const text = guruV185Text(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(`${text}T12:00:00`);
  return Number.isFinite(date.getTime()) ? date : null;
}

function g4SmmTodayV299(now = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const G4_SMM_WEEKDAYS_V322 = Object.freeze([
  Object.freeze(["Понедельник", "Пн"]),
  Object.freeze(["Вторник", "Вт"]),
  Object.freeze(["Среда", "Ср"]),
  Object.freeze(["Четверг", "Чт"]),
  Object.freeze(["Пятница", "Пт"]),
  Object.freeze(["Суббота", "Сб"]),
  Object.freeze(["Воскресенье", "Вс"]),
]);

function g4SmmIsoDateV322(date) {
  return g4SmmTodayV299(date);
}

function g4SmmWeekStartIsoV322(value = "", now = new Date()) {
  const parsed = g4SmmDateValueV299(value);
  return g4SmmIsoDateV322(g4SmmStartOfWeekV299(parsed || now));
}

function g4SmmCalendarWeekStartV322(content = g4SmmContentEnsureV299(), now = new Date()) {
  return g4SmmStartOfWeekV299(g4SmmDateValueV299(content?.calendarWeekStart) || now);
}

function g4SmmCalendarDaysV322(content = g4SmmContentEnsureV299(), now = new Date()) {
  const start = g4SmmCalendarWeekStartV322(content, now);
  return G4_SMM_WEEKDAYS_V322.map(([label, short], index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return { label, short, date, value: g4SmmIsoDateV322(date) };
  });
}

function g4SmmCalendarWeekLabelV322(content = g4SmmContentEnsureV299(), now = new Date()) {
  const days = g4SmmCalendarDaysV322(content, now);
  const first = days[0]?.date;
  const last = days[6]?.date;
  if (!first || !last) return "";
  const month = (date) => new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" })
    .format(date).replace(/^\d+\s*/, "");
  if (first.getFullYear() !== last.getFullYear())
    return `${first.getDate()} ${month(first)} ${first.getFullYear()} – ${last.getDate()} ${month(last)} ${last.getFullYear()}`;
  const year = last.getFullYear();
  return first.getMonth() === last.getMonth()
    ? `${first.getDate()}–${last.getDate()} ${month(last)} ${year}`
    : `${first.getDate()} ${month(first)} – ${last.getDate()} ${month(last)} ${year}`;
}

function g4SmmIdeaCountLabelV322(count) {
  const value = Math.max(0, Number(count) || 0);
  const mod100 = value % 100;
  const mod10 = value % 10;
  const noun = mod100 >= 11 && mod100 <= 14
    ? "идей"
    : mod10 === 1
      ? "идея"
      : mod10 >= 2 && mod10 <= 4
        ? "идеи"
        : "идей";
  return `${value} ${noun}`;
}

function g4SmmStartOfWeekV299(now = new Date()) {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const shift = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - shift);
  return date;
}

function g4SmmStartOfQuarterV299(now = new Date()) {
  return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
}

function g4SmmPublicationIsRecentV299(publication, since, until = new Date()) {
  const date = g4SmmDateValueV299(publication?.date);
  const inclusiveUntil = new Date(until);
  inclusiveUntil.setHours(23, 59, 59, 999);
  return Boolean(date && date >= since && date <= inclusiveUntil);
}

function g4SmmPublicationFormatV299(publication, strategy = g4SmmStrategyEnsureV298()) {
  return (strategy?.formats || []).find((row) => row.id === publication?.formatId) || null;
}

function g4SmmPublicationTopicV299(publication, strategy = g4SmmStrategyEnsureV298()) {
  return (strategy?.topics || []).find((row) => row.id === publication?.topicId) || null;
}

function g4SmmPublicationFormatLabelV299(publication, strategy = g4SmmStrategyEnsureV298()) {
  return guruV185Text(g4SmmPublicationFormatV299(publication, strategy)?.format) ||
    guruV185Text(publication?.formatLabel);
}

function g4SmmPublicationCardTitleV331(
  publication,
  index,
) {
  return guruV185Text(publication?.title) || `Публикация №${index + 1}`;
}

function g4SmmPublicationTopicLabelV299(publication, strategy = g4SmmStrategyEnsureV298()) {
  return guruV185Text(g4SmmPublicationTopicV299(publication, strategy)?.value) ||
    guruV185Text(publication?.topicLabel);
}

function g4SmmFormatPlatformsV299(format) {
  return g3ProductJourneyUnique(
    guruV185Text(format?.platforms).split(",").map((value) => value.trim()),
  );
}

function g4SmmPublicationKindV299(publication, strategy = g4SmmStrategyEnsureV298()) {
  const value = g4SmmPublicationFormatLabelV299(publication, strategy).toLocaleLowerCase("ru-RU");
  if (/коротк.*вертик|reels|short/.test(value)) return "videos";
  if (/карусел|подборк|полезн.*публик/.test(value)) return "carousels";
  if (/кейс|результат|до\s*\/\s*после/.test(value)) return "cases";
  return "other";
}

function g4SmmIdeaKindV322(idea, strategy = g4SmmStrategyEnsureV298()) {
  const format = (strategy?.formats || []).find((row) =>
    guruV185Text(row?.id) === guruV185Text(idea?.primaryTaskFormatId),
  );
  return format
    ? g4SmmPublicationKindV299({ formatId: format.id, formatLabel: format.format }, strategy)
    : "other";
}

function g4SmmPublishedV299(content = g4SmmContentEnsureV299()) {
  return (content?.publications || []).filter((publication) => publication.status === "published");
}

function g4SmmComparableHistoryV299(publication, content, now = new Date()) {
  const cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const formatId = guruV185Text(publication?.formatId);
  const formatLabel = g4SmmPublicationFormatLabelV299(publication).toLocaleLowerCase("ru-RU");
  if (!formatId && !formatLabel) return [];
  return g4SmmPublishedV299(content).filter((candidate) => {
    if (candidate.id === publication.id || !g4SmmPublicationIsRecentV299(candidate, cutoff, now))
      return false;
    if (formatId && candidate.formatId) return candidate.formatId === formatId;
    return g4SmmPublicationFormatLabelV299(candidate).toLocaleLowerCase("ru-RU") === formatLabel;
  });
}

function g4SmmMetricNumberV299(value) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function g4SmmMetricVerdictV299(publication, metricKey, content = g4SmmContentEnsureV299()) {
  const value = g4SmmMetricNumberV299(publication?.results?.[metricKey]);
  if (value === null) return { status: "empty", label: "Факт не указан" };
  const history = g4SmmComparableHistoryV299(publication, content);
  if (history.length < 3)
    return { status: "insufficient", label: "Недостаточно данных для сравнения", historyCount: history.length };
  const values = history
    .map((candidate) => g4SmmMetricNumberV299(candidate?.results?.[metricKey]))
    .filter((number) => number !== null);
  if (values.length < 3)
    return { status: "insufficient", label: "Недостаточно данных для сравнения", historyCount: values.length };
  const average = values.reduce((sum, number) => sum + number, 0) / values.length;
  if (!(average > 0))
    return { status: "insufficient", label: "Недостаточно данных для сравнения", historyCount: values.length };
  const ratio = (value / average) * 100;
  const thresholds = g4SmmStrategyEnsureV298()?.thresholds || {};
  const weak = Math.max(0, Number(thresholds.weakMax) || 70);
  const normal = Math.max(weak, Number(thresholds.normalMax) || 130);
  const strong = Math.max(normal, Number(thresholds.strongMax) || 200);
  const verdict = ratio < weak
    ? ["weak", "Слабый"]
    : ratio < normal
      ? ["normal", "Нормальный"]
      : ratio <= strong
        ? ["strong", "Сильный"]
        : ["very_strong", "Очень сильный"];
  return {
    status: verdict[0],
    label: verdict[1],
    ratio,
    average,
    historyCount: values.length,
  };
}

function g4SmmContentSummaryV299(
  content = g4SmmContentEnsureV299(),
  strategy = g4SmmStrategyEnsureV298(),
  now = new Date(),
) {
  const published = g4SmmPublishedV299(content);
  const weekStart = g4SmmCalendarWeekStartV322(content, now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const quarterStart = g4SmmStartOfQuarterV299(now);
  const last90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const last21 = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);
  const week = published.filter((publication) =>
    g4SmmPublicationIsRecentV299(publication, weekStart, weekEnd),
  );
  const quarter = published.filter((publication) =>
    g4SmmPublicationIsRecentV299(publication, quarterStart, now),
  );
  const targets = {
    videos: Math.max(0, Number(strategy?.volume?.shortVideos) || 0),
    carousels: Math.max(0, Number(strategy?.volume?.carousels) || 0),
    cases: Math.max(0, Number(strategy?.volume?.cases) || 0),
  };
  const counts = Object.fromEntries(
    Object.keys(targets).map((key) => [
      key,
      week.filter((publication) => g4SmmPublicationKindV299(publication, strategy) === key).length,
    ]),
  );
  const formulatedIdeas = (content?.ideas || []).filter((idea) => guruV185Text(idea?.insight));
  const scheduledIdeas = formulatedIdeas.filter((idea) => {
    const date = g4SmmDateValueV299(idea?.scheduledDate);
    return Boolean(date && date >= weekStart && date <= weekEnd);
  });
  const plannedCounts = Object.fromEntries(
    Object.keys(targets).map((key) => [
      key,
      scheduledIdeas.filter((idea) => g4SmmIdeaKindV322(idea, strategy) === key).length,
    ]),
  );
  const scheduledDays = new Set(scheduledIdeas.map((idea) => idea.scheduledDate)).size;
  const unscheduled = formulatedIdeas.filter((idea) => !g4SmmDateValueV299(idea?.scheduledDate));
  const unclassified = scheduledIdeas.filter((idea) =>
    !Object.prototype.hasOwnProperty.call(targets, g4SmmIdeaKindV322(idea, strategy)),
  );
  const recent90 = published.filter((publication) =>
    g4SmmPublicationIsRecentV299(publication, last90, now),
  );
  const unusedPairs = [];
  (strategy?.formats || []).forEach((format) => {
    g4SmmFormatPlatformsV299(format).forEach((platform) => {
      const used = recent90.some((publication) => {
        const sameFormat = publication.formatId
          ? publication.formatId === format.id
          : g4SmmPublicationFormatLabelV299(publication, strategy).toLocaleLowerCase("ru-RU") ===
            guruV185Text(format.format).toLocaleLowerCase("ru-RU");
        return sameFormat && (publication.platforms || []).some(
          (value) => guruV185Text(value).toLocaleLowerCase("ru-RU") === platform.toLocaleLowerCase("ru-RU"),
        );
      });
      if (!used) unusedPairs.push({ formatId: format.id, format: format.format, platform });
    });
  });
  const recent21 = published.filter((publication) =>
    g4SmmPublicationIsRecentV299(publication, last21, now),
  );
  const staleTopics = (strategy?.topics || []).filter((topic) =>
    !recent21.some((publication) => publication.topicId
      ? publication.topicId === topic.id
      : g4SmmPublicationTopicLabelV299(publication, strategy).toLocaleLowerCase("ru-RU") ===
        guruV185Text(topic.value).toLocaleLowerCase("ru-RU")),
  );
  const quarterTotals = g4SmmStrategyTotalsV298(strategy);
  return {
    week: { counts, targets },
    plan: {
      counts: plannedCounts,
      total: scheduledIdeas.length,
      days: scheduledDays,
      unscheduled: unscheduled.length,
      unclassified: unclassified.length,
      weekLabel: g4SmmCalendarWeekLabelV322(content, now),
    },
    quarter: {
      published: quarter.filter((publication) =>
        ["videos", "carousels", "cases"].includes(g4SmmPublicationKindV299(publication, strategy)),
      ).length,
      targetMin: quarterTotals.quarterMin,
      targetMax: quarterTotals.quarterMax,
    },
    unusedPairs,
    staleTopics,
  };
}

function g4SmmGateStructureAuditV299(workspace = state) {
  return Object.fromEntries(["gate-0", "gate-1", "gate-2", "gate-3"].map((gateId) => {
    const gate = (workspace?.gates || []).find((item) => item?.id === gateId);
    const cards = Array.isArray(gate?.cards) ? gate.cards : [];
    return [gateId, {
      cards: cards.length,
      instructionRows: cards.reduce((sum, card) => sum + (Array.isArray(card?.instructionRows) ? card.instructionRows.length : 0), 0),
      pageRows: cards.reduce((sum, card) => sum + (Array.isArray(card?.pageRows) ? card.pageRows.length : 0), 0),
      exactJson: JSON.stringify(gate || null),
    }];
  }));
}

function g4SmmIdeaStageV299(idea) {
  return G4_SMM_IDEA_STAGES_V299.find((stage) => stage.key === idea?.stage) ||
    G4_SMM_IDEA_STAGES_V299[0];
}

function g4SmmIdeaStageVisualV299(idea) {
  if (idea?.stage === "verification" && idea?.publicationId) return "ready";
  if (idea?.stage === "incubation") return "not_required";
  if (idea?.stage === "collection") return "not_started";
  return "in_progress";
}

function g4SmmPublicationVisualV299(status) {
  if (status === "published" || status === "ready") return "ready";
  if (status === "in_progress") return "in_progress";
  if (status === "cancelled") return "not_required";
  return "not_started";
}

function g4SmmPublicationStatusLabelV299(status) {
  return G4_SMM_PUBLICATION_STATUSES_V299.find(([key]) => key === status)?.[1] ||
    "Не начато";
}

function g4SmmIdeaMaterialHtmlV299(idea) {
  const material = g4SmmIdeaMaterialV299(idea);
  if (!material.product)
    return `<div class="g4-smm-material-v299"><span class="g4-smm-empty-v299">Идея относится к бренду в целом — товарный контекст не выбран.</span></div>`;

  /* Переиспользуем живую JTBD-модель «Стратегической основы»: финальные
     фразы остаются внутри своего JTBD, а не смешиваются в общий список. */
  const product = g4SmmProductReadOnlyV299(material.product.id);
  const model = guruStrategicFoundationModelV286(product);
  const creation = material.concrete.find((row) => row.key === "creation");
  const creationField = {
    value: guruV185Text(creation?.value),
    source: "Gate 1 · Карточка товара",
    target: g3ProductJourneyPageTarget(model.snapshot, {
      contextKey: "productCreationV253",
      sectionKey: "productCreationV253",
    }),
  };
  const offerField = {
    value: model.fields.offer.value,
    source: model.fields.offer.source,
    target: model.fields.offer.target,
  };
  return `<div class="g4-smm-material-v299">
    <div class="guru-strategic-flow-v286 g4-smm-idea-foundation-v313" data-g4-smm-idea-foundation-v313>
      ${guruStrategicRowV286("Сегмент", model.fields.segment)}
      ${guruStrategicRowV286("Позиционирование", model.fields.positioning)}
      ${guruStrategicRowV286("УТП", model.fields.usp)}
      ${guruStrategicRowV286("Оффер", offerField)}
      ${guruStrategicRowV286("Как создаётся", creationField)}
      ${model.descriptors.map((descriptor, index) =>
        guruStrategicJtbdCardV286(model, descriptor, index + 1),
      ).join("")}
      ${!model.descriptors.length
        ? '<div class="guru-strategic-primary-notice-v286">JTBD не заполнены в источнике</div>'
        : ""}
      ${!model.keywordModel.finalEntries.length
        ? '<div class="guru-strategic-final-notice-v286">Финальные ключевые слова не сформированы</div>'
        : ""}
    </div>
  </div>`;
}

/* Стадия 2 хранит только стабильный id строки формата. Задача, темы,
   расчётный объём и площадки всегда читаются из актуальной стратегии. */
function g4SmmIdeaPrimaryTaskHtmlV315(idea, locked = false) {
  const strategy = g4SmmStrategyEnsureV298();
  if (!strategy) return "";
  const selectedId = guruV185Text(idea?.primaryTaskFormatId);
  const selected = (strategy.formats || []).find((row) =>
    guruV185Text(row?.id) === selectedId,
  ) || null;
  const projection = g4SmmPeriodProjectionV304(strategy);
  const volume = selected ? g4SmmFormatVolumeV305(selected, strategy, projection) : null;
  const topics = selected ? g4SmmFormatTopicsV308(selected, strategy) : [];
  const selectedTopicId = guruV185Text(idea?.topicId);
  const selectedTopic = topics.find((topic) => guruV185Text(topic?.id) === selectedTopicId) || null;
  return `<div class="g4-smm-idea-primary-task-v315" data-g4-smm-idea-primary-task-v315>
    <div class="g4-smm-idea-primary-selectors-v345">
      <label class="g1-field">
        <span>Основная задача</span>
        <select class="g1-input ${selected ? "is-filled" : "is-empty"}" data-g4-smm-idea-field-v299="primaryTaskFormatId" data-g4-smm-idea-id-v299="${escapeAttr(idea.id)}" ${locked ? "disabled" : ""}>
          <option value="">Выберите основную задачу</option>
          ${g4SmmFormatsOrderedBy5AV303(strategy.formats).map(({ format: row }) => `<option value="${escapeAttr(row.id)}" ${guruV185Text(row.id) === selectedId ? "selected" : ""}>${escapeHtml(row.task)}</option>`).join("")}
        </select>
      </label>
      <label class="g1-field">
        <span>Тема</span>
        <select class="g1-input ${selectedTopic ? "is-filled" : "is-empty"}" data-g4-smm-idea-field-v299="topicId" data-g4-smm-idea-id-v299="${escapeAttr(idea.id)}" ${!selected || locked ? "disabled" : ""}>
          <option value="">Выберите тему</option>
          ${topics.map((topic) => `<option value="${escapeAttr(topic.id)}" ${guruV185Text(topic.id) === selectedTopicId ? "selected" : ""}>${escapeHtml(topic.value)}</option>`).join("")}
        </select>
      </label>
    </div>
    ${selected ? `<div class="g4-smm-idea-task-details-v316" data-g4-smm-idea-primary-task-live-v315="${escapeAttr(selected.id)}">
      <div><strong>Основная задача</strong><span>${escapeHtml(selected.task) || "—"}</span></div>
      <div><strong>Формат</strong><span>${escapeHtml(selected.format) || "—"}</span></div>
      <div><strong>Тема</strong><span>${escapeHtml(selectedTopic?.value) || "Не выбрана"}</span></div>
      <div><strong>Объём контента</strong><span class="g4-smm-format-volume-v305"><b>${escapeHtml(volume.projected)}</b><small>${escapeHtml(volume.note)}</small></span></div>
      <div><strong>Площадки</strong><span>${escapeHtml(selected.platforms) || "—"}</span></div>
    </div>` : '<p class="g4-smm-empty-v299">Выберите основную задачу — здесь появится связанная строка SMM-стратегии.</p>'}
  </div>`;
}

function g4SmmPublicationForIdeaV324(idea, content = g4SmmContentEnsureV299()) {
  if (!idea || !content) return null;
  return (idea.publicationId
    ? content.publications.find((item) => item.id === idea.publicationId)
    : null) || content.publications.find((item) => item.sourceIdeaId === idea.id) || null;
}

function g4SmmIdeaNameV332(idea, index) {
  return guruV185Text(idea?.name) || `Идея №${index + 1}`;
}

function g4SmmIdeaDisplayTitleV333(idea, index, content, strategy) {
  return g4SmmIdeaNameV332(idea, index);
}

function g4SmmIdeaHtmlV299(idea, index, content, strategy) {
  const product = g4SmmProductReadOnlyV299(idea.productId);
  const publication = g4SmmPublicationForIdeaV324(idea, content);
  const publicationIndex = publication
    ? Math.max(0, content.publications.findIndex((item) => item.id === publication.id))
    : -1;
  const workflowEditing = Boolean(publication) && (
    g4SmmIdeaEditingIdsV330.has(idea.id) ||
    g4SmmPublicationEditingIdsV328.has(publication.id)
  );
  const editing = !publication || workflowEditing;
  const locked = Boolean(publication) && !editing;
  const title = g4SmmIdeaDisplayTitleV333(idea, index, content, strategy);
  const collapseKey = `g4-smm-idea-workflow-${idea.id}`;
  const collapsed = typeof g1CollapsedSet === "function" && g1CollapsedSet().has(collapseKey);
  const ideaHtml = `<article class="g1-card g1-card-collapsible g4-smm-idea-v299 ${collapsed ? "is-collapsed" : ""} ${locked ? "is-locked" : "is-editing"}" data-g4-smm-idea-card-v299="${escapeAttr(idea.id)}" data-g4-smm-idea-editing-v330="${editing ? "true" : "false"}">
    <div class="g1-card-header-static g1-card-collapse-header g4-smm-idea-collapse-head-v343" data-g1-collapse data-g1-collapse-key="${escapeAttr(collapseKey)}">
      <span class="g1-section-left"><span class="g4-smm-idea-title-line-v343"><span class="g1-card-title" data-g4-smm-idea-card-title-v332>${escapeHtml(title)}</span><span class="g4-smm-idea-collapse-mark-v343" aria-hidden="true"></span></span><span class="g1-section-progress">${escapeHtml(product?.name || "Бренд в целом")}</span></span>
      ${publication ? `<span class="g4-smm-workflow-header-actions-v342"><span class="status-pill status-${escapeAttr(g4SmmPublicationVisualV299(publication.status))}">${escapeHtml(g4SmmPublicationStatusLabelV299(publication.status))}</span><button type="button" class="small-btn" data-g4-smm-workflow-mode-v342="${workflowEditing ? "save" : "edit"}" data-g4-smm-idea-id-v299="${escapeAttr(idea.id)}" data-g4-smm-publication-id-v299="${escapeAttr(publication.id)}">${workflowEditing ? "Сохранить" : "Редактировать"}</button></span>` : ""}
    </div>
    <div class="g1-card-body g1-card-collapse-body">
      <section class="g4-smm-idea-stage-v299" data-g4-smm-idea-stage-view-v299="collection">
        <div class="g4-smm-idea-stage-head-v299"><strong>1. Сбор материала</strong><small>Только live read-only: Gate 0–3</small></div>
        ${g3ProductJourneyStageExplanationHtmlV296("collection", "gate4-idea", G4_SMM_IDEA_STAGE_EXPLANATIONS_V311.collection)}
        ${g4SmmIdeaMaterialHtmlV299(idea)}
      </section>

      <section class="g4-smm-idea-stage-v299" data-g4-smm-idea-stage-view-v299="digestion">
        <div class="g4-smm-idea-stage-head-v299"><strong>2. Переваривание</strong><small>Черновик связей и наблюдений — не финальный результат</small></div>
        ${g3ProductJourneyStageExplanationHtmlV296("digestion", "gate4-idea", G4_SMM_IDEA_STAGE_EXPLANATIONS_V311.digestion)}
        <div class="g4-smm-digestion-layout-v316" data-g4-smm-digestion-layout-v316>
          ${g4SmmIdeaPrimaryTaskHtmlV315(idea, locked)}
          <label class="g1-field g4-smm-digestion-thoughts-v316"><span>Мысли / связи</span><textarea class="g1-input g4-smm-digestion-notes-v315 ${guruV185Text(idea.digestionNotes) ? "is-filled" : "is-optional"}" rows="14" data-g4-smm-idea-field-v299="digestionNotes" data-g4-smm-idea-id-v299="${escapeAttr(idea.id)}" placeholder="Что связано между собой, где конфликт, какой поворот можно проверить" ${locked ? "disabled" : ""}>${escapeHtml(idea.digestionNotes)}</textarea></label>
        </div>
      </section>

      <section class="g4-smm-idea-stage-v299" data-g4-smm-idea-stage-view-v299="incubation">
        <div class="g4-smm-idea-stage-head-v299"><strong>3. Инкубация</strong><span class="status-pill status-not_required">Отложено</span></div>
        ${g3ProductJourneyStageExplanationHtmlV296("incubation", "gate4-idea", G4_SMM_IDEA_STAGE_EXPLANATIONS_V311.incubation)}
        <p class="g1-task">Идея может ждать без обязательных полей. Другие стадии остаются доступными.</p>
      </section>

      <section class="g4-smm-idea-stage-v299" data-g4-smm-idea-stage-view-v299="insight">
        <div class="g4-smm-idea-stage-head-v299"><strong>4. Озарение</strong><small>Короткая формулировка сути контента</small></div>
        ${g3ProductJourneyStageExplanationHtmlV296("insight", "gate4-idea", G4_SMM_IDEA_STAGE_EXPLANATIONS_V311.insight)}
        <label class="g1-field"><span>Название идеи</span><small>Короткое имя исходной идеи; название публикации задаётся отдельно.</small><input class="g1-input ${guruV185Text(idea.name) ? "is-filled" : "is-empty"}" type="text" value="${escapeAttr(idea.name || "")}" data-g4-smm-idea-field-v299="name" data-g4-smm-idea-id-v299="${escapeAttr(idea.id)}" placeholder="Например: Коза из ткани" ${locked ? "disabled" : ""} /></label>
        <label class="g1-field"><span>Идея</span><textarea class="g1-input ${guruV185Text(idea.insight) ? "is-filled" : "is-empty"}" rows="2" data-g4-smm-idea-field-v299="insight" data-g4-smm-idea-id-v299="${escapeAttr(idea.id)}" placeholder="Суть будущей публикации" ${locked ? "disabled" : ""}>${escapeHtml(idea.insight)}</textarea></label>
      </section>

      <section class="g4-smm-idea-stage-v299" data-g4-smm-idea-stage-view-v299="verification">
        <div class="g4-smm-idea-stage-head-v299"><strong>5. Проверка и доработка</strong><small>Переход к рабочей карточке публикации без повторного ввода</small></div>
        ${g3ProductJourneyStageExplanationHtmlV296("verification", "gate4-idea", G4_SMM_IDEA_STAGE_EXPLANATIONS_V311.verification)}
        ${publication
          ? `<div class="g4-smm-idea-saved-actions-v330"><span class="status-pill status-ready g4-smm-publication-saved-v329">Сохранено как публикация</span></div>`
          : `<button type="button" class="small-btn add-inline-btn" data-g4-smm-idea-convert-v299="${escapeAttr(idea.id)}">Сохранить как публикацию</button>`}
      </section>
      ${publication ? g4SmmPublicationHtmlV299(publication, publicationIndex, content, strategy, { embedded: true, editing: workflowEditing }) : ""}
    </div>
  </article>`;
  return `<div class="g4-smm-idea-workflow-v324" data-g4-smm-idea-workflow-v324="${escapeAttr(idea.id)}">${ideaHtml}</div>`;
}

function g4SmmMetricFormatV299(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(number);
}

function g4SmmMetricVerdictHtmlV299(publication, metricKey, content) {
  const verdict = g4SmmMetricVerdictV299(publication, metricKey, content);
  const detail = Number.isFinite(verdict.ratio)
    ? `${Math.round(verdict.ratio)}% от среднего ${g4SmmMetricFormatV299(verdict.average)} · ${verdict.historyCount} публикации`
    : verdict.historyCount !== undefined
      ? `История этого формата: ${verdict.historyCount} из необходимых 3 публикаций`
      : "";
  return `<div class="g4-smm-verdict-v299 is-${escapeAttr(verdict.status)}" data-g4-smm-verdict-v299="${escapeAttr(metricKey)}" data-g4-smm-publication-id-v299="${escapeAttr(publication.id)}"><strong>${escapeHtml(verdict.label)}</strong>${detail ? `<small>${escapeHtml(detail)}</small>` : ""}</div>`;
}

function g4SmmPublicationPlatformsV299(publication, strategy) {
  return g3ProductJourneyUnique([
    ...(strategy?.formats || []).flatMap((format) => g4SmmFormatPlatformsV299(format)),
    ...(publication?.platforms || []),
  ]).sort((left, right) => left.localeCompare(right, "ru"));
}

function g4SmmPublicationVideoKindV325(publication, strategy) {
  const format = g4SmmPublicationFormatV299(publication, strategy);
  const id = guruV185Text(format?.id || publication?.formatId);
  const label = guruV185Text(format?.format || publication?.formatLabel).toLocaleLowerCase("ru-RU");
  if (id === "g4-smm-format-v298-1" || label === "короткое вертикальное видео") return "short";
  if (id === "g4-smm-format-v298-6" || label === "длинное видео") return "long";
  return "";
}

function g4SmmTextLengthV344(value) {
  return Array.from(String(value || "").trim()).length;
}

function g4SmmWordCountV344(value) {
  return String(value || "").trim().split(/\s+/).filter(Boolean).length;
}

function g4SmmHashtagCountV344(value) {
  return (String(value || "").match(/#[\p{L}\p{N}_-]+/gu) || []).length;
}

function g4SmmPackageMetricV344(key, value) {
  const present = Boolean(guruV185Text(value));
  const length = g4SmmTextLengthV344(value);
  if (key === "caption") return {
    state: !present ? "empty" : length >= 150 && length <= 350 ? "ready" : "problem",
    label: `${length} · норма 150–350`,
  };
  if (key === "firstLine") return {
    state: !present ? "empty" : length <= 100 ? "ready" : "problem",
    label: `${length} / 100`,
  };
  if (key === "hashtags") {
    const count = g4SmmHashtagCountV344(value);
    return {
      state: !present ? "empty" : count <= 3 ? "ready" : "problem",
      label: `${count} / 3`,
    };
  }
  if (key === "cover") {
    const count = g4SmmWordCountV344(value);
    return {
      state: !present ? "empty" : count >= 3 && count <= 6 ? "ready" : "problem",
      label: `${count} слов · норма 3–6`,
    };
  }
  if (key === "shortsTitle") return {
    state: !present ? "empty" : length >= 40 && length <= 70 ? "ready" : "problem",
    label: `${length} · норма 40–70`,
  };
  if (key === "link") return {
    state: present ? "ready" : "empty",
    label: present ? "1 маршрут задан" : "Маршрут не задан",
  };
  return { state: present ? "ready" : "empty", label: "" };
}

function g4SmmPackageCounterHtmlV344(key, value) {
  const metric = g4SmmPackageMetricV344(key, value);
  return `<span class="g4-smm-package-counter-v344 is-${escapeAttr(metric.state)}-v344" data-g4-smm-package-counter-v344="${escapeAttr(key)}">${escapeHtml(metric.label)}</span>`;
}

function g4SmmStoryboardPhaseHtmlV344(publication, phase, index, videoKind) {
  const brief = publication.creativeBrief || {};
  const value = String(brief[phase.field] || "");
  const done = Boolean(brief.checks?.[phase.key]);
  const time = videoKind === "short" ? phase.shortTime : phase.longTime;
  return `<article class="g4-smm-shot-v344 ${done ? "is-done-v344" : ""}" data-g4-smm-shot-v344="${escapeAttr(phase.key)}" data-g4-smm-brief-order-v334="${escapeAttr(phase.field)}">
    <header class="g4-smm-shot-head-v344"><span>${String(index + 1).padStart(2, "0")}</span><div><strong>${escapeHtml(phase.label)}</strong><small>${escapeHtml(time)}</small></div></header>
    <dl class="g4-smm-shot-purpose-v344">
      <div><dt>Назначение</dt><dd>${escapeHtml(phase.purpose)}</dd></div>
      <div><dt>Почему</dt><dd>${escapeHtml(phase.reason)}</dd></div>
      <div><dt>Что происходит</dt><dd>${escapeHtml(phase.action)}</dd></div>
    </dl>
    <label class="g4-smm-shot-input-v344"><span>Что будет в кадре</span><textarea class="g1-input ${guruV185Text(value) ? "is-filled" : "is-optional"}" rows="4" data-g4-smm-brief-field-v325="${escapeAttr(phase.field)}" data-g4-smm-publication-id-v299="${escapeAttr(publication.id)}" placeholder="Опишите кадр, текст или действие">${escapeHtml(value)}</textarea></label>
    <label class="v23-check g4-smm-shot-check-v344"><input type="checkbox" data-g4-smm-brief-check-v344="${escapeAttr(phase.key)}" data-g4-smm-publication-id-v299="${escapeAttr(publication.id)}" ${done ? "checked" : ""} /><span>Этап готов</span></label>
  </article>`;
}

function g4SmmPackageFieldHtmlV344(publication, field) {
  const value = String(publication.publicationPackage?.[field.key] || "");
  const control = field.type === "textarea"
    ? `<textarea class="g1-input ${guruV185Text(value) ? "is-filled" : "is-optional"}" rows="${field.rows || 3}" data-g4-smm-package-field-v344="${escapeAttr(field.key)}" data-g4-smm-publication-id-v299="${escapeAttr(publication.id)}" placeholder="${escapeAttr(field.placeholder || "Введите текст")}">${escapeHtml(value)}</textarea>`
    : `<input class="g1-input ${guruV185Text(value) ? "is-filled" : "is-optional"}" type="text" value="${escapeAttr(value)}" data-g4-smm-package-field-v344="${escapeAttr(field.key)}" data-g4-smm-publication-id-v299="${escapeAttr(publication.id)}" placeholder="${escapeAttr(field.placeholder || "Введите текст")}" />`;
  return `<label class="g4-smm-package-field-v344" data-g4-smm-package-order-v344="${escapeAttr(field.key)}">
    <span class="g4-smm-package-field-head-v344"><strong>${escapeHtml(field.label)}</strong><em>${escapeHtml(field.norm)}</em></span>
    <small>${escapeHtml(field.task)}</small>
    ${control}
    ${g4SmmPackageCounterHtmlV344(field.key, value)}
  </label>`;
}

function g4SmmPublicationPreviewHtmlV344(publication, videoKind) {
  const brief = publication.creativeBrief || {};
  const packageData = publication.publicationPackage || {};
  const product = g4SmmProductReadOnlyV299(publication.productId);
  return `<aside class="g4-smm-post-preview-v344" data-g4-smm-post-preview-v344="${escapeAttr(publication.id)}">
    <header><div><strong>Предпросмотр</strong><small>Примерная композиция публикации</small></div><span>9:16</span></header>
    <div class="g4-smm-reel-frame-v344">
      <span class="g4-smm-reel-format-v344">REEL / SHORT</span>
      <strong data-g4-smm-preview-slot-v344="cover">${escapeHtml(guruV185Text(packageData.cover) || "Текст на обложке")}</strong>
      <p data-g4-smm-preview-slot-v344="hook">${escapeHtml(guruV185Text(brief.hook) || "Первый кадр и хук")}</p>
      <small><span>▶</span> <span data-g4-smm-preview-slot-v344="durationSeconds">${escapeHtml(guruV185Text(brief.durationSeconds) ? `${brief.durationSeconds} сек` : videoKind === "short" ? "20–45 сек" : "Без лимита")}</span></small>
    </div>
    <div class="g4-smm-post-copy-v344">
      <strong>${escapeHtml(product?.name || "Название профиля")}</strong>
      <b data-g4-smm-preview-slot-v344="firstLine">${escapeHtml(guruV185Text(packageData.firstLine) || "Первая строка дополнит хук")}</b>
      <p data-g4-smm-preview-slot-v344="caption">${escapeHtml(guruV185Text(packageData.caption) || "Подпись даст контекст, объяснит смысл и направит к одному действию.")}</p>
      <span data-g4-smm-preview-slot-v344="hashtags">${escapeHtml(guruV185Text(packageData.hashtags) || "#тема #формат")}</span>
      <a data-g4-smm-preview-slot-v344="link">${escapeHtml(guruV185Text(publication.link) || "Ссылка / маршрут")}</a>
    </div>
    <div class="g4-smm-shorts-title-v344"><span>Shorts</span><strong data-g4-smm-preview-slot-v344="shortsTitle">${escapeHtml(guruV185Text(packageData.shortsTitle) || "Поисковый заголовок для YouTube Shorts")}</strong></div>
  </aside>`;
}

function g4SmmPublicationCreativeBriefHtmlV325(publication, content, strategy) {
  const videoKind = g4SmmPublicationVideoKindV325(publication, strategy);
  if (!videoKind) return "";
  const brief = publication.creativeBrief || {};
  const doneCount = G4_SMM_STORYBOARD_PHASES_V344.filter((phase) => brief.checks?.[phase.key]).length;
  const durationHint = videoKind === "short"
    ? "Рабочий диапазон: 20–45 секунд"
    : "Без строгого лимита, ориентируйся на полноту раскрытия темы";
  const packageFields = G4_SMM_PUBLICATION_PACKAGE_FIELDS_V344.map((field) =>
    g4SmmPackageFieldHtmlV344(publication, field),
  );
  const linkMetric = g4SmmPackageCounterHtmlV344("link", publication.link);
  packageFields.splice(2, 0, `<label class="g4-smm-package-field-v344" data-g4-smm-package-order-v344="link" data-g4-smm-publication-order-v334="link">
    <span class="g4-smm-package-field-head-v344"><strong>Ссылка</strong><em>1 маршрут</em></span>
    <small>Только для заявки, товара или связанного материала</small>
    <input class="g1-input ${guruV185Text(publication.link) ? "is-filled" : "is-optional"}" type="url" value="${escapeAttr(publication.link || "")}" placeholder="https://…?utm_source=…" data-g4-smm-publication-field-v299="link" data-g4-smm-publication-id-v299="${escapeAttr(publication.id)}" />
    ${linkMetric}
  </label>`);
  return `<section class="g4-smm-creative-brief-v325 g4-smm-production-v344 g4-smm-publication-group-v335" data-g4-smm-creative-brief-v325="${escapeAttr(publication.id)}" data-g4-smm-production-v344="${escapeAttr(publication.id)}" data-g4-smm-video-kind-v325="${escapeAttr(videoKind)}">
    <header class="g4-smm-publication-group-head-v335"><strong>Производство ролика</strong><small>Раскадровка → готовая публикация</small></header>

    <section class="g4-smm-production-stage-v344" data-g4-smm-production-stage-v344="storyboard">
      <header class="g4-smm-production-stage-head-v344"><span>1</span><div><strong>Раскадровка ролика</strong><small>${videoKind === "short" ? "Чек-лист ролика, 20–45 секунд" : "Логика ролика без жёсткого лимита"}</small></div><em data-g4-smm-production-progress-v344>${doneCount}/5 готово</em></header>
      <label class="g4-smm-duration-v344"><span><strong>Хронометраж</strong><small>${escapeHtml(durationHint)}</small></span><span><input class="g1-input ${guruV185Text(brief.durationSeconds) ? "is-filled" : "is-optional"}" type="number" min="1" step="1" inputmode="numeric" value="${escapeAttr(brief.durationSeconds || "")}" data-g4-smm-brief-field-v325="durationSeconds" data-g4-smm-publication-id-v299="${escapeAttr(publication.id)}" /><b>сек</b></span></label>
      <div class="g4-smm-storyboard-scroll-v344"><div class="g4-smm-storyboard-track-v344">
        ${G4_SMM_STORYBOARD_PHASES_V344.map((phase, index) => g4SmmStoryboardPhaseHtmlV344(publication, phase, index, videoKind)).join("")}
      </div></div>
      <div class="g4-smm-publication-content-v335 g4-smm-final-script-v344">
        <label class="g1-field" data-g4-smm-publication-order-v334="content"><span>Финальный сценарий</span><small>Соберите пять этапов в цельный текст и монтажный план.</small><textarea class="g1-input ${guruV185Text(publication.content) ? "is-filled" : "is-empty"}" rows="7" data-g4-smm-publication-field-v299="content" data-g4-smm-publication-id-v299="${escapeAttr(publication.id)}" placeholder="Финальный текст, реплики, кадры и монтажные указания">${escapeHtml(publication.content)}</textarea></label>
      </div>
    </section>

    <section class="g4-smm-production-stage-v344" data-g4-smm-production-stage-v344="publication">
      <header class="g4-smm-production-stage-head-v344"><span>2</span><div><strong>Публикация глазами пользователя</strong><small>Первый кадр даёт охват, удержание ведёт дальше, подпись объясняет смысл и действие.</small></div></header>
      <div class="g4-smm-package-layout-v344">
        <div class="g4-smm-package-editor-v344">
          <div class="g4-smm-package-fields-v344">${packageFields.join("")}</div>
          <div class="g4-smm-caption-formula-v344"><strong>Формула подписи</strong><span>что произошло → почему это важно → что сделать дальше</span></div>
          <p class="g4-smm-package-note-v344">Ссылку ведите в профиль, товар или связанное видео. Для внешнего маршрута обязательны UTM-метки. Instagram допускает до 5 ссылок в профиле; заголовок YouTube Shorts ограничен 100 знаками. <a href="https://www.instagram.com/p/Cr0CCHtOhcn/" target="_blank" rel="noopener noreferrer">Instagram</a> · <a href="https://support.google.com/youtube/answer/10343433" target="_blank" rel="noopener noreferrer">YouTube</a></p>
        </div>
        ${g4SmmPublicationPreviewHtmlV344(publication, videoKind)}
      </div>
    </section>
  </section>`;
}

function g4SmmPublicationPackageRefreshV344(publicationId) {
  const { record: publication } = g4SmmContentRecordV299("publication", publicationId);
  const root = document.querySelector(`[data-g4-smm-production-v344="${CSS.escape(publicationId)}"]`);
  if (!publication || !root) return;
  const brief = publication.creativeBrief || {};
  const packageData = publication.publicationPackage || {};
  const values = { ...packageData, link: publication.link };
  Object.entries(values).forEach(([key, value]) => {
    const metric = g4SmmPackageMetricV344(key, value);
    const counter = root.querySelector(`[data-g4-smm-package-counter-v344="${CSS.escape(key)}"]`);
    if (!counter) return;
    counter.textContent = metric.label;
    counter.className = `g4-smm-package-counter-v344 is-${metric.state}-v344`;
  });
  G4_SMM_STORYBOARD_PHASES_V344.forEach((phase) => {
    root.querySelector(`[data-g4-smm-shot-v344="${CSS.escape(phase.key)}"]`)
      ?.classList.toggle("is-done-v344", Boolean(brief.checks?.[phase.key]));
  });
  const progress = root.querySelector("[data-g4-smm-production-progress-v344]");
  if (progress) progress.textContent = `${G4_SMM_STORYBOARD_PHASES_V344.filter((phase) => brief.checks?.[phase.key]).length}/5 готово`;
  const previewValues = {
    cover: guruV185Text(packageData.cover) || "Текст на обложке",
    hook: guruV185Text(brief.hook) || "Первый кадр и хук",
    durationSeconds: guruV185Text(brief.durationSeconds)
      ? `${brief.durationSeconds} сек`
      : root.dataset.g4SmmVideoKindV325 === "short" ? "20–45 сек" : "Без лимита",
    firstLine: guruV185Text(packageData.firstLine) || "Первая строка дополнит хук",
    caption: guruV185Text(packageData.caption) || "Подпись даст контекст, объяснит смысл и направит к одному действию.",
    hashtags: guruV185Text(packageData.hashtags) || "#тема #формат",
    link: guruV185Text(publication.link) || "Ссылка / маршрут",
    shortsTitle: guruV185Text(packageData.shortsTitle) || "Поисковый заголовок для YouTube Shorts",
  };
  Object.entries(previewValues).forEach(([key, value]) => {
    const slot = root.querySelector(`[data-g4-smm-preview-slot-v344="${CSS.escape(key)}"]`);
    if (slot) slot.textContent = value;
  });
}

function g4SmmPublicationHtmlV299(publication, index, content, strategy, options = {}) {
  const embedded = Boolean(options.embedded);
  const visual = g4SmmPublicationVisualV299(publication.status);
  const format = g4SmmPublicationFormatV299(publication, strategy);
  const topic = g4SmmPublicationTopicV299(publication, strategy);
  const title = g4SmmPublicationCardTitleV331(publication, index, strategy, content);
  const laconicTitle = guruV185Text(publication.title);
  const videoKind = g4SmmPublicationVideoKindV325(publication, strategy);
  const sourceIdea = (content?.ideas || []).find((idea) => idea.id === publication.sourceIdeaId) || null;
  const meaning = guruV185Text(sourceIdea?.insight);
  const platformOptions = g4SmmPublicationPlatformsV299(publication, strategy);
  const editing = typeof options.editing === "boolean"
    ? options.editing
    : g4SmmPublicationEditingIdsV328.has(publication.id);
  const showRoutingControls = !embedded || editing;
  const titleField = `<label class="g1-field" data-g4-smm-publication-order-v334="title"><span>Лаконичное название</span><small>Вводится вручную и не повторяет текст идеи, тему или формат.</small><input class="g1-input ${laconicTitle ? "is-filled" : "is-optional"}" type="text" value="${escapeAttr(publication.title || "")}" data-g4-smm-publication-field-v299="title" data-g4-smm-publication-id-v299="${escapeAttr(publication.id)}" placeholder="Например: Из ткани в символ года" /></label>`;
  const routingFields = showRoutingControls ? `
    <label class="g1-field" data-g4-smm-publication-order-v334="topic"><span>Тема публикации</span><small>Конкретная тема для этого материала.</small><select class="g1-input ${publication.topicId ? "is-filled" : "is-empty"}" data-g4-smm-publication-field-v299="topicId" data-g4-smm-publication-id-v299="${escapeAttr(publication.id)}"><option value="">Выберите тему</option>${strategy.topics.map((row) => `<option value="${escapeAttr(row.id)}" ${row.id === publication.topicId ? "selected" : ""}>${escapeHtml(row.value)}</option>`).join("")}${publication.topicId && !topic ? `<option value="${escapeAttr(publication.topicId)}" selected>${escapeHtml(publication.topicLabel || "Удалённая из стратегии тема")}</option>` : ""}</select></label>
    <label class="g1-field" data-g4-smm-publication-order-v334="format"><span>Формат публикации</span><small>Рабочий формат конкретного материала.</small><select class="g1-input ${publication.formatId ? "is-filled" : "is-empty"}" data-g4-smm-publication-field-v299="formatId" data-g4-smm-publication-id-v299="${escapeAttr(publication.id)}"><option value="">Выберите формат</option>${strategy.formats.map((row) => `<option value="${escapeAttr(row.id)}" ${row.id === publication.formatId ? "selected" : ""}>${escapeHtml(row.format)}</option>`).join("")}${publication.formatId && !format ? `<option value="${escapeAttr(publication.formatId)}" selected>${escapeHtml(publication.formatLabel || "Удалённый из стратегии формат")}</option>` : ""}</select></label>` : "";
  const platformField = showRoutingControls
    ? `<label class="g1-field g4-smm-platform-select-v299" data-g4-smm-publication-order-v334="platforms"><span>Площадки публикации</span><small>Из формата подставляются автоматически; выбор можно изменить.</small><span class="g4-smm-platform-chips-v335 ${publication.platforms.length ? "is-filled" : "is-empty"}">${platformOptions.map((value) => `<label><input type="checkbox" value="${escapeAttr(value)}" ${publication.platforms.includes(value) ? "checked" : ""} data-g4-smm-platform-option-v335 data-g4-smm-publication-field-v299="platforms" data-g4-smm-publication-id-v299="${escapeAttr(publication.id)}" /><span>${escapeHtml(value)}</span></label>`).join("")}</span></label>`
    : "";
  const statusField = showRoutingControls
    ? `<label class="g1-field" data-g4-smm-publication-order-v334="status"><span>Статус</span><select class="g1-input is-filled" data-g4-smm-publication-field-v299="status" data-g4-smm-publication-id-v299="${escapeAttr(publication.id)}">${G4_SMM_PUBLICATION_STATUSES_V299.map(([key, label]) => `<option value="${escapeAttr(key)}" ${key === publication.status ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}</select></label>`
    : "";
  const descriptionField = `<label class="g1-field" data-g4-smm-publication-order-v334="description"><span>Описание</span><small>Краткое описание материала для невидео-формата.</small><textarea class="g1-input ${guruV185Text(publication.description) ? "is-filled" : "is-optional"}" rows="3" data-g4-smm-publication-field-v299="description" data-g4-smm-publication-id-v299="${escapeAttr(publication.id)}">${escapeHtml(publication.description)}</textarea></label>`;
  const linkField = `<label class="g1-field" data-g4-smm-publication-order-v334="link"><span>Ссылка</span><input class="g1-input ${publication.link ? "is-filled" : "is-optional"}" type="url" value="${escapeAttr(publication.link)}" placeholder="https://" data-g4-smm-publication-field-v299="link" data-g4-smm-publication-id-v299="${escapeAttr(publication.id)}" /></label>`;
  const conceptGroup = embedded
    ? (!videoKind ? `<section class="g4-smm-publication-group-v335"><header class="g4-smm-publication-group-head-v335"><strong>Описание</strong><small>Только для невидео-формата</small></header><div class="g4-smm-publication-concept-v335">${descriptionField}</div></section>` : "")
    : `<section class="g4-smm-publication-group-v335">
        <header class="g4-smm-publication-group-head-v335"><strong>Замысел</strong><small>Связь с исходной идеей</small></header>
        <div class="g4-smm-publication-concept-v335">
          <div class="g1-field g4-smm-publication-meaning-v334" data-g4-smm-publication-order-v334="meaning"><span>Смысл</span><small>Живьём из стадии 4 «Озарение» исходной Карточки идеи.</small><div class="g4-smm-brief-meaning-v325 ${meaning ? "is-filled" : "is-empty"}" data-g4-smm-brief-meaning-v325="${escapeAttr(publication.sourceIdeaId)}">${escapeHtml(meaning || (sourceIdea ? "Идея пока не сформулирована" : "Исходная Карточка идеи не найдена"))}</div></div>
          ${videoKind ? "" : descriptionField}
        </div>
      </section>`;
  const body = `<fieldset class="g1-card-body g4-smm-publication-lock-v328" ${editing ? "" : "disabled"}>
      <section class="g4-smm-publication-group-v335">
        <header class="g4-smm-publication-group-head-v335"><strong>Основное</strong><small>${embedded ? "Уникальные данные публикации" : "Название и место в контентной системе"}</small></header>
        <div class="g4-smm-publication-fields-v299">
          ${titleField}${routingFields}
        </div>
      </section>
      <section class="g4-smm-publication-group-v335">
        <header class="g4-smm-publication-group-head-v335"><strong>Размещение</strong><small>Где и когда выходит материал</small></header>
        <div class="g4-smm-publication-fields-v299">
          ${platformField}
          <label class="g1-field" data-g4-smm-publication-order-v334="date"><span>Дата</span><input class="g1-input ${publication.date ? "is-filled" : "is-optional"}" type="date" value="${escapeAttr(publication.date)}" data-g4-smm-publication-field-v299="date" data-g4-smm-publication-id-v299="${escapeAttr(publication.id)}" /></label>
          ${videoKind ? "" : linkField}
          ${statusField}
        </div>
      </section>
      ${conceptGroup}
      ${g4SmmPublicationCreativeBriefHtmlV325(publication, content, strategy)}
      ${videoKind ? "" : `<section class="g4-smm-publication-group-v335">
        <header class="g4-smm-publication-group-head-v335"><strong>Материал</strong><small>Финальный текст или сценарий</small></header>
        <div class="g1-fields-grid g4-smm-publication-content-v335">
        <label class="g1-field" data-g4-smm-publication-order-v334="content"><span>Содержимое</span><textarea class="g1-input ${guruV185Text(publication.content) ? "is-filled" : "is-empty"}" rows="7" data-g4-smm-publication-field-v299="content" data-g4-smm-publication-id-v299="${escapeAttr(publication.id)}" placeholder="Текст, сценарий или описание готового креатива">${escapeHtml(publication.content)}</textarea></label>
        </div>
      </section>`}
    </fieldset>`;
  if (embedded) {
    return `<section class="g4-smm-publication-v299 g4-smm-publication-embedded-v342 ${editing ? "is-editing" : "is-locked"}" data-g4-smm-publication-card-v299="${escapeAttr(publication.id)}" data-g4-smm-publication-editing-v328="${editing ? "true" : "false"}">
      <header class="g4-smm-publication-embedded-head-v342"><div><strong>Рабочая часть публикации</strong><small>Продолжение этой же карточки идеи · без повторного контекста</small></div></header>
      ${body}
    </section>`;
  }
  return `<article class="g1-card g4-smm-publication-v299 ${editing ? "is-editing" : "is-locked"}" data-g4-smm-publication-card-v299="${escapeAttr(publication.id)}" data-g4-smm-publication-editing-v328="${editing ? "true" : "false"}">
    <div class="g1-card-header-static">
      <span class="g1-section-left"><span class="g1-card-title" data-g4-smm-publication-card-title-v331>${escapeHtml(title)}</span><span class="g1-section-progress">${escapeHtml(g4SmmProductReadOnlyV299(publication.productId)?.name || "Бренд")}</span></span>
      <span class="g4-smm-publication-header-actions-v328"><span class="status-pill status-${escapeAttr(visual)}">${escapeHtml(g4SmmPublicationStatusLabelV299(publication.status))}</span><button type="button" class="small-btn" data-g4-smm-publication-mode-v328="${editing ? "save" : "edit"}" data-g4-smm-publication-id-v299="${escapeAttr(publication.id)}">${editing ? "Сохранить" : "Редактировать"}</button></span>
    </div>
    ${body}
  </article>`;
}

function g4SmmCalendarIdeaHtmlV322(idea, strategy, content, inBank = false) {
  const format = (strategy?.formats || []).find((row) =>
    guruV185Text(row?.id) === guruV185Text(idea?.primaryTaskFormatId),
  );
  const product = g4SmmProductReadOnlyV299(idea?.productId);
  return `<article class="g4-smm-calendar-idea-v322 ${inBank ? "is-in-bank-v339" : ""}" draggable="true" tabindex="0" data-g4-smm-calendar-idea-v322="${escapeAttr(idea.id)}" data-g4-smm-calendar-drag-v339="${escapeAttr(idea.id)}">
    <div><strong>${escapeHtml(g4SmmIdeaDisplayTitleV333(idea, Math.max(0, content.ideas.findIndex((row) => row.id === idea.id)), content, strategy))}</strong><small>${escapeHtml([format?.task, format?.format, product?.name || "Бренд"].filter(Boolean).join(" · "))}</small></div>
    ${inBank
      ? '<span class="g4-smm-calendar-drag-hint-v339">Перетащите в день</span>'
      : `<button type="button" class="small-btn" data-g4-smm-calendar-unschedule-v322="${escapeAttr(idea.id)}" title="Вернуть идею в банк, не удаляя карточку">В банк</button>`}
  </article>`;
}

function g4SmmWeekCalendarHtmlV322(content, strategy) {
  const days = g4SmmCalendarDaysV322(content);
  const formulated = (content?.ideas || [])
    .filter((idea) => guruV185Text(idea?.insight))
    .slice()
    .sort((left, right) =>
      g4SmmIdeaDisplayTitleV333(left, content.ideas.indexOf(left), content, strategy).localeCompare(
        g4SmmIdeaDisplayTitleV333(right, content.ideas.indexOf(right), content, strategy),
        "ru",
      ),
    );
  const dateLabel = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" });
  const unscheduled = formulated.filter((idea) => !g4SmmDateValueV299(idea.scheduledDate));
  return `<section class="g4-smm-week-calendar-v322" data-g4-smm-week-calendar-v322 data-g4-smm-week-start-v322="${escapeAttr(days[0]?.value || "")}">
    <div class="g4-smm-week-calendar-head-v322">
      <div><h5>Недельный календарь идей</h5><p class="g1-task">${escapeHtml(g4SmmCalendarWeekLabelV322(content))} · понедельник–воскресенье</p></div>
      <div class="g4-smm-week-calendar-controls-v322">
        <button type="button" class="small-btn" data-g4-smm-week-shift-v322="-7" aria-label="Предыдущая неделя">←</button>
        <button type="button" class="small-btn" data-g4-smm-week-today-v322>Текущая неделя</button>
        <button type="button" class="small-btn" data-g4-smm-week-shift-v322="7" aria-label="Следующая неделя">→</button>
      </div>
    </div>
    <div class="g4-smm-week-days-v322">
      <section class="g4-smm-week-day-v322 g4-smm-idea-bank-v339 ${unscheduled.length ? "has-ideas" : "is-empty"}" data-g4-smm-calendar-drop-v339="bank">
        <header><div><strong>Банк идей</strong><span>Ещё не размещены</span></div><small>${unscheduled.length ? g4SmmIdeaCountLabelV322(unscheduled.length) : "Банк пуст"}</small></header>
        <div class="g4-smm-calendar-ideas-v322">${unscheduled.map((idea) => g4SmmCalendarIdeaHtmlV322(idea, strategy, content, true)).join("")}</div>
        ${unscheduled.length ? "" : '<p class="g4-smm-calendar-empty-v339">Новые сформулированные идеи появятся здесь.</p>'}
      </section>
      ${days.map((day) => {
        const scheduled = formulated.filter((idea) => idea.scheduledDate === day.value);
        return `<section class="g4-smm-week-day-v322 ${scheduled.length ? "has-ideas" : "is-empty"}" data-g4-smm-week-day-v322="${escapeAttr(day.value)}" data-g4-smm-calendar-drop-v339="${escapeAttr(day.value)}">
          <header><div><strong>${escapeHtml(day.label)}</strong><span>${escapeHtml(dateLabel.format(day.date))}</span></div><small>${scheduled.length ? g4SmmIdeaCountLabelV322(scheduled.length) : "Нет идей"}</small></header>
          <div class="g4-smm-calendar-ideas-v322">${scheduled.map((idea) => g4SmmCalendarIdeaHtmlV322(idea, strategy, content)).join("")}</div>
          ${scheduled.length ? "" : '<p class="g4-smm-calendar-empty-v339">Перетащите идею сюда</p>'}
        </section>`;
      }).join("")}
    </div>
  </section>`;
}

function g4SmmSummaryTargetStatusV341(count, target) {
  const current = Math.max(0, Number(count) || 0);
  const goal = Math.max(0, Number(target) || 0);
  if (goal === 0 || current >= goal) {
    return {
      visual: "ready",
      label: current > goal ? `Сверх плана: ${current - goal}` : "Выполнено",
    };
  }
  return {
    visual: current / goal >= .5 ? "attention" : "problem",
    label: `Недобор: ${goal - current}`,
  };
}

function g4SmmSummaryTargetRowHtmlV341(label, count, target, scope) {
  const status = g4SmmSummaryTargetStatusV341(count, target);
  return `<div class="pv181-group-benchmark-item-v277 is-${status.visual}-v277 g4-smm-summary-target-v341" data-pv181-group-benchmark-v277="g4-smm-${escapeAttr(scope)}" data-g4-smm-summary-target-v341="${escapeAttr(scope)}">
    <span class="pv181-group-benchmark-dot-v277" aria-hidden="true"></span>
    <div><strong>${escapeHtml(label)}</strong><span class="g4-smm-summary-fraction-v341">${count}/${target}</span><span class="g4-smm-summary-status-v341">${escapeHtml(status.label)}</span></div>
  </div>`;
}

function g4SmmSummaryCompactStatusV346(planned, fact, target) {
  const goal = Math.max(0, Number(target) || 0);
  const plannedCount = Math.max(0, Number(planned) || 0);
  const factCount = Math.max(0, Number(fact) || 0);
  if (goal === 0 || factCount >= goal)
    return { visual: "ready", label: factCount > goal ? `Сверх плана: ${factCount - goal}` : "Выполнено" };
  if (plannedCount >= goal)
    return { visual: "attention", label: `Запланировано · факт ${factCount}/${goal}` };
  return {
    visual: plannedCount || factCount ? "attention" : "problem",
    label: `Недобор: ${Math.max(0, goal - Math.max(plannedCount, factCount))}`,
  };
}

function g4SmmActionSummaryHtmlV299(content, strategy) {
  const summary = g4SmmContentSummaryV299(content, strategy);
  const rows = [
    ["videos", "Видео", "g4-smm-format-v298-1"],
    ["carousels", "Карусели", "g4-smm-format-v298-3"],
    ["cases", "Кейсы", "g4-smm-format-v298-2"],
  ].map(([key, label, formatId]) => {
    const target = summary.week.targets[key];
    const planned = summary.plan.counts[key];
    const fact = summary.week.counts[key];
    const status = g4SmmSummaryCompactStatusV346(planned, fact, target);
    return `<tr class="g4-smm-summary-row-v346 is-${escapeAttr(status.visual)}-v346"
      data-g4-smm-summary-format-focus-v346="${escapeAttr(formatId)}">
      <td><span class="g4-smm-summary-dot-v346" aria-hidden="true"></span><strong>${escapeHtml(label)}</strong></td>
      <td>${target}</td>
      <td>${planned}</td>
      <td>${fact}</td>
      <td><span class="g4-smm-summary-status-v346">${escapeHtml(status.label)}</span></td>
    </tr>`;
  }).join("");
  const quarterTarget = Math.max(0, Number(summary.quarter.targetMin) || 0);
  const quarterPublished = Math.max(0, Number(summary.quarter.published) || 0);
  const quarterProgress = quarterTarget > 0
    ? Math.min(100, Math.round((quarterPublished / quarterTarget) * 100))
    : 100;
  const weekStart = g4SmmCalendarWeekStartV322(content);
  const quarterLabel = `Q${Math.floor(weekStart.getMonth() / 3) + 1} ${weekStart.getFullYear()}`;
  return `<section class="g4-smm-action-summary-v299 g4-smm-action-summary-compact-v346" data-g4-smm-action-summary-v299>
    <div class="g4-smm-idea-stage-head-v299">
      <strong>Что нужно сделать</strong>
      <small>${escapeHtml(summary.plan.weekLabel)} · план, идеи и фактические публикации</small>
    </div>
    <div class="g4-smm-summary-table-wrap-v346">
      <table class="mini-table typed-table g4-smm-summary-table-v346">
        <thead><tr><th>Формат</th><th>План</th><th>Идеи</th><th>Факт</th><th>Статус</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="g4-smm-summary-meta-row-v346">
      <section class="g4-smm-quarter-compact-v346">
        <div>
          <strong>${escapeHtml(quarterLabel)} · Основные публикации</strong>
          <span>${quarterPublished}/${quarterTarget}</span>
          <small>Осталось: ${Math.max(0, quarterTarget - quarterPublished)}</small>
        </div>
        <div class="g4-smm-quarter-progress-v346" aria-label="Прогресс квартальной цели">
          <span style="width:${quarterProgress}%"></span>
        </div>
      </section>
      <div class="g4-smm-summary-bank-v346">
        <span>В банке: <strong>${summary.plan.unscheduled}</strong></span>
        ${summary.plan.unclassified ? `<span>Без задачи: <strong>${summary.plan.unclassified}</strong></span>` : ""}
      </div>
    </div>
    <div class="g4-smm-summary-signals-v346">
      <details class="gate1-final-unmatched-v259" data-g4-smm-unused-pairs-v299>
        <summary>Форматы без использования <strong>${summary.unusedPairs.length}</strong> <span>›</span></summary>
        <div class="gate1-final-unmatched-list-v259">${summary.unusedPairs.map((pair) => `<span>${escapeHtml(pair.format)} → ${escapeHtml(pair.platform)}</span>`).join("") || "<span>Все предусмотренные пары использовались</span>"}</div>
      </details>
      <details class="gate1-final-unmatched-v259" data-g4-smm-stale-topics-v299>
        <summary>Темы без использования <strong>${summary.staleTopics.length}</strong> <span>›</span></summary>
        <div class="gate1-final-unmatched-list-v259">${summary.staleTopics.map((topic) => `<span>${escapeHtml(topic.value)}</span>`).join("") || "<span>Все темы использовались за последние три недели</span>"}</div>
      </details>
    </div>
  </section>`;
}

function g4SmmContentSystemHtmlV299(activeProduct = null) {
  const content = g4SmmContentEnsureV299();
  const strategy = g4SmmStrategyEnsureV298();
  if (!content || !strategy) return "";
  const linkedPublicationIds = new Set(
    content.ideas.map((idea) => g4SmmPublicationForIdeaV324(idea, content)?.id).filter(Boolean),
  );
  const orphanPublications = content.publications.filter(
    (publication) => !linkedPublicationIds.has(publication.id),
  );
  return `<div class="g4-smm-content-system-v299" data-g4-smm-content-system-v299>
      <section class="g4-smm-content-section-v299" data-g4-smm-ideas-v299>
        <div class="g4-smm-content-section-head-v299"><div><h4>Карточки идей · метод Джеймса Уэбба Янга</h4><p class="g1-task">Пять стадий доступны одновременно и не блокируют друг друга.</p></div><span>${content.ideas.length}</span></div>
        <div class="g4-smm-new-idea-v299">
          <button type="button" class="small-btn add-inline-btn" data-g4-smm-idea-add-v299 ${activeProduct?.id ? "" : "disabled"}>+ Новая идея</button>
        </div>
        <div class="g4-smm-idea-list-v299">${content.ideas.map((idea, index) => g4SmmIdeaHtmlV299(idea, index, content, strategy)).join("") || '<div class="g1-empty">Идей пока нет. Создайте первую карточку.</div>'}</div>
      </section>

      <section class="g4-smm-content-section-v299" data-g4-smm-publications-v299>
        <div class="g4-smm-content-section-head-v299"><div><h4>Визуализация идей SMM-стратегии</h4><p class="g1-task">Банк сформулированных идей и недельный календарь с переносом drag-and-drop.</p></div><span>${g4SmmIdeaCountLabelV322(content.ideas.filter((idea) => guruV185Text(idea?.insight)).length)}</span></div>
        ${g4SmmActionSummaryHtmlV299(content, strategy)}
        ${g4SmmWeekCalendarHtmlV322(content, strategy)}
        ${orphanPublications.length ? `<div class="g4-smm-publication-list-v299" data-g4-smm-orphan-publications-v324><strong>Публикации без исходной карточки идеи</strong>${orphanPublications.map((publication) => g4SmmPublicationHtmlV299(publication, content.publications.findIndex((item) => item.id === publication.id), content, strategy)).join("")}</div>` : ""}
      </section>
  </div>`;
}

function g4SmmContentSystemRefreshV310() {
  const current = document.querySelector("[data-g4-smm-content-system-v299]");
  if (!current) return;
  current.outerHTML = g4SmmContentSystemHtmlV299(g4ProductPickSelected(state));
}

function g4SmmPlanningRefreshV322() {
  const content = g4SmmContentEnsureV299();
  const strategy = g4SmmStrategyEnsureV298();
  if (!content || !strategy) return;
  const calendar = document.querySelector("[data-g4-smm-week-calendar-v322]");
  if (calendar) calendar.outerHTML = g4SmmWeekCalendarHtmlV322(content, strategy);
  const summary = document.querySelector("[data-g4-smm-action-summary-v299]");
  if (summary) summary.outerHTML = g4SmmActionSummaryHtmlV299(content, strategy);
}

function g4SmmCreateIdeaV299(productId = "", seed = {}) {
  const content = g4SmmContentEnsureV299();
  if (!content) return null;
  const now = new Date().toISOString();
  const idea = {
    id: makeId("g4-smm-idea"),
    name: "",
    productId: guruV185Text(productId),
    stage: "collection",
    digestionNotes: "",
    primaryTaskFormatId: guruV185Text(seed?.primaryTaskFormatId),
    topicId: guruV185Text(seed?.topicId),
    insight: "",
    planningPeriodStart: g4SmmDateValueV299(seed?.planningPeriodStart)
      ? guruV185Text(seed.planningPeriodStart)
      : "",
    scheduledDate: g4SmmDateValueV299(seed?.scheduledDate) ? guruV185Text(seed.scheduledDate) : "",
    publicationId: "",
    createdAt: now,
    updatedAt: now,
  };
  content.ideas.push(idea);
  g4SmmContentTouchV299(idea);
  return idea;
}

function g4SmmPublicationFromIdeaV299(idea) {
  const content = g4SmmContentEnsureV299();
  if (!content || !idea) return null;
  const storedIdea = content.ideas.find((row) => row.id === idea.id) || idea;
  const existing = storedIdea.publicationId
    ? content.publications.find((publication) => publication.id === storedIdea.publicationId)
    : null;
  if (existing) return existing;
  const now = new Date().toISOString();
  const strategy = g4SmmStrategyEnsureV298();
  const sourceFormat = (strategy?.formats || []).find((row) =>
    guruV185Text(row?.id) === guruV185Text(storedIdea.primaryTaskFormatId),
  ) || null;
  const sourceTopic = sourceFormat
    ? g4SmmFormatTopicsV308(sourceFormat, strategy).find((topic) =>
      guruV185Text(topic?.id) === guruV185Text(storedIdea.topicId),
    ) || null
    : null;
  const publication = {
    id: makeId("g4-smm-publication"),
    sourceIdeaId: storedIdea.id,
    productId: storedIdea.productId,
    topicId: guruV185Text(sourceTopic?.id),
    topicLabel: guruV185Text(sourceTopic?.value),
    formatId: guruV185Text(sourceFormat?.id),
    formatLabel: guruV185Text(sourceFormat?.format),
    platforms: sourceFormat ? g4SmmFormatPlatformsV299(sourceFormat) : [],
    date: "",
    link: "",
    status: "not_started",
    title: "",
    description: storedIdea.digestionNotes,
    creativeBrief: {
      hook: "",
      promise: "",
      storyboard: "",
      proof: "",
      cta: "",
      durationSeconds: "",
      checks: Object.fromEntries(G4_SMM_STORYBOARD_PHASES_V344.map((phase) => [phase.key, false])),
    },
    publicationPackage: Object.fromEntries(G4_SMM_PUBLICATION_PACKAGE_FIELDS_V344.map((field) => [field.key, ""])),
    content: "",
    results: Object.fromEntries(G4_SMM_RESULT_METRICS_V299.map(([key]) => [key, ""])),
    sourceContext: g4SmmCaptureIdeaContextV299(storedIdea),
    createdAt: now,
    updatedAt: now,
  };
  content.publications.push(publication);
  storedIdea.publicationId = publication.id;
  storedIdea.stage = "verification";
  storedIdea.updatedAt = now;
  g4SmmContentTouchV299(publication);
  return publication;
}

function g4SmmContentRecordV299(kind, id) {
  const content = g4SmmContentEnsureV299();
  if (!content) return { content: null, record: null };
  const rows = kind === "idea" ? content.ideas : content.publications;
  return {
    content,
    record: rows.find((row) => row.id === guruV185Text(id)) || null,
  };
}

function g4SmmIdeaCanEditV330(idea, content = g4SmmContentEnsureV299()) {
  if (!idea) return false;
  return !g4SmmPublicationForIdeaV324(idea, content) || g4SmmIdeaEditingIdsV330.has(idea.id);
}

function g4SmmRefreshPublicationVerdictsV299() {
  const content = g4SmmContentEnsureV299();
  if (!content) return;
  document.querySelectorAll("[data-g4-smm-verdict-v299]").forEach((node) => {
    const publication = content.publications.find(
      (row) => row.id === node.dataset.g4SmmPublicationIdV299,
    );
    const metricKey = node.dataset.g4SmmVerdictV299;
    if (!publication || !G4_SMM_RESULT_METRICS_V299.some(([key]) => key === metricKey)) return;
    node.outerHTML = g4SmmMetricVerdictHtmlV299(publication, metricKey, content);
  });
}

document.addEventListener("input", (event) => {
  const target = event.target;
  if (target?.matches?.("[data-g4-smm-period-count-v304]")) {
    const count = Number(target.value);
    if (!Number.isFinite(count) || count <= 0) return;
    const strategy = g4SmmStrategyEnsureV298();
    strategy.planningPeriod.count = Math.min(999, Math.round(count));
    g4SmmRefreshPeriodProjectionV304();
    saveState();
    return;
  }
  const ideaField = target?.dataset?.g4SmmIdeaFieldV299;
  const ideaId = target?.dataset?.g4SmmIdeaIdV299;
  if (ideaField && ideaId && ["name", "digestionNotes", "insight"].includes(ideaField)) {
    const { content, record } = g4SmmContentRecordV299("idea", ideaId);
    if (!record || !g4SmmIdeaCanEditV330(record, content)) return;
    record[ideaField] = target.value;
    g4SmmContentTouchV299(record);
    /* Название, «Мысли / связи» и «Идея» — рабочий авторский ввод. Поля пишем
       локально на каждом input, чтобы hard reload не попадал в 450-мс окно
       общего debounce. Облачная отправка остаётся одна, от flashSaving. */
    if (ideaField === "name") {
      const strategy = g4SmmStrategyEnsureV298();
      const ideaIndex = Math.max(0, content.ideas.findIndex((row) => row.id === ideaId));
      const ideaCardTitle = document.querySelector(
        `[data-g4-smm-idea-card-v299="${CSS.escape(ideaId)}"] [data-g4-smm-idea-card-title-v332]`,
      );
      if (ideaCardTitle)
        ideaCardTitle.textContent = g4SmmIdeaDisplayTitleV333(record, ideaIndex, content, strategy);
      g4SmmPlanningRefreshV322();
    }
    if (ideaField === "insight") {
      document.querySelectorAll(`[data-g4-smm-brief-meaning-v325="${CSS.escape(ideaId)}"]`).forEach((node) => {
        node.textContent = guruV185Text(record.insight) || "Идея пока не сформулирована";
        node.classList.toggle("is-filled", Boolean(guruV185Text(record.insight)));
        node.classList.toggle("is-empty", !guruV185Text(record.insight));
      });
      g4SmmPlanningRefreshV322();
    }
    if (typeof guruPersistStateFast === "function")
      guruPersistStateFast({ quiet: true, cloud: false });
    return;
  }

  const publicationId = target?.dataset?.g4SmmPublicationIdV299;
  const briefField = target?.dataset?.g4SmmBriefFieldV325;
  if (publicationId && briefField && ["hook", "promise", "storyboard", "proof", "cta", "durationSeconds"].includes(briefField)) {
    const { record } = g4SmmContentRecordV299("publication", publicationId);
    if (!record) return;
    record.creativeBrief = record.creativeBrief && typeof record.creativeBrief === "object"
      ? record.creativeBrief
      : { hook: "", promise: "", storyboard: "", proof: "", cta: "", durationSeconds: "", checks: {} };
    record.creativeBrief[briefField] = target.value;
    g4SmmContentTouchV299(record);
    if (typeof guruPersistStateFast === "function")
      guruPersistStateFast({ quiet: true, cloud: false });
    g4SmmPublicationPackageRefreshV344(publicationId);
    return;
  }
  const packageField = target?.dataset?.g4SmmPackageFieldV344;
  if (publicationId && packageField && G4_SMM_PUBLICATION_PACKAGE_FIELDS_V344.some((field) => field.key === packageField)) {
    const { record } = g4SmmContentRecordV299("publication", publicationId);
    if (!record) return;
    record.publicationPackage = record.publicationPackage && typeof record.publicationPackage === "object"
      ? record.publicationPackage
      : {};
    record.publicationPackage[packageField] = target.value;
    g4SmmContentTouchV299(record);
    if (typeof guruPersistStateFast === "function")
      guruPersistStateFast({ quiet: true, cloud: false });
    g4SmmPublicationPackageRefreshV344(publicationId);
    return;
  }
  const publicationField = target?.dataset?.g4SmmPublicationFieldV299;
  if (publicationId && publicationField && ["title", "description", "content", "link", "date"].includes(publicationField)) {
    const { content, record } = g4SmmContentRecordV299("publication", publicationId);
    if (!record) return;
    record[publicationField] = target.value;
    g4SmmContentTouchV299(record);
    if (publicationField === "title") {
      const publicationIndex = Math.max(0, content.publications.findIndex((row) => row.id === publicationId));
      const cardTitle = document.querySelector(
        `[data-g4-smm-publication-card-v299="${CSS.escape(publicationId)}"] [data-g4-smm-publication-card-title-v331]`,
      );
      if (cardTitle)
        cardTitle.textContent = g4SmmPublicationCardTitleV331(
          record,
          publicationIndex,
        );
    }
    /* Карточка контента — рабочий длинный ввод. Сохраняем актуальный снимок
       локально на каждом input, чтобы hard reload не мог попасть в 450-мс
       окно общего debounce. Облачная запись остаётся одна, от flashSaving. */
    if (typeof guruPersistStateFast === "function")
      guruPersistStateFast({ quiet: true, cloud: false });
    g4SmmPublicationPackageRefreshV344(publicationId);
    return;
  }

  const metricKey = target?.dataset?.g4SmmPublicationResultV299;
  if (publicationId && metricKey && G4_SMM_RESULT_METRICS_V299.some(([key]) => key === metricKey)) {
    const { record } = g4SmmContentRecordV299("publication", publicationId);
    if (!record) return;
    record.results[metricKey] = target.value;
    g4SmmContentTouchV299(record);
    if (typeof guruPersistStateFast === "function")
      guruPersistStateFast({ quiet: true, cloud: false });
    g4SmmRefreshPublicationVerdictsV299();
  }
});

document.addEventListener("change", (event) => {
  const target = event.target;
  const storyboardCheck = target?.dataset?.g4SmmBriefCheckV344;
  const storyboardPublicationId = target?.dataset?.g4SmmPublicationIdV299;
  if (storyboardCheck && storyboardPublicationId && G4_SMM_STORYBOARD_PHASES_V344.some((phase) => phase.key === storyboardCheck)) {
    const { record } = g4SmmContentRecordV299("publication", storyboardPublicationId);
    if (!record) return;
    record.creativeBrief = record.creativeBrief && typeof record.creativeBrief === "object"
      ? record.creativeBrief
      : { checks: {} };
    record.creativeBrief.checks = record.creativeBrief.checks && typeof record.creativeBrief.checks === "object"
      ? record.creativeBrief.checks
      : {};
    record.creativeBrief.checks[storyboardCheck] = Boolean(target.checked);
    g4SmmContentTouchV299(record);
    if (typeof guruPersistStateFast === "function")
      guruPersistStateFast({ quiet: true, cloud: false });
    g4SmmPublicationPackageRefreshV344(storyboardPublicationId);
    return;
  }
  if (target?.matches?.("[data-g4-smm-period-count-v304], [data-g4-smm-period-unit-v304]")) {
    const strategy = g4SmmStrategyEnsureV298();
    if (target.matches("[data-g4-smm-period-count-v304]")) {
      const count = Number(target.value);
      strategy.planningPeriod.count = Number.isFinite(count) && count > 0
        ? Math.min(999, Math.round(count))
        : 1;
    } else {
      strategy.planningPeriod.unit = G4_SMM_PERIOD_UNITS_V304.some((item) => item.key === target.value)
        ? target.value
        : "week";
    }
    saveState();
    renderGate();
    return;
  }
  const calendarDate = target?.dataset?.g4SmmCalendarPlaceV322;
  if (calendarDate) {
    const { record: idea } = g4SmmContentRecordV299("idea", target.value);
    if (!idea || !guruV185Text(idea.insight) || !g4SmmDateValueV299(calendarDate)) return;
    idea.scheduledDate = calendarDate;
    g4SmmContentTouchV299(idea);
    if (typeof guruPersistStateFast === "function")
      guruPersistStateFast({ quiet: false, durable: true });
    g4SmmPlanningRefreshV322();
    return;
  }
  const ideaId = target?.dataset?.g4SmmIdeaIdV299;
  const ideaField = target?.dataset?.g4SmmIdeaFieldV299;
  if (ideaId && ideaField === "productId") {
    const { content, record } = g4SmmContentRecordV299("idea", ideaId);
    if (!record || !g4SmmIdeaCanEditV330(record, content)) return;
    record[ideaField] = target.value;
    g4SmmContentTouchV299(record);
    renderGate();
    return;
  }
  if (ideaId && ideaField === "primaryTaskFormatId") {
    const { content, record } = g4SmmContentRecordV299("idea", ideaId);
    if (!record || !g4SmmIdeaCanEditV330(record, content)) return;
    const strategy = g4SmmStrategyEnsureV298();
    record.primaryTaskFormatId = (strategy?.formats || []).some((row) =>
      guruV185Text(row?.id) === target.value,
    ) ? target.value : "";
    const selectedFormat = (strategy?.formats || []).find((row) =>
      guruV185Text(row?.id) === record.primaryTaskFormatId,
    );
    const allowedTopics = selectedFormat ? g4SmmFormatTopicsV308(selectedFormat, strategy) : [];
    if (!allowedTopics.some((topic) => guruV185Text(topic?.id) === guruV185Text(record.topicId)))
      record.topicId = "";
    g4SmmContentTouchV299(record);
    saveState();
    renderGate();
    return;
  }
  if (ideaId && ideaField === "topicId") {
    const { content, record } = g4SmmContentRecordV299("idea", ideaId);
    if (!record || !g4SmmIdeaCanEditV330(record, content)) return;
    const strategy = g4SmmStrategyEnsureV298();
    const selectedFormat = (strategy?.formats || []).find((row) =>
      guruV185Text(row?.id) === guruV185Text(record.primaryTaskFormatId),
    );
    const allowedTopics = selectedFormat ? g4SmmFormatTopicsV308(selectedFormat, strategy) : [];
    record.topicId = allowedTopics.some((topic) => guruV185Text(topic?.id) === target.value)
      ? target.value
      : "";
    g4SmmContentTouchV299(record);
    saveState();
    renderGate();
    return;
  }

  const publicationId = target?.dataset?.g4SmmPublicationIdV299;
  const publicationField = target?.dataset?.g4SmmPublicationFieldV299;
  if (!publicationId || !publicationField) return;
  const { record } = g4SmmContentRecordV299("publication", publicationId);
  if (!record) return;
  const strategy = g4SmmStrategyEnsureV298();

  if (publicationField === "platforms") {
    if (target.matches("[data-g4-smm-platform-option-v335]")) {
      const card = target.closest("[data-g4-smm-publication-card-v299]");
      record.platforms = [...card.querySelectorAll("[data-g4-smm-platform-option-v335]:checked")]
        .map((option) => option.value);
    } else {
      record.platforms = [...target.selectedOptions].map((option) => option.value);
    }
  } else if (publicationField === "formatId") {
    record.formatId = target.value;
    const format = (strategy?.formats || []).find((row) => row.id === record.formatId);
    record.formatLabel = guruV185Text(format?.format) || record.formatLabel;
    record.platforms = format ? g4SmmFormatPlatformsV299(format) : record.platforms;
  } else if (publicationField === "topicId") {
    record.topicId = target.value;
    const topic = (strategy?.topics || []).find((row) => row.id === record.topicId);
    record.topicLabel = guruV185Text(topic?.value) || record.topicLabel;
  } else if (["status", "date", "link"].includes(publicationField)) {
    record[publicationField] = target.value;
  } else {
    return;
  }
  g4SmmContentTouchV299(record);
  renderGate();
});

function g4SmmCalendarDragCleanupV339() {
  document.querySelectorAll(".is-g4-smm-dragging-v339").forEach((node) =>
    node.classList.remove("is-g4-smm-dragging-v339"),
  );
  document.querySelectorAll(".is-g4-smm-drag-over-v339").forEach((node) =>
    node.classList.remove("is-g4-smm-drag-over-v339"),
  );
}

document.addEventListener("dragstart", (event) => {
  const card = event.target?.closest?.("[data-g4-smm-calendar-drag-v339]");
  if (!card || !event.dataTransfer) return;
  const ideaId = guruV185Text(card.dataset.g4SmmCalendarDragV339);
  if (!ideaId) return;
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/g4-smm-idea", ideaId);
  event.dataTransfer.setData("text/plain", ideaId);
  card.classList.add("is-g4-smm-dragging-v339");
});

document.addEventListener("dragover", (event) => {
  const target = event.target?.closest?.("[data-g4-smm-calendar-drop-v339]");
  if (!target) return;
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
  document.querySelectorAll(".is-g4-smm-drag-over-v339").forEach((node) => {
    if (node !== target) node.classList.remove("is-g4-smm-drag-over-v339");
  });
  target.classList.add("is-g4-smm-drag-over-v339");
});

document.addEventListener("dragleave", (event) => {
  const target = event.target?.closest?.("[data-g4-smm-calendar-drop-v339]");
  if (!target || target.contains(event.relatedTarget)) return;
  target.classList.remove("is-g4-smm-drag-over-v339");
});

document.addEventListener("drop", (event) => {
  const target = event.target?.closest?.("[data-g4-smm-calendar-drop-v339]");
  if (!target) return;
  event.preventDefault();
  const ideaId = guruV185Text(
    event.dataTransfer?.getData("text/g4-smm-idea") ||
    event.dataTransfer?.getData("text/plain"),
  );
  const { record: idea } = g4SmmContentRecordV299("idea", ideaId);
  if (!idea || !guruV185Text(idea.insight)) {
    g4SmmCalendarDragCleanupV339();
    return;
  }
  const destination = guruV185Text(target.dataset.g4SmmCalendarDropV339);
  idea.scheduledDate = destination === "bank" ? "" : destination;
  g4SmmContentTouchV299(idea);
  if (typeof guruPersistStateFast === "function")
    guruPersistStateFast({ quiet: false, durable: true });
  g4SmmCalendarDragCleanupV339();
  g4SmmPlanningRefreshV322();
});

document.addEventListener("dragend", g4SmmCalendarDragCleanupV339);

document.addEventListener("click", (event) => {
  const workflowModeButton = event.target?.closest?.("[data-g4-smm-workflow-mode-v342]");
  if (workflowModeButton) {
    event.preventDefault();
    const ideaId = guruV185Text(workflowModeButton.dataset.g4SmmIdeaIdV299);
    const publicationId = guruV185Text(workflowModeButton.dataset.g4SmmPublicationIdV299);
    const { content, record: idea } = g4SmmContentRecordV299("idea", ideaId);
    const publication = g4SmmContentRecordV299("publication", publicationId).record;
    if (!idea || !publication || g4SmmPublicationForIdeaV324(idea, content)?.id !== publication.id) return;
    if (workflowModeButton.dataset.g4SmmWorkflowModeV342 === "edit") {
      g4SmmIdeaEditingIdsV330.add(ideaId);
      g4SmmPublicationEditingIdsV328.add(publicationId);
    } else {
      g4SmmIdeaEditingIdsV330.delete(ideaId);
      g4SmmPublicationEditingIdsV328.delete(publicationId);
      if (typeof guruPersistStateFast === "function") guruPersistStateFast({ quiet: true });
    }
    renderGate();
    g4SmmContentSystemRefreshV310();
    requestAnimationFrame(() => document.querySelector(
      `[data-g4-smm-idea-workflow-v324="${CSS.escape(ideaId)}"]`,
    )?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
    return;
  }

  const ideaModeButton = event.target?.closest?.("[data-g4-smm-idea-mode-v330]");
  if (ideaModeButton) {
    event.preventDefault();
    const ideaId = guruV185Text(ideaModeButton.dataset.g4SmmIdeaIdV299);
    const { content, record: idea } = g4SmmContentRecordV299("idea", ideaId);
    if (!idea || !g4SmmPublicationForIdeaV324(idea, content)) return;
    if (ideaModeButton.dataset.g4SmmIdeaModeV330 === "edit") {
      g4SmmIdeaEditingIdsV330.add(ideaId);
    } else {
      g4SmmIdeaEditingIdsV330.delete(ideaId);
      if (typeof guruPersistStateFast === "function") guruPersistStateFast({ quiet: true });
    }
    renderGate();
    // Режим редактирования не меняет workspace, поэтому обычный кэш Gate
    // может вернуть прежнюю разметку. Принудительно обновляем только SMM-блок.
    g4SmmContentSystemRefreshV310();
    requestAnimationFrame(() => document.querySelector(
      `[data-g4-smm-idea-card-v299="${CSS.escape(ideaId)}"]`,
    )?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
    return;
  }

  const publicationModeButton = event.target?.closest?.("[data-g4-smm-publication-mode-v328]");
  if (publicationModeButton) {
    event.preventDefault();
    const publicationId = guruV185Text(publicationModeButton.dataset.g4SmmPublicationIdV299);
    if (!g4SmmContentRecordV299("publication", publicationId).record) return;
    if (publicationModeButton.dataset.g4SmmPublicationModeV328 === "edit") {
      g4SmmPublicationEditingIdsV328.add(publicationId);
    } else {
      g4SmmPublicationEditingIdsV328.delete(publicationId);
      if (typeof guruPersistStateFast === "function") guruPersistStateFast({ quiet: true });
    }
    renderGate();
    // Режим редактирования не меняет workspace, поэтому обычный кэш Gate
    // может вернуть прежнюю разметку. Принудительно обновляем только SMM-блок.
    g4SmmContentSystemRefreshV310();
    requestAnimationFrame(() => document.querySelector(
      `[data-g4-smm-publication-card-v299="${CSS.escape(publicationId)}"]`,
    )?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
    return;
  }

  const summaryFormatRow = event.target?.closest?.("[data-g4-smm-summary-format-focus-v346]");
  if (summaryFormatRow) {
    const formatId = guruV185Text(summaryFormatRow.dataset.g4SmmSummaryFormatFocusV346);
    const formatRow = document.querySelector(`[data-g4-smm-format-row-v298="${CSS.escape(formatId)}"]`);
    if (formatRow) {
      formatRow.scrollIntoView({ behavior: "smooth", block: "center" });
      formatRow.classList.add("is-focus-v346");
      setTimeout(() => formatRow.classList.remove("is-focus-v346"), 1400);
    }
    return;
  }

  const weekShift = event.target?.closest?.("[data-g4-smm-week-shift-v322]");
  const weekToday = event.target?.closest?.("[data-g4-smm-week-today-v322]");
  if (weekShift || weekToday) {
    event.preventDefault();
    const content = g4SmmContentEnsureV299();
    const start = weekToday
      ? g4SmmStartOfWeekV299(new Date())
      : g4SmmCalendarWeekStartV322(content);
    if (weekShift) start.setDate(start.getDate() + Number(weekShift.dataset.g4SmmWeekShiftV322 || 0));
    content.calendarWeekStart = g4SmmIsoDateV322(start);
    g4SmmContentTouchV299();
    if (typeof guruPersistStateFast === "function") guruPersistStateFast({ quiet: true });
    g4SmmPlanningRefreshV322();
    return;
  }

  const unscheduleButton = event.target?.closest?.("[data-g4-smm-calendar-unschedule-v322]");
  if (unscheduleButton) {
    event.preventDefault();
    const { record: idea } = g4SmmContentRecordV299(
      "idea",
      unscheduleButton.dataset.g4SmmCalendarUnscheduleV322,
    );
    if (!idea) return;
    idea.scheduledDate = "";
    g4SmmContentTouchV299(idea);
    if (typeof guruPersistStateFast === "function")
      guruPersistStateFast({ quiet: false, durable: true });
    g4SmmPlanningRefreshV322();
    return;
  }

  const topicIdeaButton = event.target?.closest?.("[data-g4-smm-topic-idea-add-v345]");
  if (topicIdeaButton) {
    event.preventDefault();
    const selectedProduct = g4ProductPickSelected(state);
    const productId = guruV185Text(topicIdeaButton.dataset.g4SmmProductIdV345) ||
      (selectedProduct ? g4ProductPickKey(selectedProduct, state) : "");
    if (!productId) return;
    const strategy = g4SmmStrategyEnsureV298();
    const formatId = guruV185Text(topicIdeaButton.dataset.g4SmmFormatIdV345);
    const topicId = guruV185Text(topicIdeaButton.dataset.g4SmmTopicIdV345);
    const format = (strategy?.formats || []).find((row) => guruV185Text(row?.id) === formatId);
    if (!format || !g4SmmFormatTopicsV308(format, strategy).some((topic) =>
      guruV185Text(topic?.id) === topicId))
      return;
    const idea = g4SmmCreateIdeaV299(productId, { primaryTaskFormatId: formatId, topicId });
    renderGate();
    requestAnimationFrame(() => document.querySelector(
      `[data-g4-smm-idea-card-v299="${CSS.escape(idea?.id || "")}"]`,
    )?.scrollIntoView({ behavior: "smooth", block: "center" }));
    return;
  }

  const addButton = event.target?.closest?.("[data-g4-smm-idea-add-v299]");
  if (addButton) {
    event.preventDefault();
    const selectedProduct = g4ProductPickSelected(state);
    const productId = selectedProduct
      ? g4ProductPickKey(selectedProduct, state)
      : "";
    if (!productId) return;
    const idea = g4SmmCreateIdeaV299(productId);
    renderGate();
    requestAnimationFrame(() => document.querySelector(
      `[data-g4-smm-idea-card-v299="${CSS.escape(idea?.id || "")}"]`,
    )?.scrollIntoView({ behavior: "smooth", block: "center" }));
    return;
  }

  const convertButton = event.target?.closest?.("[data-g4-smm-idea-convert-v299]");
  if (!convertButton) return;
  event.preventDefault();
  const { record: idea } = g4SmmContentRecordV299(
    "idea",
    convertButton.dataset.g4SmmIdeaConvertV299,
  );
  if (!idea) return;
  const publication = g4SmmPublicationFromIdeaV299(idea);
  renderGate();
  g4SmmContentSystemRefreshV310();
  requestAnimationFrame(() => document.querySelector(
    `[data-g4-smm-publication-card-v299="${CSS.escape(publication?.id || "")}"]`,
  )?.scrollIntoView({ behavior: "smooth", block: "start" }));
});

const G4_FUNNEL_STAGE_META_V294 = Object.freeze({
  aware: Object.freeze({ title: "Aware / узнал", order: 1 }),
  appeal: Object.freeze({ title: "Appeal / понравился", order: 2 }),
  ask: Object.freeze({ title: "Ask / изучает", order: 3 }),
  act: Object.freeze({ title: "Act / покупает", order: 4 }),
  advocate: Object.freeze({ title: "Advocate / рекомендует", order: 5 }),
});

/* Карточка остаётся одной сущностью. Все её строки располагаются вместе,
   а рабочие значения по-прежнему живут по card.id + row.key. */
const G4_FUNNEL_CARD_STAGE_V294 = Object.freeze({
  "card-148": "act",
  "card-151": "act",
  "card-152": "ask",
  "card-153": "ask",
  "card-154": "ask",
  "card-155": "ask",
  "card-156": "ask",
  "card-157": "ask",
  "card-158": "ask",
  "card-159": "ask",
  "card-160": "appeal",
  "card-161": "appeal",
  "card-162": "appeal",
  "card-163": "appeal",
  "card-164": "act",
  "card-165": "act",
  "card-166": "act",
  "card-167": "act",
  "card-168": "act",
  "card-169": "act",
});

/* Только подтверждённые смысловые связи. Отсутствие записи означает
   законно ручную строку: её поля status/result/link/comment не меняются. */
const G4_FUNNEL_ROW_SOURCES_V294 = Object.freeze({
  "card-151": Object.freeze({
    "crm_crm": Object.freeze(["crm"]),
    "выбрать_1_главное_действие_заявка_звонок_сообщение_заказ_бронирование": Object.freeze(["cta"]),
    "итоговый_результат_блока": Object.freeze(["cta"]),
  }),
  "card-152": Object.freeze({
    "формы_формы": Object.freeze(["forms"]),
    "проверить_что_на_странице_есть_оффер_для_кого_в_чем_польза_почему_доверять_примеры_кейсы_cta_контакты_форма": Object.freeze(["page"]),
    "итоговый_результат_блока": Object.freeze(["page"]),
  }),
  "card-153": Object.freeze({
    "проверить_порядок_блоков_проблема_задача_решение_выгоды_доверие_снятие_возражений_действие": Object.freeze(["page"]),
    "итоговый_результат_блока": Object.freeze(["page"]),
  }),
  "card-154": Object.freeze({
    "итоговый_результат_блока": Object.freeze(["page"]),
  }),
  "card-155": Object.freeze({
    "crm_crm": Object.freeze(["crm"]),
    "формы_формы": Object.freeze(["forms", "contacts"]),
    "итоговый_результат_блока": Object.freeze(["forms", "contacts", "crm"]),
  }),
  "card-156": Object.freeze({
    "pagespeed_insights_pagespeed_insights": Object.freeze(["mobile"]),
    "проверить_первый_экран_читаемость_текста_кнопки_формы_скорость_отступы_порядок_блоков": Object.freeze(["mobile", "page"]),
    "итоговый_результат_блока": Object.freeze(["mobile", "page"]),
  }),
  "card-157": Object.freeze({
    "яндекс_метрика_яндекс_метрика": Object.freeze(["analytics"]),
    "crm_crm": Object.freeze(["crm"]),
    "проверить_счетчик_цели_на_формы_клики_по_телефону_мессенджеры_thank_you_page_событие_отправки": Object.freeze(["analytics"]),
    "итоговый_результат_блока": Object.freeze(["analytics"]),
  }),
  "card-158": Object.freeze({
    "яндекс_директ_яндекс_директ": Object.freeze(["yandex_channel"]),
    "crm_crm": Object.freeze(["crm"]),
    "utm_utm": Object.freeze(["utm"]),
    "зафиксировать_единый_шаблон_меток_для_всех_кампаний_и_проверить_что_параметры_доходят_до_аналитики_crm": Object.freeze(["utm", "analytics", "crm"]),
  }),
  "card-159": Object.freeze({
    "crm_crm": Object.freeze(["crm"]),
    "проверить_путь_лида_форма_уведомление_crm_таблица_статус_продажа_отказ": Object.freeze(["forms", "crm"]),
    "итоговый_результат_блока": Object.freeze(["crm"]),
  }),
  "card-164": Object.freeze({
    "яндекс_директ_яндекс_директ": Object.freeze(["yandex_channel"]),
  }),
  "card-166": Object.freeze({
    "яндекс_директ_яндекс_директ": Object.freeze(["yandex_channel"]),
  }),
  "card-168": Object.freeze({
    "crm_crm": Object.freeze(["crm"]),
    "зафиксировать_кто_отвечает_как_быстро_отвечает_что_пишет_говорит_первым_сообщением_как_ставится_статус": Object.freeze(["crm"]),
    "итоговый_результат_блока": Object.freeze(["crm"]),
  }),
  "card-169": Object.freeze({
    "crm_crm": Object.freeze(["crm"]),
    "оффер": Object.freeze(["offer"]),
    "сегмент": Object.freeze(["segment"]),
    "страница": Object.freeze(["page"]),
    "формы": Object.freeze(["forms"]),
    "аналитика": Object.freeze(["analytics"]),
    "обработка_лида": Object.freeze(["crm"]),
  }),
});

const G4_FUNNEL_SOURCE_LABELS_V294 = Object.freeze({
  product: "Gate 0 · выбранный продукт",
  segment: "Gate 0 · Сегмент",
  positioning: "Gate 0 · Позиционирование",
  usp: "Gate 0 · УТП",
  offer: "Gate 0 · Оффер",
  price: "Gate 1 · Карточка товара · Цена",
  cta: "Gate 1 · Карточка товара · Финальный CTA",
  page: "Gate 1 · Карточка товара",
  forms: "Gate 2 · Формы",
  crm: "Gate 2 · CRM и обработка лидов",
  contacts: "Gate 0 · Контакты",
  mobile: "Gate 0 · Мобильная версия",
  analytics: "Gate 0 · Яндекс Метрика",
  utm: "Gate 0 · UTM-разметка",
  yandex_channel: "Gate 0 · Яндекс Директ",
});

const G4_FUNNEL_ENCODING_REPAIRS_V294 = Object.freeze([
  Object.freeze(["Пр��дукт", "Продукт"]),
  Object.freeze(["фо��мы", "формы"]),
  Object.freeze(["тел��фона", "телефона"]),
  Object.freeze(["на ��ыходе", "на выходе"]),
  Object.freeze(["объявлени��м", "объявлением"]),
  Object.freeze(["обработ��а", "обработка"]),
  Object.freeze(["н�� странице", "на странице"]),
  Object.freeze(["стра��ица", "страница"]),
  Object.freeze(["��разу", "сразу"]),
  Object.freeze(["объявл��ния", "объявления"]),
  Object.freeze(["стран��цы", "страницы"]),
  Object.freeze(["о��ъявление", "объявление"]),
  Object.freeze(["сай��", "сайт"]),
  Object.freeze(["б��оки", "блоки"]),
  Object.freeze(["Отв��чает", "Отвечает"]),
  Object.freeze(["пе��евод", "перевод"]),
]);

function g4FunnelRepairTextV294(value) {
  let next = String(value ?? "");
  G4_FUNNEL_ENCODING_REPAIRS_V294.forEach(([broken, fixed]) => {
    next = next.split(broken).join(fixed);
  });
  return g4FixBannerEncodingV522(next);
}

function g4FunnelRepairWorkspaceV294(workspace = state) {
  const cards = workspace?.gates
    ?.find((gate) => gate.id === "gate-4")
    ?.cards?.filter((card) => G4_FUNNEL_CARD_STAGE_V294[card.id]) || [];
  const before = {
    cards: cards.length,
    rows: cards.reduce(
      (sum, card) => sum + (Array.isArray(card.instructionRows) ? card.instructionRows.length : 0),
      0,
    ),
    campaigns: Object.keys(workspace?.gate4Production?.campaigns || {}).length,
  };
  const repaired = [];
  const repair = (owner, field) => {
    if (!owner || typeof owner[field] !== "string") return;
    const previous = owner[field];
    const next = g4FunnelRepairTextV294(previous);
    if (next === previous) return;
    owner[field] = next;
    repaired.push({ field, from: previous, to: next });
  };
  cards.forEach((card) => {
    repair(card, "title");
    repair(card, "instruction");
    (Array.isArray(card.instructionRows) ? card.instructionRows : []).forEach((row) => {
      ["element", "tool", "serviceLabel", "comment", "methodHint"].forEach((field) =>
        repair(row, field),
      );
    });
  });
  const after = {
    cards: cards.length,
    rows: cards.reduce(
      (sum, card) => sum + (Array.isArray(card.instructionRows) ? card.instructionRows.length : 0),
      0,
    ),
    campaigns: Object.keys(workspace?.gate4Production?.campaigns || {}).length,
  };
  if (workspace?.project) {
    const previousLog = workspace.project._gate4FunnelRestructureLogV294;
    if (
      repaired.length ||
      previousLog?.id !== G4_FUNNEL_READINESS_VERSION_V294 ||
      previousLog?.cardsAfter !== after.cards ||
      previousLog?.rowsAfter !== after.rows ||
      previousLog?.campaignsAfter !== after.campaigns
    ) workspace.project._gate4FunnelRestructureLogV294 = {
      id: G4_FUNNEL_READINESS_VERSION_V294,
      status: "completed",
      cardsBefore: before.cards,
      cardsAfter: after.cards,
      rowsBefore: before.rows,
      rowsAfter: after.rows,
      campaignsBefore: before.campaigns,
      campaignsAfter: after.campaigns,
      deletedCards: 0,
      deletedRows: 0,
      deletedCampaigns: 0,
      repairedEncoding: repaired.length,
      updatedAt: new Date().toISOString(),
    };
  }
  return { before, after, repaired };
}

const __g4FunnelPrevMigrateWorkspaceV294 = migrateWorkspace;
migrateWorkspace = function (workspace, projectId) {
  const migrated = __g4FunnelPrevMigrateWorkspaceV294(workspace, projectId);
  g4FunnelRepairWorkspaceV294(migrated);
  return migrated;
};

const __g4FunnelPrevFreshWorkspaceV294 = createFreshWorkspace;
createFreshWorkspace = function (meta) {
  const workspace = __g4FunnelPrevFreshWorkspaceV294(meta);
  g4FunnelRepairWorkspaceV294(workspace);
  return workspace;
};

function g4FunnelReadinessStageV294(cardId) {
  return G4_FUNNEL_CARD_STAGE_V294[cardId] || "outside";
}

function g4FunnelReadinessRowTokensV294(card, row) {
  return G4_FUNNEL_ROW_SOURCES_V294[card?.id]?.[row?.key] || [];
}

function g4FunnelSourceStatusV294(value, fallback = "") {
  const canonical = guruCanonStatus(fallback);
  if (guruStatusIsBad(canonical)) return "problem";
  if (guruStatusIsOk(canonical)) return "ready";
  if (canonical || g3ExecutionHasMeaningfulValueV282(value)) return "in_progress";
  return "not_started";
}

function g4FunnelGate0RowSourceV294(snapshot, collection, name, label) {
  const gate = state?.gates?.find((item) => item.id === "gate-0");
  const card = gate?.cards?.find(isMegaMarketingCard) || null;
  const marketing = card?.megaMarketing || {};
  const rows = collection === "fundamental"
    ? marketing.platformV2?.fundamental || []
    : collection === "channels"
      ? marketing.channels || []
      : marketing.infra || [];
  const index = rows.findIndex((row) => {
    if (collection !== "channels") return guruV185Text(row?.name) === name;
    return new RegExp(name, "i").test(
      g3AutoJoin([row?.channel, row?.platform, row?.type], " "),
    );
  });
  const row = index >= 0 ? rows[index] : null;
  const statusLabel = row && guruStatusIsSet(row.status)
    ? guruStatusLabel(row.status)
    : "";
  const value = row
    ? g3AutoJoin(
        collection === "channels"
          ? [row.channel, row.platform, row.type, statusLabel]
          : [row.url, row.comment, row.hint, statusLabel],
        " · ",
      )
    : "";
  return {
    token: label,
    label: G4_FUNNEL_SOURCE_LABELS_V294[label],
    status: row ? g4FunnelSourceStatusV294(value, row.status) : "not_started",
    value,
    target: card
      ? {
          gateId: "gate-0",
          kind: "gate0-readiness-row-v294",
          productId: snapshot.product.id,
          cardId: card.id,
          collection,
          index: Math.max(index, 0),
        }
      : null,
  };
}

function g4FunnelGate2SourceV294(snapshot, resolver, label) {
  const ids = resolver === "forms"
    ? ["card-92"]
    : ["card-122", "card-123", "card-124", "card-126"];
  const gate = state?.gates?.find((item) => item.id === "gate-2");
  const cards = ids
    .map((id) => gate?.cards?.find((card) => card.id === id))
    .filter(Boolean);
  /* Не вызываем g2CardStatus: его законный fallback L может читать эту
     же readiness-карточку Gate 4. Берём только независимые ветки M/F/I/G1,
     чтобы автоматизация не образовывала цикл Gate 4 → Gate 2 → Gate 4. */
  const independentStatus = (card) => {
    const manual = guruV185Text(card?.fields?.g2Check);
    if (manual) return g4FunnelSourceStatusV294("", manual);
    const rule = G2_SYNC_RULES.find((candidate) => {
      candidate.match.lastIndex = 0;
      return candidate.match.test(String(card?.title || ""));
    }) || {};
    const gate0 = g2Gate0Item(rule);
    if (gate0?.status) return g4FunnelSourceStatusV294("", gate0.status);
    const gate1 = rule.g1 ? g2FindGateCard("gate-1", rule.g1) : null;
    if (gate1?.status && gate1.status !== "not_started")
      return gate1.status === "ready"
        ? "ready"
        : gate1.status === "problem"
          ? "problem"
          : "in_progress";
    return "not_started";
  };
  const statuses = cards.map(independentStatus);
  const status = statuses.some((item) => item === "problem")
    ? "problem"
    : statuses.some((item) => item === "ready")
      ? "ready"
      : statuses.some((item) => item === "in_progress")
        ? "in_progress"
        : "not_started";
  const values = cards.map((card, index) =>
    `${card.title}: ${STATUS_LABELS[statuses[index]] || statuses[index]}`,
  );
  return {
    token: label,
    label: G4_FUNNEL_SOURCE_LABELS_V294[label],
    status,
    value: values.join(" · "),
    target: cards[0]
      ? { gateId: "gate-2", kind: "gate2-card", productId: snapshot.product.id, cardId: cards[0].id }
      : null,
  };
}

function g4FunnelScopedSourceV294(snapshot, field, token) {
  const resolved = snapshot.scoped?.[field] || {};
  return {
    token,
    label: G4_FUNNEL_SOURCE_LABELS_V294[token],
    status: g4FunnelSourceStatusV294(resolved.value),
    value: guruV185Text(resolved.value),
    target: g3ProductJourneyScopedTarget(snapshot, field),
  };
}

function g4FunnelPrimitiveSourceV294(token, snapshot) {
  if (token === "product")
    return {
      token,
      label: G4_FUNNEL_SOURCE_LABELS_V294[token],
      status: snapshot.product?.id ? "ready" : "not_started",
      value: snapshot.product?.name || "",
      target: {
        gateId: "gate-0",
        kind: "gate0-scoped",
        productId: snapshot.product.id,
        field: "offers",
        scope: "product",
      },
    };
  if (token === "segment") return g4FunnelScopedSourceV294(snapshot, "segments", token);
  if (token === "positioning") return g4FunnelScopedSourceV294(snapshot, "positioning", token);
  if (token === "usp") return g4FunnelScopedSourceV294(snapshot, "usp", token);
  if (token === "offer") return g4FunnelScopedSourceV294(snapshot, "offers", token);
  if (token === "price") {
    const value = guruV185Text(snapshot.page?.row?.contextFields?.productPrice);
    return {
      token,
      label: G4_FUNNEL_SOURCE_LABELS_V294[token],
      status: g4FunnelSourceStatusV294(value),
      value,
      target: g3ProductJourneyPageTarget(snapshot, {
        contextKey: "productPrice",
        sectionKey: "productHeroV253",
      }),
    };
  }
  if (token === "cta") {
    const resolved = g3ExecutionResolveV282({ resolver: "cta" }, snapshot);
    return {
      token,
      label: G4_FUNNEL_SOURCE_LABELS_V294[token],
      status: resolved.status,
      value: snapshot.cta,
      target: resolved.target,
    };
  }
  if (token === "page") {
    const resolved = g3ExecutionResolveV282({ resolver: "product_card" }, snapshot);
    return {
      token,
      label: G4_FUNNEL_SOURCE_LABELS_V294[token],
      status: resolved.status,
      value: g3AutoJoin([snapshot.landing, snapshot.cardSummary], " · "),
      target: resolved.target,
    };
  }
  if (token === "forms") return g4FunnelGate2SourceV294(snapshot, "forms", token);
  if (token === "crm") return g4FunnelGate2SourceV294(snapshot, "crm", token);
  if (token === "contacts")
    return g4FunnelGate0RowSourceV294(snapshot, "fundamental", "Контакты (телефон, адрес, мессенджер)", token);
  if (token === "mobile")
    return g4FunnelGate0RowSourceV294(snapshot, "fundamental", "Мобильная версия", token);
  if (token === "analytics")
    return g4FunnelGate0RowSourceV294(snapshot, "infra", "Яндекс Метрика", token);
  if (token === "utm")
    return g4FunnelGate0RowSourceV294(snapshot, "infra", "UTM-разметка", token);
  if (token === "yandex_channel")
    return g4FunnelGate0RowSourceV294(snapshot, "channels", "яндекс.*директ", token);
  return {
    token,
    label: G4_FUNNEL_SOURCE_LABELS_V294[token] || token,
    status: "not_started",
    value: "",
    target: null,
  };
}

function g4FunnelRowSourceV294(card, row, snapshot) {
  const tokens = g4FunnelReadinessRowTokensV294(card, row);
  if (!tokens.length) return null;
  const sources = tokens.map((token) => g4FunnelPrimitiveSourceV294(token, snapshot));
  const statuses = sources.map((source) => source.status);
  const status = statuses.some((item) => item === "problem")
    ? "problem"
    : statuses.every((item) => item === "ready")
      ? "ready"
      : statuses.some((item) => item === "ready" || item === "in_progress")
        ? "in_progress"
        : "not_started";
  return {
    tokens,
    sources,
    status,
    value: sources
      .filter((source) => guruV185Text(source.value))
      .map((source) => `${source.label.replace(/^Gate [0-3] · /, "")}: ${source.value}`)
      .join(" · "),
  };
}

function g4FunnelSourceLinksHtmlV294(source) {
  const seen = new Set();
  return source.sources
    .filter((item) => item.target)
    .map((item) => {
      const key = JSON.stringify(item.target);
      if (seen.has(key)) return "";
      seen.add(key);
      return `<a class="small-btn g4-funnel-source-v294" href="${escapeAttr(
        g3ExecutionHrefV282(item.target),
      )}" data-g3-execution-target-v282="${escapeAttr(key)}">Открыть · ${escapeHtml(
        item.label.replace(/^Gate [0-3] · /, ""),
      )}</a>`;
    })
    .join("");
}

function g4FunnelManualRowHtmlV294(card, row, product) {
  const values =
    g4ReadinessProductRowV225(product.id, card.id, row.key, state) || {};
  const attrs = `data-g4-readiness-product-id="${escapeAttr(product.id)}" data-g4-readiness-card-id="${escapeAttr(card.id)}" data-g4-readiness-row-key="${escapeAttr(row.key)}"`;
  return `<tr class="g4-funnel-readiness-row-v294 is-manual" data-g4-readiness-row-key-view="${escapeAttr(row.key)}" data-g4-funnel-row-mode-v294="manual">
    <td data-label="Элемент"><strong>${escapeHtml(row.element || "")}</strong>${row.methodHint ? `<small class="g4-readiness-method-hint">Методическая подсказка: ${escapeHtml(row.methodHint)}</small>` : ""}</td>
    <td data-label="Сервис">${g4ReadinessServiceHtmlV225(row)}</td>
    <td data-label="Ссылка / отчёт"><input ${attrs} data-g4-readiness-row-field="link" value="${escapeAttr(values.link || "")}" placeholder="ссылка, если нужна" /></td>
    <td data-label="Статус"><select ${attrs} data-g4-readiness-row-field="status">${instructionStatusOptionsHtml(values.status || "")}</select></td>
    <td data-label="Результат"><input ${attrs} data-g4-readiness-row-field="result" value="${escapeAttr(values.result || "")}" placeholder="результат проверки" /></td>
    <td data-label="Комментарий"><input ${attrs} data-g4-readiness-row-field="comment" value="${escapeAttr(values.comment || "")}" placeholder="краткое уточнение" /></td>
  </tr>`;
}

function g4FunnelAutoRowHtmlV294(card, row, product, source) {
  const label = STATUS_LABELS[source.status] || source.status;
  const sourceNames = source.sources.map((item) => item.label).join(" · ");
  return `<tr class="g4-funnel-readiness-row-v294 is-automatic" data-g4-readiness-row-key-view="${escapeAttr(row.key)}" data-g4-funnel-row-mode-v294="automatic" data-g4-funnel-source-v294="${escapeAttr(source.tokens.join(","))}">
    <td data-label="Элемент"><strong>${escapeHtml(row.element || "")}</strong>${row.methodHint ? `<small class="g4-readiness-method-hint">Методическая подсказка: ${escapeHtml(row.methodHint)}</small>` : ""}</td>
    <td data-label="Источник"><span class="g4-funnel-source-label-v294">${escapeHtml(sourceNames)}</span></td>
    <td data-label="Открыть источник"><div class="g4-funnel-source-links-v294">${g4FunnelSourceLinksHtmlV294(source)}</div></td>
    <td data-label="Статус"><span class="status-pill status-${escapeAttr(source.status)}">${escapeHtml(label)}</span><small class="g4-funnel-auto-note-v294">автоматически</small></td>
    <td data-label="Живое значение"><span class="g4-funnel-live-value-v294">${escapeHtml(source.value || "Источник пока не заполнен")}</span></td>
    <td data-label="Режим"><span class="g4-funnel-auto-note-v294">Читается из источника; сохранённые ручные поля не удалены.</span></td>
  </tr>`;
}

function g4FunnelCardStatusV294(card, product, snapshot) {
  const rows = g4ReadinessTemplateRowsV225(card);
  const statuses = rows.map((row) => {
    const source = g4FunnelRowSourceV294(card, row, snapshot);
    if (source) return source.status;
    const values =
      g4ReadinessProductRowV225(product.id, card.id, row.key, state) || {};
    if (!g4ReadinessRowHasValueV225(values)) return "not_started";
    if (guruStatusIsBad(values.status)) return "problem";
    if (guruStatusIsOk(values.status) && guruV185Text(values.result)) return "ready";
    return "in_progress";
  });
  if (statuses.some((status) => status === "problem")) return "problem";
  if (statuses.length && statuses.every((status) => status === "ready")) return "ready";
  if (statuses.some((status) => status === "ready" || status === "in_progress"))
    return "in_progress";
  return "not_started";
}

function g4FunnelReadinessCardHtmlV294(card, product, snapshot) {
  const rows = g4ReadinessTemplateRowsV225(card);
  const sources = rows.map((row) => g4FunnelRowSourceV294(card, row, snapshot));
  const automatic = sources.filter(Boolean).length;
  const status = g4FunnelCardStatusV294(card, product, snapshot);
  const stage = g4FunnelReadinessStageV294(card.id);
  return `<details class="g1-card g4-readiness-card-v225 g4-funnel-readiness-card-v294 g4-readiness-state-${status}" data-g4-readiness-card="${escapeAttr(card.id)}" data-g4-funnel-card-stage-v294="${escapeAttr(stage)}" data-ui-keeper-key="g4-readiness-${escapeAttr(product.id)}-${escapeAttr(card.id)}">
    <summary class="g1-card-header g4-readiness-card-head-v225">
      <span class="g1-section-left g4-readiness-card-title-v225"><strong class="g1-card-title">${escapeHtml(card.title)}</strong><small class="g1-section-progress">${rows.length} строк · ${automatic} автоматически · ${rows.length - automatic} вручную</small></span>
      <span class="status-pill status-${status}" data-g4-readiness-status="${escapeAttr(card.id)}">${escapeHtml(STATUS_LABELS[status] || status)}</span>
      <span class="g4-readiness-toggle-v225">Открыть</span>
    </summary>
    <div class="g1-card-body g4-readiness-card-body-v225">
      ${card.instruction ? `<details class="instruction-toggle g4-readiness-instruction-v225"><summary>Показать инструкцию</summary><div class="instruction-text">${escapeHtml(card.instruction)}</div></details>` : ""}
      <div class="g4-readiness-table-wrap"><table class="mini-table typed-table g4-readiness-table g4-funnel-readiness-table-v294">
        <thead><tr><th>Элемент</th><th>Источник / сервис</th><th>Ссылка / отчёт</th><th>Статус</th><th>Результат</th><th>Комментарий / режим</th></tr></thead>
        <tbody>${rows.map((row, index) => sources[index]
          ? g4FunnelAutoRowHtmlV294(card, row, product, sources[index])
          : g4FunnelManualRowHtmlV294(card, row, product)).join("")}</tbody>
      </table></div>
    </div>
  </details>`;
}

function g4FunnelReadinessCardsForStageV294(cards, stageKey) {
  return cards.filter((card) => g4FunnelReadinessStageV294(card.id) === stageKey);
}

function g4FunnelChannelFallbackStageV294(channel) {
  const label = g4LaunchChannelLabel(channel);
  if (channel.launchType === "media") return "aware";
  if (channel.launchType === "smm") return /контент/i.test(label) ? "appeal" : "aware";
  if (channel.launchType === "search") return "ask";
  return "act";
}

function g4FunnelChannelMatchesMapItemV294(item, channel) {
  if (g4Gate3MapChannelMatchesV290(item, channel)) return true;
  const label = g4LaunchChannelLabel(channel);
  if (item?.resolver === "seo")
    return /seo|карты|business|maps/i.test(label);
  if (
    (item?.resolver === "media_campaign" || item?.resolver === "media_creatives") &&
    /мастер\s+кампан/i.test(label)
  )
    return true;
  return false;
}

function g4FunnelChannelPlacementV294(model, channels) {
  const byKey = new Map();
  const itemChannels = new Map();
  const items = [];
  let changed = false;
  (model?.stageOrder || []).forEach((stageKey) => {
    const stage = model.stages?.[stageKey];
    (stage?.groups || []).forEach((group) =>
      (group.items || []).forEach((item) => {
        items.push({ item, stageKey });
        const binding = g3Gate4EnsureChannelBindingsV290(item, channels);
        changed = changed || binding.changed;
        binding.channels.forEach((channel) => {
          if (!byKey.has(channel.key)) byKey.set(channel.key, stageKey);
        });
      }),
    );
  });
  channels.forEach((channel) => {
    if (byKey.has(channel.key)) return;
    const matches = items.filter(({ item }) =>
      g4FunnelChannelMatchesMapItemV294(item, channel),
    );
    matches.forEach(({ item }) => {
      item.channelKeys = [...new Set([...(item.channelKeys || []), channel.key])];
      changed = true;
    });
    if (matches.length) byKey.set(channel.key, matches[0].stageKey);
    else byKey.set(channel.key, g4FunnelChannelFallbackStageV294(channel));
  });
  const knownKeys = new Set(channels.map((channel) => channel.key));
  items.forEach(({ item }) => {
    const keys = (item.channelKeys || []).filter((key) => knownKeys.has(key));
    if (!keys.length) return;
    itemChannels.set(
      item.instanceId,
      channels.filter((channel) => keys.includes(channel.key)),
    );
  });
  const boundKeys = new Set(
    [...itemChannels.values()].flat().map((channel) => channel.key),
  );
  return { byKey, itemChannels, boundKeys, changed };
}

function g4FunnelSyntheticChannelItemV294(channel, stageKey) {
  return g3Gate4NormalizeItemV290(
    {
      id: `channel-${channel.key}`,
      instanceId: `g4-funnel-channel-${channel.key}`,
      label: g4LaunchChannelLabel(channel),
      resolver: "channel",
    },
    stageKey,
  );
}

function g4FunnelOrphanCampaignChannelV294(productId, stateKey) {
  const prefix = `${normalizeAspectKey(productId)}_`;
  const channelKey = stateKey.startsWith(prefix)
    ? stateKey.slice(prefix.length)
    : stateKey;
  return {
    key: channelKey,
    channel: "Сохранённая кампания вне текущей карты",
    platform: "Историческая запись",
    type: channelKey.replaceAll("_", " "),
    materials: "Данные сохранены без удаления; требуется отдельное решение.",
    launchType: "other",
  };
}

function g4FunnelReadinessGroupHtmlV294(stageKey, cards, product, snapshot) {
  if (!cards.length) return "";
  const rows = cards.reduce(
    (sum, card) => sum + g4ReadinessTemplateRowsV225(card).length,
    0,
  );
  return `<div class="g4-funnel-readiness-group-v294" data-g4-funnel-readiness-stage-v294="${escapeAttr(stageKey)}">
    <div class="g4-map-group-head-v290"><h4>Проверки и основа реализации</h4><span>${cards.length} карточек · ${rows} строк</span></div>
    <div class="g4-map-list-v290">${cards.map((card) =>
      g4FunnelReadinessCardHtmlV294(card, product, snapshot)).join("")}</div>
  </div>`;
}

function g4FunnelStageHtmlV294(context, model, stage, stageIndex, cards, placement) {
  const mediaChannels = g4AwareMediaChannelsV522(context.channels);
  const mediaKeys = new Set(mediaChannels.map((channel) => channel.key));
  const stageChannels = context.channels.filter((channel) =>
    placement.byKey.get(channel.key) === stage.key &&
    (stage.key !== "aware" || channel.launchType === "smm" ||
      mediaKeys.has(channel.key)),
  );
  const fallbackChannels = stageChannels.filter(
    (channel) => !placement.boundKeys.has(channel.key),
  );
  const bannerItems = stage.key === "aware" ? g4AwareBannerItemsV522(stage) : [];
  const visibleGroups = stage.key === "aware"
    ? g4AwareVisibleGroupsV522(stage.groups)
    : stage.groups || [];
  const groups = visibleGroups.map((group) =>
    `<div class="g4-map-group-v290" data-g4-map-group-v290="${escapeAttr(group.id)}">
      <div class="g4-map-group-head-v290"><h4>${escapeHtml(group.title)}</h4><span>${group.items.length}</span></div>
      <div class="g4-map-list-v290">${group.items.map((item) => {
        const boundChannels = placement.itemChannels.get(item.instanceId);
        const toolOptions = stage.key === "aware" &&
          item.resolver === "media_campaign"
          ? {
              awareMedia: true,
              channels: mediaChannels,
              bannerItems,
            }
          : boundChannels?.length
            ? { channels: boundChannels }
            : {};
        if (!context.smmStrategyRendered && item.id === "smm_seeding") {
          toolOptions.afterTitleHtml = g4SmmStrategyHtmlV298(context.product);
          context.smmStrategyRendered = true;
        }
        return g4Gate3MapToolHtmlV290(
          context,
          item,
          toolOptions,
        );
      }).join("") || '<div class="g1-empty">В этой группе пока нет инструментов.</div>'}</div>
    </div>`,
  ).join("");
  const fallback = fallbackChannels.length
    ? `<div class="g4-map-group-v290" data-g4-funnel-channel-group-v294="${escapeAttr(stage.key)}"><div class="g4-map-group-head-v290"><h4>Каналы кампаний</h4><span>${fallbackChannels.length}</span></div><div class="g4-map-list-v290">${fallbackChannels.map((channel) =>
        g4Gate3MapToolHtmlV290(
          context,
          g4FunnelSyntheticChannelItemV294(channel, stage.key),
          { channels: [channel] },
        )).join("")}</div></div>`
    : "";
  return `<section class="g4-map-stage-v290 g4-funnel-stage-v294" data-g4-map-stage-v290="${escapeAttr(stage.key)}">
    <header><span>${stageIndex + 1}</span><h3>${escapeHtml(stage.title)}</h3><small>${cards.length} карточек · ${stageChannels.length} каналов</small></header>
    ${g3ProductJourneyStageExplanationHtmlV296(stage.key, "gate4")}
    ${g4FunnelReadinessGroupHtmlV294(stage.key, cards, context.product, context.snapshot)}
    ${groups}${fallback}
  </section>`;
}

function g4FunnelMapHtmlV294(product, channels, campaigns) {
  g4FunnelRepairWorkspaceV294(state);
  channels.forEach(g4RepairBannerFieldsV522);
  Object.values(campaigns || {}).forEach(g4RepairBannerFieldsV522);
  const productId = g4ProductPickKey(product);
  const model = g3Gate4StructureForProductV290(productId);
  const snapshot = g3ProductJourneySnapshot(product);
  const cards = g4ReadinessAllCardsV225(state);
  const placement = g4FunnelChannelPlacementV294(model, channels);
  const context = {
    product,
    productId,
    snapshot,
    channels,
    campaigns,
    renderedCampaigns: new Set(),
    renderedImplementations: new Set(),
    smmStrategyRendered: false,
    bindingsChanged: placement.changed,
  };
  const stages = (model.stageOrder || [])
    .map((stageKey) => model.stages?.[stageKey])
    .filter(Boolean);
  const active = stages.map((stage, index) =>
    g4FunnelStageHtmlV294(
      context,
      model,
      stage,
      index,
      g4FunnelReadinessCardsForStageV294(cards, stage.key),
      placement,
    ),
  ).join("");

  const aware = model.stages?.aware;
  const visibleAwareIds = new Set(g4AwareVisibleGroupsV522(aware?.groups)
    .flatMap((group) => group.items.map((item) => item.instanceId)));
  const bannerItems = g4AwareBannerItemsV522(aware);
  const bannerIds = new Set(bannerItems.map((item) => item.instanceId));
  bannerItems.forEach((item) => {
    if (item.implementationId && channels.some((channel) =>
      g4AwareMediaChannelV522(channel) &&
      (!item.channelKeys?.length || item.channelKeys.includes(channel.key))))
      context.renderedImplementations.add(item.implementationId);
  });
  const hiddenAware = (aware?.groups || [])
    .flatMap((group) => group.items || [])
    .filter((item) => !visibleAwareIds.has(item.instanceId) &&
      !bannerIds.has(item.instanceId));
  const outsideRows = [...(model.outside || []), ...hiddenAware].map((item) =>
    g4Gate3MapToolHtmlV290(context, item, {
      outside: true,
      restorable: (model.outside || []).includes(item),
      channels: hiddenAware.includes(item) ? [] : undefined,
    }),
  );
  Object.entries(campaigns || {}).forEach(([stateKey, campaign]) => {
    if (
      guruV185Text(campaign?.product) !== productId ||
      context.renderedCampaigns.has(stateKey)
    )
      return;
    const channel = g4FunnelOrphanCampaignChannelV294(productId, stateKey);
    if (g4CampaignStateKey(productId, channel.key) !== stateKey) return;
    const synthetic = g3Gate4NormalizeItemV290(
      {
        id: `orphan-campaign-${channel.key}`,
        instanceId: `outside-campaign-${channel.key}`,
        label: g4LaunchChannelLabel(channel),
        resolver: "channel",
      },
      "outside",
    );
    outsideRows.push(
      g4Gate3MapToolHtmlV290(context, synthetic, {
        outside: true,
        channels: [channel],
      }),
    );
  });
  g3Gate4EnsureImplementationIdsV290().forEach((implementation) => {
    if (context.renderedImplementations.has(implementation.id)) return;
    const synthetic = g3Gate4NormalizeItemV290(
      {
        id: `implementation-${implementation.id}`,
        instanceId: `outside-implementation-${implementation.id}`,
        label: implementation.channel || implementation.name || "Реализация",
        resolver: "implementation",
        implementationId: implementation.id,
      },
      "outside",
    );
    outsideRows.push(
      g4Gate3MapToolHtmlV290(context, synthetic, { outside: true }),
    );
  });
  if (context.bindingsChanged) g3Gate4ScheduleBindingSaveV290();
  return `<div class="g4-map-v290 g4-funnel-map-v294" data-g4-map-product-v290="${escapeAttr(productId)}" data-g4-funnel-version-v294="${G4_FUNNEL_READINESS_VERSION_V294}">
    ${active}
    ${outsideRows.length ? `<details class="g4-map-outside-v290"><summary>Вне текущей карты · ${outsideRows.length}</summary><div class="g4-map-list-v290">${outsideRows.join("")}</div></details>` : ""}
  </div>`;
}

g4CampaignLaunchCenterHtml = function (options = {}) {
  const products = g4ProductPickProducts();
  const product = g4ProductPickSelected();
  const picker = options.omitPicker
    ? ""
    : g4ProductPickPickerHtml(products, product);
  if (!products.length)
    return `${picker}<div class="g3-product-journey-empty"><strong>Нет продуктов или услуг</strong><span>Сначала добавьте позицию в Gate 0.</span></div>`;
  if (!product)
    return `${picker}<div class="g3-product-journey-empty"><strong>Продукт не выбран</strong></div>`;
  const channels = g4LaunchChannels();
  const campaigns = g4EnsureLaunchCampaigns();
  return `<div class="g1-route">${picker}${g4FunnelMapHtmlV294(product, channels, campaigns)}</div>`;
};

/* Живой статус используется не только в Gate 4, но и всеми уже
   существующими потребителями readinessV225 (например, Gate 2). */
const __g4FunnelPrevCardStatusV294 = g4ReadinessCardStatusV225;
g4ReadinessCardStatusV225 = function (card, productId = "", workspace = state) {
  if (workspace !== state || !card || !G4_FUNNEL_CARD_STAGE_V294[card.id])
    return __g4FunnelPrevCardStatusV294(card, productId, workspace);
  const product = guruV194Product(productId, workspace);
  if (!product) return __g4FunnelPrevCardStatusV294(card, productId, workspace);
  return g4FunnelCardStatusV294(card, product, g3ProductJourneySnapshot(product));
};

const __g4FunnelPrevPrepareSourceV294 = g3ProductJourneyPrepareSource;
g3ProductJourneyPrepareSource = function (target) {
  __g4FunnelPrevPrepareSourceV294(target);
  if (target?.kind !== "gate0-readiness-row-v294") return;
  const product = guruV194Product(target.productId, state);
  if (product) {
    const ui = guruV194Ui(state);
    ui.selectedCategoryId = guruV185Text(product.categoryId) || "__uncategorized__";
    ui.selectedProductId = product.id;
  }
  state._gate0Open = state._gate0Open || {};
  if (target.cardId) state._gate0Open[target.cardId] = true;
};

const __g4FunnelPrevFindSourceV294 = g3ProductJourneyFindSource;
g3ProductJourneyFindSource = function (target) {
  const previous = __g4FunnelPrevFindSourceV294(target);
  if (previous || target?.kind !== "gate0-readiness-row-v294") return previous;
  const esc = (value) => CSS.escape(String(value ?? ""));
  const index = Number.isFinite(Number(target.index)) ? Number(target.index) : 0;
  const selector = target.collection === "fundamental"
    ? `[data-mega-card="${esc(target.cardId)}"][data-mega-pv2="fundamental"][data-mega-idx="${index}"][data-mega-field="status"]`
    : `[data-mega-card="${esc(target.cardId)}"][data-mega-section="${esc(target.collection)}"][data-mega-idx="${index}"][data-mega-field="status"]`;
  return document.querySelector(selector) || document.querySelector(
    `[data-card-row="${esc(target.cardId)}"]`,
  );
};

function g4FunnelReadinessAuditV294(product = g4ProductPickSelected()) {
  if (!product) return null;
  const cards = g4ReadinessAllCardsV225(state);
  const channels = g4LaunchChannels();
  const storedCampaigns = Object.entries(state?.gate4Production?.campaigns || {})
    .filter(([, campaign]) => guruV185Text(campaign?.product) === product.id);
  const model = g3Gate4StructureForProductV290(product.id);
  const placement = g4FunnelChannelPlacementV294(model, channels);
  const snapshot = g3ProductJourneySnapshot(product);
  const broken = [];
  const scan = (kind, id, value) => {
    if (/\uFFFD|Ã|Â|Ð|Ñ|â€|ðŸ/.test(String(value || "")))
      broken.push({ kind, id, value: String(value || "") });
  };
  cards.forEach((card) => {
    scan("card", card.id, card.title);
    scan("instruction", card.id, card.instruction);
    g4ReadinessTemplateRowsV225(card).forEach((row) => {
      ["element", "tool", "serviceLabel", "comment", "methodHint"].forEach((field) =>
        scan(`row.${field}`, `${card.id}/${row.key}`, row[field]),
      );
    });
  });
  return {
    version: G4_FUNNEL_READINESS_VERSION_V294,
    product: { id: product.id, name: product.name },
    counts: {
      cards: cards.length,
      rows: cards.reduce((sum, card) => sum + g4ReadinessTemplateRowsV225(card).length, 0),
      channels: channels.length,
      automaticRows: cards.reduce((sum, card) => sum + g4ReadinessTemplateRowsV225(card).filter((row) => g4FunnelReadinessRowTokensV294(card, row).length).length, 0),
      storedCampaigns: storedCampaigns.length,
      campaignsOutsideCurrentMap: storedCampaigns.filter(
        ([stateKey]) => !channels.some(
          (channel) => g4CampaignStateKey(product.id, channel.key) === stateKey,
        ),
      ).length,
    },
    cards: cards.map((card) => ({
      id: card.id,
      title: card.title,
      stage: g4FunnelReadinessStageV294(card.id),
      rows: g4ReadinessTemplateRowsV225(card).map((row) => {
        const source = g4FunnelRowSourceV294(card, row, snapshot);
        return {
          key: row.key,
          element: row.element,
          mode: source ? "automatic" : "manual",
          source: source ? source.sources.map((item) => item.label) : [],
          status: source?.status || "manual",
        };
      }),
    })),
    channels: channels.map((channel) => ({
      key: channel.key,
      label: g4LaunchChannelLabel(channel),
      stage: placement.byKey.get(channel.key),
      source: "Gate 0 · Каналы → gate4Production.campaigns[product_id/channel_key]",
    })),
    brokenEncoding: broken,
    deletions: { cards: 0, rows: 0, channels: 0, fields: 0 },
  };
}

/* ================================================================
   v2.3.235 — «Вне воронки — предусловие» выведено из рабочего UI.

   card-147/149/150 остаются в исходной схеме workspace, чтобы старые
   экспорты не теряли методику. Любые ранее введённые рабочие значения
   дополнительно архивируются здесь и исключаются из прогресса,
   readiness-диагностики и рендера воронки.
   ================================================================ */
const G4_PREREQUISITE_RETIREMENT_V468 =
  "gate4-prerequisite-retirement-v468";

function g4PrerequisiteCloneV468(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function g4PrerequisiteHasStoredValueV468(value) {
  if (Array.isArray(value))
    return value.some((item) => g4PrerequisiteHasStoredValueV468(item));
  if (value && typeof value === "object")
    return Object.values(value).some((item) =>
      g4PrerequisiteHasStoredValueV468(item),
    );
  return Boolean(guruV185Text(value));
}

function g4PrerequisiteLegacySnapshotV468(workspace) {
  const gate = workspace?.gates?.find((item) => item.id === "gate-4");
  const store = workspace?.gate4Production?.readinessV225 || {};
  const byProduct = store.byProduct || {};
  const legacyUnassigned = store.legacyUnassigned || {};
  const cards = {};

  GATE4_RETIRED_PREREQUISITE_CARD_IDS_V468.forEach((cardId) => {
    const card = gate?.cards?.find((item) => item.id === cardId);
    const templateRows = card ? g4ReadinessLegacyUserValuesV225(card) : {};
    const templateStatus =
      card?.status && card.status !== "not_started" ? card.status : "";
    const productValues = Object.fromEntries(
      Object.entries(byProduct)
        .map(([productId, productCards]) => [
          productId,
          g4PrerequisiteCloneV468(productCards?.[cardId]),
        ])
        .filter(([, value]) => g4PrerequisiteHasStoredValueV468(value)),
    );
    const unassigned = g4PrerequisiteCloneV468(legacyUnassigned[cardId]);
    const snapshot = {
      ...(Object.keys(templateRows).length ? { templateRows } : {}),
      ...(templateStatus ? { templateStatus } : {}),
      ...(Object.keys(productValues).length ? { byProduct: productValues } : {}),
      ...(g4PrerequisiteHasStoredValueV468(unassigned)
        ? { legacyUnassigned: unassigned }
        : {}),
    };
    if (Object.keys(snapshot).length) cards[cardId] = snapshot;
  });
  return cards;
}

function g4PrerequisiteRetirementAuditV468(workspace = state) {
  const cards = g4PrerequisiteLegacySnapshotV468(workspace);
  const archive =
    workspace?.gate4Production?.readinessV225
      ?.legacyRetiredPrerequisiteV468 || {};
  return {
    id: G4_PREREQUISITE_RETIREMENT_V468,
    retiredCardIds: [...GATE4_RETIRED_PREREQUISITE_CARD_IDS_V468],
    activeReadinessCardIds: g4ReadinessAllCardsV225(workspace).map(
      (card) => card.id,
    ),
    currentLegacyCards: cards,
    currentLegacyCardCount: Object.keys(cards).length,
    archivedSnapshots: Array.isArray(archive.snapshots)
      ? archive.snapshots.length
      : 0,
    archivePath:
      "state.gate4Production.readinessV225.legacyRetiredPrerequisiteV468",
  };
}

function g4PrerequisiteRetireWorkspaceV468(workspace) {
  if (!workspace?.project) return { changed: false, reason: "no_project" };
  const store = g4ReadinessStoreV225(workspace);
  const cards = g4PrerequisiteLegacySnapshotV468(workspace);
  const archive = (store.legacyRetiredPrerequisiteV468 =
    store.legacyRetiredPrerequisiteV468 &&
    typeof store.legacyRetiredPrerequisiteV468 === "object"
      ? store.legacyRetiredPrerequisiteV468
      : {});
  archive.id = G4_PREREQUISITE_RETIREMENT_V468;
  archive.cardIds = [...GATE4_RETIRED_PREREQUISITE_CARD_IDS_V468];
  archive.snapshots = Array.isArray(archive.snapshots)
    ? archive.snapshots
    : [];
  const exactCards = JSON.stringify(cards);
  const alreadyArchived = archive.snapshots.some(
    (snapshot) => JSON.stringify(snapshot?.cards || {}) === exactCards,
  );
  let changed = false;
  if (Object.keys(cards).length && !alreadyArchived) {
    archive.snapshots.push({
      capturedAt: new Date().toISOString(),
      cards,
    });
    changed = true;
  }

  const log = workspace.project._gate4PrerequisiteRetirementLogV468;
  if (!log || log.id !== G4_PREREQUISITE_RETIREMENT_V468 || changed) {
    workspace.project._gate4PrerequisiteRetirementLogV468 = {
      id: G4_PREREQUISITE_RETIREMENT_V468,
      status: Object.keys(cards).length
        ? "completed_with_legacy_archive"
        : "completed",
      retiredCardIds: [...GATE4_RETIRED_PREREQUISITE_CARD_IDS_V468],
      removedFromUi: true,
      removedFromProgress: true,
      removedFromActiveReadinessDiagnostics: true,
      legacyCardCount: Object.keys(cards).length,
      archivePath:
        "state.gate4Production.readinessV225.legacyRetiredPrerequisiteV468",
      updatedAt: new Date().toISOString(),
    };
    changed = true;
  }
  return {
    changed,
    legacyCardCount: Object.keys(cards).length,
    archivedSnapshots: archive.snapshots.length,
  };
}

const __g4PrerequisitePrevAllCardsV468 = g4ReadinessAllCardsV225;
g4ReadinessAllCardsV225 = function (workspace = state) {
  return __g4PrerequisitePrevAllCardsV468(workspace).filter(
    (card) =>
      !GATE4_RETIRED_PREREQUISITE_CARD_ID_SET_V468.has(card.id),
  );
};

const __g4PrerequisitePrevMigrateWorkspaceV468 = migrateWorkspace;
migrateWorkspace = function (workspace, projectId) {
  const migrated = __g4PrerequisitePrevMigrateWorkspaceV468(
    workspace,
    projectId,
  );
  g4PrerequisiteRetireWorkspaceV468(migrated);
  return migrated;
};

const __g4PrerequisitePrevFreshWorkspaceV468 = createFreshWorkspace;
createFreshWorkspace = function (meta) {
  const workspace = __g4PrerequisitePrevFreshWorkspaceV468(meta);
  g4PrerequisiteRetireWorkspaceV468(workspace);
  return workspace;
};

if (state) {
  g4FunnelRepairWorkspaceV294(state);
  g4SmmStrategyEnsureV298(state);
  g4SmmContentEnsureV299(state);
  g4PrerequisiteRetireWorkspaceV468(state);
}
