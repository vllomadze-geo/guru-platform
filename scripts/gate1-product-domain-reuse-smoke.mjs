import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = JSON.parse(readFileSync(process.env.GURU_GATE1_EXPORT || '/Users/vl/Downloads/gate-1.json', 'utf8'));
const fixture = JSON.parse(JSON.stringify({ content: {
  project: source.content.project, projectComparison: source.content.projectComparison,
  painV130: source.content.painV130, unitV130: source.content.unitV130,
  unitEconomicsRoute: source.content.unitEconomicsRoute,
}, structure: source.structure }, (_key, value) => typeof value === 'string' && value.startsWith('data:image/')
  ? '[image omitted for isolated test]' : value));
const appUrl = process.env.GURU_APP_URL || 'http://127.0.0.1:3000/';
const debugPort = process.env.GURU_CHROME_DEBUG_PORT || '49337';

class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url); this.id = 0; this.pending = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
    this.socket.addEventListener('message', event => {
      const message = JSON.parse(event.data), task = this.pending.get(message.id);
      if (!task) return;
      this.pending.delete(message.id); clearTimeout(task.timer);
      message.error ? task.reject(new Error(message.error.message)) : task.resolve(message.result);
    });
  }
  async call(method, params = {}) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const id = ++this.id, timer = setTimeout(() => reject(new Error(`CDP timeout: ${method}`)), 60000);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.socket.close(); }
}

const version = await (await fetch(`http://127.0.0.1:${debugPort}/json/version`)).json();
const browser = new Cdp(version.webSocketDebuggerUrl);
const { browserContextId } = await browser.call('Target.createBrowserContext');
const { targetId } = await browser.call('Target.createTarget', { url: 'about:blank', browserContextId });
const tabs = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
const page = new Cdp(tabs.find(tab => tab.id === targetId).webSocketDebuggerUrl);
const evaluate = async expression => {
  const result = await page.call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
};

try {
  await page.call('Runtime.enable'); await page.call('Page.enable');
  await page.call('Page.navigate', { url: appUrl });
  for (let attempt = 0; attempt < 200; attempt++) {
    if (await evaluate('document.readyState === "complete" && typeof g1ProductComparisonDomainMatch === "function"')) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  const result = await evaluate(`(() => {
    rememberAccessUnlocked(); setAccessState(true); bootstrapAppOnce();
    state = createFreshWorkspace({ id: 'domain-reuse-test', name: 'Проверка доменов' });
    const imported = ${JSON.stringify(fixture)};
    for (const [key, value] of Object.entries(imported.content)) state[key] = structuredClone(value);
    state.gates[state.gates.findIndex(g => g.id === 'gate-1')] = structuredClone(imported.structure);
    state.project.id = 'domain-reuse-test'; activeProjectId = state.project.id;
    activeView = 'gate'; activeGateId = 'gate-1'; guruV194Ensure(state);
    els.launcher.hidden = true; els.appShell.hidden = false;
    document.body.classList.remove('access-locked'); updateProjectChrome();
    const product = guruV194Product('catalog-item-1786792591872-51f503', state);
    const entry = ensureProjectComparisonProduct(product.id); entry.open = true; entry.competitors = [];
    const otherId = guruV194Products(state).find(row => row.id !== product.id)?.id || 'other-product';
    const company = { id: 'company-source', name: 'Компания А', domain: 'https://www.shared.example/catalog',
      siteDomainV538: 'shared.example', bergenV543: { advertisements: 'Заголовок — Описание',
        landingUrl: 'https://shared.example/catalog', product: 'Описание', cta: 'Купить',
        searchPreviewV569: { rating: '4.8', reviews: '12' } } };
    const other = { id: 'other-source', name: 'Товар Б', domain: 'other.example',
      siteDomainV538: 'other.example', bergenV543: { advertisements: 'Другой заголовок',
        product: 'Другой товар', similarity: 'yes', comparisonTypeV603: 'direct' },
      comparisonCriteriaV603: { answers: { delivery: 'yes' } } };
    state.projectComparison.competitors.push(company);
    state.projectComparison.productsById[otherId] ||= { product_id: otherId, open: false, competitors: [], criteria: [] };
    state.projectComparison.productsById[otherId].competitors.push(other);
    const companyBefore = JSON.stringify(company), otherBefore = JSON.stringify(other);
    flashSaving = () => {}; guruPersistStateFast = () => true; saveState = () => true;
    els.contentArea.innerHTML = projectComparisonProductHtml(product);
    const root = els.contentArea.querySelector('[data-g1pc-unified]');
    const open = () => { root.querySelector('[data-g1pc-form-toggle]').click(); return root.querySelector('[data-g1pc-form]'); };
    let form = open(); form.elements.domain.value = 'https://www.shared.example/another/path';
    form.elements.domain.dispatchEvent(new Event('input', { bubbles: true }));
    const companyNotice = form.querySelector('[data-g1pc-domain-note]').textContent;
    const companyReuse = form.classList.contains('is-reuse') && companyNotice.includes('компании') &&
      getComputedStyle(form.querySelector('.g1pc-preview-title')).display === 'none';
    form.requestSubmit();
    const reusedCompany = entry.competitors.find(row => row.siteDomainV538 === 'shared.example');
    const companySaved = !!reusedCompany && reusedCompany.bergenV543.product === 'Описание' &&
      reusedCompany.bergenV543.searchPreviewV569.rating === '4.8' &&
      reusedCompany.reusedFromV604.id === company.id && JSON.stringify(company) === companyBefore;
    form = open(); form.elements.domain.value = 'shared.example';
    form.elements.domain.dispatchEvent(new Event('input', { bubbles: true }));
    const currentReuse = form.querySelector('[data-g1pc-domain-note]').textContent.includes('этого продукта');
    const count = entry.competitors.length, unchanged = JSON.stringify(reusedCompany);
    form.requestSubmit();
    const currentSaved = entry.competitors.length === count && JSON.stringify(reusedCompany) === unchanged;
    form = open(); form.elements.domain.value = 'other.example';
    form.elements.domain.dispatchEvent(new Event('input', { bubbles: true }));
    const productNotice = form.querySelector('[data-g1pc-domain-note]').textContent;
    form.requestSubmit();
    const reusedProduct = entry.competitors.find(row => row.siteDomainV538 === 'other.example');
    const productSaved = !!reusedProduct && productNotice.includes('продукта') &&
      reusedProduct.bergenV543.product === 'Другой товар' &&
      !('similarity' in reusedProduct.bergenV543) &&
      !('comparisonTypeV603' in reusedProduct.bergenV543) &&
      !reusedProduct.comparisonCriteriaV603 && JSON.stringify(other) === otherBefore;
    return { companyReuse, companySaved, currentReuse, currentSaved, productSaved,
      count: entry.competitors.length, ids: entry.competitors.map(row => row.id) };
  })()`);
  assert(result.companyReuse && result.companySaved && result.currentReuse && result.currentSaved && result.productSaved,
    JSON.stringify(result));
  assert.equal(result.count, 2, JSON.stringify(result));
  assert.equal(new Set(result.ids).size, 2, JSON.stringify(result));
  console.log(JSON.stringify(result));
} finally {
  page.close();
  await browser.call('Target.disposeBrowserContext', { browserContextId }).catch(() => {});
  browser.close();
}
