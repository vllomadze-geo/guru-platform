import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { stampBuild } = require('./build-version.cjs');

console.log(`Stamped interface build ${stampBuild()}`);
