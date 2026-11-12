/* Read-only company query overview. All controls live in screen state. */
const g1CompanyKeywordFilterViews = new WeakMap();
const g1CompanyKeywordFilterSources = new WeakMap();

function g1CompanyKeywordFilterView() {
  let view = g1CompanyKeywordFilterViews.get(state);
  if (!view) {
    view = { search: "", type: "", sort: "found", direction: "desc", expandedId: "" };
    g1CompanyKeywordFilterViews.set(state, view);
  }
  return view;
}

function g1CompanyKeywordFilterData(entry, group) {
  return {
    phrases: group.phrases.map(({ key, value }) => ({ key, value })),
    competitors: (entry.competitors || []).map((competitor, index) => ({
      id: competitor.id || `index-${index}`,
      index,
      name: g1BergenCompetitorTitleV580(competitor, index, [group]),
      domain: competitor.siteDomainV538 || projectComparisonProductDomainV538(competitor.domain) || "Домен не указан",
      type: g1BergenTypeLabelV543(competitor, [group]),
      foundKeys: Array.isArray(competitor.foundPhraseKeysV539) ? competitor.foundPhraseKeysV539 : [],
    })),
  };
}

// A pure projection of the existing competitor ↔ query links.
function g1CompanyKeywordFilterDerive(data, view) {
  const query = String(view.search || "").trim().toLocaleLowerCase("ru");
  const phrases = data.phrases || [];
  const types = [...new Set(data.competitors.map(row => row.type))];
  const linked = new Set(data.competitors.flatMap(row => row.foundKeys));
  const unmatched = phrases.filter(phrase => !linked.has(phrase.key));
  const rows = data.competitors.map(row => {
    const found = new Set(row.foundKeys);
    const queries = phrases.filter(phrase => found.has(phrase.key));
    return { ...row, queries, count: queries.length };
  }).filter(row => (!view.type || row.type === view.type) && (!query ||
    [row.name, row.domain, ...row.queries.map(phrase => phrase.value)]
      .some(value => String(value).toLocaleLowerCase("ru").includes(query))));
  const direction = view.direction === "asc" ? 1 : -1;
  rows.sort((a, b) => {
    const compare = view.sort === "name"
      ? a.name.localeCompare(b.name, "ru")
      : a.count - b.count;
    return compare * direction || a.index - b.index;
  });
  return { rows, types, unmatched, total: data.competitors.length, queryCount: phrases.length };
}

function g1CompanyKeywordFilterUnmatchedHtml(derived) {
  return derived.unmatched.length ? `<details class="g1-company-filter-unmatched"><summary>Запросы без конкурентов · ${derived.unmatched.length}</summary>
    <div>${derived.unmatched.map(phrase => `<button type="button" data-company-search-show-key="${escapeAttr(phrase.key)}">${escapeHtml(phrase.value)}</button>`).join("")}</div>
  </details>` : "";
}

function g1CompanyKeywordFilterRowsHtml(derived, view) {
  if (!derived.rows.length) return `<p class="g1-company-filter-empty">Ничего не найдено. Сбросьте фильтр.</p>`;
  const showTop = view.sort === "found" && view.direction === "desc";
  return derived.rows.map((row, index) => {
    const expanded = view.expandedId === row.id;
    const portion = derived.queryCount ? Math.min(100, row.count / derived.queryCount * 100) : 0;
    return `<div class="g1-company-filter-result">
      <button type="button" class="g1-company-filter-row" data-company-filter-row="${escapeAttr(row.id)}" aria-expanded="${expanded}">
        <span class="g1-company-filter-identity"><strong>${escapeHtml(row.name)}</strong><small>${escapeHtml(row.domain)}</small></span>
        <span class="g1-company-filter-type">${escapeHtml(row.type)}</span>
        <span class="g1-company-filter-frequency"><span><strong>${row.count}</strong> <small>из ${derived.queryCount}</small>${showTop && index < 5 ? ` <small class="g1-company-filter-top">Топ-5</small>` : ""}</span><span class="g1-company-filter-track"><span style="width:${portion}%"></span></span></span>
      </button>
      ${expanded ? `<div class="g1-company-filter-queries">${row.queries.length
        ? row.queries.map(phrase => `<button type="button" data-company-search-show-key="${escapeAttr(phrase.key)}">${escapeHtml(phrase.value)}</button>`).join("")
        : `<small>Нет отмеченных запросов</small>`}</div>` : ""}
    </div>`;
  }).join("");
}

