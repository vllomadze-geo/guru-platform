/* Two read-only views over the saved company ↔ query links. */
const g1CompanyQueryRelevanceScreens = new WeakMap();
const g1CompanyQueryRelevanceSources = new WeakMap();
const g1CompanyDisclosures = new WeakMap();

function g1CompanyDisclosuresScreen() {
  let screen = g1CompanyDisclosures.get(state);
  if (!screen) {
    screen = { companies: true, queries: true };
    g1CompanyDisclosures.set(state, screen);
  }
  return screen;
}
const G1_COMPANY_QUERY_RELEVANCE_LABELS = [
  ["high", "Высокая"], ["medium", "Средняя"], ["low", "Низкая"], ["unrated", "Не оценена"],
];

function g1CompanyQueryRelevanceScreen() {
  let screen = g1CompanyQueryRelevanceScreens.get(state);
  if (!screen) {
    screen = { search: "", relevance: "", sort: "", direction: "asc", expandedKey: "" };
    g1CompanyQueryRelevanceScreens.set(state, screen);
  }
  return screen;
}

function g1CompanyQueryRelevanceData(entry, group) {
  const labels = new Map(G1_COMPANY_QUERY_RELEVANCE_LABELS);
  const finished = Array.isArray(entry.searchFinishedPhraseKeysV601)
    ? new Set(entry.searchFinishedPhraseKeysV601) : null;
  const companies = (entry.competitors || []).map((competitor, index) => {
    const kind = g1CompanyCompetitorKind(competitor, group);
    return {
      id: competitor.id || `company-${index}`,
      name: g1BergenCompetitorTitleV580(competitor, index, [group]),
      kind,
      kindLabel: G1_COMPANY_COMPETITOR_TYPES.find(([key]) => key === kind)?.[1] || "Без типа",
      foundKeys: Array.isArray(competitor.foundPhraseKeysV539) ? [...competitor.foundPhraseKeysV539] : [],
    };
  });
  const phrases = (group.phrases || []).map((phrase, index) => {
    const saved = entry.keywordRelevanceByPhraseV549?.[phrase.key];
    const relevance = labels.has(saved) && saved !== "unrated" ? saved : "unrated";
    const found = companies.filter(company => company.foundKeys.includes(phrase.key));
    const counts = { close: 0, far: 0, neighbor: 0, unknown: 0 };
    found.forEach(company => { counts[company.kind || "unknown"]++; });
    return {
      key: phrase.key, value: phrase.value, index, relevance,
      relevanceLabel: labels.get(relevance), companies: found, counts,
      searched: finished ? finished.has(phrase.key) || found.length > 0
        : relevance !== "unrated" || found.length > 0,
    };
  });
  const relevanceOrder = new Map(G1_COMPANY_QUERY_RELEVANCE_LABELS.map(([key], index) => [key, index]));
  phrases.sort((left, right) =>
    relevanceOrder.get(left.relevance) - relevanceOrder.get(right.relevance) ||
    right.companies.length - left.companies.length || left.index - right.index);
  return { phrases, companies };
}

// The only row derivation: search, relevance selection and sorting, with no writes.
function g1CompanyQueryRelevanceDerive(data, screen) {
  const needle = String(screen.search || "").trim().toLocaleLowerCase("ru");
  const counts = G1_COMPANY_QUERY_RELEVANCE_LABELS.map(([key, label]) => ({
    key, label, count: data.phrases.filter(phrase => phrase.relevance === key).length,
  })).filter(item => item.count);
  const rows = data.phrases.filter(phrase =>
    (!screen.relevance || phrase.relevance === screen.relevance) &&
    (!needle || [phrase.value, ...phrase.companies.map(company => company.name)]
      .some(value => String(value).toLocaleLowerCase("ru").includes(needle))));
  if (screen.sort) {
    const sign = screen.direction === "desc" ? -1 : 1;
    rows.sort((a, b) => {
      const comparison = screen.sort === "found"
        ? a.companies.length - b.companies.length
        : screen.sort === "relevance"
          ? a.relevanceLabel.localeCompare(b.relevanceLabel, "ru")
          : a.value.localeCompare(b.value, "ru");
      return comparison * sign || a.index - b.index;
    });
  }
  return { rows, counts, total: data.phrases.length };
}

// Kept as a historical renderer; the companies disclosure now uses the first filter.
function g1CompanyQueryLegacyCompaniesHtml(entry, group) {
  return `<div class="g1-company-keyword-map" data-company-keyword-map>
    <button type="button" class="g1-company-keyword-map-toggle" data-company-keyword-map-toggle aria-controls="company-keyword-map-list" aria-expanded="false">Компании · ${(entry.competitors || []).length}</button>
    <div id="company-keyword-map-list" class="g1-company-keyword-map-list" data-company-keyword-map-list hidden>
      ${group.phrases.map(phrase => {
        const names = (entry.competitors || []).flatMap((competitor, index) =>
          (competitor.foundPhraseKeysV539 || []).includes(phrase.key)
            ? [g1BergenCompetitorTitleV580(competitor, index, [group])] : []);
        return `<div class="g1-company-keyword-map-row"><button type="button" data-company-search-show-key="${escapeAttr(phrase.key)}">${escapeHtml(phrase.value)}</button><small>${names.length ? escapeHtml(names.join(", ")) : "Конкуренты не отмечены"}</small></div>`;
      }).join("")}
    </div>
  </div>`;
}

