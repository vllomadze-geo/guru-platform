/* ================================================================
   v2.3.152 — Gate 1: физическая группировка и единый аккордеон.

   Под «Компания» находятся четыре соседних блока без лишней оболочки:
   «SEO-аудит», «Структура сайта — аудит», «Юриспруденция — аудит» и
   «Целевая аудитория». SEO-сниппет и проверка индексации продукта
   находятся внутри связанной «Карточки товара» или «Страницы услуги».
   Рабочий «Фундамент ключевых слов» и единый контекст товара остаются
   у своих исходных экранов, без копирования моделей и обработчиков.
   ================================================================ */

const GATE1_SEO_CENTRAL_UI_V298 = "gate1-seo-central-ui-v298";
const GATE1_JTBD_ENCODING_REPAIR_V298 = "gate1-jtbd-encoding-repair-v298";
const GATE1_SEO_ACCORDION_PREFIX_V300 = "gate1-seo-v300";

function gate1SeoCentralTextV298(value) {
  return String(value ?? "").trim();
}

function gate1SeoAccordionKeyV300(scope) {
  return `${GATE1_SEO_ACCORDION_PREFIX_V300}-${String(scope || "block")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")}`;
}

function gate1SeoAccordionOpenV300(scope) {
  const key = gate1SeoAccordionKeyV300(scope);
  const subblocks = getGate1AccordionState().subblocks;
  if (!Object.prototype.hasOwnProperty.call(subblocks, key)) subblocks[key] = true;
  return { key, open: Boolean(subblocks[key]) };
}

function gate1SeoCentralSourceV298(label) {
  return `<small class="guru-strategic-card-source-v245 g1-seo-central-source-v298">← ${escapeHtml(label)}</small>`;
}

function gate1SeoCentralHeadingV298(
  title,
  note,
  status = "not_started",
  scope = "block",
) {
  const accordion = gate1SeoAccordionOpenV300(scope);
  return `<button type="button" class="g1-section-header g1-seo-central-head-v298" data-gate1-toggle-section="${escapeAttr(accordion.key)}" aria-expanded="${accordion.open ? "true" : "false"}">
    <span class="g1-section-left">
      <span class="g1-section-title">${escapeHtml(title)}</span>
      <span class="g1-section-progress">${escapeHtml(note)}</span>
    </span>
    <span class="status-pill status-${escapeAttr(status)}">${escapeHtml(STATUS_LABELS[status] || status)}</span>
    <span class="g1-section-toggle">${accordion.open ? "Закрыть" : "Открыть"}</span>
  </button>`;
}

function gate1SeoCentralSectionV298(scope, title, note, status) {
  const accordion = gate1SeoAccordionOpenV300(scope);
  const node = document.createElement("section");
  node.className = `g1-section ${accordion.open ? "is-open" : ""} g1-seo-central-v298`;
  node.dataset.g1SeoCentralV298 = scope;
  node.dataset.g1SeoAccordionKeyV300 = accordion.key;
  node.innerHTML = `${gate1SeoCentralHeadingV298(title, note, status, scope)}<div class="g1-section-body g1-seo-central-body-v298"${accordion.open ? "" : " hidden"}></div>`;
  return node;
}

function gate1SeoCentralExplanationV298(key) {
  return typeof gate1SeoExplanationHtmlV297 === "function"
    ? gate1SeoExplanationHtmlV297(key)
    : "";
}

function gate1SeoSelectedPageV298(product) {
  if (!product) return { card: null, row: null, index: -1 };
  const snapshot = g3ProductJourneySnapshot(product);
  const card = snapshot?.page?.card || null;
  const row = snapshot?.page?.row || null;
  return {
    card,
    row,
    index: card && row ? (card.pageRows || []).indexOf(row) : -1,
  };
}

