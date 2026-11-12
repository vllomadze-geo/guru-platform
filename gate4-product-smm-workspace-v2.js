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

function g4ProductSmmCanScheduleV528(value, now = new Date()) {
  const date = g4SmmDateValueV299(value);
  return Boolean(date && g4SmmIsoDateV322(date) === value && value >= g4SmmIsoDateV322(now));
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
        g4SmmPublicationPlatformIdsV532(publication).includes(g4SmmPlatformIdV529(platform));
      const last = published.filter(samePair).sort((a, b) => b.date.localeCompare(a.date))[0];
      if (last?.date >= cutoff90) return [];
      const planned = futurePublications.some(samePair) || futureIdeas.some((idea) =>
        idea.primaryTaskFormatId === format.id &&
        g4SmmIdeaPlatformRowsV529(idea).some((row) => row.platform_id === g4SmmPlatformIdV529(platform)));
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
      <td><div class="g4-product-smm-platforms-v2">${g4SmmMatrixRowsV529(row.format.id).map((pair) => `<label class="g4-smm-pair-toggle-v529" title="${escapeAttr(pair.platform_notes ? "Подходит · " + pair.platform_notes : "Подходит")}"><input type="checkbox" data-g4-product-smm-strategy-platform-v529="${escapeAttr(pair.platform_id)}" data-g4-product-smm-format-id-v529="${escapeAttr(row.format.id)}" ${g4SmmFormatPlatformsV299(row.format).some((name) => g4SmmPlatformIdV529(name) === pair.platform_id) ? "checked" : ""}><span>${g4ProductSmmPlatformChipV2(pair.display_name)}</span></label>`).join("") || "—"}${g4SmmFormatLegacyPlatformsV529(row.format).map((value) => `<span class="g4-smm-legacy-pair-v529" title="Не поддерживается для формата · сохранено из прежних данных">${escapeHtml(value)}</span>`).join("")}</div></td>
    </tr>`).join("")}</tbody>
  </table></div>`;
}

function g4ProductSmmMessageDateV535(idea, month = "long") {
  const scheduledDate = guruV185Text(idea?.scheduledDate);
  if (!/^(\d{4})-(\d{2})-(\d{2})$/.test(scheduledDate)) return "";
  const day = new Date(`${scheduledDate}T00:00:00Z`);
  return Number.isFinite(day.getTime()) && day.toISOString().slice(0, 10) === scheduledDate
    ? new Intl.DateTimeFormat("ru-RU", { day: "numeric", month, timeZone: "UTC" }).format(day).replace(/\.$/, "")
    : "";
}

