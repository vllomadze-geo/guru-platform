/* Shared company demand and competitor analysis. Company records stay at
   projectComparison; products continue to use productsById[product_id]. */
function g1CompanyKeywordRecord(workspace = state) {
  return (workspace?.project?.gate0ScopedValuesV194 || [])
    .find(record => record.field === "keyword_foundation" && record.scope === "project" && !record.archived_at);
}

// Restore the seven links lost while search matches were held only in view state.
// This one-time repair is limited to the identified project, record IDs, domains
// and a confirmed keyword. It never replaces another saved association.
function g1CompanyRestoreSearchLinksV603(workspace) {
  if (workspace?.project?.id !== "project-1783243907480-ec7d8c") return 0;
  const entry = workspace.projectComparison;
  if (entry?.searchLinksRestoredV603) return 0;
  const phrase = "изделия ручной работы москва";
  if (!gate1CompanyKeywordFoundationDemandSourceV351(workspace).lines.some(row => row.key === phrase)) return 0;
  const competitors = entry?.competitors;
  if (!Array.isArray(competitors)) return 0;
  const domains = new Map([
    ["comparison-company-competitor-1793034783219-e0c3bf", "marite.ru"],
    ["comparison-company-competitor-1793039568963-2c4174", "77000.ru"],
    ["comparison-company-competitor-1793039643204-a5a20b", "sozdavay.art"],
    ["comparison-company-competitor-1793039719436-55d780", "katunoff.ru"],
    ["comparison-company-competitor-1793039781356-2fdf19", "livemaster.ru"],
    ["comparison-company-competitor-1793039840012-432ed7", "krepkoshop.com"],
    ["comparison-company-competitor-1793039879449-9c3fed", "avito.ru"],
  ]);
  const matches = [...domains].map(([id, expected]) => {
    const competitor = competitors.find(row => row.id === id);
    if (!competitor) return null;
    const domain = String(competitor.siteDomainV538 || competitor.domain || "").trim().toLowerCase()
      .replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#]/, 1)[0];
    return domain === expected ? competitor : null;
  });
  if (matches.some(row => !row)) return 0;
  let restored = 0;
  for (const competitor of matches) {
    const found = Array.isArray(competitor.foundPhraseKeysV539) ? competitor.foundPhraseKeysV539 : [];
    if (found.includes(phrase)) continue;
    competitor.foundPhraseKeysV539 = [...found, phrase];
    restored++;
  }
  entry.searchLinksRestoredV603 = true;
  return restored;
}

// Demand is a projection of the existing foundation, never a second word bank.
gate1CompanyKeywordFoundationDemandSourceV351 = function (workspace = state) {
  const lines = [], duplicates = [], seen = new Set();
  (g1CompanyKeywordRecord(workspace)?.keywords || []).forEach((keyword, sourceIndex) => {
    if (keyword && typeof keyword === "object" && Object.hasOwn(keyword, "status") && keyword.status !== "confirmed") return;
    const entry = guruV247KeywordEntry(keyword);
    const text = guruV247KeywordText(entry), key = guruV247KeywordNormalize(text);
    if (entry.status !== "confirmed" || !key) return;
    const row = { text, key, sourceIndex, candidateId: keyword?.id || gate1CompanyBrandDemandDraftIdV345(text, sourceIndex) };
    (seen.has(key) ? duplicates : lines).push(row);
    seen.add(key);
  });
  return { lines, duplicates };
};

// Company competitors belong to confirmed search phrases. Keep the complete
// competitor record in the existing archive when its last phrase disappears.
// A blank table draft has no domain and remains editable. This also repairs
// projects saved before keyword removal reconciled the comparison.
function g1CompanyReconcileKeywordCompetitorsV624(workspace = state) {
  if (!g1CompanyKeywordRecord(workspace)) return { archived: 0, restored: 0 };
  const comparison = workspace?.projectComparison;
  if (!comparison || !Array.isArray(comparison.competitors))
    return { archived: 0, restored: 0 };
  const active = new Set(gate1CompanyKeywordFoundationDemandSourceV351(workspace)
    .lines.map(row => row.key));
  const archived = Array.isArray(comparison.archivedCompetitorsV540)
    ? comparison.archivedCompetitorsV540 : [];
  let restored = 0;
  const restoredIds = new Set();
  for (let index = archived.length - 1; index >= 0; index--) {
    const competitor = archived[index];
    if (competitor?.companyKeywordArchiveReasonV624 !== "keyword_removed") continue;
    if (!(competitor.foundPhraseKeysV539 || []).some(key => active.has(guruV247KeywordNormalize(key)))) continue;
    if (comparison.competitors.some(row => row.id === competitor.id)) continue;
    comparison.competitors.push(competitor);
    archived.splice(index, 1);
    restoredIds.add(competitor.id);
    restored++;
  }
  const archivedRecordIds = new Set(archived.map(row => row.id));
  let archivedCount = 0;
  const archivedIds = new Set();
  const keep = [];
  for (const competitor of comparison.competitors) {
    const found = Array.isArray(competitor.foundPhraseKeysV539)
      ? competitor.foundPhraseKeysV539 : [];
    const hasActivePhrase = found.some(key => active.has(guruV247KeywordNormalize(key)));
    const hasIdentity = Boolean(String(competitor.domain || competitor.siteDomainV538 || "").trim());
    if (hasActivePhrase || (!found.length && !hasIdentity)) {
      keep.push(competitor);
      continue;
    }
    // Avoid replacing an independently archived record with the same ID.
    if (archivedRecordIds.has(competitor.id)) {
      keep.push(competitor);
      continue;
    }
    competitor.companyKeywordArchiveReasonV624 = "keyword_removed";
    archived.push(competitor);
    archivedRecordIds.add(competitor.id);
    archivedIds.add(competitor.id);
    archivedCount++;
  }
  if (archivedCount || restored) {
    comparison.competitors = keep;
    comparison.archivedCompetitorsV540 = archived;
    if (Array.isArray(comparison.candidatesV539)) {
      const moved = comparison.candidatesV539.filter(row => archivedIds.has(row.id));
      if (moved.length) {
        comparison.archivedCompanyCandidatesV624 ||= [];
        for (const row of moved) if (!comparison.archivedCompanyCandidatesV624.some(saved => saved.id === row.id))
          comparison.archivedCompanyCandidatesV624.push(row);
        comparison.candidatesV539 = comparison.candidatesV539.filter(row => !archivedIds.has(row.id));
      }
    }
    if (restored && Array.isArray(comparison.archivedCompanyCandidatesV624)) {
      const candidates = comparison.archivedCompanyCandidatesV624.filter(row => restoredIds.has(row.id));
      comparison.candidatesV539 ||= [];
      for (const row of candidates) if (!comparison.candidatesV539.some(activeRow => activeRow.id === row.id))
        comparison.candidatesV539.push(row);
      comparison.archivedCompanyCandidatesV624 = comparison.archivedCompanyCandidatesV624
        .filter(row => !restoredIds.has(row.id));
    }
  }
  return { archived: archivedCount, restored };
}

function g1CompanyDemandChanged() {
  guruInvalidateGateViewCache();
  gate1CompanyBrandDemandRefreshV345({ preserveOpen: true });
  guruStrategicFoundationCompanyRefreshV310();
  flashSaving();
}

document.addEventListener("submit", event => {
  const form = event.target.closest?.("[data-company-demand-add-form]");
  if (!form) return;
  event.preventDefault();
  const input = form.querySelector("[data-company-demand-new]");
  const text = input.value.trim(), key = guruV247KeywordNormalize(text);
  const feedback = form.querySelector("[data-company-demand-feedback]");
  if (!key) { feedback.textContent = "Введите ключевое слово"; input.focus(); return; }
  if (gate1CompanyKeywordFoundationDemandSourceV351().lines.some(row => row.key === key)) {
    feedback.textContent = "Это слово уже есть в списке"; input.focus(); return;
  }
  const record = guruCompanyKeywordFoundationRecordV351(state, true);
  record.keywords ||= [];
  const existing = record.keywords.findIndex(row => guruV247KeywordNormalize(guruV247KeywordText(row)) === key);
  const now = new Date().toISOString();
  const entry = guruV247KeywordEntry(existing >= 0 ? record.keywords[existing] : text,
    { source: "manual", status: "confirmed" });
  entry.status = "confirmed"; entry.confirmed_at = now;
  if (existing >= 0) record.keywords[existing] = entry;
  else record.keywords.push(entry);
  record.updated_at = now;
  gate1CompanyBrandDemandReconcileV345(state, { create: true });
  g1CompanyDemandChanged();
  document.querySelector("[data-company-demand-new]")?.focus({ preventScroll: true });
});

document.addEventListener("click", event => {
  const button = event.target.closest?.("[data-company-demand-remove]");
  if (!button) return;
  event.preventDefault();
  const key = guruV247KeywordNormalize(button.dataset.companyDemandPhrase);
  const record = g1CompanyKeywordRecord();
  if (!record || !key) return;
  const removed = record.keywords.filter(row => guruV247KeywordNormalize(guruV247KeywordText(row)) === key);
  if (!removed.length) return;
  // Materialize current metrics before removing the source so reconciliation
  // archives the row. Restore by phrase later also restores its measurements.
  gate1CompanyBrandDemandReconcileV345(state, { create: true });
  record.keywords = record.keywords.filter(row => guruV247KeywordNormalize(guruV247KeywordText(row)) !== key);
  record.updated_at = new Date().toISOString();
  const model = gate1CompanyBrandDemandReconcileV345(state, { create: true });
  const archived = model.archivedRows.find(row => guruV247KeywordNormalize(row.kw) === key);
  if (archived) archived.sourceKeywords = removed;
  g1CompanyReconcileKeywordCompetitorsV624(state);
  g1CompanyDemandChanged();
});

