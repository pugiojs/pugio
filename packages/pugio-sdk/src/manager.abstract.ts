import { RequestService } from '@pugio/request';
import { SDKManagerOptions } from '@pugio/types';
import _ from 'lodash';
import { UtilsService } from '@pugio/utils';

export abstract class AbstractManagerService {
    public constructor(
        protected readonly requestService: RequestService,
        protected readonly utilsService: UtilsService,
    ) {}

    public initialize(options: SDKManagerOptions = {}) {
        const {
            headers,
            hostname = 'pugio.lenconda.top',
            apiVersion = 1,
            onMessage: messageHandler,
            onError: errorHandler,
        } = options;

        this.requestService.initialize(
            {
                headers,
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

                    if (responseStatus >= 400) {
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
}
