import * as fs from 'fs';
import * as path from 'path';
import { Container } from 'typedi';
import { UtilsService } from '@pugio/utils';
import { ProcessService } from '../services/process.service';
import {
    pidFile,
    dataDir,
} from '../defaults';
import { LoggerService } from '../services/logger.service';

const processService = Container.get<ProcessService>(ProcessService);
const loggerService = Container.get<LoggerService>(LoggerService);
processService.setPIDFilePathname(path.join(dataDir, pidFile));

export const startClient = async () => {
    const modulePathname = path.resolve(__dirname, './daemon.js');

    if (
        !fs.existsSync(modulePathname) ||
        !fs.statSync(modulePathname).isFile()
    ) {
        loggerService.error('Cannot find execution module:' + modulePathname);
        process.exit(1);
    }

    const utilsService = Container.get<UtilsService>(UtilsService);
    const childProcess = await utilsService.daemonize('./');
    processService.writePIDFile(childProcess.pid);
};

export const stopClient = async () => {
    const result = processService.killProcess();
    if (result) {
        loggerService.info('Client daemon stopped');
    } else {
        loggerService.error('Client daemon cannot stop');
    }
};
