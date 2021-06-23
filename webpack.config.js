/* eslint-disable */
const path = require('path');
const webpack = require('webpack');

const pkg = require('./package.json');
const ESLintPlugin = require('eslint-webpack-plugin');
//const ClosurePlugin = require('closure-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = function (env) {
    const DEV = env && env.goal == 'dev'

    return {
        cache: false,
        entry: ['./src/index.ts'],
        output: {
            path: path.resolve(__dirname, 'dist'),
        },
        devtool: DEV ? 'eval' : false,
        plugins: [
            new webpack.DefinePlugin({
                'process.env.VERSION': JSON.stringify(pkg.version),
                'process.env.DEV': JSON.stringify(DEV)
            }),
            new ESLintPlugin()
        ],
        optimization: {
            minimizer: [
                new TerserPlugin({
                    terserOptions: {
                        output: {
                            comments: false,
                        },
                    },
                }),
            ],
        },
        // optimization: {
        //     minimizer: [
        //         new ClosurePlugin({ mode: 'STANDARD' }, {
        //             // compiler flags here
        //             //
        //             // for debugging help, try these:
        //             //
        //             //formatting: 'PRETTY_PRINT',
        //             //debug: true,
        //             // renaming: false
        //         })
        //     ]
        // },
        resolve: {
            extensions: ['.ts'],
            modules: ['node_modules']
        },
        module: {
            rules: [{
                test: /.tsx?$/,
                use: [{
                    loader: 'ts-loader'
                }]
            }, {
                test: /\.js$/,
                exclude: /(node_modules|bower_components)/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['env']
                    }
                }
            },
            {
                test: /\.html$/,
                use: {
                    loader: 'html-loader',
                    options: {
                        minimize: true
                    }
                },
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            }
            ]
        },
        stats: {
            assetsSpace: 50,
            modulesSpace: 50,
            orphanModules: true,
        }
    }
}