function g1CompanyQueryCompaniesHtml(entry, group) {
  const expanded = g1CompanyDisclosuresScreen().companies;
  return `<div class="g1-company-keyword-map" data-company-keyword-map>
    <button type="button" class="g1-company-keyword-map-toggle" data-company-keyword-map-toggle aria-controls="company-keyword-map-list" aria-expanded="${expanded}"><span>Компании <span class="g1-company-disclosure-count">· ${(entry.competitors || []).length}</span></span></button>
    <div id="company-keyword-map-list" class="g1-company-keyword-map-list" data-company-keyword-map-list${expanded ? "" : " hidden"}>
      ${g1CompanyKeywordFilterHtml(entry, group)}
    </div>
  </div>`;
}

function g1CompanyQueryRelevanceRowsHtml(derived, screen) {
  if (!derived.rows.length) return `<p class="g1-company-query-empty">Ничего не найдено. Сбросьте фильтр.</p>`;
  return derived.rows.map(phrase => {
    const expanded = screen.expandedKey === phrase.key;
    const count = phrase.companies.length;
    const parts = [
      `близкие ${phrase.counts.close}`, `дальние ${phrase.counts.far}`,
      `соседи ${phrase.counts.neighbor}`,
    ];
    if (phrase.counts.unknown) parts.push(`без типа ${phrase.counts.unknown}`);
    return `<div class="g1-company-query-result">
      <button type="button" class="g1-company-query-row" data-company-query-row="${escapeAttr(phrase.key)}" aria-expanded="${expanded}">
        <span class="g1-company-query-name">${escapeHtml(phrase.value)}</span>
        <span>${escapeHtml(phrase.relevanceLabel)}</span>
        <span>${phrase.searched ? `Найдено компаний: <strong>${count}</strong><small>${parts.join(" · ")}</small>` : "поиск не проведён"}</span>
      </button>
      ${expanded ? `<div class="g1-company-query-companies">
        ${count ? phrase.companies.map(company => `<span>${escapeHtml(company.name)} <small>· ${escapeHtml(company.kindLabel)}</small></span>`).join("") : `<small>Компании не найдены</small>`}
        <button type="button" data-company-search-show-key="${escapeAttr(phrase.key)}">Перейти к запросу</button>
      </div>` : ""}
    </div>`;
  }).join("");
}

function g1CompanyQueryRelevanceHtml(data) {
  const screen = g1CompanyQueryRelevanceScreen();
  const expanded = g1CompanyDisclosuresScreen().queries;
  const derived = g1CompanyQueryRelevanceDerive(data, screen);
  const active = !!(screen.search.trim() || screen.relevance);
  return `<div class="g1-company-keyword-map" data-company-query-relevance data-company-query-source="${escapeAttr(JSON.stringify(data))}">
    <button type="button" class="g1-company-keyword-map-toggle" data-company-query-relevance-toggle aria-controls="company-query-relevance-list" aria-expanded="${expanded}"><span>Запросы и релевантность <span class="g1-company-disclosure-count">· ${data.phrases.length}</span></span></button>
    <div id="company-query-relevance-list" class="g1-company-keyword-map-list" data-company-query-relevance-list${expanded ? "" : " hidden"}>
      <div class="g1-company-query-controls">
        <input type="search" data-company-query-search placeholder="Запрос или компания" aria-label="Запрос или компания" value="${escapeAttr(screen.search)}">
        <div class="g1-company-query-segments" role="group" aria-label="Релевантность">
          <button type="button" data-company-query-relevance-value="" aria-pressed="${!screen.relevance}">Все ${derived.total}</button>
          ${derived.counts.map(item => `<button type="button" data-company-query-relevance-value="${item.key}" aria-pressed="${screen.relevance === item.key}">${item.label} ${item.count}</button>`).join("")}
        </div>
      </div>
      <div class="g1-company-query-head">
        ${[["query", "Запрос"], ["relevance", "Релевантность"], ["found", "Найдено компаний"]].map(([key, label]) =>
          `<button type="button" data-company-query-sort="${key}" aria-pressed="${screen.sort === key}">${label}<span>${screen.sort === key ? screen.direction === "asc" ? " ↑" : " ↓" : ""}</span></button>`).join("")}
      </div>
      <div data-company-query-rows>${g1CompanyQueryRelevanceRowsHtml(derived, screen)}</div>
      <div class="g1-company-query-footer"><span data-company-query-shown>Показано ${derived.rows.length} из ${derived.total}</span>
        <span data-company-query-active${active ? "" : " hidden"}>Фильтр активен</span>
        <button type="button" data-company-query-reset${active ? "" : " hidden"}>Сбросить</button>
      </div>
    </div>
  </div>`;
}

