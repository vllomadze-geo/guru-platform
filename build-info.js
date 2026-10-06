/* The build command stamps this label from the runtime file fingerprint.
   The local server serves the same computed label after source changes. */
(() => {
  const scriptUrl = new URL(document.currentScript?.src || "build-info.js", location.href);
  const displayVersion = "2.3.526+17d320ab9395";
  const version = displayVersion;
  const productLabel = "Рабочая версия MVP";
  window.GURU_BUILD_INFO = Object.freeze({
    version,
    displayVersion,
    productLabel
  });
  const label = `${productLabel} · сборка ${displayVersion}`;
  document.querySelectorAll("[data-guru-build-label]").forEach((element) => {
    element.textContent = label;
  });

  async function fetchBuildId() {
    try {
      const response = await fetch(new URL("/__build-id", scriptUrl), { cache: "no-store" });
      return response.ok ? (await response.text()).trim() : "";
    } catch (error) {
      return "";
    }
  }
  const initialBuildId = fetchBuildId();

  let checking = false;
  async function checkCurrentDocument() {
    if (checking || document.visibilityState === "hidden") return;
    const activeEditor = document.activeElement;
    if (!document.querySelector("[data-g4-reload-build]") &&
        activeEditor?.matches?.("input, textarea, [contenteditable='true']") &&
        (activeEditor.id !== "accessCodeInput" || activeEditor.value)) return;
    checking = true;
    try {
      const loadedBuildId = await initialBuildId;
      if (loadedBuildId) {
        const currentBuildId = await fetchBuildId();
        if (currentBuildId && currentBuildId !== loadedBuildId) location.reload();
        return;
      }
      const response = await fetch(new URL("./", scriptUrl), { cache: "no-store" });
      if (!response.ok) return;
      const html = await response.text();
      const documentVersion = html.match(/<script\b[^>]*\bsrc=["'][^"']*build-info\.js\?v=([^"']+)["']/i)?.[1];
      if (documentVersion && decodeURIComponent(documentVersion) !== version) location.reload();
    } catch (error) {
      // Offline tabs keep their current workspace until the server is reachable.
    } finally {
      checking = false;
    }
  }

  window.addEventListener("focus", checkCurrentDocument);
  document.addEventListener("visibilitychange", checkCurrentDocument);
  document.addEventListener("focusout", checkCurrentDocument);
  window.setInterval(checkCurrentDocument, 30000);
})();
