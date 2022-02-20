import {
    RedisConnectionOptions,
} from '../redis';
import { ChannelRequestHandlerConfigItem } from '../utils';

export type ClientMessageLevel = 'info' | 'warn' | 'error';

export interface ClientMessage {
    level: ClientMessageLevel;
    data: string;
}

export type ClientMessageHandler = (message: ClientMessage) => void | Promise<void>;

export interface ClientOptions {
    clientId?: string;
    apiKey?: string;
    publicKey?: string;
    privateKey?: string;
    hostname?: string;
    apiVersion?: number;
    redisOptions?: RedisConnectionOptions;
    channelList?: ChannelRequestHandlerConfigItem[];
    onMessage?: ClientMessageHandler;
}

export interface ChannelOptions<H> {
    clientId: string;
    channelRequestHandlers?: H[];
    messageHandler: ClientMessageHandler;
}
