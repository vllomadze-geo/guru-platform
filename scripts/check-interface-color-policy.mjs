import { readFileSync, readdirSync } from 'node:fs';

const cssFiles = readdirSync(new URL('..', import.meta.url))
  .filter((name) => name.endsWith('.css'));
const jsFiles = readdirSync(new URL('..', import.meta.url))
  .filter((name) => name.endsWith('.js'));
const rulePattern = /([^{}]+)\{([^{}]*)\}/gs;
const backgroundPattern = /(?:^|;)\s*(background(?:-color|-image)?)\s*:\s*([^;]+)(?=;|$)/gis;
const edgePattern = /(?:^|;)\s*((?:border(?:-(?:top|right|bottom|left))?(?:-color)?|outline(?:-color)?))\s*:\s*([^;]+)(?=;|$)/gis;
const textPattern = /(?:^|;)\s*(color)\s*:\s*([^;]+)(?=;|$)/gis;
const shadowPattern = /(?:^|;)\s*((?:box|text)-shadow)\s*:\s*([^;]+)(?=;|$)/gis;
const hexPattern = /#[0-9a-f]{3,8}\b/gi;
const rgbPattern = /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/gi;
const statusTokens = /var\(--(?:ready|work|review|danger|success|warning|ok)\b/i;

function tinted([red, green, blue]) {
  return (green - red >= 4 && green - blue >= 6)
    || (blue - red >= 6 && blue - green >= 3)
    || (red - green >= 10 && red - blue >= 10)
    || (red - blue >= 14 && green - blue >= 10)
    || (Math.max(red, green, blue) - Math.min(red, green, blue) > 22
      && (Math.max(red, green, blue) - Math.min(red, green, blue))
        / Math.max(red, green, blue, 1) > 0.08);
}

function isChromatic(value) {
  if (statusTokens.test(value)) return true;
  for (const match of value.matchAll(hexPattern)) {
    let hex = match[0].slice(1);
    if (hex.length === 3 || hex.length === 4) hex = [...hex].map((digit) => digit.repeat(2)).join('');
    if (hex.length < 6) continue;
    if (tinted([0, 2, 4].map((index) => Number.parseInt(hex.slice(index, index + 2), 16)))) return true;
  }
  for (const match of value.matchAll(rgbPattern)) {
    if (tinted(match.slice(1).map(Number))) return true;
  }
  return false;
}

const statusMarkers = [
  /(?:^|\s|>)\.status-[\w-]+$/, /\.status-pill\b/,
  /\.gate0-card-status\b/, /\.gate7-status\b/,
  /\.supabase-status[^,]*::before$/, /\.now-guide-(?:track\s+span|dot)/,
  /\.autosave-dot\b/, /\.mini-indicator\.is-saved/,
  /\.yesno\./, /\.result-(?:ok|bad|neutral)/, /\.seo-indicator\./,
  /\.demand-check\./, /\.diag-(?:green|yellow|red)/,
  /\.gate0-summary-fill\b/, /\.gate0-keyword-status-v247\b/,
  /\.g1-flag-status/, /\.g4-v392-cost-badge/,
  /\.g4-smm-summary-dot/, /\.g4-product-smm-progress-v2/,
  /progress::/, /\.g8-scenario-status/,
  /\.pv181-group-benchmark-dot/, /\.pv181-keyword-draft-badge/,
  /\.g4-smm-readiness-v529\s*>\s*span\.is-(?:pending|ready)/,
  /\.gate1-comparison-product-list-v306\s+article[^,]*>\s*b/,
  /\.g4-rsya-image-limit-warning/, /\.g4five-nav-status-v545/,
  /\.mega-platform-picker-new\s+input\[aria-invalid="true"\]/,
  /\.g2sb-status\[data-status=/, /\.g2u-step-badge\[data-status=/,
];

function isStatusMarker(selector) {
  return selector.replace(/\/\*.*?\*\//gs, '').split(',')
    .every((part) => statusMarkers.some((pattern) => pattern.test(part.trim())));
}

const statusTextMarkers = /\.g8-audit-status\b|\.g4-campaign-status\b|\.g2-sync-note\.is-(?:done|progress)|\.now-guide-status\b|\.now-guide-finished\b|\.access-error\b|\.g2step-danger\b|\.g4-rsya-(?:error|ok|warning|copy-success|copy-icon-v472\.is-copy-error)\b|\.g4-smm-readiness-v529\s*>\s*span\.is-(?:ready|pending)|\.g4-smm-pair-card-v529\s*>\s*header\s+em\.is-(?:ready|pending)/i;

const violations = [];
for (const name of cssFiles) {
  const source = readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');
  for (const rule of source.matchAll(rulePattern)) {
    const selector = rule[1].trim();
    if (isStatusMarker(selector)) continue;
    for (const pattern of [backgroundPattern, edgePattern, shadowPattern, ...(statusTextMarkers.test(selector) ? [] : [textPattern])]) {
      for (const declaration of rule[2].matchAll(pattern)) {
        if (!isChromatic(declaration[2])) continue;
        const line = source.slice(0, rule.index).split('\n').length;
        violations.push(`${name}:${line} ${selector.split('\n').at(-1).trim()} → ${declaration[1]}: ${declaration[2].trim()}`);
      }
    }
  }
}

for (const name of jsFiles) {
  const source = readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');
  for (const match of source.matchAll(/background(?:-color)?\s*:\s*(#[0-9a-f]{3,8}\b|rgba?\([^)]*\))/gi)) {
    if (!isChromatic(match[1])) continue;
    const line = source.slice(0, match.index).split('\n').length;
    violations.push(`${name}:${line} inline background: ${match[1]}`);
  }
}

if (violations.length) {
  console.error(`Chromatic nonstatus surfaces, borders, or text (${violations.length}):\n${violations.join('\n')}`);
  process.exitCode = 1;
} else {
  console.log(`Color policy: ${cssFiles.length} CSS and ${jsFiles.length} JS files checked; nonstatus surfaces, borders, and text are neutral.`);
}
