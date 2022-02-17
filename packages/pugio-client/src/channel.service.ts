import { ExecutionService } from '@pugio/execution';
import { SDKService } from '@pugio/sdk';
import {
    ClientMessageHandler,
    ExecutionTask,
    RedisClient,
} from '@pugio/types';
import 'reflect-metadata';
import { Service } from 'typedi';
import * as _ from 'lodash';

@Service()
export class ChannelService {
    private channelsMap = new Map();
    private redisClient: RedisClient;
    private messageHandler: ClientMessageHandler;

    public constructor(
        private readonly sdkService: SDKService,
        private readonly executionService: ExecutionService,
    ) {
        this.channelsMap.set('execution', async (lockPass) => {
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
        });
    }

    public initialize(messageHandler: ClientMessageHandler) {
        this.messageHandler = messageHandler;
    }

    public setRedisClient(redisClient: RedisClient) {
        this.redisClient = redisClient;
    }

    public async subscribeChannel(channelName: string) {
        const [, channelScope] = channelName.split('@');
        const handler = this.channelsMap.get(channelScope);
        if (_.isFunction(handler)) {
            this.redisClient.subscribe(channelName, handler);
            this.messageHandler({
                level: 'info',
                data: `Subscribe to channel ${channelName}`,
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
}
