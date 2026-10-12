const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9337";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
  const result = await page.call("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) {
    throw new Error(
      result.exceptionDetails.exception?.description ||
        result.exceptionDetails.text,
    );
  }
  return result.result.value;
}

async function waitFor(page, expression, timeout = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await evaluate(page, `Boolean(${expression})`)) return;
    await wait(100);
  }
  throw new Error(`Timed out waiting for: ${expression}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const pages = await (
  await fetch(`http://127.0.0.1:${debugPort}/json`)
).json();
const target = pages.find((item) => item.type === "page");
if (!target) throw new Error("Headless Chrome page was not found");
const page = new CdpClient(target.webSocketDebuggerUrl);
await page.ready;
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
await waitFor(page, 'typeof guruGateContentPayloadV120 === "function"');

const projectId = "gate1-export-self-contained-smoke";
await evaluate(
  page,
  `(() => {
    const workspace = structuredClone(window.GURU_SEED);
    workspace.project.id = ${JSON.stringify(projectId)};
    workspace.project.name = "Gate 1 export self-contained smoke";
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
  })()`,
);
await waitFor(page, 'document.querySelector("[data-open-project]")');
await evaluate(
  page,
  'document.querySelector("[data-open-project]").click(); true',
);
await waitFor(
  page,
  `Boolean(state) && activeProjectId === ${JSON.stringify(projectId)}`,
);