function g4ProductSmmNativePreviewV532(row, value, product, format, topic, idea) {
  // The account belongs to the project/company, not to the product selected in
  // the SMM workspace. Read the passport live so product switching never
  // changes the apparent author of the same social page.
  const name = guruV185Text(state?.project?.name || state?.project?.companyName) || "Название компании";
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase();
  const title = idea?.platformOverrides?.[row.platform_id]?.title ?? idea?.base?.title ?? "";
  const media = value.media?.assetId
    ? value.media.kind === "video"
      ? `<video controls playsinline preload="metadata" aria-label="Видео публикации" data-g4-product-smm-media-asset-v529="${escapeAttr(value.media.assetId)}"></video>`
      : `<img alt="Медиа публикации" data-g4-product-smm-media-asset-v529="${escapeAttr(value.media.assetId)}">`
    : `<span aria-hidden="true">${escapeHtml(g4ProductSmmFormatIconV2(format || {}))}</span><strong>${escapeHtml(row.native_format)}</strong><small>${escapeHtml(topic?.value || "Тема публикации")}</small>`;
  const author = `<div class="g4-product-smm-social-author-v2"><span class="g4-product-smm-social-avatar-v2">${escapeHtml(initials || "Б")}</span><span><strong>${escapeHtml(name)}</strong><small>${escapeHtml(row.display_name)}</small></span></div>`;
  const captionText = escapeHtml(value.text || "Добавьте текст в общем редакторе");
  const caption = `<p class="g4-product-smm-social-caption-v2">${row.platform_id === "instagram" ? `<strong class="g4-smm-caption-account-v533">${escapeHtml(name)}</strong> ` : ""}${captionText}</p>`;
  const actions = row.platform_id === "instagram" ? "♡|◯|➤|▢"
    : row.platform_id === "vk" ? "♡|▢|↗"
      : row.platform_id === "youtube" ? "♡ Нравится|◌ Комментарии|↗ Поделиться"
        : "♡ Нравится|◌ Комментировать|↗ Поделиться";
  const parts = {
    author,
    title: title ? `<strong class="g4-product-smm-social-heading-v2">${escapeHtml(title)}</strong>` : "",
    caption,
    media: row.media_type === "optional" && !value.media?.assetId ? ""
      : `<div class="g4-product-smm-social-media-v2">${media}</div>`,
    actions: `<div class="g4-product-smm-social-actions-v2" aria-hidden="true">${actions.split("|").map((label) => `<span>${label}</span>`).join("")}</div>`,
    views: `<div class="g4-smm-native-views-v532" aria-hidden="true">◉ Просмотры</div>`,
    reactions: `<div class="g4-smm-native-reactions-v532" aria-hidden="true">♡ Реакции</div>`,
    comments: `<div class="g4-smm-native-comments-v532" aria-hidden="true">◌ Комментарии</div>`,
    carousel_position: `<div class="g4-smm-native-carousel-v532" aria-hidden="true">1 / подборка <span>● ○ ○</span></div>`,
    story_progress: `<div class="g4-smm-native-story-progress-v532" aria-hidden="true"><span></span><span></span><span></span><strong>${escapeHtml(row.preview_chrome?.top || "")}</strong></div>`,
    video_controls: `<div class="g4-smm-native-video-controls-v532" aria-hidden="true"><strong>${escapeHtml(row.preview_chrome?.top || "")}</strong><div>${(row.preview_chrome?.actions || []).map((icon) => `<span>${escapeHtml(icon)}</span>`).join("")}</div></div>`,
  };
  const body = row.preview_parts?.length
    ? row.preview_parts.map((key) => parts[key] || "").join("")
    : `${author}<p class="g4-product-smm-social-caption-v2">Эта площадка сохранена из прежних данных. Проверьте совместимость формата.</p>`;
  const followUp = value.cta ? `<span class="g4-smm-pair-cta-v529">${escapeHtml(value.cta)}</span>` : "";
  const link = row.link_model?.supported && value.link ? `<span class="g4-smm-pair-link-v529">${escapeHtml(value.link)}</span>` : "";
  if (row.platform_id === "telegram" && row.preview_model === "message") {
    const date = g4ProductSmmMessageDateV535(idea);
    // Telegram has a channel header and a separate message bubble. Engagement
    // numbers are omitted because the draft has no published metrics yet.
    return `<div class="g4-product-smm-social-post-v2 g4-smm-native-preview-v532 is-message is-platform-telegram g4-smm-telegram-preview-v534" data-g4-product-smm-social-preview-v2="${escapeAttr(idea.id)}" data-g4-smm-preview-renderer-v532="${escapeAttr(row.preview_renderer)}">
      <div class="g4-smm-telegram-header-v534"><span class="g4-smm-telegram-back-v534" aria-hidden="true">‹</span><strong>${escapeHtml(name)}</strong><span class="g4-product-smm-social-avatar-v2" aria-hidden="true">${escapeHtml(initials || "Б")}</span></div>
      <div class="g4-smm-telegram-chat-v534">
        ${date ? `<div class="g4-smm-telegram-date-v534">${escapeHtml(date)}</div>` : ""}
        <div class="g4-smm-telegram-message-v534">
          <span class="g4-product-smm-social-avatar-v2 g4-smm-telegram-message-avatar-v534" aria-hidden="true">${escapeHtml(initials || "Б")}</span>
          <div class="g4-smm-telegram-bubble-v534">${parts.media}${caption}${followUp || link ? `<div class="g4-smm-native-followup-v532">${followUp}${link}</div>` : ""}
            <div class="g4-smm-native-reactions-v532 g4-smm-telegram-reactions-v534" aria-label="Реакции после публикации"><span>❤️</span><span>🔥</span><span>🥰</span><span>👀</span></div>
            <div class="g4-smm-native-views-v532 g4-smm-telegram-views-v534" aria-label="Просмотры после публикации">◉</div>
          </div>
          <span class="g4-smm-telegram-share-v534" aria-hidden="true">➜</span>
        </div>
        <div class="g4-smm-native-comments-v532 g4-smm-telegram-comments-v534" aria-hidden="true"><span>◯</span><span>Прокомментировать</span><span>›</span></div>
      </div>
    </div>`;
  }
  if (row.platform_id === "max" && row.preview_model === "message") {
    const date = g4ProductSmmMessageDateV535(idea);
    // MAX displays the channel above the blue chat, while media, caption and
    // engagement belong to one bubble. Draft previews have no real counters.
    return `<div class="g4-product-smm-social-post-v2 g4-smm-native-preview-v532 is-message is-platform-max g4-smm-max-preview-v535" data-g4-product-smm-social-preview-v2="${escapeAttr(idea.id)}" data-g4-smm-preview-renderer-v532="${escapeAttr(row.preview_renderer)}">
      <div class="g4-smm-max-header-v535"><span class="g4-smm-max-back-v535" aria-hidden="true">‹</span><span class="g4-product-smm-social-avatar-v2" aria-hidden="true">${escapeHtml(initials || "Б")}</span><strong>${escapeHtml(name)}</strong><span class="g4-smm-max-menu-v535" aria-hidden="true">⋯</span></div>
      <div class="g4-smm-max-chat-v535">
        ${date ? `<div class="g4-smm-max-date-v535">${escapeHtml(date)}</div>` : ""}
        <div class="g4-smm-max-bubble-v535">${parts.media}${caption}${followUp || link ? `<div class="g4-smm-native-followup-v532">${followUp}${link}</div>` : ""}
          <div class="g4-smm-native-reactions-v532 g4-smm-max-reactions-v535" aria-label="Реакции после публикации"><span>❤️</span><span>☺</span></div>
          <div class="g4-smm-native-views-v532 g4-smm-max-views-v535" aria-label="Просмотры после публикации">◉</div>
        </div>
        <span class="g4-smm-max-down-v535" aria-hidden="true">⌄</span>
      </div>
      <div class="g4-smm-max-composer-v535" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 12.5 14 6.5a3 3 0 0 1 4.2 4.2l-8.3 8.3a5 5 0 0 1-7.1-7.1l8.8-8.8" /></svg><span>Пост</span><span>☺</span><span>▣</span><svg viewBox="0 0 24 24"><rect x="9" y="2" width="6" height="13" rx="3" /><path d="M6 11a6 6 0 0 0 12 0M12 17v5m-4 0h8" /></svg></div>
    </div>`;
  }
  if (row.platform_id === "vk" && ["feed", "carousel", "article"].includes(row.preview_model)) {
    const date = g4ProductSmmMessageDateV535(idea, "short");
    const icon = (path) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
    const backIcon = icon('<path d="m15 4-8 8 8 8"/>');
    const searchIcon = icon('<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/>');
    const bellIcon = icon('<path d="M6 9a6 6 0 0 1 12 0v4l2 3H4l2-3V9ZM10 20h4"/>');
    const heartIcon = icon('<path d="M20.8 8.5c0 4.6-8.8 10.1-8.8 10.1S3.2 13.1 3.2 8.5a4.6 4.6 0 0 1 8.8-1.8 4.6 4.6 0 0 1 8.8 1.8Z"/>');
    const commentIcon = icon('<path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H8l-4 2v-5a7.5 7.5 0 1 1 16-4.5Z"/>');
    const shareIcon = icon('<path d="m14 4 7 7-7 7v-4.2C8.4 13.8 5 16 3 20c0-7 4.4-11 11-11V4Z"/>');
    const homeIcon = icon('<path d="m3 11 9-8 9 8v9H4v-9Zm6 9v-7h6v7"/>');
    const mediaBlock = parts.media
      ? `<div class="g4-smm-vk-media-v536">${parts.media}${row.preview_model === "carousel" ? parts.carousel_position : ""}</div>`
      : "";
    // The passport owns the page name. The draft supplies only its own media,
    // caption and optional CTA/link; published engagement counts are unknown.
    return `<div class="g4-product-smm-social-post-v2 g4-smm-native-preview-v532 is-${escapeAttr(row.preview_model)} is-platform-vk g4-smm-vk-preview-v536" data-g4-product-smm-social-preview-v2="${escapeAttr(idea.id)}" data-g4-smm-preview-renderer-v532="${escapeAttr(row.preview_renderer)}">
      <div class="g4-smm-vk-appbar-v536" aria-hidden="true"><span class="g4-smm-vk-back-v536">${backIcon}</span><span class="g4-smm-vk-search-v536">${searchIcon}<span>Поиск</span></span><span class="g4-smm-vk-bell-v536">${bellIcon}</span><span class="g4-smm-vk-menu-v536">•••</span></div>
      <div class="g4-smm-vk-tabs-v536" aria-hidden="true"><span class="is-active">Главная</span><span>Посты</span><span>Товары</span><span>Клипы</span><span>Фото</span><span>Видео</span></div>
      <div class="g4-smm-vk-post-v536">
        <div class="g4-smm-vk-post-header-v536">${author}<span aria-hidden="true">•••</span></div>
        ${mediaBlock}${caption}
        ${followUp || link ? `<div class="g4-smm-native-followup-v532">${followUp}${link}</div>` : ""}
        <div class="g4-smm-vk-actions-v536" aria-label="Действия после публикации"><span aria-hidden="true">${heartIcon}${commentIcon}${shareIcon}</span>${date ? `<time datetime="${escapeAttr(idea.scheduledDate)}">${escapeHtml(date)}</time>` : ""}</div>
      </div>
      <div class="g4-smm-vk-bottom-v536" aria-hidden="true"><span>${homeIcon}</span><span>${searchIcon}</span><span>${commentIcon}</span><span>◌</span><span>▧</span><span>☰</span></div>
    </div>`;
  }
  if (row.platform_id === "instagram" && ["feed", "carousel"].includes(row.preview_model)) {
    const date = g4ProductSmmMessageDateV535(idea);
    const icon = (path) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
    const backIcon = icon('<path d="m15 4-8 8 8 8"/>');
    const heartIcon = icon('<path d="M20.8 8.5c0 4.6-8.8 10.1-8.8 10.1S3.2 13.1 3.2 8.5a4.6 4.6 0 0 1 8.8-1.8 4.6 4.6 0 0 1 8.8 1.8Z"/>');
    const commentIcon = icon('<path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H8l-4 2v-5a7.5 7.5 0 1 1 16-4.5Z"/>');
    const shareIcon = icon('<path d="m21 3-8.5 18-2.7-7.8L2 10.5 21 3Zm-11.2 10.2L21 3"/>');
    const saveIcon = icon('<path d="M5 3h14v18l-7-5-7 5V3Z"/>');
    // Only one asset is stored per idea today. Show its position without
    // inventing a total number of carousel slides or engagement metrics.
    const carousel = row.preview_model === "carousel";
    return `<div class="g4-product-smm-social-post-v2 g4-smm-native-preview-v532 is-${escapeAttr(row.preview_model)} is-platform-instagram g4-smm-instagram-preview-v537" data-g4-product-smm-social-preview-v2="${escapeAttr(idea.id)}" data-g4-smm-preview-renderer-v532="${escapeAttr(row.preview_renderer)}">
      <div class="g4-smm-instagram-appbar-v537" aria-hidden="true"><span>${backIcon}</span><span><strong>Публикации</strong><small>${escapeHtml(name)}</small></span><span class="g4-smm-instagram-follow-v537">Подписаться</span></div>
      <div class="g4-smm-instagram-post-v537">
        <div class="g4-smm-instagram-post-header-v537">${author}<span aria-hidden="true">•••</span></div>
        <div class="g4-smm-instagram-media-v537">${parts.media}${carousel ? '<span class="g4-smm-instagram-slide-v537" aria-label="Первое фото подборки">1 / подборка</span>' : ""}</div>
        ${carousel ? '<div class="g4-smm-instagram-pager-v537" aria-hidden="true"><span></span></div>' : ""}
        <div class="g4-smm-instagram-actions-v537" aria-hidden="true"><span>${heartIcon}${commentIcon}${shareIcon}</span>${saveIcon}</div>
        <div class="g4-smm-instagram-caption-v537">${caption}${followUp ? `<div class="g4-smm-native-followup-v532">${followUp}</div>` : ""}</div>
        ${date ? `<time class="g4-smm-instagram-date-v537" datetime="${escapeAttr(idea.scheduledDate)}">${escapeHtml(date)}</time>` : ""}
      </div>
    </div>`;
  }
  return `<div class="g4-product-smm-social-post-v2 g4-smm-native-preview-v532 is-${escapeAttr(row.preview_model)} is-platform-${escapeAttr(row.platform_id)}" data-g4-product-smm-social-preview-v2="${escapeAttr(idea.id)}" data-g4-smm-preview-renderer-v532="${escapeAttr(row.preview_renderer)}">${body}${followUp || link ? `<div class="g4-smm-native-followup-v532">${followUp}${link}</div>` : ""}</div>`;
}

