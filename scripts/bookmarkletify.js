'use strict';

const fs = require('fs');
const path = require('path');
const signale = require('signale');
const UglifyJS = require('uglify-js');
const { promisify } = require('util');
const pkg = require('../package.json');
const langs = require('../src/_langs/langs.json');

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const isDevBookmarklet = process.argv.includes('--dev');
const bookmarkletsFile = path.join(__dirname, '..', 'src', '_langs', 'bookmarklets.js');

signale.pending('Bookmarklet generating...');

const minify = (code) => {
  if (isDevBookmarklet) {
    return code;
  }

  const result = UglifyJS.minify(code, {
    compress: {
      sequences: true,
      dead_code: true,
      conditionals: true,
      booleans: true,
      unused: true,
      if_return: true,
    },
    mangle: {
      toplevel: true,
      reserved: ['$super', '$', 'exports', 'require'],
    },
    output: {
      code: true,
      comments: false,
      beautify: false,
    },
  });

  if (result.error) {
    console.error(result.error);
    return code;
  }

  return result.code;
};

const bookmarkletify = (code) => `javascript:(function(){;${encodeURI(minify(code))}})()`;

const hash = () => {
  return isDevBookmarklet
    ? ` ${Math.random().toString(36).substring(5, 15)}`
    : ` ${pkg.version}`;
};

const button = (bookmarklet) => `<a href="${bookmarklet}" class="btn" style="cursor: move;">[instantgram ${hash()}]</a>`;

const bundlePathForLang = (lang) => path.join(__dirname, '..', 'dist', `main.${lang.toLowerCase()}.js`);

(async () => {
  try {
    const bookmarklets = {};

    for (const { lang } of langs) {
      const bundlePath = bundlePathForLang(lang);
      if (!fs.existsSync(bundlePath)) {
        throw new Error(`Missing localized bundle for ${lang}: ${bundlePath}`);
      }
      const instantgram = await readFileAsync(bundlePath, 'utf8');
      bookmarklets[lang] = button(bookmarkletify(instantgram));
    }

    const serializedBookmarklets = JSON.stringify(bookmarklets, null, isDevBookmarklet ? 2 : 0);
    await writeFileAsync(bookmarkletsFile, `module.exports = ${serializedBookmarklets};\n`);

    signale.success('Bookmarklets generated');
  } catch (err) {
    signale.fatal(err);
  }
})();
