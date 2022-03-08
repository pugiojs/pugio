import { AxiosRequestConfig } from 'axios';
import { ClientMessageHandler } from '../client';

export interface RequestOptions {
    headers?: Record<string, string>;
    requestConfig?: AxiosRequestConfig;
    json?: boolean;
    transformCase?: boolean;
    messageHandler?: ClientMessageHandler;
}

export interface ResponseGetInstanceOptions {
    json?: boolean;
}

export interface RequestConfig<D> extends AxiosRequestConfig<D> {
    query?: Record<string, any>;
}
