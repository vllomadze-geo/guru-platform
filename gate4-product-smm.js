/* Product data stays in its existing bucket. Its workspace renderer is independent
   from the company strategy renderer; legacy detail editors remain scoped. */

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

function g4ProductSmmBackupV2(workspace, productId) {
  const bucket = workspace?.gate4ProductSmmV523?.byProduct?.[productId];
  const projectId = guruV185Text(workspace?.project?.id);
  if (!bucket || !projectId) return;
  const key = `guru-g4-product-smm-workspace-v2-backup-${projectId}-${productId}`;
  try {
    if (!localStorage.getItem(key) && !safeStorageSet(key, JSON.stringify({
      createdAt: new Date().toISOString(), projectId, productId,
      bucket: g4ProductSmmCloneV523(bucket),
    }), { silent: true })) console.warn("Product SMM backup unavailable", productId);
  } catch (error) { console.warn("Product SMM backup unavailable", productId, error); }
}

function g4ProductSmmStoreV523(product, workspace = state) {
  const productId = g4ProductSmmIdV523(product);
  if (!productId || !workspace || typeof workspace !== "object") return null;
  g4ProductSmmBackupV2(workspace, productId);
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
  return g4ProductSmmWithScopeV523(productId, ({ strategy, content }) =>
    g4ProductSmmWorkspaceV2(product, strategy, content));
}

function g4ProductSmmRootV523(node) {
  return node?.closest?.("[data-g4-product-smm-product-id-v523]") || null;
}

function g4ProductSmmUiV2(root) {
  const openStagesByIdea = {};
  root?.querySelectorAll("[data-g4-product-smm-idea-panel-v2] [data-g4-product-smm-stage-v2][open]")
    .forEach((stage) => {
      const ideaId = stage.closest("[data-g4-product-smm-idea-panel-v2]")?.dataset.g4ProductSmmIdeaPanelV2;
      if (ideaId) (openStagesByIdea[ideaId] ||= []).push(stage.dataset.g4ProductSmmStageV2);
    });
  return {
    activeDay: root?.querySelector("[data-g4-product-smm-active-day-v2]")?.dataset.g4ProductSmmActiveDayV2,
    otherDatesOpen: Boolean(root?.querySelector("[data-g4-product-smm-other-dates-v2][open]")),
    openIdeaIds: [...(root?.querySelectorAll("[data-g4-product-smm-idea-panel-v2][open]") || [])]
      .map((panel) => panel.dataset.g4ProductSmmIdeaPanelV2),
    openStagesByIdea,
    openSignals: [...(root?.querySelectorAll("[data-g4-product-smm-signal-v2][open]") || [])]
      .map((panel) => panel.dataset.g4ProductSmmSignalV2),
  };
}

