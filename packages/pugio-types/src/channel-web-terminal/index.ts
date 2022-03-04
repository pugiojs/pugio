export interface TerminalChannelRequestBaseData {
    type: string;
}

export type TerminalChannelHandshakeRequestData = TerminalChannelRequestBaseData;

export interface TerminalChannelConnectRequestData extends TerminalChannelRequestBaseData {
    id: string;
    dieTimeout?: number;
    args?: string[];
    rows?: number;
    cols?: number;
    cwd?: string;
    env?: Record<string, string>;
}

export type TerminalChannelConfig = Required<Pick<TerminalChannelConnectRequestData, 'dieTimeout'>>;

export interface TerminalChannelDataRequestData extends TerminalChannelRequestBaseData {
    id: string;
    sequence: number;
    data?: string;
}

export interface TerminalChannelCloseRequestData extends TerminalChannelRequestBaseData {
    id: string;
}

export type TerminalChannelRequestData = TerminalChannelHandshakeRequestData
    | TerminalChannelConnectRequestData
    | TerminalChannelDataRequestData
    | TerminalChannelCloseRequestData;

export interface TerminalChannelHandshakeResponseData {
    id: string;
}

export interface TerminalChannelConnectResponseData {
    accepted: boolean;
    content?: string[];
    error?: string;
}

export type TerminalChannelDataResponseData = Omit<TerminalChannelConnectResponseData, 'content'>;
export type TerminalChannelCloseResponseData = TerminalChannelConnectResponseData;

export type TerminalChannelResponseData = TerminalChannelHandshakeResponseData
    | TerminalChannelConnectResponseData
    | TerminalChannelDataResponseData
    | TerminalChannelCloseResponseData;

export type TerminalStatus = 'running' | 'destroyed' | 'waiting';