function g1CompanyComparisonHome(workspace = state) {
  const card = workspace?.gates?.find(gate => gate.id === "gate-1")?.cards?.find(card => card.id === "card-21");
  return { card, row: card?.pageRows?.[0] || null };
}

function g1CompanyComparisonGroups(workspace = state) {
  return [{ id: "company", company: true, text: "Ключевые слова компании", primary: false,
    phrases: gate1CompanyBrandDemandReconcileV345(workspace).rows.map(row => ({
      key: guruV247KeywordNormalize(row.kw), value: row.kw,
      frequency: pv181DemandQueryNumberV262(row.queryCount),
    })) }];
}

function g1CompanyComparisonContext(workspace = state) {
  const project = workspace?.project || {};
  const records = project.gate0ScopedValuesV194 || [];
  const values = field => records.filter(row => row.scope === "project" && row.field === field && !row.archived_at);
  const text = field => values(field).map(row => String(row.value || "").trim()).filter(Boolean).join("\n");
  const page = g1CompanyComparisonHome(workspace), fields = page.row?.contextFields || {};
  const offers = values("company_offer");
  const ctas = offers.flatMap(row => [...Object.values(guruV194OfferParts(row).ctaV2)]);
  const marketing = workspace.gates?.find(gate => gate.id === "gate-0")?.cards?.find(card => card.id === "card-7")?.megaMarketing || {};
  const channels = (marketing.channels || []).filter(row => !["not_required", "not_needed"].includes(row.status))
    .map(row => row.name || row.element || row.channel || "").filter(Boolean).join("\n");
  return { scope: "company", product: { scope: "company", name: project.name || "Наша компания" },
    geography: project.geography || "", channels,
    snapshot: { page, landing: megaPlatformUrl("fixed", "home", workspace) || "",
      segment: text("segments"), positioning: text("positioning"), offer: text("company_offer"),
      cta: [...new Set([...ctas, fields.heroCta, fields.finalCta].filter(Boolean))].join("\n"),
      cardSummary: fields.heroSubtitle || fields.heroOffer || project.niche || "", campaigns: [] } };
}

function g1CompanyComparisonSource(field) {
  const kinds = { segments: "gate0-company-segmentation", positioning: "gate0-company-positioning",
    offers: "gate0-company-offer", cta: "gate0-company-offer" };
  return field === "landing" ? { gateId: "gate-0", cardId: "card-7" }
    : { gateId: "gate-0", kind: kinds[field] || "gate0-company-keyword-foundation" };
}

function g1CompanyComparisonEntry(write = false, model = state?.projectComparison) {
  // Exclude products from the projection: no cloning large product photos and
  // no incidental product initialization while viewing the company table.
  const stored = model || {};
  let entry;
  if (write) entry = state.projectComparison ||= { competitors: [], criteria: [], summary: {}, productsById: {} };
  else {
    const { productsById, ...company } = stored;
    entry = structuredClone(company);
  }
  entry.competitors ||= []; entry.criteria ||= [];
  entry.archivedCompetitorsV540 ||= [];
  entry.selectedKeywordKeysByJtbdV550 ||= {};
  entry.selectedKeywordKeysByJtbdV550.company ||= [];
  entry.keywordRelevanceByPhraseV549 ||= {};
  const mapping = { positioning: "positioning", strengths: "strengths", weaknesses: "weaknesses" };
  entry.competitors.forEach((competitor, index) => {
    competitor.id ||= `company-competitor-${index}`;
    if (competitor.domain == null || !competitor.companyComparisonAdapted && !competitor.domain)
      competitor.domain = competitor.url || competitor.siteDomainV538 || "";
    competitor.foundPhraseKeysV539 ||= [];
    competitor.bergenV543 ||= {};
    if (competitor.companyComparisonAdapted) return;
    for (const criterion of entry.criteria) {
      const field = mapping[criterion.coreKey];
      const value = projectComparisonCell(criterion, competitor.id).text;
      if (field && value && !String(competitor.bergenV543[field] || "").trim()) competitor.bergenV543[field] = value;
    }
    competitor.companyComparisonAdapted = true;
  });
  return entry;
}

const g1CompanyComparisonContexts = new WeakMap();
function g1CompanyComparisonFind(target) {
  const section = target.closest("[data-g1bp-company]");
  if (!section) return {};
  let context = g1CompanyComparisonContexts.get(section);
  if (!context || context.workspace !== state || context.entry !== state.projectComparison) {
    context = { workspace: state, entry: g1CompanyComparisonEntry(true),
      product: { scope: "company" }, jtbds: g1CompanyComparisonGroups() };
    g1CompanyComparisonContexts.set(section, context);
  }
  const id = target.dataset.g1bpCompetitorV543 || target.dataset.g1bpNameV543 || target.dataset.g1bpDomainV543 ||
    target.dataset.g1bpDeleteV543 || target.dataset.g1bpFoundKeywordV550;
  return { section, ...context, competitor: context.entry.competitors.find(row => row.id === id) };
}

projectComparisonStatus = function (model = state?.projectComparison) {
  const entry = g1CompanyComparisonEntry(false, model), groups = g1CompanyComparisonGroups();
  const result = g1BergenStatusV543(entry, null, groups);
  if (result.total && result.status !== "ready") for (const competitor of entry.competitors) {
    if (!g1BergenAnalyzedCompetitorV543(competitor, groups)) continue;
    if (!String(competitor.bergenV543?.advertisements || "").trim()) guruReadinessValue("", {
      selector: `[data-g1bp-company] [data-g1bp-ad-part-v572="title"][data-g1bp-competitor-v543="${CSS.escape(competitor.id)}"]`,
      label: `${competitor.name || "Конкурент"}: заголовок в выдаче`,
    });
  }
  return result;
};

function g1CompanyComparisonSearchCardHtml(competitor) {
  const id = escapeAttr(competitor.id);
  const ad = g1BergenSearchAdV570(competitor.bergenV543?.advertisements);
  return `<div class="g1bp-serp-card-v569"><div class="g1bp-serp-copy-v569">
    ${g1BergenSearchEditableTextV573(ad.title, "title", "Заголовок результата поиска", "Заголовок в выдаче", 'data-g1bp-ad-part-v572="title"', id)}
    ${g1BergenSearchEditableTextV573(ad.description, "description", "Описание из поисковой выдачи", "Описание в выдаче", 'data-g1bp-ad-part-v572="description"', id)}
  </div></div>`;
}

function g1CompanyComparisonFieldHtml(competitor, key, label) {
  return `<div class="g1-company-compare-field"><span>${label}</span>${g1BergenFieldV543(competitor, key)}</div>`;
}

function g1CompanyComparisonCompetitorColumnHtml(competitor, index, group) {
  const id = escapeAttr(competitor.id);
  const domain = projectComparisonProductDomainV538(competitor.domain || competitor.siteDomainV538 || "");
  const kind = g1CompanyCompetitorKind(competitor, group);
  return `<section class="g1-company-compare-column" data-g1bp-company-column="${id}">
    <header data-g1bp-head-v543="${id}">
      <div class="g1bp-head-actions-v543"><strong>${escapeHtml(g1BergenCompetitorTitleV580(competitor, index, [group]))}</strong><button type="button" data-g1bp-delete-v543="${id}" aria-label="Удалить конкурента ${index + 1}">Удалить</button></div>
      ${domain ? `<div class="g1-company-compare-domain"><a href="https://${escapeAttr(domain)}" target="_blank" rel="noopener noreferrer">${escapeHtml(domain)}</a>
        <button type="button" data-g1bp-company-copy-link aria-label="Копировать ссылку на сайт" title="Копировать ссылку">
          <svg class="g1-company-compare-copy-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2"></rect><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"></path></svg>
          <svg class="g1-company-compare-copy-success" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"></path></svg>
        </button><span data-g1bp-company-copy-status role="status" aria-live="polite"></span></div>` : ""}
      <small>Тип: <b>${escapeHtml(g1BergenTypeLabelV543(competitor, [group]))}</b></small>
    </header>
    <div class="g1-company-compare-section"><h4>Как выглядит в поиске</h4><div class="g1bp-serp-v569" data-g1bp-serp-v569="${id}"><small>Предпросмотр по введённым данным · фактический вид в поиске может отличаться</small><div data-g1bp-serp-card-v569>${g1CompanyComparisonSearchCardHtml(competitor)}</div></div></div>
    ${g1CompanyComparisonFieldHtml(competitor, "positioning", "Позиционирование")}
    ${g1CompanyComparisonFieldHtml(competitor, "strengths", "Сильные стороны")}
    ${g1CompanyComparisonFieldHtml(competitor, "weaknesses", "Слабые стороны")}
    ${kind === "close" || kind === "far" ? `${g1CompanyComparisonFieldHtml(competitor, "takeaway", "Что нам взять")}${g1CompanyComparisonFieldHtml(competitor, "differentiate", "Чем отличаться")}` : ""}
  </section>`;
}

