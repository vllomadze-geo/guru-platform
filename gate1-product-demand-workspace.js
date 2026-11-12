/* One view of the existing Gate 1 keyword, metric and JTBD records. */
function g1pdSourcesV1(product, itemData) {
  const byKey = new Map();
  const add = (value, source, details = {}) => {
    const text = guruV185Text(value);
    const key = guruV247KeywordNormalize(text);
    if (!key) return;
    let entry = byKey.get(key);
    if (!entry) {
      entry = { key, text, sources: new Map(), metrics: {}, pageMetrics: {}, demand: null };
      byKey.set(key, entry);
    }
    if (source) entry.sources.set(source.key, source);
    if (details.metrics) {
      entry.metrics = { ...entry.metrics, ...details.metrics };
      entry.pageMetrics = { ...entry.pageMetrics, ...details.metrics };
    }
    if (details.demand) entry.demand = details.demand;
  };

  const confirmed = guruGate1FinalConfirmedV259(product);
  const confirmedKeys = new Set(confirmed.map((entry) =>
    guruV247KeywordNormalize(entry.value)));
  confirmed.forEach((entry) => add(entry.value, {
    key: entry.foundation, label: entry.foundation === "gate0"
      ? "Фундамент · Gate 0" : "Фундамент · Gate 1", target: entry.foundation,
  }));
  // The existing confirmed projection keeps one phrase. Add its second
  // provenance if the same confirmed phrase was saved in both foundations.
  (state?.project?.gate0ScopedValuesV194 || []).filter((record) =>
    record.field === "keyword_foundation" && record.scope === "product" &&
    guruV185Text(record.product_id) === product.id).forEach((record) =>
    (record.keywords || []).forEach((keyword) => {
      const parsed = guruV247KeywordEntry(keyword);
      const value = guruV247KeywordText(parsed);
      if (parsed.status === "confirmed" &&
          confirmedKeys.has(guruV247KeywordNormalize(value)))
        add(value, { key: "gate0", label: "Фундамент · Gate 0", target: "gate0" });
    }));

  (state?.gates || []).filter(isGate1Analytics)
    .flatMap((gate) => gate.cards || []).forEach((card) =>
    (card.pageRows || []).forEach((row, index) => {
      if (guruV185Text(row.catalogItemIdV189) !== product.id) return;
      const middle = row.contextFields?.productKeywordFoundationMiddleV257?.keywords || [];
      middle.forEach((keyword) => {
        const parsed = guruV247KeywordEntry(keyword);
        const value = guruV247KeywordText(parsed);
        if (parsed.status === "confirmed" &&
            confirmedKeys.has(guruV247KeywordNormalize(value)))
          add(value, { key: "gate1-middle", label: "Фундамент · Gate 1",
            target: card.id === "card-24" ? "middle" : "page",
            cardId: card.id, index });
      });
      if (typeof guruPageSemanticsValuesV1 !== "function") return;
      const metrics = guruPageSemanticsMetricsV1(row);
      guruPageSemanticsValuesV1(row).forEach((value) => add(value,
        { key: `page:${card.id}:${index}`, label: "Семантика страницы",
          target: "page", cardId: card.id, index },
        { metrics: metrics[guruV247KeywordNormalize(value)] || {} }));
    }));

  (itemData?.demandRows || []).forEach((row, index) => add(row?.kw,
    { key: row?.originStage === "gate4" ? "gate4" : "demand",
      label: row?.originStage === "gate4" ? "Gate 4 · Поиск" : "Спрос · Gate 1",
      target: row?.originStage === "gate4" ? "gate4" : "demand" },
    { demand: { row, index } }));
  return [...byKey.values()];
}

function g1pdSourceButtonsV1(entry) {
  return [...entry.sources.values()].filter((source) => source.target !== "demand")
    .map((source) => {
      const label = source.key === "gate0" ? "Gate 0"
        : source.key === "gate1-middle" ? "Gate 1"
          : source.target === "gate4" ? "Gate 4" : source.label;
      return `<button type="button" class="g1pd-source-v1" data-g1pd-source-v1="${escapeAttr(source.target)}" data-g1pd-card-v1="${escapeAttr(source.cardId || "")}" data-g1pd-index-v1="${source.index ?? ""}" title="Перейти к источнику">${escapeHtml(label)} <span aria-hidden="true">↗</span></button>`;
    }).join('<span class="g1pd-source-separator-v2" aria-hidden="true">·</span>');
}

