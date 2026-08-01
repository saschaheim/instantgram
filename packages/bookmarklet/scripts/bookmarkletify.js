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
const firefoxBookmarkletsJsonFile = path.join(__dirname, '..', '..', '..', 'apps', 'site', 'src', 'generated', 'firefox-bookmarklets.json');
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
      // console.log/info are diagnostic-only in this codebase (never used for their
      // return value), so treating them as side-effect-free lets the compressor drop
      // the calls entirely when unused. console.error/warn are left alone since some
      // support flows rely on those being visible in production.
      pure_funcs: ['console.log', 'console.info'],
    },
    mangle: {
      toplevel: true,
      reserved: ['$super', '$', 'exports', 'require'],
      properties: {
        regex: /^(expanded|selectedIndex|settingsVersion|openSettings|closeSettings|setExpanded|setSelectedIndex|toggleExpanded|bumpSettingsVersion|mediaType|mediaUrl|downloadLabel|downloadAttributes|selectedSliderIndex|userName|userLink|errorMessage|bodyStyle|buttonList|modalClassName|closeOnOverlayClick|largeInput|sliderRef|suppressClickRef|selectSlide|handleSliderPointerDown|handleSliderPointerMove|handleSliderPointerEnd|rootRef|videoRefs)$/,
      },
    },
    output: {
      code: true,
      comments: false,
      beautify: false,
      // Single quotes aren't percent-encoded by encodeURI() (unlike "), so preferring
      // them here meaningfully shrinks the encoded javascript: URI length.
      quote_style: 1,
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
    const firefoxBookmarklets = {};

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
      if (isRelease) {
        const firefoxBundle = await readFileAsync(path.join(__dirname, '..', 'dist', 'main.firefox.js'), 'utf8');
        firefoxBookmarklets[lang] = button(bookmarkletify(firefoxBundle)).replace('[instantgram ', '[instantgram Firefox ');
      }
    }

    const serializedBookmarklets = JSON.stringify(bookmarklets, null, isDevBookmarklet ? 2 : 0);
    await writeFileAsync(bookmarkletsJsonFile, serializedBookmarklets + '\n');
    await writeFileAsync(siteBookmarkletsJsonFile, serializedBookmarklets + '\n');
    if (isRelease) {
      await writeFileAsync(firefoxBookmarkletsJsonFile, JSON.stringify(firefoxBookmarklets) + '\n');
    }
    await writeFileAsync(siteVersionJsonFile, JSON.stringify({ version: pkg.version }, null, 2) + '\n');

    if (isRelease) {
      fs.rmSync(path.join(__dirname, '..', 'dist', 'main.js'), { force: true });
      fs.rmSync(path.join(__dirname, '..', 'dist', 'main.firefox.js'), { force: true });
    }

    signale.success('Bookmarklets generated');
  } catch (err) {
    signale.fatal(err);
  }
})();