const G1_COMPANY_COMPARISON_PAGE_SIZE = 3;
const g1CompanyComparisonPages = new WeakMap();
const g1CompanyComparisonFilters = new WeakMap();
const G1_COMPANY_COMPARISON_FILTERS = [
  ["close", "Близкие конкуренты"],
  ["far", "Дальние конкуренты"],
  ["neighbor", "Соседи по выдаче"],
];
function g1CompanyComparisonFiltered(entry, group) {
  const counts = { close: 0, far: 0, neighbor: 0 };
  const all = entry.competitors.map((competitor, index) => {
    const kind = g1CompanyCompetitorKind(competitor, group);
    if (kind in counts) counts[kind]++;
    return { competitor, index, kind };
  });
  let filter = g1CompanyComparisonFilters.get(state) || "";
  if (filter && !counts[filter]) {
    filter = "";
    g1CompanyComparisonFilters.delete(state);
  }
  return { all, rows: filter ? all.filter(row => row.kind === filter) : all,
    counts, filter, total: all.length };
}
function g1CompanyComparisonPage(entry, group) {
  const filtered = g1CompanyComparisonFiltered(entry, group);
  const count = filtered.rows.length;
  const lastPage = Math.max(0, Math.ceil(count / G1_COMPANY_COMPARISON_PAGE_SIZE) - 1);
  const page = Math.min(Math.max(0, g1CompanyComparisonPages.get(state) || 0), lastPage);
  g1CompanyComparisonPages.set(state, page);
  const start = page * G1_COMPANY_COMPARISON_PAGE_SIZE;
  return { ...filtered, page, count, start,
    end: Math.min(start + G1_COMPANY_COMPARISON_PAGE_SIZE, count), lastPage };
}
function g1CompanyComparisonFiltersHtml(entry, group) {
  const { filter, counts, total } = g1CompanyComparisonFiltered(entry, group);
  return `<div class="g1-company-compare-filters" data-g1bp-company-compare-filters role="group" aria-label="Тип конкурента в сравнении">
    <button type="button" data-g1bp-company-compare-filter="" aria-pressed="${!filter}">Все · ${total}</button>
    ${G1_COMPANY_COMPARISON_FILTERS.map(([kind, label]) => `<button type="button" data-g1bp-company-compare-filter="${kind}" aria-pressed="${filter === kind}" ${counts[kind] ? "" : "hidden"}>${label} · ${counts[kind]}</button>`).join("")}
  </div>`;
}
function g1CompanyComparisonPagerOptions(count, page = 0) {
  const options = [];
  for (let start = 0; start < count; start += G1_COMPANY_COMPARISON_PAGE_SIZE) {
    const end = Math.min(start + G1_COMPANY_COMPARISON_PAGE_SIZE, count);
    const index = start / G1_COMPANY_COMPARISON_PAGE_SIZE;
    options.push(`<option value="${index}" ${index === page ? "selected" : ""}>${start + 1}–${end}</option>`);
  }
  return options.join("");
}
function g1CompanyComparisonPagerHtml(entry, group) {
  const { page, count, start, end, lastPage } = g1CompanyComparisonPage(entry, group);
  return `<nav class="g1-company-compare-pager" data-g1bp-company-compare-pager aria-label="Навигация по конкурентам" ${count <= G1_COMPANY_COMPARISON_PAGE_SIZE ? "hidden" : ""}>
    <span data-g1bp-company-page-label>Конкуренты ${start + 1}–${end} из ${count}</span>
    <button type="button" data-g1bp-company-page-prev aria-label="Предыдущие конкуренты" ${page === 0 ? "disabled" : ""}>‹</button>
    <select data-g1bp-company-page-select data-count="${count}" aria-label="Выбрать группу конкурентов">${g1CompanyComparisonPagerOptions(count, page)}</select>
    <button type="button" data-g1bp-company-page-next aria-label="Следующие конкуренты" ${page === lastPage ? "disabled" : ""}>›</button>
  </nav>`;
}
function g1CompanyComparisonRefreshPage(section, entry, group) {
  const grid = section?.querySelector("[data-g1bp-company-compare]");
  if (!grid) return false;
  const oldCount = Number(section.querySelector("[data-g1bp-company-page-select]")?.dataset.count || 0);
  grid.outerHTML = g1CompanyComparisonSimpleHtml(entry, g1CompanyComparisonContext(), group);
  const { filter, counts, total } = g1CompanyComparisonFiltered(entry, group);
  section.querySelectorAll("[data-g1bp-company-compare-filter]").forEach(button => {
    const kind = button.dataset.g1bpCompanyCompareFilter;
    const count = kind ? counts[kind] : total;
    button.textContent = `${kind ? G1_COMPANY_COMPARISON_FILTERS.find(([key]) => key === kind)[1] : "Все"} · ${count}`;
    button.hidden = !!kind && !count;
    button.setAttribute("aria-pressed", String(filter === kind));
  });
  const pager = section.querySelector("[data-g1bp-company-compare-pager]");
  if (pager) {
    const { page, count, start, end, lastPage } = g1CompanyComparisonPage(entry, group);
    pager.hidden = count <= G1_COMPANY_COMPARISON_PAGE_SIZE;
    pager.querySelector("[data-g1bp-company-page-label]").textContent = `Конкуренты ${start + 1}–${end} из ${count}`;
    pager.querySelector("[data-g1bp-company-page-prev]").disabled = page === 0;
    pager.querySelector("[data-g1bp-company-page-next]").disabled = page === lastPage;
    const select = pager.querySelector("[data-g1bp-company-page-select]");
    if (oldCount !== count) select.innerHTML = g1CompanyComparisonPagerOptions(count);
    select.dataset.count = count;
    select.value = String(page);
  }
  return true;
}
function g1CompanyComparisonSimpleHtml(entry, ctx, group) {
  const { rows, start, end } = g1CompanyComparisonPage(entry, group);
  const positioning = String(ctx.snapshot.positioning || "").trim();
  return `<div class="g1-company-compare-grid" data-g1bp-company-compare style="--company-compare-columns:${end - start + 1}">
    <section class="g1-company-compare-column g1-company-compare-own">
      <header><span class="project-comparison-own-label">Наша компания (авто)</span><strong>${escapeHtml(ctx.product.name)}</strong><small>Данные компании из Gate 0 и главной страницы Gate 1</small></header>
      <div class="g1-company-compare-section"><h4>Как выглядит в поиске</h4>${g1CompanyComparisonSearchHtml(ctx)}</div>
      <div class="g1-company-compare-section g1-company-compare-yandex"><div data-g1bp-company-yandex>${g1BergenJtbdSearchV548(ctx, group, 0, entry, { companyComparison: true })}</div></div>
      <div class="g1-company-compare-field"><span>Позиционирование</span>${positioning ? g1ComparisonOwnV540(positioning, g1CompanyComparisonSource("positioning")) : ""}</div>
    </section>
    ${rows.slice(start, end).map(({ competitor, index }) => g1CompanyComparisonCompetitorColumnHtml(competitor, index, group)).join("")}
  </div>`;
}

// The suggestion is view state. Ratings, phrase selection and competitor matches
// continue to use the existing company comparison fields.
const g1CompanySuggestedPhrase = new WeakMap();
const g1CompanySearchSessions = new WeakMap();
const g1CompanyMatchesExpanded = new WeakMap();
function g1CompanyMatchesAreExpanded() {
  return g1CompanyMatchesExpanded.get(state) !== false;
}
function g1CompanySearchRated(entry, key) {
  return G1_BERGEN_RELEVANCE_V549.some(([value]) => entry.keywordRelevanceByPhraseV549?.[key] === value);
}
function g1CompanySearchSession(entry, phrase) {
  let sessions = g1CompanySearchSessions.get(state);
  if (!sessions) { sessions = new Map(); g1CompanySearchSessions.set(state, sessions); }
  let session = sessions.get(phrase.key);
  if (!session) {
    session = { finished: Array.isArray(entry.searchFinishedPhraseKeysV601)
      ? entry.searchFinishedPhraseKeysV601.includes(phrase.key) : g1CompanySearchRated(entry, phrase.key) };
    sessions.set(phrase.key, session);
  }
  session.foundIds = new Set((entry.competitors || []).filter(row =>
    (row.foundPhraseKeysV539 || []).includes(phrase.key)).map(row => row.id));
  return session;
}

function g1CompanySetFound(entry, competitor, phraseKey, checked) {
  const found = new Set(competitor.foundPhraseKeysV539 || []);
  if (found.has(phraseKey) === checked) return false;
  if (checked) found.add(phraseKey);
  else found.delete(phraseKey);
  competitor.foundPhraseKeysV539 = [...found];
  if (!Array.isArray(entry.searchFinishedPhraseKeysV601) && g1CompanySearchRated(entry, phraseKey))
    entry.searchFinishedPhraseKeysV601 = Object.keys(entry.keywordRelevanceByPhraseV549 || {})
      .filter(key => key !== phraseKey && g1CompanySearchRated(entry, key));
  else if (Array.isArray(entry.searchFinishedPhraseKeysV601))
    entry.searchFinishedPhraseKeysV601 = entry.searchFinishedPhraseKeysV601.filter(key => key !== phraseKey);
  g1CompanySearchSession(entry, { key: phraseKey }).finished = false;
  return true;
}
function g1CompanySearchSyncRelevance(section, phrase, enabled) {
  section.querySelectorAll('[data-g1bp-relevance-v549="company"]').forEach(control => {
    if (control.dataset.g1bpPhraseV549 === phrase.key) control.disabled = !enabled;
  });
}
const G1_COMPANY_COMPETITOR_TYPES = [
  ["close", "Близкий конкурент", "Похожий ассортимент и та же аудитория / задача клиента"],
  ["far", "Дальний конкурент", "Другой ассортимент, но та же задача клиента"],
  ["neighbor", "Сосед по выдаче", "Найден по запросу, но решает другую задачу"],
];

function g1CompanyCompetitorKind(competitor, group) {
  const classification = competitor.classificationV539 || {};
  if (classification.sameMarket === "no") return "neighbor";
  if (classification.sameMarket === "yes" && classification.sameBusiness === "yes") return "close";
  if (classification.sameMarket === "yes" && classification.sameBusiness === "no") return "far";
  return { direct: "close", substitute: "far", unrelated: "neighbor" }[
    g1BergenTypeV543(competitor, [group])
  ] || "";
}

