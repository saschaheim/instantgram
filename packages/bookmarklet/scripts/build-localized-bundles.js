'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const signale = require('signale');
const langs = require('../src/_langs/langs.json');

const repoRoot = path.join(__dirname, '..');
const distDir = path.join(repoRoot, 'dist');
const rollupBin = require.resolve('rollup/dist/bin/rollup');
const release = process.argv.includes('--release');

signale.pending(`${release ? 'Release' : 'Local'} bundle build initiated...`);

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

for (const entry of fs.readdirSync(distDir)) {
  if (/^main(?:\..+)?\.js$/.test(entry)) {
    fs.rmSync(path.join(distDir, entry), { force: true });
  }
}

const builds = release
  ? [{ lang: 'en-US', file: 'main.js' }]
  : langs.map(({ lang }) => ({ lang, file: `main.${lang.toLowerCase()}.js` }));

for (const { lang, file } of builds) {
  signale.await(`Building ${release ? 'runtime' : lang} bundle...`);
  execFileSync(process.execPath, [rollupBin, '-c'], {
    cwd: repoRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      BUILD_LOCALE: lang,
      BUILD_OUT_FILE: path.join('dist', file),
      EMBED_LOCALES: String(!release),
    },
  });
}
signale.success(`${release ? 'Remote-locale release' : 'Offline multilingual'} bundle built`);
