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

export interface MakeChallengeResponse {
    credential: string;
    task_channel_name: string;
}

export type SDKResponse<T> = Promise<SDKResponseData<T>>;