function gate1SeoSelectedPageNodeV298(root, page) {
  if (!root || !page?.card || page.index < 0) return null;
  const sourceCard = root.querySelector(`[data-card="${CSS.escape(page.card.id)}"]`);
  const pageField = sourceCard?.querySelector(
    `[data-gate1-page-card-id="${CSS.escape(page.card.id)}"][data-gate1-page-index="${page.index}"]`,
  );
  return pageField?.closest(".page-structure-card") || null;
}

function gate1SeoProductFoundationNodeV298(product) {
  if (!product || typeof gate1SeoProductHtmlV296 !== "function") return null;
  const template = document.createElement("template");
  template.innerHTML = gate1SeoProductHtmlV296(product).html.trim();
  return template.content.querySelector('[data-g1-seo-item-v296="keyword-foundations"]');
}

function gate1SeoDecorateAuditV298(auditSection) {
  if (!auditSection) return;
  auditSection.dataset.g1SeoItemV296 = "site-audit";
  auditSection.classList.add("g1-seo-embedded-source-v298");
  const body = auditSection.querySelector(":scope > .g1-section-body");
  if (body && !body.querySelector(":scope > [data-g1-seo-explanation-v297=\"site-audit\"]"))
    body.insertAdjacentHTML("afterbegin", `${gate1SeoCentralExplanationV298("site-audit")}${gate1SeoCentralSourceV298("Gate 1 · Аудит сайта")}`);
  const cards = auditSection.querySelectorAll(":scope > .g1-section-body > [data-card]");
  auditSection.dataset.g1SeoAuditVisibleCardsV298 = String(cards.length);
}

function gate1SeoDecorateCanonicalV298(auditSection) {
  const cards = gate1SeoCanonicalCardsV298(state);
  const canonicalCard = cards.gate?.cards?.find(
    (card) => normalizeGateTitle(card?.title) === normalizeGateTitle("Канонический URL и редиректы"),
  );
  if (!canonicalCard || !auditSection) return;
  const node = auditSection.querySelector(`[data-card="${CSS.escape(canonicalCard.id)}"]`);
  if (!node) return;
  node.dataset.g1SeoItemV296 = "canonical-redirects";
  const title = node.querySelector(".g1-card-title");
  if (title && !node.querySelector('[data-g1-seo-explanation-v297="canonical-redirects"]'))
    title.insertAdjacentHTML("afterend", gate1SeoCentralExplanationV298("canonical-redirects"));
}

function gate1SeoDecorateComparisonV298(node) {
  if (!node) return;
  node.dataset.g1SeoItemV296 = "project-comparison";
  node.classList.add("g1-seo-embedded-source-v298");
  const copy = node.querySelector("[data-project-comparison-toggle] > span:first-child");
  if (copy && !node.querySelector('[data-g1-seo-explanation-v297="project-comparison"]'))
    copy.insertAdjacentHTML("beforeend", gate1SeoCentralExplanationV298("project-comparison"));
}

function gate1SeoDecorateWebmasterV298(node, key, source) {
  if (!node) return;
  node.dataset.g1SeoItemV296 = key;
  node.classList.add("g1-seo-embedded-source-v298");
  const body = node.querySelector(":scope > .g1-section-body");
  if (body && !node.querySelector(`[data-g1-seo-explanation-v297="${CSS.escape(key)}"]`))
    body.insertAdjacentHTML("afterbegin", `${gate1SeoCentralExplanationV298(key)}${gate1SeoCentralSourceV298(source)}`);
}