function g1CompanyCompetitorClassify(competitor, kind) {
  const values = { close: ["yes", "yes"], far: ["yes", "no"], neighbor: ["no", "no"] }[kind];
  if (!values) return false;
  competitor.classificationV539 ||= {};
  competitor.classificationV539.sameMarket = values[0];
  competitor.classificationV539.sameBusiness = values[1];
  competitor.bergenV543 ||= {};
  competitor.bergenV543.similarity = values[1];
  competitor.typeV539 = { close: "direct", far: "substitute", neighbor: "unrelated" }[kind];
  return true;
}

function g1CompanySearchMatchCounts(entry, group, phraseKey) {
  const counts = { total: 0, close: 0, far: 0, neighbor: 0, unclassified: 0 };
  for (const competitor of entry.competitors || []) {
    if (!(competitor.foundPhraseKeysV539 || []).includes(phraseKey)) continue;
    counts.total++;
    const kind = g1CompanyCompetitorKind(competitor, group);
    counts[kind || "unclassified"]++;
  }
  return counts;
}

function g1CompanySearchMatchCountsHtml(entry, group, phrase) {
  const counts = g1CompanySearchMatchCounts(entry, group, phrase.key);
  return `<div class="g1-company-search-match-counts" role="status" data-company-search-match-counts>
    <span>Найдено по запросу: <strong>${counts.total}</strong></span>
    <span>Близкий конкурент <strong>${counts.close}</strong></span>
    <span>Дальний конкурент <strong>${counts.far}</strong></span>
    <span>Сосед по выдаче <strong>${counts.neighbor}</strong></span>
    ${counts.unclassified ? `<span>Без типа <strong>${counts.unclassified}</strong></span>` : ""}
  </div>`;
}

function g1CompanyCompetitorMatchesHtml(entry, group, phrase) {
  const session = g1CompanySearchSession(entry, phrase);
  const expanded = g1CompanyMatchesAreExpanded();
  return `<div class="g1-company-matches">
    <button type="button" class="g1-company-matches-toggle" data-company-matches-toggle aria-controls="company-matches-list" aria-expanded="${expanded}">Конкуренты в сравнении</button>
    <div id="company-matches-list" class="g1-company-matches-list" data-company-matches-list${expanded ? "" : " hidden"}>
    ${entry.competitors?.length ? entry.competitors.map((competitor, index) => {
    const found = new Set(competitor.foundPhraseKeysV539 || []);
    const foundCount = group.phrases.filter(row => row.key === phrase.key
      ? session.foundIds.has(competitor.id) : found.has(row.key)).length;
    const kind = g1CompanyCompetitorKind(competitor, group);
    const title = g1BergenCompetitorTitleV580(competitor, index, [group]);
    const searchTitle = g1BergenSearchAdV570(competitor.bergenV543?.advertisements).title;
    return `<div class="g1-company-match">
      <label><input type="checkbox" data-company-found-draft="${escapeAttr(competitor.id)}" value="${escapeAttr(phrase.key)}"${session.foundIds.has(competitor.id) ? " checked" : ""}>
        <span><b data-company-competitor-name="${escapeAttr(competitor.id)}">${escapeHtml(title)}</b><small data-company-competitor-domain="${escapeAttr(competitor.id)}">${escapeHtml(competitor.siteDomainV538 || projectComparisonProductDomainV538(competitor.domain) || "Домен не указан")}</small></span>
        <small>Найден по запросу</small></label>
      <select data-company-competitor-type="${escapeAttr(competitor.id)}" aria-label="Тип конкурента ${escapeAttr(competitor.name || competitor.siteDomainV538 || "")}">
        <option value=""${!kind ? " selected" : ""}>Не классифицирован</option>
        ${G1_COMPANY_COMPETITOR_TYPES.map(([key, title]) => `<option value="${key}"${kind === key ? " selected" : ""}>${title}</option>`).join("")}</select>
      <button type="button" class="g1-company-match-remove" data-g1bp-delete-v543="${escapeAttr(competitor.id)}" aria-label="Удалить ${escapeAttr(title)} из сравнения">Удалить</button>
      <button type="button" class="g1-company-match-disclosure" data-company-competitor-disclosure="${escapeAttr(competitor.id)}" aria-controls="company-competitor-panel-${escapeAttr(competitor.id)}" aria-expanded="false">Данные и запросы · <span data-company-competitor-count="${escapeAttr(competitor.id)}">${foundCount}</span></button>
      <div class="g1-company-match-panel" id="company-competitor-panel-${escapeAttr(competitor.id)}" data-company-competitor-panel="${escapeAttr(competitor.id)}" hidden>
        <div class="g1-company-competitor-fields">
          <label>Домен<input value="${escapeAttr(competitor.domain || competitor.siteDomainV538 || "")}" inputmode="url" placeholder="example.ru" data-g1bp-domain-v543="${escapeAttr(competitor.id)}"><small aria-live="polite"></small></label>
          <label>Заголовок в выдаче<input value="${escapeAttr(searchTitle)}" placeholder="Заголовок результата поиска" data-g1bp-ad-part-v572="title" data-g1bp-competitor-v543="${escapeAttr(competitor.id)}"></label>
          <label>Название<input value="${escapeAttr(competitor.name || "")}" placeholder="Название конкурента" data-g1bp-name-v543="${escapeAttr(competitor.id)}"></label>
        </div>
        <div class="g1-company-match-queries"><strong>По каким запросам найден · <span data-company-competitor-query-count="${escapeAttr(competitor.id)}">${foundCount} из ${group.phrases.length}</span></strong>
          <ul>${group.phrases.map(row => `<li><label><input type="checkbox" ${row.key === phrase.key ? `data-company-found-draft="${escapeAttr(competitor.id)}"` : `data-g1bp-found-keyword-v550="${escapeAttr(competitor.id)}" data-g1bp-keyword-jtbd-v550="company"`} value="${escapeAttr(row.key)}"${(row.key === phrase.key ? session.foundIds.has(competitor.id) : found.has(row.key)) ? " checked" : ""}><span>${escapeHtml(row.value)}</span></label></li>`).join("")}</ul>
        </div></div>
    </div>`;
  }).join("") : "<small>Найденных конкурентов пока нет.</small>"}</div></div>`;
}

function g1CompanyKeywordMapHtml(entry, group) {
  return g1CompanyQueryDisclosuresHtml(entry, group);
}

function g1CompanyKeywordMapRefresh(section, entry, group) {
  g1CompanyQueryDisclosuresRefresh(section, entry, group);
}

function g1CompanyCompetitorFormHtml() {
  return `<form class="g1-company-competitor-form" data-company-competitor-form hidden>
    <div class="g1-company-competitor-fields">
      <label>Домен<input name="domain" inputmode="url" required placeholder="example.ru"><small data-company-competitor-domain-note aria-live="polite"></small></label>
      <label data-company-competitor-new-only>Заголовок в выдаче<input name="title" placeholder="Заголовок результата поиска"></label>
      <label data-company-competitor-new-only>Название<input name="name" autocomplete="organization" placeholder="Название конкурента"></label>
    </div>
    <fieldset data-company-competitor-new-only><legend>Тип конкурента</legend><div class="g1-company-competitor-types">
      ${G1_COMPANY_COMPETITOR_TYPES.map(([key, title, hint]) => `<label><input type="radio" name="type" value="${key}"><span><b>${title}</b><small>${hint}</small></span></label>`).join("")}
    </div></fieldset>
    <small class="g1-company-competitor-error" role="alert" data-company-competitor-error></small>
    <div class="g1-company-search-guide-actions"><button type="submit" class="small-btn" data-company-competitor-submit>Добавить конкурента</button><button type="button" class="small-btn" data-company-competitor-cancel>Отмена</button></div>
  </form>`;
}

function g1CompanyCompetitorFormSyncDomain(form, entry) {
  const rawDomain = form.elements.domain.value.trim();
  const domain = projectComparisonProductDomainV538(rawDomain);
  const existing = domain && entry?.competitors?.find(row =>
    projectComparisonProductDomainV538(row.domain || row.siteDomainV538) === domain);
  const phraseKey = g1CompanySuggestedPhrase.get(state);
  const phrase = existing && (phraseKey ? { key: phraseKey }
    : g1CompanyComparisonSuggestedPhrase(entry, g1CompanyComparisonGroups()[0]));
  const selected = existing && phrase && g1CompanySearchSession(entry, phrase).foundIds.has(existing.id);
  const action = form.querySelector("[data-company-competitor-submit]");
  form.classList.toggle("is-existing", !!existing);
  action.textContent = !existing ? "Добавить конкурента" : selected ? "Уже отмечен" : "Отметить для запроса";
  action.disabled = !!selected;
  form.querySelector("[data-company-competitor-domain-note]").textContent = !domain && /^(?:https?:\/\/)?\d+\.?$/i.test(rawDomain)
    ? "Число без доменной зоны не является адресом сайта. Укажите домен, например example.ru."
    : !existing ? "" : selected
      ? `${existing.name || domain} уже отмечен для этого запроса.`
      : `${existing.name || domain} уже в сравнении. Отметка сохранится сразу.`;
}
function g1CompanyComparisonSuggestedPhrase(entry, group) {
  const ratings = entry.keywordRelevanceByPhraseV549 || {};
  const isUnrated = phrase => !G1_BERGEN_RELEVANCE_V549.some(([key]) => ratings[phrase.key] === key);
  const phrases = [...group.phrases].sort((a, b) =>
    Number(isUnrated(b)) - Number(isUnrated(a)) ||
    (b.frequency ?? -1) - (a.frequency ?? -1) || a.value.localeCompare(b.value, "ru"));
  const key = g1CompanySuggestedPhrase.get(state);
  const phrase = phrases.find(row => row.key === key) || phrases[0] || null;
  if (phrase && phrase.key !== key) g1CompanySuggestedPhrase.set(state, phrase.key);
  return phrase;
}

