/* Product SMM presentation. The persisted strategy/content bucket is unchanged. */

function g4ProductSmmPeriodV2(content, strategy, now = new Date()) {
  const week = g4SmmCalendarWeekStartV322(content, now);
  const count = Math.max(1, Math.round(Number(strategy.planningPeriod?.count) || 1));
  const unit = g4SmmPeriodUnitV304(strategy.planningPeriod?.unit);
  const start = new Date(week);
  const after = new Date(week);
  if (unit.key === "month") {
    start.setDate(1);
    after.setFullYear(start.getFullYear(), start.getMonth() + count, 1);
  } else if (unit.key === "quarter") {
    start.setMonth(Math.floor(start.getMonth() / 3) * 3, 1);
    after.setFullYear(start.getFullYear(), start.getMonth() + count * 3, 1);
  } else if (unit.key === "year") {
    start.setMonth(0, 1);
    after.setFullYear(start.getFullYear() + count, 0, 1);
  } else after.setDate(after.getDate() + count * 7);
  const end = new Date(after);
  end.setDate(end.getDate() - 1);
  const month = (date) => new Intl.DateTimeFormat("ru-RU", { month: "long" }).format(date);
  const dateLabel = start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()
    ? `${start.getDate()}–${end.getDate()} ${month(end)} ${end.getFullYear()}`
    : `${start.getDate()} ${month(start)} – ${end.getDate()} ${month(end)} ${end.getFullYear()}`;
  return { start: g4SmmIsoDateV322(start), end: g4SmmIsoDateV322(end), dateLabel,
    count, unit: unit.key, label: `${count} ${g4SmmPeriodPluralV304(count, unit.forms)}`,
    weeks: g4SmmPeriodProjectionV304(strategy).weeks };
}

function g4ProductSmmIdeaPlanningDateV2(idea) {
  if (g4SmmDateValueV299(idea.scheduledDate)) return idea.scheduledDate;
  if (g4SmmDateValueV299(idea.planningPeriodStart)) return idea.planningPeriodStart;
  const created = new Date(idea.createdAt || "");
  return Number.isFinite(created.getTime()) ? g4SmmIsoDateV322(created) : "";
}

