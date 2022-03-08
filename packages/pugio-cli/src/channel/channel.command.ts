import 'reflect-metadata';
import * as fs from 'fs-extra';
import * as path from 'path';
import { Service } from 'typedi';
import { UtilsService } from '@pugio/utils';
import { LoggerService } from '../services/logger.service';
import { AbstractCommand } from '../command.abstract';
import * as commander from 'commander';
import * as _ from 'lodash';
import { constants } from '@pugio/builtins';
import Table from 'cli-table3';
import { ClientManagerService } from '@pugio/sdk';
import { ConfigService } from '../services/config.service';
import {
    ChannelRequestHandlerConfigItem,
    ChannelTaskItem,
    ClientOptions,
    GetChannelDetailResponse,
} from '@pugio/types';
import * as semver from 'semver';

@Service()
export class ChannelCommand extends AbstractCommand implements AbstractCommand {
    public constructor(
        private readonly loggerService: LoggerService,
        private readonly utilsService: UtilsService,
        private readonly clientManagerService: ClientManagerService,
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

        const clientKey = Buffer.from(`${apiKey}:${clientId}`).toString('base64');

        this.clientManagerService.initialize({
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
                    return;
                }

                const tasks: ChannelTaskItem[] = [];

                if (_.isString(scopeId)) {
                    tasks.push({
                        message: 'Fetch channel information',
                        handler: async () => {
                            try {
                                const { response } = await this.clientManagerService.getChannelDetail({
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

                                if (fs.existsSync(channelLibPathname) && _.isString(version) && version) {
                                    const channelPackageConfig = fs.readJsonSync(
                                        path.resolve(channelLibPathname, 'package.json'),
                                    );

                                    if (version === _.get(channelPackageConfig, 'version')) {
                                        return false;
                                    }
                                }

                                return context;
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
                                await this.utilsService.exec(
                                    [
                                        'npm',
                                        'install',
                                        version ? `${packageName}@${version}` : packageName,
                                        '--registry',
                                        registry || defaultRegistry,
                                        '-S',
                                    ].join(' '),
                                    {
                                        cwd: constants.channelLib,
                                    },
                                );
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

                await this.runTasks(tasks);
            });

        command
            .description('Uninstall a channel request handler')
            .command('uninstall')
            .requiredOption('-n, --name <name>', 'Request handler name')
            .action(async (options) => {
                const { name } = options;

                if (!_.isString(name) && !name) {
                    this.loggerService.singleLog('Error: invalid name arg');
                    return;
                }

                const tasks: ChannelTaskItem[] = [];

                tasks.push({
                    message: 'Read local channel task list',
                    handler: () => {
                        const channelList = this.utilsService.parseChannelList(
                            fs.readFileSync(channelListFilePathname).toString(),
                        );

                        const channelItem = channelList.find((item) => item.name === name);

                        return channelItem || false;
                    },
                });

                tasks.push({
                    message: 'Uninstall channel packages',
                    handler: async (channelItem: ChannelRequestHandlerConfigItem) => {
                        const {
                            name,
                            type,
                            path: pathname,
                        } = channelItem;

                        if (type === 'file') {
                            return channelItem;
                        } else if (type === 'package') {
                            try {
                                await this.utilsService.exec(
                                    [
                                        'npm',
                                        'uninstall',
                                        pathname,
                                        '-S',
                                    ].join(' '),
                                    {
                                        cwd: constants.channelLib,
                                    },
                                );
                                return name;
                            } catch (e) {
                                throw new Error(`Cannot uninstall channel '${name}'`);
                            }
                        } else {
                            return false;
                        }
                    },
                });

                tasks.push({
                    message: 'Delist local channel list record',
                    handler: (name: string) => {
                        const list = this.utilsService.parseChannelList(
                            fs.readFileSync(channelListFilePathname).toString(),
                        );

                        const newList = this.utilsService.uninstallChannelHandler(list, name);

                        fs.writeFileSync(
                            channelListFilePathname,
                            this.utilsService.stringifyChannelList(newList),
                            { encoding: 'utf-8' },
                        );

                        return false;
                    },
                });

                await this.runTasks(tasks);
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

    private async runTasks(tasks: ChannelTaskItem[]) {
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
    }
}
