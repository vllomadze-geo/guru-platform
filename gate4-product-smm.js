/* Gate 4 only: reuse the company SMM component with independent product data.
   No company values are imported. The existing component runs synchronously
   against a deep workspace copy; only this module's product bucket is retained. */

const G4_PRODUCT_SMM_VERSION_V523 = "gate4-product-smm-v523";
const g4ProductSmmIdeaEditingV523 = new Set();
const g4ProductSmmPublicationEditingV523 = new Set();
let g4ProductSmmDraggingV523 = "";

function g4ProductSmmCloneV523(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function g4ProductSmmIdV523(product) {
  return guruV185Text(typeof product === "string" ? product : product?.id);
}

function g4ProductSmmStoreV523(product, workspace = state) {
  const productId = g4ProductSmmIdV523(product);
  if (!productId || !workspace || typeof workspace !== "object") return null;
  const current = workspace.gate4ProductSmmV523;
  const store = current && typeof current === "object" && !Array.isArray(current)
    ? current : {};
  store.version = G4_PRODUCT_SMM_VERSION_V523;
  store.byProduct = store.byProduct && typeof store.byProduct === "object" &&
    !Array.isArray(store.byProduct) ? store.byProduct : {};
  const currentBucket = store.byProduct[productId];
  const bucket = currentBucket && typeof currentBucket === "object" &&
    !Array.isArray(currentBucket) ? currentBucket : {};
  bucket.product_id = productId;
  bucket.strategy = bucket.strategy && typeof bucket.strategy === "object" &&
    !Array.isArray(bucket.strategy) ? bucket.strategy : {};
  bucket.content = bucket.content && typeof bucket.content === "object" &&
    !Array.isArray(bucket.content) ? bucket.content : { ideas: [], publications: [] };
  bucket.collapsed = Array.isArray(bucket.collapsed) ? bucket.collapsed : [];
  if (bucket.strategy.version !== G4_SMM_STRATEGY_VERSION_V298 ||
    !bucket.strategy.planningPeriod || !Array.isArray(bucket.strategy.formats) ||
    bucket.content.version !== G4_SMM_CONTENT_VERSION_V299 ||
    !Array.isArray(bucket.content.ideas) || !Array.isArray(bucket.content.publications)) {
    const isolated = {
      project: {},
      gate4SmmStrategyV298: bucket.strategy,
      gate4SmmContentV299: bucket.content,
    };
    bucket.strategy = g4SmmStrategyEnsureV298(isolated);
    bucket.content = g4SmmContentEnsureV299(isolated);
  }
  store.byProduct[productId] = bucket;
  workspace.gate4ProductSmmV523 = store;
  return bucket;
}

/* Never allow an asynchronous callback to hold the temporary workspace. */
function g4ProductSmmWithScopeV523(product, action) {
  const productId = g4ProductSmmIdV523(product);
  const originalState = state;
  const bucket = g4ProductSmmStoreV523(productId, originalState);
  if (!bucket) return null;
  const scopedState = g4ProductSmmCloneV523(originalState);
  scopedState.gate4SmmStrategyV298 = g4ProductSmmCloneV523(bucket.strategy);
  scopedState.gate4SmmContentV299 = g4ProductSmmCloneV523(bucket.content);
  scopedState.g1Collapsed = [...bucket.collapsed];
  const companyIdeaEditing = [...g4SmmIdeaEditingIdsV330];
  const companyPublicationEditing = [...g4SmmPublicationEditingIdsV328];
  try {
    state = scopedState;
    g4SmmIdeaEditingIdsV330.clear();
    g4ProductSmmIdeaEditingV523.forEach((id) => g4SmmIdeaEditingIdsV330.add(id));
    g4SmmPublicationEditingIdsV328.clear();
    g4ProductSmmPublicationEditingV523.forEach((id) => g4SmmPublicationEditingIdsV328.add(id));
    const strategy = g4SmmStrategyEnsureV298(scopedState);
    const content = g4SmmContentEnsureV299(scopedState);
    content.ideas.forEach((idea) => { idea.productId = productId; });
    content.publications.forEach((publication) => { publication.productId = productId; });
    const result = action({ strategy, content, workspace: scopedState, productId });
    if (result && typeof result.then === "function")
      throw new TypeError("Product SMM scope requires a synchronous callback");
    return result;
  } finally {
    bucket.strategy = scopedState.gate4SmmStrategyV298;
    bucket.content = scopedState.gate4SmmContentV299;
    state = originalState;
    g4SmmIdeaEditingIdsV330.clear();
    companyIdeaEditing.forEach((id) => g4SmmIdeaEditingIdsV330.add(id));
    g4SmmPublicationEditingIdsV328.clear();
    companyPublicationEditing.forEach((id) => g4SmmPublicationEditingIdsV328.add(id));
  }
}

function g4ProductSmmAdaptHtmlV523(html, productId = "") {
  const template = document.createElement("template");
  template.innerHTML = html;
  template.content.querySelectorAll("*").forEach((node) => {
    [...node.attributes].forEach((attribute) => {
      if (!attribute.name.startsWith("data-g4-smm-")) return;
      node.setAttribute(attribute.name.replace("data-g4-smm-", "data-g4-product-smm-"), attribute.value);
      node.removeAttribute(attribute.name);
    });
    if (node.matches("input.g1-input, textarea.g1-input, select.g1-input")) {
      if (!guruV185Text(node.value)) node.classList.remove("is-empty", "is-optional", "is-filled");
      if (node.matches("select")) {
        const empty = node.querySelector('option[value=""]');
        const field = node.dataset.g4ProductSmmIdeaFieldV299 ||
          node.dataset.g4ProductSmmPublicationFieldV299;
        if (empty) empty.textContent = field === "primaryTaskFormatId"
          ? "Основная задача не задана" : field === "topicId"
            ? "Тема не указана" : field === "formatId" ? "Формат не указан" : "Значение не задано";
      }
    }
  });
  const root = template.content.querySelector("[data-g4-product-smm-strategy-v298]");
  if (root) {
    const bucket = g4ProductSmmStoreV523(productId);
    const key = `g4-product-smm-strategy-${productId}`;
    root.classList.add("g4-product-smm-v523");
    root.setAttribute("data-g4-product-smm-product-id-v523", productId);
    root.setAttribute("data-g4-product-smm-scope-v298", "product");
    root.classList.toggle("is-collapsed", bucket?.collapsed.includes(key));
    const title = root.querySelector(".g1-card-title");
    if (title) title.textContent = "SMM-стратегия продукта · VK / Telegram / Instagram / YouTube";
    const subtitle = root.querySelector(".g1-section-progress");
    if (subtitle) subtitle.textContent = "Продукт · VK / Telegram / Instagram / YouTube";
    const header = root.querySelector("[data-g1-collapse-key]");
    if (header) header.setAttribute("data-g1-collapse-key", key);
    root.querySelector(".g4-smm-new-idea-v299")?.remove();
  }
  return template.innerHTML;
}

function g4ProductSmmStrategyHtmlV523(product) {
  const productId = g4ProductSmmIdV523(product);
  if (!productId) return "";
  const html = g4ProductSmmWithScopeV523(productId, () => g4SmmStrategyHtmlV298(product));
  return g4ProductSmmAdaptHtmlV523(html || "", productId);
}

function g4ProductSmmRootV523(node) {
  return node?.closest?.("[data-g4-product-smm-product-id-v523]") || null;
}

function g4ProductSmmRefreshV523(root) {
  if (!root) return;
  const productId = root.dataset.g4ProductSmmProductIdV523;
  const product = g4SmmProductReadOnlyV299(productId) || { id: productId };
  root.outerHTML = g4ProductSmmStrategyHtmlV523(product);
}

function g4ProductSmmPersistV523(bucket, record = null) {
  const now = new Date().toISOString();
  bucket.updatedAt = now;
  bucket.content.updatedAt = now;
  if (record) record.updatedAt = now;
  if (typeof guruPersistStateFast === "function")
    guruPersistStateFast({ quiet: true, cloud: false });
  if (typeof flashSaving === "function") flashSaving();
}

function g4ProductSmmRecordV523(root, kind, id) {
  const bucket = g4ProductSmmStoreV523(root?.dataset.g4ProductSmmProductIdV523);
  const rows = kind === "idea" ? bucket?.content.ideas : bucket?.content.publications;
  return { bucket, record: (rows || []).find((row) => row.id === guruV185Text(id)) || null };
}

function g4ProductSmmIdeaCanEditV523(bucket, idea) {
  return idea && (!g4SmmPublicationForIdeaV324(idea, bucket.content) ||
    g4ProductSmmIdeaEditingV523.has(idea.id));
}

function g4ProductSmmPlanningRefreshV523(root) {
  const productId = root?.dataset.g4ProductSmmProductIdV523;
  if (!productId) return;
  const html = g4ProductSmmWithScopeV523(productId, ({ content, strategy }) => ({
    calendar: g4SmmWeekCalendarHtmlV322(content, strategy),
    summary: g4SmmActionSummaryHtmlV299(content, strategy),
  }));
  const calendar = root.querySelector("[data-g4-product-smm-week-calendar-v322]");
  if (calendar) calendar.outerHTML = g4ProductSmmAdaptHtmlV523(html.calendar);
  const summary = root.querySelector("[data-g4-product-smm-action-summary-v299]");
  if (summary) summary.outerHTML = g4ProductSmmAdaptHtmlV523(html.summary);
}

function g4ProductSmmPreviewRefreshV523(root, publication) {
  const production = root.querySelector(`[data-g4-product-smm-production-v344="${CSS.escape(publication.id)}"]`);
  if (!production) return;
  const brief = publication.creativeBrief || {};
  const packageData = publication.publicationPackage || {};
  Object.entries({ ...packageData, link: publication.link }).forEach(([key, value]) => {
    const metric = g4SmmPackageMetricV344(key, value);
    const counter = production.querySelector(`[data-g4-product-smm-package-counter-v344="${CSS.escape(key)}"]`);
    if (counter) {
      counter.textContent = metric.label;
      counter.className = `g4-smm-package-counter-v344 is-${metric.state}-v344`;
    }
  });
  G4_SMM_STORYBOARD_PHASES_V344.forEach((phase) => production
    .querySelector(`[data-g4-product-smm-shot-v344="${CSS.escape(phase.key)}"]`)
    ?.classList.toggle("is-done-v344", Boolean(brief.checks?.[phase.key])));
  const progress = production.querySelector("[data-g4-product-smm-production-progress-v344]");
  if (progress) progress.textContent = `${G4_SMM_STORYBOARD_PHASES_V344.filter((phase) => brief.checks?.[phase.key]).length}/5 готово`;
  const values = {
    cover: guruV185Text(packageData.cover) || "Текст на обложке",
    hook: guruV185Text(brief.hook) || "Первый кадр и хук",
    durationSeconds: guruV185Text(brief.durationSeconds) ? `${brief.durationSeconds} сек`
      : production.dataset.g4ProductSmmVideoKindV325 === "short" ? "20–45 сек" : "Без лимита",
    firstLine: guruV185Text(packageData.firstLine) || "Первая строка дополнит хук",
    caption: guruV185Text(packageData.caption) || "Подпись даст контекст, объяснит смысл и направит к одному действию.",
    hashtags: guruV185Text(packageData.hashtags) || "#тема #формат",
    link: guruV185Text(publication.link) || "Ссылка / маршрут",
    shortsTitle: guruV185Text(packageData.shortsTitle) || "Поисковый заголовок для YouTube Shorts",
  };
  Object.entries(values).forEach(([key, value]) => {
    const slot = production.querySelector(`[data-g4-product-smm-preview-slot-v344="${CSS.escape(key)}"]`);
    if (slot) slot.textContent = value;
  });
}

document.addEventListener("input", (event) => {
  const target = event.target;
  const root = g4ProductSmmRootV523(target);
  if (!root) return;
  const productId = root.dataset.g4ProductSmmProductIdV523;
  const bucket = g4ProductSmmStoreV523(productId);
  if (target.matches("[data-g4-product-smm-period-count-v304]")) {
    const count = Number(target.value);
    if (!Number.isFinite(count) || count <= 0) return;
    bucket.strategy.planningPeriod.count = Math.min(999, Math.round(count));
    const projection = root.querySelector("[data-g4-product-smm-period-projection-v304]");
    if (projection) projection.innerHTML = g4ProductSmmAdaptHtmlV523(g4SmmFormatsProjectionHtmlV305(bucket.strategy, { productId, content: bucket.content }), productId);
    g4ProductSmmPersistV523(bucket);
    return;
  }
  const data = target.dataset;
  const ideaField = data.g4ProductSmmIdeaFieldV299;
  if (["name", "digestionNotes", "insight"].includes(ideaField)) {
    const { record } = g4ProductSmmRecordV523(root, "idea", data.g4ProductSmmIdeaIdV299);
    if (!g4ProductSmmIdeaCanEditV523(bucket, record)) return;
    record[ideaField] = target.value;
    target.classList.toggle("is-filled", Boolean(guruV185Text(target.value)));
    if (ideaField === "name") {
      const title = root.querySelector(`[data-g4-product-smm-idea-card-v299="${CSS.escape(record.id)}"] [data-g4-product-smm-idea-card-title-v332]`);
      if (title) title.textContent = g4SmmIdeaNameV332(record, bucket.content.ideas.indexOf(record));
    }
    if (ideaField === "insight") root.querySelectorAll(`[data-g4-product-smm-brief-meaning-v325="${CSS.escape(record.id)}"]`).forEach((node) => {
      node.textContent = guruV185Text(record.insight) || "Идея пока не сформулирована";
      node.classList.toggle("is-filled", Boolean(guruV185Text(record.insight)));
      node.classList.remove("is-empty");
    });
    g4ProductSmmPersistV523(bucket, record);
    if (ideaField === "name" || ideaField === "insight") g4ProductSmmPlanningRefreshV523(root);
    return;
  }
  const { record } = g4ProductSmmRecordV523(root, "publication", data.g4ProductSmmPublicationIdV299);
  if (!record) return;
  const briefField = data.g4ProductSmmBriefFieldV325;
  const packageField = data.g4ProductSmmPackageFieldV344;
  const publicationField = data.g4ProductSmmPublicationFieldV299;
  const resultField = data.g4ProductSmmPublicationResultV299;
  if (["hook", "promise", "storyboard", "proof", "cta", "durationSeconds"].includes(briefField))
    record.creativeBrief[briefField] = target.value;
  else if (G4_SMM_PUBLICATION_PACKAGE_FIELDS_V344.some((field) => field.key === packageField))
    record.publicationPackage[packageField] = target.value;
  else if (["title", "description", "content", "link", "date"].includes(publicationField))
    record[publicationField] = target.value;
  else if (G4_SMM_RESULT_METRICS_V299.some(([key]) => key === resultField))
    record.results[resultField] = target.value;
  else return;
  target.classList.toggle("is-filled", Boolean(guruV185Text(target.value)));
  g4ProductSmmPersistV523(bucket, record);
  g4ProductSmmPreviewRefreshV523(root, record);
  if (publicationField === "title") {
    const title = root.querySelector(`[data-g4-product-smm-publication-card-v299="${CSS.escape(record.id)}"] [data-g4-product-smm-publication-card-title-v331]`);
    if (title) title.textContent = g4SmmPublicationCardTitleV331(record, bucket.content.publications.indexOf(record));
  }
  if (resultField) {
    const verdicts = g4ProductSmmWithScopeV523(productId, ({ content }) => {
      const publication = content.publications.find((row) => row.id === record.id);
      return Object.fromEntries(G4_SMM_RESULT_METRICS_V299.map(([key]) => [key,
        g4SmmMetricVerdictHtmlV299(publication, key, content),
      ]));
    });
    root.querySelectorAll(`[data-g4-product-smm-publication-id-v299="${CSS.escape(record.id)}"][data-g4-product-smm-verdict-v299]`).forEach((node) => {
      const html = verdicts[node.dataset.g4ProductSmmVerdictV299];
      if (html) node.outerHTML = g4ProductSmmAdaptHtmlV523(html);
    });
  }
});

document.addEventListener("change", (event) => {
  const target = event.target;
  const root = g4ProductSmmRootV523(target);
  if (!root) return;
  const bucket = g4ProductSmmStoreV523(root.dataset.g4ProductSmmProductIdV523);
  const data = target.dataset;
  if (target.matches("[data-g4-product-smm-period-count-v304], [data-g4-product-smm-period-unit-v304]")) {
    if (target.matches("[data-g4-product-smm-period-unit-v304]"))
      bucket.strategy.planningPeriod.unit = G4_SMM_PERIOD_UNITS_V304.some((unit) => unit.key === target.value) ? target.value : "week";
    else {
      const count = Number(target.value);
      bucket.strategy.planningPeriod.count = Number.isFinite(count) && count > 0 ? Math.min(999, Math.round(count)) : 1;
    }
    g4ProductSmmPersistV523(bucket);
    g4ProductSmmRefreshV523(root);
    return;
  }
  if (data.g4ProductSmmCalendarPlaceV322) {
    const { record } = g4ProductSmmRecordV523(root, "idea", target.value);
    if (!record || !guruV185Text(record.insight) || !g4SmmDateValueV299(data.g4ProductSmmCalendarPlaceV322)) return;
    record.scheduledDate = data.g4ProductSmmCalendarPlaceV322;
    g4ProductSmmPersistV523(bucket, record);
    g4ProductSmmPlanningRefreshV523(root);
    return;
  }
  if (data.g4ProductSmmIdeaFieldV299 === "primaryTaskFormatId") {
    const { record } = g4ProductSmmRecordV523(root, "idea", data.g4ProductSmmIdeaIdV299);
    if (!g4ProductSmmIdeaCanEditV523(bucket, record)) return;
    record.primaryTaskFormatId = bucket.strategy.formats.some((row) => row.id === target.value) ? target.value : "";
    const selectedFormat = bucket.strategy.formats.find((row) => row.id === record.primaryTaskFormatId);
    const allowedTopics = selectedFormat ? g4SmmFormatTopicsV308(selectedFormat, bucket.strategy) : [];
    if (!allowedTopics.some((topic) => guruV185Text(topic?.id) === guruV185Text(record.topicId)))
      record.topicId = "";
    g4ProductSmmPersistV523(bucket, record);
    g4ProductSmmRefreshV523(root);
    return;
  }
  if (data.g4ProductSmmIdeaFieldV299 === "topicId") {
    const { record } = g4ProductSmmRecordV523(root, "idea", data.g4ProductSmmIdeaIdV299);
    if (!g4ProductSmmIdeaCanEditV523(bucket, record)) return;
    const selectedFormat = bucket.strategy.formats.find((row) =>
      guruV185Text(row?.id) === guruV185Text(record.primaryTaskFormatId),
    );
    const allowedTopics = selectedFormat ? g4SmmFormatTopicsV308(selectedFormat, bucket.strategy) : [];
    record.topicId = allowedTopics.some((topic) => guruV185Text(topic?.id) === target.value)
      ? target.value
      : "";
    g4ProductSmmPersistV523(bucket, record);
    g4ProductSmmRefreshV523(root);
    return;
  }
  const { record } = g4ProductSmmRecordV523(root, "publication", data.g4ProductSmmPublicationIdV299);
  if (!record) return;
  const field = data.g4ProductSmmPublicationFieldV299;
  if (G4_SMM_STORYBOARD_PHASES_V344.some((phase) => phase.key === data.g4ProductSmmBriefCheckV344)) {
    record.creativeBrief.checks[data.g4ProductSmmBriefCheckV344] = Boolean(target.checked);
    g4ProductSmmPreviewRefreshV523(root, record);
  } else if (field === "platforms") {
    const card = target.closest("[data-g4-product-smm-publication-card-v299]");
    record.platforms = [...card.querySelectorAll("[data-g4-product-smm-platform-option-v335]:checked")].map((option) => option.value);
  } else if (field === "formatId") {
    record.formatId = target.value;
    const format = bucket.strategy.formats.find((row) => row.id === target.value);
    record.formatLabel = guruV185Text(format?.format) || record.formatLabel;
    if (format) record.platforms = g4SmmFormatPlatformsV299(format);
  } else if (field === "topicId") {
    record.topicId = target.value;
    const topic = bucket.strategy.topics.find((row) => row.id === target.value);
    record.topicLabel = guruV185Text(topic?.value) || record.topicLabel;
  } else if (["status", "date", "link"].includes(field)) record[field] = target.value;
  else return;
  g4ProductSmmPersistV523(bucket, record);
  if (["platforms", "formatId", "topicId", "status"].includes(field)) g4ProductSmmRefreshV523(root);
});

document.addEventListener("click", (event) => {
  const root = g4ProductSmmRootV523(event.target);
  if (!root) return;
  const button = event.target.closest("button");
  if (!button) return;
  const data = button.dataset;
  const productId = root.dataset.g4ProductSmmProductIdV523;
  const bucket = g4ProductSmmStoreV523(productId);
  if (button.matches("[data-g4-product-smm-topic-idea-add-v345]")) {
    event.preventDefault();
    const formatId = guruV185Text(data.g4ProductSmmFormatIdV345);
    const topicId = guruV185Text(data.g4ProductSmmTopicIdV345);
    const format = bucket.strategy.formats.find((row) => guruV185Text(row?.id) === formatId);
    if (!format || !g4SmmFormatTopicsV308(format, bucket.strategy).some((topic) =>
      guruV185Text(topic?.id) === topicId))
      return;
    const idea = g4ProductSmmWithScopeV523(productId, () =>
      g4SmmCreateIdeaV299(productId, { primaryTaskFormatId: formatId, topicId }));
    g4ProductSmmPersistV523(bucket);
    g4ProductSmmRefreshV523(root);
    requestAnimationFrame(() => root.querySelector(
      `[data-g4-product-smm-idea-card-v299="${CSS.escape(idea?.id || "")}"]`,
    )?.scrollIntoView({ behavior: "smooth", block: "center" }));
    return;
  } else if (button.matches("[data-g4-product-smm-idea-add-v299]")) {
    event.preventDefault();
    g4ProductSmmWithScopeV523(productId, () => g4SmmCreateIdeaV299(productId));
  } else if (data.g4ProductSmmIdeaConvertV299) {
    event.preventDefault();
    g4ProductSmmWithScopeV523(productId, ({ content }) => {
      const idea = content.ideas.find((row) => row.id === data.g4ProductSmmIdeaConvertV299);
      if (idea) g4SmmPublicationFromIdeaV299(idea);
    });
  } else if (data.g4ProductSmmWorkflowModeV342 || data.g4ProductSmmIdeaModeV330 || data.g4ProductSmmPublicationModeV328) {
    event.preventDefault();
    const mode = data.g4ProductSmmWorkflowModeV342 || data.g4ProductSmmIdeaModeV330 || data.g4ProductSmmPublicationModeV328;
    const operation = mode === "edit" ? "add" : "delete";
    if (data.g4ProductSmmIdeaIdV299) g4ProductSmmIdeaEditingV523[operation](data.g4ProductSmmIdeaIdV299);
    if (data.g4ProductSmmPublicationIdV299) g4ProductSmmPublicationEditingV523[operation](data.g4ProductSmmPublicationIdV299);
  } else if (button.matches("[data-g4-product-smm-week-shift-v322], [data-g4-product-smm-week-today-v322]")) {
    event.preventDefault();
    const start = button.matches("[data-g4-product-smm-week-today-v322]")
      ? g4SmmStartOfWeekV299(new Date()) : g4SmmCalendarWeekStartV322(bucket.content);
    if (data.g4ProductSmmWeekShiftV322) start.setDate(start.getDate() + Number(data.g4ProductSmmWeekShiftV322));
    bucket.content.calendarWeekStart = g4SmmIsoDateV322(start);
  } else if (data.g4ProductSmmCalendarUnscheduleV322) {
    event.preventDefault();
    const idea = bucket.content.ideas.find((row) => row.id === data.g4ProductSmmCalendarUnscheduleV322);
    if (idea) idea.scheduledDate = "";
  } else return;
  g4ProductSmmPersistV523(bucket);
  g4ProductSmmRefreshV523(root);
});

/* Product disclosures persist in the product bucket rather than company UI. */
document.addEventListener("click", (event) => {
  const root = g4ProductSmmRootV523(event.target);
  const header = event.target?.closest?.("[data-g1-collapse]");
  if (!root || !header || event.target.closest("button, select, input, textarea, a")) return;
  const card = header.closest(".g1-card-collapsible");
  if (!card) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const bucket = g4ProductSmmStoreV523(root.dataset.g4ProductSmmProductIdV523);
  const collapsed = new Set(bucket.collapsed);
  const key = header.dataset.g1CollapseKey;
  const closing = !card.classList.contains("is-collapsed");
  card.classList.toggle("is-collapsed", closing);
  if (closing) collapsed.add(key); else collapsed.delete(key);
  bucket.collapsed = [...collapsed];
  g4ProductSmmPersistV523(bucket);
}, true);

document.addEventListener("dragstart", (event) => {
  const card = event.target?.closest?.("[data-g4-product-smm-calendar-drag-v339]");
  if (!card || !g4ProductSmmRootV523(card) || !event.dataTransfer) return;
  g4ProductSmmDraggingV523 = card.dataset.g4ProductSmmCalendarDragV339;
  event.dataTransfer.setData("text/g4-product-smm-idea", g4ProductSmmDraggingV523);
  event.dataTransfer.effectAllowed = "move";
});
document.addEventListener("dragover", (event) => {
  const target = event.target?.closest?.("[data-g4-product-smm-calendar-drop-v339]");
  if (!target || !g4ProductSmmDraggingV523) return;
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
});
document.addEventListener("drop", (event) => {
  const target = event.target?.closest?.("[data-g4-product-smm-calendar-drop-v339]");
  const root = g4ProductSmmRootV523(target);
  if (!target || !root || !g4ProductSmmDraggingV523) return;
  event.preventDefault();
  const { bucket, record } = g4ProductSmmRecordV523(root, "idea", g4ProductSmmDraggingV523);
  const date = target.dataset.g4ProductSmmCalendarDropV339;
  if (record && guruV185Text(record.insight) && (date === "bank" || g4SmmDateValueV299(date))) {
    record.scheduledDate = date === "bank" ? "" : date;
    g4ProductSmmPersistV523(bucket, record);
    g4ProductSmmPlanningRefreshV523(root);
  }
  g4ProductSmmDraggingV523 = "";
});
document.addEventListener("dragend", () => { g4ProductSmmDraggingV523 = ""; });
window.GURU_GATE4_PRODUCT_SMM_BUILD = new URL(document.currentScript?.src || "gate4-product-smm.js", location.href).searchParams.get("v") || "dev";
