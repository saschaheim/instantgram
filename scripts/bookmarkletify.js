const fs = require('fs');
const pkg = require('../package.json')
const browserify = require('browserify');
const bookmarkletify = require('bookmarkletify');
const process = require('process');
const signale = require('signale');

signale.pending('Bookmarklet generating...');

function hash() {
  if (process.argv[2] && process.argv[2] === '--dev') {
    return ' ' + Math.random().toString(36).substring(5, 15);
  }

  return ' ' + pkg.version;
}

// Fix es6 generation
var b = browserify({ basedir: './', standalone: 'instantgram' }).transform('babelify').add('./dist/main.js').bundle((err, buf) => {
  if (err) {
    return console.log(err);
  }

  let script = buf.toString();
  let output = bookmarkletify(script);

  fs.writeFileSync('./src/_langs/partials/button.html', '<a href="' + output + '" class="btn" style="cursor: move;">[instantgram' + hash() + ']</a>');
});

signale.success('Bookmarklet generated');




