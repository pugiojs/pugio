import 'reflect-metadata';
import {
    ClientMessageHandler,
    ClientOptions,
    ExecutionTask,
    MakeChallengeResponse,
    RedisClient,
    RedisClientOptions,
} from '@pugio/types';
import { UtilsService } from '@pugio/utils';
import * as _ from 'lodash';
import { Service } from 'typedi';
import { ConnectionService } from '@pugio/connection';
import { SDKService } from '@pugio/sdk';
import { machineIdSync } from 'node-machine-id';
import * as yup from 'yup';
import { ExecutionService } from '@pugio/execution';
import * as fs from 'fs-extra';
import * as path from 'path';

@Service()
export class ClientService {
    protected redisClient: RedisClient;
    protected apiKey: string;
    protected clientId: string;
    protected clientKey: string;
    protected publicKey: string;
    protected privateKey: string;
    protected redisOptions: RedisClientOptions;
    protected options: ClientOptions = {};
    protected machineId: string;
    private messageHandler: ClientMessageHandler = _.noop;

    public constructor(
        private readonly connectionService: ConnectionService,
        private readonly utilsService: UtilsService,
        private readonly sdkService: SDKService,
        private readonly executionService: ExecutionService,
    ) {
    }

    public async initialize(options: ClientOptions) {
        this.machineId = machineIdSync();
        this.options = options;

        const {
            clientId,
            apiKey,
            publicKey,
            privateKey,
            hostname = 'pugio.lenconda.top',
            apiVersion = 1,
            redisOptions = {},
            onMessage: messageHandler,
        } = this.options;

        const partialOptionsSchema = yup.object().shape({
            clientId: yup.string().required(),
            apiKey: yup.string().required(),
            publicKey: yup.string().required(),
            privateKey: yup.string().required(),
        });

        if (
            !(await partialOptionsSchema.isValid({
                clientId,
                apiKey,
                publicKey,
                privateKey,
            }))
        ) {
            this.messageHandler({
                level: 'error',
                data: 'Invalid client options',
            });
        }

        this.apiKey = apiKey;
        this.clientId = clientId;
        this.publicKey = publicKey;
        this.privateKey = privateKey;
        this.redisOptions = redisOptions;

        if (_.isFunction(messageHandler)) {
            this.messageHandler = messageHandler;
        }

        this.clientKey = this.utilsService.generateClientKey(this.apiKey, this.clientId);

        this.sdkService.initialize({
            clientKey: this.clientKey,
            hostname,
            apiVersion,
            onMessage: this.messageHandler,
            onError: (error) => {
                this.messageHandler({
                    level: 'error',
                    data: error.message,
                });
            },
        });
    }

    public async run() {
        let version;

        try {
            const packageJson = fs.readJsonSync(path.resolve(__dirname, '../package.json'));
            version = packageJson.version || '';
            this.messageHandler({
                level: 'info',
                data: `Client version: ${version}`,
            });
        } catch (e) {}

        const {
            response = {} as MakeChallengeResponse,
        } = await this.sdkService.makeChallenge({
            version,
            deviceId: this.machineId,
        });

        const {
            credential,
            taskChannelName,
        } = response;

        this.connectionService.initialize({
            ...this.redisOptions,
            username: this.clientId,
            password: credential,
            onClientReady: async (client) => {
                if (client.isOpen) {
                    this.redisClient = client;
                    await this.sdkService.connected({ credential });
                    this.handleClientReady(taskChannelName);
                }
            },
            onError: async (error) => {
                this.messageHandler({
                    level: 'error',
                    data: error.message || error.toString(),
                });
            },
        });

        this.connectionService.connect();
    }

    protected async executeTasks(executionTasks: ExecutionTask[]) {
        for (const executionTask of executionTasks) {
            this.messageHandler({
                level: 'info',
                data: `Execute task ${executionTask.id}`,
            });

            await this.executionService.executeTask(executionTask);
        }
    }

    private async handleClientReady(channelName: string) {
        this.messageHandler({
            level: 'info',
            data: 'Channel connected',
        });

        const {
            publicKey,
            privateKey,
        } = this;

        this.executionService.initialize({
            publicKey,
            privateKey,
            onExecutionResult: async (result) => {
                const { taskId, data: content, status, sequence } = result;
                try {
                    await this.sdkService.pushExecutionRecord({
                        taskId,
                        content,
                        status,
                        sequence,
                    });
                    this.messageHandler({
                        level: 'info',
                        data: `Push execution record of task ${taskId}, sequence: ${sequence}, status: ${status}`,
                    });
                } catch {}
            },
        });

        this.redisClient.subscribe(channelName, async (lockPass) => {
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

        const {
            response: remainedExecutionTasks,
        } = await this.sdkService.consumeExecutionTask({
            all: 1,
        });

        if (remainedExecutionTasks && remainedExecutionTasks.length > 0) {
            this.messageHandler({
                level: 'info',
                data: `Pulled ${remainedExecutionTasks.length} task(s)`,
            });

            await this.executeTasks(remainedExecutionTasks);
        }
    }
}
