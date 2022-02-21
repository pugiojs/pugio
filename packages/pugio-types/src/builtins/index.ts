export interface ChannelRequest<T> {
    id: string;
    scope: string;
    options: T;
}

export interface FileChannelRequestBaseData {
    action: string;
}

export interface FileChannelUploadRequestData extends FileChannelRequestBaseData {
    chunkCount: number;
    chunkData: string;
}
export interface FileChannelReaddirRequestData extends FileChannelRequestBaseData {
    pathname: string;
}
export interface FileChannelMoveRequestData extends FileChannelRequestBaseData {
    source: string;
    destination: string;
}
export type FileChannelDeleteRequestData = FileChannelReaddirRequestData;
export type FileChannelDownloadRequestData = FileChannelReaddirRequestData;

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
    chunkCount: number;
    chunkData: string;
}

export type FileChannelResponse = FileChannelUploadResponse
    | FileChannelReaddirResponse
    | FileChannelMoveRequestData
    | FileChannelDeleteResponse
    | FileChannelDownloadResponse;

export interface FileListItem {
    pathname: string;
    chunkCount: number;
    chunks: string[];
}
