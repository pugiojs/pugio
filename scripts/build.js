const getPaths = require('./utils/paths');
const path = require('path');
const { program } = require('commander');
const {
    spawn,
    spawnSync,
} = require('child_process');
const fs = require('fs-extra');

const build = (watch = false, selectedPackages = []) => {
    const paths = getPaths();
    const packages = paths.map((currentPath) => {
        const {
            name,
            dependencies = {},
            devDependencies = {},
        } = require(path.resolve(currentPath, 'package.json'));

        return {
            pathname: currentPath,
            name,
            dependencies: Object.keys(dependencies).concat(Object.keys(devDependencies)),
        };
    });

    const projectPackages = packages
        .map((package) => {
            const {
                name,
                pathname,
                dependencies,
            } = package;

            return {
                name,
                pathname,
                dependencies: dependencies.filter((dependencyName) => {
                    return packages.findIndex((package) => dependencyName === package.name) !== -1;
                }),
            };
        });

    const sortedProjectPackages = [];

    while (projectPackages.length !== 0) {
        for (const [index, projectPackage] of projectPackages.entries()) {
            if (
                projectPackage.dependencies.length === 0 ||
                projectPackage.dependencies.every((dependencyName) => {
                    return sortedProjectPackages.map((package) => package.name).indexOf(dependencyName) !== -1;
                })
            ) {
                sortedProjectPackages.push(projectPackage);
                projectPackages.splice(index, 1);
            }
        }
    }

    for (const projectPackage of sortedProjectPackages) {
        const {
            name,
            pathname,
        } = projectPackage;

        if (selectedPackages.length > 0 && selectedPackages.indexOf(name) === -1) {
            continue;
        }

        console.log(`[BUILD]${watch ? '[WATCH]' : ''}`, name);

        if (!watch) {
            fs.removeSync(path.resolve(pathname, './lib'));
        }

        const execute = watch ? spawn : spawnSync;
        const command = watch ? 'tsc' : 'npm';
        const args = watch ? ['--watch'] : ['run', 'build'];

        execute(command, args, {
            cwd: pathname,
            stdio: 'inherit',
        });
    }
};

program
    .option('-w, --watch', 'watch file changes')
    .option('-p, --packages <packages...>', 'select packages to build')
    .action(({ watch = false, packages = [] }) => {
        build(watch, packages);
    });

program.parse(process.argv);
