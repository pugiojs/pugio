export interface ExecutionTask {
    id: string;
    aesKey: string;
    executionCwd: string;
    executionData: string;
}

export interface ExecutionResult {
    taskId: string;
    status: number;
    data?: string;
    sequence?: number;
}

export type ExecutionResultHandler = (result: ExecutionResult) => void | Promise<void>;

export interface ExecutionOptions {
    publicKey: string;
    privateKey: string;
    onExecutionResult?: ExecutionResultHandler;
}

export interface DecryptedExecutionData {
    script?: string;
    preCommandSegment?: string;
    postCommandSegment?: string;
}

export interface SpawnData {
    error: boolean;
    sequence: number;
    content: string;
}

export type SpawnDataHandler = (spawnData: SpawnData) => void | Promise<void>;
