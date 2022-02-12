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

    public initialize(
        options: RequestOptions = {},
        instanceModifier?: (instance: Axios) => void,
    ) {
        const {
            clientKey = '',
            requestConfig = {},
            messageHandler = _.noop,
        } = options;

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
            (response) => {
                console.log('LENCONDA:response', response.status);
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

        if (_.isFunction(instanceModifier)) {
            instanceModifier(this.instance);
        }
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
