import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { Service } from 'typedi';
import { UtilsService } from '@pugio/utils';
import { ProcessService } from '../services/process.service';
import {
    pidFile,
    dataDir,
} from '../defaults';
import { LoggerService } from '../services/logger.service';
import { AbstractCommand } from '../command.abstract';
import * as commander from 'commander';
import * as _ from 'lodash';

@Service()
export class ClientCommand extends AbstractCommand implements AbstractCommand {
    public constructor(
        private readonly processService: ProcessService,
        private readonly loggerService: LoggerService,
        private readonly utilsService: UtilsService,
    ) {
        super();
        this.setCommandName('client');
        this.processService.setPIDFilePathname(path.join(dataDir, pidFile));
    }

    protected createCommand(command: commander.Command): commander.Command {
        command
            .description('Manage Pugio client')
            .arguments('[action]')
            .option('-c, --config <file>', 'Specify a config file pathname to load custom config')
            .action(async (action: string) => {
                const { config: configFile } = command.opts();
                let configFilePathname: string;

                if (_.isString(configFile)) {
                    configFilePathname = path.resolve(process.cwd(), configFile);
                }

                switch (action) {
                    case 'start': {
                        this.startClient(configFilePathname);
                        break;
                    }
                    case 'stop': {
                        this.stopClient();
                        break;
                    }
                    default: {
                        break;
                    }
                }
            });

        return command;
    }

    private async startClient(configFilePathname?: string) {
        const modulePathname = path.resolve(__dirname, './daemon.js');

        if (
            !fs.existsSync(modulePathname) ||
            !fs.statSync(modulePathname).isFile()
        ) {
            this.loggerService.singleLog('Error: Cannot find execution module:' + modulePathname);
            process.exit(1);
        }

        if (await this.processService.checkProcessAlive()) {
            this.loggerService.singleLog(
                'Error: Client still alive with PID ' +
                this.processService.getProcessPID().toString(),
            );
            process.exit(1);
        }

        const childProcess = await this.utilsService.daemonize(
            modulePathname,
            (
                _.isString(configFilePathname)
                    ? [configFilePathname]
                    : []
            ),
            {
                stdio: [
                    0,
                    fs.openSync(path.resolve(dataDir, 'pugio.log'), 'a'),
                    fs.openSync(path.resolve(dataDir, 'pugio-errors.log'), 'a'),
                    'ipc',
                ],
            },
        );

        this.processService.writePIDFile(childProcess.pid);

        this.loggerService.singleLog('Client started with PID ' + childProcess.pid);

        process.exit(0);
    }

    private async stopClient() {
        const result = this.processService.killProcess();
        if (result) {
            this.loggerService.singleLog('Client stopped');
        } else {
            this.loggerService.singleLog('Client cannot stop');
        }
    }
}