function g4ProductSmmModelV2(content, strategy, now = new Date()) {
  const period = g4ProductSmmPeriodV2(content, strategy, now);
  const today = g4SmmIsoDateV322(now);
  const inPeriod = (date) => Boolean(date && date >= period.start && date <= period.end);
  const ideas = content.ideas || [];
  const periodIdeas = ideas.filter((idea) => inPeriod(g4ProductSmmIdeaPlanningDateV2(idea)));
  const scheduledIdeas = periodIdeas.filter((idea) => inPeriod(idea.scheduledDate));
  const publications = [...new Map((content.publications || [])
    .filter((publication) => publication?.id).map((publication) => [publication.id, publication])).values()];
  const published = publications.filter((publication) => publication.status === "published" &&
    g4SmmDateValueV299(publication.date) && publication.date <= today);
  const sameFormat = (publication, format) => publication.formatId
    ? publication.formatId === format.id
    : g4SmmPublicationFormatLabelV299(publication, strategy).toLocaleLowerCase("ru-RU") ===
      guruV185Text(format.format).toLocaleLowerCase("ru-RU");
  const rows = g4SmmFormatsOrderedBy5AV303(strategy.formats || []).map(({ format }) => {
    const binding = G4_SMM_FORMAT_VOLUME_V305[format.id];
    const min = binding ? Math.max(0, Math.round((Number(strategy.volume?.[binding.minKey]) || 0) * period.weeks)) : null;
    const max = binding ? Math.max(min, Math.round((Number(strategy.volume?.[binding.maxKey]) || 0) * period.weeks)) : null;
    const matchingIdeas = periodIdeas.filter((idea) => idea.primaryTaskFormatId === format.id);
    const matchingFact = published.filter((publication) => inPeriod(publication.date) && sameFormat(publication, format));
    const fact = binding?.unit === "days"
      ? new Set(matchingFact.map((publication) => publication.date)).size : matchingFact.length;
    const matchingScheduled = scheduledIdeas.filter((idea) => idea.primaryTaskFormatId === format.id);
    const plannedUnits = binding?.unit === "days"
      ? new Set(matchingScheduled.map((idea) => idea.scheduledDate)).size : matchingScheduled.length;
    const ideaUnits = matchingIdeas.length;
    const status = min === null || min === 0 ? "Норма не задана"
      : fact >= min ? "Выполнено"
        : plannedUnits >= min ? `Запланировано · опубликовано ${fact}/${min}`
          : ideaUnits >= min ? `Идей достаточно · запланировано ${plannedUnits}/${min}`
            : `Недобор ${Math.max(0, min - Math.max(ideaUnits, fact))}`;
    const tone = min === null || min === 0 ? "neutral"
      : fact >= min ? "done" : plannedUnits >= min ? "planned"
        : period.end < today ? "gap" : "pending";
    return { format, min, max, ideas: matchingIdeas.length, fact, status, tone, binding,
      topics: g4SmmFormatTopicsV308(format, strategy),
      progress: min ? Math.min(100, Math.round(ideaUnits * 100 / min)) : 0 };
  });
  const quarterStart = g4SmmStartOfQuarterV299(g4SmmDateValueV299(period.start));
  const quarterEnd = new Date(quarterStart);
  quarterEnd.setMonth(quarterEnd.getMonth() + 3, 0);
  const quarterStartIso = g4SmmIsoDateV322(quarterStart);
  const quarterEndIso = g4SmmIsoDateV322(quarterEnd);
  const quarterTarget = g4SmmStrategyTotalsV298(strategy).quarterMax;
  const quarterFact = published.filter((publication) => publication.date >= quarterStartIso &&
    publication.date <= quarterEndIso && ["videos", "carousels", "cases"]
      .includes(g4SmmPublicationKindV299(publication, strategy))).length;
  const day90 = new Date(now);
  day90.setDate(day90.getDate() - 90);
  const day21 = new Date(now);
  day21.setDate(day21.getDate() - 21);
  const cutoff90 = g4SmmIsoDateV322(day90);
  const cutoff21 = g4SmmIsoDateV322(day21);
  const futureIdeas = ideas.filter((idea) => guruV185Text(idea.insight) && idea.scheduledDate > today);
  const futurePublications = publications.filter((publication) =>
    publication.status !== "published" && publication.date > today);
  const unusedPairs = (strategy.formats || []).flatMap((format) =>
    g4SmmFormatPlatformsV299(format).flatMap((platform) => {
      const samePair = (publication) => sameFormat(publication, format) &&
        (publication.platforms || []).some((value) => value.toLocaleLowerCase("ru-RU") === platform.toLocaleLowerCase("ru-RU"));
      const last = published.filter(samePair).sort((a, b) => b.date.localeCompare(a.date))[0];
      if (last?.date >= cutoff90) return [];
      const planned = futurePublications.some(samePair) || futureIdeas.some((idea) =>
        idea.primaryTaskFormatId === format.id);
      return [{ format: format.format, platform, last: last?.date || "",
        status: planned ? "Запланировано" : "Не используется" }];
    }));
  const topics = (strategy.topics || []).map((topic) => {
    const sameTopic = (publication) => publication.topicId === topic.id ||
      !publication.topicId && g4SmmPublicationTopicLabelV299(publication, strategy)
        .toLocaleLowerCase("ru-RU") === guruV185Text(topic.value).toLocaleLowerCase("ru-RU");
    const last = published.filter(sameTopic).sort((a, b) => b.date.localeCompare(a.date))[0];
    const stale = !last || last.date < cutoff21;
    const planned = futureIdeas.some((idea) => idea.topicId === topic.id) || futurePublications.some(sameTopic);
    return { name: topic.value, last: last?.date || "", stale,
      status: !stale ? "Используется" : planned ? "Запланировано" : "Требует внимания" };
  });
  return { period, rows, ideas, periodIdeas, published, quarter: {
    label: `Q${Math.floor(quarterStart.getMonth() / 3) + 1} ${quarterStart.getFullYear()}`,
    fact: quarterFact, target: quarterTarget,
    percent: quarterTarget ? Math.round(quarterFact * 100 / quarterTarget) : 0,
    remaining: Math.max(0, quarterTarget - quarterFact),
  }, unusedPairs, topics, scheduledCount: scheduledIdeas.length,
    targetIdeas: rows.reduce((sum, row) => sum + (row.min || 0), 0),
    coveredIdeas: rows.reduce((sum, row) => sum + (row.min === null ? 0 : Math.min(row.ideas, row.min)), 0) };
}

function g4ProductSmmPlatformChipV2(platform) {
  const value = guruV185Text(platform);
  const label = /вконтакте|^vk|клипы/i.test(value) ? "VK"
    : /instagram|reels/i.test(value) ? "IG"
      : /youtube|shorts/i.test(value) && !/rutube/i.test(value) ? "YT"
        : /tiktok/i.test(value) ? "TT"
          : /telegram/i.test(value) ? "TG"
            : /rutube/i.test(value) ? "RUT"
              : /дзен/i.test(value) ? "Дзен"
                : /max/i.test(value) ? "MAX" : value.slice(0, 3).toUpperCase();
  return `<span class="g4-product-smm-platform-v2" title="${escapeAttr(value)}" aria-label="${escapeAttr(value)}">${escapeHtml(label)}</span>`;
}