const g1pdViewsV2 = new Map();
const g1pdUndoV2 = new Map();
const G1PD_DEFAULT_SORT_V1 = { field: "queryCount", direction: "desc" };
function g1pdSortKeyV1(itemId) {
  return guruGate1KeywordSortKeyV561(itemId, "workspace");
}
function g1pdEnsureSortV1(itemId) {
  const key = g1pdSortKeyV1(itemId);
  if (!guruGate1KeywordSortByGroupV561.has(key))
    guruGate1KeywordSortByGroupV561.set(key, { ...G1PD_DEFAULT_SORT_V1 });
  return guruGate1KeywordSortByGroupV561.get(key);
}
function g1pdResetSortV1(root) {
  const itemId = root?.dataset.gate1DirectProductV265;
  if (!itemId) return;
  guruGate1KeywordSortByGroupV561.set(g1pdSortKeyV1(itemId),
    { ...G1PD_DEFAULT_SORT_V1 });
  const list = root.querySelector(".g1pd-rows-v1");
  if (list) {
    const ratings = guruGate1KeywordRelevanceMapV553(
      state.projectComparison?.productsById?.[itemId]);
    const rows = [...list.querySelectorAll(":scope > .pv181-demand-row")]
      .sort((left, right) => guruGate1CompareKeywordRowsV561(
        left, right, G1PD_DEFAULT_SORT_V1, ratings));
    list.prepend(...rows);
  }
  const head = root.querySelector(".g1pd-table-v2 > .pv181-demand-table-head-v263");
  if (head) {
    const template = document.createElement("template");
    template.innerHTML = g1pdTableHeadV2(itemId);
    head.replaceWith(template.content);
  }
}
function g1pdPhraseCountV2(count) {
  const lastTwo = count % 100;
  const last = count % 10;
  return `${count} ${lastTwo >= 11 && lastTwo <= 14 ? "фраз" :
    last === 1 ? "фраза" : last >= 2 && last <= 4 ? "фразы" : "фраз"}`;
}
function g1pdSummaryV2(model) {
  return `${g1pdPhraseCountV2(model.counts.all)} · ${model.counts.all - model.counts.outside} в JTBD · ${model.counts.outside} вне JTBD · ${model.counts.unrated} без оценки релевантности`;
}
function g1pdViewV2(itemId) {
  if (!g1pdViewsV2.has(itemId)) g1pdViewsV2.set(itemId, { filter: "all", search: "" });
  return g1pdViewsV2.get(itemId);
}
function g1pdEffectiveRowV2(entry) {
  const row = { ...(entry.demand?.row || { kw: entry.text }) };
  PV181_DEMAND_FIELDS_V272.forEach(([field]) => {
    if (field !== "kw" && !guruV185Text(row[field]) && guruV185Text(entry.metrics[field]))
      row[field] = entry.metrics[field];
  });
  return row;
}
function g1pdBucketV2(entry, context, itemId) {
  const known = context.uniqueDemandByKey.get(entry.key);
  return known ? guruGate1JtbdBucketV274(itemId, context.itemData, known) : "pending";
}
function g1pdModelV2(product, context) {
  context.uniqueDemandByKey = new Map(guruGate1UniqueDemandV267(context.itemData)
    .map((entry) => [entry.key, entry]));
  const rows = g1pdSourcesV1(product, context.itemData).map((entry) => ({
    ...entry, bucket: g1pdBucketV2(entry, context, product.id),
    effectiveRow: g1pdEffectiveRowV2(entry),
  }));
  const additional = guruGate1EnsureAdditionalJtbdsV268(context.itemData);
  const ratings = guruGate1KeywordRelevanceMapV553(
    state.projectComparison?.productsById?.[product.id]);
  const counts = { all: rows.length, primary: 0, outside: 0, unrated: 0 };
  additional.forEach((entry) => { counts[`additional:${entry.id}`] = 0; });
  rows.forEach((entry) => {
    if (entry.bucket === "primary") counts.primary += 1;
    else if (entry.bucket.startsWith("additional:"))
      counts[entry.bucket] = (counts[entry.bucket] || 0) + 1;
    else counts.outside += 1;
    if (!ratings[entry.key]) counts.unrated += 1;
  });
  return { rows, additional, counts, ratings };
}

function g1pdFilterRowsV2(model, view) {
  const search = guruV247KeywordNormalize(view.search);
  return model.rows.filter((entry) =>
    (view.filter === "all" ||
      (view.filter === "outside" ? !entry.bucket.startsWith("additional:") &&
        entry.bucket !== "primary" : entry.bucket === view.filter)) &&
    (!search || entry.key.includes(search)));
}

function g1pdRowHtmlV1(entry, context, itemId) {
  const stored = entry.demand;
  const row = entry.effectiveRow || g1pdEffectiveRowV2(entry);
  const bucket = entry.bucket || g1pdBucketV2(entry, context, itemId);
  const html = pv181DemandRowsHtmlV272([{ demandRow: row,
    index: stored?.index ?? -1, originStage: row.originStage || "gate1" }], {
    mapIndex: context.mapIndex, itemId, itemData: context.itemData,
    readOnly: !stored, showRemove: false, keywordActions: true,
    transferScope: bucket,
  });
  const template = document.createElement("template");
  template.innerHTML = html;
  const rendered = template.content.firstElementChild;
  if (!rendered) return "";
  rendered.dataset.g1pdPhraseV1 = entry.key;
  rendered.dataset.g1pdTextV1 = entry.text;
  rendered.dataset.g1pdBucketV2 = bucket;
  rendered.querySelectorAll(".pv181-linked-foundation-note-v518").forEach((node) => node.remove());
  const keywordCell = rendered.querySelector(":scope > .pv181-demand-cell-v263");
  // The source links are actions. Keep them outside a <label> while retaining
  // the same classes and the textarea's own aria-label.
  if (keywordCell?.tagName === "LABEL") {
    const cell = document.createElement("div");
    cell.className = keywordCell.className;
    cell.replaceChildren(...keywordCell.childNodes);
    keywordCell.replaceWith(cell);
  }
  const sourceLine = document.createElement("small");
  sourceLine.className = "g1pd-row-sources-v1";
  sourceLine.innerHTML = g1pdSourceButtonsV1(entry);
  rendered.querySelector(":scope > .pv181-demand-cell-v263")?.append(sourceLine);
  if (stored && Object.keys(entry.pageMetrics).length) {
    const pageValues = GURU_PAGE_SEMANTIC_METRIC_FIELDS_V1
      .filter(([field]) => guruV185Text(entry.pageMetrics[field]))
      .map(([field, label]) => `${label}: ${entry.pageMetrics[field]}`);
    if (pageValues.length) {
      const note = document.createElement("small");
      note.className = "g1pd-page-metrics-v1";
      note.textContent = `Семантика страницы · ${pageValues.join(" · ")}`;
      rendered.querySelector(":scope > .pv181-demand-cell-v263")?.append(note);
    }
  }
  PV181_DEMAND_FIELDS_V272.slice(1).forEach(([field, label], offset) => {
    const cell = rendered.querySelectorAll(":scope > .pv181-demand-cell-v263")[offset + 1];
    if (!cell) return;
    const input = document.createElement("input");
    input.type = "text";
    input.className = `g1-input ${guruV185Text(row[field]) ? "is-filled" : "is-empty"}`;
    input.setAttribute("value", guruV185Text(row[field]));
    input.placeholder = "–";
    input.setAttribute("aria-label", label);
    input.dataset.g1pdMetricV2 = field;
    input.dataset.g1pdPhraseV2 = entry.key;
    cell.querySelector(".g1-input")?.replaceWith(input);
  });
  const transfer = rendered.querySelector(".g1kw-transfer-cell-v555");
  if (transfer) {
    transfer.innerHTML = `<span class="pv181-demand-cell-label-v263">JTBD</span><select class="g1-input" data-g1pd-assign-v2="${escapeAttr(entry.key)}" aria-label="JTBD для фразы ${escapeAttr(entry.text)}">
      <option value="pending"${!["primary", "company"].includes(bucket) && !bucket.startsWith("additional:") ? " selected" : ""}>Вне JTBD</option>
      <option value="primary"${bucket === "primary" ? " selected" : ""}>JTBD №1</option>
      ${guruGate1EnsureAdditionalJtbdsV268(context.itemData).map((item, index) => `<option value="additional:${escapeAttr(item.id)}"${bucket === `additional:${item.id}` ? " selected" : ""}>JTBD №${index + 2}</option>`).join("")}
      <option value="company"${bucket === "company" ? " selected" : ""}>Компания</option>
    </select>`;
  }
  rendered.querySelector(".pv181-demand-row-action-spacer-v272")?.remove();
  if (stored) rendered.querySelector(":scope > .pv181-demand-cell-v263")?.insertAdjacentHTML(
    "beforeend", `<button type="button" class="g1pd-remove-demand-v2" data-pv181-demand-remove="${stored.index}" data-pv181-demand-remove-scope="demand" data-pv181-demand-phrase="${escapeAttr(entry.key)}" data-pv181-map-i="${context.mapIndex}" data-pv181-item-i="${escapeAttr(itemId)}">Удалить из анализа</button>`);
  return rendered.outerHTML;
}

