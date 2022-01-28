import {
    createClient,
} from 'redis';
import * as _ from 'lodash';
import {
    RedisConnectionOptions,
    RedisClient,
    RedisClientOptions,
} from '@pugio/types';

export default async (options: RedisConnectionOptions) => {
    const redisClientOptions: RedisClientOptions  = _.omit(
        options,
        [
            'pollTimerGap',
            'onClientReady',
            'onError',
        ],
    );

    let client: any;
    let connectedFlag = false;

    const {
        pollTimerGap = 1000,
        onClientReady: redisClientReadyHandler = _.noop,
        onError: redisErrorHandler = _.noop,
    } = options;

    while (true) {
        if (!connectedFlag) {
            if (client) {
                try {
                    await client.disconnect();
                    await client.quit();
                } catch (e) {} finally {
                    client = null;
                }
            }

            client = createClient(redisClientOptions as any);

            try {
                await client.connect();
                connectedFlag = true;

                client.on('error', async (error) => {
                    redisErrorHandler(error);
                    connectedFlag = false;
                });

                if (client.isOpen) {
                    await redisClientReadyHandler(client);
                }
            } catch (e) {
                await redisErrorHandler(e);
            }
        }

        await new Promise((resolve) => {
            setTimeout(() => resolve(undefined), pollTimerGap);
        });
    }
};
