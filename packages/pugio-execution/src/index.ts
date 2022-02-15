import 'reflect-metadata';
import { Service } from 'typedi';
import { UtilsService } from '@pugio/utils';
import {
    ExecutionOptions,
    ExecutionResultHandler,
    ExecutionTask,
} from '@pugio/types';
import * as _ from 'lodash';
import child_process from 'child_process';

@Service()
export class ExecutionService {
    private executionResultHandler: ExecutionResultHandler = _.noop;

    public constructor(
        private readonly utilsService: UtilsService,
    ) {}

    public initialize(options: ExecutionOptions = {}) {
        const {
            onExecutionResult,
        } = options;

        if (_.isFunction(onExecutionResult)) {
            this.executionResultHandler = onExecutionResult;
        }
    }

    public executeTask(executionTask: ExecutionTask) {
        // TODO
        /**
         * 1. decrypt AES key with private key
         * 2. decrypt executionTask.executionData with AES key
         * 3. spawn a new child process
         */
    }
}
