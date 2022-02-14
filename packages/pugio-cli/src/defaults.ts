import * as os from 'os';
import * as path from 'path';

export const dataDir = path.resolve(os.homedir(), '.pugio');
export const pidFile = 'pugio.pid';
export const configFile = 'config.json';
