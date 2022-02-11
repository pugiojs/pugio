export interface ExecutionTask {
    id: string;
    aesKey: string;
    executionCwd: string;
    executionData: string;
}

export interface ExecutionResult {
    taskId: string;
    data: string;
}

export type ExecutionResultHandler = (result: ExecutionResult, error: Error) => void;

export interface ExecutionOptions {
    onExecutionResult?: ExecutionResultHandler;
}
