import 'reflect-metadata';
import { Service } from 'typedi';
import { RequestService } from '@pugio/request';
import {
    MakeChallengeResponse,
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
                    } else {
                        data.response = responseContent;
                    }

                    return data;
                });
            },
        );
    }

    public async makeChallenge(deviceId: string): SDKResponse<MakeChallengeResponse> {
        return await this.requestService
            .getInstance()
            .post('/client/challenge', {
                deviceId,
            });
    }
}
