import { Container } from 'typedi';
import { UtilsService } from '@pugio/utils';
import { Client } from '@pugio/client';

const utilsService = Container.get<UtilsService>(UtilsService);

utilsService.keepalive(async () => {
    const userConfigFilePathname = process.argv[2] || '';
    // TODO pid file
});
