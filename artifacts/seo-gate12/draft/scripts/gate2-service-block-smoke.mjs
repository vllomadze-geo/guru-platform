import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";

const fixture = JSON.parse(readFileSync(process.env.GURU_GATE2_FIXTURE || "/Users/vl/Downloads/gate-2.json", "utf8"));
const browserPort = process.env.GURU_CHROME_DEBUG_PORT || "9341";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:4318/";
const baseline = process.env.GURU_GATE2_BASELINE === "1";
const projectId = "gate2-service-template-isolated-smoke";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.id = 0;
    this.pending = new Map();
    this.exceptions = [];
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.method === "Runtime.exceptionThrown")
        this.exceptions.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
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
      const id = ++this.id;
      const timer = setTimeout(() => reject(new Error(`CDP timeout: ${method}`)), 30000);
      this.pending.set(id, { resolve: (value) => { clearTimeout(timer); resolve(value); },
        reject: (error) => { clearTimeout(timer); reject(error); } });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.socket.close(); }
}

let browser; let page; let browserContextId; let targetId;
const evaluate = async (expression) => {
  const response = await page.call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
  return response.result.value;
};
const waitFor = async (expression) => {
  for (let i = 0; i < 150; i++) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await wait(100);
  }
  throw new Error(`Timeout: ${expression}`);
};
const screenshot = async (path) => {
  await wait(120);
  const result = await page.call("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  writeFileSync(path, Buffer.from(result.data, "base64"));
};

try {
  const version = await (await fetch(`http://127.0.0.1:${browserPort}/json/version`)).json();
  browser = new Cdp(version.webSocketDebuggerUrl);
  await browser.ready;
  ({ browserContextId } = await browser.call("Target.createBrowserContext"));
  ({ targetId } = await browser.call("Target.createTarget", { url: "about:blank", browserContextId }));
  const targets = await (await fetch(`http://127.0.0.1:${browserPort}/json`)).json();
  page = new Cdp(targets.find((item) => item.id === targetId).webSocketDebuggerUrl);
  await page.ready;
  await page.call("Runtime.enable");
  await page.call("Page.enable");
  await page.call("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await page.call("Page.navigate", { url: appUrl });
  await waitFor('document.readyState === "complete" && typeof g2wStatus === "function"');

  const rendered = await evaluate(`(() => {
    localStorage.clear(); rememberAccessUnlocked(); setAccessState(true);
    scheduleCloudSync = () => {}; scheduleProjectsCloudSync = () => {};
    projects = [{ id: ${JSON.stringify(projectId)}, name: "iCleaning", lifecycleStatus: "active",
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
    activeProjectId = ${JSON.stringify(projectId)};
    state = createFreshWorkspace({ id: ${JSON.stringify(projectId)}, name: "iCleaning" });
    state.project = { ...state.project, ...${JSON.stringify(fixture.content.project)}, id: ${JSON.stringify(projectId)} };
    state.gates.find((gate) => gate.id === "gate-2").cards = ${JSON.stringify(fixture.gate.cards)};
    const firstProduct = guruV194Products(state)[0];
    if (firstProduct) state.project.gate0ScopeUiV194 = {
      selectedCategoryId: megaPlatformProductCategoryIds(firstProduct)[0] || "__uncategorized__",
      selectedProductId: firstProduct.id,
    };
    els.launcher.hidden = true; els.appShell.hidden = false;
    activeView = "gate"; activeGateId = "gate-2";
    renderGate();
    return { sourceCards: ${fixture.gate.cards.length}, runtimeCards: state.gates.find((gate) => gate.id === "gate-2").cards.length,
      wizardUnits: document.querySelectorAll('.g2w-card').length,
      legacyCards: document.querySelectorAll('.g2w-workspace [data-card]').length,
      legacyCollapsed: [...document.querySelectorAll('.g2w-additional')].every((node) => !node.open),
      metrikaCards: document.querySelectorAll('[data-g2-metrika-quality-section-v360="company"] [data-card]').length,
      project: state.project.name };
  })()`);
  assert.equal(rendered.project, "iCleaning");
  assert.equal(rendered.sourceCards, 71);
  assert.equal(rendered.wizardUnits, 2);
  await screenshot(`artifacts/gate2-service-${baseline ? "before" : "after"}-top.png`);

  const metrika = await evaluate(`(() => {
    const section = document.querySelector('[data-g2-metrika-quality-section-v360="company"]');
    const header = section.querySelector(':scope > [data-g2-toggle-section]');
    if (header.getAttribute('aria-expanded') !== 'true') header.click();
    section.scrollIntoView({ block: 'start', behavior: 'instant' });
    return { html: section.outerHTML, cardIds: [...section.querySelectorAll('[data-card]')].map((node) => node.dataset.card) };
  })()`);
  assert.ok(metrika.cardIds.includes("g2-metrika-company-counter"));
  assert.ok(metrika.cardIds.includes("g2-metrika-company-goals"));
  await screenshot(`artifacts/gate2-service-${baseline ? "before" : "after"}-metrika.png`);
  if (baseline) {
    writeFileSync("artifacts/gate2-service-before-metrika.html", metrika.html);
    console.log(JSON.stringify({ ok: true, baseline, ...rendered, metrikaCards: metrika.cardIds.length }));
  } else {
    const originalCards = (html) => [...html.matchAll(
      /<article id="g2-metrika-company-(?:counter|goals)"[\s\S]*?<\/article>/g,
    )].map((match) => match[0]);
    const baselineHtml = readFileSync("artifacts/gate2-service-before-metrika.html", "utf8");
    assert.equal(originalCards(metrika.html).length, 2);
    assert.deepEqual(originalCards(metrika.html), originalCards(baselineHtml),
      "Metrika Company counter and goal fields must remain unchanged");
    const preview = await evaluate(`(() => {
      const product = guruV194SelectedProduct(state);
      if (!product) throw new Error('No selected product for service preview');
      window.__g2sbTestProductId = product.id;
      window.__g2sbTestConfig = {
        id: 'smoke-metrika-service', scope: 'product',
        title: 'Тестовый сервис: Метрика', serviceUrl: 'https://metrika.yandex.ru/',
        gate0Applicability: ({ workspace }) => workspace.project.website ? 'required' : 'not_needed',
        steps: [
          { step_id: 'find_counter', what: 'Найдите счётчик проекта.', where: 'Метрика / Мои счётчики',
            how: 'Сверьте номер с проектом.', source_url: 'https://yandex.ru/support/metrica/ru/general/tag-id', resultType: 'checkbox' },
          { step_id: 'check_counter', what: 'Проверьте счётчик на рабочей странице.', where: 'Настройки / Проверка счётчика',
            how: 'Запишите номер счётчика, найденный сервисом.', source_url: 'https://yandex.ru/support/metrica/ru/general/check-counter', resultType: 'text' },
          { step_id: 'check_goal', what: 'Проверьте тестовое достижение цели.', where: 'Цели / нужная цель',
            how: 'Выполните действие на сайте и убедитесь, что цель сработала.',
            source_url: 'https://yandex.ru/support/metrica/ru/general/check-goal.html', resultType: 'checkbox' },
        ],
      };
      g2ServiceBlockRegister(window.__g2sbTestConfig);
      g2ServiceBlockMountRegistered();
      const autoMounted = Boolean(document.querySelector('.g2w-workspace [data-g2sb-id="smoke-metrika-service"]'));
      renderGate();
      const mountedAfterRender = document.querySelectorAll('.g2w-workspace [data-g2sb-id="smoke-metrika-service"]').length;
      const legacyAfterRender = document.querySelectorAll('.g2w-workspace [data-card]').length;
      els.appShell.hidden = true;
      const root = document.createElement('main');
      root.id = 'g2sb-smoke-preview';
      root.style.cssText = 'max-width:980px;margin:48px auto;padding:0 18px;';
      root.innerHTML = g2ServiceBlockHtml(window.__g2sbTestConfig, product.id);
      document.body.append(root);
      window.scrollTo(0, 0);
      const block = root.querySelector('.g2sb-block');
      block.open = true;
      return { productId: product.id, autoMounted, mountedAfterRender, legacyAfterRender,
        steps: block.querySelectorAll('.g2sb-step').length,
        selects: block.querySelectorAll('select').length, controls: block.querySelectorAll('[data-g2sb-step]').length,
        sourceLinks: [...block.querySelectorAll('.g2sb-help')].map((node) => node.href),
        hasEmDash: block.textContent.includes('\\u2014'),
        textBackground: getComputedStyle(block.querySelector('input[type=text]')).backgroundColor };
    })()`);
    assert.equal(preview.steps, 3);
    assert.equal(preview.autoMounted, true);
    assert.equal(preview.mountedAfterRender, 1);
    // Nine technical duplicates are archived in data, hidden on the screen.
    assert.equal(preview.legacyAfterRender, 62);
    assert.equal(preview.selects, 0);
    assert.equal(preview.controls, 3);
    assert.equal(preview.hasEmDash, false);
    assert.equal(preview.textBackground, "rgb(255, 255, 255)");

    const immediate = await evaluate(`(() => {
      const block = document.querySelector('#g2sb-smoke-preview .g2sb-block');
      const checkbox = block.querySelector('[data-g2sb-step="find_counter"]');
      const label = checkbox.closest('.g2sb-check');
      const original = guruPersistStateFast;
      let synchronousWrites = 0;
      guruPersistStateFast = function () { synchronousWrites++; return original.apply(this, arguments); };
      const start = performance.now();
      label.click();
      const clickMs = performance.now() - start;
      guruPersistStateFast = original;
      return { checked: checkbox.checked, pressed: label.classList.contains('is-checked'),
        progress: block.querySelector('[data-g2sb-progress]').textContent,
        status: block.querySelector('[data-g2sb-status]').textContent,
        synchronousWrites, clickMs,
        borderRadius: getComputedStyle(label).borderRadius,
        background: getComputedStyle(label).backgroundColor };
    })()`);
    assert.deepEqual([immediate.checked, immediate.pressed, immediate.progress,
      immediate.status, immediate.synchronousWrites], [true, true, '1 из 3 шагов', 'В работе', 0]);
    assert.equal(immediate.borderRadius, '999px');
    assert.notEqual(immediate.background, 'rgb(255, 255, 255)');

    const saveCheck = await evaluate(`(() => {
      const block = document.querySelector('#g2sb-smoke-preview .g2sb-block');
      const checkbox = block.querySelector('[data-g2sb-step="find_counter"]');
      const input = block.querySelector('[data-g2sb-step="check_counter"]');
      input.focus(); input.value = '12345678'; input.dispatchEvent(new Event('input', { bubbles: true }));
      const card = state.gates.find((gate) => gate.id === 'gate-2').cards.find((item) => item.id === 'g2-service-smoke-metrika-service');
      const record = card.fields.g2SetupWizardV1.byProduct[window.__g2sbTestProductId];
      return { progress: block.querySelector('[data-g2sb-progress]').textContent,
        status: block.querySelector('[data-g2sb-status]').textContent,
        keys: Object.keys(card.fields.g2SetupWizardV1.byProduct),
        first: record.steps.find_counter, second: record.steps.check_counter };
    })()`);
    assert.equal(saveCheck.progress, '2 из 3 шагов');
    assert.equal(saveCheck.status, 'В работе');
    assert.deepEqual(saveCheck.keys, [preview.productId]);
    assert.equal(saveCheck.first.product_id, preview.productId);
    assert.equal(saveCheck.first.verification_type, 'self_reported_action');
    assert.equal(saveCheck.second.params.value, '12345678');
    assert.equal(saveCheck.second.source_url, preview.sourceLinks[1]);
    await screenshot('artifacts/gate2-service-template-smoke.png');

    await wait(700);
    const savedLive = await evaluate(`(() => {
      const saved = JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_PREFIX + ${JSON.stringify(projectId)}));
      return saved.gates.find((gate) => gate.id === 'gate-2').cards.find((card) => card.id === 'g2-service-smoke-metrika-service')
        .fields.g2SetupWizardV1.byProduct[window.__g2sbTestProductId].steps.check_counter.params.value;
    })()`);
    assert.equal(savedLive, '12345678', 'text input must save without a Save button');

    const isolation = await evaluate(`(() => {
      const input = document.querySelector('#g2sb-smoke-preview [data-g2sb-step="check_counter"]');
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.blur(); input.focus();
      input.value = '87654321'; input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      const config = window.__g2sbTestConfig;
      const other = guruV194Products(state).find((item) => item.id !== window.__g2sbTestProductId);
      const otherHtml = g2ServiceBlockHtml(config, other.id);
      const record = g2ServiceBlockRecord(config, window.__g2sbTestProductId);
      const history = record.history.length;
      state.project.website = '';
      document.getElementById('g2sb-smoke-preview').innerHTML = g2ServiceBlockHtml(config, window.__g2sbTestProductId);
      const grey = document.querySelector('#g2sb-smoke-preview .g2sb-block');
      grey.open = true;
      return { otherId: other.id, otherEmpty: !g2ServiceBlockRecord(config, other.id),
        otherMarkupEmpty: otherHtml.includes('0 из 3 шагов'), history,
        latest: record.steps.check_counter.params.value,
        notNeeded: grey.classList.contains('is-not-needed'),
        notNeededLabel: grey.querySelector('[data-g2sb-status]').textContent,
        stepCount: grey.querySelectorAll('.g2sb-step').length,
        disabled: [...grey.querySelectorAll('[data-g2sb-step]')].every((node) => node.disabled) };
    })()`);
    assert.equal(isolation.otherEmpty, true);
    assert.equal(isolation.otherMarkupEmpty, true);
    assert.equal(isolation.latest, '87654321');
    assert.ok(isolation.history > 0);
    assert.deepEqual([isolation.notNeeded, isolation.notNeededLabel, isolation.stepCount, isolation.disabled],
      [true, 'Не требуется по Gate 0', 3, true]);
    await screenshot('artifacts/gate2-service-template-not-needed.png');

    await evaluate("G2_SERVICE_BLOCK_CONFIGS.delete('smoke-metrika-service')");
    const cleanProjects = [];
    for (const name of ['Коричное яблоко', 'SIVRCE', 'ГУРУ']) {
      const result = await evaluate(`(() => {
        const name = ${JSON.stringify(name)};
        const id = 'clean-' + name.toLowerCase().replace(/[^a-zа-яё0-9]+/gi, '-');
        activeProjectId = id;
        state = createFreshWorkspace({ id, name });
        const category = guruV189CreateCategory('Проверочная категория', state);
        const productId = id + '-product';
        guruV189CatalogItems(state).push({ id: productId, name: 'Проверочный продукт', continuum: 'product' });
        megaPlatformSetProductCategoryIds(productId, [category.id], state);
        state.project.gate0ScopeUiV194 = { selectedCategoryId: category.id, selectedProductId: productId };
        els.appShell.hidden = false;
        document.getElementById('g2sb-smoke-preview')?.remove();
        activeView = 'gate'; activeGateId = 'gate-2'; renderGate();
        return { name: state.project.name, gate2: Boolean(document.querySelector('.g2w-workspace')),
          company: document.querySelectorAll('[data-g2w-scope="company"] .g2w-card').length,
          product: document.querySelectorAll('[data-g2w-scope="product"] .g2w-card').length };
      })()`);
      assert.deepEqual(result, { name, gate2: true, company: 2, product: 0 });
      cleanProjects.push(name);
    }
    assert.deepEqual(page.exceptions, [], 'Gate 2 must open without uncaught browser errors');
    console.log(JSON.stringify({ ok: true, baseline, ...rendered, metrikaCards: metrika.cardIds.length,
      previewSteps: preview.steps, liveSaved: true, productKeyOnly: true,
      immediateClickMs: Math.round(immediate.clickMs), history: isolation.history,
      notNeeded: true, cleanProjects, browserErrors: page.exceptions.length }));
  }
} finally {
  if (page) page.close();
  if (browser && browserContextId) {
    try { await browser.call("Target.disposeBrowserContext", { browserContextId }); } catch {}
  }
  if (browser) browser.close();
}
