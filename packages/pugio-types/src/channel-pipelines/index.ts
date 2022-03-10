export interface PipelinesTriggerRequestData {
    lockPass: string;
}

export type PipelinesUnionRequestData = PipelinesTriggerRequestData;

export type PipelinesRequestData = PipelinesUnionRequestData & {
    action: string;
};

export interface PipelinesTriggerResponseData {
    done: boolean;
}

export type PipelinesResponseData = PipelinesTriggerResponseData;
