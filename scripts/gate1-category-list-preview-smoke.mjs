import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";

const port = process.env.GURU_LOCAL_PORT || "3189";
const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9347";
const screenshotPath = process.env.GURU_PREVIEW_SCREENSHOT || "";
const screenshotWidth = Number(process.env.GURU_PREVIEW_WIDTH || 1440);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const pages = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
const page = pages.find((entry) => entry.type === "page");
if (!page) throw new Error("Headless Chrome page was not found");

const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});
let sequence = 0;
const pending = new Map();
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (!message.id) return;
  const entry = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) entry.reject(new Error(message.error.message));
  else entry.resolve(message.result);
});
const call = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence;
  const timeout = setTimeout(() => {
    pending.delete(id);
    reject(new Error(`Chrome command timed out: ${method}`));
  }, 20000);
  pending.set(id, {
    resolve: (value) => { clearTimeout(timeout); resolve(value); },
    reject: (error) => { clearTimeout(timeout); reject(error); },
  });
  socket.send(JSON.stringify({ id, method, params }));
});
const evaluate = async (expression) => {
  const response = await call("Runtime.evaluate", {
    expression, returnByValue: true, awaitPromise: true,
  });
  if (response.exceptionDetails) throw new Error(
    response.exceptionDetails.exception?.description || response.exceptionDetails.text);
  return response.result.value;
};