function gate1SeoEmbeddedAccordionV300(node, scope) {
  if (!node) return;
  const accordion = gate1SeoAccordionOpenV300(scope);
  const body = node.querySelector(":scope > .g1-section-body");
  let header = node.querySelector(":scope > .g1-section-header");
  if (!body || !header) return;
  if (header.tagName !== "BUTTON") {
    const button = document.createElement("button");
    [...header.attributes].forEach((attribute) =>
      button.setAttribute(attribute.name, attribute.value),
    );
    button.type = "button";
    button.innerHTML = header.innerHTML;
    header.replaceWith(button);
    header = button;
  }
  header.dataset.gate1ToggleSection = accordion.key;
  header.setAttribute("aria-expanded", accordion.open ? "true" : "false");
  if (!header.querySelector(":scope > .g1-section-toggle"))
    header.insertAdjacentHTML(
      "beforeend",
      `<span class="g1-section-toggle">${accordion.open ? "Закрыть" : "Открыть"}</span>`,
    );
  node.dataset.g1SeoAccordionKeyV300 = accordion.key;
  node.classList.toggle("is-open", accordion.open);
  body.hidden = !accordion.open;
}

function gate1SeoFindDividerV298(root, title) {
  return [...root.querySelectorAll(":scope > .gate0-section-heading")].find(
    (node) => node.querySelector(".gate0-section-heading-title")?.textContent?.trim() === title,
  ) || null;
}

/* v2.3.149 — «Компания» больше не содержит общий контейнер
   «SEO · Компания → Аудит сайта». Исходные карточки прежнего аудита
   распределяются между тремя соседними рабочими блоками, а Целевая
   аудитория остаётся четвёртым самостоятельным блоком. */
const GATE1_COMPANY_AUDIT_UI_V299 = "gate1-company-audit-ui-v299";

function gate1CompanyAuditGroupV299(card) {
  if (card?.id === "card-site-header-v497" || card?.id === "card-site-footer-v497")
    return "structure";
  const title = normalizeGateTitle(card?.title || "");
  if (/политик|cookie|футер|согласие.*форм/.test(title))
    return "legal";
  if (
    /robots|sitemap|редирект|канонич|meta robots|pagespeed|cwv|изображения seo|ssl/.test(
      title,
    )
  )
    return "seo";
  return "structure";
}

function gate1CompanyAuditSectionV299(scope, title, note, status) {
  const node = gate1SeoCentralSectionV298(scope, title, note, status);
  delete node.dataset.g1SeoCentralV298;
  node.dataset.g1CompanyBlockV299 = scope;
  node.classList.add("g1-company-audit-v299");
  return node;
}

function gate1CompanyAppendNodesV299(section, nodes, emptyText) {
  const body = section.querySelector(":scope > .g1-section-body");
  if (nodes.length) nodes.forEach((node) => body.append(node));
  else body.insertAdjacentHTML(
    "beforeend",
    `<div class="g1-empty">${escapeHtml(emptyText)}</div>`,
  );
}

function gate1CompanyInsertSequenceV299(anchor, nodes) {
  let cursor = anchor;
  nodes.filter(Boolean).forEach((node) => {
    cursor.insertAdjacentElement("afterend", node);
    cursor = node;
  });
}

