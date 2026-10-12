import { readFile } from "node:fs/promises";

const sourcePath =
  process.env.GURU_PROJECT_EXPORT ||
  "/Users/vl/Downloads/guru-project-korichnoe-yabloko-all.json";
const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9339";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const expectedExplanations = {
  "site-audit": "Служебные страницы — не формальность, а сигналы доверия: есть ли адрес, реквизиты, условия гарантии, кто автор материала. По ним и поисковик, и человек решают, можно ли верить сайту. Задача — закрыть эти страницы реальным содержанием, а не пустыми заглушками.",
  "webmaster-company": "Это то, как поисковик реально видит сайт прямо сейчас — не то, что настроено, а то, что проиндексировано и без ошибок. Даже идеальный сайт бесполезен, если робот не может его обойти. Задача — убедиться, что технических препятствий для индексации нет.",
  "canonical-redirects": "Один сайт может открываться по разным адресам (с www и без, http и https). Поисковик должен видеть один главный адрес. Как проверить: введи в браузер все варианты адреса сайта, все они должны вести на один финальный https-адрес с кодом 200 или редиректом 301. Эталон: только один рабочий адрес, остальные редиректят на него. Если не так: нужна настройка редиректов на сервере.",
  "project-comparison": "Раздел показывает, что уже есть у сайтов конкурентов, чтобы не изобретать заново. Как заполнить: добавь 3-5 главных конкурентов, отметь у каждого, какие блоки есть (отзывы, доставка, блог, гарантии). Эталон: минимум 3 конкурента разобраны, по каждому пункту видно да/нет. Как использовать: если блок есть почти у всех, а у нас нет, это повод его добавить.",
  "keyword-foundations": "Ядро SEO — реальные слова и фразы, которыми люди ищут именно этот товар, подтверждённые спросом, а не придуманные. От них строится всё остальное: заголовки, тексты, структура посадочной. Задача — знать точно, что ищут, прежде чем решать, что показывать.",
  "seo-snippet": "Title и Description — то, что человек видит в выдаче ДО перехода на сайт. Слабый сниппет теряет клик даже при хорошей позиции в поиске. Задача — сформулировать заголовок и описание так, чтобы из десяти результатов выбрали именно этот.",
  "webmaster-product": "Страница может быть идеально сделана и всё равно не приносить трафика — если её просто нет в индексе поисковика. Это последняя проверка перед тем, как считать SEO-работу над товаром завершённой. Задача — убедиться, что страницу видит не только человек, но и поисковик.",
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

class CdpClient {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.sequence = 0;
    this.pending = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
    });
  }

  async call(method, params = {}) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const id = ++this.sequence;
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.socket.close();
  }
}

async function evaluate(page, expression) {
  const response = await page.call("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (response.exceptionDetails)
    throw new Error(
      response.exceptionDetails.exception?.description ||
        response.exceptionDetails.text,
    );
  return response.result.value;
}

async function waitFor(page, expression, timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await evaluate(page, `Boolean(${expression})`)) return;
    await wait(100);
  }
  throw new Error(`Timed out waiting for ${expression}`);
}

const exported = JSON.parse(await readFile(sourcePath, "utf8"));
const fixture = exported.workspace || exported.state || exported;
const browserVersion = await (
  await fetch(`http://127.0.0.1:${debugPort}/json/version`)
).json();
const browser = new CdpClient(browserVersion.webSocketDebuggerUrl);
await browser.ready;
const { browserContextId } = await browser.call("Target.createBrowserContext");
const { targetId } = await browser.call("Target.createTarget", {
  url: "about:blank",
  browserContextId,
});
const targets = await (
  await fetch(`http://127.0.0.1:${debugPort}/json`)
).json();
const target = targets.find((item) => item.id === targetId);
const page = new CdpClient(target.webSocketDebuggerUrl);
await page.ready;