const result = await evaluate(
  page,
  `(() => {
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};
    const gate0 = state.gates.find((gate) => gate.id === "gate-0");
    const gate1 = state.gates.find((gate) => gate.id === "gate-1");
    const card = (id) => gate1.cards.find((item) => item.id === id);

    const megaCard = gate0.cards.find(isMegaMarketingCard);
    const mega = ensureMegaMarketing(megaCard, state);
    const home = mega.platformV2.fundamental.find(
      (item) => item.name === "Главная страница",
    );
    home.url = "https://robots-export.example/";
    home.status = "works";

    ensureRobotsV130(card("card-14"), state);
    const robots = card("card-14").robotsV130;
    robots.url = "https://robots-export.example/robots.txt";
    robots.domain = "robots-export.example";
    robots.yandex.enabled = "yes";
    robots.yandex.errors = "0";
    robots.yandex.source = "https://webmaster.yandex.ru/robots-sentinel";
    robots.yandex.sitemaps = [{
      url: "https://robots-export.example/sitemap.xml",
      status: "ok"
    }];
    robots.yandex.urlResults = [{
      url: home.url,
      type: "Главная страница",
      expect: "Разрешено",
      result: "Разрешено"
    }];
    robots.summary = robots.summary || {};
    robots.summary.conclusion = "Robots export sentinel";

    ensureRedirectV130(card("card-16"));
    const redirects = card("card-16").redirectV130;
    redirects.domain = "canonical-export.example";
    redirects.rows = redirectV130BuildRows(redirects.domain, redirects.rows);
    redirects.rows.forEach((row) => {
      row.code = row.expectedCode;
      row.result = "ok";
    });

    ensureSslV130(card("card-20"));
    const ssl = card("card-20").sslV130;
    Object.assign(ssl, {
      domain: "ssl-export.example",
      httpsWorks: "yes",
      httpCode: "200",
      certValid: "yes",
      domainMatch: "yes",
      expiresIn: "90",
      chain: "trusted",
      evidence: "https://www.ssllabs.com/ssltest/analyze.html?d=ssl-export.example"
    });

    const pageRow = card("card-21").pageRows[0];
    Object.assign(pageRow, {
      url: "https://page-export.example/",
      metaRobotsStatus: "works",
      cwvStatus: "works",
      imagesStatus: "works",
      auditEvidence: "https://page-export.example/audit-proof",
      title: "Export title sentinel",
      description: "Export description sentinel",
      finalCta: "Export CTA sentinel"
    });
    pageRow.cwvData = {
      mobile: { performance: "91", lcp: "1.8", inp: "120", cls: "0.02", issue: "", status: "works" },
      desktop: { performance: "99", lcp: "1.1", inp: "70", cls: "0.01", issue: "", status: "works" },
      evidence: "https://pagespeed.web.dev/page-export-sentinel"
    };

    state.demandRoute = structuredClone(DEMAND_ROUTE_DEFAULT);
    state.painOfferRoute = structuredClone(PAIN_OFFER_DEFAULT);
    state.unitEconomicsRoute = structuredClone(UNIT_ECONOMICS_DEFAULT);
    state.demandV130 = {
      search: { platform: "yandex", steps: { frames: { product: "Demand export sentinel" } } },
      banner: { platform: "rsya", steps: { frames: { product: "Banner export sentinel" } } }
    };
    state.painV130 = state.painV130 || {};
    state.painV130.productMaps = [{
      ...pv140EmptyProductMap("Export direction"),
      product_id: "export-direction-id",
      explicitProblem: "Pain export sentinel",
      jtbd: "JTBD export sentinel",
      finalOffer: "Offer export sentinel",
      items: {}
    }];
    state.unitV130 = { items: [{
      type: "product",
      name: "Unit export product",
      productKey: "unit-export-product",
      product_id: "unit-export-id",
      period: "month",
      model: "purchase",
      dataSource: "CRM export sentinel",
      steps: {
        revenue: { avgCheck: "12345", source: "CRM export sentinel" },
        margin: { marginPct: "40" },
        ltv: { ltv: "45678" },
        adLimits: { targetDrr: "15", allowedCpa: "2000" },
        decision: { decision: "promote", reason: "Unit export ready" }
      }
    }] };

    const segment = guruV309ProjectSegmentRecord(state, true);
    segment.value = "Company segmentation export sentinel";
    const positioning = guruV308ProjectPositioningRecord(state, true);
    positioning.value = "Company positioning export sentinel";
    positioning.positioning.key_difference = "Company difference export sentinel";
    const purpose = guruV349ProjectBrandPurposeRecord(state, true);
    purpose.value = "Company purpose export sentinel";
    const offer = guruV347ProjectCompanyOfferRecord(state, true);
    offer.value = "Company offer export sentinel";
    const foundation = guruCompanyKeywordFoundationRecordV351(state, true);
    foundation.keywords = [{
      id: "company-keyword-export-sentinel",
      value: "company keyword export sentinel",
      source: "manual",
      status: "confirmed"
    }];
    const company = gate1CompanySemanticsV264(state);
    company.brandPhrases = "brand phrase export sentinel";
    company.demandRows = [{
      id: "company-demand-export-sentinel",
      candidate_id: "company-keyword-export-sentinel",
      kw: "company keyword export sentinel",
      vol: "100",
      queryCount: "90",
      forecastClicks: "20",
      clickPrice: "50",
      bid: "60",
      forecastBudget: "1000"
    }];
    state.projectComparison = state.projectComparison || {};
    state.projectComparison.summary = state.projectComparison.summary || {};
    state.projectComparison.summary.ourStronger = "Comparison export sentinel";
    state.targetAudience = state.targetAudience || {};
    state.targetAudience.segments = [{
      id: "audience-export-sentinel",
      name: "Audience export sentinel"
    }];

    const screenSections = getGate1Sections(gate1, gate1.cards).map((section) => ({
      key: section.key || "",
      title: section.title || "",
      cardIds: (section.allInnerCards || section.cards || []).map((item) => item.id)
    }));
    const before = JSON.stringify(state);
    const payload = guruGateContentPayloadV120("gate-1");
    const projectPayload = guruExportProjectPayloadV223();
    const projectGate1 = projectPayload.gates.find(
      (item) => item.exportedGateId === "gate-1",
    );
    const after = JSON.stringify(state);
    const exportedCard = (id) =>
      payload.structure.cards.find((item) => item.id === id);
    const synthetic = (id) =>
      payload.resolvedSections
        .flatMap((section) => section.syntheticCards || [])
        .find((item) => item.id === id);
    const exportedScopeIds = Object.fromEntries(
      payload.resolvedSections.map((section) => [section.scope, section.cardIds]),
    );
    const localMetadataKeys = new Set([
      "id", "title", "instruction", "status", "sourceRow", "gateId",
      "gateTitle", "generatedBy", "displayScope", "resolvedContent"
    ]);
    const allCardLocalFieldsPreserved = gate1.cards.every((sourceCard) => {
      const exported = exportedCard(sourceCard.id);
      return Object.keys(sourceCard)
        .filter((key) => !localMetadataKeys.has(key))
        .every((key) => Object.hasOwn(
          exported.resolvedContent.cardLocalData,
          key,
        ));
    });
    const screenCompanyIds = screenSections
      .filter((section) => section.key === "site_audit")
      .flatMap((section) => section.cardIds);
    const screenProductIds = screenSections
      .filter((section) => [
        "__g1_product_pages",
        "demand_semantics",
        "pain_jtbd_offer",
        "unit_economics"
      ].includes(section.key))
      .flatMap((section) => section.cardIds);
    return {
      stateUnchanged: before === after,
      cardCount: payload.structure.cards.length,
      allCardsResolved: payload.structure.cards.every(
        (item) => item.resolvedContent?.schemaVersion ===
          "guru-gate1-resolved-content-v1" && item.displayScope,
      ),
      gateAliasResolved: payload.gate.cards.every(
        (item) => item.resolvedContent?.data !== undefined,
      ),
      projectGate1Resolved:
        projectGate1?.structure?.cards?.every(
          (item) => item.resolvedContent?.data !== undefined,
        ) || false,
      contentKeys: Object.keys(payload.content),
      robots: exportedCard("card-14").resolvedContent,
      projectRobots:
        projectGate1?.structure?.cards?.find((item) => item.id === "card-14")
          ?.resolvedContent || null,
      meta: exportedCard("card-17").resolvedContent,
      cwv: exportedCard("card-18").resolvedContent,
      images: exportedCard("card-19").resolvedContent,
      redirects: exportedCard("card-16").resolvedContent,
      ssl: exportedCard("card-20").resolvedContent,
      demand: exportedCard("card-39").resolvedContent,
      pain: exportedCard("card-63").resolvedContent,
      unit: exportedCard("gate1-unit-aov").resolvedContent,
      strategic: synthetic("gate1-company-strategic-foundation"),
      brandDemand: synthetic("gate1-company-brand-demand"),
      comparison: synthetic("gate1-company-project-comparison"),
      audience: synthetic("gate1-company-target-audience"),
      screenScopeMatches:
        screenCompanyIds.every((id) => exportedScopeIds.company.includes(id)) &&
        screenProductIds.every((id) => exportedScopeIds.product.includes(id)),
      localFieldsPreserved:
        allCardLocalFieldsPreserved &&
        Array.isArray(exportedCard("card-13").resolvedContent.cardLocalData.instructionRows) &&
        Array.isArray(exportedCard("card-41").resolvedContent.cardLocalData.comparisonRows) &&
        Array.isArray(exportedCard("card-45").resolvedContent.cardLocalData.linkRows),
      sections: payload.resolvedSections.map((section) => ({
        id: section.id,
        title: section.title,
        cardCount: section.cardIds.length,
        syntheticCount: section.syntheticCards.length
      })),
      diagnosticScopes: payload.diagnostics.scopeSections.map((section) => ({
        scope: section.scope,
        title: section.title,
        cardCount: section.cards.length,
        runtimeUnitIds: section.runtimeUnitIds,
        runtimeUnitCount: section.runtimeUnits.length
      }))
    };
  })()`,
);

