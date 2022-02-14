import { Config } from './config';
import {
    dataDir,
} from './defaults';
import * as fs from 'fs-extra';

export const ensureDataDir = (dirname: string) => {
    if (!fs.existsSync(dirname)) {
        fs.mkdirpSync(dirname);
    }

    if (fs.statSync(dirname).isFile()) {
        fs.removeSync(dirname);
        fs.mkdirpSync(dirname);
    }
};

export const initialize = () => {
    ensureDataDir(dataDir);
    const config = new Config();

    return config;
};
