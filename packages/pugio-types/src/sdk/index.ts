import { ClientMessageHandler } from '../client';

export interface SDKOptions {
    clientKey?: string;
    hostname?: string;
    apiVersion?: number;
    onMessage?: ClientMessageHandler;
}