function g4ProductSmmFormatIconV2(format) {
  const id = guruV185Text(format.id).split("-").pop();
  return ({ "1": "▶", "2": "▣", "3": "▦", "4": "✎", "5": "◉", "6": "▷" })[id] || "•";
}

function g4ProductSmmTableHtmlV2(model, productId) {
  return `<div class="g4-product-smm-table-wrap-v2"><table class="g4-product-smm-table-v2">
    <thead><tr><th>Основная задача</th><th>Формат</th><th>Темы</th><th>План / идеи</th><th>Площадки</th></tr></thead>
    <tbody>${model.rows.map((row) => `<tr data-g4-product-smm-format-row-v2="${escapeAttr(row.format.id)}">
      <td class="g4-product-smm-task-v2">${escapeHtml(row.format.task) || "—"}</td>
      <td><span class="g4-product-smm-format-v2"><span class="g4-product-smm-format-icon-v2" aria-hidden="true">${g4ProductSmmFormatIconV2(row.format)}</span><strong>${escapeHtml(row.format.format)}</strong></span></td>
      <td><div class="g4-product-smm-topics-v2">${row.topics.map((topic) => `<div class="g4-product-smm-topic-v2" data-g4-product-smm-topic-v2="${escapeAttr(topic.id)}"><span>→ ${escapeHtml(topic.value)}</span><button type="button" data-g4-product-smm-topic-idea-add-v345 data-g4-product-smm-format-id-v345="${escapeAttr(row.format.id)}" data-g4-product-smm-topic-id-v345="${escapeAttr(topic.id)}" data-g4-product-smm-product-id-v345="${escapeAttr(productId)}" aria-label="Новая идея: ${escapeAttr(topic.value)}">+ Идея</button></div>`).join("") || "—"}</div></td>
      <td><div class="g4-product-smm-progress-v2 is-${row.tone}-v2"><strong>${row.ideas} / ${row.min === null ? "—" : row.max === row.min ? row.min : `${row.min}–${row.max}`}</strong><progress max="100" value="${row.progress}" aria-label="Идеи для формата ${escapeAttr(row.format.format)}"></progress></div></td>
      <td><div class="g4-product-smm-platforms-v2">${g4SmmFormatPlatformsV299(row.format).map(g4ProductSmmPlatformChipV2).join("") || "—"}</div></td>
    </tr>`).join("")}</tbody>
  </table></div>`;
}

function g4ProductSmmSocialPreviewV2(idea, content, strategy, product) {
  const format = (strategy.formats || []).find((row) => row.id === idea.primaryTaskFormatId);
  const topic = (strategy.topics || []).find((row) => row.id === idea.topicId);
  const publication = g4SmmPublicationForIdeaV324(idea, content);
  const platform = guruV185Text(publication?.platforms?.[0]) ||
    g4SmmFormatPlatformsV299(format || {})[0] || "VK";
  const name = guruV185Text(product?.name) || "Ваш бренд";
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase();
  const heading = guruV185Text(idea.name) || guruV185Text(topic?.value) || "Название идеи";
  const caption = guruV185Text(publication?.publicationPackage?.caption) ||
    guruV185Text(publication?.content) || guruV185Text(idea.insight) ||
    "Здесь появится текст после заполнения этапа «Озарение».";
  return `<div class="g4-product-smm-preview-intro-v2">Один пример публикации для площадки ${escapeHtml(platform)}. Содержимое обновляется из карточки идеи.</div>
    <div class="g4-product-smm-social-post-v2" data-g4-product-smm-social-preview-v2="${escapeAttr(idea.id)}">
      <div class="g4-product-smm-social-author-v2"><span class="g4-product-smm-social-avatar-v2">${escapeHtml(initials || "Б")}</span><span><strong>${escapeHtml(name)}</strong><small>${escapeHtml(platform)} · Предпросмотр</small></span></div>
      <strong class="g4-product-smm-social-heading-v2">${escapeHtml(heading)}</strong>
      <p class="g4-product-smm-social-caption-v2">${escapeHtml(caption)}</p>
      <div class="g4-product-smm-social-media-v2"><span aria-hidden="true">${escapeHtml(g4ProductSmmFormatIconV2(format || {}))}</span><strong>${escapeHtml(format?.format || "Ваш формат")}</strong><small>${escapeHtml(topic?.value || "Тема публикации")}</small></div>
      <div class="g4-product-smm-social-actions-v2" aria-hidden="true"><span>♡ Нравится</span><span>◌ Комментировать</span><span>↗ Поделиться</span></div>
    </div>`;
}

