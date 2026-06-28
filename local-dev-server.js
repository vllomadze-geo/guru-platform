const fs = require('fs');
const http = require('http');
const path = require('path');

const root = __dirname;
const port = Number(process.env.PORT || 3000);

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

function readBody(req) {
  return new Promise(resolve => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => resolve(body));
  });
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
  const rawBody = await readBody(req);
  try {
    req.body = rawBody ? JSON.parse(rawBody) : {};
  } catch (error) {
    req.body = {};
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
    res.end(data);
  });
}

http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  if (url.pathname.startsWith('/api/')) {
    serveApi(req, res, url);
    return;
  }
  serveStatic(req, res, url);
}).listen(port, () => {
  console.log(`GURU local dev server: http://localhost:${port}`);
});
