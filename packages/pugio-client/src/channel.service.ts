import { ExecutionService } from '@pugio/execution';
import { SDKService } from '@pugio/sdk';
import {
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
import { channelRequests } from '@pugio/builtins';
import * as yup from 'yup';

@Service()
export class ChannelService {
    private channelsMap = new Map();
    private channelRequestsMap = new Map<string, Function>();
    private redisClient: RedisClient;
    private clientId: string;
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
            clientId,
            channelRequestHandlers = [],
            messageHandler,
        }: ChannelOptions<Type<channelRequests.AbstractChannelRequest>>,
    ) {
        this.clientId = clientId;
        this.messageHandler = messageHandler;

        for (const ChannelRequestHandler of channelRequestHandlers) {
            try {
                const channelRequestHandler = new ChannelRequestHandler();

                const {
                    scope,
                    handleRequest,
                } = channelRequestHandler;
                channelRequestHandler.setSDKService(this.sdkService);

                this.channelRequestsMap.set(scope, handleRequest.bind(channelRequestHandler));

                this.messageHandler({
                    level: 'info',
                    data: `Initialize channel request handler ${scope}`,
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
            const redisChannelId = `${this.clientId}@${channelId}`;
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

        const pipeFn = this.channelRequestsMap.get(scope);

        if (_.isFunction(pipeFn)) {
            try {
                result = (await pipeFn(options)) || null;
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
