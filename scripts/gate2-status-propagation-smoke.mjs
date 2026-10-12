const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9336";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const pages = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
const page = pages.find((item) => item.type === "page");
if (!page) throw new Error("Headless Chrome page was not found");
if (page.url !== "about:blank") {
  throw new Error(
    "Safety stop: Gate 2 smoke test requires an isolated Chrome page opened at about:blank",
  );
}

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
  if (!entry) return;
  pending.delete(message.id);
  if (message.error) entry.reject(new Error(message.error.message));
  else entry.resolve(message.result);
});

function call(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const response = await call("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (response.exceptionDetails) {
    throw new Error(
      response.exceptionDetails.exception?.description ||
        response.exceptionDetails.text,
    );
  }
  return response.result.value;
}

await call("Runtime.enable");
await call("Page.enable");
await call("Page.addScriptToEvaluateOnNewDocument", {
  source: `{
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (input, init) => String(input).includes("/api/")
      ? Promise.resolve(new Response(JSON.stringify({ ok: true, isolatedSmokeTest: true }), { status: 200, headers: { "Content-Type": "application/json" } }))
      : nativeFetch(input, init);
  }`,
});
await call("Page.navigate", { url: "http://127.0.0.1:3000/" });
await wait(1200);
await evaluate(`(() => {
  localStorage.clear();
  localStorage.setItem("guru-platform-access-v01", "unlocked");
  localStorage.setItem("guru-platform-projects-v02", JSON.stringify([{
    id: "gate2-status-propagation-smoke",
    name: "Gate 2 status propagation smoke",
    lifecycleStatus: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }]));
  location.reload();
  return true;
})()`);
await wait(1600);
await evaluate('document.querySelector("[data-open-project]")?.click(); true');
await wait(1600);

const result = await evaluate(`(() => {
  scheduleCloudSync = () => {};
  scheduleProjectsCloudSync = () => {};
  const originalState = state;

  const run = (name, prepare) => {
    const previousState = state;
    try {
      state = structuredClone(originalState);
      const gate2 = state.gates.find((gate) => gate.id === "gate-2");
      ensureGate2Structure(gate2);
      const card = gate2.cards.find((item) => item.title === name);
      if (!card) throw new Error("Missing Gate 2 card: " + name);
      (card.fields ||= {}).g2Check = "";
      prepare(card);
      const rule = G2_SYNC_RULES.find((item) => item.match.test(card.title)) || {};
      const gate1Source = rule.g1 ? g2FindGateCard("gate-1", rule.g1) : null;
      const sync = g2SyncInfo(card);
      const status = g2CardStatus(card);
      const template = document.createElement("template");
      template.innerHTML = g2CardHtml(card);
      const pill = template.content.querySelector(".status-pill");
      return {
        card: name,
        status,
        pillText: pill?.textContent.trim() || "",
        pillClass: pill?.className || "",
        gate1SourceId: gate1Source?.id || "",
        gate1SourceTitle: sync.source?.title || "",
        gate1SourceStatus: sync.source?.status || "",
        gate4SourceId: sync.g4?.cardId || "",
      };
    } finally {
      state = previousState;
    }
  };

  const mega = () => {
    const gate0 = state.gates.find((gate) => gate.id === "gate-0");
    const card = gate0.cards.find(isMegaMarketingCard);
    return ensureMegaMarketing(card, state);
  };
  const legacyGate4 = (title) =>
    state.gates
      .find((gate) => gate.id === "gate-4")
      .cards.find((card) => card.title === title);
  const gate1Card = (id) =>
    state.gates
      .find((gate) => gate.id === "gate-1")
      .cards.find((card) => card.id === id);
  const prepareCanonicalSource = () => {
    const source = gate1Card("card-16");
    const redirect = ensureRedirectV130(source);
    redirect.canonicalUrl = "https://gate2-status-smoke.test/";
    redirect.rows[0].status = "broken";
    recalculateStatusForCard(source, state);
    gate1Card("card-17").status = "ready";
    legacyGate4("Предзапусковый QA пройден").status = "ready";
  };

  try {
    const checks = [
      run("Мобильная версия", () => {
        mega().platformV2.fundamental.find(
          (item) => item.name === "Мобильная версия",
        ).status = "broken";
        legacyGate4("Мобильная версия не ломает конверсию").status = "ready";
      }),
      run("Яндекс Метрика, счётчик", () => {
        mega().infra.find(
          (item) => item.name === "Яндекс Метрика",
        ).status = "missing";
        legacyGate4("Метрика и базовые цели подключены").status = "ready";
      }),
      run("Скорость / Core Web Vitals", () => {
        state.gates
          .find((gate) => gate.id === "gate-1")
          .cards.find((card) => /^cwv/i.test(card.title)).status = "problem";
        legacyGate4("Предзапусковый QA пройден").status = "ready";
      }),
      run("Квизы / тесты", () => {
        legacyGate4("Предзапусковый QA пройден").status = "problem";
      }),
      run("Редиректы", prepareCanonicalSource),
      run("Канонические URL", prepareCanonicalSource),
      run("Мобильная версия", (card) => {
        card.fields.g2Check = "works";
        mega().platformV2.fundamental.find(
          (item) => item.name === "Мобильная версия",
        ).status = "broken";
      }),
    ];
    return { checks, stateRestored: state === originalState };
  } finally {
    state = originalState;
  }
})()`);

const automaticChecks = [
  ...result.checks.slice(0, 3),
  ...result.checks.slice(4, 6),
];
for (const check of automaticChecks) {
  if (
    check.status !== "problem" ||
    check.pillText !== "Проблема" ||
    !check.pillClass.split(/\s+/).includes("status-problem")
  ) {
    throw new Error(`Gate 2 problem propagation failed: ${JSON.stringify(check)}`);
  }
}
const removedCatchAllCheck = result.checks[3];
if (
  removedCatchAllCheck.status !== "not_started" ||
  removedCatchAllCheck.pillText !== "Не начато" ||
  removedCatchAllCheck.gate4SourceId
) {
  throw new Error(
    `Gate 2 fake Gate 4 catch-all is still active: ${JSON.stringify(removedCatchAllCheck)}`,
  );
}
for (const check of result.checks.slice(4, 6)) {
  if (
    check.gate1SourceId !== "card-16" ||
    check.gate1SourceTitle !== "Канонический URL и редиректы" ||
    check.gate1SourceStatus !== "problem"
  ) {
    throw new Error(`Gate 2 points to the wrong Gate 1 card: ${JSON.stringify(check)}`);
  }
}
const manualCheck = result.checks[6];
if (
  manualCheck.status !== "ready" ||
  manualCheck.pillText !== "Готово" ||
  !manualCheck.pillClass.split(/\s+/).includes("status-ready")
) {
  throw new Error(`Gate 2 manual priority changed: ${JSON.stringify(manualCheck)}`);
}
if (!result.stateRestored) throw new Error("Smoke state was not restored");

console.log(JSON.stringify(result, null, 2));
socket.close();
