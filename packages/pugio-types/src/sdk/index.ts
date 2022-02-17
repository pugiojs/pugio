import { ExecutionTask } from '../execution';
import { ClientMessageHandler } from '../client';

export type SDKErrorHandler = (error: Error) => void;

export interface SDKOptions {
    clientKey?: string;
    hostname?: string;
    apiVersion?: number;
    onMessage?: ClientMessageHandler;
    onError?: SDKErrorHandler;
}

export type SDKResponse<T> = Promise<SDKResponseData<T>>;

export interface SDKError {
    statusCode: number;
    message: string;
}

export interface SDKResponseData<T> {
    response?: T;
    error?: SDKError;
}

export interface SDKResponseBaseUnit {
    createdAt?: string;
    updatedAt?: string;
}

export interface MakeChallengeRequest {
    version?: string;
    deviceId: string;
}

export interface MakeChallengeResponse extends ConnectedResponse, SDKResponseBaseUnit {
    credential: string;
    channels: string[];
}

export interface ConnectedRequest {
    credential: string;
}

export interface ConnectedResponse extends SDKResponseBaseUnit {
    clientInfo: {
        flags: string[];
        commands: string;
        keys: string[];
        channels: string[];
    };
}

export interface ConsumeExecutionTaskRequest {
    all?: number;
    lockPass?: string;
}

export type ConsumeExecutionTaskResponse = Array<ExecutionTask & SDKResponseBaseUnit>;

export interface PushExecutionRecordRequest {
    taskId: string;
    sequence?: number;
    status?: number;
    content?: string;
}

export interface PushExecutionRecordResponse extends SDKResponseBaseUnit {
    id: string;
}

export interface PushClientResponseRequest {
    clientId: string;
    scope: string;
    requestId: string;
    data: any;
}