assert(result.stateUnchanged, "Gate 1 export mutated the live workspace");
assert(result.cardCount > 70, `Unexpected Gate 1 card count: ${result.cardCount}`);
assert(result.allCardsResolved, "Not every Gate 1 card has resolvedContent and displayScope");
assert(result.gateAliasResolved, "The legacy gate alias was not enriched");
assert(result.projectGate1Resolved, "The whole-project Gate 1 payload was not enriched");
assert(result.localFieldsPreserved, "Card-local structured rows were not preserved");
for (const key of [
  "demandRoute",
  "demandV130",
  "painOfferRoute",
  "painV130",
  "unitEconomicsRoute",
  "unitV130",
]) {
  assert(result.contentKeys.includes(key), `Gate 1 content is missing ${key}`);
}
assert(
  result.robots.data.yandex.sitemaps[0].url.includes("sitemap.xml") &&
    result.robots.data.yandex.urlResults[0].result === "Разрешено",
  "Robots.txt resolved content lost sitemap or URL checks",
);
assert(
  result.projectRobots.data.yandex.sitemaps[0].status === "ok",
  "Whole-project export lost the resolved Robots data",
);
assert(
  result.meta.data.some((row) => row.metaRobotsStatus === "works"),
  "Meta Robots did not resolve pageRows",
);
assert(
  result.cwv.data.some(
    (row) => row.cwvData?.mobile?.performance === "91",
  ),
  "CWV did not resolve cwvData",
);
assert(
  result.images.data.some((row) => row.imagesStatus === "works"),
  "Images did not resolve pageRows",
);
assert(
  result.redirects.data.domain === "canonical-export.example",
  "Canonical URL did not resolve redirectV130",
);
assert(
  result.ssl.data.domain === "ssl-export.example",
  "SSL did not resolve sslV130",
);
assert(
  result.demand.data.search.steps.frames.product === "Demand export sentinel",
  "Demand cards did not resolve demandV130",
);
assert(
  result.pain.data.productMaps[0].explicitProblem === "Pain export sentinel",
  "Pain card did not resolve painV130",
);
assert(
  result.unit.data.items[0].revenue.avgCheck === "12345",
  "Unit card did not resolve unitV130",
);
const companyValues =
  result.strategic.resolvedContent.data.gate0CompanyValues;