function g4ProductSmmDetailV2(html, options = {}) {
  const template = document.createElement("template");
  template.innerHTML = g4ProductSmmAdaptHtmlV523(html);
  template.content.querySelectorAll(".g1-card-collapsible.is-collapsed").forEach((card) =>
    card.classList.remove("is-collapsed"));
  if (options.idea) {
    // The product workspace owns its disclosures. The global default-closed
    // registry must not hide the inner editor after the outer <details> opens.
    template.content.querySelectorAll(".g4-smm-idea-v299.g1-card-collapsible").forEach((card) =>
      card.classList.remove("g1-card-collapsible", "is-collapsed"));
    const header = template.content.querySelector(".g4-smm-idea-collapse-head-v343");
    const workflowActions = header?.querySelector(".g4-smm-workflow-header-actions-v342");
    if (workflowActions) {
      const toolbar = document.createElement("div");
      toolbar.className = "g4-product-smm-workflow-controls-v2";
      toolbar.append(workflowActions);
      header.replaceWith(toolbar);
    } else header?.remove();
    const body = template.content.querySelector(".g4-smm-idea-v299 > .g1-card-body");
    body?.querySelectorAll(":scope > .g4-smm-idea-stage-v299").forEach((stage) => {
      const key = stage.dataset.g4ProductSmmIdeaStageViewV299;
      const head = stage.querySelector(".g4-smm-idea-stage-head-v299");
      const label = head?.innerHTML || escapeHtml(key);
      head?.remove();
      const panel = document.createElement("details");
      panel.className = "g4-product-smm-stage-v2";
      panel.dataset.g4ProductSmmStageV2 = key;
      panel.innerHTML = `<summary>${label}<span class="g4-product-smm-stage-arrow-v2" aria-hidden="true">›</span></summary><div class="g4-product-smm-stage-body-v2" data-g4-product-smm-stage-body-v2></div>`;
      const slot = panel.querySelector("[data-g4-product-smm-stage-body-v2]");
      if (options.openStages?.includes(key)) {
        panel.open = true;
        panel.dataset.g4ProductSmmInitialOpenV2 = "true";
        slot.append(stage);
      } else {
        const lazy = document.createElement("template");
        lazy.content.append(stage);
        slot.append(lazy);
      }
      body.insertBefore(panel, body.querySelector(".g4-smm-publication-embedded-v342"));
    });
    const preview = document.createElement("details");
    preview.className = "g4-product-smm-stage-v2";
    preview.dataset.g4ProductSmmStageV2 = "preview";
    preview.innerHTML = `<summary><strong>6. Предпросмотр в соцсети</strong><small>Один пример публикации на выбранной площадке</small><span class="g4-product-smm-stage-arrow-v2" aria-hidden="true">›</span></summary><div class="g4-product-smm-stage-body-v2" data-g4-product-smm-stage-body-v2></div>`;
    if (options.openStages?.includes("preview")) {
      preview.open = true;
      preview.dataset.g4ProductSmmInitialOpenV2 = "true";
      preview.querySelector("[data-g4-product-smm-stage-body-v2]").innerHTML =
        g4ProductSmmSocialPreviewV2(options.idea, options.content, options.strategy, options.product);
    }
    body.insertBefore(preview, body.querySelector(".g4-smm-publication-embedded-v342"));
  }
  return template.innerHTML;
}

function g4ProductSmmIdeaSubtitleV2(idea, productName) {
  const name = guruV185Text(idea?.name);
  return name && name !== guruV185Text(productName) && !/^Идея\s*№\s*\d+$/i.test(name) ? name : "";
}

function g4ProductSmmIdeaPlanPositionsV2(model) {
  const countsByFormat = new Map();
  const positionsByIdea = new Map();
  for (const idea of model.periodIdeas) {
    const formatId = guruV185Text(idea.primaryTaskFormatId);
    const position = (countsByFormat.get(formatId) || 0) + 1;
    countsByFormat.set(formatId, position);
    positionsByIdea.set(idea.id, position);
  }
  return positionsByIdea;
}

function g4ProductSmmIdeaPlanLabelV2(idea, model, positionsByIdea) {
  const row = model.rows.find((item) => item.format.id === idea.primaryTaskFormatId);
  const position = positionsByIdea.get(idea.id);
  const target = row ? row.min === null ? "—" : row.max === row.min ? row.min : `${row.min}–${row.max}` : "—";
  return position ? `${position} / ${target} идеи`
    : g4ProductSmmIdeaPlanningDateV2(idea) ? "Вне периода" : "Период не задан";
}

