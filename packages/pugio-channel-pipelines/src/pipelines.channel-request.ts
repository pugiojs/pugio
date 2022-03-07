import { AbstractChannelRequest } from '@pugio/sdk';
import {
    PipelinesRequestData,
    PipelineResponseData,
    ExecutionTask,
} from '@pugio/types';
import { ExecutionService } from '@pugio/execution';
import { UtilsService } from '@pugio/utils';

export class PipelinesChannelRequest extends AbstractChannelRequest implements AbstractChannelRequest {
    private executionService: ExecutionService = new ExecutionService(new UtilsService());

    public constructor() {
        super('pugio.pipelines', 'Pipelines (Built-in)');
        this.clearExecutionTaskQueue();
        this.executionService.initialize({
            onExecutionResult: async (result) => {
                const { taskId, data: content, status, sequence } = result;
                try {
                    await this.sdkService.pushExecutionRecord({
                        taskId,
                        content,
                        status,
                        sequence,
                    });
                    this.log({
                        level: 'info',
                        data: `Push execution record of task ${taskId}, sequence: ${sequence}, status: ${status}`,
                    });
                } catch {}
            },
        });
    }

    public async handleRequest(data: PipelinesRequestData): Promise<PipelineResponseData> {
        const { lockPass } = data;

        this.log({
            level: 'info',
            data: `Received task with lock: ${lockPass}`,
        });

        const { response: executionTasks } = await this.sdkService.consumeExecutionTask({
            lockPass,
        });

        if (executionTasks && executionTasks.length > 0) {
            this.log({
                level: 'info',
                data: `Got ${executionTasks.length} task(s)`,
            });

            await this.executeTasks(executionTasks);
        }

        return { done: true};
    }

    private async executeTasks(executionTasks: ExecutionTask[]) {
        for (const executionTask of executionTasks) {
            this.log({
                level: 'info',
                data: `Execute task ${executionTask.id}`,
            });

            await this.executionService.executeTask(executionTask);
        }
    }

    private async clearExecutionTaskQueue() {
        const {
            response: remainedExecutionTasks,
        } = await this.sdkService.consumeExecutionTask({
            all: 1,
        });

        if (remainedExecutionTasks && remainedExecutionTasks.length > 0) {
            this.log({
                level: 'info',
                data: `Pulled ${remainedExecutionTasks.length} task(s)`,
            });

            await this.executeTasks(remainedExecutionTasks);
        }
    }
}