function g1CompanyQueryNavigatorModel(entry, group, current) {
  const finished = Array.isArray(entry.searchFinishedPhraseKeysV601)
    ? new Set(entry.searchFinishedPhraseKeysV601) : null;
  const queries = group.phrases.map((phrase, index) => ({
    phrase, index: index + 1,
    processed: g1CompanySearchRated(entry, phrase.key) && (!finished || finished.has(phrase.key)),
    counts: g1CompanySearchMatchCounts(entry, group, phrase.key),
  }));
  return { queries, processed: queries.filter(row => row.processed).length,
    currentIndex: queries.findIndex(row => row.phrase.key === current.key) + 1 };
}

function g1CompanyQueryNavigatorHtml(entry, group, current) {
  const model = g1CompanyQueryNavigatorModel(entry, group, current);
  const total = model.queries.length;
  return `<div class="g1-company-query-nav" data-company-query-nav>
    <button type="button" class="g1-company-query-nav-toggle" data-company-query-nav-toggle
      aria-expanded="false" aria-controls="company-query-navigation-list" aria-label="Поисковые запросы. Обработано ${model.processed} из ${total}. Текущий запрос ${model.currentIndex} из ${total}. Выбрать запрос">
      <span class="g1-company-query-nav-summary">Обработано <strong data-company-query-nav-count>${model.processed} из ${total}</strong></span>
      <span class="g1-company-query-nav-position">Запрос ${model.currentIndex} из ${total}</span>
      <span class="g1-company-query-nav-progress" aria-hidden="true"><span style="width:${total ? model.processed / total * 100 : 0}%"></span></span>
      <span class="g1-company-query-nav-chevron" aria-hidden="true"></span>
    </button>
    <div class="g1-company-query-nav-popover" id="company-query-navigation-list" data-company-query-nav-list hidden>
      <div class="g1-company-query-nav-list" role="group" aria-label="Выбрать поисковый запрос">
        ${model.queries.map(row => `<button type="button" class="g1-company-query-nav-option${row.phrase.key === current.key ? " is-current" : ""}"
          data-company-query-nav-option="${escapeAttr(row.phrase.key)}" aria-current="${row.phrase.key === current.key ? "true" : "false"}">
          <span class="g1-company-query-nav-option-head"><span class="g1-company-query-nav-number">${row.index}</span><strong>${escapeHtml(row.phrase.value)}</strong><small>${row.processed ? "Обработан" : "Не обработан"}</small></span>
          <span class="g1-company-query-nav-stats">
            <span>Найдено по запросу: <b>${row.counts.total}</b></span>
            <span>Близкие конкуренты: <b>${row.counts.close}</b></span>
            <span>Дальние конкуренты: <b>${row.counts.far}</b></span>
            <span>Соседи по выдаче: <b>${row.counts.neighbor}</b></span>
          </span>
        </button>`).join("")}
      </div>
    </div>
  </div>`;
}

function g1CompanyQueryNavigatorClose(nav, restoreFocus = false) {
  const list = nav?.querySelector("[data-company-query-nav-list]");
  const toggle = nav?.querySelector("[data-company-query-nav-toggle]");
  if (!list || list.hidden) return;
  list.hidden = true;
  toggle?.setAttribute("aria-expanded", "false");
  if (restoreFocus) toggle?.focus({ preventScroll: true });
}

function g1CompanyQueryNavigatorSync(section, entry, group) {
  const nav = section.querySelector("[data-company-query-nav]");
  const current = g1CompanyComparisonSuggestedPhrase(entry, group);
  if (!nav || !current) return;
  const wasOpen = !nav.querySelector("[data-company-query-nav-list]").hidden;
  const next = document.createElement("div");
  next.innerHTML = g1CompanyQueryNavigatorHtml(entry, group, current);
  nav.replaceWith(next.firstElementChild);
  if (wasOpen) {
    const refreshed = section.querySelector("[data-company-query-nav]");
    refreshed.querySelector("[data-company-query-nav-list]").hidden = false;
    refreshed.querySelector("[data-company-query-nav-toggle]").setAttribute("aria-expanded", "true");
  }
}

function g1CompanyComparisonSuggestionHtml(entry, group) {
  const phrase = g1CompanyComparisonSuggestedPhrase(entry, group);
  if (!phrase) return `<div class="g1-company-search-guide" data-company-search-guide>
    <strong>Поисковый запрос</strong><p>Добавьте ключевые слова компании в блоке «Спрос».</p>
    ${g1CompetitorSourceLinkV539({ gateId: "gate-0", kind: "gate0-company-keyword-foundation" })}
    ${g1CompanyKeywordMapHtml(entry, group)}</div>`;
  const session = g1CompanySearchSession(entry, phrase);
  const canContinue = session.finished && g1CompanySearchRated(entry, phrase.key);
  const selected = g1BergenSelectedKeywordKeysV550(entry, group).has(phrase.key);
  return `<div class="g1-company-search-guide" data-company-search-guide>
    <div class="g1-company-search-guide-head"><strong>Поисковый запрос</strong>${g1CompanyQueryNavigatorHtml(entry, group, phrase)}</div>
    <p>Скопируйте запрос, проверьте выдачу и отметьте найденные компании. Отметки сохраняются сразу. Затем завершите поиск и оцените релевантность.</p>
    <div class="g1-company-search-guide-phrase"><strong>${escapeHtml(phrase.value)}</strong><small>${phrase.frequency === null ? "Частотность не указана" : `${Number(phrase.frequency).toLocaleString("ru-RU")} запросов`}</small></div>
    <div class="g1-company-search-guide-actions">
      <button type="button" class="small-btn" data-company-competitor-toggle aria-expanded="false">+ Конкурент</button>
      <button type="button" class="small-btn" data-g1-competitor-copy-v539="${escapeAttr(phrase.value)}">Копировать</button>
      <button type="button" class="small-btn" data-company-search-finish${session.finished ? " disabled" : ""}>${session.finished ? "Поиск завершён" : "Завершить поиск по выбранному запросу"}</button>
      <button type="button" class="small-btn" data-company-search-next${canContinue && group.phrases.length > 1 ? "" : " disabled"} title="${canContinue ? "Перейти к следующему запросу" : "Сначала завершите поиск и оцените релевантность"}">Следующий поисковый запрос</button>
    </div>
    ${g1CompanyCompetitorFormHtml()}
    <div class="g1-company-search-guide-result">${session.finished ? `${g1BergenRelevanceFieldV549(entry, group, phrase)}
      <button type="button" class="small-btn" data-company-search-select data-company-search-key="${escapeAttr(phrase.key)}" aria-pressed="${selected}">${selected ? "Убрать из сравнения" : "Показать у конкурентов"}</button>` : `<small>После завершения поиска оцените релевантность запроса.</small>`}</div>
    ${session.finished ? g1CompanySearchMatchCountsHtml(entry, group, phrase) : ""}
    <small>${session.finished ? (canContinue ? "Релевантность оценена. Можно перейти к следующему запросу." : "Поиск завершён. Оцените релевантность, чтобы перейти дальше.") : "Отметки компаний уже сохранены. Завершите поиск, чтобы оценить релевантность."}</small>
    <small role="status" data-company-guide-notice></small>
    ${g1CompanyKeywordMapHtml(entry, group)}
    ${g1CompanyCompetitorMatchesHtml(entry, group, phrase)}
  </div>`;
}

function g1CompanyComparisonSuggestionRefresh(section, entry, group) {
  const guide = section?.querySelector("[data-company-search-guide]");
  if (!guide || !group) return;
  const oldForm = guide.querySelector("[data-company-competitor-form]");
  const focused = oldForm?.contains(document.activeElement) ? document.activeElement : null;
  const selection = focused && typeof focused.selectionStart === "number"
    ? [focused.selectionStart, focused.selectionEnd, focused.selectionDirection] : null;
  const formOpen = oldForm && !oldForm.hidden;
  const expanded = new Set([...guide.querySelectorAll('[data-company-competitor-disclosure][aria-expanded="true"]')]
    .map(node => node.dataset.companyCompetitorDisclosure));
  const disclosures = g1CompanyQueryDisclosuresState(guide);
  guide.outerHTML = g1CompanyComparisonSuggestionHtml(entry, group);
  const nextGuide = section.querySelector("[data-company-search-guide]");
  const replacementForm = nextGuide?.querySelector("[data-company-competitor-form]");
  if (oldForm && replacementForm) {
    replacementForm.replaceWith(oldForm);
    oldForm.hidden = !formOpen;
    nextGuide.querySelector("[data-company-competitor-toggle]")?.setAttribute("aria-expanded", String(formOpen));
    g1CompanyCompetitorFormSyncDomain(oldForm, state.projectComparison || entry);
  }
  g1CompanyQueryDisclosuresRestore(nextGuide, disclosures);
  nextGuide?.querySelectorAll("[data-company-competitor-disclosure]").forEach(node => {
    if (!expanded.has(node.dataset.companyCompetitorDisclosure)) return;
    node.setAttribute("aria-expanded", "true");
    const panel = nextGuide.querySelector(`[data-company-competitor-panel="${CSS.escape(node.dataset.companyCompetitorDisclosure)}"]`);
    if (panel) panel.hidden = false;
  });
  if (focused && focused.isConnected) {
    focused.focus({ preventScroll: true });
    if (selection) focused.setSelectionRange(...selection);
  }
}

