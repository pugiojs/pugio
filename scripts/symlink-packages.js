const path = require('path');
const fs = require('fs-extra');
const {
    packages: packageGlobList = [],
} = require('../lerna.json');
const glob = require('glob');
const _ = require('lodash');
const { program } = require('commander');

const symlink = (action = 'action', packages = []) => {
    const BASE_DIR = path.resolve(__dirname, '..');
    const PROCESS_DIR = path.dirname(process.execPath);

    const packagePaths = packageGlobList.reduce((result, currentPattern) => {
        return result.concat(glob.sync(currentPattern, {
            cwd: BASE_DIR,
        }));
    }, []).map((packagePathname) => path.resolve(BASE_DIR, packagePathname));

    for (const targetPathname of packagePaths) {
        const packageJson = require(path.resolve(targetPathname, 'package.json'));
        const name = packageJson.name;
        const symlinkPathname = path.resolve(path.dirname(PROCESS_DIR), 'lib/node_modules', name);

        if (packages.indexOf(name) !== -1) {
            switch (action) {
                case 'create': {
                    if (fs.existsSync(symlinkPathname)) {
                        console.log('[SYMLINK PACKAGE][CREATE] skip', `${targetPathname} -> ${symlinkPathname}`);
                        continue;
                    }

                    if (!fs.existsSync(path.dirname(symlinkPathname))) {
                        fs.mkdirpSync(path.dirname(symlinkPathname));
                    }

                    console.log('[SYMLINK PACKAGE][CREATE]', `${targetPathname} -> ${symlinkPathname}`);
                    fs.symlinkSync(targetPathname, symlinkPathname);

                    break;
                }
                case 'remove': {
                    if (!fs.existsSync(symlinkPathname)) {
                        console.log('[SYMLINK PACKAGE][REMOVE] skip', symlinkPathname);
                        continue;
                    }

                    console.log('[SYMLINK PACKAGE][REMOVE]', symlinkPathname);
                    fs.removeSync(symlinkPathname);

                    break;
                }
                default: {
                    break;
                }
            }
        }
    }
};

program
    .option('-a, --action <action>', 'link action')
    .option('-p, --packages <packages...>', 'packages to be linked')
    .action(async ({ action, packages }) => {
        symlink(action, packages);
    });

program.parse(process.argv);
