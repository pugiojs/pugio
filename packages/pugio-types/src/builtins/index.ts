export interface ChannelRequest<T> {
    id: string;
    scope: string;
    options: T;
}

export interface FileChannelRequestBaseData {
    action: string;
}

export interface FileChannelUploadRequestData extends FileChannelRequestBaseData {
    id: string;
    pathname: string;
    index: number;
    chunkCount: number;
    chunkContent: string;
    md5: string;
}
export interface FileChannelReaddirRequestData extends FileChannelRequestBaseData {
    pathname: string;
}
export interface FileChannelMoveRequestData extends FileChannelRequestBaseData {
    source: string;
    destination: string;
}
export type FileChannelDeleteRequestData = FileChannelReaddirRequestData;
export interface FileChannelDownloadRequestData extends FileChannelReaddirRequestData {
    chunkSize?: number;
};

export type FileChannelRequestData = FileChannelUploadRequestData
    | FileChannelReaddirRequestData
    | FileChannelMoveRequestData
    | FileChannelDeleteRequestData
    | FileChannelDownloadRequestData;

export type FileChannelRequest = ChannelRequest<FileChannelRequestData>;

export type FileChannelReaddirResponse = any[];
export interface FileChannelUploadResponse {
    done: boolean;
}
export type FileChannelMoveResponse = FileChannelUploadResponse;
export type FileChannelDeleteResponse = FileChannelUploadResponse;
export interface FileChannelDownloadResponse {
    id: string;
}

export type FileChannelResponse = FileChannelUploadResponse
    | FileChannelReaddirResponse
    | FileChannelMoveResponse
    | FileChannelDeleteResponse
    | FileChannelDownloadResponse;

export interface FileListItem {
    pathname: string;
    chunkCount: number;
    chunks: string[];
}

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