try {
  console.log("Connecting to app");
  await call("Runtime.enable");
  await call("Page.enable");
  await call("Page.navigate", { url: `http://127.0.0.1:${port}/` });
  await wait(900);
  console.log("Preparing isolated project");
  await evaluate(`(() => {
    localStorage.clear();
    localStorage.setItem("guru-platform-access-v01", "unlocked");
    const project = {
      id: "category-list-preview-smoke", name: "Category list preview smoke",
      lifecycleStatus: "active", createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem("guru-platform-projects-v02", JSON.stringify([project]));
    localStorage.setItem(WORKSPACE_STORAGE_PREFIX + project.id,
      JSON.stringify(createFreshWorkspace(project)));
    location.reload();
  })()`);
  await wait(1000);
  console.log("Opening project");
  await evaluate('document.querySelector("[data-open-project]")?.click(); true');
  await wait(1200);

  console.log("Checking category preview");
  const result = await evaluate(`(() => {
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};
    const category = guruV189CreateCategory("Новогодние подарки 2027", state);
    if (!category) throw new Error("Category was not created");
    guruCategoryAuditRowsV491(state);
    const card = findCard("card-22");
    const row = card.pageRows.find((item) => item.categoryId === category.id);
    if (!row) throw new Error("Category audit row was not created");
    const products = state.project.catalogItemsV189 ||= [];
    products.push(
      { id: "smoke-hat", name: "Шапка Коза", continuum: "physical_product", createdAt: new Date().toISOString() },
      { id: "smoke-goat", name: "Символ 2027 года «Коза»", continuum: "physical_product", createdAt: new Date().toISOString() }
    );
    const relations = megaPlatformCategoryStore(state);
    relations.categoryIdsByProduct["smoke-hat"] = [category.id];
    relations.categoryIdsByProduct["smoke-goat"] = [category.id];
    relations.productOrderByCategory[category.id] = ["smoke-goat", "smoke-hat"];
    const urls = megaPlatformUrlStore(state);
    urls.products["smoke-goat"] = "https://example.test/goat";
    const productCard = findCard("card-24");
    productCard.pageRows.push({
      id: "smoke-goat-page", name: "Символ 2027 года «Коза»",
      catalogItemIdV189: "smoke-goat", contextFields: {
        productHeroShortDescriptionV254: "Текстильная коза ручной работы",
        productPrice: "4 900 р."
      }, productGalleryPhotos: [{ id: "smoke-photo", dataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO6Z9r8AAAAASUVORK5CYII=" }],
      productGalleryMainPhotoId: "smoke-photo"
    });
    const section = v22TemplateForCard(card).sections.find((item) => item.key === "catalog_filters");
    const visual = guruCategorySectionContentV510(card, row, card.pageRows.indexOf(row), section).visual;
    const fixture = document.createElement("div");
    fixture.dataset.pageSourceCard = "card-22";
    fixture.innerHTML = '<details open data-v22-site-section="catalog_filters"><summary><span class="v22-section-status"></span></summary>' + visual + '</details>';
    document.body.append(fixture);
    if (${Boolean(screenshotPath)}) {
      fixture.style.cssText = "position:fixed;inset:0;z-index:99999;overflow:auto;background:#fff;padding:24px max(24px,10vw)";
    }
    const articles = [...fixture.querySelectorAll(".guru-category-product-v516")];
    const tokenColor = (name) => {
      const probe = document.createElement("span");
      probe.style.color = 'var(' + name + ')';
      fixture.append(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      return color;
    };
    const before = {
      title: section.title,
      names: articles.map((article) => article.querySelector("h3")?.textContent),
      description: articles[0]?.querySelector(".guru-category-product-copy-v516 p")?.textContent,
      price: articles[0]?.querySelector(".guru-category-product-copy-v516 strong")?.textContent,
      imageCount: fixture.querySelectorAll(".guru-category-product-image-v516 img").length,
      status: v22SectionStatus(row, section),
      listColumns: getComputedStyle(fixture.querySelector(".guru-category-product-list-v516")).gridTemplateColumns.split(" ").length,
      oldGrid: Boolean(fixture.querySelector(".guru-hub-preview-grid-v504")),
      urlAsCardCopy: fixture.querySelector(".guru-category-product-copy-v516")?.textContent.includes("https://example.test"),
      palette: {
        textToken: tokenColor("--text"),
        accentToken: tokenColor("--accent"),
        panelToken: tokenColor("--panel"),
        lineToken: tokenColor("--line"),
        softToken: tokenColor("--panel-soft"),
        title: getComputedStyle(articles[0].querySelector("h3")).color,
        price: getComputedStyle(articles[0].querySelector("strong")).color,
        primary: getComputedStyle(articles[0].querySelector(".guru-category-product-actions-v516 span")).backgroundColor,
        secondary: getComputedStyle(articles[0].querySelector(".guru-category-product-actions-v516 span + span")).color,
        card: getComputedStyle(articles[0]).backgroundColor,
        border: getComputedStyle(articles[0]).borderTopColor,
        section: getComputedStyle(fixture.querySelector(".guru-category-products-v510")).backgroundColor
      }
    };
    const hat = articles[1];
    const description = hat.querySelector('[data-guru-category-card-field-v516="description"]');
    description.value = "Тёплая шапка с ушками Козы";
    description.dispatchEvent(new Event("input", { bubbles: true }));
    const image = hat.querySelector('[data-guru-category-card-field-v516="image"]');
    image.value = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO6Z9r8AAAAASUVORK5CYII=";
    image.dispatchEvent(new Event("input", { bubbles: true }));
    image.dispatchEvent(new Event("change", { bubbles: true }));
    const after = {
      description: hat.querySelector(".guru-category-product-copy-v516 p")?.textContent,
      image: Boolean(hat.querySelector(".guru-category-product-image-v516 img")),
      saved: row.contextFields.catalogProductCardsV516["smoke-hat"],
      statusWithoutUrl: v22SectionStatus(row, section)
    };
    urls.products["smoke-hat"] = "https://example.test/hat";
    after.statusWithUrl = v22SectionStatus(row, section);
    if (!${Boolean(screenshotPath)}) fixture.remove();
    return { before, after };
  })()`);

  assert.equal(result.before.title, "2. Товары · список");
  assert.deepEqual(result.before.names, ["Символ 2027 года «Коза»", "Шапка Коза"]);
  assert.equal(result.before.description, "Текстильная коза ручной работы");
  assert.equal(result.before.price, "4 900 р.");
  assert.equal(result.before.imageCount, 1);
  assert.equal(result.before.status, "in_progress");
  assert.equal(result.before.listColumns, 1);
  assert.equal(result.before.oldGrid, false);
  assert.equal(result.before.urlAsCardCopy, false);
  assert.equal(result.before.palette.title, result.before.palette.textToken);
  assert.equal(result.before.palette.price, result.before.palette.textToken);
  assert.equal(result.before.palette.primary, result.before.palette.accentToken);
  assert.equal(result.before.palette.secondary, result.before.palette.textToken);
  assert.equal(result.before.palette.card, result.before.palette.panelToken);
  assert.equal(result.before.palette.border, result.before.palette.lineToken);
  assert.equal(result.before.palette.section, result.before.palette.softToken);
  assert.equal(result.after.description, "Тёплая шапка с ушками Козы");
  assert.equal(result.after.image, true);
  assert.equal(result.after.saved.description, "Тёплая шапка с ушками Козы");
  assert.equal(result.after.statusWithoutUrl, "in_progress");
  assert.equal(result.after.statusWithUrl, "ready");
  await wait(250);
  const persisted = await evaluate(`(() => {
    const workspace = JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_PREFIX + activeProjectId) || "null");
    const row = workspace?.gates?.find((gate) => gate.id === "gate-1")?.cards
      ?.find((card) => card.id === "card-22")?.pageRows
      ?.find((item) => item.name === "Новогодние подарки 2027");
    return row?.contextFields?.catalogProductCardsV516?.["smoke-hat"]?.description || "";
  })()`);
  assert.equal(persisted, "Тёплая шапка с ушками Козы");
  if (screenshotPath) {
    await call("Emulation.setDeviceMetricsOverride", {
      width: screenshotWidth, height: 1000, deviceScaleFactor: 1, mobile: false,
    });
    const screenshot = await call("Page.captureScreenshot", { format: "png" });
    await writeFile(screenshotPath, Buffer.from(screenshot.data, "base64"));
  }
  console.log("Gate 1 category list preview smoke passed");
} finally {
  socket.close();
}
