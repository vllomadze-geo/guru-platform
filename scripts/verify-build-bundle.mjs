import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const { currentBuildVersion } = require("./build-version.cjs");
const html = readFileSync(resolve(root, "index.html"), "utf8");
const required = ["build-info.js", "app.js", "gate4-product-smm.js", "gate4-five-a.js", "gate4-five-a.css"];
const sources = [...html.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)]
  .map((match) => new URL(match[1], "http://localhost/"))
  .filter(source => source.origin === "http://localhost" && /\.(?:js|css)$/.test(source.pathname));
const expectedVersion = currentBuildVersion();
if (!sources.length) throw new Error("No local JavaScript or CSS assets found");
for (const source of sources) {
  const file = source.pathname.slice(1);
  readFileSync(resolve(root, file));
  if (source.searchParams.get("v") !== expectedVersion)
    throw new Error(`${file}: asset version ${source.searchParams.get("v") || "missing"} does not match ${expectedVersion}`);
}
const versions = required.map((file) => {
  const matches = sources.filter((source) => source.pathname === `/${file}`);
  if (matches.length !== 1) throw new Error(`${file}: expected exactly one asset reference`);
  const version = matches[0].searchParams.get("v");
  if (!version) throw new Error(`${file}: missing build version`);
  readFileSync(resolve(root, file));
  return version;
});
if (new Set(versions).size !== 1)
  throw new Error(`Mixed Gate 4 bundle versions: ${required.map((file, index) => `${file}=${versions[index]}`).join(", ")}`);

const buildInfo = readFileSync(resolve(root, "build-info.js"), "utf8");
const displayedVersion = buildInfo.match(/const displayVersion = "([^"]+)";/)?.[1];
if (!displayedVersion || displayedVersion !== expectedVersion)
  throw new Error(`Display version ${displayedVersion || "missing"} does not match bundle ${versions[0]}`);

console.log(`Interface build: ${displayedVersion} (${sources.length} matching assets)`);