function g1CompanyFoundKeywordChanged(section, entry, competitor, group, key) {
  g1CompanySearchSyncRelevance(section, { key }, false);
  g1CompanyComparisonSuggestionRefresh(section, entry, group);
}

function g1CompanyComparisonIncludePhrase(section, entry, group, key) {
  const selected = g1BergenSelectedKeywordKeysV550(entry, group);
  if (selected.has(key)) return;
  selected.add(key);
  entry.selectedKeywordKeysByJtbdV550.company = group.phrases
    .filter(phrase => selected.has(phrase.key)).map(phrase => phrase.key);
  const own = section.querySelector("[data-g1bp-company-yandex]");
  if (own) own.innerHTML = g1BergenJtbdSearchV548(g1CompanyComparisonContext(), group, 0, entry, { companyComparison: true });
}

document.addEventListener("submit", event => {
  const form = event.target.closest?.("[data-company-competitor-form]");
  if (!form) return;
  event.preventDefault();
  const section = form.closest("[data-g1bp-company]");
  const group = g1CompanyComparisonGroups()[0];
  const phrase = g1CompanyComparisonSuggestedPhrase(state.projectComparison || {}, group);
  const name = form.elements.name.value.trim();
  const rawDomain = form.elements.domain.value.trim();
  const domain = projectComparisonProductDomainV538(rawDomain);
  const title = form.elements.title.value.trim();
  const kind = form.querySelector('[name="type"]:checked')?.value || "";
  const error = form.querySelector("[data-company-competitor-error]");
  if (!phrase) return;
  if (!domain) { error.textContent = "Введите корректный домен или адрес сайта"; form.elements.domain.focus(); return; }
  const original = state.projectComparison?.competitors?.find(row =>
    projectComparisonProductDomainV538(row.domain || row.siteDomainV538) === domain);
  if (original) {
    const entry = state.projectComparison;
    const changed = g1CompanySetFound(entry, original, phrase.key, true);
    if (changed) {
      g1CompanySearchSyncRelevance(section, phrase, false);
      g1BergenRefreshStatusV543(section, entry, [group]);
    }
    form.reset(); form.hidden = true;
    g1CompanyComparisonSuggestionRefresh(section, entry, group);
    section.querySelector("[data-company-guide-notice]").textContent = !changed
      ? "Этот домен уже отмечен для текущего запроса. Повторно добавлять не нужно."
      : "Компания отмечена для текущего запроса и сохранена. Завершите поиск.";
    section.querySelector(`[data-company-found-draft="${CSS.escape(original.id)}"]`)?.focus({ preventScroll: true });
    if (changed) flashSaving({ skipDerivedRefresh: true });
    return;
  }
  if (!original && !name) { error.textContent = "Введите название конкурента"; form.elements.name.focus(); return; }
  if (!original && !title) { error.textContent = "Введите заголовок из выдачи"; form.elements.title.focus(); return; }
  if (!original && !kind) { error.textContent = "Выберите тип конкурента"; form.querySelector('[name="type"]')?.focus(); return; }

  const { entry } = g1CompanyComparisonFind(form);
  const competitor = { id: makeId("comparison-company-competitor"), name, domain: rawDomain,
    siteDomainV538: domain, classificationV539: { sameMarket: "", sameBusiness: "" },
    foundPhraseKeysV539: [], stepsV539: {}, bergenV543: { advertisements: title },
    bergenMigratedV543: true, companyComparisonAdapted: true };
  entry.competitors.push(competitor);
  g1CompanySetFound(entry, competitor, phrase.key, true);
  g1CompanySearchSyncRelevance(section, phrase, false);
  if (kind) g1CompanyCompetitorClassify(competitor, kind);
  const appended = g1BergenAppendCompetitorV580(section, entry, competitor,
    g1CompanyComparisonContext(), [group]);
  if (!appended) g1BergenRefreshTableV580(section, entry, { scope: "company" }, [group]);
  g1BergenRefreshStatusV543(section, entry, [group]);
  form.reset(); form.hidden = true;
  g1CompanyComparisonSuggestionRefresh(section, entry, group);
  section.querySelector("[data-company-guide-notice]").textContent =
    "Конкурент добавлен и связан с запросом. Завершите поиск.";
  flashSaving();
});

document.addEventListener("click", event => {
  const target = event.target.closest?.("[data-company-query-nav-toggle], [data-company-query-nav-option], [data-company-search-finish], [data-company-search-next], [data-company-search-select], [data-company-search-show-key], [data-company-keyword-map-toggle], [data-company-matches-toggle], [data-company-competitor-toggle], [data-company-competitor-cancel], [data-company-competitor-disclosure], [data-g1bp-select-keyword-v550]");
  const section = target?.closest("[data-g1bp-company]");
  if (!section) return;
  if (target.hasAttribute("data-company-query-nav-toggle")) {
    const nav = target.closest("[data-company-query-nav]");
    const list = nav.querySelector("[data-company-query-nav-list]");
    list.hidden = !list.hidden;
    target.setAttribute("aria-expanded", String(!list.hidden));
    if (!list.hidden) {
      const rect = target.getBoundingClientRect();
      const below = window.innerHeight - rect.bottom - 12, above = rect.top - 12;
      const openAbove = below < Math.min(320, window.innerHeight / 2) && above > below;
      nav.classList.toggle("is-above", openAbove);
      list.style.maxHeight = `${Math.max(120, Math.min(480, openAbove ? above : below))}px`;
      (list.querySelector('[aria-current="true"]') || list.querySelector("[data-company-query-nav-option]"))
        ?.focus({ preventScroll: true });
    }
    return;
  }
  if (target.hasAttribute("data-company-query-nav-option")) {
    const entry = state.projectComparison || {}, group = g1CompanyComparisonGroups()[0];
    const key = target.dataset.companyQueryNavOption;
    if (!group.phrases.some(row => row.key === key)) return;
    if (g1CompanyComparisonSuggestedPhrase(entry, group)?.key === key) {
      g1CompanyQueryNavigatorClose(target.closest("[data-company-query-nav]"), true);
      return;
    }
    const form = section.querySelector("[data-company-competitor-form]");
    if (form && !form.hidden && [...form.querySelectorAll("input:not([type=radio])")].some(input => input.value.trim())) {
      g1CompanyQueryNavigatorClose(target.closest("[data-company-query-nav]"));
      section.querySelector("[data-company-guide-notice]").textContent =
        "Сначала добавьте конкурента или отмените ввод.";
      form.elements.domain.focus();
      return;
    }
    g1CompanySuggestedPhrase.set(state, key);
    g1CompanyComparisonSuggestionRefresh(section, entry, group);
    section.querySelector("[data-company-query-nav-toggle]")?.focus({ preventScroll: true });
    return;
  }
  if (target.hasAttribute("data-company-keyword-map-toggle")) {
    const list = section.querySelector("[data-company-keyword-map-list]");
    list.hidden = !list.hidden;
    target.setAttribute("aria-expanded", String(!list.hidden));
    g1CompanyDisclosuresScreen().companies = !list.hidden;
    return;
  }
  if (target.hasAttribute("data-company-matches-toggle")) {
    const list = section.querySelector("[data-company-matches-list]");
    list.hidden = !list.hidden;
    target.setAttribute("aria-expanded", String(!list.hidden));
    g1CompanyMatchesExpanded.set(state, !list.hidden);
    return;
  }
  if (target.hasAttribute("data-company-search-show-key")) {
    const entry = state.projectComparison || {}, group = g1CompanyComparisonGroups()[0];
    if (!group.phrases.some(row => row.key === target.dataset.companySearchShowKey)) return;
    const current = g1CompanyComparisonSuggestedPhrase(entry, group);
    if (current && target.dataset.companySearchShowKey !== current.key &&
        !(g1CompanySearchSession(entry, current).finished && g1CompanySearchRated(entry, current.key))) {
      section.querySelector("[data-company-guide-notice]").textContent =
        "Сначала завершите текущий поиск и оцените релевантность.";
      return;
    }
    g1CompanySuggestedPhrase.set(state, target.dataset.companySearchShowKey);
    g1CompanyComparisonSuggestionRefresh(section, entry, group);
    return;
  }
  if (target.hasAttribute("data-company-competitor-disclosure")) {
    const panel = section.querySelector(`[data-company-competitor-panel="${CSS.escape(target.dataset.companyCompetitorDisclosure)}"]`);
    if (!panel) return;
    panel.hidden = !panel.hidden;
    target.setAttribute("aria-expanded", String(!panel.hidden));
    return;
  }
  if (target.hasAttribute("data-company-competitor-toggle")) {
    const form = section.querySelector("[data-company-competitor-form]");
    form.hidden = !form.hidden;
    target.setAttribute("aria-expanded", String(!form.hidden));
    if (!form.hidden) form.elements.domain.focus();
    return;
  }
  if (target.hasAttribute("data-company-competitor-cancel")) {
    const form = target.closest("[data-company-competitor-form]");
    form.reset(); form.hidden = true;
    g1CompanyCompetitorFormSyncDomain(form, state.projectComparison || {});
    section.querySelector("[data-company-competitor-toggle]")?.setAttribute("aria-expanded", "false");
    section.querySelector("[data-company-competitor-toggle]")?.focus();
    return;
  }
  const entry = state.projectComparison || {}, group = g1CompanyComparisonGroups()[0];
  if (target.hasAttribute("data-company-search-finish")) {
    const phrase = g1CompanyComparisonSuggestedPhrase(entry, group);
    if (!phrase) return;
    const form = section.querySelector("[data-company-competitor-form]");
    if (form && !form.hidden && [...form.querySelectorAll("input:not([type=radio])")].some(input => input.value.trim())) {
      section.querySelector("[data-company-guide-notice]").textContent =
        "Сначала добавьте конкурента или отмените ввод.";
      form.elements.domain.focus();
      return;
    }
    const session = g1CompanySearchSession(entry, phrase);
    if (session.finished) return;
    let changed = false;
    if (session.foundIds.size && !g1BergenSelectedKeywordKeysV550(entry, group).has(phrase.key)) {
      g1CompanyComparisonIncludePhrase(section, entry, group, phrase.key);
      changed = true;
    }
    if (!Array.isArray(entry.searchFinishedPhraseKeysV601) ||
        !entry.searchFinishedPhraseKeysV601.includes(phrase.key)) {
      entry.searchFinishedPhraseKeysV601 = [...(Array.isArray(entry.searchFinishedPhraseKeysV601)
        ? entry.searchFinishedPhraseKeysV601 : []), phrase.key];
      changed = true;
    }
    session.finished = true;
    g1CompanySearchSyncRelevance(section, phrase, true);
    g1CompanyComparisonSuggestionRefresh(section, entry, group);
    section.querySelector("[data-company-guide-notice]").textContent =
      "Поиск завершён. Оцените релевантность.";
    section.querySelector("[data-company-search-guide] [data-g1bp-relevance-v549]")?.focus({ preventScroll: true });
    if (changed) flashSaving({ skipDerivedRefresh: true });
    return;
  }
  if (target.hasAttribute("data-company-search-next")) {
    const current = g1CompanyComparisonSuggestedPhrase(entry, group);
    if (!current || !(g1CompanySearchSession(entry, current).finished && g1CompanySearchRated(entry, current.key))) {
      section.querySelector("[data-company-guide-notice]").textContent =
        "Сначала завершите поиск и оцените релевантность.";
      return;
    }
    const ratings = entry.keywordRelevanceByPhraseV549 || {};
    const remaining = group.phrases.filter(phrase =>
      !G1_BERGEN_RELEVANCE_V549.some(([key]) => ratings[phrase.key] === key));
    const choices = [...(remaining.length ? remaining : group.phrases)].sort((a, b) =>
      (b.frequency ?? -1) - (a.frequency ?? -1) || a.value.localeCompare(b.value, "ru"));
    const index = choices.findIndex(phrase => phrase.key === current?.key);
    const next = choices[(index + 1) % choices.length];
    if (next) g1CompanySuggestedPhrase.set(state, next.key);
    g1CompanyComparisonSuggestionRefresh(section, entry, group);
    return;
  }
  if (target.hasAttribute("data-company-search-select")) {
    const key = target.dataset.companySearchKey;
    const button = [...section.querySelectorAll(".g1bp-phrase-list-v548 [data-g1bp-select-keyword-v550]")]
      .find(node => node.dataset.g1bpKeywordKeyV550 === key);
    button?.click();
    return;
  }
  g1CompanyComparisonSuggestionRefresh(section, entry, group);
});