function g4ProductSmmIdeaListHtmlV2(model, strategy, content, product, ui = {}) {
  const positionsByIdea = g4ProductSmmIdeaPlanPositionsV2(model);
  return `<section class="g4-product-smm-ideas-v2" data-g4-product-smm-ideas-v2>
    <div class="g4-product-smm-section-title-v2"><h4>Карточки идей · ${content.ideas.length}</h4><span>Подробности открываются по клику</span></div>
    <div class="g4-product-smm-idea-list-v2">${content.ideas.map((idea, index) => {
      const topic = (strategy.topics || []).find((row) => row.id === idea.topicId);
      const row = model.rows.find((item) => item.format.id === idea.primaryTaskFormatId);
      const format = row?.format || (strategy.formats || []).find((item) => item.id === idea.primaryTaskFormatId);
      const productName = guruV185Text(product?.name) || "Продукт";
      const subtitle = g4ProductSmmIdeaSubtitleV2(idea, productName);
      const plan = g4ProductSmmIdeaPlanLabelV2(idea, model, positionsByIdea);
      const platforms = format ? g4SmmFormatPlatformsV299(format) : [];
      const open = ui.openIdeaIds?.includes(idea.id);
      const detail = open ? g4ProductSmmDetailV2(g4SmmIdeaHtmlV299(idea, index, content, strategy),
        { idea, content, strategy, product, openStages: ui.openStagesByIdea?.[idea.id] }) : "";
      return `<details class="g4-product-smm-idea-v2" data-g4-product-smm-idea-panel-v2="${escapeAttr(idea.id)}" ${open ? "open" : ""}>
        <summary><span class="g4-product-smm-idea-summary-content-v2">
          <span class="g4-product-smm-idea-headline-v2"><span class="g4-product-smm-idea-number-v2" aria-label="Идея номер ${index + 1}">№${index + 1}</span><span class="g4-product-smm-idea-format-v2"><span class="g4-product-smm-format-icon-v2" aria-hidden="true">${g4ProductSmmFormatIconV2(format || {})}</span><strong>${escapeHtml(format?.format || "Формат не выбран")}</strong></span></span>
          <span class="g4-product-smm-idea-title-v2"><strong>${escapeHtml(productName)}</strong><small data-g4-product-smm-idea-subtitle-v2="${escapeAttr(idea.id)}" ${subtitle ? "" : "hidden"}>${escapeHtml(subtitle)}</small></span>
          <span class="g4-product-smm-idea-meta-v2">
            <span class="g4-product-smm-idea-field-v2"><small>Основная задача</small><span>${escapeHtml(format?.task || "Не выбрана")}</span></span>
            <span class="g4-product-smm-idea-field-v2"><small>Тема</small><span>${escapeHtml(topic?.value || "Не выбрана")}</span></span>
            <span class="g4-product-smm-idea-field-v2"><small>Площадки</small><span class="g4-product-smm-idea-platforms-v2">${platforms.map(g4ProductSmmPlatformChipV2).join("") || "—"}</span></span>
            <span class="g4-product-smm-idea-field-v2 g4-product-smm-idea-plan-v2"><small>План формата</small><strong data-g4-product-smm-idea-plan-label-v2="${escapeAttr(idea.id)}">${escapeHtml(plan)}</strong></span>
          </span>
        </span><span class="g4-product-smm-idea-controls-v2">
          <span class="g4-product-smm-idea-menu-v2"><button type="button" data-g4-product-smm-idea-menu-toggle-v2 aria-label="Действия с идеей для ${escapeAttr(productName)}" aria-expanded="false" aria-haspopup="true">⋯</button><span class="g4-product-smm-idea-menu-panel-v2" data-g4-product-smm-idea-menu-panel-v2 hidden><button type="button" data-g4-product-smm-delete-idea-v2="${escapeAttr(idea.id)}" aria-label="Удалить идею для ${escapeAttr(productName)}">Удалить идею</button></span></span>
          <span class="g4-product-smm-idea-chevron-v2" aria-hidden="true">⌄</span>
        </span></summary>
        <div class="g4-product-smm-idea-detail-v2" data-g4-product-smm-idea-detail-v2>${detail}</div>
      </details>`;
    }).join("") || '<p class="g4-product-smm-empty-v2">Идей пока нет. Выберите тему в таблице.</p>'}</div>
  </section>`;
}

