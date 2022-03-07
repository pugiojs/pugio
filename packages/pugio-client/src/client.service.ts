import 'reflect-metadata';
import {
    ChannelClientConfig,
    ChannelRequestHandlerConfigItem,
    ClientMessageHandler,
    ClientOptions,
    MakeChallengeResponse,
    RedisClient,
    RedisClientOptions,
} from '@pugio/types';
import { UtilsService } from '@pugio/utils';
import * as _ from 'lodash';
import { Service } from 'typedi';
import { ConnectionService } from '@pugio/connection';
import { SDKService } from '@pugio/sdk';
import { machineIdSync } from 'node-machine-id';
import * as yup from 'yup';
import * as fs from 'fs-extra';
import * as path from 'path';
import { ChannelService } from './channel.service';
import { constants } from '@pugio/builtins';

import { FileChannelRequest } from '@pugio/channel-file-transfer';
import { TerminalChannelRequest } from '@pugio/channel-web-terminal';
import { PipelinesChannelRequest } from '@pugio/channel-pipelines';

@Service()
export class ClientService {
    protected redisClient: RedisClient;
    protected apiKey: string;
    protected clientId: string;
    protected clientKey: string;
    protected publicKey: string;
    protected privateKey: string;
    protected redisOptions: RedisClientOptions;
    protected options: ClientOptions = {};
    protected machineId: string;
    protected channelList: ChannelRequestHandlerConfigItem[];
    private messageHandler: ClientMessageHandler = _.noop;

    public constructor(
        private readonly connectionService: ConnectionService,
        private readonly utilsService: UtilsService,
        private readonly sdkService: SDKService,
        private readonly channelService: ChannelService,
    ) {}

    public async initialize(options: ClientOptions) {
        this.machineId = machineIdSync();
        this.options = options;

        const {
            clientId,
            apiKey,
            publicKey,
            privateKey,
            hostname = 'pugio.lenconda.top',
            apiVersion = 1,
            redisOptions = {},
            channelList = [],
            onMessage: messageHandler,
        } = this.options;

        const partialOptionsSchema = yup.object().shape({
            clientId: yup.string().required(),
            apiKey: yup.string().required(),
            publicKey: yup.string().required(),
            privateKey: yup.string().required(),
        });

        if (
            !(await partialOptionsSchema.isValid({
                clientId,
                apiKey,
                publicKey,
                privateKey,
            }))
        ) {
            this.messageHandler({
                level: 'error',
                data: 'Invalid client options',
            });
        }

        this.apiKey = apiKey;
        this.clientId = clientId;
        this.publicKey = publicKey;
        this.privateKey = privateKey;
        this.redisOptions = redisOptions;
        this.channelList = channelList;

        if (_.isFunction(messageHandler)) {
            this.messageHandler = messageHandler;
        }

        this.clientKey = this.utilsService.generateClientKey(this.apiKey, this.clientId);

        this.sdkService.initialize({
            clientKey: this.clientKey,
            hostname,
            apiVersion,
            onMessage: this.messageHandler,
            onError: (error) => {
                this.messageHandler({
                    level: 'error',
                    data: error.message,
                });
            },
        });
    }

    public async run() {
        let version;
        let intervalId: ReturnType<typeof setInterval>;

        try {
            const packageJson = fs.readJsonSync(path.resolve(__dirname, '../package.json'));
            version = packageJson.version || '';
            this.messageHandler({
                level: 'info',
                data: `Client version: ${version}`,
            });
        } catch (e) {}

        const {
            response = {} as MakeChallengeResponse,
        } = await this.sdkService.makeChallenge({
            version,
            deviceId: this.machineId,
        });

        const {
            credential,
        } = response;

        this.connectionService.initialize({
            ...this.redisOptions,
            username: this.clientId,
            password: credential,
            onClientReady: async (client) => {
                this.channelService.initialize({
                    clientConfig: _.omit(
                        this.options,
                        [
                            'publicKey',
                            'privateKey',
                            'onMessage',
                            'channelList',
                            'apiKey',
                        ],
                    ) as ChannelClientConfig,
                    channelRequestHandlers: [
                        FileChannelRequest,
                        TerminalChannelRequest,
                        PipelinesChannelRequest,
                        ...(
                            this.channelList.map((channelItem) => {
                                let name;

                                try {
                                    const {
                                        name: channelName,
                                        path: channelPathname,
                                        type,
                                    } = channelItem;

                                    let channelHandlerClass;

                                    name = channelName;
                                    let pathname: string;

                                    if (type === 'file') {
                                        pathname = channelPathname;
                                    } else if (type === 'package') {
                                        pathname = path.resolve(constants.channelLib, 'node_modules', channelPathname);
                                    } else {
                                        throw new Error();
                                    }

                                    channelHandlerClass = require(pathname).default || require(pathname);

                                    return channelHandlerClass;
                                } catch (e) {
                                    this.messageHandler({
                                        level: 'warn',
                                        data: `Skip load channel with local name '${name}'`,
                                    });
                                    return null;
                                }
                            }).filter((item) => !_.isNull(item))
                        ),
                    ],
                    messageHandler: this.messageHandler,
                });

                if (client.isOpen) {
                    this.redisClient = client;
                    await this.sdkService.connected({ credential });
                    intervalId = await this.handleClientReady();
                }
            },
            onClientDown: () => {
                clearInterval(intervalId);
                this.messageHandler({
                    level: 'info',
                    data: 'Client connection down',
                });
            },
            onError: async (error) => {
                this.messageHandler({
                    level: 'error',
                    data: error.message || error.toString(),
                });
            },
        });

        this.connectionService.connect();
    }

    private async handleClientReady() {
        const channels = [
            'channel_request',
        ];

        const intervalId = setInterval(() => {
            const plaintext = Math.random().toString(32).slice(2);
            this.sdkService.reportClientStatus({
                plaintext,
                cipher: this.utilsService.encryptContentWithRSAPublicKey(plaintext, this.publicKey),
            });
        }, 60000);

        this.messageHandler({
            level: 'info',
            data: 'Channel connected',
        });

        this.channelService.setRedisClient(this.redisClient);

        channels.forEach((channelId) => {
            this.channelService.subscribeChannel(channelId);
        });

        return intervalId;
    }
}