for (const [key, value] of [
  ["brandPurpose", "Company purpose export sentinel"],
  ["segmentation", "Company segmentation export sentinel"],
  ["positioning", "Company positioning export sentinel"],
  ["companyOffer", "Company offer export sentinel"],
]) {
  assert(companyValues[key].value === value, `Missing Gate 0 company value: ${key}`);
}
assert(
  companyValues.keywordFoundation.confirmedEntries[0].value ===
    "company keyword export sentinel",
  "Company keyword foundation was not embedded",
);
assert(
  result.brandDemand.resolvedContent.data.demandRows[0].queryCount === "90",
  "Company brand demand rows were not embedded",
);
assert(
  result.comparison.resolvedContent.data.gate0CompanyValues.positioning.value ===
    "Company positioning export sentinel",
  "Company comparison did not embed Gate 0 values",
);
assert(
  result.audience.resolvedContent.data.targetAudience.segments[0].name ===
    "Audience export sentinel",
  "Company target audience was not embedded",
);
assert(
  result.sections.map((section) => section.id).join() === "company,product" &&
    result.diagnosticScopes.map((section) => section.scope).join() ===
      "company,product" && result.screenScopeMatches,
  "Company/Product export scopes do not match the screen split",
);
assert(
  result.diagnosticScopes[0].title ===
    "Диагностика точки отсчёта · Компания" &&
    result.diagnosticScopes[1].title ===
      "Диагностика точки отсчёта · Продукт/Услуга" &&
    result.diagnosticScopes[1].runtimeUnitIds.includes("product-map-0") &&
    result.diagnosticScopes[1].runtimeUnitIds.includes("demand-route"),
  "Diagnostic runtime units were not split like the screen",
);

console.log(
  JSON.stringify(
    {
      ok: true,
      cardCount: result.cardCount,
      stateUnchanged: result.stateUnchanged,
      wholeProjectResolved: result.projectGate1Resolved,
      robots: {
        sourceType: result.robots.sourceType,
        sourcePaths: result.robots.sourcePaths,
        data: result.robots.data,
        legacyEvidence: result.robots.legacyCardFields.evidence,
      },
      companyValues: {
        brandPurpose: companyValues.brandPurpose.value,
        segmentation: companyValues.segmentation.value,
        positioning: companyValues.positioning.value,
        companyOffer: companyValues.companyOffer.value,
        keywordFoundation:
          companyValues.keywordFoundation.confirmedEntries.map(
            (entry) => entry.value,
          ),
      },
      sections: result.sections,
      diagnosticScopes: result.diagnosticScopes,
    },
    null,
    2,
  ),
);
await page.call("Page.navigate", { url: "about:blank" });
page.close();
