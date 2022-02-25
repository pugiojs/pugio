export interface ChunkStatus {
    total: number;
    succeeded: number;
    failed: number;
    waiting: number;
}

export interface SenderOptions {
    id: string;
    file: Uint8Array;
    chunkSize?: number;
    maximumRetryTimes?: number;
    concurrency?: boolean;
    sender: (index: number, chunkCount: number, chunkContent: string) => boolean | Promise<boolean>;
    onStatusChange?: (status: ChunkStatus) => void | Promise<void>;
    onError?: (error: Error) => void | Promise<void>;
}

export interface FinishReceiveData {
    pathname: string;
    content: Uint8Array;
}
export type FinishReceiveHandler = (data: FinishReceiveData) => void | Promise<void>;

export interface ReceiverOptions {
    id: string;
    chunkCount: number;
    pathname: string;
    onFinish: FinishReceiveHandler;
    onStatusChange?: (status: ChunkStatus) => void | Promise<void>;
}
