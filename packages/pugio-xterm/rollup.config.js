const path = require('path');
const resolve = require('@rollup/plugin-node-resolve').default;
const { babel } = require('@rollup/plugin-babel');
const terser = require('rollup-plugin-terser');
const commonjs = require('@rollup/plugin-commonjs');
const packageJson = require('./package.json');
const globals = require('rollup-plugin-node-globals');

function resolveFile(filePath) {
    return path.join(__dirname, filePath);
};

const extensions = ['.js', '.jsx', '.ts', '.tsx'];

function generateBanner() {
    return `/* @pugio/xterm@${packageJson.version} */`;
}

module.exports = [
    {
        input: resolveFile('src/index.ts'),
        output: [
            {
                file: resolveFile('umd/index.js'),
                format: 'umd',
                name: 'PugioXTerm',
                banner: generateBanner(),
                exports: 'default',
            },
        ],
        plugins: [
            resolve({ browser: true, extensions }),
            commonjs(),
            globals(),
            babel({
                extensions,
                include: ['src/**/*'],
                babelHelpers: 'runtime',
            }),
            terser.terser(),
        ],
    },
];
