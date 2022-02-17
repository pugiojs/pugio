import 'reflect-metadata';
import { Service } from 'typedi';
import { AbstractCommand } from '../command.abstract';
import * as commander from 'commander';
import * as _ from 'lodash';
import { machineIdSync } from 'node-machine-id';
import { LoggerService } from '../services/logger.service';

@Service()
export class DeviceCommand extends AbstractCommand implements AbstractCommand {
    public constructor(
        private readonly loggerService: LoggerService,
    ) {
        super();
        this.setCommandName('device');
    }

    protected createCommand(command: commander.Command): commander.Command {
        command
            .command('id')
            .action(() => {
                this.loggerService.singleLog(machineIdSync());
            });

        return command;
    }
}
