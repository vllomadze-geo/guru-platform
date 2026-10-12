import { readFile, writeFile } from "node:fs/promises";
import XLSX from "xlsx";

const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9395";
const fullPath = process.env.GURU_PROJECT_EXPORT || "/Users/vl/Downloads/guru-project-korichnoe-yabloko-all.json";
const gate4Path = process.env.GURU_GATE4_EXPORT || "/Users/vl/Downloads/gate-4.json";
const goatId = "catalog-item-1786792591872-51f503";
const shirtId = "catalog-item-1786792591872-c8b1e9";
const smokeId = "gate4-search-group-metrics-import-export-smoke";
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.nextId = 0;
    this.pending = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", ({ data }) => {
      const message = JSON.parse(data);
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      message.error ? pending.reject(new Error(message.error.message)) : pending.resolve(message.result);
    });
  }
  async call(method, params = {}) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const id = ++this.nextId;
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.socket.close(); }
}

const fullExport = JSON.parse(await readFile(fullPath, "utf8"));
const gate4Export = JSON.parse(await readFile(gate4Path, "utf8"));
assert(fullExport.project?.id === gate4Export.project?.id, "Project exports differ");
const fixture = structuredClone(fullExport.workspace);
fixture.project.id = smokeId;
fixture.project.name = "Gate 4 group metrics import/export smoke";
fixture.gate4SearchBuild = structuredClone(gate4Export.content.gate4SearchBuild);
fixture.gate4Production = structuredClone(gate4Export.content.gate4Production);
const goatBuild = Object.entries(fixture.gate4SearchBuild)
  .find(([key]) => key.includes("51f503"))?.[1];
if (goatBuild?.clusterDraft) goatBuild.clusterDraft.open = false;
const goat = fixture.project.catalogItemsV189.find((item) => item.id === goatId);
assert(goat, "Goat product missing");

const browserVersion = await (await fetch(`http://127.0.0.1:${debugPort}/json/version`)).json();
const browser = new Cdp(browserVersion.webSocketDebuggerUrl);
await browser.ready;
const { browserContextId } = await browser.call("Target.createBrowserContext");
await browser.call("Browser.grantPermissions", {
  browserContextId, origin: new URL(appUrl).origin,
  permissions: ["clipboardReadWrite", "clipboardSanitizedWrite"],
});
const { targetId } = await browser.call("Target.createTarget", { url: "about:blank", browserContextId });
const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
const target = targets.find((item) => item.id === targetId);
assert(target?.webSocketDebuggerUrl, "Isolated browser target missing");
const page = new Cdp(target.webSocketDebuggerUrl);
await page.ready;

async function evaluate(expression) {
  const result = await page.call("Runtime.evaluate", {
    expression, awaitPromise: true, returnByValue: true,
  });
  if (result.exceptionDetails)
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}

async function waitFor(expression) {
  for (let i = 0; i < 180; i += 1) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await pause(100);
  }
  throw new Error(`Timed out: ${expression}`);
}