document.addEventListener("click", event => {
  document.querySelectorAll("[data-company-query-nav]").forEach(nav => {
    if (!nav.contains(event.target)) g1CompanyQueryNavigatorClose(nav);
  });
});

document.addEventListener("keydown", event => {
  const nav = event.target.closest?.("[data-company-query-nav]");
  if (!nav || nav.querySelector("[data-company-query-nav-list]")?.hidden) return;
  if (event.key === "Escape") {
    event.preventDefault();
    g1CompanyQueryNavigatorClose(nav, true);
    return;
  }
  if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
  const options = [...nav.querySelectorAll("[data-company-query-nav-option]")];
  if (!options.length) return;
  event.preventDefault();
  const index = options.indexOf(document.activeElement);
  const next = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1
    : event.key === "ArrowDown" ? (index + 1) % options.length : (index + options.length - 1) % options.length;
  options[next].focus({ preventScroll: true });
  options[next].scrollIntoView({ block: "nearest" });
});

document.addEventListener("focusin", event => {
  document.querySelectorAll("[data-company-query-nav]").forEach(nav => {
    if (!nav.contains(event.target)) g1CompanyQueryNavigatorClose(nav);
  });
});

document.addEventListener("change", event => {
  const target = event.target;
  const section = target.closest?.("[data-g1bp-company]");
  if (!section || target.dataset.g1bpRelevanceV549 !== "company") return;
  const entry = state.projectComparison || {}, group = g1CompanyComparisonGroups()[0];
  const phrase = g1CompanyComparisonSuggestedPhrase(entry, group);
  if (!phrase || target.dataset.g1bpPhraseV549 !== phrase.key) return;
  const rated = G1_BERGEN_RELEVANCE_V549.some(([value]) => value === target.value);
  const next = section.querySelector("[data-company-search-next]");
  if (next) {
    next.disabled = !rated || !g1CompanySearchSession(entry, phrase).finished || group.phrases.length < 2;
    next.title = next.disabled ? "Сначала завершите поиск и оцените релевантность" : "Перейти к следующему запросу";
  }
  const notice = section.querySelector("[data-company-guide-notice]");
  if (notice) notice.textContent = rated
    ? "Релевантность оценена. Можно перейти к следующему запросу."
    : "Оцените релевантность, чтобы перейти дальше.";
}, true);

document.addEventListener("change", event => {
  const target = event.target;
  const section = target.closest?.("[data-g1bp-company]");
  if (!section) return;
  if (target.dataset.companyFoundDraft !== undefined) {
    const entry = state.projectComparison || {}, group = g1CompanyComparisonGroups()[0];
    const phrase = g1CompanyComparisonSuggestedPhrase(entry, group);
    const competitor = entry.competitors?.find(row => row.id === target.dataset.companyFoundDraft);
    if (!phrase || target.value !== phrase.key || !competitor) return;
    if (!g1CompanySetFound(entry, competitor, phrase.key, target.checked)) return;
    g1CompanySearchSyncRelevance(section, phrase, false);
    g1BergenRefreshStatusV543(section, entry, [group]);
    g1CompanyFoundKeywordChanged(section, entry, competitor, group, phrase.key);
    section.querySelector(`[data-company-found-draft="${CSS.escape(competitor.id)}"]`)?.focus({ preventScroll: true });
    flashSaving({ skipDerivedRefresh: true });
    return;
  }
  if (target.dataset.companyCompetitorType !== undefined) {
    const { entry } = g1CompanyComparisonFind(target);
    const competitor = entry.competitors.find(row => row.id === target.dataset.companyCompetitorType);
    if (!competitor || !G1_COMPANY_COMPETITOR_TYPES.some(([key]) => key === target.value)) return;
    const group = g1CompanyComparisonGroups()[0], before = g1BergenTypeV543(competitor, [group]);
    if (g1CompanyCompetitorKind(competitor, group) === target.value) return;
    g1CompanyCompetitorClassify(competitor, target.value);
    if (!g1BergenRefreshClassificationV581(section, entry, competitor, { scope: "company" }, [group],
      before !== g1BergenTypeV543(competitor, [group])))
      g1BergenRefreshTableV580(section, entry, { scope: "company" }, [group]);
    g1BergenRefreshStatusV543(section, entry, [group]);
    g1CompanyComparisonSuggestionRefresh(section, entry, group);
    flashSaving();
    return;
  }
  if (target.dataset.g1bpDomainV543 !== undefined) {
    if (target.value.trim() && !projectComparisonProductDomainV538(target.value)) return;
    const { entry, competitor } = g1CompanyComparisonFind(target);
    if (!competitor) return;
    section.querySelectorAll(`[data-g1bp-domain-v543="${CSS.escape(competitor.id)}"]`).forEach(field => {
      if (field !== target) field.value = competitor.domain;
    });
    const domain = section.querySelector(`[data-company-competitor-domain="${CSS.escape(competitor.id)}"]`);
    if (domain) domain.textContent = competitor.siteDomainV538 || "Домен не указан";
    const header = section.querySelector(`[data-g1bp-head-v543="${CSS.escape(competitor.id)}"]`);
    const headerDomain = header?.querySelector("a");
    const normalizedDomain = projectComparisonProductDomainV538(competitor.domain || competitor.siteDomainV538 || "");
    if (normalizedDomain && headerDomain) {
      headerDomain.href = `https://${normalizedDomain}`;
      headerDomain.textContent = normalizedDomain;
    } else if (normalizedDomain && header) {
      header.querySelector("small")?.insertAdjacentHTML("beforebegin",
        `<a href="https://${escapeAttr(normalizedDomain)}" target="_blank" rel="noopener noreferrer">${escapeHtml(normalizedDomain)}</a>`);
    } else headerDomain?.remove();
    if (!competitor.name) {
      const label = g1BergenCompetitorTitleV580(competitor, entry.competitors.indexOf(competitor), [{ company: true }]);
      const name = section.querySelector(`[data-company-competitor-name="${CSS.escape(competitor.id)}"]`);
      const heading = section.querySelector(`[data-g1bp-head-v543="${CSS.escape(competitor.id)}"] .g1bp-head-actions-v543 strong`);
      if (name) name.textContent = label;
      if (heading) heading.textContent = label;
    }
    g1CompanyKeywordMapRefresh(section, entry, g1CompanyComparisonGroups()[0]);
    return;
  }
  if (target.dataset.g1bpNameV543 !== undefined) {
    g1CompanyKeywordMapRefresh(section, state.projectComparison || {}, g1CompanyComparisonGroups()[0]);
    return;
  }
  if (target.dataset.g1bpChoiceV543 === "similarity") {
    g1CompanyComparisonSuggestionRefresh(section, state.projectComparison || {}, g1CompanyComparisonGroups()[0]);
    return;
  }
  if (target.dataset.g1bpRelevanceV549 !== "company") return;
  const group = g1CompanyComparisonGroups()[0];
  const entry = state.projectComparison || {};
  g1CompanyQueryNavigatorSync(section, entry, group);
  const phrase = g1CompanyComparisonSuggestedPhrase(entry, group);
  const next = section.querySelector("[data-company-search-next]");
  if (next && phrase) {
    const canContinue = g1CompanySearchSession(entry, phrase).finished && g1CompanySearchRated(entry, phrase.key);
    next.disabled = !canContinue || group.phrases.length < 2;
    next.title = canContinue ? "Перейти к следующему запросу" : "Сначала завершите поиск и оцените релевантность";
  }
});