function g1CompanyQueryDisclosuresHtml(entry, group) {
  const data = g1CompanyQueryRelevanceData(entry, group);
  return g1CompanyQueryCompaniesHtml(entry, group) + g1CompanyQueryRelevanceHtml(data);
}

function g1CompanyQueryDisclosuresState(root) {
  return {
    companies: root?.querySelector("[data-company-keyword-map-toggle]")?.getAttribute("aria-expanded") === "true",
    queries: root?.querySelector("[data-company-query-relevance-toggle]")?.getAttribute("aria-expanded") === "true",
  };
}

function g1CompanyQueryDisclosuresRestore(root, expanded) {
  Object.assign(g1CompanyDisclosuresScreen(), expanded);
  for (const [key, toggleSelector, listSelector] of [
    ["companies", "[data-company-keyword-map-toggle]", "[data-company-keyword-map-list]"],
    ["queries", "[data-company-query-relevance-toggle]", "[data-company-query-relevance-list]"],
  ]) {
    const toggle = root?.querySelector(toggleSelector), list = root?.querySelector(listSelector);
    if (toggle && list) { toggle.setAttribute("aria-expanded", String(expanded[key])); list.hidden = !expanded[key]; }
  }
}

function g1CompanyQueryDisclosuresRefresh(section, entry, group) {
  const previous = section?.querySelector("[data-company-keyword-map]");
  if (!previous) return;
  const expanded = g1CompanyQueryDisclosuresState(section);
  section.querySelector("[data-company-query-relevance]")?.remove();
  previous.outerHTML = g1CompanyQueryDisclosuresHtml(entry, group);
  g1CompanyQueryDisclosuresRestore(section, expanded);
}

function g1CompanyQueryRelevanceRefresh(container) {
  const screen = g1CompanyQueryRelevanceScreen();
  let data = g1CompanyQueryRelevanceSources.get(container);
  if (!data) {
    data = JSON.parse(container.dataset.companyQuerySource);
    g1CompanyQueryRelevanceSources.set(container, data);
  }
  const derived = g1CompanyQueryRelevanceDerive(data, screen);
  container.querySelector("[data-company-query-rows]").innerHTML = g1CompanyQueryRelevanceRowsHtml(derived, screen);
  container.querySelector("[data-company-query-shown]").textContent = `Показано ${derived.rows.length} из ${derived.total}`;
  const active = !!(screen.search.trim() || screen.relevance);
  container.querySelector("[data-company-query-active]").hidden = !active;
  container.querySelector("[data-company-query-reset]").hidden = !active;
  container.querySelectorAll("[data-company-query-relevance-value]").forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.companyQueryRelevanceValue === screen.relevance));
  });
  container.querySelectorAll("[data-company-query-sort]").forEach(button => {
    const selected = button.dataset.companyQuerySort === screen.sort;
    button.setAttribute("aria-pressed", String(selected));
    button.querySelector("span").textContent = selected ? screen.direction === "asc" ? " ↑" : " ↓" : "";
  });
}

document.addEventListener("input", event => {
  const input = event.target.closest?.("[data-company-query-search]");
  if (!input) return;
  event.stopPropagation();
  g1CompanyQueryRelevanceScreen().search = input.value;
  g1CompanyQueryRelevanceRefresh(input.closest("[data-company-query-relevance]"));
}, true);

document.addEventListener("change", event => {
  if (event.target.matches?.("[data-company-query-search]")) event.stopPropagation();
}, true);

document.addEventListener("click", event => {
  const control = event.target.closest?.("[data-company-query-relevance-toggle], [data-company-query-relevance-value], [data-company-query-sort], [data-company-query-row], [data-company-query-reset]");
  if (!control) return;
  const container = control.closest("[data-company-query-relevance]");
  if (!container) return;
  if (control.hasAttribute("data-company-query-relevance-toggle")) {
    const list = container.querySelector("[data-company-query-relevance-list]");
    list.hidden = !list.hidden;
    control.setAttribute("aria-expanded", String(!list.hidden));
    g1CompanyDisclosuresScreen().queries = !list.hidden;
    return;
  }
  const screen = g1CompanyQueryRelevanceScreen();
  if (control.hasAttribute("data-company-query-relevance-value"))
    screen.relevance = control.dataset.companyQueryRelevanceValue;
  else if (control.hasAttribute("data-company-query-sort")) {
    const sort = control.dataset.companyQuerySort;
    screen.direction = screen.sort === sort && screen.direction === "asc" ? "desc" : "asc";
    screen.sort = sort;
  } else if (control.hasAttribute("data-company-query-row"))
    screen.expandedKey = screen.expandedKey === control.dataset.companyQueryRow ? "" : control.dataset.companyQueryRow;
  else {
    screen.search = "";
    screen.relevance = "";
    container.querySelector("[data-company-query-search]").value = "";
  }
  const restoreFocus = control.hasAttribute("data-company-query-row") && document.activeElement === control;
  g1CompanyQueryRelevanceRefresh(container);
  if (restoreFocus)
    [...container.querySelectorAll("[data-company-query-row]")]
      .find(row => row.dataset.companyQueryRow === screen.expandedKey)?.focus({ preventScroll: true });
});
