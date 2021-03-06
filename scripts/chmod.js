const path = require('path');
const fs = require('fs-extra');
const {
    packages = [],
} = require('../lerna.json');
const glob = require('glob');
const _ = require('lodash');

const symlink = () => {
    const BASE_DIR = path.resolve(__dirname, '..');

    const packagePaths = packages.reduce((result, currentPattern) => {
        return result.concat(glob.sync(currentPattern, {
            cwd: BASE_DIR,
        }));
    }, []).map((packagePathname) => path.resolve(BASE_DIR, packagePathname));

    for (const packagePath of packagePaths) {
        const packageJson = require(path.resolve(packagePath, 'package.json'));
        const bin = _.get(packageJson, 'bin') || {};

        for (const binName of Object.keys(bin)) {
            const targetPathname = path.resolve(packagePath, bin[binName]);
            console.log('[CHMOD]', targetPathname);
            if (fs.existsSync(targetPathname)) {
                fs.chmodSync(targetPathname, 777);
            }
        }
    }
};

symlink();
