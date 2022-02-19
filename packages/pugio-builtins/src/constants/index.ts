import { ClientOptions } from '@pugio/types';
import * as os from 'os';
import * as path from 'path';

export const dataDir = path.resolve(os.homedir(), '.pugio');
export const pidFile = 'pugio.pid';
export const configFile = 'config.json';

export const maps = {
    cliToClient: {
        clientId: 'client.id',
        apiKey: 'client.apiKey',
        hostname: 'sdk.hostname',
        apiVersion: 'sdk.apiVersion',
        'redisOptions.pollTimerGap': 'connection.pollTimerGap',
        'redisOptions.port': 'connection.port',
        'redisOptions.hostname': 'connection.hostname',
    } as Record<keyof Omit<ClientOptions, 'onMessage' | 'redisOptions' | 'publicKey' | 'privateKey'>, string> & Record<string, string>,
};

export const pathResolveKeyList = [
    'client.publicKey',
    'client.privateKey',
];
