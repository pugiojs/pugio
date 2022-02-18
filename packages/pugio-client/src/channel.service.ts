import { ExecutionService } from '@pugio/execution';
import { SDKService } from '@pugio/sdk';
import {
    ChannelOptions,
    ClientMessageHandler,
    ExecutionTask,
    FileHookRequestOptions,
    RedisClient,
} from '@pugio/types';
import 'reflect-metadata';
import { Service } from 'typedi';
import * as _ from 'lodash';
import * as fs from 'fs-extra';
import * as path from 'path';

@Service()
export class ChannelService {
    private channelsMap = new Map();
    private redisClient: RedisClient;
    private clientId: string;
    private messageHandler: ClientMessageHandler;

    public constructor(
        private readonly sdkService: SDKService,
        private readonly executionService: ExecutionService,
    ) {
        this.channelsMap.set('execution', this.handleExecution);
        this.channelsMap.set('file', (content) => this.pipeChannelRequest('file', content, this.handleFile));
    }

    public initialize({ messageHandler, clientId }: ChannelOptions) {
        this.clientId = clientId;
        this.messageHandler = messageHandler;
    }

    public setRedisClient(redisClient: RedisClient) {
        this.redisClient = redisClient;
    }

    public async subscribeChannel(channelId: string) {
        const [, channelScope] = channelId.split('@');
        const handler = this.channelsMap.get(channelScope);
        if (_.isFunction(handler)) {
            this.redisClient.subscribe(channelId, handler);
            this.messageHandler({
                level: 'info',
                data: `Subscribe to channel ${channelId}`,
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

    public async pipeChannelRequest(scope: string, content: string, pipeFn: (options) => Promise<any>) {
        let data;

        try {
            if (_.isString(data)) {
                return data;
            }
            data = JSON.parse(content);
        } catch (e) {
            data = {};
        }

        if (_.isFunction(pipeFn)) {
            const result = (await pipeFn(data.options)) || {};

            await this.sdkService.pushChannelResponse({
                requestId: data.id,
                scope,
                clientId: this.clientId,
                data: result,
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

    private async handleFile(data: FileHookRequestOptions) {
        const pathname = data.pathname;
        if (
            !_.isString(pathname) ||
            !fs.existsSync(pathname) ||
            !fs.statSync(pathname).isDirectory()
        ) {
            return '';
        }

        try {
            const dirItems = fs.readdirSync(pathname, {
                withFileTypes: true,
                encoding: 'utf-8',
            });

            const items = dirItems.map((dirItem) => {
                const stat = fs.statSync(path.resolve());
                return {
                    ...stat,
                    name: dirItem.name,
                    isFIFO: stat.isFIFO(),
                    isFile: stat.isFile(),
                    isDirectory: stat.isDirectory(),
                    isSocket: stat.isSocket(),
                    isSymbolicLink: stat.isSymbolicLink(),
                };
            });

            return items;
        } catch (e) {
            return [];
        }
    }
}
