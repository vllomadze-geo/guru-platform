/* Display-only block names. Stored card titles and navigation keys stay intact. */
(() => {
  "use strict";

  const productCardIds = new Set([
    "card-2", "gate0-product-diagnostic", "gate0-landing-check-v215",
  ]);
  const selectors = [
    ".gate0-card-title",
    ".guru-strategic-step-title-v529",
    ".gate0-scope-field-head-v194 > div > strong",
    ".guru-category-description-heading > span:first-child",
    ".mega-section-title",
    ".mega-subsection-title",
    ".g1-section-title",
    ".g1-card-title",
    ".g1bp-title-v543",
    ".g1-company-compare-title",
    ".project-comparison-heading b",
    ".target-audience-heading strong",
    ".g2sb-title",
    ".g2w-card-title > strong",
    ".g2-check-title > span:first-child",
    ".g4five-map-title-v523",
    ".gate5-block-title",
    ".gate5-loop h2",
    ".gate5-loop h3",
    ".gate6-section-head h3",
    ".gate7-section-head b",
    ".g8-section-head h3",
    ".g8-workbench-section-head > span:first-child",
    ".g8-model-heading h3",
    ".g8-final-questions > header h3",
    ".g8-company-contributions > h4",
    ".g8-required-data > strong",
    ".project-overview-head h2",
  ].join(",");
  const scopeSuffix = /\s*·\s*(Компания|Продукт\s*[\/-]\s*Услуга)\s*$/iu;

  function nameWithoutLevel(value) {
    let name = String(value || "").trim();
    while (scopeSuffix.test(name)) name = name.replace(scopeSuffix, "").trimEnd();
    return name;
  }

  function displayName(raw, scope) {
    let name = nameWithoutLevel(raw);
    const fixed = {
      "Проект: базовые сведения": "Базовые сведения",
      "Сегменты компании": "Сегменты",
      "Позиционирование компании": "Позиционирование",
      "Сравнение компании": "Сравнение",
      "Цель компании": "Цель",
      "Цель продукта / услуги": "Цель",
      "Итоговая проверка компании": "Итоговая проверка",
      "Итоговая проверка продукта": "Итоговая проверка",
      "Описание продукта/услуги": "Описание",
      "Офферы + CTA": "Оффер и CTA",
      "Оффер + CTA": "Оффер и CTA",
      "Конкуренты (Сравнение проектов)": "Сравнение проектов",
    };
    name = fixed[name] || name;
    if (/^5А Компании$/iu.test(name)) name = "5А";
    else if (/^5А Продукта\s*·\s*/iu.test(name))
      name = name.replace(/^5А Продукта\s*·\s*/iu, "5А — ");
    if (/^SMM-стратегия продукта\s*·/iu.test(name))
      name = name.replace(/^SMM-стратегия продукта/iu, "SMM-стратегия");
    if (/^Юнит-экономика:/iu.test(name)) name = "Юнит-экономика";
    const parts = name.split(/\s*·\s*/u);
    if (parts.length === 2 && parts[0].toLowerCase() === parts[1].toLowerCase())
      name = parts[0];
    return `${name} · ${scope === "product" ? "Продукт/Услуга" : "Компания"}`;
  }

  function existingScope(value) {
    const match = String(value || "").match(scopeSuffix);
    return match ? (/^Компания$/iu.test(match[1]) ? "company" : "product") : "";
  }

  function nodeScope(node, fallback) {
    if (node.closest("[data-guru-strategic-foundation]")) return "product";
    if (node.closest("[data-guru-strategic-foundation-company]")) return "company";
    const scopeRoot = node.closest("[data-gate-scope], [data-g2-scope]");
    const direct = scopeRoot?.dataset.gateScope || scopeRoot?.dataset.g2Scope;
    if (direct === "company" || direct === "product") return direct;
    const cardId = node.closest("[data-card-row]")?.dataset.cardRow;
    if (productCardIds.has(cardId)) return "product";
    if (node.matches(".guru-category-description-heading > span:first-child"))
      return "product";
    return existingScope(node.textContent) || fallback;
  }

  function refresh(root = els?.contentArea) {
    if (!root) return;
    let fallback = "company";
    const nodes = [
      ...(root.matches?.(selectors + ", .gate0-section-heading-title") ? [root] : []),
      ...root.querySelectorAll(selectors + ", .gate0-section-heading-title"),
    ];
    for (const node of nodes) {
      if (node.id === "g2sb-company-vk-company") {
        if (node.textContent.trim() !== "VK") node.textContent = "VK";
        continue;
      }
      if (node.classList.contains("gate0-section-heading-title")) {
        const text = node.textContent.trim();
        if (/^Компания$/iu.test(text)) fallback = "company";
        else if (/^Продукт\s*[\/-]\s*Услуга$/iu.test(text)) {
          fallback = "product";
          if (text !== "Продукт/Услуга") node.textContent = "Продукт/Услуга";
        }
        continue;
      }
      const text = node.textContent.trim();
      if (!text) continue;
      const next = displayName(text, nodeScope(node, fallback));
      if (next !== text) {
        node.dataset.guruBlockTitleOriginal = text;
        if (node.childElementCount) {
          // Some titles contain styled labels or interactive descendants.
          // Keep those nodes and their listeners intact when adding the level.
          const suffix = next.match(scopeSuffix)?.[0] || "";
          const tail = [...node.childNodes].reverse().find((part) =>
            part.nodeType === Node.TEXT_NODE && part.textContent.trim());
          if (scopeSuffix.test(text) && tail && scopeSuffix.test(tail.textContent))
            tail.textContent = tail.textContent.replace(scopeSuffix, suffix);
          else if (!scopeSuffix.test(text)) node.append(document.createTextNode(suffix));
        } else node.textContent = next;
      }
    }
  }

  const previousRenderGate = renderGate;
  renderGate = function (...args) {
    const result = previousRenderGate.apply(this, args);
    if (!(typeof guruUserEditDispatchActive !== "undefined" &&
          guruUserEditDispatchActive && guruUserEditEventType === "input"))
      refresh(els.contentArea);
    return result;
  };

  const previousRenderProject = renderProject;
  renderProject = function (...args) {
    const result = previousRenderProject.apply(this, args);
    refresh(els.contentArea);
    return result;
  };

  const previousMountCard = gate1MountAccordionBodyV302;
  gate1MountAccordionBodyV302 = function (...args) {
    const result = previousMountCard.apply(this, args);
    if (result) refresh(args[1] || els.contentArea);
    return result;
  };

  const previousRefreshProductFields = guruV194RefreshGate0ProductFieldsV1;
  guruV194RefreshGate0ProductFieldsV1 = function (...args) {
    const result = previousRefreshProductFields.apply(this, args);
    refresh(args[0] || els.contentArea);
    return result;
  };

  document.addEventListener("click", (event) => {
    if (activeGateId !== "gate-8" ||
        !event.target.closest?.("[data-g8-v3-toggle]")) return;
    queueMicrotask(() => refresh(els.contentArea));
  }, true);

  window.GuruBlockTitles = Object.freeze({ displayName, refresh });
  refresh(els.contentArea);
})();
