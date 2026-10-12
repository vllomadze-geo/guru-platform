const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9339";
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

  close() { this.socket.close(); }
}

let browser;
let page;
let browserContextId = "";
let targetId = "";

async function evaluate(expression) {
  const response = await page.call("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (response.exceptionDetails)
    throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
  return response.result.value;
}

async function waitFor(expression, timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await wait(100);
  }
  throw new Error(`Timed out waiting for ${expression}`);
}

try {
  const version = await (await fetch(`http://127.0.0.1:${debugPort}/json/version`)).json();
  browser = new CdpClient(version.webSocketDebuggerUrl);
  await browser.ready;
  ({ browserContextId } = await browser.call("Target.createBrowserContext"));
  ({ targetId } = await browser.call("Target.createTarget", { url: "about:blank", browserContextId }));
  const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
  const target = targets.find((row) => row.id === targetId);
  page = new CdpClient(target.webSocketDebuggerUrl);
  await page.ready;
  await page.call("Runtime.enable");
  await page.call("Page.enable");
  await page.call("Page.navigate", { url: appUrl });
  await waitFor('document.readyState === "complete"');
  await waitFor('typeof g4RsyaChannelCardV289 === "function"');

  const result = await evaluate(`(async () => {
    state = createFreshWorkspace({ id: "rsya-smoke", name: "RSYA smoke" });
    activeProjectId = "rsya-smoke";
    state.gate4SearchBuild = { sentinel: { untouched: true } };
    state.gate4Rsya = {
      smoke_product: {
        groups: [{
          name: "Старая группа",
          audienceType: "warm_thematic",
          segment: "Ручной сегмент",
          scenario: "Старый JTBD",
          offer: "Старый оффер",
          landing: "https://example.test/product?ref=old#buy",
          signals: "коза для дома",
          exclusions: "бесплатно",
          ads: [{ title: "Старый заголовок", text: "Старый текст", cta: "Заказать" }],
        }],
        exclusions: {},
      },
    };
    const searchBefore = JSON.stringify(state.gate4SearchBuild);
    const d = ensureGate4RsyaV289("smoke-product");
    const group = d.groups[0];
    const ad = group.ads[0];
    const stableIds = [group.id, ad.id, ad.headings[0].id, ad.texts[0].id];

    g4RsyaProjectOptionsV289 = () => ({
      product: [{ id: "p", value: "Товар проекта", label: "Товар проекта", source: "Gate 4" }],
      segment: [{ id: "s", value: "Новый сегмент", label: "Новый сегмент", source: "Gate 1" }],
      jtbd: [{ id: "j", value: "Новый JTBD", label: "Новый JTBD", source: "Gate 0" }],
      benefit: [{ id: "b", value: "Новая выгода", label: "Новая выгода", source: "Gate 1" }],
      usp: [{ id: "u", value: "Новое УТП", label: "Новое УТП", source: "Gate 0" }],
      offer: [{ id: "o", value: "Новый оффер", label: "Новый оффер", source: "Gate 0" }],
      targetAction: [{ id: "c", value: "Новый CTA", label: "Новый CTA", source: "Gate 0" }],
      landing: [{ id: "l", value: "https://example.test/new", label: "Новая посадочная", source: "Gate 1" }],
      projectPhotos: [],
    });
    group.benefit = "";
    group.usp = "";
    group.targetAction = "";
    g4RsyaProjectFillV289("smoke-product", group);
    const fillPreserved = group.segment === "Ручной сегмент" && group.offer === "Старый оффер";
    const fillAdded = group.benefit === "Новая выгода" && group.usp === "Новое УТП" && group.targetAction === "Новый CTA";
    group.segment = "Ручная правка после подстановки";
    g4RsyaProjectFillV289("smoke-product", group);
    const repeatedFillPreserved = group.segment === "Ручная правка после подстановки";

    const duplicate = g4RsyaCloneAdV289(ad);
    duplicate.headings[0].value = "Независимая копия";
    const duplicateIndependent = duplicate.id !== ad.id && duplicate.headings[0].id !== ad.headings[0].id && ad.headings[0].value === "Старый заголовок";

    const exactLimit = g4RsyaTextIssuesV289("x".repeat(60), "heading", true).includes("Сократите заголовок на 4 симв.");
    const narrowLimit = g4RsyaTextIssuesV289("Текст" + "!".repeat(16), "text", true).some((value) => value.includes("Уберите 1 узк."));
    const utm = g4RsyaApplyUtmV289("https://example.test/product?utm_source=old&ref=1#buy", "utm_source=yandex&utm_medium=cpc");
    const utmUrl = new URL(utm);
    const utmStable = utmUrl.searchParams.getAll("utm_source").length === 1 && utmUrl.searchParams.get("utm_source") === "yandex" && utmUrl.searchParams.get("ref") === "1" && utmUrl.hash === "#buy";
    const lineListCopy = g4RsyaCopyValueV289("первая, вторая; третья\\nчетвёртая", "lines") === "первая\\nвторая\\nтретья\\nчетвёртая";
    const requiredGroupIssues = ["segment", "jtbd", "offer"].every((field) =>
      g4RsyaGroupIssuesV289({ ...group, [field]: "" }).length > g4RsyaGroupIssuesV289(group).length
    );

    ad.landing = "https://example.test/product";
    ad.images = [{ id: "image-ok", name: "image.png", type: "image/png", size: 1000, width: 800, height: 800, dataUrl: "data:image/png;base64,AA==" }];
    ad.callouts = [];
    ad.sitelinks = [];
    const optionalEmptyDoesNotFail = !g4RsyaAdIssuesV289(ad).some((value) => /Уточнение|Быстрая ссылка|CTA|Видео/.test(value));
    ad.callouts.push({ id: "blank-callout", value: "" });
    const startedOptionalFails = g4RsyaAdIssuesV289(ad).some((value) => value.includes("Уточнение 1: Заполните поле"));
    ad.callouts = [];

    const campaign = { decision: "launch", campaignName: "РСЯ · тест", budget: "10000", utm: "utm_source=yandex" };
    Object.assign(d.campaign, { geography: "Москва", schedule: "24/7", strategy: "max_clicks", budgetPeriod: "week" });
    group.name = "Группа РСЯ";
    group.interests = "Покупатели услуги";
    const channel = { key: "yandex-rsya", launchType: "media", channel: "Яндекс Директ", platform: "РСЯ", type: "Сети", status: "active", materials: "баннеры" };
    state.gate4Production = state.gate4Production || {};
    state.gate4Production.campaigns = { [g4CampaignStateKey("smoke-product", channel.key)]: campaign };
    const open = g4EnsureLaunchUiState();
    open.rows[g4CampaignStateKey("smoke-product", channel.key)] = true;
    d.ui.workflowStepOpenV453 = { groups: true, launch: true };
    const html = g4RsyaChannelCardV289(channel, campaign, 0, "smoke-product");
    const host = document.createElement("div");
    host.innerHTML = html;
    const sections = Array.from(host.querySelectorAll("[data-g4rsya-v453-step] .g1-card-title")).map((node) => node.textContent.trim());
    const vertical = sections.join("|") === "1JTBD и группы|2Запуск";
    const controls = {
      projectFill: host.querySelectorAll("[data-g4rsya-v289-fill-project]").length,
      copy: host.querySelectorAll("[data-g4rsya-v289-copy]").length,
      package: host.querySelectorAll("[data-g4rsya-v289-copy-package]").length,
      all: host.querySelectorAll("[data-g4rsya-v289-copy-all]").length,
      imageUpload: host.querySelectorAll("[data-g4rsya-v289-image-input]").length,
    };
    document.body.replaceChildren(host);
    const originalRenderGate = renderGate;
    const originalFlashSaving = flashSaving;
    const originalCopyText = g4sbV141CopyText;
    renderGate = () => {};
    flashSaving = () => {};
    window.__rsyaCopied = "";
    g4sbV141CopyText = async (text) => { window.__rsyaCopied = text; };

    host.querySelector('[data-g4rsya-v289-add-variant="heading"]').click();
    host.querySelector('[data-g4rsya-v289-add-variant="text"]').click();
    host.querySelector('[data-g4rsya-v289-add-sitelink]').click();
    host.querySelector('[data-g4rsya-v289-duplicate-ad]').click();
    await Promise.resolve();
    const interactive = g4RsyaFindV289("smoke-product", group.id, ad.id);
    const uiAddsWork = interactive.ad.headings.length === 2 && interactive.ad.texts.length === 2 && interactive.ad.sitelinks.length === 1;
    const uiDuplicateWorks = interactive.group.ads.length === 2 && interactive.group.ads[1].id !== interactive.group.ads[0].id;
    const headingCopy = Array.from(host.querySelectorAll('[data-g4rsya-v289-copy]')).find((node) => node.dataset.g4rsyaV289Copy === "Старый заголовок");
    headingCopy.click();
    await Promise.resolve();
    const rawCopyWorks = window.__rsyaCopied === "Старый заголовок";
    const canvas = document.createElement("canvas");
    canvas.width = 500;
    canvas.height = 500;
    canvas.getContext("2d").fillRect(0, 0, 500, 500);
    const imageBlob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    const imageFile = new File([imageBlob], "rsya-smoke.png", { type: "image/png" });
    const afterUpload = g4RsyaFindV289("smoke-product", group.id, ad.id);
    const uploadedImage = await g4RsyaReadFileV289(imageFile, "image");
    afterUpload.ad.images.push(uploadedImage);
    const imageUploadWorks = Boolean(uploadedImage && uploadedImage.width === 500 && uploadedImage.height === 500 && !g4RsyaImageIssuesV289(uploadedImage).length);
    afterUpload.ad.headings = afterUpload.ad.headings.slice(0, 1);
    afterUpload.ad.texts = afterUpload.ad.texts.slice(0, 1);
    afterUpload.ad.sitelinks = [];
    afterUpload.ad.images = afterUpload.ad.images.filter((image) => image.id !== uploadedImage?.id);
    afterUpload.group.ads = afterUpload.group.ads.slice(0, 1);
    renderGate = originalRenderGate;
    flashSaving = originalFlashSaving;
    g4sbV141CopyText = originalCopyText;

    const reloadedWorkspace = migrateWorkspace(JSON.parse(JSON.stringify(state)), "rsya-smoke");
    const roundTrip = reloadedWorkspace.gate4Rsya.smoke_product;
    const persistedIds = [roundTrip.groups[0].id, roundTrip.groups[0].ads[0].id, roundTrip.groups[0].ads[0].headings[0].id, roundTrip.groups[0].ads[0].texts[0].id];
    const isolatedWorkspace = createFreshWorkspace({ id: "rsya-smoke-other", name: "RSYA isolated smoke" });
    const productIsolation = !isolatedWorkspace.gate4Rsya?.smoke_product;
    return {
      build: window.GURU_BUILD_INFO?.version,
      migratedLegacy: ad.headings[0].value === "Старый заголовок" && ad.texts[0].value === "Старый текст" && ad.legacyCta === "Заказать",
      stableRoundTrip: JSON.stringify(stableIds) === JSON.stringify(persistedIds),
      productIsolation,
      searchUntouched: JSON.stringify(state.gate4SearchBuild) === searchBefore,
      fillPreserved,
      fillAdded,
      repeatedFillPreserved,
      duplicateIndependent,
      exactLimit,
      narrowLimit,
      utmStable,
      lineListCopy,
      requiredGroupIssues,
      optionalEmptyDoesNotFail,
      startedOptionalFails,
      vertical,
      sections,
      controls,
      uiAddsWork,
      uiDuplicateWorks,
      rawCopyWorks,
      imageUploadWorks,
      uploadedImage: uploadedImage ? { name: uploadedImage.name, width: uploadedImage.width, height: uploadedImage.height, type: uploadedImage.type, issues: g4RsyaImageIssuesV289(uploadedImage) } : null,
      readyStatus: g4RsyaCampaignStatusV289(campaign, d),
      limits: G4_RSYA_LIMITS_V289,
    };
  })()`);

  assert(Boolean(result.build), `Build information is missing: ${result.build}`);
  assert(result.migratedLegacy, "Legacy RSYA title/text/CTA were not preserved");
  assert(result.stableRoundTrip, "Stable ids were not preserved through JSON persistence");
  assert(result.productIsolation, "RSYA data leaked into a clean product workspace");
  assert(result.searchUntouched, "RSYA workflow changed Search storage");
  assert(result.fillPreserved && result.fillAdded && result.repeatedFillPreserved, "Project fill overwrote manual data or skipped empty fields");
  assert(result.duplicateIndependent, "Duplicated ad shares ids/data with the original");
  assert(result.exactLimit && result.narrowLimit, "Exact Direct text validation failed");
  assert(result.utmStable, "UTM merge duplicated a key or lost query/hash data");
  assert(result.lineListCopy, "Phrase/minus-phrase copy is not normalized to one row per value");
  assert(result.requiredGroupIssues, "Required audience/JTBD/offer fields do not affect readiness");
  assert(result.optionalEmptyDoesNotFail && result.startedOptionalFails, "Optional element readiness rules failed");
  assert(result.vertical, `Wrong section order: ${result.sections.join(" | ")}`);
  assert(result.controls.projectFill > 0 && result.controls.copy > 0 && result.controls.package > 0 && result.controls.all === 1 && result.controls.imageUpload > 0, "Transfer controls are missing");
  assert(result.uiAddsWork && result.uiDuplicateWorks, "UI add/duplicate controls did not mutate the current RSYA model");
  assert(result.rawCopyWorks, "Field copy included formatting or a label");
  assert(result.imageUploadWorks, `Image upload did not persist valid dimensions/metadata: ${JSON.stringify(result)}`);
  assert(result.readyStatus === "ready", `Expected ready campaign, got ${result.readyStatus}`);
  assert(result.limits.ads === 3 && result.limits.headings === 7 && result.limits.texts === 3 && result.limits.images === 5 && result.limits.videos === 6, "Composition limits differ from current Direct docs");

  console.log(JSON.stringify(result, null, 2));
} finally {
  try { page?.close(); } catch (_error) {}
  try { if (browserContextId) await browser?.call("Target.disposeBrowserContext", { browserContextId }); } catch (_error) {}
  try { browser?.close(); } catch (_error) {}
}
