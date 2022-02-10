import 'reflect-metadata';
import {
    createClient,
} from 'redis';
import * as _ from 'lodash';
import {
    RedisConnectionOptions,
    RedisClientOptions,
    AbstractConnection,
} from '@pugio/types';
import { Service } from 'typedi';

@Service()
export class ConnectionService extends AbstractConnection implements AbstractConnection  {
    private client: any;
    private options: RedisConnectionOptions;
    private connectedFlag = false;

    public constructor(options: RedisConnectionOptions) {
        super();
        this.options = options;
    }

    public async connect() {
        const redisClientOptions: RedisClientOptions  = _.omit(
            this.options,
            [
                'pollTimerGap',
                'onClientReady',
                'onError',
            ],
        );

        const {
            pollTimerGap = 1000,
            onClientReady: redisClientReadyHandler = _.noop,
            onError: redisErrorHandler = _.noop,
        } = this.options;

        while (true) {
            if (!this.connectedFlag) {
                if (this.client) {
                    try {
                        await this.client.disconnect();
                        await this.client.quit();
                    } catch (e) {} finally {
                        this.client = null;
                    }
                }

                this.client = createClient(redisClientOptions as any);

                try {
                    await this.client.connect();
                    this.connectedFlag = true;

                    this.client.on('error', async (error) => {
                        redisErrorHandler(error);
                        this.connectedFlag = false;
                    });

                    if (this.client.isOpen) {
                        await redisClientReadyHandler(this.client);
                    }
                } catch (e) {
                    await redisErrorHandler(e);
                }
            }

            await new Promise((resolve) => {
                setTimeout(() => resolve(undefined), pollTimerGap);
            });
        }
    }
}
