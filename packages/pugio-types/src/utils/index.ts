export type DataType = Array<any> | Object | string | Date;
export type CaseStyleType = 'snake' | 'camel' | 'kebab';

export type KeepAliveExitHandler = () => any | Promise<any>;
export type KeepAliveCallbackFunction = () => any | Promise<any>;

export interface ChannelRequestHandlerConfigItem {
    name: string;
    filename: string;
}