function g1CompanyKeywordFilterHtml(entry, group) {
  const view = g1CompanyKeywordFilterView();
  const data = g1CompanyKeywordFilterData(entry, group);
  const derived = g1CompanyKeywordFilterDerive(data, view);
  const typeOrder = G1_COMPANY_COMPETITOR_TYPES.map(([, label]) => label);
  const typeCounts = new Map();
  data.competitors.forEach(({ type }) => typeCounts.set(type, (typeCounts.get(type) || 0) + 1));
  const types = derived.types.slice().sort((left, right) => {
    const rank = type => {
      const index = typeOrder.indexOf(type);
      return index < 0 ? typeOrder.length : index;
    };
    return rank(left) - rank(right);
  });
  return `<div class="g1-company-filter" data-company-filter data-company-filter-source="${escapeAttr(JSON.stringify(data))}">
    <p class="g1-company-filter-hint">Сверху компании, которые чаще всего встречаются в ваших запросах, сначала близкие.</p>
    <div class="g1-company-filter-controls">
      <input type="search" data-company-filter-search placeholder="Конкурент или запрос" aria-label="Конкурент или запрос" value="${escapeAttr(view.search)}">
      <div class="g1-company-filter-types" role="group" aria-label="Тип конкурента">
        <button type="button" data-company-filter-type="" aria-pressed="${!view.type}">Все ${derived.total}</button>
        ${types.map(type => `<button type="button" data-company-filter-type="${escapeAttr(type)}" aria-pressed="${view.type === type}">${escapeHtml(type)} ${typeCounts.get(type)}</button>`).join("")}
      </div>
    </div>
    <div class="g1-company-filter-active" data-company-filter-active${view.search.trim() || view.type ? "" : " hidden"}>
      <strong>Фильтр активен</strong><button type="button" data-company-filter-reset>Сбросить</button>
    </div>
    <div class="g1-company-filter-head">
      <button type="button" data-company-filter-sort="name" aria-pressed="${view.sort === "name"}">Конкурент <span>${view.sort === "name" ? view.direction === "asc" ? "↑" : "↓" : ""}</span></button>
      <span>Тип</span>
      <button type="button" data-company-filter-sort="found" aria-pressed="${view.sort === "found"}">Найден в запросах <span>${view.sort === "found" ? view.direction === "asc" ? "↑" : "↓" : ""}</span></button>
    </div>
    <div data-company-filter-rows>${g1CompanyKeywordFilterRowsHtml(derived, view)}</div>
    <div data-company-filter-unmatched>${g1CompanyKeywordFilterUnmatchedHtml(derived)}</div>
  </div>`;
}

function g1CompanyKeywordFilterRefresh(container) {
  const view = g1CompanyKeywordFilterView();
  let data = g1CompanyKeywordFilterSources.get(container);
  if (!data) {
    data = JSON.parse(container.dataset.companyFilterSource);
    g1CompanyKeywordFilterSources.set(container, data);
  }
  const derived = g1CompanyKeywordFilterDerive(data, view);
  container.querySelector("[data-company-filter-rows]").innerHTML = g1CompanyKeywordFilterRowsHtml(derived, view);
  container.querySelector("[data-company-filter-active]").hidden = !(view.search.trim() || view.type);
  container.querySelectorAll("[data-company-filter-type]").forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.companyFilterType === view.type));
  });
  container.querySelectorAll("[data-company-filter-sort]").forEach(button => {
    const selected = button.dataset.companyFilterSort === view.sort;
    button.setAttribute("aria-pressed", String(selected));
    button.querySelector("span").textContent = selected ? view.direction === "asc" ? "↑" : "↓" : "";
  });
}

document.addEventListener("input", event => {
  const input = event.target.closest?.("[data-company-filter-search]");
  if (!input) return;
  event.stopPropagation();
  g1CompanyKeywordFilterView().search = input.value;
  g1CompanyKeywordFilterRefresh(input.closest("[data-company-filter]"));
}, true);

