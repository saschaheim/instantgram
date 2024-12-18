'use strict'

// Required modules for Metalsmith, Handlebars, and file system operations
const Metalsmith = require('metalsmith');  // Core Metalsmith library for static site generation
const Handlebars = require('handlebars');  // Handlebars templating engine
const fs = require('fs');  // File system module to interact with files
const signale = require('signale');  // Logger for console output with styled messages

// Metalsmith plugins
const define = require('metalsmith-define');  // Plugin to define custom data in the build process
const discoverPartials = require('metalsmith-discover-partials');  // Plugin to discover partial templates
const layouts = require('@metalsmith/layouts');  // Plugin for rendering templates with layouts
const markdown = require('@metalsmith/markdown');  // Plugin to convert Markdown files to HTML
const permalinks = require('@metalsmith/permalinks');  // Plugin for creating URL-friendly permalinks

// Data files for localization and versioning
const langs = require('./langs.json');  // Localization data (typically JSON for supported languages)
const jsonpkg = require('../../package.json');  // Project metadata, including version info from package.json

// Register custom Handlebars helper for lowercase conversion
Handlebars.registerHelper('to_lowercase', str => str.toLowerCase());

// Log message indicating the start of the build process
signale.pending('Build page initiated...');

// Metalsmith configuration
Metalsmith(__dirname)  // Initialize Metalsmith with the current directory
  .clean(true)  // Clean the destination directory before building the new files
  .source('./src/')  // Set the source directory for page content (e.g., Markdown files)
  .destination('../../lang')  // Set the destination directory where the built files will be saved
  .use(define({
    'langs': langs,  // Inject the languages data into the build process
    'version': jsonpkg.version  // Inject the current version of the project into the build process
  }))
  .use(markdown())  // Convert Markdown files to HTML
  .use(discoverPartials({
    directory: 'layouts',  // Look for partial templates in the 'layouts' directory
    pattern: /\.hbs$/  // Only look for files with the '.hbs' extension (Handlebars templates)
  }))
  .use(layouts({
    engine: 'handlebars',  // Use Handlebars for templating
    directory: 'layouts'  // Set the directory where the layout templates are stored
  }))
  .use(permalinks(':lang/'))  // Generate permalinks with the language as part of the URL structure
  .build(function (err) {
    if (err) {
      // If an error occurs during the build process, log it and throw the error
      signale.fatal(err);
      throw err;
    }

    // If the build is successful, copy the generated 'index.html' for English language to the root directory
    const source = fs.createReadStream('./lang/en-us/index.html');
    const dest = fs.createWriteStream('./index.html');
    source.pipe(dest);

    source.on('end', function () {
      // Log success message once the 'index.html' file has been copied
      signale.success('Build page complete');
    });

    source.on('error', function (err) {
      // Log any error during the file copy process
      if (err) {
        signale.fatal(err);
      }
    });
  });