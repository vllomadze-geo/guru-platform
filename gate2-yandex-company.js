/* Gate 2 company Yandex workspace. Source records and readiness remain intact. */
const G2Y_COMPANY_GROUPS = Object.freeze([
  {
    title: "Метрика",
    units: [
      { id: "metrika", selector: '[data-g2mu-block]' },
    ],
  },
  {
    title: "Поиск и карты",
    units: [
      { id: "webmaster", selector: '[data-g2sb-id="company-webmaster"]' },
      { id: "business", selector: '[data-g2sb-id="company-yandex-business"]' },
    ],
  },
  {
    title: "Реклама",
    units: [
      { id: "direct", selector: '[data-g2sb-id="company-yandex-direct"]' },
    ],
  },
]);

let g2yCompanyObserver = null;
function g2yCompanyStatus(node) {
  const header = node.querySelector(":scope > summary, :scope > button");
  const badge = header?.querySelector("[data-status], .status-pill");
  if (!badge) return "not_started";
  return badge.dataset.status || [...badge.classList]
    .find(name => name.startsWith("status-") && name !== "status-pill")?.slice(7) || "not_started";
}
function g2yCompanyRefreshSummary(group) {
  const statuses = [...group.querySelectorAll("[data-g2y-unit]")].map(g2yCompanyStatus);
  const skipped = statuses.filter(status => ["not_needed", "not_required"].includes(status)).length;
  const ready = statuses.filter(status => status === "ready").length;
  const count = statuses.length - skipped;
  const summary = group.querySelector("[data-g2y-summary]");
  if (summary) summary.textContent = `${ready} из ${count} разделов готово${skipped ? ` · ${skipped} не требуется` : ""}`;
}
function g2yCompanyMount() {
  const scope = document.querySelector('.g2w-workspace [data-g2w-scope="company"]');
  if (!scope) {
    g2yCompanyObserver?.disconnect();
    g2yCompanyObserver = null;
    return;
  }
  const existing = scope.querySelector(":scope > [data-g2y-company]");
  if (existing) return;
  g2yCompanyObserver?.disconnect();
  g2yCompanyObserver = null;
  if (G2Y_COMPANY_GROUPS.flatMap(item => item.units)
    .filter(item => item.id !== "metrika")
    .some(item => !scope.querySelector(item.selector))) return;
  if (typeof g2muMount === "function") g2muMount(scope);
  const units = G2Y_COMPANY_GROUPS.flatMap(group => group.units);
  const found = new Map(units.map(unit => [unit.id, scope.querySelector(unit.selector)]));
  // A partial shell would make one of the original tools disappear from the
  // intended hierarchy. Leave the ordinary blocks intact until all exist.
  if ([...found.values()].some(node => !node)) return;

  const group = document.createElement("details");
  group.className = "g2y-company";
  group.dataset.g2yCompany = "";
  group.dataset.uiKeeperKey = "g2y:company";
  group.open = true;
  group.setAttribute("aria-labelledby", "g2y-company-title");
  group.innerHTML = `<summary class="g2y-company-header">
    <div><h3 id="g2y-company-title">Яндекс</h3><p>Аналитика, поиск, карты и реклама</p></div>
    <span data-g2y-summary aria-live="polite"></span>
  </summary>`;
  found.get("metrika").insertAdjacentElement("beforebegin", group);
  for (const definition of G2Y_COMPANY_GROUPS) {
    const section = document.createElement("section");
    section.className = "g2y-company-section";
    const header = document.createElement("div");
    header.className = "g2y-company-section-header";
    const title = document.createElement("h4");
    title.textContent = definition.title;
    header.append(title);
    section.append(header);
    for (const unit of definition.units) {
      const node = found.get(unit.id);
      node.dataset.g2yUnit = unit.id;
      section.append(node);
    }
    group.append(section);
  }

  const metrikaLink = document.createElement("a");
  metrikaLink.dataset.g2yServiceLink = "";
  metrikaLink.href = "https://metrika.yandex.ru/";
  metrikaLink.target = "_blank";
  metrikaLink.rel = "noopener noreferrer";
  metrikaLink.textContent = "Открыть Метрику ↗";
  group.querySelector(".g2y-company-section-header").append(metrikaLink);

  const observer = new MutationObserver(() => g2yCompanyRefreshSummary(group));
  for (const node of found.values()) {
    const header = node.querySelector(":scope > summary, :scope > button");
    if (header) observer.observe(header, { subtree: true, attributes: true,
      attributeFilter: ["class", "data-status"], childList: true, characterData: true });
  }
  g2yCompanyObserver = observer;
  g2yCompanyRefreshSummary(group);
}

const g2yPreviousRenderGate2 = renderGate2Redesign;
renderGate2Redesign = function (gate, cards) {
  const result = g2yPreviousRenderGate2.apply(this, arguments);
  if (gate?.id === "gate-2") g2yCompanyMount();
  else { g2yCompanyObserver?.disconnect(); g2yCompanyObserver = null; }
  return result;
};
