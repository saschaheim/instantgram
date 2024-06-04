'use strict';

const fs = require('fs');
const signale = require('signale');
const UglifyJS = require('uglify-js');
const { promisify } = require('util');
const pkg = require('../package.json');

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

signale.pending('Bookmarklet generating...');

const minify = (code) => {
  const result = UglifyJS.minify(code, {
    compress: {
      sequences: true,
      dead_code: true,
      conditionals: true,
      booleans: true,
      unused: true,
      if_return: true,
      drop_console: false,
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

const bookmarkletify = (code) => {
  const min = encodeURI(minify(code));
  return `javascript:(function(){;${min}})()`;
};

const hash = () => (process.argv.includes('--dev') ? ` ${Math.random().toString(36).substring(5, 15)}` : ` ${pkg.version}`);
const button = (bookmarklet) => `<a href="${bookmarklet}" class="btn" style="cursor: move;">[instantgram-${hash()}]</a>`;

(async () => {
  try {
    const instantgram = await readFileAsync('./dist/main.js', 'utf8');
    const bookmarkletString = bookmarkletify(instantgram);
    const bookmarkletButton = button(bookmarkletString);
    await writeFileAsync('./src/_langs/layouts/partials/button.hbs', bookmarkletButton);
    signale.success('Bookmarklet generated');
  } catch (err) {
    signale.fatal(err);
  }
})();