/* ================================================================
   Gate 1 · Сравнение проектов → состав Карточки товара (v306).

   Read-only сопоставление: текстовые ячейки сохранённых конкурентов
   сравниваются с семью существующими блоками выбранной Карточки товара.
   Ни projectComparison, ни pageRows, ни gate-1.cards не изменяются.
   ================================================================ */

const GATE1_COMPARISON_PRODUCT_CARD_V306 =
  "gate1-comparison-product-card-v306";

const GATE1_COMPARISON_PRODUCT_BLOCKS_V306 = Object.freeze([
  {
    key: "productHeroV253",
    title: "Герой товара",
    binary: false,
    signals: [
      ["первый экран", "перв(?:ый|ом)\\s+экран"],
      ["герой товара", "геро(?:й|е|я)\\s+(?:товар|карточк)"],
      ["H1 + цена + CTA", "h1.{0,35}(?:цен|cta|кноп)|(?:цен|cta|кноп).{0,35}h1"],
      ["кнопка покупки", "(?:в\\s+корзин|кнопк.{0,20}(?:купить|заказ)|быстр(?:ый|ого)\\s+заказ)"],
    ],
  },
  {
    key: "productGalleryV253",
    title: "Галерея изделия",
    binary: false,
    signals: [
      ["галерея", "галере"],
      ["фото товара", "(?:фото|фотограф|изображен).{0,24}(?:товар|издели)|(?:товар|издели).{0,24}(?:фото|фотограф|изображен)"],
      ["видео товара", "видео.{0,24}(?:товар|издели)|(?:товар|издели).{0,24}видео"],
      ["слайдер изображений", "слайдер.{0,20}(?:фото|изображен)"],
    ],
  },
  {
    key: "productDeliveryGuaranteeV253",
    title: "Доставка / оплата / гарантия",
    binary: false,
    signals: [
      ["доставка", "доставк"],
      ["оплата", "оплат"],
      ["гарантия", "гаранти"],
      ["возврат", "возврат"],
    ],
  },
  {
    key: "productMeaningV253",
    title: "Смысл товара",
    binary: false,
    signals: [
      ["смысл товара", "смысл.{0,20}(?:товар|издели)"],
      ["описание товара", "описан.{0,20}(?:товар|издели)|(?:товар|издели).{0,20}описан"],
      ["история товара", "истори.{0,20}(?:товар|издели)|(?:товар|издели).{0,20}истори"],
      ["выгоды / преимущества", "(?:выгод|преимуществ).{0,25}(?:товар|издели)|(?:товар|издели).{0,25}(?:выгод|преимуществ)"],
    ],
  },
  {
    key: "productCreationV253",
    title: "Как создаётся",
    binary: false,
    signals: [
      ["как создаётся", "как\\s+(?:созда|дела|изготавлива)"],
      ["процесс изготовления", "процесс.{0,24}(?:создан|изготов|производств)"],
      ["мастерская / производство", "мастерск|производств"],
      ["ручная работа", "ручн(?:ая|ой|ую|ое)\\s+работ"],
    ],
  },
  {
    key: "productFinalCtaImplementedV253",
    title: "Финальный CTA",
    binary: true,
    signals: [
      ["финальный CTA", "финальн.{0,18}(?:cta|ст[а-я]*|призыв|кнопк|экран)"],
      ["нижний CTA", "(?:нижн|bottom).{0,18}cta"],
      ["завершающий призыв", "завершающ.{0,22}(?:призыв|кнопк|действ|экран)"],
      ["CTA в конце страницы", "(?:cta|призыв|кнопк).{0,25}(?:конц|низ).{0,15}страниц"],
    ],
  },
  {
    key: "productRelatedImplementedV253",
    title: "Похожие изделия",
    binary: true,
    signals: [
      ["похожие товары", "похож.{0,18}(?:товар|издели|продукт)"],
      ["рекомендации", "рекоменд.{0,22}(?:товар|издели|продукт)"],
      ["с этим покупают", "с\\s+этим\\s+(?:также\\s+)?покупа"],
      ["cross-sell", "cross[\\s-]?sell|кросс[\\s-]?селл"],
      ["смотрите также", "смотрите\\s+также"],
      ["сопутствующие товары", "сопутствующ.{0,18}(?:товар|издели|продукт)"],
    ],
  },
]);

function gate1ComparisonProductTextV306(value) {
  return String(value ?? "").trim();
}

function gate1ComparisonProductCellV306(criterion, competitorId) {
  const stored = criterion?.cells?.[competitorId];
  if (typeof stored === "string") return stored.trim();
  return stored && typeof stored === "object"
    ? gate1ComparisonProductTextV306(stored.text)
    : "";
}