function g1pdRowsHtmlV1(rows, context, itemId, searchText = "") {
  if (!rows.length)
    return '<div class="pv181-keyword-empty">Фраз пока нет. Добавьте их в источнике или в анализе.</div>';
  const template = document.createElement("template");
  template.innerHTML = rows.map((entry) => g1pdRowHtmlV1(entry, context, itemId)).join("");
  const sort = g1pdEnsureSortV1(itemId);
  const ratings = guruGate1KeywordRelevanceMapV553(
    state.projectComparison?.productsById?.[itemId]);
  template.content.replaceChildren(...[...template.content.children].sort((left, right) =>
    guruGate1CompareKeywordRowsV561(left, right, sort, ratings)));
  const search = guruV247KeywordNormalize(searchText);
  if (search) [...template.content.children].forEach((row) => {
    row.hidden = !row.dataset.g1pdPhraseV1.includes(search);
  });
  return template.innerHTML;
}

function g1pdTableHeadV2(itemId) {
  g1pdEnsureSortV1(itemId);
  const template = document.createElement("template");
  template.innerHTML = pv181DemandTableHeadHtmlV272({
    keywordActions: true, itemId, scope: "workspace",
  });
  const head = template.content.firstElementChild;
  head?.lastElementChild?.remove();
  if (head?.lastElementChild) head.lastElementChild.textContent = "JTBD";
  return template.innerHTML;
}

function g1pdTotalsHtmlV2(entries, itemId) {
  const demandEntries = entries.map((entry) => ({ demandRow: entry.effectiveRow }));
  return `<div class="g1pd-totals-wrap-v2" data-g1pd-totals-v2>${pv181DemandTotalsHtmlV276(
    demandEntries, { itemId, title: "Итого по выборке" },
  )}</div>`;
}

function g1pdSegmentsHtmlV2(model, view, itemId) {
  const items = [
    ["all", "Все", model.counts.all],
    ["primary", "JTBD №1", model.counts.primary],
    ...model.additional.map((entry, index) => [
      `additional:${entry.id}`, `JTBD №${index + 2}`,
      model.counts[`additional:${entry.id}`] || 0,
    ]),
    ["outside", "Вне JTBD", model.counts.outside],
  ];
  return `<div class="g1pd-filter-row-v2"><div class="g1pd-segments-v2" role="group" aria-label="Фильтр по JTBD" style="--g1pd-segments:${items.length}">
    ${items.map(([key, label, count]) => `<button type="button" data-g1pd-filter-v2="${escapeAttr(key)}" aria-pressed="${view.filter === key}">${escapeHtml(label)} <b>${count}</b></button>`).join("")}
    </div>${model.additional.length < 3 ? `<button type="button" class="small-btn" data-g1pd-add-jtbd-v2="${escapeAttr(itemId)}" ${guruGate1ResolvedMainJtbdV259(itemId).records.length ? "" : 'disabled title="Сначала задайте основной JTBD в Gate 0"'}>+ JTBD</button>` : ""}</div>`;
}

function g1pdContextHtmlV2(product, context, model, filter) {
  if (filter === "all")
    return '<p>Все связанные фразы в одном списке. Выберите JTBD для назначения и используйте фильтр для проверки каждой группы.</p>';
  if (filter === "outside")
    return '<p>Здесь остаются неназначенные фразы и фразы, исключённые из JTBD. Автоматическое сопоставление не включает слова категории.</p>';
  if (filter === "primary") {
    const main = guruGate1ResolvedMainJtbdV259(product.id);
    return `<div><strong>JTBD №1 · основной</strong><small>Формулировка из Gate 0 · только чтение</small><div class="g1-input" data-gate1-live-jtbd-v259>${escapeHtml(main.value || "Не заполнено в источнике")}</div></div>
      <button type="button" class="g1pd-final-link-v2" data-g1pd-final-link-v2>Фундамент ключевых слов (Финальный) · ${g1pdPhraseCountV2(model.counts.primary)} ↗</button>`;
  }
  const index = model.additional.findIndex((entry) => `additional:${entry.id}` === filter);
  const entry = model.additional[index];
  if (!entry) return "";
  const resolved = guruV194Resolve("jtbd", product, state);
  const record = resolved.records.find((item) => item.id === entry.gate0_record_id ||
    item.id === entry.id);
  if (record && resolved.scope !== "product")
    return `<div class="g1pd-jtbd-context-head-v2"><strong>JTBD №${index + 2}</strong><button type="button" class="small-btn" data-g1pd-fork-jtbd-v2>Редактировать для товара</button></div>
      <small>Формулировка наследуется из Gate 0 · ${escapeHtml(resolved.scope === "category" ? "категория" : "проект")}</small>
      <div class="g1-input" aria-readonly="true">${escapeHtml(record.value || "Не заполнено")}</div>
      <button type="button" class="g1pd-final-link-v2" data-g1pd-final-link-v2>Фундамент ключевых слов (Финальный) · ${g1pdPhraseCountV2(model.counts[filter] || 0)} ↗</button>`;
  const fields = [
    ["situation", "В какой ситуации"],
    ["desired_action", "Что клиент хочет"],
    ["result", "Какой результат нужен"],
  ];
  const parts = record ? guruV194JtbdParts(record) : entry;
  const controls = fields.map(([field, label]) => `<label><span>${label}</span><textarea class="g1-input passport-v116-autosize" rows="1" ${record
    ? `data-gate0-scope-record="${escapeAttr(record.id)}" data-gate0-scope-record-field="jtbd_${field}"`
    : `data-pv181-map="${context.mapIndex}" data-pv181-item="${escapeAttr(product.id)}" data-pv181-jtbd-part-v268 data-pv181-jtbd-additional-index-v268="${index}" data-pv181-jtbd-field-v268="${field}"`}>${escapeHtml(parts[field] || "")}</textarea></label>`).join("");
  return `<div class="g1pd-jtbd-context-head-v2"><strong>JTBD №${index + 2}</strong><button type="button" class="small-btn" data-g1pd-delete-jtbd-v2="${escapeAttr(entry.id)}">Удалить JTBD</button></div>
    <div class="g1pd-jtbd-fields-v2">${controls}</div>
    <small>Единая формулировка JTBD</small><div class="g1-input" data-gate0-jtbd-sentence="${escapeAttr(record?.id || entry.id)}">${escapeHtml(guruV194JtbdSentence(parts, { placeholders: true }))}</div>
    <button type="button" class="g1pd-final-link-v2" data-g1pd-final-link-v2>Фундамент ключевых слов (Финальный) · ${g1pdPhraseCountV2(model.counts[filter] || 0)} ↗</button>`;
}

