import { ConfigService } from './services/config.service';
import Container from 'typedi';
import { UtilsService } from '@pugio/utils';
import { constants } from '@pugio/builtins';

const { dataDir, channelLib } = constants;

export const initialize = () => {
    const utilsService = Container.get<UtilsService>(UtilsService);
    utilsService.ensureDataDir(dataDir);
    const configService = Container.get<ConfigService>(ConfigService);
    configService.ensureConfigFile();
    utilsService.ensureChannelsDir(channelLib);
    return configService;
};
