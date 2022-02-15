import { ConfigService } from './services/config.service';
import Container from 'typedi';
import { UtilsService } from '@pugio/utils';
import { dataDir } from './defaults';

export const initialize = () => {
    const utilsService = Container.get<UtilsService>(UtilsService);
    utilsService.ensureDataDir(dataDir);
    const configService = Container.get<ConfigService>(ConfigService);
    return configService;
};
