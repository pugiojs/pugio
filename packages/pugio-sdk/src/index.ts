import 'reflect-metadata';
import { Service } from 'typedi';
import { RequestService } from '@pugio/request';
import {
    ConnectedRequest,
    ConnectedResponse,
    ConsumeExecutionTaskRequest,
    ConsumeExecutionTaskResponse,
    MakeChallengeRequest,
    MakeChallengeResponse,
    PushChannelGatewayRequest,
    PushChannelGatewayResponse,
    PushChannelResponseRequest,
    PushChannelResponseResponse,
    PushExecutionRecordRequest,
    PushExecutionRecordResponse,
    ReportClientStatusRequest,
    ReportClientStatusResponse,
    SDKOptions,
    SDKResponse,
} from '@pugio/types';
import _ from 'lodash';
import { UtilsService } from '@pugio/utils';

@Service()
export class SDKService {
    protected options: SDKOptions;

    public constructor(
        private readonly requestService: RequestService,
        private readonly utilsService: UtilsService,
    ) {}

    public initialize(options: SDKOptions = {}) {
        this.options = options;

        const {
            clientKey,
            hostname = 'pugio.lenconda.top',
            apiVersion = 1,
            onMessage: messageHandler,
            onError: errorHandler,
        } = this.options;

        this.requestService.initialize(
            {
                clientKey,
                transformCase: true,
                requestConfig: {
                    baseURL: `https://${hostname}/api/v${apiVersion}`,
                },
                messageHandler: _.isFunction(messageHandler) ? messageHandler : _.noop,
            },
            (instance) => {
                const defaultRequestTransformers = instance.defaults.transformRequest || [];

                instance.defaults.transformRequest = [
                    (data) => {
                        return this.utilsService.transformDTOToDAO(data);
                    },
                    ...(
                        _.isArray(defaultRequestTransformers)
                            ? defaultRequestTransformers
                            : [defaultRequestTransformers]
                    ),
                ];

                instance.interceptors.response.use((response) => {
                    const responseStatus = response.status;
                    const responseContent = response.data || response;
                    const data = {
                        response: null,
                        error: null,
                    };

                    if (responseStatus >= 300) {
                        data.error = responseContent;
                        if (_.isFunction(errorHandler)) {
                            errorHandler(new Error(responseContent.message));
                        }
                    } else {
                        data.response = responseContent;
                    }

                    return data;
                });
            },
        );
    }

    public async makeChallenge(options: MakeChallengeRequest): SDKResponse<MakeChallengeResponse> {
        return await this.requestService
            .getInstance()
            .request({
                method: 'post',
                url: '/client/challenge',
                data: options,
            });
    }

    public async connected(options: ConnectedRequest): SDKResponse<ConnectedResponse> {
        return await this.requestService
            .getInstance()
            .request({
                method: 'post',
                url: '/client/connected',
                data: options,
            });
    }

    public async consumeExecutionTask(options: ConsumeExecutionTaskRequest = {}): SDKResponse<ConsumeExecutionTaskResponse> {
        return await this.requestService
            .getInstance()
            .request({
                method: 'get',
                url: '/task/consume',
                query: options,
            });
    }

    public async pushExecutionRecord(options: PushExecutionRecordRequest): SDKResponse<PushExecutionRecordResponse> {
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

    public async pushChannelResponse(options: PushChannelResponseRequest): SDKResponse<PushChannelResponseResponse> {
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

    public async reportClientStatus(options: ReportClientStatusRequest): SDKResponse<ReportClientStatusResponse> {
        return await this.requestService
            .getInstance()
            .request({
                method: 'post',
                url: '/client_status',
                data: options,
            });
    }

    public async pushChannelGateway<T>(options: PushChannelGatewayRequest<T>): SDKResponse<PushChannelGatewayResponse> {
        return await this.requestService
            .getInstance()
            .request({
                method: 'post',
                url: `/client/channel_gateway/${options.eventId}`,
                data: options.data,
            });
    }
}
