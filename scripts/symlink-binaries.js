const path = require('path');
const fs = require('fs-extra');
const {
    packages = [],
} = require('../lerna.json');
const glob = require('glob');
const _ = require('lodash');
const { program } = require('commander');

const symlink = (action = 'create') => {
    const BASE_DIR = path.resolve(__dirname, '..');
    const PROCESS_DIR = path.dirname(process.execPath);

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
            const symlinkPathname = path.resolve(PROCESS_DIR, binName);

            if (action === 'create') {
                if (fs.existsSync(symlinkPathname)) {
                    console.log('[SYMLINK][CREATE] skip', `${targetPathname} -> ${symlinkPathname}`);
                    continue;
                }

                fs.chmodSync(symlinkPathname, 777);
                console.log('[SYMLINK][CREATE]', `${targetPathname} -> ${symlinkPathname}`);
                fs.symlinkSync(targetPathname, symlinkPathname);
            } else if (action === 'remove') {
                if (!fs.existsSync(symlinkPathname)) {
                    console.log('[SYMLINK][REMOVE] skip', `${targetPathname} -> ${symlinkPathname}`);
                    continue;
                }

                console.log('[SYMLINK][REMOVE]', symlinkPathname);
                fs.removeSync(symlinkPathname);
            }
        }
    }
};

program
    .option('-a, --action <action>', 'link binary action')
    .action(async ({ action }) => {
        symlink(action);
    });

program.parse(process.argv);
