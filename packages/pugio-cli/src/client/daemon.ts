import { Container } from 'typedi';
import * as _ from 'lodash';
import * as path from 'path';
import * as fs from 'fs';
import { UtilsService } from '@pugio/utils';
import { Client } from '@pugio/client';
import { ConfigService } from '../services/config.service';
import { LoggerService } from '../services/logger.service';
import { constants } from '@pugio/builtins';

const {
    maps,
    dataDir,
    channelListFile,
} = constants;

const utilsService = Container.get<UtilsService>(UtilsService);
const configService = Container.get<ConfigService>(ConfigService);
const loggerService = Container.get<LoggerService>(LoggerService);

utilsService.keepalive(
    async () => {
        const channelListFilePathname = path.resolve(dataDir, channelListFile);
        const userConfigFilePathname = process.argv[2] || '';

        if (_.isString(userConfigFilePathname)) {
            configService.mergeUserConfig(userConfigFilePathname);
        }

        const publicKey = utilsService.permanentlyReadFileSync(configService.getConfig('client.publicKey'));
        const privateKey = utilsService.permanentlyReadFileSync(configService.getConfig('client.privateKey'));

        const client = new Client({
            ...configService.getMappedConfig(maps.cliToClient),
            channelList: utilsService.parseChannelList(
                fs.readFileSync(channelListFilePathname).toString(),
            ),
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
            publicKey,
            privateKey,
        });

        (await client.getInstance()).run();
        loggerService.info('Client started');
    },
);

process.on('exit', () => loggerService.info('Client exited'));
