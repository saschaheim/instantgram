'use strict'

const Metalsmith = require('Metalsmith')
const Handlebars = require('handlebars')
const fs = require('fs')
const signale = require('signale')

// plugins
const define = require('metalsmith-define')
const layouts = require('metalsmith-layouts')
const markdown = require('metalsmith-markdown')
const permalinks = require('metalsmith-permalinks')


// data
const langs = require('./langs.json')
const jsonpkg = require('../../package.json')

// handlebars helpers
Handlebars.registerHelper('to_lowercase', str => str.toLowerCase())
signale.pending('Build page initiated...')

function debug(logToConsole) {
  return function (files, metalsmith, done) {
    if (logToConsole) {
      console.log('\nMETADATA:')
      console.log(metalsmith.metadata())

      for (var f in files) {
        console.log('\nFILE:')
        console.log(files[f])
      }
    }

    done()
  }
}

Metalsmith(__dirname)
  .clean(true)             // clean the build directory
  .source('html/')         // the page source directory
  .destination('../../lang')   // the destination directory
  .use(define({
    'langs': langs,
    'version': jsonpkg.version
  }))
  .use(markdown())         // convert Markdown to HTML
  .use(layouts({
    'engine': 'handlebars',
    'partials': 'partials',
    'pattern': '**/*.html',
    'default': 'default.html',
    'cache': false
  }))
  .use(permalinks(':lang/'))
  //.use(debug(true))        // *** NEW *** output debug information
  .build(function (err) {
    if (err) {
      signale.fatal(err)
    }

    const source = fs.createReadStream('./lang/en-us/index.html')
    const dest = fs.createWriteStream('./index.html')
    source.pipe(dest)

    source.on('end', function () {
      signale.success('Build page complete')
    })

    source.on('error', function (err) {
      if (err) {
        signale.fatal(err)
      }
    })
  })