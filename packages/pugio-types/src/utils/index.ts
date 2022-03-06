import { Spinner } from 'cli-spinners';

export type DataType = Array<any> | Object | string | Date;
export type CaseStyleType = 'snake' | 'camel' | 'kebab';

export type KeepAliveExitHandler = () => any | Promise<any>;
export type KeepAliveCallbackFunction = () => any | Promise<any>;

export interface ChannelRequestHandlerConfigItem {
    name: string;
    type: string;
    path: string;
    scopeId?: string;
}

export interface LoadingLogOptions {
    text: string;
    spinner?: Spinner;
    successIcon?: string;
    warnIcon?: string;
    errorIcon?: string;
}

export interface LoadingLogHandler {
    success: (text?: string) => void;
    warn: (text?: string) => void;
    error: (text?: string) => void;
}