function g4ProductSmmCalendarIdeaTitleV2(idea, strategy, product) {
  const name = guruV185Text(idea.name);
  if (name && !/^Идея\s*№\s*\d+$/i.test(name)) return name;
  const topic = (strategy.topics || []).find((row) => row.id === idea.topicId);
  const productName = guruV185Text(product?.name) || "Идея";
  return [productName, guruV185Text(topic?.value)].filter(Boolean).join(" · ");
}

function g4ProductSmmCalendarIdeaCardV2(idea, content, strategy, product, days) {
  const title = g4ProductSmmCalendarIdeaTitleV2(idea, strategy, product);
  const format = (strategy.formats || []).find((row) => row.id === idea.primaryTaskFormatId);
  const publication = g4SmmPublicationForIdeaV324(idea, content);
  const platforms = publication?.platforms?.length ? publication.platforms : g4SmmFormatPlatformsV299(format || {});
  const dateLabel = (day) => new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(day.date);
  return `<article class="g4-product-smm-calendar-item-v2" draggable="true" data-g4-product-smm-calendar-drag-v339="${escapeAttr(idea.id)}">
    <span class="g4-product-smm-calendar-thumbnail-v2" aria-hidden="true">${g4ProductSmmFormatIconV2(format || {})}</span>
    <button type="button" class="g4-product-smm-calendar-idea-v2" data-g4-product-smm-open-idea-v2="${escapeAttr(idea.id)}" aria-label="Открыть идею: ${escapeAttr(title)}"><strong data-g4-product-smm-calendar-title-v2="${escapeAttr(idea.id)}">${escapeHtml(title)}</strong><small>${escapeHtml(format?.format || "Формат не выбран")} · ${escapeHtml(format?.task || "Задача не выбрана")}</small></button>
    <span class="g4-product-smm-calendar-platforms-v2">${platforms.slice(0, 2).map(g4ProductSmmPlatformChipV2).join("")}</span>
    <details class="g4-product-smm-calendar-menu-v2"><summary aria-label="Планирование: ${escapeAttr(title)}" title="Перенести идею">⋯</summary><div><label>Дата публикации<select data-g4-product-smm-calendar-assign-v2 data-g4-product-smm-calendar-idea-id-v2="${escapeAttr(idea.id)}" aria-label="Дата идеи ${escapeAttr(title)}"><option value="">Банк идей</option>${idea.scheduledDate && !days.some((day) => day.value === idea.scheduledDate) ? `<option value="${escapeAttr(idea.scheduledDate)}" selected>${escapeHtml(idea.scheduledDate)}</option>` : ""}${days.map((day) => `<option value="${escapeAttr(day.value)}" ${idea.scheduledDate === day.value ? "selected" : ""}>${escapeHtml(day.label)}, ${escapeHtml(dateLabel(day))}</option>`).join("")}</select></label></div></details>
  </article>`;
}

function g4ProductSmmBankHtmlV2(content, strategy, product) {
  const bank = (content.ideas || []).filter((idea) => !idea.scheduledDate);
  const days = g4SmmCalendarDaysV322(content);
  return `<section class="g4-product-smm-bank-section-v2" data-g4-product-smm-bank-v2 data-g4-product-smm-calendar-drop-v339="bank">
    <div class="g4-product-smm-section-title-v2"><h4>Банк идей · ${bank.length}</h4><span>Идеи без даты · перетащите в календарь</span></div>
    <div class="g4-product-smm-calendar-cards-v2">${bank.map((idea) => g4ProductSmmCalendarIdeaCardV2(idea, content, strategy, product, days)).join("") || '<p class="g4-product-smm-empty-v2">Все идеи распределены по датам.</p>'}</div>
  </section>`;
}

