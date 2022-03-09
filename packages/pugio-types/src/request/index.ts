import {
    AxiosRequestConfig,
    AxiosRequestHeaders,
} from 'axios';
import { ClientMessageHandler } from '../client';

export interface RequestOptions {
    headers?: AxiosRequestHeaders;
    requestConfig?: AxiosRequestConfig;
    json?: boolean;
    transformCase?: boolean;
    messageHandler?: ClientMessageHandler;
}

export interface ResponseGetInstanceOptions extends Partial<AxiosRequestConfig> {
    json?: boolean;
}

export interface RequestConfig<D> extends AxiosRequestConfig<D> {
    query?: Record<string, any>;
}
