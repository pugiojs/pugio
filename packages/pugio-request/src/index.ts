import 'reflect-metadata';
import { Axios } from 'axios';
import { Service } from 'typedi';
import {
    RequestOptions,
    ResponseGetInstanceOptions,
} from '@pugio/types';
import * as _ from 'lodash';

@Service()
export class RequestService {
    protected instance: Axios;

    public constructor(
        protected readonly options: RequestOptions = {},
    ) {
        const {
            clientKey = '',
            requestConfig = {},
            messageHandler = _.noop,
        } = this.options;

        this.instance = new Axios({
            responseEncoding: 'utf8',
            responseType: 'json',
            transformResponse: (response) => response,
            ...requestConfig,
        });

        this.instance.interceptors.request.use((config) => {
            return _.set(config, 'headers[CLIENT-KEY]', clientKey);
        });

        this.instance.interceptors.response.use(
            (response) => {
                return response.data || response;
            },
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
    }

    public getInstance(options: ResponseGetInstanceOptions = {}) {
        const { json = true } = options;
        const currentInstance = _.cloneDeep(this.instance);

        if (json) {
            currentInstance.interceptors.response.use((response: any) => {
                try {
                    return JSON.parse(response);
                } catch (e) {
                    return response;
                }
            });
        }

        return currentInstance;
    }
}