function g4ProductSmmCalendarHtmlV2(content, strategy, product, ui = {}) {
  const days = g4SmmCalendarDaysV322(content);
  const active = days.some((day) => day.value === ui.activeDay) ? ui.activeDay : days[0]?.value;
  const ideas = content.ideas || [];
  const otherDates = ideas.filter((idea) => idea.scheduledDate &&
    !days.some((day) => day.value === idea.scheduledDate));
  const selected = ideas.filter((idea) => idea.scheduledDate === active);
  const dateLabel = (day) => new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(day.date);
  return `<section class="g4-product-smm-calendar-v2" data-g4-product-smm-calendar-v2 data-g4-product-smm-active-day-v2="${escapeAttr(active)}">
    <div class="g4-product-smm-section-title-v2"><h4>Календарь идей · ${escapeHtml(g4SmmCalendarWeekLabelV322(content))}</h4><span>Перетащите идею на день или выберите дату в её меню</span></div>
    <div class="g4-product-smm-calendar-navigation-v2"><button type="button" data-g4-product-smm-week-shift-v322="-7" aria-label="Предыдущая неделя">‹</button><div class="g4-product-smm-calendar-week-scroll-v2"><div class="g4-product-smm-calendar-week-v2">${days.map((day) => {
      const count = ideas.filter((idea) => idea.scheduledDate === day.value).length;
      return `<button type="button" class="${day.value === active ? "is-active-v2" : ""}" data-g4-product-smm-calendar-day-v2="${escapeAttr(day.value)}" data-g4-product-smm-calendar-drop-v339="${escapeAttr(day.value)}" aria-pressed="${day.value === active}"><span>${escapeHtml(day.short)}</span><small>${escapeHtml(dateLabel(day))}</small><strong>${count}</strong></button>`;
    }).join("")}</div></div><button type="button" data-g4-product-smm-week-shift-v322="7" aria-label="Следующая неделя">›</button></div>
    <div class="g4-product-smm-calendar-selection-v2" data-g4-product-smm-calendar-selection-v2 data-g4-product-smm-calendar-drop-v339="${escapeAttr(active)}" aria-live="polite"><div class="g4-product-smm-calendar-cards-v2">${selected.map((idea) => g4ProductSmmCalendarIdeaCardV2(idea, content, strategy, product, days)).join("") || '<p class="g4-product-smm-empty-v2">На выбранный день идей пока нет. Перетащите идею из банка или выберите дату в её меню.</p>'}</div></div>
    ${otherDates.length ? `<details class="g4-product-smm-bank-v2" data-g4-product-smm-other-dates-v2 ${ui.otherDatesOpen ? "open" : ""}><summary>Идеи на другие даты · ${otherDates.length}<span aria-hidden="true">›</span></summary><div class="g4-product-smm-calendar-cards-v2">${otherDates.map((idea) => g4ProductSmmCalendarIdeaCardV2(idea, content, strategy, product, days)).join("")}</div></details>` : ""}
  </section>`;
}

function g4ProductSmmDaysAgoV2(date, now = new Date()) {
  const parsed = g4SmmDateValueV299(date);
  if (!parsed) return "Не было";
  const days = Math.max(0, Math.round((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) -
    Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())) / 86400000));
  return days === 0 ? "Сегодня" : days === 1 ? "Вчера" : `${days} дн. назад`;
}

function g4ProductSmmSummaryHtmlV2(model, ui = {}) {
  const quarter = model.quarter;
  const rows = model.rows.filter((row) => row.min !== null);
  return `<section class="g4-product-smm-summary-v2" data-g4-product-smm-summary-v2>
    <div class="g4-product-smm-section-title-v2"><h4>Что нужно сделать</h4><span>${escapeHtml(model.period.dateLabel)} · ${escapeHtml(model.period.label)}</span></div>
    <div class="g4-product-smm-summary-scroll-v2"><table><thead><tr><th>Формат</th><th>План</th><th>Идеи</th><th>Факт</th><th>Статус</th></tr></thead><tbody>${rows.map((row) => `<tr ${row.status.startsWith("Недобор") ? `data-g4-product-smm-gap-format-v2="${escapeAttr(row.format.id)}" tabindex="0"` : ""}><th>${escapeHtml(row.format.format)}</th><td>${row.min === row.max ? row.min : `${row.min}–${row.max}`}</td><td>${row.ideas}</td><td>${row.fact}</td><td><span class="g4-product-smm-status-v2 is-${row.tone}-v2">${row.tone === "done" ? "✓" : "●"} ${escapeHtml(row.status)}</span></td></tr>`).join("")}</tbody></table></div>
    <div class="g4-product-smm-quarter-v2"><strong>${quarter.label}</strong><span>${quarter.fact} / ${quarter.target}</span><progress max="${Math.max(1, quarter.target)}" value="${Math.min(quarter.fact, Math.max(1, quarter.target))}" aria-label="Квартальная цель"></progress><span>${quarter.percent}% · осталось ${quarter.remaining}</span></div>
    <div class="g4-product-smm-signals-v2">
      <details data-g4-product-smm-signal-v2="formats" ${ui.openSignals?.includes("formats") ? "open" : ""}><summary>Форматы без использования · ${model.unusedPairs.length}<span aria-hidden="true">›</span></summary><div class="g4-product-smm-summary-scroll-v2"><table><thead><tr><th>Площадка</th><th>Формат</th><th>Последняя публикация</th><th>Статус</th></tr></thead><tbody>${model.unusedPairs.map((pair) => `<tr><td>${escapeHtml(pair.platform)}</td><td>${escapeHtml(pair.format)}</td><td>${escapeHtml(g4ProductSmmDaysAgoV2(pair.last))}</td><td>${escapeHtml(pair.status)}</td></tr>`).join("") || '<tr><td colspan="4">Все форматы использовались</td></tr>'}</tbody></table></div></details>
      <details data-g4-product-smm-signal-v2="topics" ${ui.openSignals?.includes("topics") ? "open" : ""}><summary>Темы без использования · ${model.topics.filter((topic) => topic.stale).length}<span aria-hidden="true">›</span></summary><div class="g4-product-smm-summary-scroll-v2"><table><thead><tr><th>Тема</th><th>Последнее использование</th><th>Статус</th></tr></thead><tbody>${model.topics.map((topic) => `<tr><td>${escapeHtml(topic.name)}</td><td>${escapeHtml(g4ProductSmmDaysAgoV2(topic.last))}</td><td>${escapeHtml(topic.status)}</td></tr>`).join("") || '<tr><td colspan="3">Темы не заданы</td></tr>'}</tbody></table></div></details>
    </div>
  </section>`;
}

