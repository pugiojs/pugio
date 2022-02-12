import 'reflect-metadata';
import { Service } from 'typedi';
import { RequestService } from '@pugio/request';
import {
    MakeChallengeResponse,
    SDKOptions,
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
                requestConfig: {
                    baseURL: `https://${hostname}/api/v${apiVersion}`,
                },
                messageHandler: _.isFunction(messageHandler) ? messageHandler : _.noop,
            },
            (instance) => {
                const defaultRequestTransformers = instance.defaults.transformRequest || [];
                const defaultResponseTransformers = instance.defaults.transformResponse || [];

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

                instance.defaults.transformResponse = [
                    (data) => {
                        return this.utilsService.transformDAOToDTO(data);
                    },
                    ...(
                        _.isArray(defaultResponseTransformers)
                            ? defaultResponseTransformers
                            : [defaultResponseTransformers]
                    ),
                ];
            },
        );
    }

    public async makeChallenge(deviceId: string): Promise<MakeChallengeResponse> {
        return await this.requestService
            .getInstance()
            .post('/client/challenge', {
                deviceId,
            });
    }
}
