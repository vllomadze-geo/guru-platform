const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

const root = path.resolve(__dirname, '..');
const releaseVersion = '2.3.526';
const versionPlaceholder = '__GURU_BUILD_VERSION__';
const assetReference = /(\b(?:src|href)=["'])([^"'?]+\.(?:js|css))(?:\?v=[^"']*)?(["'])/g;

function renderIndex(html, version) {
  return html.replace(assetReference, (_match, prefix, file, suffix) =>
    `${prefix}${file}?v=${encodeURIComponent(version)}${suffix}`);
}

function renderBuildInfo(source, version) {
  const marker = /const displayVersion = "[^"]+";/;
  if (!marker.test(source)) throw new Error('build-info.js: displayVersion marker is missing');
  return source.replace(marker, `const displayVersion = "${version}";`);
}

function runtimeFiles() {
  const files = fs.readdirSync(root, { withFileTypes: true })
    .filter(entry => entry.isFile() && /\.(?:html|css|js)$/.test(entry.name))
    .map(entry => entry.name);
  const apiDir = path.join(root, 'api');
  if (fs.existsSync(apiDir)) {
    files.push(...fs.readdirSync(apiDir)
      .filter(name => name.endsWith('.js'))
      .map(name => `api/${name}`));
  }
  files.push('scripts/build-version.cjs');
  return files.sort();
}

function currentBuildVersion() {
  const hash = createHash('sha256');
  for (const file of runtimeFiles()) {
    let source = fs.readFileSync(path.join(root, file));
    if (file === 'index.html')
      source = Buffer.from(renderIndex(source.toString('utf8'), versionPlaceholder));
    if (file === 'build-info.js')
      source = Buffer.from(renderBuildInfo(source.toString('utf8'), versionPlaceholder));
    hash.update(file).update('\0').update(source).update('\0');
  }
  return `${releaseVersion}+${hash.digest('hex').slice(0, 12)}`;
}

function stampedFile(file, version) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  return file === 'index.html'
    ? renderIndex(source, version)
    : renderBuildInfo(source, version);
}

function stampBuild() {
  const version = currentBuildVersion();
  for (const file of ['index.html', 'build-info.js']) {
    const filePath = path.join(root, file);
    const source = fs.readFileSync(filePath, 'utf8');
    const stamped = stampedFile(file, version);
    if (source !== stamped) fs.writeFileSync(filePath, stamped);
  }
  if (currentBuildVersion() !== version)
    throw new Error('Build fingerprint changed after stamping');
  return version;
}

module.exports = { currentBuildVersion, renderIndex, renderBuildInfo, stampBuild };
