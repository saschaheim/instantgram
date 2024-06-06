'use strict'

const Metalsmith = require('metalsmith')
const Handlebars = require('handlebars')
const fs = require('fs')
const signale = require('signale')

// plugins
const define = require('metalsmith-define')
const discoverPartials = require('metalsmith-discover-partials')
const layouts = require('@metalsmith/layouts')
const markdown = require('@metalsmith/markdown')
const permalinks = require('@metalsmith/permalinks')

// data
const langs = require('./langs.json')
const jsonpkg = require('../../package.json')

// handlebars helpers
Handlebars.registerHelper('to_lowercase', str => str.toLowerCase())

signale.pending('Build page initiated...')
Metalsmith(__dirname)
  .clean(true) // clean the build directory
  .source('./src/') // the page source directory
  .destination('../../lang') // the destination directory
  .use(define({
    'langs': langs,
    'version': jsonpkg.version
  }))
  .use(markdown())
  .use(discoverPartials({
    directory: 'layouts',
    pattern: /\.hbs$/
  }))
  .use(layouts({
    engine: 'handlebars',
    directory: 'layouts'
  }))
  .use(permalinks(':lang/'))
  .build(function (err) {
    if (err) {
      signale.fatal(err);
      throw err;
    }

    const source = fs.createReadStream('./lang/en-us/index.html');
    const dest = fs.createWriteStream('./index.html');
    source.pipe(dest);

    source.on('end', function () {
      signale.success('Build page complete');
    });

    source.on('error', function (err) {
      if (err) {
        signale.fatal(err);
      }
    });
  });