function g4ProductSmmRefreshV523(root, options = {}) {
  if (!root) return;
  const productId = root.dataset.g4ProductSmmProductIdV523;
  const product = g4SmmProductReadOnlyV299(productId) || { id: productId };
  const ui = { ...g4ProductSmmUiV2(root), ...options };
  const html = g4ProductSmmWithScopeV523(productId, ({ strategy, content }) =>
    g4ProductSmmWorkspaceV2(product, strategy, content, ui));
  const template = document.createElement("template");
  template.innerHTML = html;
  const replacement = template.content.firstElementChild;
  if (!replacement) return root;
  root.replaceWith(replacement);
  return replacement;
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

function g4ProductSmmPlanningRefreshV523(root, options = {}) {
  const productId = root?.dataset.g4ProductSmmProductIdV523;
  if (!productId) return;
  const ui = { ...g4ProductSmmUiV2(root), ...options };
  const html = g4ProductSmmWithScopeV523(productId, ({ content, strategy }) => {
    const model = g4ProductSmmModelV2(content, strategy);
    const positionsByIdea = g4ProductSmmIdeaPlanPositionsV2(model);
    return {
      table: g4ProductSmmTableHtmlV2(model, productId),
      bank: g4ProductSmmBankHtmlV2(content, strategy,
        g4SmmProductReadOnlyV299(productId)),
      calendar: g4ProductSmmCalendarHtmlV2(content, strategy,
        g4SmmProductReadOnlyV299(productId), ui),
      summary: g4ProductSmmSummaryHtmlV2(model, ui),
      planLabels: Object.fromEntries(content.ideas.map((idea) => [idea.id,
        g4ProductSmmIdeaPlanLabelV2(idea, model, positionsByIdea)])),
      covered: model.coveredIdeas, target: model.targetIdeas, scheduled: model.scheduledCount,
    };
  });
  for (const [key, selector] of Object.entries({
    table: ".g4-product-smm-table-wrap-v2",
    bank: "[data-g4-product-smm-bank-v2]",
    calendar: "[data-g4-product-smm-calendar-v2]",
    summary: "[data-g4-product-smm-summary-v2]",
  })) {
    const current = root.querySelector(selector);
    if (current) current.outerHTML = html[key];
  }
  root.querySelectorAll("[data-g4-product-smm-idea-plan-label-v2]").forEach((label) => {
    label.textContent = html.planLabels[label.dataset.g4ProductSmmIdeaPlanLabelV2] || "";
  });
  const progress = root.querySelector(".g4-product-smm-toolbar-progress-v2");
  if (progress) {
    progress.querySelector("strong").textContent = `${html.covered} / ${html.target} идей`;
    progress.querySelector("progress").max = Math.max(1, html.target);
    progress.querySelector("progress").value = Math.min(html.covered, Math.max(1, html.target));
    progress.querySelector("span").textContent = `${html.scheduled} запланировано`;
  }
}

function g4ProductSmmPreviewRefreshV523(root, publication) {
  const bucket = g4ProductSmmStoreV523(root.dataset.g4ProductSmmProductIdV523);
  const idea = bucket?.content.ideas.find((row) => row.id === publication.sourceIdeaId ||
    row.publicationId === publication.id);
  const stage = idea && root.querySelector(`[data-g4-product-smm-idea-panel-v2="${CSS.escape(idea.id)}"] [data-g4-product-smm-stage-v2="preview"][open]`);
  if (stage) stage.querySelector("[data-g4-product-smm-stage-body-v2]").innerHTML =
    g4ProductSmmSocialPreviewV2(idea, bucket.content, bucket.strategy,
      g4SmmProductReadOnlyV299(root.dataset.g4ProductSmmProductIdV523));
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
      const subtitle = root.querySelector(`[data-g4-product-smm-idea-subtitle-v2="${CSS.escape(record.id)}"]`);
      if (subtitle) {
        subtitle.textContent = g4ProductSmmIdeaSubtitleV2(record,
          g4SmmProductReadOnlyV299(record.productId)?.name);
        subtitle.hidden = !subtitle.textContent;
      }
    }
    if (ideaField === "insight") root.querySelectorAll(`[data-g4-product-smm-brief-meaning-v325="${CSS.escape(record.id)}"]`).forEach((node) => {
      node.textContent = guruV185Text(record.insight) || "Идея пока не сформулирована";
      node.classList.toggle("is-filled", Boolean(guruV185Text(record.insight)));
      node.classList.remove("is-empty");
    });
    g4ProductSmmPersistV523(bucket, record);
    if (ideaField === "name" || ideaField === "insight") {
      root.querySelectorAll(`[data-g4-product-smm-calendar-title-v2="${CSS.escape(record.id)}"]`).forEach((label) => {
        label.textContent = g4ProductSmmCalendarIdeaTitleV2(record, bucket.strategy,
          g4SmmProductReadOnlyV299(record.productId));
      });
      const preview = root.querySelector(`[data-g4-product-smm-social-preview-v2="${CSS.escape(record.id)}"]`);
      if (preview) {
        const topic = bucket.strategy.topics.find((row) => row.id === record.topicId);
        const publication = g4SmmPublicationForIdeaV324(record, bucket.content);
        const heading = preview.querySelector(".g4-product-smm-social-heading-v2");
        const caption = preview.querySelector(".g4-product-smm-social-caption-v2");
        if (heading) heading.textContent = guruV185Text(record.name) || guruV185Text(topic?.value) || "Название идеи";
        if (caption) caption.textContent = guruV185Text(publication?.publicationPackage?.caption) ||
          guruV185Text(publication?.content) || guruV185Text(record.insight) ||
          "Здесь появится текст после заполнения этапа «Озарение».";
      }
    }
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
  if (target.matches("[data-g4-product-smm-period-select-v2]")) {
    const [countValue, unit] = target.value.split(":");
    const count = Number(countValue);
    if (!Number.isInteger(count) || count < 1 || !G4_SMM_PERIOD_UNITS_V304.some((row) => row.key === unit)) return;
    bucket.strategy.planningPeriod = { count, unit };
    g4ProductSmmPersistV523(bucket);
    g4ProductSmmRefreshV523(root);
    return;
  }
  if (target.matches("[data-g4-product-smm-calendar-assign-v2]")) {
    const idea = bucket.content.ideas.find((row) => row.id === data.g4ProductSmmCalendarIdeaIdV2);
    if (!idea || target.value && !g4SmmDateValueV299(target.value)) return;
    idea.scheduledDate = target.value;
    g4ProductSmmPersistV523(bucket, idea);
    g4ProductSmmPlanningRefreshV523(root, {
      ...(target.value ? { activeDay: target.value } : {}),
      otherDatesOpen: Boolean(target.value && !g4SmmCalendarDaysV322(bucket.content)
        .some((day) => day.value === target.value)),
    });
    return;
  }
  if (data.g4ProductSmmCalendarPlaceV322) {
    const { record } = g4ProductSmmRecordV523(root, "idea", target.value);
    if (!record || !g4SmmDateValueV299(data.g4ProductSmmCalendarPlaceV322)) return;
    record.scheduledDate = data.g4ProductSmmCalendarPlaceV322;
    g4ProductSmmPersistV523(bucket, record);
    g4ProductSmmPlanningRefreshV523(root, {
      activeDay: record.scheduledDate,
    });
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
  if (["platforms", "formatId", "topicId", "status", "date"].includes(field)) g4ProductSmmRefreshV523(root);
});

