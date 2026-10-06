/* ================================================================
   Gate 1 · SEO → Компания · собственный интерактивный инструмент (v305).

   Это отдельный project-level флаг внутри централизованного SEO-блока.
   Модель не добавляет карточки в gate-1.cards, не зависит от product_id и
   не меняет семь существующих SEO-источников.
   ================================================================ */

const GATE1_SEO_INTERACTIVE_TOOL_V305 = "gate1-seo-interactive-tool-v305";
const GATE1_SEO_INTERACTIVE_TOOL_EXISTS_V305 = new Set(["", "yes", "no"]);
const GATE1_SEO_INTERACTIVE_TOOL_BUILD_V305 = new Set([
  "",
  "yes",
  "no",
  "not_considered",
]);

function gate1SeoInteractiveToolTextV305(value) {
  return String(value ?? "").trim();
}

function gate1SeoInteractiveToolStoreV305(workspace = state) {
  if (!workspace || typeof workspace !== "object") return null;
  const store = workspace.gate1SeoInteractiveToolV305 &&
    typeof workspace.gate1SeoInteractiveToolV305 === "object"
    ? workspace.gate1SeoInteractiveToolV305
    : {};
  workspace.gate1SeoInteractiveToolV305 = store;
  store.version = GATE1_SEO_INTERACTIVE_TOOL_V305;
  store.exists_now = GATE1_SEO_INTERACTIVE_TOOL_EXISTS_V305.has(store.exists_now)
    ? store.exists_now
    : "";
  store.tool_name = String(store.tool_name || "");
  store.tool_url = String(store.tool_url || "");
  store.should_build = GATE1_SEO_INTERACTIVE_TOOL_BUILD_V305.has(store.should_build)
    ? store.should_build
    : "";
  store.idea = String(store.idea || "");
  return store;
}

function gate1SeoInteractiveToolStatusV305(store) {
  if (!store?.exists_now) return "not_started";
  if (store.exists_now === "yes")
    return gate1SeoInteractiveToolTextV305(store.tool_name) &&
      gate1SeoInteractiveToolTextV305(store.tool_url)
      ? "ready"
      : "in_progress";
  return store.should_build ? "ready" : "in_progress";
}

function gate1SeoInteractiveToolOptionV305(value, current, label) {
  return `<option value="${escapeAttr(value)}"${current === value ? " selected" : ""}>${escapeHtml(label)}</option>`;
}

function gate1SeoInteractiveToolHtmlV305(store) {
  const status = gate1SeoInteractiveToolStatusV305(store);
  const exists = store.exists_now;
  return `<article class="gate1-seo-interactive-tool-v305" data-g1-seo-interactive-tool-v305="1" data-g1-seo-interactive-tool-status-v305="${escapeAttr(status)}">
    <header class="gate1-seo-interactive-tool-head-v305">
      <div>
        <strong>Собственный интерактивный инструмент</strong>
        <span>Честный флаг для всего проекта: калькулятор, конфигуратор, тест или другой полезный сервис на сайте.</span>
      </div>
      <span class="status-pill status-${escapeAttr(status)}">${escapeHtml(STATUS_LABELS[status] || status)}</span>
    </header>
    <div class="gate1-seo-interactive-tool-grid-v305">
      <label class="field-row gate1-seo-interactive-tool-full-v305">
        <span>Есть ли у бизнеса такой инструмент сейчас?</span>
        <select data-g1-seo-interactive-tool-field-v305="exists_now">
          ${gate1SeoInteractiveToolOptionV305("", exists, "Выберите ответ")}
          ${gate1SeoInteractiveToolOptionV305("yes", exists, "Да")}
          ${gate1SeoInteractiveToolOptionV305("no", exists, "Нет")}
        </select>
      </label>
      <div class="gate1-seo-interactive-tool-branch-v305 gate1-seo-interactive-tool-full-v305" data-g1-seo-interactive-tool-yes-v305${exists === "yes" ? "" : " hidden"}>
        <label class="field-row">
          <span>Что это?</span>
          <input type="text" value="${escapeAttr(store.tool_name)}" placeholder="Например, калькулятор стоимости" data-g1-seo-interactive-tool-field-v305="tool_name">
        </label>
        <label class="field-row">
          <span>Ссылка</span>
          <input type="url" value="${escapeAttr(store.tool_url)}" placeholder="https://example.ru/calculator" data-g1-seo-interactive-tool-field-v305="tool_url">
        </label>
      </div>
      <label class="field-row gate1-seo-interactive-tool-full-v305" data-g1-seo-interactive-tool-no-v305${exists === "no" ? "" : " hidden"}>
        <span>Стоит ли его сделать?</span>
        <select data-g1-seo-interactive-tool-field-v305="should_build">
          ${gate1SeoInteractiveToolOptionV305("", store.should_build, "Выберите ответ")}
          ${gate1SeoInteractiveToolOptionV305("yes", store.should_build, "Да")}
          ${gate1SeoInteractiveToolOptionV305("no", store.should_build, "Нет")}
          ${gate1SeoInteractiveToolOptionV305("not_considered", store.should_build, "Не рассматривали")}
        </select>
      </label>
      <label class="field-row gate1-seo-interactive-tool-full-v305">
        <span>Краткая идея, если есть</span>
        <textarea rows="2" placeholder="Что инструмент должен считать, подбирать или помогать выбрать" data-g1-seo-interactive-tool-field-v305="idea">${escapeHtml(store.idea)}</textarea>
      </label>
    </div>
    <small class="gate1-seo-interactive-tool-source-v305">Gate 1 · SEO → Компания · единое значение на проект</small>
  </article>`;
}

