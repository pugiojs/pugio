import 'reflect-metadata';
import {
    Axios,
    AxiosResponse,
} from 'axios';
import Container, { Service } from 'typedi';
import {
    RequestConfig,
    RequestOptions,
    ResponseGetInstanceOptions,
} from '@pugio/types';
import {
    UtilsService,
} from '@pugio/utils';
import * as _ from 'lodash';
import * as querystring from 'querystring';

const utilsService = Container.get(UtilsService);

export class Request extends Axios {
    public request<T = any, R = AxiosResponse<T>, D = any>(config: RequestConfig<D> = {}): Promise<R> {
        const { query = {}, url = '' } = config;
        config.query = utilsService.transformDTOToDAO(query);
        const [pathname, urlSearch = ''] = url.split('?');
        const urlSearchParams = utilsService.transformURLSearchParamsToObject(new URLSearchParams(urlSearch));

        const queryObject = {
            ...urlSearchParams,
            ...query,
        };

        const newUrl = pathname +
            (
                Object.keys(queryObject).length > 0
                    ? `?${querystring.stringify(utilsService.transformDTOToDAO(queryObject))}`
                    : ''
            );

        config.url = newUrl;

        return super.request.call(this, _.omit(config, 'query'));
    };
}

@Service()
export class RequestService {
    protected instance: Request;
    private json: boolean;
    private transformCase: boolean;

    public constructor(
        private readonly utilsService: UtilsService = new UtilsService(),
    ) {}

    public initialize(
        options: RequestOptions = {},
        instanceModifier?: (instance: Request) => void,
    ) {
        const {
            headers = {},
            requestConfig = {},
            json = true,
            transformCase = false,
            messageHandler = _.noop,
        } = options;

        this.json = json;
        this.transformCase = transformCase;

        this.instance = new Request({
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
                    'Content-Type': 'application/json',
                    ...headers,
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
        const {
            json: getInstanceJson = this.json,
            ...otherOptions
        } = options;

        const axiosOptions = otherOptions || {};
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

        if (Object.keys(axiosOptions).length > 0) {
            Object.keys(axiosOptions).forEach((key) => {
                currentInstance.defaults[key] = axiosOptions[key];
            });
        }

        return currentInstance;
    }
}
