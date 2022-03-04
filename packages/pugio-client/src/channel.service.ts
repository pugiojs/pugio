import { ExecutionService } from '@pugio/execution';
import {
    AbstractChannelRequest,
    SDKService,
} from '@pugio/sdk';
import {
    ChannelClientConfig,
    ChannelOptions,
    ChannelRequest,
    ClientMessageHandler,
    ExecutionTask,
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
        private readonly sdkService: SDKService,
        private readonly executionService: ExecutionService,
    ) {
        this.channelsMap.set('execution', this.handleExecution);
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
            try {
                const channelRequestHandler = new ChannelRequestHandler();

                const {
                    name,
                    scope,
                } = channelRequestHandler;

                channelRequestHandler.setSDKService(this.sdkService);
                channelRequestHandler.setClientConfig(clientConfig);

                this.channelRequestsMap.set(scope, channelRequestHandler);

                this.messageHandler({
                    level: 'info',
                    data: `Initialize channel request handler ${name} (${scope})`,
                });
            } catch (e) {
                this.messageHandler({
                    level: 'error',
                    data: `Error during initialize channel request handler ${e.message || e.toString()}`,
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

    public async executeTasks(executionTasks: ExecutionTask[]) {
        for (const executionTask of executionTasks) {
            this.messageHandler({
                level: 'info',
                data: `Execute task ${executionTask.id}`,
            });

            await this.executionService.executeTask(executionTask);
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

            await this.sdkService.pushChannelResponse({
                requestId,
                data: result,
                errored,
            });
        } else {
            await this.sdkService.pushChannelResponse({
                requestId,
                data: `Channel '${scope}' is not registered in client`,
                errored: true,
            });
        }
    }

    private async handleExecution(lockPass: string) {
        this.messageHandler({
            level: 'info',
            data: `Received task with lock: ${lockPass}`,
        });

        const { response: executionTasks } = await this.sdkService.consumeExecutionTask({
            lockPass,
        });

        if (executionTasks && executionTasks.length > 0) {
            this.messageHandler({
                level: 'info',
                data: `Got ${executionTasks.length} task(s)`,
            });

            await this.executeTasks(executionTasks);
        }
    }
}
