import { readFile } from "node:fs/promises";

const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9362";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const projectId = "gate-navigation-performance-smoke";
const profileOnly = process.env.GURU_NAV_PROFILE_ONLY === "1";
const profileGate = process.env.GURU_NAV_PROFILE_GATE || "";
const sourceExportPath = process.env.GURU_PROJECT_SOURCE_EXPORT || "";
const sourceExport = sourceExportPath
  ? JSON.parse(await readFile(sourceExportPath, "utf8"))
  : null;
const sourceWorkspace = sourceExport?.workspace || sourceExport?.content || null;
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
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await evaluate(page, `Boolean(${expression})`)) return;
    await wait(50);
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
  await page.call("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
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
  await waitFor(page, 'typeof guruNavigateToGate === "function"');
  await evaluate(page, `(() => {
    const workspace = structuredClone(window.GURU_SEED);
    workspace.project.id = ${JSON.stringify(projectId)};
    workspace.project.name = "Gate navigation performance smoke";
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
      JSON.stringify(workspace)
    );
    location.reload();
  })()`);
  await waitFor(page, 'document.querySelector("[data-open-project]")');
  await evaluate(page, 'document.querySelector("[data-open-project]").click(); true');
  await waitFor(
    page,
    `Boolean(state) && activeProjectId === ${JSON.stringify(projectId)}`,
  );
  if (sourceWorkspace) {
    await evaluate(page, `(() => {
      const source = ${JSON.stringify(sourceWorkspace)};
      state = migrateWorkspace({
        ...structuredClone(state),
        ...structuredClone(source),
        project: {
          ...structuredClone(state.project || {}),
          ...structuredClone(source.project || {}),
          id: ${JSON.stringify(projectId)},
          name: "Gate navigation performance smoke",
        },
      }, ${JSON.stringify(projectId)});
      activeView = "gate";
      activeGateId = "gate-0";
      renderGate();
      return true;
    })()`);
  }

  const baseline = await evaluate(page, `(async () => {
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};
    if (${JSON.stringify(process.env.GURU_NAV_SCOPE_PROBE === "1")}) {
      const products = guruV189CatalogItems(state);
      products.push({ id: "navigation-scope-product", name: "Тестовый продукт навигации" });
      guruV194Ui(state);
    }
    activeView = "gate";
    activeGateId = "gate-0";
    renderGate();
    const waitUntil = (predicate, timeout = 10000) => new Promise((resolve, reject) => {
      const startedAt = performance.now();
      const poll = () => {
        if (predicate()) return resolve();
        if (performance.now() - startedAt > timeout)
          return reject(new Error("navigation timeout"));
        requestAnimationFrame(poll);
      };
      poll();
    });
    const navigate = async (gateId, drawer = false) => {
      if (drawer) {
        document.getElementById("appShell")?.classList.add("sidebar-open");
        document.body.style.overflow = "hidden";
      } else {
        document.getElementById("appShell")?.classList.remove("sidebar-open");
        document.body.style.overflow = "";
      }
      const originalRenderGate = renderGate;
      let renderStartedAt = null;
      let renderEndedAt = null;
      const functionTimings = {};
      const functionCalls = {};
      const timedFunctionNames = [
        "renderGateTable",
        "renderGateNav",
        "bindCardInputs",
        "guruApplyFieldStates",
        "gate1ApplyLandingViewV234",
        "guruNavigationSyncUrlV269",
        "guruDebugEnsureToolbarButtonV119",
        "guruCacheRenderedGateView",
        "guruRestoreCachedGateView",
        "g8AnalysisV3",
        "renderGate1Accordion",
        "renderGate2Redesign",
        "ensureGate2Structure",
        "g2ScopeAuditV267",
        "g2CardScopeV267",
        "g2GetSections",
        "g2CompanySectionHtmlV226",
        "g2CardHtml",
        "g2SyncInfo",
        "g4ReadinessCardV225",
        "g4ReadinessProductCardStatusV225",
        "g4ProductPickSelected",
        "guruStrategicFoundationCompanyHtmlV310",
        "guruV194ProductSelectHtml",
        "g2ResolvedSourceV267",
        "guruExportGate2CardDiagnosticV223",
        "guruExportGate2Gate0SourceV223",
        "guruExportGate2CardSourceV223",
        "gate4ProductionHtml",
        "g4CampaignLaunchCenterHtml",
        "g4EnsureLaunchCampaigns",
        "g4LaunchChannels",
        "g4CampaignRowHtml",
        "g4v192TypeGroupHtml",
        "g4CampaignStatus",
        "g4CampaignContext",
        "g4RsyaPreparationHtmlV289",
        "ensureGate4RsyaV289",
        "g4RsyaCampaignStatusV289",
        "g4RsyaCampaignIssuesV289",
        "g4RsyaCampaignProblemIssuesV363",
        "g4RsyaGroupStatusV289",
        "g4RsyaGroupCardReadinessV458",
        "g4RsyaGroupIssuesV289",
        "g4RsyaAdIssuesV289",
        "g4RsyaLaunchModelV454",
        "g4RsyaAudienceHtmlV289",
        "g4RsyaGroupsBodyV453",
        "g4RsyaGroupFoundationV455",
        "g4RsyaGroupGate1DefaultsV456",
        "g4RsyaProjectOptionsV289",
        "g4RsyaCatalogProductV289",
        "g4RsyaWorkspaceSnapshotV455",
        "g3ProductJourneySnapshot",
        "g4ProductSemantics",
        "guruStrategicFoundationModelV286",
        "g4RsyaGroupContentHtmlV460",
        "g4sbV406LaunchBodyHtml",
        "g4RsyaChannelCardV289",
        "g4sbSearchChannelCardHtml",
        "g4CampaignAudienceHtml",
        "g4RsyaAdsHtmlV289",
        "g4RsyaMediaHtmlV289",
      ].filter((name) => typeof window[name] === "function");
      const originalFunctions = Object.fromEntries(
        timedFunctionNames.map((name) => [name, window[name]])
      );
      timedFunctionNames.forEach((name) => {
        const original = originalFunctions[name];
        window[name] = function (...args) {
          const mark = performance.now();
          functionCalls[name] = (functionCalls[name] || 0) + 1;
          try {
            return original.apply(this, args);
          } finally {
            functionTimings[name] = Math.round(
              ((functionTimings[name] || 0) + performance.now() - mark) * 10
            ) / 10;
          }
        };
      });
      renderGate = function (...args) {
        renderStartedAt = performance.now();
        try {
          return originalRenderGate.apply(this, args);
        } finally {
          renderEndedAt = performance.now();
        }
      };
      const startedAt = performance.now();
      const button = document.querySelector('[data-gate-id="' + gateId + '"]');
      button.click();
      const selectionSynchronous =
        button.classList.contains("active") &&
        button.getAttribute("aria-current") === "page";
      const dispatchMs = performance.now() - startedAt;
      await waitUntil(() =>
        guruRenderedGateId === gateId &&
        document.getElementById("pageTitle")?.textContent.trim() ===
          state.gates.find((gate) => gate.id === gateId)?.title
      ).catch((error) => {
        throw new Error(error.message + ": requested=" + gateId + ", active=" + activeGateId +
          ", rendered=" + guruRenderedGateId + ", view=" + activeView +
          ", title=" + document.getElementById("pageTitle")?.textContent.trim() +
          ", ticket=" + guruNavigationRenderTicket +
          ", fast=" + guruFastGateNavigation +
          ", navigating=" + guruGateNavigationInProgress +
          ", errors=" + JSON.stringify(window.__guruErrors));
      });
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const finishedAt = performance.now();
      renderGate = originalRenderGate;
      Object.entries(originalFunctions).forEach(([name, original]) => {
        window[name] = original;
      });
      return {
        gateId,
        drawer,
        dispatchMs: Math.round(dispatchMs * 10) / 10,
        renderStartDelayMs: Math.round((renderStartedAt - startedAt) * 10) / 10,
        renderMs: Math.round((renderEndedAt - renderStartedAt) * 10) / 10,
        totalMs: Math.round((finishedAt - startedAt) * 10) / 10,
        cache: document.getElementById("contentArea")?.dataset.guruViewCache || "",
        contentNodes: document.getElementById("contentArea")?.querySelectorAll("*").length || 0,
        contentControls: document.getElementById("contentArea")?.querySelectorAll("input, textarea, select, button").length || 0,
        functionTimings,
        functionCalls,
        active: activeGateId,
        selectionSynchronous,
        drawerOpen: document.getElementById("appShell")?.classList.contains("sidebar-open"),
      };
    };
    const desktop = [];
    desktop.push(await navigate("gate-1"));
    desktop.push(await navigate("gate-2"));
    desktop.push(await navigate("gate-0"));
    desktop.push(await navigate("gate-2"));
    let disclosureProbe = null;
    if (${JSON.stringify(process.env.GURU_NAV_PREF_PROBE === "1")}) {
      const detail = [...els.contentArea.querySelectorAll("details[data-guru-disclosure-key-v512]")]
        .find((node) => !node.matches(GURU_OWNED_DETAILS_V512));
      if (detail) {
        const key = detail.dataset.guruDisclosureKeyV512;
        const desired = !detail.open;
        detail.open = desired;
        await navigate("gate-1");
        await navigate("gate-2");
        const returned = els.contentArea.querySelector(
          'details[data-guru-disclosure-key-v512="' + CSS.escape(key) + '"]');
        disclosureProbe = { found: true, key, desired,
          stored: guruDisclosureOpenStateV512()[key], restored: returned?.open,
          cached: els.contentArea.dataset.guruViewCache };
      } else disclosureProbe = { found: false };
    }
    let editProbe = null;
    if (${JSON.stringify(process.env.GURU_NAV_EDIT_PROBE === "1")}) {
      await navigate("gate-0");
      const editor = els.contentArea.querySelector('input[data-project-inline="geography"]');
      if (editor) {
        const value = "Проверка сохранения при переходе между гейтами 123";
        editor.value = value;
        editor.dispatchEvent(new Event("input", { bubbles: true }));
        const inMemory = state.project.geography;
        await navigate("gate-1");
        await navigate("gate-0");
        const restored = els.contentArea.querySelector('input[data-project-inline="geography"]')?.value;
        await waitUntil(() => {
          const saved = localStorage.getItem("guru-platform-workspace-v02-" + activeProjectId);
          return saved && JSON.parse(saved).project?.geography === value;
        }, 5000);
        const saved = JSON.parse(localStorage.getItem("guru-platform-workspace-v02-" + activeProjectId));
        editProbe = { found: true, inMemory, restored, persisted: saved.project?.geography, value };
      } else editProbe = { found: false };
    }
    const allGates = [];
    const scopeProbe = [];
    const scopeWarm = [];
    const scopeRoundTrips = [];
    let scopePreferenceProbe = null;
    if (${JSON.stringify(profileOnly)}) {
      guruInvalidateGateViewCache();
      for (const gateId of (${JSON.stringify(profileGate)}
        ? [${JSON.stringify(profileGate)}]
        : ["gate-3", "gate-4", "gate-5", "gate-6", "gate-7", "gate-8"])) {
        allGates.push(await navigate(gateId));
      }
    }
    if (${JSON.stringify(process.env.GURU_NAV_SCOPE_PROBE === "1")}) {
      for (const gateId of ["gate-0", "gate-1", "gate-2", "gate-3", "gate-4", "gate-5", "gate-6", "gate-7", "gate-8"]) {
        const navigation = activeGateId !== gateId ? await navigate(gateId) : null;
        const headings = [...els.contentArea.querySelectorAll("[data-gate0-section-heading]")]
          .map((node) => node.dataset.gate0SectionHeading);
        scopeProbe.push({ gateId, headings, productId: guruV194SelectedProduct(state)?.id || "",
          active: activeGateId, cache: els.contentArea.dataset.guruViewCache,
          totalMs: navigation?.totalMs });
      }
      for (const gateId of ["gate-0", "gate-1", "gate-2", "gate-3", "gate-4", "gate-5", "gate-6", "gate-7", "gate-8"])
        scopeWarm.push(await navigate(gateId));
      if (activeGateId !== "gate-2") await navigate("gate-2");
      for (const scope of ["company", "product"])
        els.contentArea.querySelector('[data-gate0-section-toggle="' + scope + '"]')?.click();
      await navigate("gate-3");
      await navigate("gate-2");
      scopePreferenceProbe = Object.fromEntries(["company", "product"].map((scope) => [scope, {
        stored: state.ui?.gateScopeOpenV526?.["gate-2"]?.[scope],
        expanded: els.contentArea.querySelector('[data-gate0-section-toggle="' + scope + '"]')?.getAttribute("aria-expanded"),
      }]));
      await waitUntil(() => {
        const saved = localStorage.getItem("guru-platform-workspace-v02-" + activeProjectId);
        const preferences = saved && JSON.parse(saved).ui?.gateScopeOpenV526?.["gate-2"];
        return preferences?.company === false && preferences?.product === false;
      }, 5000);
      const savedPreferences = JSON.parse(localStorage.getItem(
        "guru-platform-workspace-v02-" + activeProjectId)).ui.gateScopeOpenV526["gate-2"];
      for (const scope of ["company", "product"])
        scopePreferenceProbe[scope].persisted = savedPreferences[scope];
      const scopedGates = ["gate-1", "gate-2", "gate-3", "gate-4", "gate-5", "gate-6", "gate-7", "gate-8"];
      for (let index = 0; index < scopedGates.length; index += 1) {
        const gateId = scopedGates[index];
        if (activeGateId !== gateId) await navigate(gateId);
        const intended = {};
        for (const scope of ["company", "product"]) {
          const button = els.contentArea.querySelector('[data-gate0-section-toggle="' + scope + '"]');
          intended[scope] = button?.getAttribute("aria-expanded") !== "true";
          button?.click();
        }
        await navigate(scopedGates[(index + 1) % scopedGates.length]);
        await navigate(gateId);
        scopeRoundTrips.push({ gateId, scopes: Object.fromEntries(
          ["company", "product"].map((scope) => [scope, {
            intended: intended[scope],
            stored: state.ui?.gateScopeOpenV526?.[gateId]?.[scope],
            expanded: els.contentArea.querySelector('[data-gate0-section-toggle="' + scope + '"]')?.getAttribute("aria-expanded"),
          }])) });
      }
    }
    let rsyaDisclosure = null;
    let rsyaImageActionProbe = null;
    let rsyaDuplicateProbe = null;
    if (${JSON.stringify(profileOnly)} &&
        (!${JSON.stringify(profileGate)} || ${JSON.stringify(profileGate)} === "gate-4")) {
      if (activeGateId !== "gate-4") await navigate("gate-4");
      const pickRsyaDisclosure = () => {
        const rows = [...document.querySelectorAll(
          "[data-g4rsya-v461-toggle-group]"
        )];
        return rows.find((button) => {
          const d = ensureGate4RsyaV289(button.dataset.g4rsyaV461Product);
          const group = d.groups.find((item) =>
            item.id === button.dataset.g4rsyaV461ToggleGroup
          );
          return (group?.ads || []).some((ad) => (ad.images || []).length);
        }) || rows[0] || null;
      };
      let disclosure = pickRsyaDisclosure();
      if (!disclosure) {
        const rsyaCardToggle = [...document.querySelectorAll("[data-g4camp-toggle]")]
          .find((button) => /рся|сетях/i.test(button.textContent || ""));
        rsyaCardToggle?.click();
        disclosure = pickRsyaDisclosure();
        if (!disclosure) {
          rsyaDisclosure = {
            opened: false,
            cardToggleFound: Boolean(rsyaCardToggle),
            campaignLabels: [...document.querySelectorAll("[data-g4camp-toggle]")]
              .map((button) => (button.textContent || "").trim().slice(0, 120)),
          };
        }
      }
      if (disclosure) {
        const groupId = disclosure.dataset.g4rsyaV461ToggleGroup;
        disclosure.click();
        const editor = [...document.querySelectorAll(
          "[data-g4rsya-v461-group-editor]"
        )].find((item) => !item.hidden) || null;
        const adCards = [...(editor?.querySelectorAll(
          "[data-g4rsya-v289-ad-card]"
        ) || [])];
        const adsGroup = editor?.querySelector(
          "[data-g4rsya-v460-ads-group]"
        ) || null;
        const addAdButton = adsGroup?.querySelector(
          ":scope > [data-g4rsya-v289-add-ad]"
        ) || null;
        rsyaDisclosure = {
          groupId,
          opened: Boolean(editor),
          hasContent: Boolean(
            editor?.querySelector("[data-g4rsya-v460-group-content]")
          ),
          editorId: editor?.id || "",
          imageActionLabels: [...(editor?.querySelectorAll(
            ".g4-rsya-file-actions-v289 .g4-rsya-image-action-v476"
          ) || [])].map((action) => (action.textContent || "").trim()),
          imageDownloadActions: editor?.querySelectorAll(
            ".g4-rsya-file-actions-v289 [download]"
          ).length || 0,
          imageRemoveActions: editor?.querySelectorAll(
            ".g4-rsya-file-actions-v289 [data-g4rsya-v289-remove-image]"
          ).length || 0,
          standaloneExtrasSections: editor?.querySelectorAll(
            '[data-g4rsya-v460-group-section="extras"]'
          ).length || 0,
          adCards: adCards.length,
          adExtras: editor?.querySelectorAll(
            "[data-g4rsya-v477-ad-extras]"
          ).length || 0,
          adSectionOrders: adCards.map((card) =>
            [...card.querySelectorAll(":scope > [data-g4rsya-v464-ad-section]")]
              .map((section) => section.dataset.g4rsyaV464AdSection)
          ),
          addAdAfterLastCard: Boolean(addAdButton) &&
            addAdButton.previousElementSibling === adCards.at(-1),
        };
      }
      const imageProbe = document.createElement("div");
      imageProbe.innerHTML = g4RsyaImageCardHtmlV471(
        "probe-product",
        "probe-channel",
        { id: "probe-group" },
        { id: "probe-ad" },
        {
          id: "probe-image",
          name: "probe.png",
          url: "https://example.com/probe.png",
          type: "image/png",
          width: 1200,
          height: 1200,
          size: 1024,
        },
        0,
        "probe-image",
      );
      rsyaImageActionProbe = {
        labels: [...imageProbe.querySelectorAll(
          ".g4-rsya-file-actions-v289 .g4-rsya-image-action-v476"
        )].map((action) => (action.textContent || "").trim()),
        downloadActions: imageProbe.querySelectorAll("[download]").length,
        removeActions: imageProbe.querySelectorAll(
          "[data-g4rsya-v289-remove-image]"
        ).length,
      };
      const duplicateFirst = {
        id: "duplicate-first",
        name: "8EB0B6C9-4BCF-4E2B-85FA-F6C6E2660461.PNG",
        dataUrl: "data:image/png;base64,AAAA",
        type: "image/png",
        width: 1173,
        height: 1341,
        size: 154 * 1024,
      };
      const duplicateSecond = {
        ...duplicateFirst,
        id: "duplicate-second",
        dataUrl: "data:image/png;base64,BBBB",
        size: 1785 * 1024,
      };
      const duplicateAd = {
        images: [duplicateFirst, duplicateSecond],
        previewImageId: duplicateSecond.id,
      };
      const detectedDuplicate = g4RsyaImageDuplicateV476(
        [duplicateFirst],
        duplicateSecond,
      );
      const cleaned = g4RsyaDeduplicateAdImagesV476(duplicateAd);
      rsyaDuplicateProbe = {
        detectedId: detectedDuplicate?.id || "",
        cleaned,
        count: duplicateAd.images.length,
        previewImageId: duplicateAd.previewImageId,
        visualDetectedId: g4RsyaImageDuplicateV476(
          [{
            id: "visual-first",
            name: "first.png",
            visualFingerprintV476: "0123456789abcdef",
          }],
          {
            id: "visual-second",
            name: "second.jpg",
            visualFingerprintV476: "0123456789abcdef",
          },
        )?.id || "",
      };
    }
    // Моделируем обычный сценарий после редактирования: зависимые снимки
    // сброшены, поэтому оба drawer-перехода обязаны пройти холодный renderer.
    if (editProbe && activeGateId !== "gate-2") await navigate("gate-2");
    guruInvalidateGateViewCache();
    const drawer = [];
    drawer.push(await navigate("gate-1", true));
    drawer.push(await navigate("gate-0", true));
    guruInvalidateGateViewCache();
    const originalRapidRenderGate = renderGate;
    const rapidRenderedIds = [];
    renderGate = function (...args) {
      rapidRenderedIds.push(activeGateId);
      return originalRapidRenderGate.apply(this, args);
    };
    document.getElementById("appShell")?.classList.add("sidebar-open");
    document.querySelector('[data-gate-id="gate-4"]').click();
    document.querySelector('[data-gate-id="gate-8"]').click();
    const rapidSelectionSynchronous = document
      .querySelector('[data-gate-id="gate-8"]')
      ?.classList.contains("active");
    await waitUntil(() =>
      guruRenderedGateId === "gate-8" &&
      document.getElementById("pageTitle")?.textContent.trim() ===
        state.gates.find((gate) => gate.id === "gate-8")?.title
    );
    await new Promise((resolve) => requestAnimationFrame(resolve));
    renderGate = originalRapidRenderGate;
    const rapid = {
      selectionSynchronous: rapidSelectionSynchronous,
      renderedIds: rapidRenderedIds,
      active: activeGateId,
      drawerOpen: document.getElementById("appShell")?.classList.contains("sidebar-open"),
    };

    const originalG8Analysis = g8AnalysisV3;
    let readinessAnalysisCalls = 0;
    g8AnalysisV3 = function (...args) {
      readinessAnalysisCalls += 1;
      return originalG8Analysis.apply(this, args);
    };
    guruGateReadinessCache = new Map();
    renderGateNav({ recalculate: false });
    g8AnalysisV3 = originalG8Analysis;
    const blockSwitches = [];
    if (${JSON.stringify(process.env.GURU_NAV_PROFILE_BLOCKS === "1")}) {
      const originalClone = guruExportDiagnosticCloneV223;
      let cloneCalls = 0;
      let cloneMs = 0;
      guruExportDiagnosticCloneV223 = function (...args) {
        const start = performance.now();
        cloneCalls += 1;
        try { return originalClone.apply(this, args); }
        finally { cloneMs += performance.now() - start; }
      };
      try {
        for (const item of nowGuideDisplayedPath.filter(item => item.gateId === "gate-1").slice(0, 2)) {
          const start = performance.now();
          nowGuideSelect(item, nowGuideDisplayedPath);
          const dispatchMs = performance.now() - start;
          await waitUntil(() => !nowGuideGate1NavigationPending && activeGateId === "gate-1", 30000);
          blockSwitches.push({ id: item.id, dispatchMs: +(dispatchMs.toFixed(1)),
            totalMs: +((performance.now() - start).toFixed(1)), cloneCalls,
            cloneMs: +(cloneMs.toFixed(1)), nodes: els.contentArea.querySelectorAll("*").length });
          cloneCalls = 0; cloneMs = 0;
        }
        const keywordItem = nowGuideDisplayedPath.find(item => item.gateId === "gate-0" &&
          /Фундамент ключевых слов/i.test(item.title));
        if (keywordItem) {
          const start = performance.now();
          nowGuideSelect(keywordItem, nowGuideDisplayedPath);
          const dispatchMs = performance.now() - start;
          await waitUntil(() => activeGateId === "gate-0" &&
            guruRenderedGateId === "gate-0" && !nowGuideNavigationSnapshotActive, 30000);
          const node = nowGuideFindNode(keywordItem);
          blockSwitches.push({ id: keywordItem.id, dispatchMs: +(dispatchMs.toFixed(1)),
            totalMs: +((performance.now() - start).toFixed(1)), cloneCalls,
            cloneMs: +(cloneMs.toFixed(1)), nodes: els.contentArea.querySelectorAll("*").length,
            visible: Boolean(node?.getClientRects().length) });
        }
      } finally { guruExportDiagnosticCloneV223 = originalClone; }
    }
    let guideContextProbe = null;
    if (${JSON.stringify(process.env.GURU_NAV_LAYOUT_PROBE === "1")}) {
      await navigate("gate-8");
      const virtualizedSections = [...els.contentArea.querySelectorAll(".g8-section")]
        .filter(element => getComputedStyle(element).contentVisibility !== "visible").length;
      await navigate("gate-0");
      const virtualizedCategories = [...els.contentArea.querySelectorAll(".guru-catalog-category-group")]
        .filter(element => getComputedStyle(element).contentVisibility !== "visible").length;
      const item = nowGuideDisplayedAllBlocks.find(entry =>
        entry.gateId === "gate-1" && entry.id === "card-22-hub");
      if (!item) throw new Error("Catalog guide item is missing");
      nowGuideContextKey = "outdated-project-and-product-context";
      nowGuideSelect(item, nowGuideDisplayedPath);
      await waitUntil(() => activeGateId === "gate-1" &&
        guruRenderedGateId === "gate-1" && !nowGuideGate1NavigationPending, 30000);
      const node = nowGuideFindNode(item);
      const rect = node?.getBoundingClientRect();
      const emptyLargePanels = [...els.contentArea.querySelectorAll(
        ".g1-card, .page-structure-card, .goat-product-section-v515")]
        .filter(element => element.getBoundingClientRect().height > 300 &&
          element.innerText.trim().length < 12).length;
      guideContextProbe = {
        selected: item.key,
        current: nowGuideCurrent(nowGuideDisplayedPath)?.key,
        visible: Boolean(rect && rect.height > 0 && rect.top < innerHeight && rect.bottom > 0),
        hiddenLeaks: [...els.contentArea.querySelectorAll("[hidden]")]
          .filter(element => getComputedStyle(element).display !== "none").length,
        emptyLargePanels,
        virtualizedSections: virtualizedSections + virtualizedCategories,
      };
    }
    return {
      desktop,
      disclosureProbe,
      editProbe,
      scopeProbe,
      scopeWarm,
      scopeRoundTrips,
      scopePreferenceProbe,
      allGates,
      rsyaDisclosure,
      rsyaImageActionProbe,
      rsyaDuplicateProbe,
      drawer,
      rapid,
      readinessAnalysisCalls,
      blockSwitches,
      guideContextProbe,
      errors: window.__guruErrors,
    };
  })()`);

  console.log(JSON.stringify(baseline, null, 2));
  if (process.env.GURU_NAV_PREF_PROBE === "1") {
    assert(baseline.disclosureProbe?.found &&
      baseline.disclosureProbe.stored === baseline.disclosureProbe.desired &&
      baseline.disclosureProbe.restored === baseline.disclosureProbe.desired,
    `Gate disclosure preference was lost during navigation: ${JSON.stringify(baseline.disclosureProbe)}`);
  }
  if (process.env.GURU_NAV_EDIT_PROBE === "1") {
    assert(baseline.editProbe?.found &&
      [baseline.editProbe.inMemory, baseline.editProbe.restored,
        baseline.editProbe.persisted].every((value) => value === baseline.editProbe.value),
    `An edit was lost during gate navigation: ${JSON.stringify(baseline.editProbe)}`);
  }
  if (process.env.GURU_NAV_SCOPE_PROBE === "1") {
    assert(baseline.scopeProbe.length === 9 &&
      baseline.scopeProbe.every((entry) => entry.active === entry.gateId &&
        entry.productId === "navigation-scope-product" &&
        entry.headings.includes("company") && entry.headings.includes("product")),
    `Company/product scope did not survive gate navigation: ${JSON.stringify(baseline.scopeProbe)}`);
    assert(baseline.scopeWarm.every((entry) => entry.cache === "hit" && entry.totalMs < 150),
      `Warm navigation regressed: ${JSON.stringify(baseline.scopeWarm.map((entry) => ({
        gateId: entry.gateId, cache: entry.cache, totalMs: entry.totalMs,
      })))}`);
    assert(["company", "product"].every((scope) =>
      baseline.scopePreferenceProbe?.[scope]?.stored === false &&
      baseline.scopePreferenceProbe?.[scope]?.expanded === "false" &&
      baseline.scopePreferenceProbe?.[scope]?.persisted === false),
    `Company/product disclosure reset: ${JSON.stringify(baseline.scopePreferenceProbe)}`);
    assert(baseline.scopeRoundTrips.length === 8 &&
      baseline.scopeRoundTrips.every((entry) => ["company", "product"].every((scope) =>
        entry.scopes[scope].stored === entry.scopes[scope].intended &&
        entry.scopes[scope].expanded === String(entry.scopes[scope].intended))),
    `Scope preference changed during a gate round trip: ${JSON.stringify(baseline.scopeRoundTrips)}`);
  }
  if (process.env.GURU_NAV_PROFILE_BLOCKS === "1") {
    assert(baseline.blockSwitches.length >= 2 &&
      baseline.blockSwitches.every((entry) => entry.cloneCalls <= 3),
    `Block navigation cloned the workspace repeatedly: ${JSON.stringify(baseline.blockSwitches)}`);
    assert(baseline.blockSwitches.every((entry) => entry.visible !== false),
      `A selected block is missing from the screen: ${JSON.stringify(baseline.blockSwitches)}`);
  }
  if (process.env.GURU_NAV_LAYOUT_PROBE === "1") {
    assert(baseline.guideContextProbe?.selected === baseline.guideContextProbe?.current &&
      baseline.guideContextProbe.visible &&
      baseline.guideContextProbe.hiddenLeaks === 0 &&
      baseline.guideContextProbe.emptyLargePanels === 0 &&
      baseline.guideContextProbe.virtualizedSections === 0,
    `Guide and layout diverged after context change: ${JSON.stringify(baseline.guideContextProbe)}`);
  }
  if (profileOnly) {
    if (!profileGate || profileGate === "gate-4") {
      assert(
        baseline.rsyaDisclosure?.opened && baseline.rsyaDisclosure?.hasContent,
        `Lazy RSYA group did not render after disclosure: ${JSON.stringify(baseline.rsyaDisclosure)}`,
      );
      assert(
        baseline.rsyaDisclosure.imageActionLabels.every((label) =>
            label === "Удалить" || label === "Заменить"
          ) &&
          baseline.rsyaDisclosure.imageDownloadActions === 0 &&
          baseline.rsyaDisclosure.imageRemoveActions * 2 ===
            baseline.rsyaDisclosure.imageActionLabels.length,
        `Unexpected RSYA image actions: ${JSON.stringify(baseline.rsyaDisclosure)}`,
      );
      assert(
        baseline.rsyaDisclosure.standaloneExtrasSections === 0 &&
          baseline.rsyaDisclosure.adCards > 0 &&
          baseline.rsyaDisclosure.adExtras === baseline.rsyaDisclosure.adCards &&
          baseline.rsyaDisclosure.adSectionOrders.every((order) =>
            JSON.stringify(order) === JSON.stringify([
              "landing", "prompt", "copy", "images", "preview", "extras",
            ])
          ) &&
          baseline.rsyaDisclosure.addAdAfterLastCard,
        `RSYA ad section order mismatch: ${JSON.stringify(baseline.rsyaDisclosure)}`,
      );
      assert(
        JSON.stringify(baseline.rsyaImageActionProbe?.labels) ===
            JSON.stringify(["Удалить", "Заменить"]) &&
          baseline.rsyaImageActionProbe.downloadActions === 0 &&
          baseline.rsyaImageActionProbe.removeActions === 1,
        `RSYA image action component mismatch: ${JSON.stringify(baseline.rsyaImageActionProbe)}`,
      );
      assert(
        baseline.rsyaDuplicateProbe?.detectedId === "duplicate-first" &&
          baseline.rsyaDuplicateProbe.cleaned === true &&
          baseline.rsyaDuplicateProbe.count === 1 &&
          baseline.rsyaDuplicateProbe.previewImageId === "duplicate-first" &&
          baseline.rsyaDuplicateProbe.visualDetectedId === "visual-first",
        `RSYA duplicate filter mismatch: ${JSON.stringify(baseline.rsyaDuplicateProbe)}`,
      );
    }
    console.log("gate navigation performance profile: OK");
  } else {
    baseline.desktop.concat(baseline.drawer).forEach((entry) => {
      assert(entry.active === entry.gateId, `Wrong active Gate: ${JSON.stringify(entry)}`);
      assert(entry.selectionSynchronous, `Gate selection was not synchronous: ${JSON.stringify(entry)}`);
      assert(!entry.drawerOpen, `Drawer did not close: ${JSON.stringify(entry)}`);
      assert(
        !entry.functionCalls.g8AnalysisV3,
        `Gate 8 analysis ran during an ordinary switch: ${JSON.stringify(entry)}`,
      );
    });
    assert(
      baseline.desktop[2].cache === "hit",
      `Gate 0 was evicted before restore: ${JSON.stringify(baseline.desktop[2])}`,
    );
    baseline.desktop.filter((entry) => entry.cache === "hit").forEach((entry) => {
      assert(
        entry.totalMs < 150,
        `Warm Gate switch is too slow: ${JSON.stringify(entry)}`,
      );
    });
    baseline.drawer.forEach((entry) => {
      assert(entry.cache === "miss", `Drawer case must be cold: ${JSON.stringify(entry)}`);
      assert(
        entry.renderStartDelayMs < 150,
        `Drawer waited for its full CSS transition: ${JSON.stringify(entry)}`,
      );
      assert(
        (entry.functionTimings.renderGateNav || 0) < 5,
        `Gate nav was rebuilt during navigation: ${JSON.stringify(entry)}`,
      );
    });
    assert(
      baseline.rapid.selectionSynchronous &&
        baseline.rapid.active === "gate-8" &&
        !baseline.rapid.drawerOpen &&
        baseline.rapid.renderedIds.length === 1 &&
        baseline.rapid.renderedIds[0] === "gate-8",
      `Rapid navigation rendered a stale Gate: ${JSON.stringify(baseline.rapid)}`,
    );
    assert(
      baseline.readinessAnalysisCalls === 0,
      `Full Gate 8 analysis ran during a readiness refresh: ${baseline.readinessAnalysisCalls}`,
    );
    assert(baseline.errors.length === 0, `Browser errors: ${baseline.errors.join(" | ")}`);
    console.log("gate navigation performance smoke: OK");
  }
} finally {
  page.close();
  await browser.call("Target.closeTarget", { targetId }).catch(() => {});
  await browser.call("Target.disposeBrowserContext", { browserContextId }).catch(() => {});
  browser.close();
}