document.addEventListener("click", (event) => {
  document.querySelectorAll("[data-g4-product-smm-idea-menu-toggle-v2][aria-expanded='true']")
    .forEach((toggle) => {
      if (toggle.closest(".g4-product-smm-idea-menu-v2")?.contains(event.target)) return;
      toggle.setAttribute("aria-expanded", "false");
      toggle.parentElement.querySelector("[data-g4-product-smm-idea-menu-panel-v2]").hidden = true;
    });
  const root = g4ProductSmmRootV523(event.target);
  if (!root) return;
  const day = event.target.closest("[data-g4-product-smm-calendar-day-v2]");
  if (day) {
    const bucket = g4ProductSmmStoreV523(root.dataset.g4ProductSmmProductIdV523);
    const content = bucket?.content;
    const calendar = root.querySelector("[data-g4-product-smm-calendar-v2]");
    if (calendar && content) calendar.outerHTML = g4ProductSmmCalendarHtmlV2(content, bucket.strategy,
      g4SmmProductReadOnlyV299(root.dataset.g4ProductSmmProductIdV523), {
      activeDay: day.dataset.g4ProductSmmCalendarDayV2,
      otherDatesOpen: Boolean(root.querySelector("[data-g4-product-smm-other-dates-v2][open]")),
    });
    return;
  }
  const ideaButton = event.target.closest("[data-g4-product-smm-open-idea-v2]");
  if (ideaButton) {
    const panel = root.querySelector(`[data-g4-product-smm-idea-panel-v2="${CSS.escape(ideaButton.dataset.g4ProductSmmOpenIdeaV2)}"]`);
    if (panel) { panel.open = true; panel.scrollIntoView({ behavior: "smooth", block: "center" }); }
    return;
  }
  const gap = event.target.closest("[data-g4-product-smm-gap-format-v2]");
  if (gap) {
    const row = root.querySelector(`[data-g4-product-smm-format-row-v2="${CSS.escape(gap.dataset.g4ProductSmmGapFormatV2)}"]`);
    if (row) {
      row.scrollIntoView({ behavior: "smooth", block: "center" });
      row.classList.add("is-highlighted-v2");
      setTimeout(() => row.classList.remove("is-highlighted-v2"), 3000);
    }
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    const toggle = event.target.closest?.(".g4-product-smm-idea-menu-v2")
      ?.querySelector("[data-g4-product-smm-idea-menu-toggle-v2]");
    if (toggle?.getAttribute("aria-expanded") === "true") {
      toggle.setAttribute("aria-expanded", "false");
      toggle.parentElement.querySelector("[data-g4-product-smm-idea-menu-panel-v2]").hidden = true;
      toggle.focus();
    }
    return;
  }
  if (!["Enter", " "].includes(event.key)) return;
  const gap = event.target.closest?.("[data-g4-product-smm-gap-format-v2]");
  if (!gap) return;
  event.preventDefault();
  gap.click();
});