function g1pdEmptyHtmlV2(view) {
  if (view.search) return "Ничего не найдено";
  if (view.filter === "outside") return "Все фразы назначены в JTBD";
  if (view.filter !== "all") return "В этом JTBD пока нет фраз";
  return "Фраз пока нет. Добавьте их в источнике или в анализе.";
}

function g1pdPanelHtmlV2(product, context, model, view) {
  const visible = g1pdFilterRowsV2(model, view);
  const segmentRows = g1pdFilterRowsV2(model, { ...view, search: "" });
  const duplicates = guruGate1DuplicatePhrasesV562(product.id, context.itemData);
  return `<div class="g1pd-panel-v2" id="gate1-product-jtbd" data-g1pd-panel-v2>
    <div class="g1pd-context-v2" data-g1pd-context-v2>${g1pdContextHtmlV2(product, context, model, view.filter)}</div>
    <section class="g1pd-table-section-v1" data-gate1-final-foundation-v259 data-gate1-final-product-id-v259="${escapeAttr(product.id)}" data-pv181-jtbd-demand-details-v278="workspace" data-g1kw-product-v561="${escapeAttr(product.id)}">
      <div class="pv181-demand-table-v263 g1kw-table-v559 g1pd-table-v2">
        ${g1pdTableHeadV2(product.id)}
        <div class="g1pd-rows-v1" data-g1kw-rows-v561>${segmentRows.length
          ? g1pdRowsHtmlV1(segmentRows, context, product.id, view.search) : ""}
          ${visible.length ? "" : `<div class="pv181-keyword-empty">${g1pdEmptyHtmlV2(view)}</div>`}</div>
        ${g1pdTotalsHtmlV2(visible, product.id)}
      </div>
      <button type="button" class="small-btn add-inline-btn" data-pv181-demand-add data-pv181-map-i="${context.mapIndex}" data-pv181-item-i="${escapeAttr(product.id)}">+ Добавить запрос в анализ</button>
    </section>
    ${duplicates.length ? guruGate1DuplicateDecisionsHtmlV562(
      context.mapIndex, product.id, context.itemData, duplicates) : ""}
  </div>`;
}

function g1pdToolsHtmlV2(product, context, model, view) {
  const importState = guruGate1FinalImportStateV259(context.itemData, false);
  const last = importState?.last_import;
  const unmatched = importState?.unmatched || [];
  const exportCount = g1pdFilterRowsV2(model, view).length;
  return `<div class="g1pd-tools-v2" data-g1pd-tools-v2 data-g1pd-product-v2="${escapeAttr(product.id)}">
    <label class="g1pd-search-v2"><span>Поиск по фразам</span><input type="search" class="g1-input" data-g1pd-search-v2 value="${escapeAttr(view.search)}" placeholder="Найти фразу" /></label>
    <button type="button" class="small-btn" data-g1pd-export-v2 ${exportCount ? "" : "disabled"}>Экспорт CSV</button>
    <button type="button" class="small-btn" data-g1pd-copy-all-v1 ${exportCount ? "" : "disabled"}>Копировать все</button>
    <button type="button" class="small-btn" data-g1pd-import-v2>Импорт CSV/XLS/XLSX с метриками</button>
    <input class="gate0-keyword-csv-file-v248" type="file" accept=".csv,.xls,.xlsx,text/csv,text/plain,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" data-g1pd-file-v2 />
    ${last ? `<small class="g1pd-import-state-v2">Последний импорт: обновлено ${Number(last.matched) || 0}, новых черновиков ${Number(last.created) || 0}, служебных строк ${Number(last.unmatched) || 0}</small>` : ""}
    ${unmatched.length ? `<details class="gate1-final-unmatched-v259"><summary>Не сопоставлено: ${unmatched.length}</summary><div class="gate1-final-unmatched-list-v259">${unmatched.map((row) => `<span>${escapeHtml(row.phrase)}</span>`).join("")}</div><small>Служебные строки не попали в таблицу спроса.</small></details>` : ""}
  </div>`;
}

