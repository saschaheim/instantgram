const typescript = require('@rollup/plugin-typescript');
const replace = require('@rollup/plugin-replace');
const analyze = require('rollup-plugin-analyzer');
const postcss = require('rollup-plugin-postcss');
const cssnano = require('cssnano');
const { swc } = require('rollup-plugin-swc3');

const development = process.env.ROLLUP_WATCH === 'true';

module.exports = {
    input: 'src/index.ts',
    output: {
        file: 'dist/main.js',
        format: 'iife',
        name: 'Instantgram',
        sourcemap: false,
    },
    plugins: [
        replace({
            'process.env.DEV': JSON.stringify(development),
            'process.env.VERSION': JSON.stringify(require('./package.json').version),
            preventAssignment: true,
        }),
        typescript({
            tsconfig: './tsconfig.json',
            sourceMap: false,
        }),
        swc({
            jsc: {
                parser: {
                    syntax: 'typescript',
                    tsx: false,
                },
                transform: {},
                target: 'esnext',
            },
            sourceMaps: false,
            minify: true
        }),
        postcss({
            plugins: [
                cssnano({
                    preset: 'default',
                }),
            ],
            minimize: true, // Minimize the CSS output
            inject: false, // Optional: if you want to extract the CSS to a separate file
        }),
        analyze({ summaryOnly: true })
    ],
    onwarn: (warning, warn) => {
        if (warning.code === 'CIRCULAR_DEPENDENCY') return;
        if (warning.code === 'PLUGIN_WARNING' && warning.plugin === 'typescript' && /sourcemap/.test(warning.message)) return;
        warn(warning);
    },
};