'use strict';

// Required modules for working with file system, minification, logging, and promises
const fs = require('fs'); // File system module to interact with files
const signale = require('signale'); // Logger to output styled messages to console
const UglifyJS = require('uglify-js'); // JS minification library
const { promisify } = require('util'); // Promisify utility to convert callback-based functions into promises
const pkg = require('../package.json'); // Access the package.json for project version and metadata

// Promisify readFile and writeFile to use async/await syntax
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

// Log a message indicating the bookmarklet generation process has started
signale.pending('Bookmarklet generating...');

/**
 * Minifies the provided JavaScript code using UglifyJS.
 * @param {string} code - The JavaScript code to minify.
 * @returns {string} - The minified JavaScript code.
 */
const minify = (code) => {
  // Use UglifyJS to minify the code with various compression options
  const result = UglifyJS.minify(code, {
    compress: {
      sequences: true,  // Optimize sequences of statements
      dead_code: true,  // Remove unreachable code
      conditionals: true,  // Simplify conditional expressions
      booleans: true,  // Simplify boolean expressions
      unused: true,  // Remove unused variables
      if_return: true,  // Remove unnecessary if-return statements
      drop_console: false,  // Retain console statements (set to true to drop them)
    },
    mangle: {
      toplevel: true,  // Mangle top-level variable names
      reserved: ['$super', '$', 'exports', 'require'], // Reserve specific names from mangling
    },
    output: {
      code: true,  // Ensure code is output
      comments: false,  // Remove comments
      beautify: false,  // Do not beautify the code
    },
  });

  if (result.error) {
    // If there's an error in minification, log it and return the original code
    console.error(result.error);
    return code;
  }
  
  // Return the minified code
  return result.code;
};

/**
 * Converts the minified JavaScript code into a bookmarklet.
 * @param {string} code - The JavaScript code to be converted into a bookmarklet.
 * @returns {string} - The bookmarklet as a URL.
 */
const bookmarkletify = (code) => {
  // Minify and encode the code to make it suitable for a bookmarklet
  const min = encodeURI(minify(code));
  
  // Return the bookmarklet in the form of a JavaScript URI
  return `javascript:(function(){;${min}})()`;
};

/**
 * Generates a unique hash based on the current environment (e.g., version or random for dev).
 * @returns {string} - A unique hash string.
 */
const hash = () => {
  // If the 'dev' flag is passed, generate a random hash, else use the version from package.json
  return (process.argv.includes('--dev')) 
    ? ` ${Math.random().toString(36).substring(5, 15)}`  // Random hash for dev mode
    : ` ${pkg.version}`;  // Use version from package.json
};

/**
 * Generates a button with the bookmarklet embedded.
 * @param {string} bookmarklet - The bookmarklet URL to be embedded in the button.
 * @returns {string} - The HTML string for the bookmarklet button.
 */
const button = (bookmarklet) => {
  // Return HTML for a button with the bookmarklet URL
  return `<a href="${bookmarklet}" class="btn" style="cursor: move;">[instantgram ${hash()}]</a>`;
};

// Main async function to generate the bookmarklet
(async () => {
  try {
    // Read the main.js file from the 'dist' directory
    const instantgram = await readFileAsync('./dist/main.js', 'utf8');
    
    // Convert the JavaScript code into a bookmarklet format
    const bookmarkletString = bookmarkletify(instantgram);
    
    // Generate the bookmarklet button HTML
    const bookmarkletButton = button(bookmarkletString);
    
    // Write the button HTML to the specified Handlebars partial file
    await writeFileAsync('./src/_langs/layouts/partials/button.hbs', bookmarkletButton);
    
    // Log success message after bookmarklet is generated
    signale.success('Bookmarklet generated');
  } catch (err) {
    // Log any errors encountered during the process
    signale.fatal(err);
  }
})();