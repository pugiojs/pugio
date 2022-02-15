import { Container } from 'typedi';
import * as _ from 'lodash';
import { UtilsService } from '@pugio/utils';
import { Client } from '@pugio/client';
import { ConfigService } from '../services/config.service';
import { maps } from '../defaults';
import { LoggerService } from '../services/logger.service';

const utilsService = Container.get<UtilsService>(UtilsService);
const configService = Container.get<ConfigService>(ConfigService);
const loggerService = Container.get<LoggerService>(LoggerService);

utilsService.keepalive(async () => {
    const userConfigFilePathname = process.argv[2] || '';

    if (_.isString(userConfigFilePathname)) {
        configService.mergeUserConfig(userConfigFilePathname);
    }

    const client = new Client({
        ...configService.getMappedConfig(maps.cliToClient),
        onMessage: (message) => {
            const {
                level,
                data = '',
            } = message;

            loggerService.log(data, level);

            if (level === 'error') {
                process.exit(2);
            }
        },
        publicKey: utilsService.permanentlyReadFileSync(configService.getConfig('client.publicKey')),
        privateKey: utilsService.permanentlyReadFileSync(configService.getConfig('client.privateKey')),
    });

    client.getInstance().run();
});
