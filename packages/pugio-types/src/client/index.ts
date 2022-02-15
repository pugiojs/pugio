import {
    RedisClient,
    RedisConnectionOptions,
} from '../redis';

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
    onMessage?: ClientMessageHandler;
}

export interface LockerOptions {
    expiration?: number;
    redisClient?: RedisClient;
    lockName: string;
}
