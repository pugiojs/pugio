import {
    RedisScripts,
    RedisClientType,
    RedisModules,
    RedisClientOptions as OriginalRedisClientOptions,
} from 'redis';

export type RedisClient = RedisClientType<any, RedisScripts>;

export type RedisClientReadyHandler = (client: RedisClient) => Promise<void>;
export type RedisErrorHandler = (error: Error) => Promise<void>;

export type RedisClientOptions = OriginalRedisClientOptions<RedisModules, RedisScripts>;

export interface RedisConnectionOptions extends RedisClientOptions {
    pollTimerGap?: number;
    onClientReady?: RedisClientReadyHandler;
    onError?: RedisErrorHandler;
}

// ====== Pugio Types =====

export type ClientMessageLevel = 'info' | 'warn' | 'error';

export interface ClientMessage {
    level: ClientMessageLevel;
    data: string;
}

export type ClientMessageHandler = (message: ClientMessage) => void | Promise<void>;

export interface ClientOptions {
    clientId: string;
    apiKey: string;
    redis: RedisClientOptions;
    locker?: Omit<LockerOptions, 'redisClient' | 'lockName'>;
    onMessage?: ClientMessageHandler;
}

export interface LockerOptions {
    expiration?: number;
    redisClient?: RedisClient;
    lockName: string;
}
