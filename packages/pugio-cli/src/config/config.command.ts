import 'reflect-metadata';
import * as fs from 'fs-extra';
import * as path from 'path';
import { Service } from 'typedi';
import { UtilsService } from '@pugio/utils';
import { LoggerService } from '../services/logger.service';
import { AbstractCommand } from '../command.abstract';
import * as commander from 'commander';
import * as _ from 'lodash';
import { ConfigService } from '../services/config.service';
import { constants } from '@pugio/builtins';

const {
    dataDir,
    configFile,
} = constants;

@Service()
export class ConfigCommand extends AbstractCommand implements AbstractCommand {
    public constructor(
        private readonly loggerService: LoggerService,
        private readonly utilsService: UtilsService,
        private readonly configService: ConfigService,
    ) {
        super();
        this.setCommandName('config');
    }

    protected createCommand(command: commander.Command): commander.Command {
        command
            .description('Overwrite default configuration for Pugio')
            .command('set')
            .argument('<pathname>', 'Pathname of config item')
            .argument('<value>', 'Value of current config item')
            .action(async (pathname: string, value: string) => {
                this.configService.setConfig(pathname, value);
            });

        command
            .description('Get configuration value from Pugio')
            .command('get')
            .argument('<pathname>', 'Pathname of config item')
            .action(async (pathname: string) => {
                const value = this.configService.getConfig(pathname);
                this.loggerService.singleLog(JSON.stringify(value, null, 4));
            });

        command
            .description('Reset to default configuration')
            .command('reset')
            .action(async () => {
                const configFilePathname = path.resolve(dataDir, configFile);
                this.utilsService.ensureDataDir(dataDir);

                try {
                    fs.removeSync(configFilePathname);
                    this.configService.ensureConfigFile();
                } catch (e) {
                    this.loggerService.singleLog('Error: cannot overwrite default config');
                }
            });

        return command;
    }
}
