import 'reflect-metadata';
import {
    ClientMessageHandler,
    ClientOptions,
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
            hostname,
            apiVersion,
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
        });
    }

    public async run() {
        const data = await this.sdkService.makeChallenge(this.machineId);
        console.log(data);
        // connect(
        //     {
        //         ...this.redisOptions,
        //         onClientReady: async (client) => {
        //             if (client.isOpen) {
        //                 this.redisClient = client;
        //                 this.lock = new Lock({
        //                     ...this.lockerOptions,
        //                     lockName: this.clientTasksLockName,
        //                     redisClient: client,
        //                 });
        //                 this.handleClientReady();
        //             }
        //         },
        //         onError: async (error) => {
        //             this.messageHandler({
        //                 level: 'error',
        //                 data: error.message || error.toString(),
        //             });
        //         },
        //     },
        // );
    }

    // private async consumeTask() {
    //     const data = await this.redisClient.LPOP(this.clientTaskQueueName);
    //     // TODO parse data
    //     return data;
    // }

    // private async handleClientReady() {
    //     this.redisClient.subscribe(clientTaskChannelName, (timestamp) => {
    //         this.messageHandler({
    //             level: 'info',
    //             data: `Receive Task: ${timestamp}`,
    //         });
    //         this
    //             .consumeTask()
    //             .then((task) => {
    //                 // TODO
    //                 this.messageHandler({
    //                     level: 'info',
    //                     data: `Consume: ${task}`,
    //                 });
    //             })
    //             .catch((error) => {
    //                 console.log(error);
    //                 // TODO error handle, push a status code to server
    //                 this.messageHandler({
    //                     level: 'error',
    //                     data: error.message || error.toString(),
    //                 });
    //             })
    //             .finally(() => {
    //                 this.lock
    //                     .unlock()
    //                     .catch((error) => {
    //                         this.messageHandler({
    //                             level: 'error',
    //                             data: error.message || error.toString(),
    //                         });
    //                     });
    //             });
    //     });
    // }
}