try {
  await page.call("Runtime.enable");
  await page.call("Page.enable");
  await page.call("Page.addScriptToEvaluateOnNewDocument", {
    source: `{
      const nativeFetch = window.fetch.bind(window);
      window.fetch = (input, init) => String(input).includes("/api/")
        ? Promise.resolve(new Response(JSON.stringify({ ok: true, smoke: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }))
        : nativeFetch(input, init);
    }`,
  });
  await page.call("Page.navigate", { url: appUrl });
  await waitFor(page, 'document.readyState === "complete"');
  await waitFor(page, 'typeof bootstrapAppOnce === "function"');
  await evaluate(page, `(() => {
    localStorage.clear();
    localStorage.setItem("guru-platform-access-v01", "unlocked");
    localStorage.setItem("guru-platform-projects-v02", JSON.stringify([{
      id: "gate1-seo-v296-smoke",
      name: "Коза · SEO smoke",
      lifecycleStatus: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }]));
    localStorage.setItem(
      "guru-platform-workspace-v02-gate1-seo-v296-smoke",
      ${JSON.stringify(JSON.stringify(fixture))}
    );
    location.reload();
    return true;
  })()`);
  await waitFor(page, 'document.querySelector("[data-open-project]")');
  await evaluate(
    page,
    'document.querySelector("[data-open-project]").click(); true',
  );
  await waitFor(
    page,
    'Boolean(state) && typeof gate1SeoAuditV296 === "function"',
  );

  const setup = await evaluate(page, `(() => {
    let products = guruV194Products(state);
    let goat = products.find((item) => /Коза/i.test(item.name));
    let horse = products.find((item) => /лошад/i.test(item.name));
    if (!goat || !horse || goat.categoryId !== horse.categoryId) {
      const category = guruV189CreateCategory("Символы 2027 · SEO", state);
      const items = guruV189CatalogItems(state);
      if (!goat) {
        items.push({
          id: "seo-smoke-goat-v296",
          name: "Символ 2027 года «Коза»",
          continuum: "product",
          categoryId: category.id,
          createdAt: new Date().toISOString(),
        });
      }
      if (!horse || horse.categoryId !== (goat?.categoryId || category.id)) {
        items.push({
          id: "seo-smoke-horse-v296",
          name: "Создание лошадок",
          continuum: "product",
          categoryId: goat?.categoryId || category.id,
          createdAt: new Date().toISOString(),
        });
      }
      products = guruV194Products(state);
      goat = products.find((item) => /Коза/i.test(item.name));
      horse = products.find((item) => /лошад/i.test(item.name));
    }
    if (!goat || !horse) throw new Error("Two SEO products not found");

    const gate1 = state.gates.find((gate) => gate.id === "gate-1");
    const productCard = gate1.cards.find((card) =>
      normalizeGateTitle(card.title) === normalizeGateTitle("Карточка товара")
    ) || gate1.cards.find(g1pcIsProductCard);
    if (!productCard) throw new Error("Product card source not found");
    productCard.pageRows = productCard.pageRows || [];
    const ensureRow = (product, suffix) => {
      let row = productCard.pageRows.find((item) => item.catalogItemIdV189 === product.id);
      if (!row) {
        row = createPageStructureRow(product.name, false);
        row.catalogItemIdV189 = product.id;
        row.categoryId = product.categoryId;
        productCard.pageRows.push(row);
      }
      row.name = product.name;
      row.title = "SEO Title " + suffix;
      row.description = "SEO Description " + suffix;
      row.contextFields = row.contextFields || {};
      row.contextFields.seoKeywords = "ключ " + suffix + ", купить " + suffix;
      return row;
    };
    const goatRow = ensureRow(goat, "Коза");
    ensureRow(horse, "Лошадки");

    const gate0Foundation = guruV247KeywordFoundationRecord(goat, true, state);
    gate0Foundation.keywords = [
      { value: "авторская коза", source: "manual", status: "confirmed" },
      { value: "коза ручной работы", source: "manual", status: "draft" },
    ];
    const middle = guruGate1MiddleRecordV257(goatRow, true);
    middle.keywords = [
      { value: "подарок символ 2027", source: "generated", status: "confirmed" },
    ];

    Object.assign(gate1WebmasterStoreV295(state).company, {
      verificationMethod: "meta_tag",
      verificationStatus: "works",
      sitemapUrl: "https://k-apple.ru/sitemap.xml",
      sitemapStatus: "works",
      robotsStatus: "works",
      crawlErrorsStatus: "works",
      crawlErrors: "",
    });
    Object.assign(gate1WebmasterProductV295(goat.id, state, true), {
      landingIndexed: "yes",
      checkedNote: "10.09.2026 · Коза проверена",
    });
    Object.assign(gate1WebmasterProductV295(horse.id, state, true), {
      landingIndexed: "no",
      checkedNote: "10.09.2026 · Лошадки не в индексе",
    });

    const redirectCard = gate1.cards.find((card) =>
      normalizeGateTitle(card.title) === normalizeGateTitle("Канонический URL и редиректы")
    );
    if (redirectCard) {
      const redirects = ensureRedirectV130(redirectCard);
      redirects.canonicalUrl = "https://k-apple.ru/";
      redirects.rows[0].variant = "https://k-apple.ru/";
      redirects.rows[0].code = "200";
      redirects.rows[0].finalUrl = "https://k-apple.ru/";
      redirects.rows[0].status = "works";
    }

    const comparison = ensureProjectComparison();
    if (comparison?.competitors?.[0]) comparison.competitors[0].name = "SEO-конкурент";
    if (comparison?.summary)
      comparison.summary.differentiate = "LEGACY-ДУБЛЬ-НЕ-ЧИТАТЬ";
    const companyPositioning = guruV308ProjectPositioningRecord(state, true);
    guruV194UpdatePositioningPart(
      companyPositioning,
      "positioning_key_difference",
      "Авторская ручная работа",
    );

    const ui = guruV194Ui(state);
    ui.selectedCategoryId = goat.categoryId;
    ui.selectedProductId = goat.id;
    gate1WebmasterUpdateDerivedV295();
    guruNavigateToGate("gate-1");
    renderGate();
    return {
      build: window.GURU_BUILD_INFO?.version,
      goat: { id: goat.id, categoryId: goat.categoryId },
      horse: { id: horse.id, categoryId: horse.categoryId },
    };
  })()`);
  await waitFor(page, 'document.querySelector("[data-g1-seo-panel-v296]")');

  const initial = await evaluate(page, `(() => {
    const panel = document.querySelector('[data-g1-seo-panel-v296]');
    const selector = document.querySelector(
      '[data-guru-product-context="gate1-product-pages"] > .gate0-product-context-v194'
    );
    const company = panel.querySelector('[data-g1-seo-scope-v296="company"]');
    const product = panel.querySelector('[data-g1-seo-scope-v296="product"]');
    const keyDifferenceField = document.querySelector(
      '[data-project-comparison-key-difference-readonly] textarea',
    );
    const topKeys = [...panel.querySelectorAll('[data-g1-seo-item-v296]')]
      .map((node) => node.dataset.g1SeoItemV296);
    return {
      panelAfterSelector: selector?.nextElementSibling === panel,
      selectedProduct: panel.dataset.g1SeoSelectedProductV296,
      companyItems: company.querySelectorAll(':scope > .g1-seo-rows-v296 > [data-g1-seo-item-v296]').length,
      productItems: product.querySelectorAll(':scope > .g1-seo-rows-v296 > [data-g1-seo-item-v296]').length,
      topKeys,
      keywordCards: product.querySelectorAll('.g1-seo-keyword-levels-v296 > .guru-strategic-card-v245').length,
      sourceNotes: panel.querySelectorAll('.guru-strategic-source-v286, .guru-strategic-card-source-v245').length,
      editableFields: panel.querySelectorAll('input, textarea, select').length,
      hasSitemap: panel.textContent.includes('https://k-apple.ru/sitemap.xml'),
      hasSnippet: panel.textContent.includes('SEO Title Коза') && panel.textContent.includes('SEO Description Коза'),
      hasIndexing: panel.textContent.includes('Коза проверена'),
      keyDifference: {
        value: keyDifferenceField?.value || "",
        readOnly: keyDifferenceField?.readOnly === true,
        legacyBindingAbsent:
          !keyDifferenceField?.hasAttribute("data-project-comparison-summary"),
        legacyValue: state.projectComparison?.summary?.differentiate || "",
        legacyValueNotRendered:
          !keyDifferenceField?.value.includes("LEGACY-ДУБЛЬ-НЕ-ЧИТАТЬ"),
      },
      explanations: Object.fromEntries(
        [...panel.querySelectorAll('[data-g1-seo-explanation-v297]')].map((node) => {
          const key = node.dataset.g1SeoExplanationV297;
          const item = node.closest('[data-g1-seo-item-v296]');
          const title = item?.querySelector('strong');
          const style = getComputedStyle(node);
          return [key, {
            text: node.textContent.trim(),
            sharedClass: node.classList.contains('g3-product-journey-stage-explanation-v296'),
            visible: Boolean(node.getClientRects().length && style.display !== 'none' && style.visibility !== 'hidden'),
            afterTitle: Boolean(title && (title.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING)),
          }];
        })
      ),
      audit: gate1SeoAuditV296(),
      forbiddenStateKeys: [
        ...Object.keys(state || {}),
        ...Object.keys(state?.project || {}),
      ].filter((key) => /gate1Seo|seoPanel/i.test(key)),
    };
  })()`);

  const liveKeyDifference = await evaluate(page, `(() => {
    const record = guruV308ProjectPositioningRecord(state, true);
    guruV194UpdatePositioningPart(
      record,
      "positioning_key_difference",
      "Обновлённое ключевое отличие",
    );
    const legacyBefore = state.projectComparison.summary.differentiate;
    const staleInput = document.createElement("textarea");
    staleInput.dataset.projectComparisonSummary = "differentiate";
    staleInput.value = "СТАРЫЙ-ПУТЬ-ЗАПИСИ";
    const staleWriteBlocked = updateProjectComparisonInput(staleInput) === false;
    renderGate();
    const field = document.querySelector(
      '[data-project-comparison-key-difference-readonly] textarea',
    );
    return {
      value: field?.value || "",
      resolverValue: projectComparisonCompanyKeyDifference(),
      staleWriteBlocked,
      legacyUntouched:
        state.projectComparison.summary.differentiate === legacyBefore,
    };
  })()`);

  const switchResult = await evaluate(page, `(async () => {
    const select = document.querySelector(
      '[data-gate0-scope-product-select="gate1-product-pages"]'
    );
    select.value = ${JSON.stringify(setup.horse.id)};
    select.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const panel = document.querySelector('[data-g1-seo-panel-v296]');
    return {
      selectedProduct: panel?.dataset.g1SeoSelectedProductV296 || "",
      selectorValue: document.querySelector(
        '[data-gate0-scope-product-select="gate1-product-pages"]'
      )?.value || "",
      hasHorseSnippet: panel?.textContent.includes("SEO Title Лошадки") || false,
      hasHorseIndexing: panel?.textContent.includes("Лошадки не в индексе") || false,
      hasGoatSnippet: panel?.textContent.includes("SEO Title Коза") || false,
    };
  })()`);

  const liveSitemap = await evaluate(page, `(async () => {
    const input = document.querySelector('[data-g1-webmaster-company-v295="sitemapUrl"]');
    const nextUrl = "https://k-apple.ru/live-sitemap.xml";
    input.value = nextUrl;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await Promise.resolve();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const panel = document.querySelector('[data-g1-seo-panel-v296]');
    return {
      sourceValue: gate1WebmasterStoreV295(state).company.sitemapUrl,
      panelHasLiveValue: panel?.textContent.includes(nextUrl) || false,
      selectedProduct: panel?.dataset.g1SeoSelectedProductV296 || "",
    };
  })()`);

  assert(setup.build === "2.3.152", `Unexpected build ${setup.build}`);
  assert(
    initial.panelAfterSelector && initial.selectedProduct === setup.goat.id,
    `SEO panel placement/selection failed: ${JSON.stringify(initial)}`,
  );
  assert(
    initial.companyItems === 4 && initial.productItems === 3,
    `Company/Product item split failed: ${JSON.stringify(initial)}`,
  );
  assert(
    initial.keywordCards === 3 && initial.sourceNotes >= 9,
    `Existing compact cards or source notes are missing: ${JSON.stringify(initial)}`,
  );
  assert(
    initial.editableFields === 0 && initial.forbiddenStateKeys.length === 0 &&
      initial.audit.storageCreated === false,
    `SEO panel is not a pure read-only projection: ${JSON.stringify(initial)}`,
  );
  assert(
    initial.hasSitemap && initial.hasSnippet && initial.hasIndexing,
    `Existing sources were not read live: ${JSON.stringify(initial)}`,
  );
  assert(
    initial.keyDifference.value === "Авторская ручная работа" &&
      initial.keyDifference.readOnly &&
      initial.keyDifference.legacyBindingAbsent &&
      initial.keyDifference.legacyValue === "LEGACY-ДУБЛЬ-НЕ-ЧИТАТЬ" &&
      initial.keyDifference.legacyValueNotRendered,
    `Company key difference is not a read-only Gate 0 projection: ${JSON.stringify(initial.keyDifference)}`,
  );
  assert(
    liveKeyDifference.value === "Обновлённое ключевое отличие" &&
      liveKeyDifference.resolverValue === "Обновлённое ключевое отличие" &&
      liveKeyDifference.staleWriteBlocked &&
      liveKeyDifference.legacyUntouched,
    `Company key difference did not refresh safely: ${JSON.stringify(liveKeyDifference)}`,
  );
  assert(
    JSON.stringify(
      Object.fromEntries(
        Object.entries(initial.explanations).map(([key, value]) => [key, value.text]),
      ),
    ) === JSON.stringify(expectedExplanations) &&
      Object.values(initial.explanations).every(
        (value) => value.sharedClass && value.visible && value.afterTitle,
      ),
    `SEO explanations are missing, altered or use another component: ${JSON.stringify(initial.explanations)}`,
  );
  assert(
    switchResult.selectedProduct === setup.horse.id &&
      switchResult.selectorValue === setup.horse.id &&
      switchResult.hasHorseSnippet && switchResult.hasHorseIndexing &&
      !switchResult.hasGoatSnippet,
    `Product selector did not switch the SEO slice: ${JSON.stringify(switchResult)}`,
  );
  assert(
    liveSitemap.sourceValue === "https://k-apple.ru/live-sitemap.xml" &&
      liveSitemap.panelHasLiveValue &&
      liveSitemap.selectedProduct === setup.horse.id,
    `Sitemap did not refresh live: ${JSON.stringify(liveSitemap)}`,
  );

  console.log(
    JSON.stringify(
      {
        build: setup.build,
        initial,
        liveKeyDifference,
        switchResult,
        liveSitemap,
      },
      null,
      2,
    ),
  );
} finally {
  page.close();
  await browser.call("Target.disposeBrowserContext", { browserContextId });
  browser.close();
}
