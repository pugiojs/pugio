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
import { SDKService } from '@pugio/sdk';
import { ConfigService } from '../services/config.service';
import {
    ChannelInstallTaskItem,
    ClientOptions,
    GetChannelDetailResponse,
} from '@pugio/types';
import { spawn } from 'child_process';
import * as semver from 'semver';

@Service()
export class ChannelCommand extends AbstractCommand implements AbstractCommand {
    public constructor(
        private readonly loggerService: LoggerService,
        private readonly utilsService: UtilsService,
        private readonly sdkService: SDKService,
        private readonly configService: ConfigService,
    ) {
        super();
        this.setCommandName('channel');
    }

    protected createCommand(command: commander.Command): commander.Command {
        const {
            maps,
            dataDir,
            channelListFile,
        } = constants;

        const {
            apiKey,
            clientId,
            hostname,
            apiVersion,
        } = this.configService.getMappedConfig(maps.cliToClient) as ClientOptions;

        const clientKey = `${apiKey}:${clientId}`;

        this.sdkService.initialize({
            clientKey,
            hostname,
            apiVersion,
        });

        const channelListFilePathname = path.resolve(dataDir, channelListFile);
        const defaultChannelListFilePathname = path.resolve(__dirname, '../../static/channels.list');

        if (!fs.existsSync(channelListFilePathname)) {
            fs.copyFileSync(defaultChannelListFilePathname, channelListFilePathname);
        }

        command
            .description('Install a channel request handler')
            .command('install')
            .requiredOption('-n, --name <name>', 'Request handler name')
            .option('-s, --scope <scope>', 'Request handler scope id')
            .option('-f, --filepath <filepath>', 'Request handler file path')
            .option('-r, --registry <registry>', 'Registry URL for download channel package')
            .option('-v, --version <version>', 'Channel package version')
            .action(async (options) => {
                const {
                    name,
                    scope: scopeId,
                    filepath,
                    registry,
                    version,
                } = options;

                if (!_.isString(name) || !_.isString(scopeId)) {
                    this.loggerService.singleLog('Error: invalid options');
                    return;
                }

                if (_.isString(version) && !semver.valid(version)) {
                    this.loggerService.singleLog('Error: invalid version arg');
                }

                const tasks: ChannelInstallTaskItem[] = [];

                if (_.isString(scopeId)) {
                    tasks.push({
                        message: 'Fetch channel information',
                        handler: async () => {
                            try {
                                const { response } = await this.sdkService.getChannelDetail({
                                    channelId: scopeId,
                                });

                                if (!response) {
                                    throw new Error('Invalid channel information');
                                }

                                const { packageName } = response;

                                if (!_.isString(packageName) || !packageName) {
                                    throw new Error('Channel package');
                                }

                                return response;
                            } catch (e) {
                                throw new Error('Cannot fetch channel information');
                            }
                        },
                    });
                    tasks.push({
                        message: 'Check local installation',
                        handler: (context: GetChannelDetailResponse) => {
                            try {
                                const { packageName } = context;

                                const channelLibPathname = path.resolve(
                                    constants.channelLib,
                                    'node_modules',
                                    packageName,
                                );

                                if (
                                    fs.existsSync(channelLibPathname) &&
                                    fs.statSync(channelLibPathname).isDirectory()
                                ) {
                                    return true;
                                } else {
                                    return false;
                                }
                            } catch (e) {
                                return false;
                            }
                        },
                    });
                    tasks.push({
                        message: 'Install channel package',
                        handler: async (context: GetChannelDetailResponse) => {
                            const {
                                packageName,
                                registry: defaultRegistry = 'https://registry.npmjs.org',
                            } = context;

                            try {
                                await new Promise((resolve, reject) => {
                                    const childProcess = spawn(
                                        'npm',
                                        [
                                            'install',
                                            version ? `${packageName}@${version}` : packageName,
                                            '--registry',
                                            registry || defaultRegistry,
                                        ],
                                        {
                                            cwd: constants.channelLib,
                                        },
                                    );

                                    childProcess.on('close', () => resolve(undefined));
                                    childProcess.on('error', () => {
                                        reject(new Error());
                                    });
                                });

                                return packageName;
                            } catch (e) {
                                throw new Error(`Cannot install channel package '${packageName}' from '${defaultRegistry}'`);
                            }
                        },
                    });
                } else if (_.isString(filepath)) {
                    tasks.push({
                        message: 'Check file existence',
                        handler: () => {
                            const exists = fs.existsSync(filepath);

                            if (!exists) {
                                throw new Error('Channel file does not exist');
                            }

                            if (!fs.statSync(filepath).isFile()) {
                                throw new Error('The pathname is not a file');
                            }

                            return true;
                        },
                    });
                }

                tasks.push({
                    message: 'Write local channel list record',
                    handler: (context: string) => {
                        const channelList = this.utilsService.parseChannelList(
                            fs.readFileSync(channelListFilePathname).toString(),
                        );

                        const newList = this.utilsService.installChannelHandler({
                            list: channelList,
                            name,
                            scopeId,
                            packageName: context,
                            filepath,
                        });

                        fs.writeFileSync(
                            channelListFilePathname,
                            this.utilsService.stringifyChannelList(newList),
                            { encoding: 'utf-8' },
                        );

                        return false;
                    },
                });

                let context: any;

                for (const task of tasks) {
                    const { message, handler } = task;

                    const logger = this.utilsService.writeLoadingLog({
                        text: message,
                    });

                    const handleTask = handler.bind(this);

                    try {
                        context = await handleTask(context);
                        logger.success();

                        if (_.isBoolean(context) && !context) {
                            process.exit(0);
                        }
                    } catch (e) {
                        logger.error(e.message || e.toString());
                        process.exit(1);
                    }
                }
            });

        command
            .description('Uninstall a channel request handler')
            .command('uninstall')
            .requiredOption('-n, --name <name>', 'Request handler name')
            .action(async (options) => {
                const { name } = options;

                const channelList = this.utilsService.parseChannelList(
                    fs.readFileSync(channelListFilePathname).toString(),
                );

                const newList = this.utilsService.uninstallChannelHandler(channelList, name);
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
                    head: ['index', 'name', 'type', 'path'],
                    colWidths: [10, 20, 10, 60],
                });

                const channelList = this.utilsService.parseChannelList(
                    fs.readFileSync(channelListFilePathname).toString(),
                );

                channelList.forEach((channelListItem, index) => {
                    const {
                        name,
                        type,
                        path: pathname,
                    } = channelListItem;

                    table.push([index, name, type, pathname]);
                });

                this.loggerService.singleLog(table.toString());
            });

        return command;
    }
}
