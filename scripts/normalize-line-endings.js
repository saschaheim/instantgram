'use strict';

const fs = require('fs');
const path = require('path');
const signale = require('signale');

const repoRoot = path.join(__dirname, '..');

const normalize = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return;
  }
  const original = fs.readFileSync(filePath, 'utf8');
  const normalized = original.replace(/\r\n|\n/g, '\r\n');
  if (normalized !== original) {
    fs.writeFileSync(filePath, normalized);
  }
};

// Rollup, uglify-js and Metalsmith all write LF regardless of platform, which
// makes every build touch these generated files' line endings again under
// core.autocrlf=true / the repo's CRLF .gitattributes policy. Normalize them
// once here so a fresh build already matches what git expects on checkout.
const distDir = path.join(repoRoot, 'dist');
if (fs.existsSync(distDir)) {
  for (const entry of fs.readdirSync(distDir)) {
    if (/^main(?:\..+)?\.js$/.test(entry)) {
      normalize(path.join(distDir, entry));
    }
  }
}

normalize(path.join(repoRoot, 'src', '_langs', 'bookmarklets.js'));
normalize(path.join(repoRoot, 'index.html'));

const langDir = path.join(repoRoot, 'lang');
if (fs.existsSync(langDir)) {
  for (const entry of fs.readdirSync(langDir)) {
    normalize(path.join(langDir, entry, 'index.html'));
  }
}

signale.success('Line endings normalized to CRLF');
