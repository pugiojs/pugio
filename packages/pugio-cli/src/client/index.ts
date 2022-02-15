import * as fs from 'fs';
import * as path from 'path';
import { Container } from 'typedi';
import { UtilsService } from '@pugio/utils';
import { ProcessService } from '../services/process.service';
import {
    pidFile,
    dataDir,
} from '../defaults';

const processService = Container.get<ProcessService>(ProcessService);
processService.setPIDFilePathname(path.join(dataDir, pidFile));

export const startClient = async () => {
    const modulePathname = path.resolve(__dirname, './daemon.js');

    if (
        !fs.existsSync(modulePathname) ||
        !fs.statSync(modulePathname).isFile()
    ) {
        // TODO
        process.exit(1);
    }

    const utilsService = Container.get<UtilsService>(UtilsService);
    const childProcess = await utilsService.daemonize('./');
    processService.writePIDFile(childProcess.pid);
};

export const stopClient = async () => {
    const result = processService.killProcess();
    // TODO log
};
