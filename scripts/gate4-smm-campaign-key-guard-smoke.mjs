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

async function evaluate(client, expression) {
  const response = await client.call("Runtime.evaluate", {
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

async function waitFor(client, expression, timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await evaluate(client, `Boolean(${expression})`)) return;
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
const targets = await (
  await fetch(`http://127.0.0.1:${debugPort}/json`)
).json();
const pageTarget = targets.find((target) => target.id === targetId);
const page = new CdpClient(pageTarget.webSocketDebuggerUrl);
await page.ready;

try {
  await page.call("Runtime.enable");
  await page.call("Page.enable");
  await page.call("Page.addScriptToEvaluateOnNewDocument", {
    source: `{
      const nativeFetch = window.fetch.bind(window);
      window.fetch = (input, init) => String(input).includes("/api/")
        ? Promise.resolve(new Response(JSON.stringify({ ok: true, isolatedSmokeTest: true }), {
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
      id: "gate4-smm-key-guard-smoke",
      name: "Gate 4 SMM campaign key guard smoke",
      lifecycleStatus: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }]));
    location.reload();
    return true;
  })()`);
  await waitFor(page, 'document.querySelector("[data-open-project]")');
  await evaluate(page, 'document.querySelector("[data-open-project]").click(); true');
  await waitFor(page, 'Boolean(state)');

  const result = await evaluate(page, `(() => {
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};
    const now = new Date().toISOString();
    const categoryId = "category-smm-key-guard";
    const products = ["Коза", "Платье", "Рубашка"].map((name, index) => ({
      id: "product-smm-key-guard-" + (index + 1),
      name,
      continuum: "pure_product",
      categoryId,
      createdAt: now,
      source: { kind: "smoke" }
    }));
    state.project.productRegistryV185 = [{
      id: categoryId,
      name: "Тестовая категория",
      legacyNames: [],
      createdAt: now
    }];
    state.project.catalogItemsV189 = products;
    state.gate4Production = {
      campaigns: {},
      launchProduct: products[0].id,
      launchOpen: { rows: {} }
    };
    delete state.gate4SmmContentV299;
    g4SmmContentEnsureV299(state);
    state.project._gate4DuplicateCleanupLogV283 = [{
      id: GATE4_DUPLICATE_CLEANUP_V283,
      status: "completed",
      runs: [{ campaigns: { manualReview: [] } }]
    }];

    const cleanupLogBefore = JSON.stringify(
      state.project._gate4DuplicateCleanupLogV283,
    );
    const realCleanup = gate4DuplicateCleanupV283;
    gate4DuplicateCleanupV283 = () => ({
      changed: false,
      renamedCards: [],
      removed: [],
      preserved: []
    });

    const realLaunchChannels = g4LaunchChannels;
    const canonicalChannels = realLaunchChannels();
    const instagram = canonicalChannels.find((channel) =>
      /instagram.*reels.*stories/i.test(
        [channel.channel, channel.platform, channel.type].join(" "),
      ),
    );
    const youtube = canonicalChannels.find((channel) =>
      /youtube.*shorts.*pre.?roll/i.test(
        [channel.channel, channel.platform, channel.type].join(" "),
      ),
    );
    const faulty = [instagram, youtube].map((channel, offset) => {
      const fullName = [channel.channel, channel.platform, channel.type]
        .filter(Boolean)
        .join(" ");
      const row = {
        channel: fullName,
        platform: fullName,
        type: "",
        launchType: "smm",
        materials: "derived from idea publication"
      };
      return {
        ...row,
        key: g4LaunchChannelKey(row, canonicalChannels.length + offset)
      };
    });
    const rawFaultyKeys = faulty.map((channel) => channel.key);
    const writableProbe = g4CampaignWritableChannelsV301([
      ...canonicalChannels,
      ...faulty,
    ]);
    const canonicalKeysStable = JSON.stringify(
      writableProbe.map((channel) => channel.key),
    ) === JSON.stringify(canonicalChannels.map((channel) => channel.key));
    const preservedCampaignKey = g4CampaignStateKey(
      products[0].id,
      instagram.key,
    );
    state.gate4Production.campaigns[preservedCampaignKey] = {
      product: products[0].id,
      objective: "Сохранить заполненные данные",
      channelTargeting: { geography: "Москва" }
    };
    g4LaunchChannels = () => [...canonicalChannels, ...faulty];

    // The real campaign writer runs while historical cleanup is disabled.
    g4EnsureLaunchCampaigns();
    g4LaunchChannels = realLaunchChannels;

    const ui = guruV194Ui(state);
    const publicationChecks = [];
    products.forEach((product, index) => {
      ui.selectedCategoryId = categoryId;
      ui.selectedProductId = product.id;
      state.gate4Production.launchProduct = product.id;
      guruNavigateToGate("gate-4");
      const idea = g4SmmCreateIdeaV299(product.id);
      idea.insight = "Тестовая идея " + (index + 1);
      renderGate();
      const convert = document.querySelector(
        '[data-g4-smm-idea-convert-v299="' + CSS.escape(idea.id) + '"]',
      );
      convert.click();
      const publication = state.gate4SmmContentV299.publications.find(
        (row) => row.sourceIdeaId === idea.id,
      );
      const format = document.querySelector(
        '[data-g4-smm-publication-card-v299="' + CSS.escape(publication.id) + '"] ' +
        '[data-g4-smm-publication-field-v299="formatId"]',
      );
      format.value = state.gate4SmmStrategyV298.formats[0].id;
      format.dispatchEvent(new Event("change", { bubbles: true }));
      const platforms = document.querySelector(
        '[data-g4-smm-publication-card-v299="' + CSS.escape(publication.id) + '"] ' +
        '[data-g4-smm-publication-field-v299="platforms"]',
      );
      [...platforms.options].forEach((option) => {
        option.selected = ["Instagram Reels", "YouTube Shorts"].includes(
          option.value,
        );
      });
      platforms.dispatchEvent(new Event("change", { bubbles: true }));
      const savedPublication = state.gate4SmmContentV299.publications.find(
        (row) => row.id === publication.id,
      );
      publicationChecks.push({
        productId: product.id,
        publicationId: publication.id,
        platforms: [...savedPublication.platforms]
      });
    });

    const auditWithoutCleanup = g4CampaignDuplicateAuditV283(state);
    const campaignKeys = Object.keys(state.gate4Production.campaigns);
    const cleanupLogWhileDisabled = JSON.stringify(
      state.project._gate4DuplicateCleanupLogV283,
    );
    gate4DuplicateCleanupV283 = realCleanup;
    const insurance = realCleanup(state);
    const cleanupLogAfterInsurance = JSON.stringify(
      state.project._gate4DuplicateCleanupLogV283,
    );

    return {
      build: window.GURU_BUILD_INFO?.version || "",
      guard: G4_CAMPAIGN_WRITER_KEY_GUARD_V301,
      products: products.length,
      canonicalChannels: canonicalChannels.length,
      rawFaultyKeys,
      canonicalKeysStable,
      canonicalCampaignPreserved:
        state.gate4Production.campaigns[preservedCampaignKey]?.objective ===
          "Сохранить заполненные данные" &&
        state.gate4Production.campaigns[preservedCampaignKey]
          ?.channelTargeting?.geography === "Москва",
      rawFaultyKeysRepeat: rawFaultyKeys.every((key) =>
        g4CampaignDuplicatePatternV283(
          products[0].id.replaceAll("-", "_") + "_" + key,
          { product: products[0].id },
          state,
        ),
      ),
      campaignCount: campaignKeys.length,
      duplicateCountWithoutCleanup: auditWithoutCleanup.duplicateCount,
      faultyKeysPersisted: rawFaultyKeys.filter((badKey) =>
        campaignKeys.some((key) => key.endsWith("_" + badKey)),
      ),
      publicationChecks,
      cleanupLogUnchangedWhileDisabled:
        cleanupLogBefore === cleanupLogWhileDisabled,
      insurance: {
        changed: insurance.changed,
        removed: insurance.removed.length,
        preserved: insurance.preserved.length,
        logUnchanged:
          cleanupLogWhileDisabled === cleanupLogAfterInsurance
      },
      errors: window.__guruConsoleLog?.filter(
        (entry) => entry.level === "error",
      ) || []
    };
  })()`);

  assert(result.build === "2.3.124", `Unexpected build ${result.build}`);
  assert(
    result.guard === "gate4-campaign-writer-key-guard-v301",
    "Campaign writer guard is missing",
  );
  assert(result.products === 3, "Expected three products");
  assert(result.canonicalChannels === 15, "Expected 15 canonical channels");
  assert(result.rawFaultyKeysRepeat, "Fixture did not reproduce repeated keys");
  assert(result.canonicalKeysStable, "Canonical channel keys changed");
  assert(
    result.canonicalCampaignPreserved,
    "Existing canonical campaign data changed",
  );
  assert(
    result.campaignCount === 45,
    `Expected 15 × 3 campaigns, got ${result.campaignCount}: ${JSON.stringify(result)}`,
  );
  assert(
    result.duplicateCountWithoutCleanup === 0,
    "Writer persisted duplicate keys while cleanup was disabled",
  );
  assert(
    result.faultyKeysPersisted.length === 0,
    "A raw name_name channel key reached campaign storage",
  );
  assert(
    result.publicationChecks.length === 3 &&
      result.publicationChecks.every(
        (publication) =>
          JSON.stringify(publication.platforms) ===
          JSON.stringify(["Instagram Reels", "YouTube Shorts"]),
      ),
    `Idea → publication flow did not preserve the selected platforms: ${JSON.stringify(result.publicationChecks)}`,
  );
  assert(
    result.cleanupLogUnchangedWhileDisabled,
    "Cleanup log changed while cleanup was disabled",
  );
  assert(
    !result.insurance.changed &&
      result.insurance.removed === 0 &&
      result.insurance.preserved === 0 &&
      result.insurance.logUnchanged,
    `Insurance was needed: ${JSON.stringify(result.insurance)}`,
  );
  assert(!result.errors.length, `Console errors: ${JSON.stringify(result.errors)}`);

  console.log(JSON.stringify(result, null, 2));
} finally {
  page.close();
  await browser.call("Target.disposeBrowserContext", { browserContextId });
  browser.close();
}
