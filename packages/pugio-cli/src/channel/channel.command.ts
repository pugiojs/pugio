import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { Service } from 'typedi';
import { UtilsService } from '@pugio/utils';
import { LoggerService } from '../services/logger.service';
import { AbstractCommand } from '../command.abstract';
import * as commander from 'commander';
import * as _ from 'lodash';
import { constants } from '@pugio/builtins';
import Table from 'cli-table3';

@Service()
export class ChannelCommand extends AbstractCommand implements AbstractCommand {
    public constructor(
        private readonly loggerService: LoggerService,
        private readonly utilsService: UtilsService,
    ) {
        super();
        this.setCommandName('channel');
    }

    protected createCommand(command: commander.Command): commander.Command {
        const {
            dataDir,
            channelListFile,
        } = constants;

        const channelListFilePathname = path.resolve(dataDir, channelListFile);
        const defaultChannelListFilePathname = path.resolve(__dirname, '../../static/channels.list');

        if (!fs.existsSync(channelListFilePathname)) {
            fs.copyFileSync(defaultChannelListFilePathname, channelListFilePathname);
        }

        command
            .description('Add a channel request handler')
            .command('add')
            .requiredOption('-n, --name <name>', 'Request handler name')
            .requiredOption('-f, --filename <filename>', 'Request handler filename')
            .action(async (options) => {
                const {
                    name,
                    filename,
                } = options;

                if (!_.isString(name) || !_.isString(filename)) {
                    this.loggerService.singleLog('Error: invalid options');
                    return;
                }

                const channelList = this.utilsService.parseChannelList(
                    fs.readFileSync(channelListFilePathname).toString(),
                );

                const newList = this.utilsService.addChannelHandler(channelList, name, filename);
                fs.writeFileSync(
                    channelListFilePathname,
                    this.utilsService.stringifyChannelList(newList),
                    { encoding: 'utf-8' },
                );

                this.loggerService.singleLog(`Channel ${name} added`);
            });

        command
            .description('Remove a channel request handler')
            .command('remove')
            .requiredOption('-n, --name <name>', 'Request handler name')
            .action(async () => {
                const { name } = command.opts();

                const channelList = this.utilsService.parseChannelList(
                    fs.readFileSync(channelListFilePathname).toString(),
                );

                const newList = this.utilsService.removeChannelHandler(channelList, name);
                fs.writeFileSync(
                    channelListFilePathname,
                    this.utilsService.stringifyChannelList(newList),
                    { encoding: 'utf-8' },
                );

                this.loggerService.singleLog(`Channel ${name} removed`);
            });

        command
            .description('List all channel request handlers')
            .command('list')
            .action(async () => {
                const table = new Table({
                    head: ['index', 'name', 'filename'],
                    colWidths: [10, 20, 70],
                });

                const channelList = this.utilsService.parseChannelList(
                    fs.readFileSync(channelListFilePathname).toString(),
                );

                channelList.forEach((channelListItem, index) => {
                    const {
                        name,
                        filename,
                    } = channelListItem;

                    table.push([index, name, filename]);
                });

                this.loggerService.singleLog(table.toString());
            });

        return command;
    }
}
