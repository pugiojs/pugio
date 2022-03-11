import { ExecutionTask } from '../execution';
import { ClientManagerResponseBaseUnit } from '../sdk';

export interface PipelinesTriggerRequestData {
    lock_pass: string;
}

export type PipelinesUnionRequestData = PipelinesTriggerRequestData;

export type PipelinesRequestData = PipelinesUnionRequestData & {
    action: string;
};

export interface PipelinesTriggerResponseData {
    done: boolean;
}

export type PipelinesResponseData = PipelinesTriggerResponseData;

export interface ConsumeExecutionTaskRequest {
    all?: number;
    lockPass?: string;
}

export type ConsumeExecutionTaskResponse = Array<ExecutionTask & ClientManagerResponseBaseUnit>;

export interface PushExecutionRecordRequest {
    taskId: string;
    sequence?: number;
    status?: number;
    content?: string;
}

export interface PushExecutionRecordResponse extends ClientManagerResponseBaseUnit {
    id: string;
}
