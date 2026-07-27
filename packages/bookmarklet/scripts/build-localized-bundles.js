'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const signale = require('signale');
const langs = require('../src/_langs/langs.json');

const repoRoot = path.join(__dirname, '..');
const distDir = path.join(repoRoot, 'dist');
const rollupBin = require.resolve('rollup/dist/bin/rollup');

signale.pending('Localized bundle build initiated...');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

for (const entry of fs.readdirSync(distDir)) {
  if (/^main(?:\..+)?\.js$/.test(entry)) {
    fs.rmSync(path.join(distDir, entry), { force: true });
  }
}

for (const { lang } of langs) {
  const outputFile = path.join('dist', `main.${lang.toLowerCase()}.js`);

  signale.await(`Building ${lang} bundle...`);
  execFileSync(process.execPath, [rollupBin, '-c'], {
    cwd: repoRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      BUILD_LOCALE: lang,
      BUILD_OUT_FILE: outputFile,
    },
  });
}
signale.success('Localized bundles built');
