const typescript = require('@rollup/plugin-typescript'); // Import the TypeScript plugin for Rollup
const replace = require('@rollup/plugin-replace'); // Import the Replace plugin to inject environment variables into the code
const { nodeResolve } = require('@rollup/plugin-node-resolve');
const analyze = require('rollup-plugin-analyzer'); // Import the Rollup Analyzer plugin to provide bundle statistics
const postcss = require('rollup-plugin-postcss'); // Import the PostCSS plugin to handle CSS files
const cssnano = require('cssnano'); // Import the CSSNano plugin for minifying CSS
const { swc } = require('rollup-plugin-swc3'); // Import SWC (Speedy Web Compiler) for JavaScript/TypeScript transpiling

const development = process.env.ROLLUP_WATCH === 'true'; // Determine if the environment is in development mode (based on ROLLUP_WATCH)
const buildLocale = process.env.BUILD_LOCALE || 'en-US';
const outputFile = process.env.BUILD_OUT_FILE || 'dist/main.js';
const embedLocales = process.env.EMBED_LOCALES !== 'false';
const detailedAnalysis = process.env.ROLLUP_ANALYZE_VERBOSE === 'true';
module.exports = {
    input: 'src/index.ts', // Entry file for the Rollup build (TypeScript file)
    output: {
        file: outputFile, // Output file path
        format: 'iife', // Output format (IIFE - Immediately Invoked Function Expression)
        name: 'Instantgram', // Global variable name for the bundle
        sourcemap: false, // Keep output stable; SWC currently errors on TypeScript sourcemap chaining in watch mode
    },
    plugins: [
        replace({
            'process.env.DEV': JSON.stringify(development), // Replace 'process.env.DEV' with the value of the development variable
            'process.env.VERSION': JSON.stringify(require('./package.json').version), // Replace 'process.env.VERSION' with the project version from package.json
            'process.env.LOCALE': JSON.stringify(buildLocale),
            'process.env.EMBED_LOCALES': JSON.stringify(embedLocales),
            preventAssignment: true, // Prevent variable assignment warnings
        }),
        typescript({
            tsconfig: './tsconfig.json', // Use the TypeScript configuration from tsconfig.json
            sourceMap: false, // Avoid generating intermediary TS source map hints that SWC tries to resolve
        }),
        nodeResolve({
            browser: true,
            extensions: ['.mjs', '.js', '.json', '.ts', '.tsx'],
        }),
        swc({
            jsc: {
                parser: {
                    syntax: 'typescript', // Specify that the input is TypeScript
                    tsx: true,
                },
                transform: {},
                target: 'esnext', // Target modern JavaScript (ESNext)
            },
            sourceMaps: false, // Avoid SWC source map resolution errors in watch mode
            minify: !development, // Skip JS minification in watch mode
        }),
        postcss({
            plugins: development ? [] : [
                cssnano({
                    preset: 'default', // Use the default CSSNano preset for minification
                }),
            ],
            minimize: !development, // Skip CSS minification in watch mode
            inject: false, // Optional: if you want to extract the CSS to a separate file
        }),
        analyze({
            summaryOnly: !detailedAnalysis,
            limit: detailedAnalysis ? 80 : undefined,
        }) // Analyze the build and show only the summary by default
    ],
    onwarn: (warning, warn) => {
        if (warning.code === 'CIRCULAR_DEPENDENCY') return; // Ignore circular dependency warnings
        if (warning.code === 'PLUGIN_WARNING' && warning.plugin === 'typescript' && /sourcemap/.test(warning.message)) return; // Ignore TypeScript sourcemap warnings
        warn(warning); // Log any other warnings
    },
};