function gate1SeoInteractiveToolNodeV305(store) {
  const template = document.createElement("template");
  template.innerHTML = gate1SeoInteractiveToolHtmlV305(store).trim();
  return template.content.firstElementChild;
}

function gate1SeoInteractiveToolInjectV305() {
  if (activeGateId !== "gate-1") return;
  const root = els.contentArea?.querySelector?.(".g1-redesign");
  if (!root || root.querySelector("[data-g1-seo-interactive-tool-v305]")) return;
  const seoCompany = root.querySelector(
    ':scope > [data-g1-company-block-v299="seo-audit"]',
  );
  const body = seoCompany?.querySelector(":scope > .g1-section-body");
  if (!body) return;
  body.append(gate1SeoInteractiveToolNodeV305(gate1SeoInteractiveToolStoreV305(state)));
  root.dataset.g1SeoInteractiveToolMountedV305 = "1";
}

function gate1SeoInteractiveToolRefreshV305() {
  if (activeGateId !== "gate-1") return;
  const root = els.contentArea?.querySelector?.(".g1-redesign");
  const current = root?.querySelector?.("[data-g1-seo-interactive-tool-v305]");
  if (!current) {
    gate1SeoInteractiveToolInjectV305();
    return;
  }
  current.replaceWith(
    gate1SeoInteractiveToolNodeV305(gate1SeoInteractiveToolStoreV305(state)),
  );
}

const __gate1SeoInteractiveToolPrevRenderV305 = renderGate1Accordion;
renderGate1Accordion = function (gate, cards) {
  const result = __gate1SeoInteractiveToolPrevRenderV305.apply(this, arguments);
  gate1SeoInteractiveToolInjectV305();
  return result;
};

document.addEventListener("input", (event) => {
  const field = event.target?.closest?.(
    "[data-g1-seo-interactive-tool-field-v305]",
  );
  if (!field) return;
  const store = gate1SeoInteractiveToolStoreV305(state);
  store[field.dataset.g1SeoInteractiveToolFieldV305] = field.value;
  flashSaving();
});

document.addEventListener("change", (event) => {
  const field = event.target?.closest?.(
    "[data-g1-seo-interactive-tool-field-v305]",
  );
  if (!field) return;
  const store = gate1SeoInteractiveToolStoreV305(state);
  store[field.dataset.g1SeoInteractiveToolFieldV305] = field.value;
  flashSaving();
  gate1SeoInteractiveToolRefreshV305();
});

if (activeGateId === "gate-1") gate1SeoInteractiveToolInjectV305();
