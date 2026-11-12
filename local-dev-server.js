const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { readUtf8RequestBody } = require('./text-integrity.js');
const { currentBuildVersion, renderIndex, renderBuildInfo } = require('./scripts/build-version.cjs');

const root = __dirname;
const port = Number(process.env.PORT || 3000);
const liveReloadClients = new Set();
const liveReloadExtensions = new Set(['.html', '.css', '.js', '.json']);
const ignoredLiveReloadDirs = new Set(['.git', 'node_modules']);

function currentBuildId() {
  return currentBuildVersion();
}

const liveReloadScript = `
<script>
(() => {
  if (!("EventSource" in window)) return;
  const source = new EventSource("/__live-reload");
  let opened = false;
  source.addEventListener("open", () => {
    if (opened) window.location.reload();
    opened = true;
  });
  source.addEventListener("reload", () => window.location.reload());
})();
</script>`;

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8'
};

function loadEnvFile(fileName) {
  const filePath = path.join(root, fileName);
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) return;
    const key = match[1];
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  });
}

loadEnvFile('.env');
loadEnvFile('.env.local');

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

// «Экспорт всего проекта» in local mode: the page posts the finished JSON
// here and the file is written into ~/Downloads. Embedded browser panes can
// leave a blob download as an unfinished temporary file; this path reports
// the real file name, location and byte count back to the page. Existing
// files are never overwritten. Same-origin requests only.
function saveProjectExport(req, res, url) {
  if (req.method !== 'POST' || req.headers['x-guru-export'] !== '1') {
    sendJson(res, 400, { ok: false, error: 'bad_request' });
    return;
  }
  const origin = req.headers.origin;
  if (origin && origin !== `http://${req.headers.host}`) {
    sendJson(res, 403, { ok: false, error: 'foreign_origin' });
    return;
  }
  const requested = path.basename(String(url.searchParams.get('name') || ''));
  if (!/^guru-project-[\p{L}\p{N}._-]+\.json$/u.test(requested)) {
    sendJson(res, 400, { ok: false, error: 'invalid_name' });
    return;
  }
  const directory = path.join(os.homedir(), 'Downloads');
  const stem = requested.slice(0, -'.json'.length);
  let target = path.join(directory, requested);
  for (let index = 1; fs.existsSync(target); index += 1)
    target = path.join(directory, `${stem} (${index}).json`);
  const temporary = `${target}.part`;
  let bytes = 0;
  let failed = false;
  const fail = (error) => {
    if (failed) return;
    failed = true;
    fs.rm(temporary, { force: true }, () => {});
    sendJson(res, 500, { ok: false, error: error?.message || 'write_failed' });
  };
  fs.mkdirSync(directory, { recursive: true });
  const output = fs.createWriteStream(temporary, { flags: 'wx' });
  req.on('data', (chunk) => { bytes += chunk.length; });
  req.on('error', fail);
  output.on('error', fail);
  output.on('finish', () => {
    if (failed) return;
    try {
      fs.renameSync(temporary, target);
      sendJson(res, 200, { ok: true, path: target, name: path.basename(target), bytes });
    } catch (error) {
      fail(error);
    }
  });
  req.pipe(output);
}

function serveLiveReload(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive'
  });
  res.write('retry: 1000\n\n');

  liveReloadClients.add(res);
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    liveReloadClients.delete(res);
  });
}

function notifyLiveReloadClients() {
  const payload = `event: reload\ndata: ${Date.now()}\n\n`;
  liveReloadClients.forEach(client => {
    client.write(payload);
  });
}

function shouldLiveReload(fileName) {
  if (!fileName) return false;
  const parts = path.normalize(String(fileName)).split(path.sep);
  if (parts.some(part => ignoredLiveReloadDirs.has(part))) return false;
  return liveReloadExtensions.has(path.extname(String(fileName)));
}

function injectLiveReloadScript(html) {
  if (html.includes('/__live-reload')) return html;
  if (html.includes('</body>')) {
    return html.replace('</body>', `${liveReloadScript}\n</body>`);
  }
  return `${html}\n${liveReloadScript}`;
}

function startLiveReloadWatcher() {
  if (process.env.LIVE_RELOAD === '0') return;

  let reloadTimer = null;
  try {
    fs.watch(root, { recursive: true }, (_eventType, fileName) => {
      if (!shouldLiveReload(fileName)) return;
      clearTimeout(reloadTimer);
      reloadTimer = setTimeout(notifyLiveReloadClients, 150);
    });
    console.log('Live reload enabled for HTML/CSS/JS/JSON changes.');
  } catch (error) {
    console.warn(`Live reload watcher unavailable: ${error.message}`);
  }
}

function decorateResponse(res) {
  res.status = code => {
    res.statusCode = code;
    return res;
  };
  res.json = payload => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(payload));
    return res;
  };
  res.redirect = (code, location) => {
    res.statusCode = code;
    res.setHeader('Location', location);
    res.end();
    return res;
  };
}

async function serveApi(req, res, url) {
  const route = path.basename(url.pathname);
  const file = path.join(root, 'api', `${route}.js`);
  if (!fs.existsSync(file)) {
    sendJson(res, 404, { ok: false, error: 'api_not_found', route: url.pathname });
    return;
  }

  decorateResponse(res);
  req.query = Object.fromEntries(url.searchParams.entries());
  let rawBody;
  try { rawBody = await readUtf8RequestBody(req); }
  catch (_) {
    sendJson(res, 400, { ok: false, error: 'invalid_utf8' });
    return;
  }
  try {
    req.body = rawBody ? JSON.parse(rawBody) : {};
  } catch (_) {
    sendJson(res, 400, { ok: false, error: 'invalid_json' });
    return;
  }

  try {
    delete require.cache[require.resolve(file)];
    await require(file)(req, res);
  } catch (error) {
    sendJson(res, 500, { ok: false, error: 'local_server_exception', detail: error.message });
  }
}

function serveStatic(req, res, url) {
  const relativePath = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
  const filePath = path.normalize(path.join(root, relativePath));
  if (!filePath.startsWith(root)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }
    res.setHeader('Content-Type', contentTypes[path.extname(filePath)] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    if (relativePath === '/index.html') {
      const html = renderIndex(data.toString('utf8'), currentBuildVersion());
      res.end(process.env.LIVE_RELOAD !== '0' ? injectLiveReloadScript(html) : html);
      return;
    }
    if (relativePath === '/build-info.js') {
      res.end(renderBuildInfo(data.toString('utf8'), currentBuildVersion()));
      return;
    }
    res.end(data);
  });
}

startLiveReloadWatcher();

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  if (url.pathname === '/__build-id') {
    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store'
    });
    res.end(currentBuildId());
    return;
  }
  if (url.pathname === '/__live-reload') {
    serveLiveReload(req, res);
    return;
  }
  if (url.pathname === '/__guru-save-export') {
    saveProjectExport(req, res, url);
    return;
  }
  if (url.pathname.startsWith('/api/')) {
    serveApi(req, res, url);
    return;
  }
  serveStatic(req, res, url);
});

server.on('error', error => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Cannot start GURU on http://localhost:${port}: this port is already in use.`);
    console.error('Stop the old static server on this port, then run npm run dev again.');
    return;
  }
  console.error(`GURU local dev server failed to start: ${error.message}`);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`GURU local dev server: http://localhost:${port}`);
});
