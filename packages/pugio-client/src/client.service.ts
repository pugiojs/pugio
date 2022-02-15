import 'reflect-metadata';
import {
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
    private messageHandler: ClientMessageHandler = _.noop;

    public constructor(
        private readonly connectionService: ConnectionService,
        private readonly utilsService: UtilsService,
        private readonly sdkService: SDKService,
    ) {
    }

    public initialize(options: ClientOptions) {
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
            onMessage: messageHandler,
        } = this.options;

        this.apiKey = apiKey;
        this.clientId = clientId;
        this.publicKey = publicKey;
        this.privateKey = privateKey;
        this.redisOptions = redisOptions;

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
        const {
            response = {} as MakeChallengeResponse,
        } = await this.sdkService.makeChallenge({
            deviceId: this.machineId,
        });

        const {
            credential,
            taskChannelName,
        } = response;

        this.connectionService.initialize({
            ...this.redisOptions,
            username: this.clientId,
            password: credential,
            onClientReady: async (client) => {
                if (client.isOpen) {
                    this.redisClient = client;
                    await this.sdkService.connected({ credential });
                    this.handleClientReady(taskChannelName);
                }
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

    // private async consumeTask(lockPass: string) {
    //     const data = await this.redisClient.LPOP(this.clientTaskQueueName);
    //     // TODO parse data
    //     return data;
    // }

    private async handleClientReady(channelName: string) {
        this.redisClient.subscribe(channelName, (lockPass) => {
            this.messageHandler({
                level: 'info',
                data: 'Received task',
            });
            // TODO consume task with `lockPass`
        });
    }
}
