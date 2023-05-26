const fs = require('fs');
const signale = require('signale');
const bookmarkletify = require('bookmarkletify');
const { promisify } = require('util');
const pkg = require('../package.json');

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

signale.pending('Bookmarklet generating...');

(async function () {
  try {
    const instantgram = await readFileAsync('./dist/main.js', 'utf8');
    const bookmarkletString = bookmarkletify(instantgram);
    const bookmarkletButton = button(bookmarkletString);
    await writeFileAsync('./src/_langs/partials/button.html', bookmarkletButton);
    signale.success('Bookmarklet generated');
  } catch (err) {
    signale.fatal(err);
  }
})();

function hash() {
  if (process.argv[2] && process.argv[2] === '--dev') {
    return ' ' + Math.random().toString(36).substring(5, 15);
  }

  return ' ' + pkg.version;
}

function button(bookmarklet) {
  return '<a href="' + bookmarklet + '" class="btn" style="cursor: move;">[instantgram' + hash() + ']</a>';
}