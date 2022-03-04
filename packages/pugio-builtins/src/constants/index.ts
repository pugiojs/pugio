import * as os from 'os';
import * as path from 'path';

export const dataDir = path.resolve(os.homedir(), '.pugio');
export const pidFile = 'pugio.pid';
export const configFile = 'config.json';
export const channelListFile = 'channels.list';

export const maps = {
    cliToClient: {
        clientId: 'client.id',
        apiKey: 'client.apiKey',
        hostname: 'sdk.hostname',
        apiVersion: 'sdk.apiVersion',
        'redisOptions.pollTimerGap': 'connection.pollTimerGap',
        'redisOptions.port': 'connection.port',
        'redisOptions.hostname': 'connection.hostname',
    } as Record<string, string>,
};

export const pathResolveKeyList = [
    'client.publicKey',
    'client.privateKey',
];
