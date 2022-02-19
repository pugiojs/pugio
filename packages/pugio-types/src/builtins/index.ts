export interface ChannelRequest<T> {
    id: string;
    scope: string;
    options: T;
}

export interface FileChannelRequestData {
    pathname: string;
}

export type FileChannelRequest = ChannelRequest<FileChannelRequestData>;
export type FileChannelResult = any[];