function g1pdWorkspaceHtmlV1() {
  const product = guruV194SelectedProduct(state);
  if (!product) return `<div class="pv181-keyword-empty">Выберите категорию и товар в верхнем селекторе.</div>`;
  gate1PainMigrateWorkspaceV237(state);
  const context = guruGate1FinalPainContextV259(product, true);
  if (!context) return `<div class="pv181-keyword-empty">Для выбранного товара данные пока не созданы.</div>`;
  if (g4sbV560SyncGate1PhraseGroups(product.id, context.itemData))
    guruScheduleUiPreferenceSave();
  guruGate1SyncJtbdSourceV594(product.id, context.itemData);
  const itemId = product.id;
  if (!document.querySelector(`[data-g1pd-workspace-v1][data-gate1-direct-product-v265="${CSS.escape(itemId)}"]`))
    guruGate1KeywordSortByGroupV561.delete(g1pdSortKeyV1(itemId));
  g1pdEnsureSortV1(itemId);
  const model = g1pdModelV2(product, context);
  const view = g1pdViewV2(itemId);
  if (view.filter.startsWith("additional:") &&
      !model.additional.some((entry) => `additional:${entry.id}` === view.filter))
    view.filter = "all";
  const productCard = state.gates?.find((gate) => gate.id === "gate-1")?.cards
    ?.find((card) => card.id === "card-24");
  const productPageIndex = productCard?.pageRows?.findIndex((row) =>
    guruV185Text(row.catalogItemIdV189) === itemId) ?? -1;
  const middleEditor = productPageIndex >= 0
    ? guruGate1MiddleKeywordFoundationHtmlV257(
      productCard, productCard.pageRows[productPageIndex], productPageIndex) : "";
  return `<div class="g1pd-workspace-v1 pv181-jtbd-level" data-g1pd-workspace-v1 data-gate1-direct-product-v265="${escapeAttr(itemId)}" data-pv181-demand-product-v262="${escapeAttr(itemId)}">
    <header class="g1pd-heading-v1"><h3>Семантика и спрос</h3><p data-g1pd-summary-v2>${g1pdSummaryV2(model)}</p></header>
    <div data-g1pd-segments-root-v2>${g1pdSegmentsHtmlV2(model, view, itemId)}</div>
    ${g1pdToolsHtmlV2(product, context, model, view)}
    <div class="g1pd-undo-v2" data-g1pd-undo-v2 hidden aria-live="polite"></div>
    ${pv181DemandTrafficVolumeHtmlV270(context.itemData)}
    ${g1pdPanelHtmlV2(product, context, model, view)}
    ${middleEditor ? `<details class="g1pd-middle-v1" data-g1pd-middle-v1><summary>Кандидаты из карточки · Gate 1</summary>${middleEditor}</details>` : ""}
  </div>`;
}

pv140ProductStrategyHtml = g1pdWorkspaceHtmlV1;

document.addEventListener("click", (event) => {
  const toggle = event.target?.closest?.(
    '[data-gate1-toggle-section="pain_jtbd_offer"]');
  if (toggle?.getAttribute("aria-expanded") !== "false") return;
  const root = toggle.closest(".g1-section")?.querySelector(
    "[data-g1pd-workspace-v1]");
  if (root) g1pdResetSortV1(root);
});

document.addEventListener("click", (event) => {
  const source = event.target?.closest?.("[data-g1pd-source-v1]");
  if (source && source.closest("[data-g1pd-workspace-v1]")) {
    event.preventDefault();
    if (source.dataset.g1pdSourceV1 === "gate0") {
      guruNavigateToGate("gate-0");
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const selected = guruV194SelectedProduct(state);
        const target = selected && document.querySelector(
          `[data-gate0-scope-field-row="keyword_foundation"][data-gate0-keyword-product-id="${CSS.escape(selected.id)}"]`)
          || document.querySelector('[data-gate0-scope-field-row="keyword_foundation"]')
          || document.querySelector('[data-guru-product-context="product_segment_client_task"]');
        if (target) {
          nowGuideOpenAncestors(target);
          target.scrollIntoView({ block: "start", behavior: "smooth" });
        }
      }));
      return;
    }
    if (source.dataset.g1pdSourceV1 === "gate4") {
      guruNavigateToGate("gate-4");
      return;
    }
    if (["middle", "gate1-middle"].includes(source.dataset.g1pdSourceV1)) {
      const details = source.closest("[data-g1pd-workspace-v1]")
        ?.querySelector("[data-g1pd-middle-v1]");
      if (details) {
        details.open = true;
        details.scrollIntoView({ block: "start", behavior: "smooth" });
      }
      return;
    }
    const cardId = source.dataset.g1pdCardV1 || "card-24";
    const article = [...document.querySelectorAll(".g1-card[data-card]")]
      .find((node) => node.dataset.card === cardId);
    if (!article) return;
    const toggle = article.querySelector(":scope > [data-gate1-toggle-card], :scope > [data-guru-unified-page-toggle-v527]");
    if (!article.classList.contains("is-open")) toggle?.click();
    const index = Number(source.dataset.g1pdIndexV1);
    const semantic = article.querySelector(`[data-v22-site-section="page_semantics_v1"][data-page-semantics-index-v1="${Number.isInteger(index) ? index : 0}"]`)
      || article.querySelector('[data-v22-site-section="page_semantics_v1"]');
    if (semantic) {
      nowGuideOpenAncestors(semantic);
      semantic.open = true;
      semantic.scrollIntoView({ block: "start", behavior: "smooth" });
    } else article.scrollIntoView({ block: "start", behavior: "smooth" });
    return;
  }
});

