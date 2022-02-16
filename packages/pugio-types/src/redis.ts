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
    hostname?: string;
    port?: number;
    pollTimerGap?: number;
    onClientReady?: RedisClientReadyHandler;
    onError?: RedisErrorHandler;
}
