/* eslint-disable */
const path = require('path');
const webpack = require('webpack');

const pkg = require('./package.json');
const ESLintPlugin = require('eslint-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = function (env) {
    const DEV = env && env.goal == 'dev'

    return {
        cache: true,
        entry: ['./src/index.ts'],
        output: {
            path: path.resolve(__dirname, 'dist'),
        },
        mode: DEV ? 'development' : 'production',
        devtool: DEV ? 'cheap-module-source-map' : 'nosources-source-map',
        plugins: [
            new webpack.DefinePlugin({
                'process.env.VERSION': JSON.stringify(pkg.version),
                'process.env.DEV': JSON.stringify(DEV)
            }),
            new ESLintPlugin()
        ],
        optimization: {
            minimize: true,
            minimizer: [
                new TerserPlugin({
                    parallel: true,
                    extractComments: false,
                    terserOptions: {
                        compress: { drop_console: false },
                        output: { comments: false },
                        sourceMap: true,
                        module: true,
                        toplevel: true,
                        ecma: 2015,
                        warnings: false,
                      }
                }),
            ],
        },
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
                exclude: /(node_modules|bower_components|legacy)/,
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