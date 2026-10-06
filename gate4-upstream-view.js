/* Read-only view of saved Gate 4 Search groups in earlier product gates.
   The selected product ID is the only join key. Nothing here writes project data. */
(function () {
  "use strict";

  const gateIds = new Set(["gate-1", "gate-2", "gate-3"]);
  const panelSelector = "[data-gate4-upstream-panel-v519]";
  const styleId = "gate4-upstream-view-style-v519";

  function clean(value) {
    return String(value ?? "").trim();
  }

  function escape(value) {
    return clean(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[character]);
  }

  function normalizePhrase(value) {
    return clean(value).toLocaleLowerCase("ru-RU").replace(/\s+/g, " ");
  }

  function plural(count, one, few, many) {
    const lastTwo = count % 100;
    const last = count % 10;
    return lastTwo >= 11 && lastTwo <= 14 ? many
      : last === 1 ? one : last >= 2 && last <= 4 ? few : many;
  }

  function uniqueRows(rows) {
    const seen = new Set();
    return (Array.isArray(rows) ? rows : []).filter((row) => {
      const key = normalizePhrase(row?.kw);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function metric(value) {
    return clean(value) ? escape(value) : '<span class="g4u-empty-v519">—</span>';
  }

  function groupHtml(group, index, gateId, productId) {
    const rows = uniqueRows(group?.demandRows);
    const title = clean(group?.col0 || group?.searchIntent) || `Группа ${index + 1}`;
    const groupId = clean(group?.groupId || group?.clusterId) || `group-${index}`;
    const keeperKey = `gate4-upstream:${gateId}:${productId}:group:${groupId}`;
    const groupRows = rows.length
      ? `<div class="g4u-table-scroll-v519"><table class="g4u-table-v519">
          <thead><tr><th>Ключевая фраза</th><th>Объём показов/мес</th><th>Прогноз переходов/мес</th><th>Прогноз бюджета, ₽</th></tr></thead>
          <tbody>${rows.map((row) => `<tr><td>${escape(row.kw)}</td><td>${metric(row.vol)}</td><td>${metric(row.forecastClicks)}</td><td>${metric(row.forecastBudget)}</td></tr>`).join("")}</tbody>
        </table></div>`
      : '<p class="g4u-note-v519">Для этой группы ключевые фразы в Gate 4 пока не сохранены.</p>';
    return `<details class="g4u-group-v519" data-ui-keeper-key="${escape(keeperKey)}">
      <summary><span class="g4u-group-title-v519">${escape(title)}</span><span class="g4u-count-v519">${rows.length} ${plural(rows.length, "фраза", "фразы", "фраз")}</span></summary>
      ${groupRows}
    </details>`;
  }

  function panelHtml(groups, gateId, productId, productName) {
    const phraseRows = typeof guruGate4PhraseRowsV519 === "function"
      ? guruGate4PhraseRowsV519(productId, state) : [];
    const phraseCount = phraseRows.length || new Set(groups.flatMap((group) =>
      uniqueRows(group?.demandRows).map((row) => normalizePhrase(row.kw)))).size;
    const keeperKey = `gate4-upstream:${gateId}:${productId}:panel`;
    return `<section class="g4u-panel-v519" data-gate4-upstream-panel-v519 data-product-id="${escape(productId)}">
      <details data-ui-keeper-key="${escape(keeperKey)}">
        <summary class="g4u-panel-head-v519">
          <span><strong>Группы JTBD и ключевые слова</strong><small>из Gate 4 · Поиск · ${escape(productName)}</small></span>
          <span class="g4u-count-v519">${groups.length} ${plural(groups.length, "группа", "группы", "групп")} · ${phraseCount} ${plural(phraseCount, "фраза", "фразы", "фраз")}</span>
        </summary>
        <div class="g4u-panel-body-v519">
          <p class="g4u-note-v519">Сохранённые группы и метрики Gate 4 показаны здесь только для чтения. Связь определяется по ID товара.</p>
          ${groups.map((group, index) => groupHtml(group, index, gateId, productId)).join("")}
        </div>
      </details>
    </section>`;
  }

  function ensureStyles() {
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      .g4u-panel-v519 { margin: 12px 0 18px; border: 1px solid #dedbd5; border-radius: 12px; background: #fff; color: #302e2b; }
      .g4u-panel-v519 summary { cursor: pointer; list-style: none; }
      .g4u-panel-v519 summary::-webkit-details-marker { display: none; }
      .g4u-panel-head-v519 { display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 14px 16px; }
      .g4u-panel-head-v519 > span:first-child { display: grid; gap: 3px; min-width: 0; }
      .g4u-panel-head-v519 strong { font-size: 14px; }
      .g4u-panel-head-v519 small, .g4u-note-v519, .g4u-count-v519 { color: #77736d; font-size: 12px; }
      .g4u-count-v519 { white-space: nowrap; }
      .g4u-panel-body-v519 { border-top: 1px solid #e9e6e1; padding: 12px 16px 16px; }
      .g4u-note-v519 { margin: 0 0 12px; line-height: 1.5; }
      .g4u-group-v519 { border: 1px solid #e6e3de; border-radius: 9px; margin-top: 8px; background: #fff; }
      .g4u-group-v519 > summary { display: flex; justify-content: space-between; gap: 14px; align-items: baseline; padding: 11px 12px; }
      .g4u-group-title-v519 { font-weight: 600; font-size: 13px; line-height: 1.5; }
      .g4u-group-v519 > .g4u-note-v519 { margin: 0; padding: 0 12px 12px; }
      .g4u-table-scroll-v519 { overflow-x: auto; border-top: 1px solid #ece9e5; }
      .g4u-table-v519 { border-collapse: collapse; width: 100%; min-width: 650px; background: #fff; font-size: 12px; }
      .g4u-table-v519 th, .g4u-table-v519 td { padding: 9px 12px; border-bottom: 1px solid #f0eeeb; text-align: left; vertical-align: top; }
      .g4u-table-v519 th { color: #77736d; font-weight: 600; white-space: nowrap; }
      .g4u-table-v519 th:not(:first-child), .g4u-table-v519 td:not(:first-child) { text-align: right; }
      .g4u-table-v519 tr:last-child td { border-bottom: 0; }
      .g4u-empty-v519 { color: #96918b; }
      @media (max-width: 700px) { .g4u-panel-head-v519 { align-items: flex-start; flex-direction: column; gap: 7px; } }
    `;
    document.head.appendChild(style);
  }

  function destination(gateId) {
    const content = els?.contentArea;
    if (!content) return null;
    const contextKey = {
      "gate-1": "gate1-product-pages",
      "gate-2": "gate2-product",
      "gate-3": "gate3-product-journey",
    }[gateId];
    const context = contextKey
      ? content.querySelector(`[data-guru-product-context="${contextKey}"]`)
      : null;
    return context ? { node: context, position: "afterend" } : null;
  }

  function renderUpstreamPanel() {
    if (!els?.contentArea) return;
    els.contentArea.querySelectorAll(panelSelector).forEach((node) => node.remove());
    if (activeView !== "gate" || !gateIds.has(activeGateId) || !state ||
      typeof guruGate4SavedGroupsV519 !== "function") return;
    const product = guruV194SelectedProduct(state);
    const productId = clean(product?.id);
    if (!productId) return;
    const groups = guruGate4SavedGroupsV519(productId, state)
      .filter((group) => clean(group?.col0 || group?.searchIntent) || uniqueRows(group?.demandRows).length);
    if (!groups.length) return;
    const anchor = destination(activeGateId);
    if (!anchor) return;
    ensureStyles();
    anchor.node.insertAdjacentHTML(anchor.position,
      panelHtml(groups, activeGateId, productId, clean(product?.name) || productId));
    if (typeof guruApplyDisclosureStateV512 === "function")
      guruApplyDisclosureStateV512(els.contentArea.querySelector(panelSelector));
  }

  const previousRenderGate = renderGate;
  renderGate = function () {
    const result = previousRenderGate.apply(this, arguments);
    renderUpstreamPanel();
    return result;
  };

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", renderUpstreamPanel, { once: true });
  else queueMicrotask(renderUpstreamPanel);
})();
