const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9355";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

async function waitFor(page, expression, timeoutMs = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await evaluate(page, `Boolean(${expression})`)) return;
    await wait(100);
  }
  throw new Error(`Timed out waiting for ${expression}`);
}

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
const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
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
      window.__guruErrors = [];
      window.addEventListener("error", (event) => window.__guruErrors.push(event.message));
      window.addEventListener("unhandledrejection", (event) =>
        window.__guruErrors.push(String(event.reason?.message || event.reason))
      );
    }`,
  });
  await page.call("Page.navigate", { url: appUrl });
  await waitFor(page, 'document.readyState === "complete"');
  await waitFor(page, 'typeof bootstrapAppOnce === "function" && typeof gate1BlogStoreV304 === "function"');
  await evaluate(page, `(() => {
    const workspace = structuredClone(window.GURU_SEED);
    workspace.project.id = "gate1-blog-v304-smoke";
    workspace.project.name = "Gate 1 Blog smoke";
    localStorage.clear();
    localStorage.setItem("guru-platform-access-v01", "unlocked");
    localStorage.setItem("guru-platform-projects-v02", JSON.stringify([{
      id: workspace.project.id,
      name: workspace.project.name,
      lifecycleStatus: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }]));
    localStorage.setItem(
      "guru-platform-workspace-v02-" + workspace.project.id,
      JSON.stringify(workspace),
    );
    location.reload();
  })()`);
  await waitFor(page, 'document.querySelector("[data-open-project]")');
  await evaluate(page, 'document.querySelector("[data-open-project]").click(); true');
  await waitFor(page, 'Boolean(state) && typeof gate1BlogInjectV304 === "function"');

  const setup = await evaluate(page, `(() => {
    const gate1 = state.gates.find((gate) => gate.id === "gate-1");
    const card25 = gate1.cards.find((card) => card.id === "card-25");
    const category = guruV189CreateCategory("Тестовая категория блога", state);
    const products = guruV189CatalogItems(state);
    const goat = {
      id: "gate1-blog-goat-v304",
      name: "Коза",
      categoryId: category.id,
      continuum: "pure_product",
      createdAt: new Date().toISOString()
    };
    const horse = {
      id: "gate1-blog-horse-v304",
      name: "Лошадка",
      categoryId: category.id,
      continuum: "pure_product",
      createdAt: new Date().toISOString()
    };
    products.push(goat, horse);
    const records = guruV194Records(state);
    records.push(
      {
        id: "gate1-blog-jtbd-v304",
        field: "jtbd",
        scope: "product",
        product_id: goat.id,
        category_id: category.id,
        value: "Когда нужен памятный подарок, клиент хочет выбрать авторскую Козу.",
        confirmation_status: "confirmed"
      },
      {
        id: "gate1-blog-segment-v304",
        field: "segments",
        scope: "product",
        product_id: goat.id,
        category_id: category.id,
        value: "Покупатели необычных подарков",
        confirmation_status: "confirmed"
      }
    );
    const ui = guruV194Ui(state);
    ui.selectedCategoryId = category.id;
    ui.selectedProductId = goat.id;
    activeGateId = "gate-1";
    renderGate();
    return { goatId: goat.id, horseId: horse.id, count: gate1.cards.length };
  })()`);
  await waitFor(page, 'document.querySelector("[data-gate1-blog-company-v304]") && document.querySelector("[data-gate1-blog-product-v304]")');
  await wait(300);
  await evaluate(page, `(() => {
    const gate1 = state.gates.find((gate) => gate.id === "gate-1");
    const card25 = gate1.cards.find((card) => card.id === "card-25");
    window.__gate1BlogBefore = {
      count: gate1.cards.length,
      card25: JSON.stringify(card25),
      cards: JSON.stringify(gate1.cards),
    };
    window.__gate1BlogOtherGates = JSON.stringify(
      state.gates.filter((gate) => gate.id !== "gate-1"),
    );
    return true;
  })()`);

  const createdId = await evaluate(page, `(() => {
    document.querySelector("[data-gate1-blog-create-v304]").click();
    return gate1BlogStoreV304(state).articles.at(-1).id;
  })()`);
  await waitFor(page, `document.querySelector('[data-gate1-blog-article-v304="${createdId}"]')`);

  await evaluate(page, `(() => {
    const articleId = ${JSON.stringify(createdId)};
    const setInput = (selector, value) => {
      const input = document.querySelector(selector);
      if (!input) throw new Error("Missing blog field: " + selector);
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    };
    const base = '[data-gate1-blog-article-id-v304="' + articleId + '"]';
    setInput(base + '[data-gate1-blog-article-field-v304="title"]', "Как выбрать авторскую Козу в подарок");
    setInput(base + '[data-gate1-blog-article-field-v304="publication_date"]', "2026-09-10");
    setInput(base + '[data-gate1-blog-article-field-v304="updated_date"]', "2026-09-12");
    setInput(base + '[data-gate1-blog-article-field-v304="reading_minutes"]', "7");
    setInput(base + '[data-gate1-blog-article-field-v304="summary"]', "Практическое руководство по выбору авторского подарка.");
    setInput(base + '[data-gate1-blog-toc-index-v304="0"]', "Кому подойдёт такой подарок");
    setInput(base + '[data-gate1-blog-faq-index-v304="0"][data-gate1-blog-faq-field-v304="question"]', "Как выбрать размер?");
    setInput(base + '[data-gate1-blog-faq-index-v304="0"][data-gate1-blog-faq-field-v304="answer"]', "Сверьте размеры изделия и место размещения.");
    setInput(base + '[data-gate1-blog-author-field-v304="name"]', "Анна Авторова");
    setInput(base + '[data-gate1-blog-author-field-v304="role"]', "Редактор блога");
    setInput(base + '[data-gate1-blog-author-field-v304="credentials"]', "Эксперт по авторским подаркам");
    setInput(base + '[data-gate1-blog-author-field-v304="social_url"]', "https://example.com/author");
    gate1BlogRefreshV304();
    const picker = document.querySelector("[data-gate1-blog-link-select-v304]");
    picker.value = articleId;
    const button = document.querySelector('[data-gate1-blog-link-selected-v304="${setup.goatId}"]');
    button.click();
    return true;
  })()`);
  await waitFor(page, `document.querySelector('[data-gate1-blog-linked-article-v304="${createdId}"]')`);

  await evaluate(page, `(() => {
    const status = document.querySelector(
      '[data-gate1-blog-link-status-v304][data-gate1-blog-article-id-v304="${createdId}"]',
    );
    status.value = "published";
    status.dispatchEvent(new Event("change", { bubbles: true }));
    const horseLink = document.querySelector(
      '[data-gate1-blog-product-link-v304="${setup.horseId}"][data-gate1-blog-article-id-v304="${createdId}"]',
    );
    horseLink.checked = true;
    horseLink.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  })()`);

  const result = await evaluate(page, `(() => {
    const root = document.querySelector(".g1-redesign");
    const gate1 = state.gates.find((gate) => gate.id === "gate-1");
    const card25 = gate1.cards.find((card) => card.id === "card-25");
    const companyBlog = root.querySelector(":scope > [data-gate1-blog-company-v304]");
    const productBlog = root.querySelector(":scope > [data-gate1-blog-product-v304]");
    const productDivider = [...root.querySelectorAll(":scope > .gate0-section-heading")].find(
      (node) => node.querySelector(".gate0-section-heading-title")?.textContent.trim() === "Продукт / Услуга",
    );
    const selector = root.querySelector(':scope > [data-guru-product-context="gate1-product-pages"]');
    const productCard = root.querySelector(':scope > [data-card="card-24"]');
    const seo = root.querySelector(':scope > [data-g1-seo-central-v298="product"]');
    const demand = root.querySelector(':scope > .g1-section > [data-gate1-toggle-section="pain_jtbd_offer"]')?.closest('.g1-section');
    const economics = root.querySelector(':scope > .g1-section > [data-gate1-toggle-section="unit_economics"]')?.closest('.g1-section');
    const productComparison = root.querySelector(':scope > .project-comparison-product-v309');
    const article = gate1BlogStoreV304(state).articles.find(
      (item) => item.id === ${JSON.stringify(createdId)},
    );
    const linkedDom = productBlog.querySelector(
      '[data-gate1-blog-linked-article-v304="${createdId}"]',
    );
    return {
      beforeCount: window.__gate1BlogBefore.count,
      afterCount: gate1.cards.length,
      allCardsUnchanged: window.__gate1BlogBefore.cards === JSON.stringify(gate1.cards),
      card25Unchanged: window.__gate1BlogBefore.card25 === JSON.stringify(card25),
      card25Title: card25?.title,
      otherGatesUnchanged: window.__gate1BlogOtherGates === JSON.stringify(
        state.gates.filter((gate) => gate.id !== "gate-1"),
      ),
      separateStorage: Boolean(state.gate1BlogV304) &&
        !Object.prototype.hasOwnProperty.call(card25 || {}, "gate1BlogV304"),
      companyBeforeProductDivider: Boolean(
        companyBlog && productDivider &&
        (companyBlog.compareDocumentPosition(productDivider) & Node.DOCUMENT_POSITION_FOLLOWING),
      ),
      productOrder: Boolean(
        productDivider?.nextElementSibling === selector &&
        selector?.querySelector('[data-guru-strategic-foundation]') &&
        selector?.nextElementSibling === productCard &&
        productCard?.nextElementSibling === seo &&
        seo?.nextElementSibling === demand &&
        demand?.nextElementSibling === productBlog &&
        productBlog?.nextElementSibling === economics &&
        economics?.nextElementSibling === productComparison,
      ),
      blocks: Boolean(companyBlog && productBlog),
      hubRow: Boolean(companyBlog.querySelector(
        '[data-gate1-blog-hub-article-v304="${createdId}"]',
      )),
      requiredTemplate: gate1BlogArticleReadyV304(article),
      faqCount: article.faq.length,
      author: article.author,
      productIds: article.product_links.map((link) => link.product_id).sort(),
      goatStatus: article.product_links.find((link) => link.product_id === ${JSON.stringify(setup.goatId)})?.status,
      linkedVisible: Boolean(linkedDom) && linkedDom.textContent.includes("Как выбрать авторскую Козу"),
      contextText: productBlog.querySelector(".gate1-blog-context-v304")?.textContent || "",
      errors: window.__guruErrors || [],
    };
  })()`);

  console.log(JSON.stringify({ setup, result }, null, 2));
  assert(setup.count > 0 && result.beforeCount === setup.count && result.afterCount === setup.count, `Gate 1 card count changed: ${JSON.stringify({ setup: setup.count, before: result.beforeCount, after: result.afterCount })}`);
  assert(result.allCardsUnchanged, "One or more existing Gate 1 cards changed during Blog interactions");
  assert(result.card25Unchanged && result.card25Title === "СТАТЬЯ БЛОГА", "card-25 changed while adding the separate Blog system");
  assert(result.otherGatesUnchanged, "A non-Gate-1 gate changed during Blog interactions");
  assert(result.separateStorage, "Blog data crossed into the existing Audit card storage");
  assert(result.blocks && result.companyBeforeProductDivider && result.productOrder, "Blog Company/Product blocks are missing or mounted in the wrong Gate 1 positions");
  assert(result.hubRow && result.requiredTemplate && result.faqCount >= 1, "The article template or hub reference row is incomplete");
  assert(JSON.stringify(result.productIds) === JSON.stringify([setup.goatId, setup.horseId].sort()), "Many-to-many product links were not preserved");
  assert(result.goatStatus === "published" && result.linkedVisible, "The Goat article/status is not visible in the Product Blog block");
  assert(result.contextText.includes("памятный подарок") && result.contextText.includes("Покупатели необычных подарков"), "Live JTBD/Segment context is missing from Product Blog");
  assert(result.errors.length === 0, `Runtime errors: ${result.errors.join(" | ")}`);
} finally {
  page.close();
  await browser.call("Target.disposeBrowserContext", { browserContextId });
  browser.close();
}
