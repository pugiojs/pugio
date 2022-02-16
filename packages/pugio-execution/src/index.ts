import 'reflect-metadata';
import { Service } from 'typedi';
import { UtilsService } from '@pugio/utils';
import {
    DecryptedExecutionData,
    ExecutionOptions,
    ExecutionResultHandler,
    ExecutionTask,
} from '@pugio/types';
import { Execution } from './execution';
import * as _ from 'lodash';
import * as path from 'path';
import * as os from 'os';

export const EXECUTION_SCRIPT_DIR = path.resolve(os.homedir(), './.pugio-executions');

@Service()
export class ExecutionService {
    private publicKey: string;
    private privateKey: string;
    private executionResultHandler: ExecutionResultHandler = _.noop;

    public constructor(
        private readonly utilsService: UtilsService,
    ) {}

    public initialize(options: ExecutionOptions) {
        const {
            publicKey,
            privateKey,
            onExecutionResult,
        } = options;

        this.publicKey = publicKey;
        this.privateKey = privateKey;

        if (_.isFunction(onExecutionResult)) {
            this.executionResultHandler = onExecutionResult;
        }
    }

    public async executeTask(executionTask: ExecutionTask) {
        const {
            id,
            aesKey: encryptedAesKey,
            executionCwd,
            executionData: encryptedExecutionData,
        } = executionTask;

        const aesKey = this.utilsService.decryptTaskAesKey(encryptedAesKey, this.privateKey);
        const executionDataContent = this.utilsService.decryptExecutionData(encryptedExecutionData, aesKey);

        let executionData: DecryptedExecutionData;

        try {
            executionData = JSON.parse(executionDataContent);
        } catch (e) {}

        const scriptDir = path.resolve(EXECUTION_SCRIPT_DIR, './' + id);
        this.utilsService.ensureDataDir(scriptDir);

        const execution = new Execution(
            executionCwd,
            scriptDir,
            executionData,
            (spawnData) => {
                const {
                    sequence,
                    error,
                    content,
                } = spawnData;

                const encryptedContent = this.utilsService.encryptExecutionResultContent(content, aesKey);
                const status = error ? -1 : 3;

                this.executionResultHandler(
                    {
                        status,
                        taskId: id,
                        data: encryptedContent,
                        sequence,
                    },
                );
            },
            () => {
                this.executionResultHandler({
                    taskId: id,
                    status: 4,
                });
            },
        );

        execution.execute();
    }
}