// Source editors may stay open beside this workspace. Refresh only the
// projection after an editor commits, leaving its inputs and JTBD editor alone.
let g1pdRefreshQueuedV1 = false;
let g1pdRefreshAfterFocusV1 = false;
function g1pdRefreshProjectionV1({ force = false } = {}) {
  const root = document.querySelector("[data-g1pd-workspace-v1]");
  const list = root?.querySelector(".g1pd-rows-v1");
  const product = guruV194SelectedProduct(state);
  if (!list || !product || root.dataset.gate1DirectProductV265 !== product.id) return;
  const context = guruGate1FinalPainContextV259(product, false);
  if (!context) return;
  const model = g1pdModelV2(product, context);
  const view = g1pdViewV2(product.id);
  if (view.filter.startsWith("additional:") &&
      !model.additional.some((entry) => `additional:${entry.id}` === view.filter))
    view.filter = "all";
  const segments = root.querySelector("[data-g1pd-segments-root-v2]");
  if (segments) segments.innerHTML = g1pdSegmentsHtmlV2(model, view, product.id);
  const summary = root.querySelector("[data-g1pd-summary-v2]");
  if (summary) summary.textContent = g1pdSummaryV2(model);
  const exportButton = root.querySelector("[data-g1pd-export-v2]");
  if (exportButton) exportButton.disabled = !g1pdFilterRowsV2(model, view).length;
  const copyButton = root.querySelector("[data-g1pd-copy-all-v1]");
  if (copyButton) copyButton.disabled = !g1pdFilterRowsV2(model, view).length;
  if (!force && list.contains(document.activeElement)) {
    g1pdRefreshAfterFocusV1 = true;
    return;
  }
  const template = document.createElement("template");
  template.innerHTML = g1pdPanelHtmlV2(product, context, model, view);
  const panel = root.querySelector("[data-g1pd-panel-v2]");
  if (panel) panel.replaceWith(template.content);
  const undo = g1pdUndoV2.get(product.id);
  const undoSlot = root.querySelector("[data-g1pd-undo-v2]");
  if (undoSlot) {
    undoSlot.hidden = !undo;
    undoSlot.innerHTML = undo
      ? `Фраза «${escapeHtml(undo.phrase)}» перенесена. <button type="button" data-g1pd-undo-action-v2>Отменить</button>` : "";
  }
  guruAutosizeVisible(root.querySelector("[data-g1pd-panel-v2]"));
}
function g1pdScheduleRefreshV1() {
  if (g1pdRefreshQueuedV1) return;
  g1pdRefreshQueuedV1 = true;
  requestAnimationFrame(() => {
    g1pdRefreshQueuedV1 = false;
    g1pdRefreshProjectionV1();
  });
}
document.addEventListener("focusout", (event) => {
  if (!g1pdRefreshAfterFocusV1 || !event.target?.closest?.(".g1pd-rows-v1")) return;
  g1pdRefreshAfterFocusV1 = false;
  g1pdScheduleRefreshV1();
});

function g1pdActiveV2(control) {
  const root = control?.closest?.("[data-g1pd-workspace-v1]");
  const product = root && guruV194SelectedProduct(state);
  const context = product && guruGate1FinalPainContextV259(product, false);
  return root && product && context && root.dataset.gate1DirectProductV265 === product.id
    ? { root, product, context, view: g1pdViewV2(product.id) } : null;
}

function g1pdEnsureDemandRowV2(active, phraseKey) {
  const entry = g1pdSourcesV1(active.product, active.context.itemData)
    .find((item) => item.key === phraseKey);
  if (!entry) return null;
  if (entry.demand) return { row: entry.demand.row, created: false };
  const row = { kw: entry.text, originStage: "gate1", ...entry.metrics };
  active.context.itemData.demandRows.push(row);
  return { row, created: true };
}

function g1pdUpdateTotalsV2(active) {
  const entries = [...active.root.querySelectorAll(
    ".g1pd-rows-v1 > .pv181-demand-row:not([hidden])",
  )].map((node) => {
    const effectiveRow = { kw: node.dataset.g1pdPhraseV1 };
    PV181_DEMAND_FIELDS_V272.slice(1).forEach(([field]) => {
      effectiveRow[field] = node.querySelector(
        `[data-g1pd-metric-v2="${field}"]`)?.value || "";
    });
    return { effectiveRow };
  });
  const template = document.createElement("template");
  template.innerHTML = g1pdTotalsHtmlV2(entries, active.product.id);
  active.root.querySelector("[data-g1pd-totals-v2]")?.replaceWith(
    template.content.firstElementChild);
}

function g1pdApplySearchV2(active) {
  const list = active.root.querySelector(".g1pd-rows-v1");
  if (!list) return;
  const search = guruV247KeywordNormalize(active.view.search);
  let visible = 0;
  list.querySelectorAll(":scope > .pv181-demand-row").forEach((row) => {
    row.hidden = Boolean(search && !row.dataset.g1pdPhraseV1.includes(search));
    if (!row.hidden) visible += 1;
  });
  const empty = list.querySelector(":scope > .pv181-keyword-empty");
  if (visible) empty?.remove();
  else if (empty) empty.textContent = g1pdEmptyHtmlV2(active.view);
  else {
    const message = document.createElement("div");
    message.className = "pv181-keyword-empty";
    message.textContent = g1pdEmptyHtmlV2(active.view);
    list.append(message);
  }
  const exportButton = active.root.querySelector("[data-g1pd-export-v2]");
  if (exportButton) exportButton.disabled = !visible;
  const copyButton = active.root.querySelector("[data-g1pd-copy-all-v1]");
  if (copyButton) copyButton.disabled = !visible;
  g1pdUpdateTotalsV2(active);
}

function g1pdVisiblePhrasesV1(active) {
  const seen = new Set();
  const search = guruV247KeywordNormalize(active.view.search);
  return [...active.root.querySelectorAll(
    ".g1pd-rows-v1 > .pv181-demand-row:not([hidden])",
  )].flatMap((row) => {
    const editor = row.querySelector('[data-pv181-dfield="kw"]');
    const phrase = guruV185Text(editor ? editor.value : row.dataset.g1pdTextV1)
      .replace(/[\r\n\t]+/g, " ").trim();
    const key = guruV247KeywordNormalize(phrase);
    if (!key || (search && !key.includes(search)) || seen.has(key)) return [];
    seen.add(key);
    return [phrase];
  });
}

const g1pdCopyTimersV1 = new WeakMap();
function g1pdCopyNoticeV1(button, message) {
  window.clearTimeout(g1pdCopyTimersV1.get(button));
  button.textContent = message;
  g1pdCopyTimersV1.set(button, window.setTimeout(() => {
    if (button.isConnected) button.textContent = "Копировать все";
    g1pdCopyTimersV1.delete(button);
  }, 1600));
}

