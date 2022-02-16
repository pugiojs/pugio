import 'reflect-metadata';
import { Service } from 'typedi';
import NodeRSA from 'node-rsa';
import CryptoJS from 'crypto-js';
import _ from 'lodash';
import {
    DataType,
    CaseStyleType,
} from '@pugio/types';
import cluster from 'cluster';
import * as child_process from 'child_process';
import * as fs from 'fs-extra';

@Service()
export class UtilsService {
    public async sleep(timeout = 500) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(undefined);
            }, timeout);
        });
    };

    public decryptTaskAesKey(encryptedAesKey: string, privateKey: string) {
        const rsaKeyPair = new NodeRSA({
            b: 1024,
        }).importKey(privateKey, 'pkcs8-private-pem');
        const decryptedAesKey = rsaKeyPair.decrypt(encryptedAesKey, 'base64');
        return Buffer.from(decryptedAesKey, 'base64').toString();
    }

    public decryptExecutionData(executionData: string, aesKey: string) {
        return CryptoJS
            .AES
            .decrypt(executionData, aesKey)
            .toString(CryptoJS.enc.Utf8);
    }

    public encryptExecutionResultContent(content: string, aesKey: string) {
        return CryptoJS
            .AES
            .encrypt(content, aesKey)
            .toString();
    }

    public transformCaseStyle = <T extends DataType, R extends T | DataType>(
        data: Partial<T>,
        targetCaseStyleType: CaseStyleType,
    ): R => {
        if (_.isNumber(data) && data === 0) {
            return data as any;
        }

        if (_.isBoolean(data)) {
            return data as any;
        }

        if (!data) {
            return null;
        }

        if (_.isDate(data)) {
            return data as R;
        }

        if (_.isArray(data)) {
            return data.map((currentArrayItem) => {
                if (_.isObject(currentArrayItem) || _.isObjectLike(currentArrayItem)) {
                    return this.transformCaseStyle(currentArrayItem, targetCaseStyleType);
                } else if (_.isArray(currentArrayItem)) {
                    return this.transformCaseStyle(currentArrayItem, targetCaseStyleType);
                } else {
                    return currentArrayItem;
                }
            }) as R;
        }

        if (_.isObject(data) || _.isObjectLike(data)) {
            return Object.keys(data).reduce((result, legacyKeyName) => {
                let currentKeyName: string;

                switch (targetCaseStyleType) {
                    case 'camel': {
                        currentKeyName = _.camelCase(legacyKeyName);
                        break;
                    }
                    case 'kebab': {
                        currentKeyName = _.kebabCase(legacyKeyName);
                        break;
                    }
                    case 'snake': {
                        currentKeyName = _.snakeCase(legacyKeyName);
                        break;
                    }
                    default:
                        currentKeyName = legacyKeyName;
                        break;
                }

                result[currentKeyName] = this.transformCaseStyle(data[legacyKeyName], targetCaseStyleType);

                return result;
            }, {} as R);
        }

        if (_.isPlainObject(data) || _.isString(data)) {
            return _.cloneDeep<R>(data as R);
        }

        return data;
    };

    public transformDAOToDTO<DAOType, DTOType>(daoData: Partial<DAOType>): DTOType {
        return this.transformCaseStyle<DAOType, DTOType>(daoData, 'camel');
    }

    public transformDTOToDAO<DTOType, DAOType>(dtoData: Partial<DTOType>): DAOType {
        return this.transformCaseStyle<DTOType, DAOType>(dtoData, 'snake');
    }

    public generateClientKey(apiKey: string, clientId: string) {
        return Buffer.from(`${apiKey}:${clientId}`).toString('base64');
    }

    public async daemonize(script: string, args: string[] = [], options: child_process.ForkOptions = {}) {
        const child = child_process.fork(script, args, {
            stdio: 'ignore',
            ...options,
            detached: true,
        });
        child.unref();
        return child;
    }

    public async keepalive(callbackFn: () => any | Promise<any>) {
        if (
            (_.isBoolean(cluster.isPrimary) && cluster.isPrimary) ||
            (_.isBoolean(cluster.isMaster) && cluster.isMaster)
        ) {
            cluster.fork();

            cluster.on('exit', () => {
                cluster.fork();
            });
        }

        if (cluster.isWorker && _.isFunction(callbackFn)) {
            await callbackFn();
        }
    }

    public ensureDataDir(dirname: string) {
        if (!fs.existsSync(dirname)) {
            fs.mkdirpSync(dirname);
        }

        if (fs.statSync(dirname).isFile()) {
            fs.removeSync(dirname);
            fs.mkdirpSync(dirname);
        }
    }

    public permanentlyReadFileSync(pathname: string): string {
        if (
            !_.isString(pathname) ||
            !fs.existsSync(pathname) ||
            !fs.statSync(pathname).isFile()
        ) {
            return null;
        }

        try {
            return fs.readFileSync(pathname).toString();
        } catch (e) {
            return null;
        }
    }

    public transformURLSearchParamsToObject(params: URLSearchParams): Record<string, any> {
        const result = {};
        for(const [key, value] of params.entries()) {
            result[key] = value;
        }
        return result;
    }
}
