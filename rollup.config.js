const typescript = require('@rollup/plugin-typescript'); // Import the TypeScript plugin for Rollup
const replace = require('@rollup/plugin-replace'); // Import the Replace plugin to inject environment variables into the code
const analyze = require('rollup-plugin-analyzer'); // Import the Rollup Analyzer plugin to provide bundle statistics
const postcss = require('rollup-plugin-postcss'); // Import the PostCSS plugin to handle CSS files
const cssnano = require('cssnano'); // Import the CSSNano plugin for minifying CSS
const { swc } = require('rollup-plugin-swc3'); // Import SWC (Speedy Web Compiler) for JavaScript/TypeScript transpiling

const development = process.env.ROLLUP_WATCH === 'true'; // Determine if the environment is in development mode (based on ROLLUP_WATCH)

module.exports = {
    input: 'src/index.ts', // Entry file for the Rollup build (TypeScript file)
    output: {
        file: 'dist/main.js', // Output file path
        format: 'iife', // Output format (IIFE - Immediately Invoked Function Expression)
        name: 'Instantgram', // Global variable name for the bundle
        sourcemap: false, // Disable sourcemaps in the output
    },
    plugins: [
        replace({
            'process.env.DEV': JSON.stringify(development), // Replace 'process.env.DEV' with the value of the development variable
            'process.env.VERSION': JSON.stringify(require('./package.json').version), // Replace 'process.env.VERSION' with the project version from package.json
            preventAssignment: true, // Prevent variable assignment warnings
        }),
        typescript({
            tsconfig: './tsconfig.json', // Use the TypeScript configuration from tsconfig.json
            sourceMap: false, // Disable source maps for TypeScript
        }),
        swc({
            jsc: {
                parser: {
                    syntax: 'typescript', // Specify that the input is TypeScript
                    tsx: false, // Disable TSX parsing (not needed here)
                },
                transform: {},
                target: 'esnext', // Target modern JavaScript (ESNext)
            },
            sourceMaps: false, // Disable source maps in the SWC plugin
            minify: true, // Minify the JavaScript output
        }),
        postcss({
            plugins: [
                cssnano({
                    preset: 'default', // Use the default CSSNano preset for minification
                }),
            ],
            minimize: true, // Minimize the CSS output
            inject: false, // Optional: if you want to extract the CSS to a separate file
        }),
        analyze({ summaryOnly: true }) // Analyze the build and show only the summary of the bundle
    ],
    onwarn: (warning, warn) => {
        if (warning.code === 'CIRCULAR_DEPENDENCY') return; // Ignore circular dependency warnings
        if (warning.code === 'PLUGIN_WARNING' && warning.plugin === 'typescript' && /sourcemap/.test(warning.message)) return; // Ignore TypeScript sourcemap warnings
        warn(warning); // Log any other warnings
    },
};