function g1pdAssignV2(active, phraseKey, target) {
  const model = g1pdModelV2(active.product, active.context);
  const entry = model.rows.find((row) => row.key === phraseKey);
  if (!entry || entry.bucket === target) return false;
  const previous = guruGate1JtbdAssignmentsV274(active.context.itemData)[phraseKey];
  const savedAssignment = previous ? structuredClone(previous) : null;
  const ensured = g1pdEnsureDemandRowV2(active, phraseKey);
  if (!ensured) return false;
  const moved = target === "company"
    ? guruGate1TransferKeywordToCompanyV555(active.product.id,
      active.context.itemData, phraseKey)
    : guruGate1AssignDemandPhraseV274(active.product.id,
      active.context.itemData, phraseKey,
      target.startsWith("additional:") ? "additional" : target,
      target.startsWith("additional:") ? target.slice(11) : "");
  if (!moved) {
    if (ensured.created) active.context.itemData.demandRows.pop();
    return false;
  }
  if (target === "company") g1pdUndoV2.delete(active.product.id);
  else g1pdUndoV2.set(active.product.id, {
    phrase: entry.text, phraseKey, previousBucket: entry.bucket,
    previousAssignment: savedAssignment, created: ensured.created,
  });
  g4sbV560SyncGate1PhraseGroups(active.product.id, active.context.itemData);
  flashSaving();
  g1pdRefreshProjectionV1({ force: true });
  renderGateNav();
  return true;
}

function g1pdForkJtbdsV2(active) {
  const resolved = guruV194Resolve("jtbd", active.product, state);
  if (resolved.scope === "product" || !resolved.records.length) return false;
  const now = new Date().toISOString();
  const copies = resolved.records.map((record) => ({
    ...record,
    id: makeId("gate0-value"),
    ...guruV194RecordLocation("product", active.product),
    jtbd: record.jtbd && typeof record.jtbd === "object"
      ? { ...record.jtbd } : undefined,
    source: { type: "inheritance_override", label: "Gate 1 · JTBD товара",
      inherited_from_id: record.id },
    created_at: now,
    updated_at: now,
  }));
  if (!guruV194InsertStrategyRecords(copies, active.product, state)) return false;
  guruV194Ui(state).scopeByProductField[`${active.product.id}:jtbd`] = "product";
  guruV194SyncLegacy(state);
  guruGate1SyncJtbdSourceV594(active.product.id, active.context.itemData);
  flashSaving();
  renderGate();
  return true;
}

document.addEventListener("click", async (event) => {
  const control = event.target?.closest?.(
    "[data-g1pd-filter-v2], [data-g1pd-final-link-v2], [data-g1pd-add-jtbd-v2], [data-g1pd-delete-jtbd-v2], [data-g1pd-fork-jtbd-v2], [data-g1pd-undo-action-v2], [data-g1pd-export-v2], [data-g1pd-copy-all-v1], [data-g1pd-import-v2]",
  );
  if (!control) return;
  const active = g1pdActiveV2(control);
  if (!active) return;
  event.preventDefault();
  if (control.hasAttribute("data-g1pd-filter-v2")) {
    active.view.filter = control.dataset.g1pdFilterV2;
    g1pdRefreshProjectionV1({ force: true });
    return;
  }
  if (control.hasAttribute("data-g1pd-final-link-v2")) {
    active.root.querySelector("[data-gate1-final-foundation-v259]")?.scrollIntoView({
      block: "center", behavior: "smooth",
    });
    return;
  }
  if (control.hasAttribute("data-g1pd-import-v2")) {
    const input = active.root.querySelector("[data-g1pd-file-v2]");
    if (input) { input.value = ""; input.click(); }
    return;
  }
  if (control.hasAttribute("data-g1pd-copy-all-v1")) {
    const phrases = g1pdVisiblePhrasesV1(active);
    if (!phrases.length) return;
    try {
      await g4sbV141CopyText(phrases.join("\n"));
      g1pdCopyNoticeV1(control, `Скопировано ${g1pdPhraseCountV2(phrases.length)}`);
    } catch (_error) {
      g1pdCopyNoticeV1(control, "Не удалось скопировать");
    }
    return;
  }
  if (control.hasAttribute("data-g1pd-export-v2")) {
    const filter = active.view.filter;
    const scope = filter.startsWith("additional:") ? "additional" : filter;
    const groupId = filter.startsWith("additional:") ? filter.slice(11) : "";
    const entries = g1pdFilterRowsV2(g1pdModelV2(active.product,
      active.context), active.view).map((row) => ({ demandRow: row.effectiveRow }));
    const slug = guruV185Text(active.product.name).toLocaleLowerCase("ru-RU")
      .replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "") || active.product.id;
    const suffix = filter === "all" ? "" : filter === "outside" ? "-outside-jtbd"
      : `-${guruGate1GroupFinalFileSlugV279({ itemId: active.product.id,
        scope, groupId })}`;
    downloadText(`keyword-foundation-final-${slug}${suffix}.csv`,
      guruGate1FinalMetricsCsvV279(entries));
    return;
  }
  if (control.hasAttribute("data-g1pd-undo-action-v2")) {
    const undo = g1pdUndoV2.get(active.product.id);
    if (!undo) return;
    const target = undo.previousBucket;
    const restored = target === "company"
      ? guruGate1TransferKeywordToCompanyV555(active.product.id,
        active.context.itemData, undo.phraseKey)
      : guruGate1AssignDemandPhraseV274(active.product.id,
        active.context.itemData, undo.phraseKey,
        target.startsWith("additional:") ? "additional" : target,
        target.startsWith("additional:") ? target.slice(11) : "");
    if (!restored) return;
    const assignments = guruGate1JtbdAssignmentsV274(active.context.itemData, true);
    if (undo.previousAssignment) assignments[undo.phraseKey] = undo.previousAssignment;
    else delete assignments[undo.phraseKey];
    if (undo.created) active.context.itemData.demandRows =
      active.context.itemData.demandRows.filter((row) =>
        guruV247KeywordNormalize(row.kw) !== undo.phraseKey);
    pv181SyncQueryGroups(active.context.itemData);
    pv181SyncJtbdModel(active.context.itemData);
    g4sbV560SyncGate1PhraseGroups(active.product.id, active.context.itemData);
    g1pdUndoV2.delete(active.product.id);
    flashSaving();
    g1pdRefreshProjectionV1({ force: true });
    renderGateNav();
    return;
  }
  if (control.hasAttribute("data-g1pd-fork-jtbd-v2")) {
    g1pdForkJtbdsV2(active);
    return;
  }
  if (control.hasAttribute("data-g1pd-add-jtbd-v2")) {
    const existing = guruGate1ResolvedMainJtbdV259(active.product.id).records;
    if (!existing.length || existing.length >= GATE0_STRATEGY_LIMITS.jtbd) return;
    const entry = guruGate1AdditionalJtbdEntryV268(null, { source: "manual" });
    if (!guruGate1CreateCanonicalAdditionalV594(active.product.id, entry)) return;
    guruGate1SyncJtbdSourceV594(active.product.id, active.context.itemData);
    const last = guruGate1EnsureAdditionalJtbdsV268(active.context.itemData).at(-1);
    if (last) active.view.filter = `additional:${last.id}`;
    flashSaving();
    renderGate();
    return;
  }
  const id = control.dataset.g1pdDeleteJtbdV2;
  const entry = guruGate1EnsureAdditionalJtbdsV268(active.context.itemData)
    .find((item) => item.id === id);
  if (!entry) return;
  if (guruV194Resolve("jtbd", active.product, state).scope !== "product") {
    g1pdForkJtbdsV2(active);
    return;
  }
  const recordId = entry.gate0_record_id || entry.id;
  if (!guruV194Records(state).some((record) => record.id === recordId &&
    record.scope === "product" && record.product_id === active.product.id)) return;
  guruGate1ReleaseAdditionalJtbdKeywordsV274(active.product.id,
    active.context.itemData, entry);
  const linked = guruGate1AdditionalJtbdGroupV268(active.context.itemData, entry);
  if (linked?.additionalJtbdIdV268 === entry.id) delete linked.additionalJtbdIdV268;
  // guruV194Records normalises and replaces its backing array on each read.
  // Resolve it after membership release, which also reads those records.
  const records = guruV194Records(state);
  const recordIndex = records.findIndex((record) => record.id === recordId &&
    record.scope === "product" && record.product_id === active.product.id);
  if (recordIndex < 0) return;
  records.splice(recordIndex, 1);
  guruV194SyncLegacy(state);
  guruGate1SyncJtbdSourceV594(active.product.id, active.context.itemData);
  active.view.filter = "outside";
  g4sbV560SyncGate1PhraseGroups(active.product.id, active.context.itemData);
  flashSaving();
  renderGate();
});

