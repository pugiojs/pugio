import { AbstractConnection } from '../connection';
import {
    RedisClient,
    RedisClientOptions,
} from '../redis';

export type ClientMessageLevel = 'info' | 'warn' | 'error';

export interface ClientMessage {
    level: ClientMessageLevel;
    data: string;
}

export type ClientMessageHandler = (message: ClientMessage) => void | Promise<void>;

export interface ClientOptions {
    clientId: string;
    apiKey: string;
    connection?: AbstractConnection;
    redisOptions?: RedisClientOptions;
    onMessage?: ClientMessageHandler;
}

export interface LockerOptions {
    expiration?: number;
    redisClient?: RedisClient;
    lockName: string;
}