document.addEventListener("change", event => {
  if (event.target.matches?.("[data-company-filter-search]")) event.stopPropagation();
}, true);

document.addEventListener("click", event => {
  const control = event.target.closest?.("[data-company-filter-type], [data-company-filter-reset], [data-company-filter-sort], [data-company-filter-row]");
  if (!control) return;
  const view = g1CompanyKeywordFilterView();
  if (control.hasAttribute("data-company-filter-type")) view.type = control.dataset.companyFilterType;
  else if (control.hasAttribute("data-company-filter-reset")) {
    view.search = "";
    view.type = "";
  } else if (control.hasAttribute("data-company-filter-sort")) {
    const sort = control.dataset.companyFilterSort;
    view.direction = view.sort === sort ? view.direction === "asc" ? "desc" : "asc" : sort === "found" ? "desc" : "asc";
    view.sort = sort;
  } else {
    const id = control.dataset.companyFilterRow;
    view.expandedId = view.expandedId === id ? "" : id;
  }
  const restoreFocus = control.hasAttribute("data-company-filter-row") && document.activeElement === control;
  const container = control.closest("[data-company-filter]");
  if (control.hasAttribute("data-company-filter-reset")) container.querySelector("[data-company-filter-search]").value = "";
  g1CompanyKeywordFilterRefresh(container);
  if (restoreFocus) {
    container.querySelectorAll("[data-company-filter-row]").forEach(row => {
      if (row.dataset.companyFilterRow === view.expandedId) row.focus({ preventScroll: true });
    });
  }
});

/* Query overview is installed after the existing disclosure script. Its
   projection and controls stay entirely in screen state. */
function g1CompanyQueryOverviewDerive(data, screen) {
  const labels = [["high", "Высокая"], ["medium", "Средняя"], ["low", "Низкая"], ["unrated", "Не оценена"]];
  const phrases = data.phrases || [];
  const total = phrases.length;
  const outcome = { close: 0, other: 0, empty: 0 };
  const count = (phrase, kind) => Number(phrase.counts?.[kind]) || 0;
  for (const phrase of phrases) {
    if (count(phrase, "close") > 0) outcome.close++;
    else if (count(phrase, "far") > 0 || count(phrase, "neighbor") > 0) outcome.other++;
    else outcome.empty++;
  }
  const needle = String(screen.search || "").trim().toLocaleLowerCase("ru");
  const relevance = screen.relevance || "";
  const sort = ["close", "far", "neighbor"].includes(screen.sort) ? screen.sort : "";
  const direction = screen.direction === "asc" ? 1 : -1;
  const fallback = (left, right) =>
    count(right, "close") - count(left, "close") ||
    count(right, "far") - count(left, "far") ||
    count(right, "neighbor") - count(left, "neighbor") ||
    left.index - right.index;
  const filtered = phrases.filter(phrase =>
    (!relevance || phrase.relevance === relevance) &&
    (!needle || [phrase.value, ...(phrase.companies || []).map(company => company.name)]
      .some(value => String(value || "").toLocaleLowerCase("ru").includes(needle))));
  const counts = labels.map(([key, label]) => ({ key, label,
    count: phrases.filter(phrase => phrase.relevance === key).length })).filter(item => item.count);
  const groups = counts.map(item => {
    const rows = filtered.filter(phrase => phrase.relevance === item.key).sort((left, right) =>
      (sort ? (count(left, sort) - count(right, sort)) * direction : 0) || fallback(left, right));
    return { ...item, count: rows.length, rows };
  }).filter(group => group.count);
  return { groups, counts, outcome, total, shown: filtered.length,
    rows: groups.flatMap(group => group.rows) };
}

function g1CompanyQueryOverviewNumber(phrase, kind) {
  if (!phrase.searched) return "";
  const value = Number(phrase.counts?.[kind]) || 0;
  return value ? String(value) : "–";
}