document.addEventListener("input", event => {
  const target = event.target;
  const section = target.closest?.("[data-g1bp-company]");
  const form = target.closest?.("[data-company-competitor-form]");
  if (section && form) {
    form.querySelector("[data-company-competitor-error]").textContent = "";
    if (target.name === "domain")
      g1CompanyCompetitorFormSyncDomain(form, state.projectComparison || {});
    return;
  }
  if (!section || !(target.dataset.g1bpNameV543 || target.dataset.g1bpAdPartV572 === "title")) return;
  const { competitor } = g1CompanyComparisonFind(target);
  if (!competitor) return;
  const selector = target.dataset.g1bpNameV543
    ? `[data-g1bp-name-v543="${CSS.escape(competitor.id)}"]`
    : `[data-g1bp-ad-part-v572="title"][data-g1bp-competitor-v543="${CSS.escape(competitor.id)}"]`;
  section.querySelectorAll(selector).forEach(field => {
    if (field === target) return;
    field.value = target.value;
    g1BergenSyncSearchGrowV573(field);
  });
});

projectComparisonHtml = function () {
  const entry = g1CompanyComparisonEntry(), ctx = g1CompanyComparisonContext(), groups = g1CompanyComparisonGroups();
  const status = g1BergenStatusV543(entry, ctx, groups);
  return `<section class="project-comparison g1-section g1bp-v543 ${entry.open ? "is-open" : ""}" data-g1bp-company>
    <button type="button" class="project-comparison-heading" data-project-comparison-toggle aria-expanded="${!!entry.open}">
      <span><b>Конкуренты (Сравнение проектов)</b><small>Компания · ${escapeHtml(ctx.product.name)}</small><small data-g1-seo-explanation-v297="project-comparison">Выберите ключевые слова, отметьте найденных по ним конкурентов и сходство бизнеса. Сравните поисковую выдачу, посадочные страницы и предложения прямых конкурентов.</small></span>
      <span class="project-comparison-heading-meta">${status.total ? g1CompetitorStatusPillV539(status.status).replace('class="status-pill', 'data-status-block="project-comparison" class="status-pill') : ""}<span data-g1bp-status-meta-v543${status.total ? ' data-status-block-meta="project-comparison"' : ""}>${status.total ? `${status.filled}/${status.total} ответов близких и дальних конкурентов · ` : ""}${entry.competitors.length} колонок</span></span>
      <i>${entry.open ? "Свернуть ↑" : "Развернуть ↓"}</i></button>
    <div class="project-comparison-body" ${entry.open ? "" : "hidden"}>
      <div class="g1bp-toolbar-v543"><h3 class="g1bp-title-v543">Сравнение компании</h3></div>
      ${g1CompanyComparisonSuggestionHtml(entry, groups[0])}
      <h3 class="g1-company-compare-title">Сравнение</h3>
      <div class="g1-company-compare-controls">
        ${g1CompanyComparisonFiltersHtml(entry, groups[0])}
        ${g1CompanyComparisonPagerHtml(entry, groups[0])}
      </div>
      ${g1CompanyComparisonSimpleHtml(entry, ctx, groups[0])}
    </div></section>`;
};

const g1CompanyComparisonCopyFeedback = new WeakMap();
document.addEventListener("click", async event => {
  const button = event.target.closest?.("[data-g1bp-company-copy-link]");
  if (!button?.closest("[data-g1bp-company]")) return;
  const row = button.closest(".g1-company-compare-domain");
  const link = row?.querySelector("a[href]");
  if (!link) return;
  const token = (g1CompanyComparisonCopyFeedback.get(button) || 0) + 1;
  g1CompanyComparisonCopyFeedback.set(button, token);
  const status = row.querySelector("[data-g1bp-company-copy-status]");
  try {
    await g4sbV141CopyText(link.href);
    if (!button.isConnected) return;
    button.dataset.g1bpCompanyCopyState = "copied";
    button.title = "Скопировано";
    button.setAttribute("aria-label", "Ссылка скопирована");
    status.textContent = "Скопировано";
  } catch (_error) {
    if (!button.isConnected) return;
    button.dataset.g1bpCompanyCopyState = "error";
    button.title = "Не удалось скопировать";
    button.setAttribute("aria-label", button.title);
    status.textContent = button.title;
  }
  setTimeout(() => {
    if (!button.isConnected || g1CompanyComparisonCopyFeedback.get(button) !== token) return;
    delete button.dataset.g1bpCompanyCopyState;
    button.title = "Копировать ссылку";
    button.setAttribute("aria-label", "Копировать ссылку на сайт");
    status.textContent = "";
  }, 2200);
});

document.addEventListener("click", event => {
  const filterButton = event.target.closest?.("[data-g1bp-company-compare-filter]");
  if (filterButton) {
    const section = filterButton.closest("[data-g1bp-company]");
    if (!section) return;
    const entry = g1CompanyComparisonEntry(), group = g1CompanyComparisonGroups()[0];
    const kind = filterButton.dataset.g1bpCompanyCompareFilter;
    if (kind && !g1CompanyComparisonFiltered(entry, group).counts[kind]) return;
    g1CompanyComparisonFilters.set(state, kind);
    g1CompanyComparisonPages.set(state, 0);
    g1CompanyComparisonRefreshPage(section, entry, group);
    return;
  }
  const button = event.target.closest?.("[data-g1bp-company-page-prev], [data-g1bp-company-page-next]");
  if (!button) return;
  const section = button.closest("[data-g1bp-company]");
  if (!section) return;
  const entry = g1CompanyComparisonEntry();
  const group = g1CompanyComparisonGroups()[0];
  const { page, lastPage } = g1CompanyComparisonPage(entry, group);
  g1CompanyComparisonPages.set(state, Math.min(lastPage, Math.max(0,
    page + (button.hasAttribute("data-g1bp-company-page-next") ? 1 : -1))));
  g1CompanyComparisonRefreshPage(section, entry, group);
});
document.addEventListener("change", event => {
  const select = event.target.closest?.("[data-g1bp-company-page-select]");
  if (!select) return;
  const section = select.closest("[data-g1bp-company]");
  if (!section) return;
  const entry = g1CompanyComparisonEntry();
  const group = g1CompanyComparisonGroups()[0];
  const { lastPage } = g1CompanyComparisonPage(entry, group);
  g1CompanyComparisonPages.set(state, Math.min(lastPage, Math.max(0, Number(select.value) || 0)));
  g1CompanyComparisonRefreshPage(section, entry, group);
});

function g1CompanyComparisonRefresh() {
  const section = document.querySelector("[data-g1bp-company]");
  if (!section) return;
  g1CompanyComparisonContexts.delete(section);
  const entry = g1CompanyComparisonEntry(), groups = g1CompanyComparisonGroups();
  g1CompanyComparisonRefreshPage(section, entry, groups[0]);
  g1BergenRefreshStatusV543(section, entry, groups);
  g1CompanyComparisonSuggestionRefresh(section, entry, groups[0]);
}

function g1CompanyComparisonSearchHtml(ctx) {
  const row = ctx.snapshot.page.row || {}, fields = row.contextFields || {};
  return `<div class="g1bp-serp-v569"><small>Главная страница компании из Gate 1 · фактический вид в поиске может отличаться</small>
    ${g1BergenSearchCardV569({ title: fields.page_settings_title_v513 || row.title || row.h1,
      description: fields.page_settings_description_v513 || row.description, url: ctx.snapshot.landing }, { company: true })}</div>`;
}

const g1CompanyDemandRefresh = gate1CompanyBrandDemandRefreshV345;
gate1CompanyBrandDemandRefreshV345 = function (...args) {
  const result = g1CompanyDemandRefresh(...args);
  g1CompanyComparisonRefresh();
  return result;
};
const g1CompanyDemandTotalsRefresh = gate1CompanyBrandDemandTotalsRefreshV345;
gate1CompanyBrandDemandTotalsRefreshV345 = function (...args) {
  const result = g1CompanyDemandTotalsRefresh(...args);
  const section = document.querySelector("[data-g1bp-company]");
  if (section) {
    g1CompanyComparisonContexts.delete(section);
    const entry = g1CompanyComparisonEntry(), groups = g1CompanyComparisonGroups();
    const cell = section.querySelector("[data-g1bp-company-yandex]");
    if (cell) cell.innerHTML = g1BergenJtbdSearchV548(g1CompanyComparisonContext(), groups[0], 0, entry, { companyComparison: true });
    g1CompanyComparisonSuggestionRefresh(section, entry, groups[0]);
  }
  return result;
};

const g1CompanyComparisonExport = guruExportGate1CompanyComparisonV359;
guruExportGate1CompanyComparisonV359 = function (workspace) {
  const legacy = g1CompanyComparisonExport(workspace);
  const entry = g1CompanyComparisonEntry(false, workspace?.projectComparison || {});
  const groups = g1CompanyComparisonGroups(workspace);
  return { ...legacy, currentComparison: { scope: "company", keywords: groups[0].phrases,
    competitors: entry.competitors, selectedKeywords: entry.selectedKeywordKeysByJtbdV550.company,
    relevance: entry.keywordRelevanceByPhraseV549, readiness: g1BergenStatusV543(entry, null, groups) } };
};

