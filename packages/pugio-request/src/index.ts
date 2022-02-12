import 'reflect-metadata';
import { Axios } from 'axios';
import { Service } from 'typedi';
import {
    RequestOptions,
    ResponseGetInstanceOptions,
} from '@pugio/types';
import {
    UtilsService,
} from '@pugio/utils';
import * as _ from 'lodash';

@Service()
export class RequestService {
    protected instance: Axios;
    private json: boolean;
    private transformCase: boolean;

    public constructor(
        private readonly utilsService: UtilsService,
    ) {}

    public initialize(
        options: RequestOptions = {},
        instanceModifier?: (instance: Axios) => void,
    ) {
        const {
            clientKey = '',
            requestConfig = {},
            json = true,
            transformCase = false,
            messageHandler = _.noop,
        } = options;

        this.json = json;
        this.transformCase = transformCase;

        this.instance = new Axios({
            responseEncoding: 'utf8',
            responseType: 'json',
            transformRequest: [
                (data) => {
                    if (_.isString(data)) {
                        return data;
                    }

                    if (_.isObject(data) || _.isObjectLike(data)) {
                        try {
                            return JSON.stringify(data);
                        } catch (e) {
                            return '';
                        }
                    }

                    return data;
                },
            ],
            ...requestConfig,
        });

        this.instance.interceptors.request.use((config) => {
            return _.merge(config, {
                headers: {
                    'CLIENT-KEY': clientKey,
                    'Content-Type': 'application/json',
                },
            });
        });

        this.instance.interceptors.response.use(
            null,
            (error) => {
                let message = '';
                if (!error) {
                    message = 'Unknown client error';
                } else {
                    message = error.message || error.toString();
                }
                messageHandler({
                    level: 'error',
                    data: message,
                });
            },
        );

        if (_.isFunction(instanceModifier)) {
            instanceModifier(this.instance);
        }
    }

    public getInstance(options: ResponseGetInstanceOptions = {}) {
        const { json: getInstanceJson = this.json } = options;
        const currentInstance = _.cloneDeep(this.instance);

        if (getInstanceJson) {
            const requestTransformers = currentInstance.defaults.transformRequest || [];
            const responseTransformers = currentInstance.defaults.transformResponse || [];

            currentInstance.defaults.transformResponse = [
                ...(
                    _.isArray(responseTransformers)
                        ? responseTransformers
                        : [responseTransformers]
                ),
                (data) => {
                    try {
                        return JSON.parse(data);
                    } catch (e) {
                        return data;
                    }
                },
                ...(
                    this.transformCase
                        ? [
                            (data) => {
                                return this.utilsService.transformDAOToDTO(data);
                            },
                        ]
                        : []
                ),
            ];

            currentInstance.defaults.transformRequest = [
                ...(
                    _.isArray(requestTransformers)
                        ? requestTransformers
                        : [requestTransformers]
                ),
                ...(
                    this.transformCase
                        ? [
                            (data) => {
                                return this.utilsService.transformDTOToDAO(data);
                            },
                        ]
                        : []
                ),
            ];
        }

        return currentInstance;
    }
}
