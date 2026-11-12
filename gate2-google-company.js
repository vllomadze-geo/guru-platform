/* Gate 2 company Google workspace. The three service cards remain the data owners. */
const G2G_COMPANY_SECTIONS = Object.freeze([
  { title: "Аналитика", id: "ga4", selector: '[data-g2sb-id="company-ga4"]' },
  { title: "Поиск", id: "gsc", selector: '[data-g2sb-id="company-gsc"]' },
  { title: "Реклама", id: "ads", selector: '[data-g2sb-id="company-google-ads"]' },
]);

let g2gCompanyObserver = null;
function g2gCompanySync(group) {
  for (const definition of G2G_COMPANY_SECTIONS) {
    const node = group.querySelector(definition.selector);
    if (node && node.dataset.g2yUnit !== definition.id) node.dataset.g2yUnit = definition.id;
    // The shared step editor replaces a card without going through the global
    // title decorator. Keep the visible company suffix after that replacement.
    const title = node?.querySelector(':scope > summary .g2sb-title');
    if (title && !/\s*·\s*Компания\s*$/u.test(title.textContent))
      title.textContent = `${title.textContent.trim()} · Компания`;
  }
  g2yCompanyRefreshSummary(group);
}
function g2gCompanyMount() {
  const scope = document.querySelector('.g2w-workspace [data-g2w-scope="company"]');
  if (!scope) {
    g2gCompanyObserver?.disconnect();
    g2gCompanyObserver = null;
    return;
  }
  if (scope.querySelector(':scope > [data-g2g-company]')) return;
  g2gCompanyObserver?.disconnect();
  g2gCompanyObserver = null;

  const units = G2G_COMPANY_SECTIONS.map(section =>
    scope.querySelector(`:scope > ${section.selector}`));
  // Do not move a partial set: all three original blocks stay visible until
  // the complete company view is available.
  if (units.some(node => !node)) return;

  const group = document.createElement("details");
  group.className = "g2y-company g2g-company";
  group.dataset.g2gCompany = "";
  group.dataset.uiKeeperKey = "g2g:company";
  group.open = true;
  group.setAttribute("aria-labelledby", "g2g-company-title");
  group.innerHTML = `<summary class="g2y-company-header">
    <div><h3 id="g2g-company-title">Google</h3><p>Аналитика, поиск и реклама</p></div>
    <span data-g2y-summary aria-live="polite"></span>
  </summary>`;
  units[0].insertAdjacentElement("beforebegin", group);

  G2G_COMPANY_SECTIONS.forEach((definition, index) => {
    const section = document.createElement("section");
    section.className = "g2y-company-section";
    const header = document.createElement("div");
    header.className = "g2y-company-section-header";
    const title = document.createElement("h4");
    title.textContent = definition.title;
    header.append(title);
    section.append(header);
    const node = units[index];
    node.dataset.g2yUnit = definition.id;
    section.append(node);
    group.append(section);
  });

  // The shared step editor replaces a service node when it opens or saves an
  // inline editor. Watch the provider container so its new header is included.
  const observer = new MutationObserver(mutations => {
    const affectsUnit = mutations.some(mutation =>
      mutation.target.closest?.("[data-g2sb-id]") ||
      [...mutation.addedNodes].some(node => node.nodeType === 1 &&
        (node.matches?.("[data-g2sb-id]") || node.querySelector?.("[data-g2sb-id]"))));
    if (affectsUnit) g2gCompanySync(group);
  });
  observer.observe(group, { subtree: true, attributes: true,
    attributeFilter: ["class", "data-status"], childList: true, characterData: true });
  g2gCompanyObserver = observer;
  g2gCompanySync(group);
}

const g2gPreviousRenderGate2 = renderGate2Redesign;
renderGate2Redesign = function (gate, cards) {
  const result = g2gPreviousRenderGate2.apply(this, arguments);
  if (gate?.id === "gate-2") g2gCompanyMount();
  else { g2gCompanyObserver?.disconnect(); g2gCompanyObserver = null; }
  return result;
};