async function importFile(name, base64, cardIndex = 0) {
  await evaluate(`(() => {
    const card = document.querySelectorAll('.g4-v166-jtbd[data-g4sb-jtbd-id]')[${cardIndex}];
    const input = card?.querySelector('[data-g4sb-group-metrics-file]');
    if (!input) throw new Error('Group metric import input missing');
    card.querySelector('.g4-v393-metric-feedback.is-success, .g4-v393-metric-feedback.is-error')?.remove();
    const bytes = Uint8Array.from(atob(${JSON.stringify(base64)}), (letter) => letter.charCodeAt(0));
    const transfer = new DataTransfer();
    transfer.items.add(new File([bytes], ${JSON.stringify(name)}));
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  await waitFor(`document.querySelectorAll('.g4-v166-jtbd[data-g4sb-jtbd-id]')[${cardIndex}]
    ?.querySelector('.g4-v393-metric-feedback.is-success, .g4-v393-metric-feedback.is-error')`);
  return evaluate(`(() => {
    const card = document.querySelectorAll('.g4-v166-jtbd[data-g4sb-jtbd-id]')[${cardIndex}];
    return card?.querySelector('.g4-v393-metric-feedback.is-success, .g4-v393-metric-feedback.is-error')?.textContent.trim();
  })()`);
}

try {
  await page.call("Runtime.enable");
  await page.call("Page.enable");
  await page.call("Emulation.setDeviceMetricsOverride", {
    width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false,
  });
  await page.call("Page.addScriptToEvaluateOnNewDocument", { source: `{
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (input, init) => String(input).includes("/api/")
      ? Promise.resolve(new Response(JSON.stringify({ ok: true, isolatedSmoke: true }), {
          status: 200, headers: { "Content-Type": "application/json" }
        })) : nativeFetch(input, init);
  }` });
  await page.call("Page.navigate", { url: appUrl });
  await waitFor('document.readyState === "complete" && Boolean(window.GURU_SEED)');
  await evaluate(`(() => {
    const workspace = structuredClone(window.GURU_SEED);
    workspace.project.id = ${JSON.stringify(smokeId)};
    workspace.project.name = "Gate 4 group metrics import/export smoke";
    localStorage.clear();
    localStorage.setItem("guru-platform-access-v01", "unlocked");
    localStorage.setItem("guru-platform-projects-v02", JSON.stringify([{
      id: workspace.project.id, name: workspace.project.name, lifecycleStatus: "active",
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }]));
    localStorage.setItem("guru-platform-workspace-v02-" + workspace.project.id, JSON.stringify(workspace));
    location.reload();
  })()`);
  await waitFor('document.querySelector("[data-open-project]")');
  await evaluate('document.querySelector("[data-open-project]").click(); true');
  await waitFor('Boolean(state) && typeof g4sbV393ApplyGroupMetricImport === "function"');
  await evaluate(`(() => {
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};
    state = ${JSON.stringify(fixture)};
    activeProjectId = ${JSON.stringify(smokeId)};
    const ui = guruV194Ui(state);
    ui.selectedCategoryId = ${JSON.stringify(goat.categoryId)};
    ui.selectedProductId = ${JSON.stringify(goatId)};
    const channel = g4LaunchChannels().find(g4IsYandexSearchChannel);
    const open = g4EnsureLaunchUiState();
    open.rows[g4CampaignStateKey(${JSON.stringify(goatId)}, channel.key)] = true;
    guruNavigateToGate("gate-4");
  })()`);
  await waitFor('document.querySelector(".g4-v166-jtbd[data-g4sb-jtbd-id] [data-g4sb-group-metrics-export]")');
  const before = await evaluate(`(() => {
    const product = ${JSON.stringify(goatId)};
    const card = document.querySelector('.g4-v166-jtbd[data-g4sb-jtbd-id]');
    const jtbds = g4sbV166DirectionJtbds(product);
    const source = g4sbV385ProductSource(product).itemData;
    const phrase = 'подарок на новый год 2027';
    const row = source.demandRows.find((item) => item.kw === phrase);
    const other = g4sbV386JtbdPhraseRows(product, jtbds[1].key)[0];
    const shirt = g4sbV386JtbdPhraseRows(${JSON.stringify(shirtId)},
      g4sbItemJtbdList(${JSON.stringify(shirtId)}, ${JSON.stringify(shirtId)})[0]?.id)[0];
    return { buttons: [...card.querySelectorAll('.g4-v393-metric-actions button')].map((button) => button.textContent.trim()),
      legacyButtons: document.querySelectorAll('[data-g4sb-forecast-import-open]').length,
      accept: card.querySelector('[data-g4sb-group-metrics-file]').accept,
      selected: card.querySelectorAll('[data-g4sb-phrase-select]:checked').length,
      phraseList: [...card.querySelectorAll('[data-g4sb-phrase-select]:checked')]
        .map((input) => input.dataset.g4sbPhraseSelect),
      phrase, row: { vol: row.vol, clicks: row.forecastClicks, budget: row.forecastBudget,
        queryCount: row.queryCount, clickPrice: row.clickPrice, bid: row.bid },
      other: { kw: other.kw, vol: other.vol }, shirt: { kw: shirt.kw, vol: shirt.vol },
      jtbdIds: jtbds.map((item) => item.key) };
  })()`);
  assert(before.selected === 14 && before.legacyButtons === 0 &&
    before.buttons[0] === "Экспорт CSV" &&
    before.buttons[1] === "Импорт CSV/XLS/XLSX с метриками" &&
    before.buttons.length === 2 &&
    [".csv", ".xls", ".xlsx"].every((extension) => before.accept.includes(extension)),
  `Group metric controls missing: ${JSON.stringify(before)}`);

  const copiedPrompt = await evaluate(`(async () => {
    const card = document.querySelector('.g4-v166-jtbd[data-g4sb-jtbd-id]');
    const field = card.querySelector('[data-g4sb-keyword-prompt]');
    const button = card.querySelector('[data-g4sb-copy-keyword-prompt]');
    const jtbd = [...card.querySelectorAll('.g4-v134-foundation .g4-readonly')]
      .find((row) => row.querySelector('.g4-readonly-label')?.textContent.trim() === 'JTBD')
      ?.querySelector('.g4-readonly-value')?.textContent.trim();
    const source = guruStrategicFoundationModelV286(g4sbV385ProductSource(${JSON.stringify(goatId)}).product).fields;
    button.click();
    await new Promise((resolve) => setTimeout(resolve, 100));
    return { text: field.value, copied: await navigator.clipboard.readText(),
      label: button.textContent.trim(), readonly: field.readOnly,
      beforeTable: Boolean(field.compareDocumentPosition(card.querySelector('.g4-v128-selector table'))
        & Node.DOCUMENT_POSITION_FOLLOWING),
      oldButton: [...card.querySelectorAll('.g4-v393-metric-actions button')]
        .some((node) => node.textContent.trim() === 'Промпт для ключевых фраз'),
      jtbd, offer: source.offer?.value || '', landing: source.landing?.value || '' };
  })()`);
  const expectedPrompt = (jtbd, offer, landing) => `Ты формируешь список ключевых фраз для ОДНОЙ рекламной группы Яндекс.Директ (Поиск) под конкретный JTBD.

JTBD: ${jtbd}

Продукт/оффер: ${offer || "[не заполнено в Стратегической основе]"}

Посадочная страница: ${landing || "[не заполнено в Стратегической основе]"}

Правила:

1. Все фразы отвечают ОДНОМУ намерению - тому, что закрывает один оффер и одна посадочная. Если в JTBD видно два разных намерения (например "выбрать идею" и "купить конкретный товар") - раздели вывод на отдельные базисы и подпиши каждый своим намерением.
2. Приоритет - продающим (транзакционным) фразам: с модификаторами купить/заказать/цена/стоимость/с доставкой/недорого и т.п. Информационные фразы (что подарить, идеи, как выбрать) выводи отдельным базисом, не смешивай с продающими.
3. Не изобретай формулировки без разумного шанса на реальный спрос: не длиннее 3-4 слов, без искусственных прилагательных, которые никто не вводит в поиске.

Формат вывода - только список, без пояснений:
Дай текст просто текстом, без заголовков и чего-либо ещё, сверху вниз:`;
  const emptyKeywordSources = await evaluate(`(() =>
    g4sbV402KeywordPrompt('unknown-product-for-smoke', 'Тестовый JTBD'))()`);
  assert(copiedPrompt.readonly && copiedPrompt.beforeTable && !copiedPrompt.oldButton &&
    copiedPrompt.text === copiedPrompt.copied && copiedPrompt.label === "Скопировано" &&
    copiedPrompt.text === expectedPrompt(copiedPrompt.jtbd,
      copiedPrompt.offer, copiedPrompt.landing) &&
    emptyKeywordSources === expectedPrompt('Тестовый JTBD', '', ''),
  `Keyword prompt clipboard differs from request: ${JSON.stringify(copiedPrompt)}`);
  const keywordPromptClip = await evaluate(`(() => {
    const card = document.querySelector('.g4-v166-jtbd[data-g4sb-jtbd-id] .g4-v402-keyword-prompt-card');
    card.scrollIntoView({ block: 'start' });
    const box = card.getBoundingClientRect();
    return { x: Math.max(0, box.left + scrollX - 8), y: Math.max(0, box.top + scrollY - 8),
      width: Math.min(box.width + 16, 1510), height: Math.min(box.height + 16, 360), scale: 1 };
  })()`);
  const keywordPromptShot = await page.call("Page.captureScreenshot", {
    format: "png", captureBeyondViewport: true, clip: keywordPromptClip,
  });
  await writeFile(new URL("../artifacts/gate4-search-goat-keyword-prompt-v402.png", import.meta.url),
    Buffer.from(keywordPromptShot.data, "base64"));

  const expectedMinusPrompt = (phrases, positioning) => `Ты составляешь минус-слова для ОДНОЙ группы объявлений Яндекс.Директ (Поиск).

Ключевые фразы группы (все фразы, которые сейчас в группе):
${phrases.length ? phrases.map((phrase) => `- ${phrase}`).join("\n") : "[ВСТАВЬ ПОЛНЫЙ СПИСОК ФРАЗ ГРУППЫ]"}

Позиционирование бренда (чтобы отсечь несовпадающий по смыслу трафик):
${positioning || "[не заполнено в Стратегической основе]"}

Шаг 1. Собери минус-слова по категориям:

- Нецелевой интент: бесплатно, скачать, фото, картинка, своими руками, мастер-класс, выкройка, шаблон, курс, обучение
- Не наш сегмент: б/у, бывший в употреблении, оптом, опт, вакансия, работа
- Ценовой сигнал, не соответствующий позиционированию: дёшево, дешево, недорого, самый дешевый, эконом
- Нерелевантная гео (регионы, которые не обслуживаешь): [ЕСЛИ ЕСТЬ]
- Смежные, но не продаваемые товарные категории: [ЕСЛИ ЕСТЬ]

Шаг 2. Проверка на конфликт с ключевыми фразами - это обязательный шаг, без него минус-слово может заблокировать собственную же фразу группы и обнулить по ней показы.
Для каждого слова-кандидата из шага 1: встречается ли оно (в любой словоформе) как часть хотя бы одной ключевой фразы из списка выше? Если да - убери его из минус-слов и вынеси в отдельный список с пояснением, какую фразу оно бы заблокировало.

Формат вывода - только список, без пояснений: Дай текст просто текстом, без заголовков и чего-либо ещё, сверху вниз:`;
  const firstMinusPrompt = await evaluate(`(async () => {
    const card = document.querySelector('.g4-v166-jtbd[data-g4sb-jtbd-id]');
    const prompt = card.querySelector('[data-g4sb-minus-prompt]');
    const button = card.querySelector('[data-g4sb-copy-minus-prompt]');
    const field = card.querySelector('[data-g4sb-draft-oper="minus"]');
    const source = guruStrategicFoundationModelV286(g4sbV385ProductSource(${JSON.stringify(goatId)}).product).fields;
    const rows = [...card.querySelectorAll('tr[data-g4sb-membership-status="В этой группе"]')];
    const phrases = rows.map((row) => row.querySelector('[data-g4sb-phrase-select]')?.dataset.g4sbPhraseSelect);
    const zeroPhrases = rows.filter((row) => row.dataset.g4sbCostStatus === 'zero')
      .map((row) => row.querySelector('[data-g4sb-phrase-select]')?.dataset.g4sbPhraseSelect);
    button.click();
    await new Promise((resolve) => setTimeout(resolve, 100));
    return { text: prompt.value, copied: await navigator.clipboard.readText(),
      label: button.textContent.trim(), readonly: prompt.readOnly,
      beforeField: Boolean(prompt.compareDocumentPosition(field) & Node.DOCUMENT_POSITION_FOLLOWING),
      oldButton: [...card.querySelectorAll('button')].some((node) =>
        node.textContent.trim() === 'Промпт для минус-слов с проверкой конфликтов'),
      positioning: source.positioning?.value || '', phrases, zeroPhrases };
  })()`);
  const firstMinusPhraseBlock = firstMinusPrompt.text
    .split("Ключевые фразы группы (все фразы, которые сейчас в группе):\n")[1]
    ?.split("\n\nПозиционирование бренда")[0] || "";
  const firstMinusPhrases = firstMinusPhraseBlock.split("\n")
    .filter((line) => line.startsWith("- ")).map((line) => line.slice(2));
  assert(firstMinusPrompt.readonly && firstMinusPrompt.beforeField &&
    !firstMinusPrompt.oldButton && firstMinusPrompt.text === firstMinusPrompt.copied &&
    firstMinusPrompt.label === "Скопировано" &&
    firstMinusPrompt.text === expectedMinusPrompt(firstMinusPhrases, firstMinusPrompt.positioning) &&
    JSON.stringify(firstMinusPhrases.slice().sort()) ===
      JSON.stringify(firstMinusPrompt.phrases.slice().sort()) &&
    firstMinusPrompt.zeroPhrases.length > 0 &&
    firstMinusPrompt.zeroPhrases.every((phrase) => firstMinusPhrases.includes(phrase)),
  `Minus prompt or button placement differs from request: ${JSON.stringify(firstMinusPrompt)}`);
  const minusPromptClip = await evaluate(`(() => {
    const prompt = document.querySelector('.g4-v166-jtbd[data-g4sb-jtbd-id] [data-g4sb-minus-prompt]');
    const section = prompt.closest('.g4-v127-editor-section');
    section.scrollIntoView({ block: 'start' });
    const box = section.getBoundingClientRect();
    return { x: Math.max(0, box.left + scrollX - 8), y: Math.max(0, box.top + scrollY - 8),
      width: Math.min(box.width + 16, 1510), height: Math.min(box.height + 16, 600), scale: 1 };
  })()`);
  const minusPromptShot = await page.call("Page.captureScreenshot", {
    format: "png", captureBeyondViewport: true, clip: minusPromptClip,
  });
  await writeFile(new URL("../artifacts/gate4-search-goat-minus-prompt-v401.png", import.meta.url),
    Buffer.from(minusPromptShot.data, "base64"));

  const adPrompt = await evaluate(`(async () => {
    const card = document.querySelector('.g4-v166-jtbd[data-g4sb-jtbd-id]');
    const field = card.querySelector('[data-g4sb-ad-prompt]');
    const button = card.querySelector('[data-g4sb-copy-ad-prompt]');
    const firstAd = card.querySelector('.g4-v127-ad');
    const foundationJtbd = [...card.querySelectorAll('.g4-v134-foundation .g4-readonly')]
      .find((row) => row.querySelector('.g4-readonly-label')?.textContent.trim() === 'JTBD')
      ?.querySelector('.g4-readonly-value')?.textContent.trim();
    const selectedRows = [...card.querySelectorAll('tr[data-g4sb-membership-status="В этой группе"]')];
    const phrases = selectedRows.filter((row) => row.dataset.g4sbCostStatus !== 'zero')
      .map((row) => row.querySelector('[data-g4sb-phrase-select]')?.dataset.g4sbPhraseSelect);
    const zeroPhrases = selectedRows.filter((row) => row.dataset.g4sbCostStatus === 'zero')
      .map((row) => row.querySelector('[data-g4sb-phrase-select]')?.dataset.g4sbPhraseSelect);
    const source = guruStrategicFoundationModelV286(g4sbV385ProductSource(${JSON.stringify(goatId)}).product).fields;
    button.click();
    await new Promise((resolve) => setTimeout(resolve, 100));
    return { text: field.value, copied: await navigator.clipboard.readText(),
      copyLabel: button.textContent.trim(), readonly: field.readOnly,
      beforeFirstAd: Boolean(field.compareDocumentPosition(firstAd) & Node.DOCUMENT_POSITION_FOLLOWING),
      foundationJtbd, phrases, zeroPhrases,
      offer: source.offer?.value || '', usp: source.usp?.value || '',
      positioning: source.positioning?.value || '', landing: source.landing?.value || '' };
  })()`);
  assert(adPrompt.readonly && adPrompt.beforeFirstAd &&
    adPrompt.text === adPrompt.copied && adPrompt.copyLabel === "Скопировано" &&
    adPrompt.text.includes(`JTBD: ${adPrompt.foundationJtbd}`) &&
    adPrompt.phrases.length > 0 &&
    adPrompt.phrases.every((phrase) => adPrompt.text.includes(`\n- ${phrase}\n`)) &&
    adPrompt.zeroPhrases.every((phrase) => !adPrompt.text.includes(`\n- ${phrase}\n`)) &&
    adPrompt.text.includes(adPrompt.positioning || "[не заполнено в Стратегической основе]") &&
    adPrompt.text.includes(adPrompt.landing || "[не заполнено в Стратегической основе]") &&
    (adPrompt.offer || adPrompt.usp || adPrompt.text.includes("Оффер/УТП: [не заполнено в Стратегической основе]")),
  `Ad prompt failed source/selection/copy checks: ${JSON.stringify(adPrompt)}`);

  const calloutPrompt = await evaluate(`(async () => {
    const card = document.querySelector('.g4-v166-jtbd[data-g4sb-jtbd-id]');
    const field = card.querySelector('[data-g4sb-callout-prompt]');
    const button = card.querySelector('[data-g4sb-copy-callout-prompt]');
    const firstCallout = card.querySelector('[data-g4sb-callout-index="0"]');
    const title = card.querySelector('[data-g4sb-draft-ad-index="0"][data-g4sb-draft-ad-field="ad0"]');
    const body = card.querySelector('[data-g4sb-draft-ad-index="0"][data-g4sb-draft-ad-field="ad2"]');
    button.click();
    await new Promise((resolve) => setTimeout(resolve, 100));
    return { text: field.value, copied: await navigator.clipboard.readText(),
      copyLabel: button.textContent.trim(), readonly: field.readOnly,
      beforeFirstCallout: Boolean(field.compareDocumentPosition(firstCallout) & Node.DOCUMENT_POSITION_FOLLOWING),
      initialTitle: title.value, initialBody: body.value };
  })()`);
  const promptPhraseBlock = calloutPrompt.text
    .split("Ключевые фразы группы (для контекста, не для дословного повтора):\n")[1]
    ?.split("\n\nСоздай:")[0] || "";
  const calloutPromptPhrases = promptPhraseBlock.split("\n")
    .filter((line) => line.startsWith("- ")).map((line) => line.slice(2));
  const expectedCalloutPrompt = `Ты пишешь уточнения для ОДНОЙ группы объявлений Яндекс.Директ (Поиск).

JTBD: ${adPrompt.foundationJtbd}
Оффер/УТП: ${[adPrompt.offer && `Оффер: ${adPrompt.offer}`, adPrompt.usp && `УТП: ${adPrompt.usp}`].filter(Boolean).join("; ") || "[не заполнено в Стратегической основе]"}
Позиционирование: ${adPrompt.positioning || "[не заполнено в Стратегической основе]"}
Уже написан заголовок объявления: ${calloutPrompt.initialTitle.trim() || "не заполнено"}
Уже написан текст объявления: ${calloutPrompt.initialBody.trim() || "не заполнено"}
Ключевые фразы группы (для контекста, не для дословного повтора):
${calloutPromptPhrases.map((phrase) => `- ${phrase}`).join("\n")}

Создай:

Как можно больше эффективных, различных по смыслу уточнений — коротких самостоятельных фактов или преимуществ. Не повторяй одну и ту же мысль разными словами, каждое должно давать новую причину выбрать товар.

Жёсткие ограничения:

- Каждое уточнение ≤25 символов, включая пробелы
- Сумма первых 4 уточнений по символам ≤66 - Директ показывает уточнения в случайном порядке, при превышении общего лимита порядок непредсказуем
- Каждое уточнение независимо и понятно само по себе - нельзя писать "во-первых/во-вторых" или продолжения друг друга
- Не повторяй по смыслу то, что уже сказано в заголовке и тексте объявления выше - уточнения должны добавлять новую информацию
- Не выдумывай факты (сроки, гарантии, скидки), которых нет в оффере

Формат вывода, без пояснений сверху:

1. ...
2. ...
...`;
  assert(calloutPrompt.readonly && calloutPrompt.beforeFirstCallout &&
    calloutPrompt.text === expectedCalloutPrompt &&
    calloutPrompt.copied === calloutPrompt.text &&
    calloutPrompt.copyLabel === "Скопировано" &&
    JSON.stringify(calloutPromptPhrases.slice().sort()) ===
      JSON.stringify(adPrompt.phrases.slice().sort()) &&
    adPrompt.zeroPhrases.every((phrase) => !calloutPrompt.text.includes(`\n- ${phrase}\n`)),
  `Callout prompt source/placement/copy mismatch: ${JSON.stringify(calloutPrompt)}`);

  const liveCalloutPrompt = await evaluate(`(async () => {
    const card = document.querySelector('.g4-v166-jtbd[data-g4sb-jtbd-id]');
    const title = card.querySelector('[data-g4sb-draft-ad-index="0"][data-g4sb-draft-ad-field="ad0"]');
    const body = card.querySelector('[data-g4sb-draft-ad-index="0"][data-g4sb-draft-ad-field="ad2"]');
    const field = card.querySelector('[data-g4sb-callout-prompt]');
    const button = card.querySelector('[data-g4sb-copy-callout-prompt]');
    title.value = 'Тестовый заголовок Козы';
    title.dispatchEvent(new Event('input', { bubbles: true }));
    body.value = 'Тестовый текст Козы';
    body.dispatchEvent(new Event('input', { bubbles: true }));
    const populated = field.value;
    button.disabled = false;
    button.click();
    await new Promise((resolve) => setTimeout(resolve, 100));
    const copied = await navigator.clipboard.readText();
    title.value = '';
    title.dispatchEvent(new Event('input', { bubbles: true }));
    body.value = '';
    body.dispatchEvent(new Event('input', { bubbles: true }));
    return { populated, copied, cleared: field.value };
  })()`);
  assert(liveCalloutPrompt.populated.includes('Уже написан заголовок объявления: Тестовый заголовок Козы') &&
    liveCalloutPrompt.populated.includes('Уже написан текст объявления: Тестовый текст Козы') &&
    liveCalloutPrompt.copied === liveCalloutPrompt.populated &&
    liveCalloutPrompt.cleared.includes('Уже написан заголовок объявления: не заполнено') &&
    liveCalloutPrompt.cleared.includes('Уже написан текст объявления: не заполнено'),
  `Callout prompt did not update with ad 1: ${JSON.stringify(liveCalloutPrompt)}`);

  const goatCallouts = await evaluate(`(() => {
    const card = document.querySelector('.g4-v166-jtbd[data-g4sb-jtbd-id]');
    const section = card.querySelector('[data-g4sb-callouts]');
    const allInputs = [...section.querySelectorAll('[data-g4sb-callout-index]')];
    const inputs = allInputs.slice(0, 4);
    const values = ['Авторская ручная работа', 'Доставка по всей России',
      'Упаковка для подарка', 'Индивидуальный пошив'];
    const saveDisabledBefore = card.querySelector('[data-g4sb-draft-save]').disabled;
    const note = 'Каждое уточнение показывается независимо - Директ выводит их в случайном порядке, поэтому не пишите уточнения, которые требуют чтения по порядку';
    const fill = (index) => {
      inputs[index].value = values[index];
      inputs[index].dispatchEvent(new Event('input', { bubbles: true }));
    };
    const snapshot = () => ({
      progress: section.querySelector('[data-g4sb-callouts-progress]').textContent.trim(),
      total: section.querySelector('[data-g4sb-callouts-total]').textContent.trim(),
      warningHidden: section.querySelector('[data-g4sb-callouts-warning]').hidden,
      warning: section.querySelector('[data-g4sb-callouts-warning]').textContent.trim(),
    });
    allInputs.forEach((input) => {
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const initial = snapshot();
    fill(0); fill(1); fill(2);
    const at66 = snapshot();
    fill(3);
    const over66 = snapshot();
    const draft = ensureGate4SearchBuild(${JSON.stringify(goatId)}).clusterDraft;
    return { values, lengths: values.map((value) => value.length), initial, at66, over66,
      saved: draft.callouts.slice(0, 4), validationError: draft.validationError,
      saveDisabledBefore, saveDisabledAfter: card.querySelector('[data-g4sb-draft-save]').disabled,
      noteShown: section.textContent.includes(note) };
  })()`);
  assert(goatCallouts.lengths.every((length) => length >= 20 && length <= 25) &&
    goatCallouts.initial.total === "0 из 66 символов суммарно" &&
    goatCallouts.initial.warningHidden &&
    goatCallouts.at66.total === "66 из 66 символов суммарно" &&
    goatCallouts.at66.warningHidden &&
    goatCallouts.over66.progress === "4 из 4 минимум" &&
    goatCallouts.over66.total === "86 из 66 символов суммарно" &&
    !goatCallouts.over66.warningHidden &&
    goatCallouts.over66.warning === "Превышен лимит суммарной длины - уточнения могут показываться в случайном порядке вместо заданного" &&
    JSON.stringify(goatCallouts.saved) === JSON.stringify(goatCallouts.values) &&
    !goatCallouts.validationError &&
    goatCallouts.saveDisabledBefore === goatCallouts.saveDisabledAfter &&
    goatCallouts.noteShown,
  `Goat callout total/warning check failed: ${JSON.stringify(goatCallouts)}`);
  const calloutsClip = await evaluate(`(() => {
    const section = document.querySelector('.g4-v166-jtbd[data-g4sb-jtbd-id] [data-g4sb-callouts]');
    section.scrollIntoView({ block: 'start' });
    const box = section.getBoundingClientRect();
    return { x: Math.max(0, box.left + scrollX - 8), y: Math.max(0, box.top + scrollY - 8),
      width: Math.min(box.width + 16, 1510), height: Math.min(box.height + 16, 800), scale: 1 };
  })()`);
  const calloutsShot = await page.call("Page.captureScreenshot", {
    format: "png", captureBeyondViewport: true, clip: calloutsClip,
  });
  await writeFile(new URL("../artifacts/gate4-search-goat-callouts-v399.png", import.meta.url),
    Buffer.from(calloutsShot.data, "base64"));

  const exported = await evaluate(`(() => {
    const native = downloadText;
    let capture;
    downloadText = (name, content) => { capture = { name, content }; };
    document.querySelector('.g4-v166-jtbd[data-g4sb-jtbd-id] [data-g4sb-group-metrics-export]').click();
    downloadText = native;
    const parsed = guruGate1FinalParseMetricsCsvV259(capture.content);
    return { name: capture.name, headers: parsed.headers, count: parsed.rows.length,
      target: parsed.rows.find((row) => row.phrase === ${JSON.stringify(before.phrase)}) };
  })()`);
  assert(exported.name.endsWith(".csv") && exported.count === 14 &&
    exported.headers.length === 7 && exported.target?.volume === before.row.vol &&
    exported.target?.monthlyClicks === before.row.clicks &&
    exported.target?.budget === before.row.budget,
  `CSV export differs from selected Gate 1 group: ${JSON.stringify(exported)}`);

  const multiOpen = await evaluate(`(() => {
    document.querySelectorAll('.g4-v166-jtbd[data-g4sb-jtbd-id]')[2]
      .querySelector('summary').click();
    return document.querySelectorAll('.g4-v166-jtbd[data-g4sb-jtbd-id][open]').length;
  })()`);
  assert(multiOpen === 2, `Could not open two JTBD cards: ${multiOpen}`);

  const thirdKeywordPrompt = await evaluate(`(() => {
    const card = document.querySelectorAll('.g4-v166-jtbd[data-g4sb-jtbd-id]')[2];
    const jtbd = [...card.querySelectorAll('.g4-v134-foundation .g4-readonly')]
      .find((row) => row.querySelector('.g4-readonly-label')?.textContent.trim() === 'JTBD')
      ?.querySelector('.g4-readonly-value')?.textContent.trim();
    return { jtbd, text: card.querySelector('[data-g4sb-keyword-prompt]').value };
  })()`);
  assert(thirdKeywordPrompt.jtbd !== copiedPrompt.jtbd &&
    thirdKeywordPrompt.text === expectedPrompt(thirdKeywordPrompt.jtbd,
      copiedPrompt.offer, copiedPrompt.landing),
  `Keyword prompt used another JTBD: ${JSON.stringify(thirdKeywordPrompt)}`);

  const thirdMinusPrompt = await evaluate(`(async () => {
    const card = document.querySelectorAll('.g4-v166-jtbd[data-g4sb-jtbd-id]')[2];
    const phrases = [...card.querySelectorAll('tr[data-g4sb-membership-status="В этой группе"]')]
      .map((row) => row.querySelector('[data-g4sb-phrase-select]')?.dataset.g4sbPhraseSelect);
    const field = card.querySelector('[data-g4sb-minus-prompt]');
    const button = card.querySelector('[data-g4sb-copy-minus-prompt]');
    button.click();
    await new Promise((resolve) => setTimeout(resolve, 100));
    return { phrases, text: field.value, copied: await navigator.clipboard.readText(),
      label: button.textContent.trim() };
  })()`);
  assert(thirdMinusPrompt.phrases.length > 0 &&
    thirdMinusPrompt.text === thirdMinusPrompt.copied &&
    thirdMinusPrompt.phrases.every((phrase) => thirdMinusPrompt.text.includes(`\n- ${phrase}\n`)) &&
    thirdMinusPrompt.text !== firstMinusPrompt.text &&
    thirdMinusPrompt.label === "Скопировано",
  `Minus prompt copied phrases from another JTBD: ${JSON.stringify(thirdMinusPrompt)}`);
  const thirdAdPrompt = await evaluate(`(() => {
    const card = document.querySelectorAll('.g4-v166-jtbd[data-g4sb-jtbd-id]')[2];
    const text = card.querySelector('[data-g4sb-ad-prompt]').value;
    const jtbd = [...card.querySelectorAll('.g4-v134-foundation .g4-readonly')]
      .find((row) => row.querySelector('.g4-readonly-label')?.textContent.trim() === 'JTBD')
      ?.querySelector('.g4-readonly-value')?.textContent.trim();
    const phrases = [...card.querySelectorAll('tr[data-g4sb-membership-status="В этой группе"]')]
      .filter((row) => row.dataset.g4sbCostStatus !== 'zero')
      .map((row) => row.querySelector('[data-g4sb-phrase-select]')?.dataset.g4sbPhraseSelect);
    return { text, jtbd, phrases };
  })()`);
  assert(thirdAdPrompt.text !== adPrompt.text &&
    thirdAdPrompt.text.includes(`JTBD: ${thirdAdPrompt.jtbd}`) &&
    thirdAdPrompt.phrases.length > 0 &&
    thirdAdPrompt.phrases.every((phrase) => thirdAdPrompt.text.includes(`\n- ${phrase}\n`)),
  `Ad prompt mixed two open JTBD groups: ${JSON.stringify(thirdAdPrompt)}`);
  const thirdCalloutPrompt = await evaluate(`(() => {
    const card = document.querySelectorAll('.g4-v166-jtbd[data-g4sb-jtbd-id]')[2];
    const text = card.querySelector('[data-g4sb-callout-prompt]').value;
    const jtbd = [...card.querySelectorAll('.g4-v134-foundation .g4-readonly')]
      .find((row) => row.querySelector('.g4-readonly-label')?.textContent.trim() === 'JTBD')
      ?.querySelector('.g4-readonly-value')?.textContent.trim();
    const phrases = [...card.querySelectorAll('tr[data-g4sb-membership-status="В этой группе"]')]
      .filter((row) => row.dataset.g4sbCostStatus !== 'zero')
      .map((row) => row.querySelector('[data-g4sb-phrase-select]')?.dataset.g4sbPhraseSelect);
    return { text, jtbd, phrases };
  })()`);
  assert(thirdCalloutPrompt.text !== calloutPrompt.text &&
    thirdCalloutPrompt.text.includes(`JTBD: ${thirdCalloutPrompt.jtbd}`) &&
    thirdCalloutPrompt.phrases.length > 0 &&
    thirdCalloutPrompt.phrases.every((phrase) =>
      thirdCalloutPrompt.text.includes(`\n- ${phrase}\n`)),
  `Callout prompt mixed two open JTBD groups: ${JSON.stringify(thirdCalloutPrompt)}`);

  const csvRows = [
    ["Ключевое слово", "Объём показов/мес", "Переходы/мес", "Примерный бюджет, руб."],
    [before.phrase, "999", "50", "5000"],
    ["тестовая новая фраза поисковой группы", "777", "20", "200"],
  ];
  const csv = csvRows.map((row) => row.map((value) =>
    `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\r\n");
  const csvResult = await importFile("metrics.csv", Buffer.from(csv).toString("base64"));
  assert(csvResult.includes("Обновлено: 1") && csvResult.includes("Добавлено в группу: 1"),
    `CSV import did not add the new phrase: ${csvResult}`);
  const afterCsv = await evaluate(`(() => {
    const source = g4sbV385ProductSource(${JSON.stringify(goatId)}).itemData;
    const row = source.demandRows.find((item) => item.kw === ${JSON.stringify(before.phrase)});
    const other = source.demandRows.find((item) => item.kw === ${JSON.stringify(before.other.kw)});
    const imported = source.demandRows.find((item) => item.kw === "тестовая новая фраза поисковой группы");
    const draft = ensureGate4SearchBuild(${JSON.stringify(goatId)}).jtbdDraftsV388[${JSON.stringify(before.jtbdIds[0])}];
    const group = g4sbV128Forecast(draft.keywordRows);
    return { vol: row.vol, clicks: row.forecastClicks, budget: row.forecastBudget,
      queryCount: row.queryCount, clickPrice: row.clickPrice, bid: row.bid,
      otherVol: other.vol, draftVol: draft.keywordRows.find((item) => item.kw === row.kw)?.vol,
      imported: imported && { vol: imported.vol, originStage: imported.originStage },
      visible: Boolean([...document.querySelectorAll('.g4-v166-jtbd[data-g4sb-jtbd-id]')[0]
        .querySelectorAll('[data-g4sb-phrase-select]')].find((input) =>
        input.dataset.g4sbPhraseSelect === imported?.kw && input.checked)),
      promptHasImported: document.querySelectorAll('.g4-v166-jtbd[data-g4sb-jtbd-id]')[0]
        .querySelector('[data-g4sb-ad-prompt]')?.value.includes('\\n- тестовая новая фраза поисковой группы\\n'),
      minusPromptHasImported: document.querySelectorAll('.g4-v166-jtbd[data-g4sb-jtbd-id]')[0]
        .querySelector('[data-g4sb-minus-prompt]')?.value.includes('\\n- тестовая новая фраза поисковой группы\\n'),
      calloutPromptHasImported: document.querySelectorAll('.g4-v166-jtbd[data-g4sb-jtbd-id]')[0]
        .querySelector('[data-g4sb-callout-prompt]')?.value.includes('\\n- тестовая новая фраза поисковой группы\\n'),
      draftCount: draft.keywordRows.length,
      forecast: group.impressions };
  })()`);
  assert(afterCsv.vol === "999" && afterCsv.clicks === "50" && afterCsv.budget === "5000" &&
    afterCsv.queryCount === before.row.queryCount &&
    afterCsv.clickPrice === before.row.clickPrice && afterCsv.bid === before.row.bid &&
    afterCsv.otherVol === before.other.vol && afterCsv.draftVol === "999" &&
    afterCsv.imported?.vol === "777" && afterCsv.imported?.originStage === "gate4" &&
    afterCsv.visible && afterCsv.promptHasImported && afterCsv.minusPromptHasImported &&
    afterCsv.calloutPromptHasImported &&
    afterCsv.draftCount === 15 &&
    afterCsv.forecast === 1182 - Number(before.row.vol) + 999 + 777,
  `CSV import lost metrics or changed another JTBD: ${JSON.stringify(afterCsv)}`);

  const xlsxSource = await readFile(new URL("../node_modules/xlsx/dist/xlsx.full.min.js", import.meta.url), "utf8");
  await evaluate(`${xlsxSource}\nBoolean(window.XLSX)`);
  for (const [extension, expectedVol] of [["xlsx", "1001"], ["xls", "1002"]]) {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      csvRows[0], [before.phrase, Number(expectedVol), 51, 5100],
    ]), "Metrics");
    const bytes = XLSX.write(workbook, { type: "buffer", bookType: extension });
    const result = await importFile(`metrics.${extension}`, bytes.toString("base64"));
    assert(result.includes("Обновлено: 1"), `${extension} import failed: ${result}`);
    const value = await evaluate(`g4sbV385ProductSource(${JSON.stringify(goatId)}).itemData.demandRows
      .find((row) => row.kw === ${JSON.stringify(before.phrase)})?.vol`);
    assert(value === expectedVol, `${extension} metric not applied: ${value}`);
  }

  // Возвращаем изолированную копию к исходным 14 фразам перед проверкой
  // реального файла пользователя, чтобы снимок не содержал тестовую строку.
  await evaluate(`(() => {
    const product = ${JSON.stringify(goatId)};
    const source = g4sbV385ProductSource(product).itemData;
    const draft = ensureGate4SearchBuild(product).jtbdDraftsV388[${JSON.stringify(before.jtbdIds[0])}];
    source.demandRows = source.demandRows.filter((row) =>
      row.kw !== 'тестовая новая фраза поисковой группы');
    draft.keywordRows = draft.keywordRows.filter((row) =>
      row.kw !== 'тестовая новая фраза поисковой группы');
    const sourceRow = source.demandRows.find((row) => row.kw === ${JSON.stringify(before.phrase)});
    const draftRow = draft.keywordRows.find((row) => row.kw === ${JSON.stringify(before.phrase)});
    sourceRow.vol = draftRow.vol = ${JSON.stringify(before.row.vol)};
    sourceRow.forecastClicks = draftRow.forecastClicks = ${JSON.stringify(before.row.clicks)};
    sourceRow.forecastBudget = draftRow.forecastBudget = ${JSON.stringify(before.row.budget)};
    renderGate();
  })()`);

  const realForecast = await readFile("/Users/vl/Downloads/forecast.7843.xls");
  const realResult = await importFile("forecast.7843.xls", realForecast.toString("base64"));
  const realImport = await evaluate(`(() => {
    const d = ensureGate4SearchBuild(${JSON.stringify(goatId)});
    const draft = d.jtbdDraftsV388[${JSON.stringify(before.jtbdIds[0])}];
    const phrase = 'корпоративные подарки 2027';
    const row = draft.keywordRows.find((entry) => entry.kw === phrase);
    const card = document.querySelectorAll('.g4-v166-jtbd[data-g4sb-jtbd-id]')[0];
    const visible = [...card.querySelectorAll('[data-g4sb-phrase-select]')]
      .some((input) => input.dataset.g4sbPhraseSelect === phrase && input.checked);
    const source = g4sbV385ProductSource(${JSON.stringify(goatId)}).itemData.demandRows
      .find((entry) => entry.kw === phrase);
    draft.phraseSort = 'clicks_desc';
    renderGate();
    return { count: draft.keywordRows.length, visible, sourceOrigin: source?.originStage,
      metrics: row && [row.vol, row.forecastClicks, row.forecastBudget] };
  })()`);
  assert(realResult.includes("Обновлено: 1") &&
    realResult.includes("Добавлено в группу: 25") &&
    realImport.count === 39 && realImport.visible &&
    realImport.sourceOrigin === "gate4" && realImport.metrics?.[0],
  `Real Yandex forecast phrases did not appear: ${JSON.stringify({ realResult, realImport })}`);

  const after = await evaluate(`(() => {
    const shirt = g4sbV386JtbdPhraseRows(${JSON.stringify(shirtId)},
      g4sbItemJtbdList(${JSON.stringify(shirtId)}, ${JSON.stringify(shirtId)})[0]?.id)[0];
    const other = g4sbV386JtbdPhraseRows(${JSON.stringify(goatId)}, ${JSON.stringify(before.jtbdIds[1])})
      .find((row) => row.kw === ${JSON.stringify(before.other.kw)});
    const first = document.querySelectorAll('.g4-v166-jtbd[data-g4sb-jtbd-id]')[0];
    return { shirt: { kw: shirt.kw, vol: shirt.vol }, otherVol: other?.vol,
      open: document.querySelectorAll('.g4-v166-jtbd[data-g4sb-jtbd-id][open]').length,
      firstButtons: first.querySelectorAll('.g4-v393-metric-actions button').length,
      thirdButtons: document.querySelectorAll('.g4-v166-jtbd[data-g4sb-jtbd-id]')[2]
        .querySelectorAll('.g4-v393-metric-actions button').length,
      firstPrompt: Boolean(first.querySelector('[data-g4sb-keyword-prompt]')),
      thirdPrompt: Boolean(document.querySelectorAll('.g4-v166-jtbd[data-g4sb-jtbd-id]')[2]
        .querySelector('[data-g4sb-keyword-prompt]')) };
  })()`);
  assert(JSON.stringify(after.shirt) === JSON.stringify(before.shirt) &&
    after.otherVol === before.other.vol &&
    after.open === 2 && after.firstButtons === 2 && after.thirdButtons === 2 &&
    after.firstPrompt && after.thirdPrompt,
  `Product/JTBD isolation failed: ${JSON.stringify(after)}`);

  const clip = await evaluate(`(() => {
    const node = document.querySelector('.g4-v166-jtbd[data-g4sb-jtbd-id] .g4-v126-keywords');
    node.scrollIntoView({ block: 'start' });
    const box = node.getBoundingClientRect();
    return { x: Math.max(0, box.left + scrollX - 10), y: Math.max(0, box.top + scrollY - 10),
      width: Math.min(box.width + 20, 1510), height: Math.min(box.height + 20, 1200), scale: 1 };
  })()`);
  const shot = await page.call("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip });
  await writeFile(new URL("../artifacts/gate4-search-group-imported-forecast-v394.png", import.meta.url),
    Buffer.from(shot.data, "base64"));
  const repeatResult = await importFile("forecast.7843.xls", realForecast.toString("base64"));
  const repeatCount = await evaluate(`ensureGate4SearchBuild(${JSON.stringify(goatId)})
    .jtbdDraftsV388[${JSON.stringify(before.jtbdIds[0])}].keywordRows.length`);
  assert(repeatResult.includes("Обновлено: 26") &&
    repeatResult.includes("Добавлено в группу: 0") && repeatCount === 39,
  `Repeated import created duplicates: ${JSON.stringify({ repeatResult, repeatCount })}`);
  const exclusions = await evaluate(`(() => {
    const product = ${JSON.stringify(goatId)};
    const firstCard = () => document.querySelectorAll('.g4-v166-jtbd[data-g4sb-jtbd-id]')[0];
    const checkbox = firstCard().querySelector('[data-g4sb-phrase-select]:checked');
    const phrase = checkbox.dataset.g4sbPhraseSelect;
    checkbox.checked = false;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    const button = [...firstCard().querySelectorAll('[data-g4sb-campaign-phrase-exclusion]')]
      .find((node) => node.dataset.g4sbCampaignPhraseExclusion === phrase);
    if (!button) throw new Error('Manual exclusion control disappeared');
    button.click();
    const d = ensureGate4SearchBuild(product);
    return { phrase, excluded: d.excludedCampaignPhrases.some((value) =>
      g4sbV128PhraseKey(value) === g4sbV128PhraseKey(phrase)),
      restore: [...firstCard().querySelectorAll('.g4-v150-excluded-table [data-g4sb-campaign-phrase-exclusion]')]
        .some((node) => node.dataset.g4sbCampaignPhraseExclusion === phrase) };
  })()`);
  assert(exclusions.excluded && exclusions.restore,
    `Manual phrase exclusions broke after old importer removal: ${JSON.stringify(exclusions)}`);
  const legacyMetrics = await evaluate(`(() => {
    const source = g4sbV385ProductSource(${JSON.stringify(goatId)}).itemData;
    const row = source.demandRows.find((item) => item.kw === ${JSON.stringify(before.phrase)});
    const before = [row.vol, row.forecastClicks, row.forecastBudget];
    const build = ensureGate4SearchBuild(${JSON.stringify(shirtId)});
    const groupRow = build.groupRows[0].demandRows[0];
    const groupBefore = [groupRow.vol, groupRow.forecastClicks, groupRow.forecastBudget];
    row.source = 'Прогноз Яндекс Директа';
    groupRow.source = 'Прогноз Яндекс Директа';
    guruGate1RemoveDemandTrendsV271(state);
    return { sourceRemoved: !Object.hasOwn(row, 'source'),
      groupSourceRemoved: !Object.hasOwn(groupRow, 'source'),
      groupNumbersPreserved: JSON.stringify(groupBefore) === JSON.stringify([
        groupRow.vol, groupRow.forecastClicks, groupRow.forecastBudget]),
      numbersPreserved: JSON.stringify(before) === JSON.stringify([
        row.vol, row.forecastClicks, row.forecastBudget]) };
  })()`);
  assert(legacyMetrics.sourceRemoved && legacyMetrics.numbersPreserved &&
    legacyMetrics.groupSourceRemoved && legacyMetrics.groupNumbersPreserved,
    `Legacy import provenance cleanup lost numeric data: ${JSON.stringify(legacyMetrics)}`);
  console.log(JSON.stringify({ ok: true, buttons: before.buttons, promptCopied: true,
    goatKeywordPrompt: copiedPrompt.text,
    keywordPromptScreenshot: "artifacts/gate4-search-goat-keyword-prompt-v402.png",
    minusPromptCopied: true, minusPromptGroupPhrases: [firstMinusPrompt.phrases.length, thirdMinusPrompt.phrases.length],
    minusPromptZeroDemandPhrases: firstMinusPrompt.zeroPhrases,
    goatMinusPrompt: firstMinusPrompt.text,
    minusPromptScreenshot: "artifacts/gate4-search-goat-minus-prompt-v401.png",
    adPromptCopied: true, adPromptPhrases: adPrompt.phrases.length,
    adPromptZeroExcluded: adPrompt.zeroPhrases.length, goatAdPrompt: adPrompt.text,
    calloutPromptCopied: true, goatCalloutPrompt: calloutPrompt.text,
    goatCallouts: { lengths: goatCallouts.lengths, total: goatCallouts.over66.total,
      warning: goatCallouts.over66.warning },
    calloutsScreenshot: "artifacts/gate4-search-goat-callouts-v399.png",
    exported: exported.count,
    csv: csvResult, xlsx: true, xls: true, productIsolation: true,
    manualExclusions: true, legacyMetricsPreserved: true,
    realForecast: realResult, repeatImport: repeatResult,
    screenshot: "artifacts/gate4-search-group-imported-forecast-v394.png" }, null, 2));
} finally {
  page.close();
  await browser.call("Target.disposeBrowserContext", { browserContextId });
  browser.close();
}
