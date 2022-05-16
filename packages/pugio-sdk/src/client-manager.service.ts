import 'reflect-metadata';
import { Service } from 'typedi';
import { RequestService } from '@pugio/request';
import {
    AddChannelToClientRequest,
    AddChannelToClientResponse,
    ClientManagerOptions,
    ClientManagerResponse,
    ConnectedRequest,
    ConnectedResponse,
    GetChannelClientRelationRequest,
    GetChannelClientRelationResponse,
    GetChannelDetailRequest,
    GetChannelDetailResponse,
    GetClientDetailResponse,
    MakeChallengeRequest,
    MakeChallengeResponse,
    PushChannelGatewayRequest,
    PushChannelGatewayResponse,
    PushChannelResponseRequest,
    PushChannelResponseResponse,
    RemoveChannelFromClientRequest,
    RemoveChannelFromClientResponse,
    ReportClientStatusRequest,
    ReportClientStatusResponse,
    RequestChannelAPIRequest,
    RequestChannelAPIResponse,
    SDKManagerResponseData,
} from '@pugio/types';
import * as _ from 'lodash';
import { UtilsService } from '@pugio/utils';
import { AbstractManagerService } from './manager.abstract';

@Service()
export class ClientManagerService extends AbstractManagerService implements AbstractManagerService {
    protected options: ClientManagerOptions;

    public constructor(requestService: RequestService, utilsService: UtilsService) {
        super(requestService, utilsService);
    }

    public initialize(options: ClientManagerOptions = {}) {
        this.options = options;

        const {
            clientKey,
            ...otherOptions
        } = this.options;

        super.initialize.call(this, {
            ...otherOptions,
            headers: {
                'CLIENT-KEY': clientKey,
            },
        });
    }

    public async makeChallenge(options: MakeChallengeRequest): ClientManagerResponse<MakeChallengeResponse> {
        return await this.requestService
            .getInstance()
            .request({
                method: 'post',
                url: '/client/challenge',
                data: options,
            });
    }

    public async connected(options: ConnectedRequest): ClientManagerResponse<ConnectedResponse> {
        return await this.requestService
            .getInstance()
            .request({
                method: 'post',
                url: '/client/connected',
                data: options,
            });
    }

    public async pushChannelResponse(options: PushChannelResponseRequest): ClientManagerResponse<PushChannelResponseResponse> {
        const {
            requestId,
            data,
            errored,
        } = options;

        return await this.requestService
            .getInstance()
            .request({
                method: 'post',
                url: `/client/channel_response/${requestId}`,
                data: {
                    data,
                    errored,
                },
            });
    }

    public async reportClientStatus(options: ReportClientStatusRequest): ClientManagerResponse<ReportClientStatusResponse> {
        return await this.requestService
            .getInstance()
            .request({
                method: 'post',
                url: '/client_status',
                data: options,
            });
    }

    public async pushChannelGateway<T>(options: PushChannelGatewayRequest<T>): ClientManagerResponse<PushChannelGatewayResponse> {
        return await this.requestService
            .getInstance()
            .request({
                method: 'post',
                url: `/client/channel_gateway/${options.eventId}`,
                data: {
                    data: options.data || '',
                },
            });
    }

    public async getClientDetail(): ClientManagerResponse<GetClientDetailResponse> {
        return await this.requestService
            .getInstance()
            .request({
                method: 'get',
                url: '/client/info',
            });
    }

    public async getChannelDetail(options: GetChannelDetailRequest): ClientManagerResponse<GetChannelDetailResponse> {
        return await this.requestService
            .getInstance()
            .request({
                method: 'get',
                url: `/channel/${options.channelId}/detail`,
            });
    }

    public async getChannelClientRelation(options: GetChannelClientRelationRequest): ClientManagerResponse<GetChannelClientRelationResponse> {
        const { channelId, clientId } = options;

        return await this.requestService
            .getInstance()
            .request({
                method: 'get',
                url: `/channel/${channelId}/client`,
                query: { clientId },
            });
    }

    public async addChannelToClient(options: AddChannelToClientRequest): ClientManagerResponse<AddChannelToClientResponse> {
        const { channelId, clientId } = options;

        return await this.requestService
            .getInstance()
            .request({
                method: 'post',
                url: `/channel/${channelId}/client`,
                data: { clientId },
            });
    }

    public async removeChannelFromClient(options: RemoveChannelFromClientRequest): ClientManagerResponse<RemoveChannelFromClientResponse> {
        const { channelId, clientId } = options;

        return await this.requestService
            .getInstance()
            .request({
                method: 'delete',
                url: `/channel/${channelId}/client`,
                data: { clientId },
            });
    }

    public async requestChannelApi<T = any>(options: RequestChannelAPIRequest): ClientManagerResponse<RequestChannelAPIResponse<T>> {
        const {
            channelId,
            pathname,
            method,
            data = {},
            query = {},
        } = options;

        const responseData = (await this.requestService.getInstance().request({
            method: 'post',
            url: `/channel/${channelId}/api`,
            data: {
                pathname,
                method,
                data,
                query,
            },
        })) as SDKManagerResponseData<RequestChannelAPIResponse<T>>;

        return {
            response: _.get(responseData, 'response.response'),
            error: _.get(responseData, 'response.error') || _.get(responseData, 'error'),
        };
    }
}

export class ClientManager extends ClientManagerService {
    public constructor(options: ClientManagerOptions = {}) {
        super(
            new RequestService(),
            new UtilsService(),
        );

        this.initialize(options);
    }
}
