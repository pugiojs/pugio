import { ClientMessageHandler } from '../client';

export interface SDKOptions {
    clientKey?: string;
    hostname?: string;
    apiVersion?: number;
    onMessage?: ClientMessageHandler;
}

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

export interface MakeChallengeResponse {
    credential: string;
    taskChannelName: string;
    taskQueueName: string;
    tasksLockName: string;
    clientInfo: {
        flags: string[];
        commands: string;
        keys: string[];
        channels: string[];
    };
}

export type SDKResponse<T> = Promise<SDKResponseData<T>>;