function gate1ComparisonProductNegativeCellV306(value) {
  return /^(?:нет|не[т]?|без|отсутствует|не\s+(?:реализовано|представлено|найдено)|[—–-]|0)$/iu.test(
    gate1ComparisonProductTextV306(value),
  );
}

function gate1ComparisonProductPositiveMatchV306(text, source) {
  const expression = new RegExp(source, "giu");
  let match;
  while ((match = expression.exec(text))) {
    const before = text.slice(Math.max(0, match.index - 34), match.index);
    const after = text.slice(match.index + match[0].length, match.index + match[0].length + 28);
    const negatedBefore = /(?:^|[\s,;:—–-])(?:нет|без|отсутств\w*|не\s+(?:есть|реализ\w*|представ\w*))\s*$/iu.test(
      before,
    );
    const negatedAfter = /^\s*(?:нет|отсутств\w*|не\s+(?:реализ\w*|представ\w*))/iu.test(
      after,
    );
    if (!negatedBefore && !negatedAfter) return true;
    if (expression.lastIndex === match.index) expression.lastIndex += 1;
  }
  return false;
}

function gate1ComparisonProductCriterionTextV306(criterion, competitorId) {
  const cell = gate1ComparisonProductCellV306(criterion, competitorId);
  if (!cell || gate1ComparisonProductNegativeCellV306(cell)) return "";
  const isCustom = !projectComparisonCoreDefinition(criterion);
  const cellIsAffirmative = /^(?:да|есть|реализовано|представлено|используется|работает)$/iu.test(cell);
  return isCustom || cellIsAffirmative
    ? `${gate1ComparisonProductTextV306(criterion?.name)}\n${cell}`
    : cell;
}

function gate1ComparisonProductMarketV306(model = state?.projectComparison) {
  const competitors = Array.isArray(model?.competitors) ? model.competitors : [];
  const criteria = Array.isArray(model?.criteria) ? model.criteria : [];
  const filledCompetitors = competitors.filter((competitor) =>
    criteria.some((criterion) =>
      gate1ComparisonProductCellV306(criterion, competitor.id),
    ),
  );
  const blocks = GATE1_COMPARISON_PRODUCT_BLOCKS_V306.map((definition) => {
    const matches = competitors.reduce((result, competitor) => {
      const signals = new Set();
      criteria.forEach((criterion) => {
        const text = gate1ComparisonProductCriterionTextV306(
          criterion,
          competitor.id,
        );
        if (!text) return;
        definition.signals.forEach(([label, source]) => {
          if (gate1ComparisonProductPositiveMatchV306(text, source))
            signals.add(label);
        });
      });
      if (signals.size)
        result.push({
          id: competitor.id,
          name: gate1ComparisonProductTextV306(competitor.name) || "Конкурент",
          signals: [...signals],
        });
      return result;
    }, []);
    return {
      ...definition,
      count: matches.length,
      total: competitors.length,
      majority: competitors.length > 0 && matches.length > competitors.length / 2,
      matches,
      signals: [...new Set(matches.flatMap((match) => match.signals))],
    };
  });
  return {
    competitors,
    filledCompetitors,
    blocks,
    majority: blocks.filter((block) => block.majority),
  };
}

function gate1ComparisonProductOwnV306() {
  const product = typeof guruV194SelectedProduct === "function"
    ? guruV194SelectedProduct(state)
    : null;
  const page = product && typeof gate1SeoSelectedPageV298 === "function"
    ? gate1SeoSelectedPageV298(product)
    : { card: null, row: null, index: -1 };
  const row = page?.row || null;
  const context = row?.contextFields || {};
  const blocks = GATE1_COMPARISON_PRODUCT_BLOCKS_V306.map((definition) => {
    const present = definition.binary
      ? gate1ComparisonProductTextV306(context[definition.key]).toLowerCase() === "yes"
      : typeof guruStatusIsPresent === "function"
        ? guruStatusIsPresent(context[`${definition.key}__flag`])
        : ["works", "needs_improvement", "broken"].includes(
            String(context[`${definition.key}__flag`] || ""),
          );
    return { key: definition.key, title: definition.title, present };
  });
  return {
    product,
    card: page?.card || null,
    row,
    blocks,
  };
}

