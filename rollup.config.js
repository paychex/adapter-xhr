const { nodeResolve } = require("@rollup/plugin-node-resolve");
const { terser } = require("rollup-plugin-terser");
const polyfills = require('rollup-plugin-node-polyfills');
const commonjs = require('@rollup/plugin-commonjs');
const { babel } = require("@rollup/plugin-babel");

const pkg = require('./package.json');
const external = ['lodash-es', '@paychex/core'];

module.exports = [
    {
        // UMD
        external,
        input: 'index.mjs',
        plugins: [
            nodeResolve({
                browser: true,
                preferBuiltins: false,
            }),
            commonjs({
                include: /node_modules/,
            }),
            babel({
                babelHelpers: "bundled",
            }),
            polyfills(),
            terser(),
        ],
        output: {
            file: `dist/paychex.adapter-xhr.min.js`,
            format: "umd",
            name: pkg.name,
            esModule: false,
            exports: "named",
            sourcemap: true,
            paths: {
                'lodash-es': 'lodash'
            },
            globals: {
                'lodash-es': '_'
            }
        },
    },
    // ESM
    {
        input: 'index.mjs',
        treeshake: false,
        external,
        plugins: [
            nodeResolve(),
            commonjs({
                include: /node_modules/,
            })
        ],
        output: {
            dir: "dist/esm",
            format: "esm",
            exports: "named",
            sourcemap: true,
        },
    },
    // CJS
    {
        input: 'index.mjs',
        treeshake: false,
        external,
        plugins: [
            nodeResolve(),
            commonjs({
                include: /node_modules/,
            })
        ],
        output: {
            dir: "dist/cjs",
            format: "cjs",
            exports: "named",
            sourcemap: true,
            paths: {
                'lodash-es': 'lodash'
            },
        },
    },
];