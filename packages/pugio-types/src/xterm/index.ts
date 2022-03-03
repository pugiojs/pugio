import { ITerminalOptions } from 'xterm';

export interface XTermTerminalWriteData {
    sequence: number;
    content: string | Uint8Array;
}

export interface XTermTerminalOptions<T extends Record<string, any>> extends ITerminalOptions {
    data?: T;
}