function g4ProductSmmPreviewCardsV529(idea, strategy, product) {
  const format = (strategy.formats || []).find((row) => row.id === idea.primaryTaskFormatId);
  const topic = (strategy.topics || []).find((row) => row.id === idea.topicId);
  const readiness = g4SmmIdeaReadinessV529(idea);
  return readiness.items.map(({ row, ready, reason }) => {
    const value = g4SmmIdeaEffectiveContentV529(idea, row.platform_id);
    const override = idea.platformOverrides?.[row.platform_id] || {};
    const field = (key, label, multiline = false) => {
      const inherited = guruV185Text(value[key]).slice(0, 90);
      const placeholder = inherited ? `Из общего редактора: ${inherited}` : "Не задано в общем редакторе";
      const attributes = `data-g4-product-smm-override-field-v529="${key}" data-g4-product-smm-idea-id-v529="${escapeAttr(idea.id)}" data-g4-product-smm-platform-id-v529="${escapeAttr(row.platform_id)}"`;
      return `<label>${escapeHtml(label)}${multiline
        ? `<textarea rows="3" placeholder="${escapeAttr(placeholder)}" ${attributes}>${escapeHtml(override[key] ?? "")}</textarea>`
        : `<input type="text" value="${escapeAttr(override[key] ?? "")}" placeholder="${escapeAttr(placeholder)}" ${attributes}>`}</label>`;
    };
    return `<article class="g4-smm-pair-card-v529" data-g4-product-smm-pair-card-v529="${escapeAttr(row.platform_id)}" data-g4-smm-pair-format-v532="${escapeAttr(row.format_id)}">
      <header><strong>${escapeHtml(row.display_name)}</strong><span>${escapeHtml(row.native_format)}</span><em class="${ready ? "is-ready" : "is-pending"}">${ready ? "Готово" : reason}</em></header>
      <div class="g4-smm-preview-launch-v538" data-g4-product-smm-preview-launch-v538>
        <div class="g4-smm-preview-launch-bar-v538"><button type="button" data-g4-product-smm-preview-open-v538 aria-label="Открыть предпросмотр ${escapeAttr(row.display_name)} на весь экран">⤢ На весь экран</button></div>
        ${g4ProductSmmNativePreviewV532(row, value, product, format, topic, idea)}
      </div>
      ${row.platform_notes ? `<p class="g4-smm-pair-note-v529">${escapeHtml(row.platform_notes)}</p>` : ""}
      <details class="g4-smm-pair-overrides-v529"><summary>Настроить для площадки</summary><div><small>Пустые поля используют общий редактор.</small>
        ${row.title_model?.supported ? field("title", row.title_model.max_characters ? `Название · до ${row.title_model.max_characters} символов` : "Название") : ""}
        ${row.text_model?.supported ? field("text", row.platform_id === "youtube" ? "Описание" : "Подпись", true) : ""}
        ${row.cta_model?.supported ? field("cta", "CTA") : ""}
        ${row.link_model?.supported ? field("link", "Ссылка") : ""}
        ${row.supported ? `<label class="g4-smm-pair-media-label-v529">Создать адаптацию медиа<input type="file" accept="image/*,video/*" data-g4-product-smm-media-upload-v529 data-g4-product-smm-idea-id-v529="${escapeAttr(idea.id)}" data-g4-product-smm-platform-id-v529="${escapeAttr(row.platform_id)}"></label>` : ""}
      </div></details>
    </article>`;
  }).join("") || '<p class="g4-product-smm-empty-v2">Выберите площадки для этой идеи.</p>';
}