function gate1ComparisonProductSummaryHtmlV306() {
  const market = gate1ComparisonProductMarketV306();
  const own = gate1ComparisonProductOwnV306();
  const ownByKey = new Map(own.blocks.map((block) => [block.key, block]));
  const missing = market.majority.filter((block) => !ownByKey.get(block.key)?.present);
  const productLabel = own.product?.name
    ? `Выбранный товар: ${own.product.name}`
    : "Товар не выбран";
  let body = "";
  if (!market.competitors.length) {
    body = '<div class="gate1-comparison-product-empty-v306">Добавьте конкурентов и опишите элементы их карточек товара в таблице сравнения.</div>';
  } else if (!market.filledCompetitors.length) {
    body = `<div class="gate1-comparison-product-empty-v306">Сохранено конкурентов: ${market.competitors.length}, но их ячейки пока пусты. Нельзя честно определить состав карточек без текстовых данных.</div>`;
  } else if (!market.majority.length) {
    body = '<div class="gate1-comparison-product-empty-v306">В заполненных ячейках пока нет элементов, которые встречаются более чем у половины сохранённых конкурентов.</div>';
  } else {
    body = `<div class="gate1-comparison-product-list-v306">${market.majority
      .map((block) => {
        const ownBlock = ownByKey.get(block.key);
        const present = Boolean(own.row && ownBlock?.present);
        return `<article data-g1-comparison-product-block-v306="${escapeAttr(block.key)}" class="${present ? "is-confirmed" : "is-missing"}">
          <div><strong>${escapeHtml(block.title)}</strong><span>У ${block.count} из ${block.total} · ${escapeHtml(block.signals.join(", "))}</span></div>
          <b>${own.row ? `У нас: ${present ? "подтверждено" : "отсутствует"}` : "У нас: карточка не выбрана"}</b>
        </article>`;
      })
      .join("")}</div>
      <div class="gate1-comparison-product-action-v306"><strong>Стоит проверить/добавить:</strong> ${escapeHtml(
        own.row
          ? missing.map((block) => block.title).join(", ") || "расхождений не найдено"
          : "сначала выберите товар",
      )}</div>`;
  }
  return `<section class="gate1-comparison-product-summary-v306" data-g1-comparison-product-summary-v306="1" data-g1-comparison-product-majority-v306="${market.majority.length}">
    <header><div><strong>Состав карточки товара по конкурентам</strong><span>У конкурентов чаще всего есть: сопоставление со всеми 7 существующими блоками</span></div><small>${escapeHtml(productLabel)}</small></header>
    ${body}
    <p>Read-only вывод по текстам projectComparison. Карточка товара автоматически не изменяется.</p>
  </section>`;
}

function gate1ComparisonProductSummaryNodeV306() {
  const template = document.createElement("template");
  template.innerHTML = gate1ComparisonProductSummaryHtmlV306().trim();
  return template.content.firstElementChild;
}

function gate1ComparisonProductInjectV306() {
  if (activeGateId !== "gate-1") return;
  const root = els.contentArea?.querySelector?.(".g1-redesign");
  const comparison = root?.querySelector?.(
    '[data-g1-company-block-v299="seo-audit"] [data-g1-seo-item-v296="project-comparison"]',
  );
  const body = comparison?.querySelector?.(":scope > .project-comparison-body");
  if (!body || body.querySelector(":scope > [data-g1-comparison-product-summary-v306]"))
    return;
  const summary = gate1ComparisonProductSummaryNodeV306();
  const toolbar = body.querySelector(":scope > .project-comparison-toolbar");
  if (toolbar) toolbar.insertAdjacentElement("afterend", summary);
  else body.prepend(summary);
}

function gate1ComparisonProductRefreshV306() {
  if (activeGateId !== "gate-1") return;
  const current = els.contentArea?.querySelector?.(
    "[data-g1-comparison-product-summary-v306]",
  );
  if (current) current.replaceWith(gate1ComparisonProductSummaryNodeV306());
  else gate1ComparisonProductInjectV306();
}

const __gate1ComparisonProductPrevRenderV306 = renderGate1Accordion;
renderGate1Accordion = function (gate, cards) {
  const result = __gate1ComparisonProductPrevRenderV306.apply(this, arguments);
  gate1ComparisonProductInjectV306();
  return result;
};

function gate1ComparisonProductInputV306(event) {
  if (!event.target?.closest?.(
    "[data-project-comparison-cell], [data-project-comparison-criterion], [data-project-comparison-competitor]",
  ))
    return;
  queueMicrotask(gate1ComparisonProductRefreshV306);
}

document.addEventListener("input", gate1ComparisonProductInputV306);
document.addEventListener("change", gate1ComparisonProductInputV306);

if (activeGateId === "gate-1") gate1ComparisonProductInjectV306();
