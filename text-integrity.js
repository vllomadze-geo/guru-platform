/* Shared text decoding and integrity checks for browser imports and API input. */
(function (root) {
  "use strict";

  function decodeUtf8(bytes) {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  }

  async function readUtf8RequestBody(stream) {
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return decodeUtf8(Buffer.concat(chunks));
  }

  function decodeTextFile(bytes) {
    const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    let decoded;
    if (data[0] === 0xff && data[1] === 0xfe)
      decoded = new TextDecoder("utf-16le", { fatal: true }).decode(data.subarray(2));
    else if (data[0] === 0xfe && data[1] === 0xff)
      decoded = new TextDecoder("utf-16be", { fatal: true }).decode(data.subarray(2));
    else decoded = decodeUtf8(data);
    assertCleanNewText(decoded);
    return decoded;
  }

  function inspect(value) {
    const text = String(value ?? "");
    let replacementCount = 0;
    let unpairedSurrogateCount = 0;
    for (let index = 0; index < text.length; index += 1) {
      const unit = text.charCodeAt(index);
      if (unit === 0xfffd) replacementCount += 1;
      if (unit >= 0xd800 && unit <= 0xdbff) {
        const next = text.charCodeAt(index + 1);
        if (next >= 0xdc00 && next <= 0xdfff) index += 1;
        else unpairedSurrogateCount += 1;
      } else if (unit >= 0xdc00 && unit <= 0xdfff) {
        unpairedSurrogateCount += 1;
      }
    }
    return { replacementCount, unpairedSurrogateCount };
  }

  function assertWellFormed(value) {
    const result = inspect(value);
    if (result.unpairedSurrogateCount)
      throw new Error("Текст содержит повреждённую пару Unicode; запись отменена.");
    return result;
  }

  function assertCleanNewText(value) {
    const result = assertWellFormed(value);
    if (result.replacementCount)
      throw new Error("Текст содержит повреждённый символ «�»; импорт или ввод отменён.");
    return result;
  }

  function assertCleanImportedData(value) {
    if (typeof value === "string") {
      assertCleanNewText(value);
      return value;
    }
    if (Array.isArray(value)) {
      for (const item of value) assertCleanImportedData(item);
    } else if (value && typeof value === "object") {
      for (const [key, item] of Object.entries(value)) {
        assertCleanNewText(key);
        assertCleanImportedData(item);
      }
    }
    return value;
  }

  function installInputGuard(document, onError) {
    const check = (event, value) => {
      if (!value || !event.target?.closest?.("input, textarea, [contenteditable]")) return;
      try { assertCleanNewText(value); }
      catch (error) {
        event.preventDefault();
        onError?.(error);
      }
    };
    document.addEventListener("beforeinput", (event) =>
      check(event, event.data ?? event.dataTransfer?.getData("text/plain")), true);
    document.addEventListener("paste", (event) =>
      check(event, event.clipboardData?.getData("text/plain")), true);
    document.addEventListener("drop", (event) =>
      check(event, event.dataTransfer?.getData("text/plain")), true);
  }

  function recoveryPattern(damaged) {
    const parts = damaged.split(/(�+)/u);
    const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const expression = parts.map((part) => part.startsWith("�")
      ? `[\\s\\S]{1,${part.length}}` : escape(part)).join("");
    const first = parts[0] || "";
    const last = parts.at(-1) || "";
    const lost = parts.filter((part) => part.startsWith("�"));
    return {
      expression: new RegExp(`^${expression}$`, "u"),
      first, last,
      minLength: damaged.length - lost.reduce((sum, part) => sum + part.length, 0) + lost.length,
      maxLength: damaged.length,
    };
  }

  function uniqueRecovery(damaged, candidates) {
    if (!damaged.includes("�")) return "";
    const pattern = recoveryPattern(damaged);
    let match = "";
    for (const candidate of candidates) {
      if (typeof candidate !== "string" || candidate.includes("�") ||
          candidate.length < pattern.minLength || candidate.length > pattern.maxLength ||
          !candidate.startsWith(pattern.first) || !candidate.endsWith(pattern.last) ||
          !pattern.expression.test(candidate)) continue;
      if (match && match !== candidate) return "";
      match = candidate;
    }
    return match;
  }

  function planWorkspaceRecovery(workspace) {
    const hasDamagedText = (node) => {
      if (typeof node === "string") return node.includes("�");
      if (Array.isArray(node)) return node.some(hasDamagedText);
      return Boolean(node && typeof node === "object" &&
        Object.values(node).some(hasDamagedText));
    };
    if (!hasDamagedText(workspace)) return { changes: [], unresolved: 0 };
    const cleanByField = new Map();
    const damaged = [];
    const addClean = (field, value) => {
      let lengths = cleanByField.get(field);
      if (!lengths) cleanByField.set(field, lengths = new Map());
      let values = lengths.get(value.length);
      if (!values) lengths.set(value.length, values = new Set());
      values.add(value);
    };
    const visit = (node, path, field = "") => {
      if (typeof node === "string") {
        if (node.includes("�")) damaged.push({ path: path.slice(), field, original: node });
        else addClean(field, node);
      } else if (Array.isArray(node)) {
        node.forEach((value, index) => {
          path.push(index);
          visit(value, path, field);
          path.pop();
        });
      } else if (node && typeof node === "object") {
        Object.entries(node).forEach(([key, value]) => {
          path.push(key);
          visit(value, path, key);
          path.pop();
        });
      }
    };
    visit(workspace, []);
    if (!damaged.length) return { changes: [], unresolved: 0 };

    const siblingStrings = (node) => {
      const values = [];
      if (!node || typeof node !== "object") return values;
      for (const value of Object.values(node)) {
        if (typeof value === "string") values.push(value);
        else if (value && typeof value === "object" && !Array.isArray(value))
          for (const nested of Object.values(value))
            if (typeof nested === "string") values.push(nested);
      }
      return values;
    };
    const atPath = (path) => path.reduce((value, key) => value?.[key], workspace);
    const confirmed = new Map();
    const proposals = new Map();
    for (const item of damaged) {
      const parent = atPath(item.path.slice(0, -1));
      let match = item.field === "value"
        ? uniqueRecovery(item.original, siblingStrings(parent)) : "";
      if (!match) {
        const pattern = recoveryPattern(item.original);
        const lengths = cleanByField.get(item.field);
        function* candidates() {
          for (let length = pattern.minLength; length <= pattern.maxLength; length += 1)
            yield* lengths?.get(length) || [];
        }
        match = uniqueRecovery(item.original, candidates());
      }
      if (!match) continue;
      confirmed.set(item, match);
      let options = proposals.get(item.original);
      if (!options) proposals.set(item.original, options = new Set());
      options.add(match);
    }
    const substitutions = [...proposals].filter(([, options]) => options.size === 1)
      .map(([before, options]) => [before, [...options][0]])
      .sort((left, right) => right[0].length - left[0].length);
    const changes = [];
    for (const item of damaged) {
      let next = confirmed.get(item) || item.original;
      if (next === item.original)
        for (const [before, after] of substitutions)
          if (before.length >= 12 && next.includes(before)) next = next.replaceAll(before, after);
      if (next !== item.original && inspect(next).replacementCount < inspect(item.original).replacementCount)
        changes.push({ path: item.path, original: item.original, restored: next });
    }
    return { changes, unresolved: damaged.length - changes.length };
  }

  function applyWorkspaceRecovery(workspace, plan) {
    let applied = 0;
    for (const change of plan.changes || []) {
      const parent = change.path.slice(0, -1)
        .reduce((value, key) => value?.[key], workspace);
      const key = change.path.at(-1);
      if (parent && parent[key] === change.original) {
        parent[key] = change.restored;
        applied += 1;
      }
    }
    return applied;
  }

  const api = Object.freeze({ decodeUtf8, readUtf8RequestBody, decodeTextFile, inspect,
    assertWellFormed, assertCleanNewText, assertCleanImportedData, installInputGuard,
    uniqueRecovery, planWorkspaceRecovery, applyWorkspaceRecovery });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.GuruTextIntegrity = api;
})(typeof globalThis !== "undefined" ? globalThis : null);