function g4ProductSmmWorkspaceV2(product, strategy, content, ui = {}) {
  const model = g4ProductSmmModelV2(content, strategy);
  const productId = g4ProductSmmIdV523(product);
  const selectedPeriod = `${model.period.count}:${model.period.unit}`;
  const periodOptions = [
    ...[1, 2, 4, 8].map((count) => ({ count, unit: "week" })),
    { count: 1, unit: "month" }, { count: 1, unit: "quarter" }, { count: 1, unit: "year" },
  ];
  if (!periodOptions.some((option) => `${option.count}:${option.unit}` === selectedPeriod))
    periodOptions.unshift({ count: model.period.count, unit: model.period.unit });
  const linked = new Set(content.ideas.map((idea) => g4SmmPublicationForIdeaV324(idea, content)?.id).filter(Boolean));
  const orphan = content.publications.filter((publication) => !linked.has(publication.id));
  return `<section class="g4-product-smm-workspace-v2 g4-product-smm-v523" data-g4-product-smm-product-id-v523="${escapeAttr(productId)}" data-g4-product-smm-workspace-v2>
    <header class="g4-product-smm-head-v2"><div><h3>SMM-стратегия продукта</h3><span>${escapeHtml(product?.name || "Продукт")} · VK / Telegram / Instagram / YouTube</span></div></header>
    <div class="g4-product-smm-toolbar-v2">
      <div class="g4-product-smm-period-v2"><strong>${escapeHtml(model.period.dateLabel)}</strong><button type="button" data-g4-product-smm-week-shift-v322="-7" aria-label="Предыдущая неделя">←</button><button type="button" data-g4-product-smm-week-shift-v322="7" aria-label="Следующая неделя">→</button><select data-g4-product-smm-period-select-v2 aria-label="Период планирования">${periodOptions.map((option) => {
        const unit = g4SmmPeriodUnitV304(option.unit);
        return `<option value="${option.count}:${option.unit}" ${`${option.count}:${option.unit}` === selectedPeriod ? "selected" : ""}>${option.count} ${g4SmmPeriodPluralV304(option.count, unit.forms)}</option>`;
      }).join("")}</select></div>
      <div class="g4-product-smm-toolbar-progress-v2"><strong>${model.coveredIdeas} / ${model.targetIdeas} идей</strong><progress max="${Math.max(1, model.targetIdeas)}" value="${Math.min(model.coveredIdeas, Math.max(1, model.targetIdeas))}" aria-label="Идеи по плану"></progress><span>${model.scheduledCount} запланировано</span></div>
    </div>
    ${g4ProductSmmTableHtmlV2(model, productId)}
    ${g4ProductSmmIdeaListHtmlV2(model, strategy, content, product, ui)}
    ${g4ProductSmmBankHtmlV2(content, strategy, product)}
    ${g4ProductSmmCalendarHtmlV2(content, strategy, product, ui)}
    ${g4ProductSmmSummaryHtmlV2(model, ui)}
    ${orphan.length ? `<section class="g4-product-smm-orphans-v2"><h4>Публикации без карточки идеи · ${orphan.length}</h4>${orphan.map((publication) => `<details data-g4-product-smm-orphan-panel-v2="${escapeAttr(publication.id)}"><summary>${escapeHtml(g4SmmPublicationCardTitleV331(publication, content.publications.indexOf(publication)))}</summary><div data-g4-product-smm-orphan-detail-v2></div></details>`).join("")}</section>` : ""}
  </section>`;
}