function g1CompanyQueryOverviewRowsHtml(derived, screen) {
  if (!derived.shown) return `<p class="g1-company-query-empty">Ничего не найдено. Сбросьте фильтр.</p>`;
  return derived.groups.map(group => `<section class="g1-company-query-group" data-company-query-group="${group.key}">
    <h4>${group.label} <span>· ${group.count}</span></h4>
    ${group.rows.map(phrase => {
      const expanded = screen.expandedKey === phrase.key;
      return `<div class="g1-company-query-result">
        <button type="button" class="g1-company-query-row" data-company-query-row="${escapeAttr(phrase.key)}" aria-expanded="${expanded}">
          <span class="g1-company-query-name">${escapeHtml(phrase.value)}</span>
          <span class="g1-company-query-close">${g1CompanyQueryOverviewNumber(phrase, "close")}</span>
          <span>${g1CompanyQueryOverviewNumber(phrase, "far")}</span>
          <span>${g1CompanyQueryOverviewNumber(phrase, "neighbor")}</span>
        </button>
        ${expanded ? `<div class="g1-company-query-companies">
          ${phrase.companies.length ? phrase.companies.map(company => `<span>${escapeHtml(company.name)} <small>· ${escapeHtml(company.kindLabel)}</small></span>`).join("") : `<small>Компании не найдены</small>`}
          <button type="button" data-company-search-show-key="${escapeAttr(phrase.key)}">Перейти к запросу</button>
        </div>` : ""}
      </div>`;
    }).join("")}
  </section>`).join("");
}

function g1CompanyQueryOverviewActive(screen) {
  return !!(String(screen.search || "").trim() || screen.relevance ||
    ["close", "far", "neighbor"].includes(screen.sort));
}

function g1CompanyQueryOverviewHeadHtml(screen) {
  const sort = ["close", "far", "neighbor"].includes(screen.sort) ? screen.sort : "";
  return [["query", "Запрос"], ["close", "Близкие"], ["far", "Дальние"], ["neighbor", "Соседи"]]
    .map(([key, label]) => {
      const active = key === (sort || "close");
      const arrow = active ? ` ${sort && screen.direction === "asc" ? "↑" : "↓"}` : "";
      return `<button type="button" data-company-query-sort="${key}" aria-pressed="${active}">${label}<span>${arrow}</span></button>`;
    }).join("");
}

function g1CompanyQueryOverviewHtml(data) {
  const screen = g1CompanyQueryRelevanceScreen();
  const expanded = g1CompanyDisclosuresScreen().queries;
  const derived = g1CompanyQueryOverviewDerive(data, screen);
  const active = g1CompanyQueryOverviewActive(screen);
  return `<div class="g1-company-keyword-map" data-company-query-relevance data-company-query-source="${escapeAttr(JSON.stringify(data))}">
    <button type="button" class="g1-company-keyword-map-toggle" data-company-query-relevance-toggle aria-controls="company-query-relevance-list" aria-expanded="${expanded}"><span>Запросы и релевантность <span class="g1-company-disclosure-count">· ${derived.total}</span></span></button>
    <div id="company-query-relevance-list" class="g1-company-keyword-map-list" data-company-query-relevance-list${expanded ? "" : " hidden"}>
      <div class="g1-company-query-summary" data-company-query-summary>
        <strong>Итог</strong>
        <div class="g1-company-query-summary-numbers">
          <div><strong>${derived.outcome.close}</strong><small>С близкими конкурентами</small></div>
          <div><strong>${derived.outcome.other}</strong><small>Только дальние и соседи</small></div>
          <div><strong>${derived.outcome.empty}</strong><small>Без данных</small></div>
        </div>
        <p>Сверху запросы, где вы встречаете близких конкурентов. Ниже те, где только дальние и соседи по выдаче.</p>
      </div>
      <div class="g1-company-query-controls">
        <input type="search" data-company-query-search placeholder="Запрос или компания" aria-label="Запрос или компания" value="${escapeAttr(screen.search)}">
        <div class="g1-company-query-segments" role="group" aria-label="Релевантность">
          <button type="button" data-company-query-relevance-value="" aria-pressed="${!screen.relevance}">Все ${derived.total}</button>
          ${derived.counts.map(item => `<button type="button" data-company-query-relevance-value="${item.key}" aria-pressed="${screen.relevance === item.key}">${item.label} ${item.count}</button>`).join("")}
        </div>
      </div>
      <div class="g1-company-query-head">${g1CompanyQueryOverviewHeadHtml(screen)}</div>
      <div data-company-query-rows>${g1CompanyQueryOverviewRowsHtml(derived, screen)}</div>
      <div class="g1-company-query-footer"><span data-company-query-shown>Показано ${derived.shown} из ${derived.total}</span>
        <span data-company-query-active${active ? "" : " hidden"}>Фильтр активен</span>
        <button type="button" data-company-query-reset${active ? "" : " hidden"}>Сбросить</button>
      </div>
    </div>
  </div>`;
}