document.addEventListener("toggle", (event) => {
  const panel = event.target;
  const initialOpen = panel?.dataset?.g4ProductSmmInitialOpenV2 === "true";
  if (initialOpen) delete panel.dataset.g4ProductSmmInitialOpenV2;
  if (!panel?.open || initialOpen) return;
  const root = g4ProductSmmRootV523(panel);
  if (!root) return;
  if (panel.matches("[data-g4-product-smm-stage-v2]")) {
    const ideaPanel = panel.closest("[data-g4-product-smm-idea-panel-v2]");
    const slot = panel.querySelector("[data-g4-product-smm-stage-body-v2]");
    if (panel.dataset.g4ProductSmmStageV2 === "preview") {
      const bucket = g4ProductSmmStoreV523(root.dataset.g4ProductSmmProductIdV523);
      const idea = bucket?.content.ideas.find((row) => row.id === ideaPanel?.dataset.g4ProductSmmIdeaPanelV2);
      if (idea && slot) slot.innerHTML = g4ProductSmmSocialPreviewV2(idea, bucket.content, bucket.strategy,
        g4SmmProductReadOnlyV299(root.dataset.g4ProductSmmProductIdV523));
    } else {
      const lazy = slot?.querySelector(":scope > template");
      if (lazy) slot.replaceChildren(lazy.content);
    }
    return;
  }
  const productId = root.dataset.g4ProductSmmProductIdV523;
  const ideaId = panel.dataset.g4ProductSmmIdeaPanelV2;
  const publicationId = panel.dataset.g4ProductSmmOrphanPanelV2;
  const slot = ideaId ? panel.querySelector("[data-g4-product-smm-idea-detail-v2]")
    : publicationId ? panel.querySelector("[data-g4-product-smm-orphan-detail-v2]") : null;
  if (!slot || slot.firstElementChild) return;
  const html = g4ProductSmmWithScopeV523(productId, ({ content, strategy }) => {
    if (ideaId) {
      const index = content.ideas.findIndex((idea) => idea.id === ideaId);
      return index < 0 ? "" : g4ProductSmmDetailV2(g4SmmIdeaHtmlV299(content.ideas[index], index, content, strategy), {
        idea: content.ideas[index], content, strategy, product: g4SmmProductReadOnlyV299(productId),
      });
    }
    const index = content.publications.findIndex((publication) => publication.id === publicationId);
    return index < 0 ? "" : g4ProductSmmDetailV2(g4SmmPublicationHtmlV299(content.publications[index], index, content, strategy));
  });
  slot.innerHTML = html || "";
}, true);