function g4ProductSmmSocialPreviewV2(idea, content, strategy, product) {
  const format = (strategy.formats || []).find((row) => row.id === idea.primaryTaskFormatId);
  const selected = new Set(idea.selectedPlatformIds || []);
  const readiness = g4SmmIdeaReadinessV529(idea);
  const base = idea.base || {};
  const initial = g4SmmIdeaEffectiveContentV529(idea);
  const field = (key, label, multiline = false) => `<label>${escapeHtml(label)}${multiline
    ? `<textarea rows="5" data-g4-product-smm-base-field-v529="${key}" data-g4-product-smm-idea-id-v529="${escapeAttr(idea.id)}">${escapeHtml(initial[key] || "")}</textarea>`
    : `<input type="text" value="${escapeAttr(initial[key] || "")}" data-g4-product-smm-base-field-v529="${key}" data-g4-product-smm-idea-id-v529="${escapeAttr(idea.id)}">`}</label>`;
  return `<div class="g4-smm-pair-workspace-v529" data-g4-product-smm-pair-workspace-v529="${escapeAttr(idea.id)}">
    <div class="g4-smm-pair-editor-v529"><h4>Общий редактор</h4><small>Один исходный материал для всех выбранных площадок</small>
      ${field("title", "Заголовок")}${field("text", "Текст", true)}
      <label class="g4-smm-pair-media-label-v529">Фото / видео<input type="file" accept="image/*,video/*" data-g4-product-smm-media-upload-v529 data-g4-product-smm-idea-id-v529="${escapeAttr(idea.id)}"></label>
      ${base.media ? `<small>${escapeHtml(base.media.name || "Медиа загружено")} · ${base.media.width || "?"}×${base.media.height || "?"}${base.media.duration ? ` · ${Math.round(base.media.duration)} сек` : ""}</small>` : ""}
      ${field("cta", "CTA")}${field("link", "Ссылка")}
      <div class="g4-smm-pair-picker-v529 g4-smm-platform-chips-v335"><strong>Площадки идеи</strong>${g4SmmMatrixRowsV529(idea.primaryTaskFormatId).map((row) => `<label class="g4-smm-platform-option-v530"><input type="checkbox" data-g4-product-smm-idea-platform-v529="${escapeAttr(row.platform_id)}" data-g4-product-smm-idea-id-v529="${escapeAttr(idea.id)}" ${selected.has(row.platform_id) ? "checked" : ""}><span>${escapeHtml(row.display_name)}</span></label>`).join("") || "Сначала выберите формат"}</div>
      ${idea.legacyPlatforms?.length ? `<small>Сохранённые старые площадки: ${escapeHtml(idea.legacyPlatforms.join(", "))}. Проверьте совместимость.</small>` : ""}
    </div>
    <div class="g4-smm-pair-previews-v529"><div class="g4-smm-pair-toolbar-v529"><strong data-g4-product-smm-readiness-v529>Готово ${readiness.ready} из ${readiness.total} площадок</strong><span><button type="button" data-g4-product-smm-preview-shift-v529="-1" aria-label="Предыдущая площадка">‹</button><button type="button" data-g4-product-smm-preview-shift-v529="1" aria-label="Следующая площадка">›</button></span></div>
      <div class="g4-smm-pair-rail-v529" data-g4-product-smm-preview-rail-v529>${g4ProductSmmPreviewCardsV529(idea, strategy, product)}</div>
    </div>
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
      if (key === "verification") {
        const title = head?.querySelector("strong");
        if (title) title.textContent = "6. Проверка и доработка";
      }
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
    preview.innerHTML = `<summary><strong>5. Предпросмотр в соцсети</strong><small>Один редактор · выбранные площадки</small><span class="g4-product-smm-stage-arrow-v2" aria-hidden="true">›</span></summary><div class="g4-product-smm-stage-body-v2" data-g4-product-smm-stage-body-v2></div>`;
    if (options.openStages?.includes("preview")) {
      preview.open = true;
      preview.dataset.g4ProductSmmInitialOpenV2 = "true";
      preview.querySelector("[data-g4-product-smm-stage-body-v2]").innerHTML =
        g4ProductSmmSocialPreviewV2(options.idea, options.content, options.strategy, options.product);
    }
    body.insertBefore(preview,
      body.querySelector(':scope > [data-g4-product-smm-stage-v2="verification"]') ||
      body.querySelector(".g4-smm-publication-embedded-v342"));
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
    <div class="g4-product-smm-section-title-v2"><h4>Карточки идей</h4><span>Подробности открываются по клику</span></div>
    <div class="g4-product-smm-idea-list-v2">${content.ideas.map((idea, index) => {
      const topic = (strategy.topics || []).find((row) => row.id === idea.topicId);
      const row = model.rows.find((item) => item.format.id === idea.primaryTaskFormatId);
      const format = row?.format || (strategy.formats || []).find((item) => item.id === idea.primaryTaskFormatId);
      const productName = guruV185Text(product?.name) || "Продукт";
      const subtitle = g4ProductSmmIdeaSubtitleV2(idea, productName);
      const plan = g4ProductSmmIdeaPlanLabelV2(idea, model, positionsByIdea);
      const platforms = g4SmmIdeaPlatformsV529(idea);
      const photo = g4ProductSmmIdeaPhotoV2(idea);
      const open = ui.openIdeaIds?.includes(idea.id);
      const detail = open ? g4ProductSmmDetailV2(g4SmmIdeaHtmlV299(idea, index, content, strategy),
        { idea, content, strategy, product, openStages: ui.openStagesByIdea?.[idea.id] }) : "";
      return `<details class="g4-product-smm-idea-v2" data-g4-product-smm-idea-panel-v2="${escapeAttr(idea.id)}" ${open ? "open" : ""}>
        <summary class="${photo ? "has-photo-v2" : ""}"><span class="g4-product-smm-idea-summary-content-v2">
          <span class="g4-product-smm-idea-headline-v2"><span class="g4-product-smm-idea-number-v2" aria-label="Идея номер ${index + 1}">№${index + 1}</span><span class="g4-product-smm-idea-format-v2"><span class="g4-product-smm-format-icon-v2" aria-hidden="true">${g4ProductSmmFormatIconV2(format || {})}</span><strong>${escapeHtml(format?.format || "Формат не выбран")}</strong></span></span>
          <span class="g4-product-smm-idea-title-v2"><strong>${escapeHtml(productName)}</strong><small data-g4-product-smm-idea-subtitle-v2="${escapeAttr(idea.id)}" ${subtitle ? "" : "hidden"}>${escapeHtml(subtitle)}</small></span>
          <span class="g4-product-smm-idea-meta-v2">
            <span class="g4-product-smm-idea-field-v2"><small>Основная задача</small><span>${escapeHtml(format?.task || "Не выбрана")}</span></span>
            <span class="g4-product-smm-idea-field-v2"><small>Тема</small><span>${escapeHtml(topic?.value || "Не выбрана")}</span></span>
            <span class="g4-product-smm-idea-field-v2"><small>Площадки</small><span class="g4-product-smm-idea-platforms-v2">${platforms.map(g4ProductSmmPlatformChipV2).join("") || "—"}</span></span>
            <span class="g4-product-smm-idea-field-v2"><small>Готовность</small><span data-g4-product-smm-idea-readiness-v529="${escapeAttr(idea.id)}">${(() => { const ready = g4SmmIdeaReadinessV529(idea); return `Готово ${ready.ready} из ${ready.total} площадок`; })()}</span></span>
            <span class="g4-product-smm-idea-field-v2 g4-product-smm-idea-plan-v2"><small>План формата</small><strong data-g4-product-smm-idea-plan-label-v2="${escapeAttr(idea.id)}">${escapeHtml(plan)}</strong></span>
          </span>
        </span>${g4ProductSmmIdeaPhotoHtmlV2(idea, photo)}<span class="g4-product-smm-idea-controls-v2">
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

function g4ProductSmmIdeaPhotoV2(idea) {
  return [idea.base?.media, ...(Array.isArray(idea.selectedPlatformIds) ? idea.selectedPlatformIds : [])
    .map((id) => idea.platformOverrides?.[id]?.media)]
    .find((value) => value?.kind === "image" && value.assetId);
}

function g4ProductSmmIdeaPhotoHtmlV2(idea, media = g4ProductSmmIdeaPhotoV2(idea)) {
  return media ? `<span class="g4-product-smm-idea-photo-v2" data-g4-product-smm-idea-photo-v2="${escapeAttr(idea.id)}" aria-hidden="true"><span class="g4-product-smm-idea-photo-fallback-v2">▣</span><img alt="" loading="lazy" data-g4-product-smm-media-asset-v529="${escapeAttr(media.assetId)}"></span>` : "";
}

function g4ProductSmmCalendarThumbnailHtmlV2(idea, format) {
  const media = g4ProductSmmIdeaPhotoV2(idea);
  return `<span class="g4-product-smm-calendar-thumbnail-v2" title="${escapeAttr(format?.format || "Формат не выбран")}" aria-hidden="true"><span class="g4-product-smm-calendar-thumbnail-fallback-v2">${g4ProductSmmFormatIconV2(format || {})}</span>${media ? `<img alt="" loading="lazy" data-g4-product-smm-media-asset-v529="${escapeAttr(media.assetId)}">` : ""}</span>`;
}

function g4ProductSmmCalendarIdeaCardV2(idea, content, strategy, product, days, compact = false) {
  const title = g4ProductSmmCalendarIdeaTitleV2(idea, strategy, product);
  const format = (strategy.formats || []).find((row) => row.id === idea.primaryTaskFormatId);
  const hasPhoto = Boolean(g4ProductSmmIdeaPhotoV2(idea));
  const publication = g4SmmPublicationForIdeaV324(idea, content);
  const platforms = g4SmmIdeaPlatformsV529(idea);
  const dateLabel = (day) => new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(day.date);
  const availableDays = days.filter((day) => g4ProductSmmCanScheduleV528(day.value));
  const savedDateOutsideOptions = idea.scheduledDate && !availableDays.some((day) => day.value === idea.scheduledDate);
  return `<article class="g4-product-smm-calendar-item-v2 ${compact ? "is-day-v2" : ""} ${hasPhoto ? "has-photo-v2" : ""}" draggable="true" data-g4-product-smm-calendar-drag-v339="${escapeAttr(idea.id)}">
    ${g4ProductSmmCalendarThumbnailHtmlV2(idea, format)}
    <button type="button" class="g4-product-smm-calendar-idea-v2" data-g4-product-smm-open-idea-v2="${escapeAttr(idea.id)}" aria-label="Открыть идею: ${escapeAttr(title)}"><strong data-g4-product-smm-calendar-title-v2="${escapeAttr(idea.id)}">${escapeHtml(title)}</strong><small>${escapeHtml(format?.format || "Формат не выбран")} · ${escapeHtml(format?.task || "Задача не выбрана")}</small></button>
    <span class="g4-product-smm-calendar-platforms-v2">${platforms.map(g4ProductSmmPlatformChipV2).join("")}</span>
    <details class="g4-product-smm-calendar-menu-v2"><summary aria-label="Планирование: ${escapeAttr(title)}" title="Перенести идею">⋯</summary><div><label>Дата публикации<select data-g4-product-smm-calendar-assign-v2 data-g4-product-smm-calendar-idea-id-v2="${escapeAttr(idea.id)}" aria-label="Дата идеи ${escapeAttr(title)}"><option value="">Банк идей</option>${savedDateOutsideOptions ? `<option value="${escapeAttr(idea.scheduledDate)}" selected disabled>${escapeHtml(idea.scheduledDate)} · уже назначено</option>` : ""}${availableDays.map((day) => `<option value="${escapeAttr(day.value)}" ${idea.scheduledDate === day.value ? "selected" : ""}>${escapeHtml(day.label)}, ${escapeHtml(dateLabel(day))}</option>`).join("")}${!availableDays.length ? '<option disabled>В этой неделе нет доступных дат</option>' : ""}</select></label></div></details>
  </article>`;
}

function g4ProductSmmBankHtmlV2(content, strategy, product) {
  const bank = (content.ideas || []).filter((idea) => !idea.scheduledDate);
  const days = g4SmmCalendarDaysV322(content);
  return `<section class="g4-product-smm-bank-section-v2" data-g4-product-smm-bank-v2 data-g4-product-smm-calendar-drop-v339="bank">
    <div class="g4-product-smm-section-title-v2"><h4>Банк идей</h4><span>Идеи без даты · перетащите в календарь</span></div>
    <div class="g4-product-smm-calendar-cards-v2">${bank.map((idea) => g4ProductSmmCalendarIdeaCardV2(idea, content, strategy, product, days)).join("") || '<p class="g4-product-smm-empty-v2">Все идеи распределены по датам.</p>'}</div>
  </section>`;
}

function g4ProductSmmCalendarHtmlV2(content, strategy, product, ui = {}) {
  const days = g4SmmCalendarDaysV322(content);
  const today = g4SmmIsoDateV322(new Date());
  const active = days.some((day) => day.value === ui.activeDay) ? ui.activeDay
    : days.find((day) => day.value === today)?.value || days.find((day) => day.value > today)?.value || days[6]?.value;
  const ideas = content.ideas || [];
  const otherDates = ideas.filter((idea) => idea.scheduledDate &&
    !days.some((day) => day.value === idea.scheduledDate));
  const dateLabel = (day) => new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(day.date);
  return `<section class="g4-product-smm-calendar-v2" data-g4-product-smm-calendar-v2 data-g4-product-smm-active-day-v2="${escapeAttr(active)}">
    <div class="g4-product-smm-section-title-v2"><h4>Календарь идей · ${escapeHtml(g4SmmCalendarWeekLabelV322(content))}</h4><span>Перетащите идею на день или выберите дату в её меню</span></div>
    <div class="g4-product-smm-calendar-navigation-v2"><button type="button" data-g4-product-smm-week-shift-v322="-7" aria-label="Предыдущая неделя">‹</button><div class="g4-product-smm-calendar-week-scroll-v2"><div class="g4-product-smm-calendar-week-v2">${days.map((day) => {
      const scheduled = ideas.filter((idea) => idea.scheduledDate === day.value);
      const isPast = day.value < today;
      return `<div class="g4-product-smm-calendar-day-v2 ${isPast ? "is-past-v2" : ""} ${day.value === today ? "is-today-v2" : ""} ${day.value === active ? "is-active-v2" : ""}" ${isPast ? "" : `data-g4-product-smm-calendar-drop-v339="${escapeAttr(day.value)}"`} data-g4-product-smm-calendar-date-v2="${escapeAttr(day.value)}">
        <button type="button" class="g4-product-smm-calendar-day-head-v2" data-g4-product-smm-calendar-day-v2="${escapeAttr(day.value)}" aria-pressed="${day.value === active}" aria-label="${escapeAttr(day.label)}, ${escapeAttr(dateLabel(day))}: ${scheduled.length} идей${isPast ? ". Прошедший день, перенос недоступен" : ""}"><span>${escapeHtml(day.short)}${day.value === today ? ' <em>Сегодня</em>' : ""}</span><small>${escapeHtml(dateLabel(day))}</small><strong>${scheduled.length}</strong></button>
        <div class="g4-product-smm-calendar-day-ideas-v2">${scheduled.map((idea) => g4ProductSmmCalendarIdeaCardV2(idea, content, strategy, product, days, true)).join("")}</div>
      </div>`;
    }).join("")}</div></div><button type="button" data-g4-product-smm-week-shift-v322="7" aria-label="Следующая неделя">›</button></div>
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
  return `<section class="g4-product-smm-workspace-v2 g4-product-smm-v523${ui.collapsed ? " is-collapsed" : ""}" data-g4-product-smm-product-id-v523="${escapeAttr(productId)}" data-g4-product-smm-workspace-v2>
    <header class="g4-product-smm-head-v2"><button type="button" class="g4-product-smm-collapse-v2" data-g4-product-smm-collapse-v2 aria-expanded="${!ui.collapsed}"><span><h3>SMM-стратегия продукта</h3><small>${escapeHtml(product?.name || "Продукт")} · Формат + площадка</small></span><span class="g4-product-smm-collapse-mark-v2" aria-hidden="true">⌄</span></button></header>
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
