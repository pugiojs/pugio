import { Container } from 'typedi';
import { UtilsService } from '@pugio/utils';
import * as fs from 'fs';

export const startClient = () => {
    const utilsService = Container.get<UtilsService>(UtilsService);
    // utilsService.daemonize();
};

export const stopClient = () => {};