function gate1SeoCentralizeV298() {
  if (activeGateId !== "gate-1") return;
  const root = els.contentArea?.querySelector?.(".g1-redesign");
  if (!root || root.dataset.g1SeoCentralizedV298 === "1") return;

  const product = guruV194SelectedProduct(state);
  const productPage = gate1SeoSelectedPageV298(product);
  const productFoundation = gate1SeoProductFoundationNodeV298(product);
  const companyDivider = gate1SeoFindDividerV298(root, "Компания");
  const productDivider = gate1SeoFindDividerV298(root, "Продукт / Услуга");
  const auditToggle = root.querySelector('[data-gate1-toggle-section="site_audit"]');
  const auditSection = auditToggle?.closest(".g1-section") || null;
  const comparison = root.querySelector(":scope > .project-comparison");
  const companyWebmaster = root.querySelector('[data-g1-webmaster-scope-v295="company"]');
  const productWebmaster = root.querySelector('[data-g1-webmaster-scope-v295="product"]');
  const productShell = root.querySelector('[data-guru-product-context="gate1-product-pages"]');
  const companyDemandPositioning = root.querySelector(
    ":scope > [data-gate1-company-demand-positioning-v357]",
  );
  const companyDemandHeading = root.querySelector(
    ":scope > [data-gate1-company-demand-positioning-heading-v346]",
  );
  const companyFoundation = companyDemandPositioning?.querySelector(
    "[data-guru-strategic-foundation-company]",
  ) || root.querySelector(
    ":scope > [data-guru-strategic-foundation-company]",
  );
  const companySemantics = companyDemandPositioning?.querySelector(
    "[data-gate1-company-semantics-v264]",
  ) || root.querySelector(":scope > [data-gate1-company-semantics-v264]");
  const targetAudience = root.querySelector(":scope > .target-audience");
  const auditBody = auditSection?.querySelector(":scope > .g1-section-body");
  const auditCardNodes = auditBody
    ? [...auditBody.querySelectorAll(":scope > [data-card]")]
    : [];
  const auditCards = new Map(
    (gate1SeoCanonicalCardsV298(state).gate?.cards || []).map((card) => [card.id, card]),
  );
  const groupedAuditNodes = { seo: [], structure: [], legal: [] };
  auditCardNodes.forEach((node) => {
    const card = auditCards.get(node.dataset.card);
    groupedAuditNodes[gate1CompanyAuditGroupV299(card)].push(node);
  });

  gate1SeoDecorateCanonicalV298(auditSection);
  gate1SeoDecorateComparisonV298(comparison);
  gate1SeoDecorateWebmasterV298(
    companyWebmaster,
    "webmaster-company",
    "Gate 1 · SEO-аудит",
  );
  gate1SeoDecorateWebmasterV298(
    productWebmaster,
    "webmaster-product",
    "Gate 1 · Карточка товара / Страница услуги",
  );
  gate1SeoEmbeddedAccordionV300(companyWebmaster, "company-webmaster");
  gate1SeoEmbeddedAccordionV300(productWebmaster, "product-webmaster");
  if (productPage.card) {
    const pageNode = gate1SeoSelectedPageNodeV298(root, productPage);
    if (pageNode) {
      const sections = pageNode.querySelector(":scope > .route-sections");
      if (sections) {
        const keywordSlot = productPage.card.id === "card-24"
          ? sections.querySelector("[data-goat-product-foundation-slot-v517]") : null;
        const webmasterSlot = productPage.card.id === "card-24"
          ? sections.querySelector("[data-goat-product-webmaster-slot-v517]") : null;
        if (keywordSlot && webmasterSlot) {
          if (productFoundation) keywordSlot.append(productFoundation);
          if (productWebmaster) webmasterSlot.append(productWebmaster);
        } else {
          let cursor = sections;
          [productFoundation, productWebmaster].filter(Boolean).forEach((node) => {
            cursor.insertAdjacentElement("afterend", node);
            cursor = node;
          });
        }
      }
    } else {
      // The page accordion is closed, so its editor is not mounted yet. Keep
      // the page-specific editor out of the selector area; it will be attached
      // on the next render when the page card opens.
      productWebmaster?.remove();
    }
  }

  const seoAuditCards = groupedAuditNodes.seo
    .map((node) => auditCards.get(node.dataset.card))
    .filter(Boolean);
  const structureAuditCards = groupedAuditNodes.structure
    .map((node) => auditCards.get(node.dataset.card))
    .filter(Boolean);
  const legalAuditCards = groupedAuditNodes.legal
    .map((node) => auditCards.get(node.dataset.card))
    .filter(Boolean);
  const seoStatuses = [
    getSectionStatus(seoAuditCards),
    gate1WebmasterOverallV295(state).readiness,
    gate1SeoComparisonV296().status,
  ];
  const seoAudit = gate1CompanyAuditSectionV299(
    "seo-audit",
    "SEO-аудит",
    `${getSectionProgressText(seoAuditCards)} · техническая видимость и рынок`,
    gate1SeoCombinedStatusV296(seoStatuses),
  );
  gate1CompanyAppendNodesV299(
    seoAudit,
    groupedAuditNodes.seo,
    "Карточки технического SEO-аудита не найдены.",
  );
  const seoAuditBody = seoAudit.querySelector(":scope > .g1-section-body");
  if (companyWebmaster) seoAuditBody.append(companyWebmaster);
  if (comparison) seoAuditBody.append(comparison);

  const structureAudit = gate1CompanyAuditSectionV299(
    "site-structure-audit",
    "Структура сайта — аудит",
    getSectionProgressText(structureAuditCards),
    getSectionStatus(structureAuditCards),
  );
  gate1CompanyAppendNodesV299(
    structureAudit,
    groupedAuditNodes.structure,
    "Карточки структуры сайта не найдены.",
  );
  const structureBody = structureAudit.querySelector(":scope > .g1-section-body");
  structureBody.insertAdjacentHTML(
    "afterbegin",
    `${gate1SeoCentralExplanationV298("site-audit")}${gate1SeoCentralSourceV298("Gate 1 · структура сайта")}`,
  );

  const legalAudit = gate1CompanyAuditSectionV299(
    "legal-audit",
    "Юриспруденция — аудит",
    getSectionProgressText(legalAuditCards),
    getSectionStatus(legalAuditCards),
  );
  gate1CompanyAppendNodesV299(
    legalAudit,
    groupedAuditNodes.legal,
    "Юридические карточки аудита не найдены.",
  );

  if (targetAudience) {
    targetAudience.dataset.g1CompanyBlockV299 = "target-audience";
    targetAudience.classList.add("g1-company-direct-v299");
  }
  auditSection?.remove();

  const productComparison =
    typeof projectComparisonProductNode === "function"
      ? projectComparisonProductNode(product)
      : null;
  if (companySemantics) {
    companySemantics.classList.add("g1-company-direct-v299");
    companySemantics.dataset.g1CompanySemanticsLocationV302 = "company";
  }

  if (companyDivider)
    gate1CompanyInsertSequenceV299(companyDivider, [
      companyFoundation,
      companyDemandPositioning || companyDemandHeading,
      ...(companyDemandPositioning ? [] : [companySemantics]),
      seoAudit,
      structureAudit,
      legalAudit,
      targetAudience,
    ]);
  else {
    root.prepend(legalAudit);
    root.prepend(structureAudit);
    root.prepend(seoAudit);
    if (companyDemandPositioning) {
      root.prepend(companyDemandPositioning);
      if (companyFoundation) root.prepend(companyFoundation);
    } else {
      if (companySemantics) root.prepend(companySemantics);
      if (companyFoundation) root.prepend(companyFoundation);
      if (companyDemandHeading) root.prepend(companyDemandHeading);
    }
  }
  /* Единый selector задаёт product_id для всего товарного раздела. Он стоит
     непосредственно после системного заголовка «Продукт / Услуга»; карточки
     и следующие блоки читают выбранный продукт ниже. */
  if (productShell) {
    productShell.classList.remove("g1-demand-product-context-v301");
    productShell.classList.add("g1-product-selector-context-v303");
    productShell.dataset.g1ProductSelectorLocationV303 = "product-root";
  }
  if (productDivider)
    gate1CompanyInsertSequenceV299(productDivider, [
      productShell,
      productComparison,
    ]);
  else {
    const productAnchor = targetAudience || legalAudit;
    if (productAnchor)
      gate1CompanyInsertSequenceV299(productAnchor, [
        productShell,
        productComparison,
      ]);
    else {
      if (productShell) root.append(productShell);
      if (productComparison) root.append(productComparison);
    }
  }

  root.querySelectorAll("[data-g1-seo-panel-v296]").forEach((node) => node.remove());
  root.dataset.g1SeoCentralizedV298 = "1";
  root.dataset.g1CompanyAuditUiV299 = GATE1_COMPANY_AUDIT_UI_V299;
  root.dataset.g1CompanyBlockCountV299 = String(
    root.querySelectorAll(":scope > [data-g1-company-block-v299]").length,
  );
  root.dataset.g1SeoTopLevelCountV298 = String(
    root.querySelectorAll(":scope > [data-g1-seo-central-v298]").length,
  );
  root.dataset.g1KeywordFoundationRestoredV301 = "1";
  bindGate1Accordion();
}

