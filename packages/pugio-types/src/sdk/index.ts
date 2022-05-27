import { Method } from 'axios';
import {
    ClientMessageHandler,
    ClientOptions,
} from '../client';

export interface SDKManagerBaseOptions {
    hostname?: string;
    apiVersion?: number;
    onMessage?: ClientMessageHandler;
    onError?: ErrorHandler;
}

export interface SDKManagerOptions extends SDKManagerBaseOptions {
    headers?: Record<string, string>;
}

export type ErrorHandler = (error: Error) => void;
export interface SDKManagerError {
    statusCode: number;
    message: string;
}
export interface SDKManagerResponseData<T> {
    response?: T;
    error?: SDKManagerError;
}

export interface ClientManagerOptions extends SDKManagerBaseOptions {
    clientKey?: string;
}

export type ClientManagerResponse<T> = Promise<SDKManagerResponseData<T>>;

export interface ClientManagerResponseBaseUnit {
    createdAt?: string;
    updatedAt?: string;
}

export interface GetClientDetailResponse extends ClientManagerResponseBaseUnit {
    id: string;
    name: string;
    description: string;
    verified: boolean;
    version: string;
}

export interface GetUserProfileResponse extends ClientManagerResponseBaseUnit {
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

export interface MakeChallengeResponse extends ConnectedResponse, ClientManagerResponseBaseUnit {
    credential: string;
}

export interface ConnectedRequest {
    credential: string;
}

export interface ConnectedResponse extends ClientManagerResponseBaseUnit {
    clientInfo: {
        flags: string[];
        commands: string;
        keys: string[];
        channels: string[];
    };
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
    system?: string;
}

export interface ReportClientStatusResponse extends ClientManagerResponseBaseUnit {
    id: string;
    status: number;
    client: GetClientDetailResponse;
    reporter: GetUserProfileResponse;
}

export interface PushChannelGatewayRequest<T> {
    eventId: string;
    data: T;
}

export interface PushChannelGatewayResponse extends ClientManagerResponseBaseUnit {
    accepted: boolean;
}

export interface GetChannelDetailRequest {
    channelId: string
}

export interface GetChannelDetailResponse extends ClientManagerResponseBaseUnit {
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

export interface GetChannelClientRelationResponse extends ClientManagerResponseBaseUnit {
    id: string;
    client: GetClientDetailResponse;
    channel: GetChannelDetailResponse;
};

export interface AddChannelToClientRequest {
    channelId: string;
    clientId: string;
}

export interface AddChannelToClientResponse extends ClientManagerResponseBaseUnit {
    id: string;
}

export interface RemoveChannelFromClientRequest {
    channelId: string;
    clientId: string;
}

export interface RemoveChannelFromClientResponse extends ClientManagerResponseBaseUnit {
    id: string;
}

export interface RequestChannelAPIRequest {
    channelId?: string;
    pathname?: string;
    method?: Method;
    data?: Record<string, any>;
    query?: Record<string, any>;
}

export type RequestChannelAPIResponse<T = any> = T;

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

export interface ChannelManagerOptions extends SDKManagerBaseOptions {
    channelId?: string;
    channelKey?: string;
}

export type ChannelManagerResponse<T> = Promise<SDKManagerResponseData<T>>;

export interface MakeChannelRequestRequest<T = any> {
    clientId: string;
    data?: T;
}

export interface MakeChannelRequestResponse<T = any> {
    requestId: string;
    errored: boolean;
    data: T;
}
