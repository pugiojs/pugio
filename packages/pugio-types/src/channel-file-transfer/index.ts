import { ChannelRequest } from '../sdk';

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
