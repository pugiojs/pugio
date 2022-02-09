import {
    ClientMessageHandler,
    ClientOptions,
    LockerOptions,
    RedisClient,
    RedisClientOptions,
} from '@pugio/types';
import {
    sleep,
} from '@pugio/utils';
import Lock from '@pugio/lock';
import * as _ from 'lodash';

export class Client {
    protected redisClient: RedisClient;
    protected lock: Lock;
    protected clientTaskQueueName: string;
    protected clientTasksLockName: string;
    protected clientTaskChannelName: string;
    private apiKey: string;
    private messageHandler: ClientMessageHandler;
    private redisOptions: RedisClientOptions;
    private lockerOptions: Omit<LockerOptions, 'redisClient' | 'lockName'>;

    public constructor(options: ClientOptions) {
        const {
            redis: redisOptions = {},
            locker: lockerOptions = {},
            clientId,
            apiKey,
            onMessage: messageHandler = _.noop,
        } = options;

        this.redisOptions = redisOptions;
        this.lockerOptions = lockerOptions;
        this.apiKey = apiKey;
        this.clientTaskQueueName = `${clientId}:task_queue`;
        this.clientTasksLockName = `${clientId}:tasks_lock`;
        this.clientTaskChannelName = `${clientId}@execution`;
        this.messageHandler = messageHandler;
    }

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
