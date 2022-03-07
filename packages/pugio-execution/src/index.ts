import 'reflect-metadata';
import { Service } from 'typedi';
import { UtilsService } from '@pugio/utils';
import {
    ExecutionData,
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
    private executionResultHandler: ExecutionResultHandler = _.noop;

    public constructor(
        private readonly utilsService: UtilsService,
    ) {}

    public initialize(options: ExecutionOptions) {
        const {
            onExecutionResult,
        } = options;

        if (_.isFunction(onExecutionResult)) {
            this.executionResultHandler = onExecutionResult;
        }
    }

    public async executeTask(executionTask: ExecutionTask) {
        const {
            id,
            executionCwd,
            executionData: stringifiedExecutionData,
        } = executionTask;

        let executionData: ExecutionData;

        try {
            try {
                executionData = JSON.parse(stringifiedExecutionData);
            } catch (e) {
                this.executionResultHandler(
                    {
                        status: -2,
                        taskId: id,
                    },
                );
            }
        } catch (e) {
            this.executionResultHandler(
                {
                    status: -3,
                    taskId: id,
                },
            );
        }

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

                const status = error ? -1 : 3;

                this.executionResultHandler(
                    {
                        status,
                        taskId: id,
                        data: content,
                        ...(
                            !_.isNumber(sequence)
                                ? {}
                                : { sequence }
                        ),
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