function g1CompanyQueryOverviewRefresh(container) {
  const screen = g1CompanyQueryRelevanceScreen();
  let data = g1CompanyQueryRelevanceSources.get(container);
  if (!data) {
    data = JSON.parse(container.dataset.companyQuerySource);
    g1CompanyQueryRelevanceSources.set(container, data);
  }
  const derived = g1CompanyQueryOverviewDerive(data, screen);
  container.querySelector("[data-company-query-rows]").innerHTML = g1CompanyQueryOverviewRowsHtml(derived, screen);
  container.querySelector("[data-company-query-shown]").textContent = `Показано ${derived.shown} из ${derived.total}`;
  const active = g1CompanyQueryOverviewActive(screen);
  container.querySelector("[data-company-query-active]").hidden = !active;
  container.querySelector("[data-company-query-reset]").hidden = !active;
  container.querySelectorAll("[data-company-query-relevance-value]").forEach(button =>
    button.setAttribute("aria-pressed", String(button.dataset.companyQueryRelevanceValue === screen.relevance)));
  const headings = g1CompanyQueryOverviewHeadHtml(screen);
  const template = document.createElement("template");
  template.innerHTML = headings;
  const next = [...template.content.children];
  container.querySelectorAll("[data-company-query-sort]").forEach((button, index) => {
    button.setAttribute("aria-pressed", next[index].getAttribute("aria-pressed"));
    button.querySelector("span").textContent = next[index].querySelector("span").textContent;
  });
}

document.addEventListener("DOMContentLoaded", () => {
  // The query disclosure is defined by the following script in index.html.
  // Replace its renderer after both scripts load, without changing that file
  // or the existing connection in gate1-company-analysis.js.
  g1CompanyQueryRelevanceDerive = g1CompanyQueryOverviewDerive;
  g1CompanyQueryRelevanceRowsHtml = g1CompanyQueryOverviewRowsHtml;
  g1CompanyQueryRelevanceHtml = g1CompanyQueryOverviewHtml;
  g1CompanyQueryRelevanceRefresh = g1CompanyQueryOverviewRefresh;
  document.querySelectorAll("[data-company-query-relevance]").forEach(container => {
    const expanded = container.querySelector("[data-company-query-relevance-toggle]")?.getAttribute("aria-expanded") === "true";
    const replacement = document.createElement("template");
    replacement.innerHTML = g1CompanyQueryOverviewHtml(JSON.parse(container.dataset.companyQuerySource));
    const next = replacement.content.firstElementChild;
    next.querySelector("[data-company-query-relevance-toggle]").setAttribute("aria-expanded", String(expanded));
    next.querySelector("[data-company-query-relevance-list]").hidden = !expanded;
    container.replaceWith(next);
  });
  document.addEventListener("click", event => {
    const control = event.target.closest?.("[data-company-query-sort], [data-company-query-reset]");
    const container = control?.closest("[data-company-query-relevance]");
    if (!container) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const screen = g1CompanyQueryRelevanceScreen();
    if (control.hasAttribute("data-company-query-reset")) {
      screen.search = "";
      screen.relevance = "";
      screen.sort = "";
      screen.direction = "desc";
      container.querySelector("[data-company-query-search]").value = "";
    } else {
      const sort = control.dataset.companyQuerySort;
      if (sort === "query") {
        screen.sort = "";
        screen.direction = "desc";
      } else {
        screen.direction = screen.sort === sort && screen.direction === "desc" ? "asc" : "desc";
        screen.sort = sort;
      }
    }
    g1CompanyQueryOverviewRefresh(container);
  }, true);
}, { once: true });
