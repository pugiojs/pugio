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

export interface MakeChallengeRequest {
    deviceId: string;
}

export interface MakeChallengeResponse extends ConnectedResponse {
    credential: string;
    taskChannelName: string;
    taskQueueName: string;
    tasksLockName: string;
}

export interface ConnectedRequest {
    credential: string;
}

export interface ConnectedResponse {
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

export type ConsumeExecutionTaskResponse = Array<ExecutionTask>;
