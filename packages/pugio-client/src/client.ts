import 'reflect-metadata';
import {
    ClientMessageHandler,
    ClientOptions,
    RedisClient,
    RedisClientOptions,
} from '@pugio/types';
import {
    sleep,
} from '@pugio/utils';
import * as _ from 'lodash';
import {
    Service,
    Inject,
} from 'typedi';
import { ConnectionService } from '@pugio/connection';

@Service()
export class ClientService {
    protected redisClient: RedisClient;
    @Inject('API_KEY')
    private apiKey: string;
    @Inject('CLIENT_ID')
    private clientId: string;
    @Inject('REDIS_OPTIONS')
    private redisOptions: RedisClientOptions;
    @Inject('MESSAGE_HANDLER')
    private messageHandler: ClientMessageHandler;

    public constructor(
        private readonly connectionService: ConnectionService,
    ) {}

    public run() {
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

    private async consumeTask() {
        const data = await this.redisClient.LPOP(this.clientTaskQueueName);
        // TODO parse data
        return data;
    }

    private async handleClientReady() {
        const {
            clientTaskChannelName,
            clientTaskQueueName,
        } = this;

        const clearQueueLockResult = await this.lock.lock();

        if (clearQueueLockResult.error) {
            this.messageHandler({
                level: 'error',
                data: clearQueueLockResult.data,
            });
        }

        while ((await this.redisClient.LLEN(clientTaskQueueName)) > 0) {
            await sleep();
            await this.consumeTask();
        }

        const clearQueueUnlockResult = await this.lock.unlock();

        if (clearQueueUnlockResult.error) {
            this.messageHandler(clearQueueUnlockResult.data);
        }

        this.redisClient.subscribe(clientTaskChannelName, (timestamp) => {
            this.messageHandler({
                level: 'info',
                data: `Receive Task: ${timestamp}`,
            });
            this
                .consumeTask()
                .then((task) => {
                    // TODO
                    this.messageHandler({
                        level: 'info',
                        data: `Consume: ${task}`,
                    });
                })
                .catch((error) => {
                    console.log(error);
                    // TODO error handle, push a status code to server
                    this.messageHandler({
                        level: 'error',
                        data: error.message || error.toString(),
                    });
                })
                .finally(() => {
                    this.lock
                        .unlock()
                        .catch((error) => {
                            this.messageHandler({
                                level: 'error',
                                data: error.message || error.toString(),
                            });
                        });
                });
        });
    }
}
