import { AxiosRequestConfig } from 'axios';
import { ClientMessageHandler } from '../client';

export interface RequestOptions {
    clientKey?: string;
    requestConfig?: AxiosRequestConfig;
    messageHandler?: ClientMessageHandler;
}

export interface ResponseGetInstanceOptions {
    json?: boolean;
}

export interface MakeChallengeResponse {
    credential: string;
    task_channel_name: string;
}
