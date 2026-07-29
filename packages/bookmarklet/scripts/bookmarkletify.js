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
const isRelease = process.argv.includes('--release');
const bookmarkletsJsonFile = path.join(__dirname, '..', 'dist', 'bookmarklets.json');
const siteBookmarkletsJsonFile = path.join(__dirname, '..', '..', '..', 'apps', 'site', 'src', 'generated', 'bookmarklets.json');
const siteVersionJsonFile = path.join(__dirname, '..', '..', '..', 'apps', 'site', 'src', 'generated', 'version.json');

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
      passes: 5,
      toplevel: true,
      join_vars: true,
      pure_getters: true,
      drop_console: false,
    },
    mangle: {
      toplevel: true,
      reserved: ['$super', '$', 'exports', 'require'],
      properties: {
        regex: /^(expanded|selectedIndex|settingsVersion|openSettings|closeSettings|setExpanded|setSelectedIndex|toggleExpanded|bumpSettingsVersion|mediaType|mediaUrl|downloadLabel|downloadAttributes|selectedSliderIndex|userLink|errorMessage|bodyStyle|buttonList|modalClassName|closeOnOverlayClick|largeInput)$/,
      },
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

const escapeHtmlAttr = (value) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');

const hash = () => {
  return isDevBookmarklet
    ? ` ${Math.random().toString(36).substring(5, 15)}`
    : ` ${pkg.version}`;
};

const button = (bookmarklet) => `<a href="${escapeHtmlAttr(bookmarklet)}" class="btn" style="cursor: move;">[instantgram ${hash()}]</a>`;

(async () => {
  try {
    const bookmarklets = {};

    fs.mkdirSync(path.dirname(bookmarkletsJsonFile), { recursive: true });
    fs.mkdirSync(path.dirname(siteBookmarkletsJsonFile), { recursive: true });

    for (const { lang } of langs) {
      const bundlePath = path.join(
        __dirname,
        '..',
        'dist',
        isRelease ? 'main.js' : `main.${lang.toLowerCase()}.js`,
      );
      if (!fs.existsSync(bundlePath)) {
        throw new Error(`Missing locale bundle: ${bundlePath}`);
      }
      const instantgram = await readFileAsync(bundlePath, 'utf8');
      const bookmarklet = bookmarkletify(instantgram);
      bookmarklets[lang] = button(bookmarklet);
    }

    const serializedBookmarklets = JSON.stringify(bookmarklets, null, isDevBookmarklet ? 2 : 0);
    await writeFileAsync(bookmarkletsJsonFile, serializedBookmarklets + '\n');
    await writeFileAsync(siteBookmarkletsJsonFile, serializedBookmarklets + '\n');
    await writeFileAsync(siteVersionJsonFile, JSON.stringify({ version: pkg.version }, null, 2) + '\n');

    signale.success('Bookmarklets generated');
  } catch (err) {
    signale.fatal(err);
  }
})();
