import {
    AbstractChannelRequest,
    ClientManagerService,
} from '@pugio/sdk';
import {
    ChannelClientConfig,
    ChannelOptions,
    ChannelRequest,
    ClientMessageHandler,
    RedisClient,
    Type,
} from '@pugio/types';
import 'reflect-metadata';
import { Service } from 'typedi';
import * as _ from 'lodash';
import * as yup from 'yup';

@Service()
export class ChannelService {
    private channelsMap = new Map();
    private channelRequestsMap = new Map<string, AbstractChannelRequest>();
    private redisClient: RedisClient;
    private clientConfig: ChannelClientConfig;
    private messageHandler: ClientMessageHandler;

    public constructor(
        private readonly clientManagerService: ClientManagerService,
    ) {
        this.channelsMap.set('channel_request', (data) => {
            this.messageHandler({
                level: 'info',
                data: `Channel request receive ${JSON.stringify(data)}`,
            });
            this.pipeChannelRequest(data);
        });
    }

    public initialize(
        {
            clientConfig,
            channelRequestHandlers = [],
            messageHandler,
        }: ChannelOptions<Type<AbstractChannelRequest>>,
    ) {
        this.clientConfig = clientConfig;
        this.messageHandler = messageHandler;

        for (const ChannelRequestHandler of channelRequestHandlers) {
            let name;
            let scope;

            try {
                const channelRequestHandler = new ChannelRequestHandler();

                const {
                    name: channelName,
                    scope: channelScope,
                } = channelRequestHandler;

                name = channelName;
                scope = channelScope;

                channelRequestHandler.setClientManager(this.clientManagerService);
                channelRequestHandler.setClientConfig(clientConfig);
                channelRequestHandler.setLogger(this.messageHandler);

                this.channelRequestsMap.set(scope, channelRequestHandler);

                this.messageHandler({
                    level: 'info',
                    data: `Initialize channel request handler '${name} (${scope})'`,
                });
            } catch (e) {
                this.messageHandler({
                    level: 'warn',
                    data: `Skip initialize channel request handler '${name} (${scope})'`,
                });
                this.messageHandler({
                    level: 'warn',
                    data: `Error during initialize channel request handler '${name} (${scope})': ${e.message || e.toString()}`,
                });
            }
        }
    }

    public setRedisClient(redisClient: RedisClient) {
        this.redisClient = redisClient;
    }

    public subscribeChannel(channelId: string) {
        const handler = this.channelsMap.get(channelId);

        if (_.isFunction(handler)) {
            const redisChannelId = `${this.clientConfig.clientId}@${channelId}`;
            this.redisClient.subscribe(redisChannelId, handler);
            this.messageHandler({
                level: 'info',
                data: `Subscribe to channel ${redisChannelId}`,
            });
        }
    }

    public async pipeChannelRequest(data: string) {
        let channelData: Partial<ChannelRequest<any>>;
        let errored = false;
        let result;

        try {
            if (!_.isString(data)) {
                channelData = data;
            }
            channelData = JSON.parse(data);
        } catch (e) {
            channelData = {};
        }

        const schema = yup.object().shape({
            id: yup.string().required(),
            scope: yup.string().required(),
            options: yup.object().optional().nullable(),
        });

        if (!(await schema.isValid(channelData))) {
            errored = true;
            result = null;

            return {
                requestId: channelData.id,
                errored,
                data: result,
            };
        }

        const {
            scope,
            id: requestId,
            options = {},
        } = channelData;

        this.messageHandler({
            level: 'info',
            data: `Request scope: ${scope}, id: ${requestId}, content: ${data}`,
        });

        const channelRequestHandler = this.channelRequestsMap.get(scope);
        const channelPipeFunction = _.get(channelRequestHandler, 'handleRequest');

        if (channelRequestHandler && _.isFunction(channelPipeFunction)) {
            try {
                result = (await channelPipeFunction.call(channelRequestHandler, options)) || null;
                this.messageHandler({
                    level: 'info',
                    data: `Response scope: ${scope}, id: ${requestId}, result: ${JSON.stringify(result)}`,
                });
            } catch (e) {
                errored = true;
                result = null;
                this.messageHandler({
                    level: 'info',
                    data: `Response scope: ${scope}, id: ${requestId}, error: ${e.message || e.toString()}`,
                });
            }

            await this.clientManagerService.pushChannelResponse({
                requestId,
                data: result,
                errored,
            });
        } else {
            await this.clientManagerService.pushChannelResponse({
                requestId,
                data: `Channel '${scope}' is not registered in client`,
                errored: true,
            });
        }
    }
}
