import {
    ClientMessageHandler,
    ClientOptions,
    RedisClient,
} from './interfaces';
import connect from './connection';
import PugioLock from './lock';
import * as _ from 'lodash';

class PugioClient {
    protected redisClient: RedisClient;
    protected clientTaskQueueName: string;
    protected clientTasksLockName: string;
    protected clientTaskChannelName: string;
    protected lock: PugioLock;
    private apiKey: string;
    private messageHandler: ClientMessageHandler;

    public constructor(options: ClientOptions) {
        const {
            redis: redisOptions,
            lock: lockOptions,
            clientId,
            apiKey,
            onMessage: messageHandler = _.noop,
        } = options;

        this.apiKey = apiKey;
        this.lock = new PugioLock(lockOptions);
        this.clientTaskQueueName = `${clientId}:task_queue`;
        this.clientTasksLockName = `${clientId}:tasks_lock`;
        this.clientTaskChannelName = `${clientId}@execution`;
        this.messageHandler = messageHandler;

        connect(
            {
                ...redisOptions,
                onClientReady: async (client) => {
                    this.redisClient = client;
                    if (client.isOpen) {
                        this.handleClientReady();
                    }
                },
                onError: async (error) => {
                    this.messageHandler({
                        level: 'error',
                        data: error.message || error.toString(),
                    });
                },
            },
        );
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

        while ((await this.redisClient.llen(clientTaskQueueName)) > 0) {
            await new Promise((resolve) => setTimeout(() => resolve(void 0), 500));
            await this.consumeTask();
        }

        const clearQueueUnlockResult = await this.lock.unlock();

        if (clearQueueUnlockResult.error) {
            this.messageHandler(clearQueueUnlockResult.data);
        }

        this.redisClient.subscribe(clientTaskChannelName, () => {
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
                    // TODO error handle, push a status code to server
                    this.messageHandler(error.message || error.toString());
                })
                .finally(() => {
                    this.lock
                        .unlock()
                        .catch((error) => {
                            this.messageHandler(error.message || error.toString());
                        });
                });
        });
    }

    private async consumeTask() {
        try {
            const data = await this.redisClient.lpop();
            // TODO parse data
            return data;
        } catch (e) {
            this.messageHandler(e.message || e.toString());
        }
    }
}

export default PugioClient;