document.addEventListener("click", (event) => {
  const root = g4ProductSmmRootV523(event.target);
  if (!root) return;
  const button = event.target.closest("button");
  if (!button) return;
  const data = button.dataset;
  if (button.matches("[data-g4-product-smm-idea-menu-toggle-v2]")) {
    event.preventDefault();
    const expanded = button.getAttribute("aria-expanded") !== "true";
    button.setAttribute("aria-expanded", String(expanded));
    button.parentElement.querySelector("[data-g4-product-smm-idea-menu-panel-v2]").hidden = !expanded;
    return;
  }
  const productId = root.dataset.g4ProductSmmProductIdV523;
  const bucket = g4ProductSmmStoreV523(productId);
  if (button.matches("[data-g4-product-smm-delete-idea-v2]")) {
    event.preventDefault();
    const menuToggle = button.closest(".g4-product-smm-idea-menu-v2")
      ?.querySelector("[data-g4-product-smm-idea-menu-toggle-v2]");
    if (menuToggle) {
      menuToggle.setAttribute("aria-expanded", "false");
      button.parentElement.hidden = true;
    }
    const ideaId = data.g4ProductSmmDeleteIdeaV2;
    const index = bucket.content.ideas.findIndex((row) => row.id === ideaId);
    if (index < 0) return;
    const linked = bucket.content.publications.filter((row) => row.sourceIdeaId === ideaId ||
      row.id === bucket.content.ideas[index].publicationId);
    const message = linked.length
      ? "Удалить карточку идеи? Связанная публикация сохранится отдельно."
      : "Удалить карточку идеи?";
    if (!window.confirm(message)) return;
    bucket.content.ideas.splice(index, 1);
    linked.forEach((publication) => { publication.sourceIdeaId = ""; });
    g4ProductSmmIdeaEditingV523.delete(ideaId);
    g4ProductSmmPersistV523(bucket);
    g4ProductSmmRefreshV523(root);
    return;
  } else if (button.matches("[data-g4-product-smm-topic-idea-add-v345]")) {
    event.preventDefault();
    const formatId = guruV185Text(data.g4ProductSmmFormatIdV345);
    const topicId = guruV185Text(data.g4ProductSmmTopicIdV345);
    const format = bucket.strategy.formats.find((row) => guruV185Text(row?.id) === formatId);
    if (!format || !g4SmmFormatTopicsV308(format, bucket.strategy).some((topic) =>
      guruV185Text(topic?.id) === topicId))
      return;
    const planningPeriodStart = g4SmmIsoDateV322(g4SmmCalendarWeekStartV322(bucket.content));
    const idea = g4ProductSmmWithScopeV523(productId, () =>
      g4SmmCreateIdeaV299(productId, { primaryTaskFormatId: formatId, topicId, planningPeriodStart }));
    g4ProductSmmPersistV523(bucket);
    const refreshed = g4ProductSmmRefreshV523(root, {
      openIdeaIds: idea?.id ? [idea.id] : [],
    });
    requestAnimationFrame(() => refreshed?.querySelector(
      `[data-g4-product-smm-idea-panel-v2="${CSS.escape(idea?.id || "")}"]`,
    )?.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" }));
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
  if (record && (date === "bank" || g4SmmDateValueV299(date))) {
    record.scheduledDate = date === "bank" ? "" : date;
    g4ProductSmmPersistV523(bucket, record);
    g4ProductSmmPlanningRefreshV523(root, {
      ...(date === "bank" ? {} : { activeDay: date }),
      otherDatesOpen: Boolean(date !== "bank" && !g4SmmCalendarDaysV322(bucket.content)
        .some((day) => day.value === date)),
    });
  }
  g4ProductSmmDraggingV523 = "";
});
document.addEventListener("dragend", () => { g4ProductSmmDraggingV523 = ""; });
window.GURU_GATE4_PRODUCT_SMM_BUILD = new URL(document.currentScript?.src || "gate4-product-smm.js", location.href).searchParams.get("v") || "dev";
