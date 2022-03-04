import { ExecutionTask } from '../execution';
import {
    ClientMessageHandler,
    ClientOptions,
} from '../client';

export type SDKErrorHandler = (error: Error) => void;

export interface SDKOptions {
    clientKey?: string;
    hostname?: string;
    apiVersion?: number;
    onMessage?: ClientMessageHandler;
    onError?: SDKErrorHandler;
}

export type SDKResponse<T> = Promise<SDKResponseData<T>>;

export interface SDKError {
    statusCode: number;
    message: string;
}

export interface SDKResponseData<T> {
    response?: T;
    error?: SDKError;
}

export interface SDKResponseBaseUnit {
    createdAt?: string;
    updatedAt?: string;
}

export interface GetClientDetailResponse extends SDKResponseBaseUnit {
    id: string;
    name: string;
    description: string;
    verified: boolean;
    version: string;
}

export interface GetUserProfileResponse extends SDKResponseBaseUnit {
    id: string;
    openId: string;
    email: string;
    picture?: string;
    fullName?: string;
    firstName?: string;
    middleName?: string;
    lastName?: string;
    active: boolean;
    verified: boolean;
}

export interface MakeChallengeRequest {
    version?: string;
    deviceId: string;
}

export interface MakeChallengeResponse extends ConnectedResponse, SDKResponseBaseUnit {
    credential: string;
}

export interface ConnectedRequest {
    credential: string;
}

export interface ConnectedResponse extends SDKResponseBaseUnit {
    clientInfo: {
        flags: string[];
        commands: string;
        keys: string[];
        channels: string[];
    };
}

export interface ConsumeExecutionTaskRequest {
    all?: number;
    lockPass?: string;
}

export type ConsumeExecutionTaskResponse = Array<ExecutionTask & SDKResponseBaseUnit>;

export interface PushExecutionRecordRequest {
    taskId: string;
    sequence?: number;
    status?: number;
    content?: string;
}

export interface PushExecutionRecordResponse extends SDKResponseBaseUnit {
    id: string;
}

export interface PushChannelResponseRequest {
    requestId: string;
    data?: any;
    errored?: boolean;
}

export interface PushChannelResponseResponse {
    accepted: boolean;
}

export interface ReportClientStatusRequest {
    plaintext: string;
    cipher: string;
}

export interface ReportClientStatusResponse extends SDKResponseBaseUnit {
    id: string;
    status: number;
    client: GetClientDetailResponse;
    reporter: GetUserProfileResponse;
}

export interface PushChannelGatewayRequest<T> {
    eventId: string;
    data: T;
}

export interface PushChannelGatewayResponse extends SDKResponseBaseUnit {
    accepted: boolean;
}

export interface GetChannelDetailRequest {
    channelId: string
}

export interface GetChannelDetailResponse extends SDKResponseBaseUnit {
    id: string;
    name: string;
    description: string;
    packageName: string;
    bundleUrl: string;
    registry: string;
    avatar?: string;
}

export interface GetChannelClientRelationRequest {
    channelId: string;
    clientId: string;
}

export interface GetChannelClientRelationResponse extends SDKResponseBaseUnit {
    id: string;
    client: GetClientDetailResponse;
    channel: GetChannelDetailResponse;
};

export interface AddChannelToClientRequest {
    channelId: string;
    clientId: string;
}

export interface AddChannelToClientResponse extends SDKResponseBaseUnit {
    id: string;
}

export interface RemoveChannelFromClientRequest {
    channelId: string;
    clientId: string;
}

export interface RemoveChannelFromClientResponse extends SDKResponseBaseUnit {
    id: string;
}

export interface ChannelRequest<T> {
    id: string;
    scope: string;
    options: T;
}

export type ChannelClientConfig = Required<Omit<ClientOptions,
    'onMessage' |
    'channelList' |
    'publicKey' |
    'privateKey'
>>;

export interface ChannelOptions<H> {
    clientConfig: ChannelClientConfig;
    channelRequestHandlers?: H[];
    messageHandler: ClientMessageHandler;
}
