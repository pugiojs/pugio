import { AbstractChannelRequest } from '@pugio/sdk';
import {
    PipelinesRequestData,
    ExecutionTask,
    PipelinesTriggerRequestData,
    PipelinesResponseData,
    PipelinesTriggerResponseData,
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
                    await this.clientManagerService.pushChannelGateway({
                        eventId: `execution_result:${taskId}`,
                        data: {
                            taskId,
                            content,
                            status,
                            sequence,
                        },
                    });
                    this.log({
                        level: 'info',
                        data: `Push execution record of task ${taskId}, sequence: ${sequence}, status: ${status}`,
                    });
                } catch {}
            },
        });
    }

    public async handleRequest(data: PipelinesRequestData): Promise<PipelinesResponseData> {
        const {
            action,
            ...requestBody
        } = data;

        switch (action) {
            case 'trigger': {
                const { lockPass } = requestBody as PipelinesTriggerRequestData;

                this.log({
                    level: 'info',
                    data: `Received task with lock: ${lockPass}`,
                });

                const { response: executionTasks } = await this.clientManagerService.consumeExecutionTask({
                    lockPass,
                });

                if (executionTasks && executionTasks.length > 0) {
                    this.log({
                        level: 'info',
                        data: `Got ${executionTasks.length} task(s)`,
                    });

                    await this.executeTasks(executionTasks);
                }

                return { done: true } as PipelinesTriggerResponseData;
            }
            // TODO remove
            case 'test': {
                return { requestBody } as any;
            }
            default:
                return null;
        }
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
        } = await this.clientManagerService.consumeExecutionTask({
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