/* Все тела Gate 1, включая источники подробного аудита, монтируются базовым
   renderer даже закрытыми. Поэтому централизация переносит существующие узлы,
   не меняя пользовательское состояние исходной секции или карточек. */
const __gate1SeoCentralPrevRenderV298 = renderGate1Accordion;
renderGate1Accordion = function (gate, cards) {
  const result = __gate1SeoCentralPrevRenderV298.apply(this, arguments);
  gate1SeoCentralizeV298();
  return result;
};

/* Предыдущая SEO-панель вызывает эту функцию после базового renderer. Теперь
   её точка инъекции выполняет физическую централизацию вместо создания
   третьего сводного блока. */
gate1SeoInjectV296 = function () {
  gate1SeoCentralizeV298();
};

function gate1RepairJtbdStringV298(value) {
  if (typeof value !== "string" || !/[\uFFFD]|\?{2,}/u.test(value)) return value;
  return value
    .replace(/ошибит(?:\uFFFD|\?)+ся/giu, "ошибиться")
    .replace(/порадовать(?:\uFFFD|\?)+(?=\s|[.,;:!]|$)/giu, (word) =>
      word.replace(/(?:\uFFFD|\?)+$/gu, ""),
    )
    .replace(/\uFFFD+/gu, "")
    .replace(/\?{2,}/gu, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function gate1RepairJtbdTreeV298(value, path, repairs, active = false) {
  if (!value || typeof value !== "object") return;
  const objectIsJtbd = active || gate1SeoCentralTextV298(value.field).toLowerCase() === "jtbd";
  Object.entries(value).forEach(([key, child]) => {
    const nextPath = `${path}.${key}`;
    const nextActive = objectIsJtbd || /jtbd/i.test(key);
    if (typeof child === "string" && nextActive) {
      const repaired = gate1RepairJtbdStringV298(child);
      if (repaired !== child) {
        value[key] = repaired;
        repairs.push({ path: nextPath, before: child, after: repaired });
      }
      return;
    }
    if (child && typeof child === "object")
      gate1RepairJtbdTreeV298(child, nextPath, repairs, nextActive);
  });
}

function gate1RepairJtbdEncodingV298(workspace = state) {
  if (!workspace?.project) return [];
  const repairs = [];
  gate1RepairJtbdTreeV298(workspace.project, "project", repairs, false);
  gate1RepairJtbdTreeV298(workspace.painV130, "painV130", repairs, false);
  gate1RepairJtbdTreeV298(workspace.gate4Production, "gate4Production", repairs, false);
  if (!repairs.length) return repairs;
  const log = workspace.project._jtbdEncodingRepairLogV298 =
    Array.isArray(workspace.project._jtbdEncodingRepairLogV298)
      ? workspace.project._jtbdEncodingRepairLogV298
      : [];
  log.push({
    id: GATE1_JTBD_ENCODING_REPAIR_V298,
    at: new Date().toISOString(),
    status: "completed",
    count: repairs.length,
    repairs,
  });
  return repairs;
}

const __gate1SeoCentralPrevPrepareV298 = prepareSystemCards;
prepareSystemCards = function (workspace) {
  __gate1SeoCentralPrevPrepareV298(workspace);
  gate1RepairJtbdEncodingV298(workspace);
};

const __gate1SeoCentralPrevMigrateV298 = migrateWorkspace;
migrateWorkspace = function (workspace, projectId) {
  const migrated = __gate1SeoCentralPrevMigrateV298(workspace, projectId);
  gate1RepairJtbdEncodingV298(migrated);
  return migrated;
};

const __gate1SeoCentralPrevFreshV298 = createFreshWorkspace;
createFreshWorkspace = function (meta) {
  const workspace = __gate1SeoCentralPrevFreshV298(meta);
  gate1RepairJtbdEncodingV298(workspace);
  return workspace;
};

function gate1SeoCentralAuditV298(workspace = state) {
  const cards = gate1SeoCanonicalCardsV298(workspace);
  const root = activeGateId === "gate-1"
    ? els.contentArea?.querySelector?.(".g1-redesign")
    : null;
  const selectedProduct = guruV194SelectedProduct(workspace);
  const selectedPage = gate1SeoSelectedPageV298(selectedProduct);
  const selectedPageNode = gate1SeoSelectedPageNodeV298(root, selectedPage);
  const seoNodes = root
    ? [...root.querySelectorAll(":scope > [data-g1-seo-central-v298]")]
    : [];
  const companyNodes = root
    ? [...root.querySelectorAll(":scope > [data-g1-company-block-v299]")]
    : [];
  const outsideSeo = root
    ? [...root.querySelectorAll(
        ':scope > [data-g1-webmaster-scope-v295], :scope > [data-g1-seo-panel-v296], :scope > .project-comparison:not(.project-comparison-product-v309), :scope > .g1-section [data-gate1-toggle-section="site_audit"], :scope > [data-g1-seo-central-v298="company"]',
      )].filter((node) => !node.closest("[data-g1-seo-central-v298]"))
    : [];
  const auditDistribution = root
    ? Object.fromEntries(
        ["seo-audit", "site-structure-audit", "legal-audit"].map((scope) => [
          scope,
          root.querySelector(
            `:scope > [data-g1-company-block-v299="${scope}"]`,
          )?.querySelectorAll("[data-card]").length || 0,
        ]),
      )
    : {};
  return {
    version: GATE1_SEO_CENTRAL_UI_V298,
    topLevelSeoBlocks: seoNodes.map((node) =>
      node.querySelector(":scope > .g1-section-header .g1-section-title")?.textContent?.trim(),
    ),
    productSeoPlacement: {
      productId: selectedProduct?.id || "",
      pageCardId: selectedPage.card?.id || "",
      snippetInPageCard: Boolean(
        selectedPageNode?.querySelector('[data-v22-site-section="seo_snippet"]'),
      ),
      webmasterInPageCard: Boolean(
        selectedPageNode?.querySelector('[data-g1-webmaster-scope-v295="product"]'),
      ),
      keywordFoundationInPageCard: Boolean(
        selectedPageNode?.querySelector('[data-g1-seo-item-v296="keyword-foundations"]'),
      ),
      standaloneProductBlock: Boolean(
        root?.querySelector(':scope > [data-g1-seo-central-v298="product"]'),
      ),
    },
    companyBlocks: companyNodes.map((node) =>
      node.querySelector(
        ":scope > .g1-section-header .g1-section-title, :scope > .target-audience-heading strong",
      )?.textContent?.trim(),
    ),
    outsideSeoCount: outsideSeo.length,
    auditCardsInCompany: Object.values(auditDistribution).reduce(
      (sum, count) => sum + count,
      0,
    ),
    auditDistribution,
    legacyCompanyWrapper: Boolean(
      root?.querySelector(':scope > [data-g1-seo-central-v298="company"]'),
    ),
    canonicalStorage: {
      verificationAndErrors:
        "gate-1.cards[Аудит сайта].webmasterCompanyV298",
      sitemap: "gate-1.cards[Robots.txt].robotsV130.yandex.sitemaps",
      robots: "gate-1.cards[Robots.txt].robotsV130",
      productIndexing:
        "project.catalogItemsV189[product_id].webmasterV298",
    },
    legacyArchived: Boolean(cards.audit?.legacyGate1WebmasterV295),
    activeLegacyStore: Object.prototype.hasOwnProperty.call(
      workspace || {},
      "gate1WebmasterV295",
    ),
    jtbdRepairs: workspace?.project?._jtbdEncodingRepairLogV298 || [],
  };
}

if (typeof GURU_EXPORT_CODE_REFERENCES_V223 !== "undefined") {
  GURU_EXPORT_CODE_REFERENCES_V223["gate-1"]?.push?.({
    file: "gate1-seo-central.js",
    symbol: "gate1SeoCentralizeV298",
    role: "company audit grouping and embedding product SEO in its linked page card",
  });
}

window.gate1SeoCentralAuditV298 = gate1SeoCentralAuditV298;
window.gate1RepairJtbdEncodingV298 = gate1RepairJtbdEncodingV298;

/* v308 — отдельная карточка Sitemap удалена как дубль Robots.txt.
   При открытии старого проекта её единственные канонические значения
   переносятся в robotsV130.yandex.sitemaps, после чего card-15 удаляется. */
function gate1RemoveStandaloneSitemapV308(workspace = state) {
  const gate = workspace?.gates?.find((item) => item.id === "gate-1");
  if (!gate || !Array.isArray(gate.cards)) return null;
  const sitemapIndex = gate.cards.findIndex((card) =>
    card?.id === "card-15" || isSitemapUnifiedCard(card),
  );
  if (sitemapIndex < 0) return null;
  const sitemapCard = gate.cards[sitemapIndex];
  const robotsCard = gate.cards.find((card) => isRobotsUnifiedCard(card));
  if (robotsCard) {
    const robots = ensureRobotsV130(robotsCard, workspace);
    const legacy = sitemapCard.sitemapV130 || sitemapCard.sitemapUnified || {};
    const legacyUrl = String(legacy.url || "").trim();
    const legacyRawStatus = legacy.yandex?.status || legacy.systems?.yandex?.status || "";
    const legacyCanonStatus = guruCanonStatus(legacyRawStatus);
    const legacyStatus = ["works", "ready"].includes(legacyCanonStatus) || legacyRawStatus === "ok"
      ? "ok"
      : ["broken", "missing", "not_needed"].includes(legacyCanonStatus) || legacyRawStatus === "issue"
        ? "error"
        : legacyRawStatus
          ? "pending"
          : "";
    if (legacyUrl) {
      const rows = robots.yandex.sitemaps;
      let target = rows.find((row) => robotsV130Gate0UrlKey(row?.url) === robotsV130Gate0UrlKey(legacyUrl));
      if (!target) {
        target = rows.find((row) => !String(row?.url || "").trim());
        if (target) target.url = legacyUrl;
        else {
          target = { url: legacyUrl, status: "" };
          rows.push(target);
        }
      }
      if (!target.status && legacyStatus) target.status = legacyStatus;
    }
  }
  gate.cards.splice(sitemapIndex, 1);
  return sitemapCard;
}

const __gate1SitemapRemovalPrevPrepareV308 = prepareSystemCards;
prepareSystemCards = function (workspace) {
  __gate1SitemapRemovalPrevPrepareV308(workspace);
  gate1RemoveStandaloneSitemapV308(workspace);
};

const __gate1SitemapRemovalPrevMigrateV308 = migrateWorkspace;
migrateWorkspace = function (workspace, projectId) {
  const migrated = __gate1SitemapRemovalPrevMigrateV308(workspace, projectId);
  gate1RemoveStandaloneSitemapV308(migrated);
  return migrated;
};

const __gate1SitemapRemovalPrevFreshV308 = createFreshWorkspace;
createFreshWorkspace = function (meta) {
  const workspace = __gate1SitemapRemovalPrevFreshV308(meta);
  gate1RemoveStandaloneSitemapV308(workspace);
  return workspace;
};

window.gate1RemoveStandaloneSitemapV308 = gate1RemoveStandaloneSitemapV308;