document.addEventListener("input", (event) => {
  const search = event.target?.closest?.("[data-g1pd-search-v2]");
  if (search) {
    const active = g1pdActiveV2(search);
    if (!active) return;
    active.view.search = search.value;
    g1pdApplySearchV2(active);
    return;
  }
  const metric = event.target?.closest?.("[data-g1pd-metric-v2]");
  if (!metric) return;
  const active = g1pdActiveV2(metric);
  if (!active) return;
  const field = metric.dataset.g1pdMetricV2;
  if (!PV181_DEMAND_FIELDS_V272.some(([name]) => name === field)) return;
  const ensured = g1pdEnsureDemandRowV2(active, metric.dataset.g1pdPhraseV2);
  if (!ensured) return;
  ensured.row[field] = metric.value;
  metric.classList.toggle("is-filled", Boolean(guruV185Text(metric.value)));
  metric.classList.toggle("is-empty", !guruV185Text(metric.value));
  metric.closest(".pv181-demand-row")?.setAttribute(
    `data-g1kw-sort-${field.toLowerCase()}-v561`, metric.value);
  flashSaving({ skipDerivedRefresh: true, skipProductSelectorRefresh: true });
  g1pdUpdateTotalsV2(active);
});

document.addEventListener("change", (event) => {
  const assignment = event.target?.closest?.("[data-g1pd-assign-v2]");
  if (assignment) {
    const active = g1pdActiveV2(assignment);
    if (active) g1pdAssignV2(active, assignment.dataset.g1pdAssignV2,
      assignment.value);
    return;
  }
  if (event.target?.closest?.("[data-g1pd-metric-v2]")) {
    flashSaving();
    renderGateNav();
    g1pdScheduleRefreshV1();
  }
  if (event.target?.closest?.("[data-g1kw-relevance-v553]"))
    g1pdScheduleRefreshV1();
  if (event.target?.closest?.("[data-g1pd-context-v2] [data-gate0-scope-record]")) {
    const active = g1pdActiveV2(event.target);
    if (active) {
      guruGate1SyncJtbdSourceV594(active.product.id, active.context.itemData);
      g1pdScheduleRefreshV1();
    }
  }
});

document.addEventListener("change", async (event) => {
  const input = event.target?.closest?.("[data-g1pd-file-v2]");
  if (!input) return;
  const active = g1pdActiveV2(input);
  const file = input.files?.[0];
  if (!active || !file) return;
  try {
    const parsed = await guruGate1FinalReadMetricsFileV260(file);
    if (!parsed.rows.length && !parsed.serviceRows.length) {
      window.alert("В файле нет непустых строк.");
      return;
    }
    const filter = active.view.filter;
    if (filter === "primary" || filter.startsWith("additional:")) {
      const scope = filter === "primary" ? "primary" : "additional";
      const groupId = scope === "additional" ? filter.slice(11) : "";
      guruGate1GroupApplyMetricsV279(active.product.id, active.context.itemData,
        guruGate1GroupFinalEntriesV279(scope, groupId, active.product.id,
          active.context.itemData), parsed, file.name, { scope, groupId });
    } else guruGate1FinalApplyMetricsV259(active.product, parsed, file.name);
    flashSaving();
    saveState();
    renderGate();
  } catch (error) {
    console.error("Не удалось импортировать метрики семантики и спроса", error);
    window.alert(error?.message || "Не удалось прочитать CSV / XLS / XLSX-файл.");
  } finally { input.value = ""; }
});
const g1pdPreviousPageCommitV1 = guruPageSemanticsCommitV1;
guruPageSemanticsCommitV1 = function (target, values, options) {
  const result = g1pdPreviousPageCommitV1(target, values, options);
  if (options?.repaint !== false) g1pdScheduleRefreshV1();
  return result;
};
const g1pdPreviousMiddleRefreshV1 = guruGate1MiddleRefreshV257;
guruGate1MiddleRefreshV257 = function (...args) {
  const result = g1pdPreviousMiddleRefreshV1(...args);
  g1pdScheduleRefreshV1();
  return result;
};
document.addEventListener("change", (event) => {
  if (event.target?.matches?.('[data-page-semantic-input-v1], [data-page-context-key="seoKeywords"]'))
    g1pdScheduleRefreshV1();
});
