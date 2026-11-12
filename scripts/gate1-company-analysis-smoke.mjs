import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const checks = [
  'scripts/gate1-company-analysis-projects-smoke.mjs',
  'scripts/gate1-company-simple-comparison-visual.mjs',
];
for (const script of checks) {
  const args = script.includes('visual') ? [script, 'after'] : [script];
  const result = spawnSync(process.execPath, args, {
    cwd: process.cwd(), env: process.env, encoding: 'utf8', timeout: 120_000,
  });
  process.stdout.write(result.stdout || '');
  process.stderr.write(result.stderr || '');
  if (result.status !== 0) process.exit(result.status || 1);
}

const projects = JSON.parse(readFileSync('artifacts/company-demand-comparison/four-projects.json', 'utf8'));
const layout = JSON.parse(readFileSync('artifacts/company-simple-comparison/visual-checks.json', 'utf8'));
const result = { passed: projects.projects.length === 4 && projects.projects.every(project => project.before === project.after) &&
  layout.noOldSections && layout.directFields && layout.neighborFields && layout.optionalUncounted && layout.productOldTable,
  projects: projects.projects.map(project => project.project), layout };
writeFileSync('artifacts/company-simple-comparison/smoke.json', JSON.stringify(result, null, 2));
if (!result.passed) throw new Error(JSON.stringify(result));
console.log('Gate 1 company comparison: PASS');
