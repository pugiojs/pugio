const path = require('path');
const glob = require('glob');

module.exports = () => {
    const {
        packages = [],
    } = require(path.resolve(process.cwd(), 'lerna.json'));

    const paths = packages.reduce((result, pattern) => {
        const paths = glob.sync(pattern, {
            cwd: process.cwd(),
        });
        return result.concat(paths);
    }, []);

    return paths;
};
