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
    ConsumeExecutionTaskRequest,
    ConsumeExecutionTaskResponse,
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
    PushExecutionRecordRequest,
    PushExecutionRecordResponse,
    RemoveChannelFromClientRequest,
    RemoveChannelFromClientResponse,
    ReportClientStatusRequest,
    ReportClientStatusResponse,
} from '@pugio/types';
import _ from 'lodash';
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

    public async consumeExecutionTask(options: ConsumeExecutionTaskRequest = {}): ClientManagerResponse<ConsumeExecutionTaskResponse> {
        return await this.requestService
            .getInstance()
            .request({
                method: 'get',
                url: '/task/consume',
                query: options,
            });
    }

    public async pushExecutionRecord(options: PushExecutionRecordRequest): ClientManagerResponse<PushExecutionRecordResponse> {
        const {
            taskId,
            ...data
        } = options;

        return await this.requestService
            .getInstance()
            .request({
                method: 'post',
                url: `/task/${taskId}/execution`,
                data,
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
                data: options.data,
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
}
