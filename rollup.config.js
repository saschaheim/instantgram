const typescript = require('@rollup/plugin-typescript');
const replace = require('@rollup/plugin-replace');
const analyze = require('rollup-plugin-analyzer');
const postcss = require('rollup-plugin-postcss');
const cssnano = require('cssnano');
const { swc } = require('rollup-plugin-swc3');

// Import the package.json file
const pkg = require('./package.json');

const development = process.env.ROLLUP_WATCH

module.exports = {
    input: 'src/index.ts',  // Dein Eingabe-TypeScript-Datei
    output: {
        file: 'dist/main.js',  // Ausgabe-Datei
        format: 'iife', // or 'umd', 'cjs', etc.
        name: 'Instantgram', // Provide a global variable name for the IIFE bundle
        sourcemap: false // Enable sourcemap generation
    },
    plugins: [
        replace({
            'process.env.DEV': development ? true : false,
            'process.env.VERSION': JSON.stringify(pkg.version),
            preventAssignment: true  // Important to prevent errors with newer versions of the plugin
        }),
        // Configure the TypeScript plugin to generate sourcemaps
        typescript({ sourceMap: false }),
        // Configure the SWC plugin to generate sourcemaps
        swc({
            jsc: {
                parser: {
                    syntax: 'typescript',
                    tsx: false
                },
                transform: {},
                target: 'esnext'
            },
            sourceMaps: false,
            minify: true
        }),
        postcss({
            plugins: [
                cssnano({
                    preset: 'default', // Use default preset for minification
                })
            ],
            minimize: true, // Minimize the CSS output
            inject: false, // Optional: if you want to extract the CSS to a separate file
        }),
        analyze({ summaryOnly: true })
    ],
    onwarn: (warning, warn) => {
        // Ignore circular dependency warnings
        if (warning.code === 'CIRCULAR_DEPENDENCY') return;

        // Ignore specific sourcemap warning
        if (warning.code === 'PLUGIN_WARNING' && warning.plugin === 'typescript' && /sourcemap/.test(warning.message)) return;

        // Use default for everything else
        warn(warning);
    }
};
