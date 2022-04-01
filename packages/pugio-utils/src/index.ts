import 'reflect-metadata';
import { Service } from 'typedi';
import NodeRSA from 'node-rsa';
import CryptoJS from 'crypto-js';
import _ from 'lodash';
import {
    KeepAliveCallbackFunction,
    KeepAliveExitHandler,
    ChannelRequestHandlerConfigItem,
    LoadingLogHandler,
    LoadingLogOptions,
} from '@pugio/types';
import cluster from 'cluster';
import * as child_process from 'child_process';
import * as fs from 'fs-extra';
import * as spinners from 'cli-spinners';
import * as readline from 'readline';
import {
    ExecOptions,
} from 'child_process';
import * as path from 'path';
import { CaseTransformerService } from '@pugio/case-transformer';

@Service()
export class UtilsService extends CaseTransformerService {
    public async sleep(timeout = 500) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(undefined);
            }, timeout);
        });
    };

    public decryptTaskAesKey(encryptedAesKey: string, privateKey: string) {
        return this.decryptContentWithRSAPrivateKey(encryptedAesKey, privateKey);
    }

    public encryptContentWithRSAPublicKey(content = '', publicKey: string) {
        const rsaKeyPair = new NodeRSA({ b: 1024 }).importKey(publicKey, 'pkcs8-public-pem');
        const encryptedContent = rsaKeyPair.encrypt(Buffer.from(content), 'base64');
        return encryptedContent;
    }

    public decryptContentWithRSAPrivateKey(encryptedContent: string, privateKey: string) {
        const rsaKeyPair = new NodeRSA({ b: 1024 }).importKey(privateKey, 'pkcs8-private-pem');
        const decryptedAesKey = rsaKeyPair.decrypt(encryptedContent, 'base64');
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

    public async keepalive(callbackFn: KeepAliveCallbackFunction, onExit?: KeepAliveExitHandler) {
        if (
            (_.isBoolean(cluster.isPrimary) && cluster.isPrimary) ||
            (_.isBoolean(cluster.isMaster) && cluster.isMaster)
        ) {
            cluster.fork();

            cluster.on('exit', async () => {
                if (_.isFunction(onExit)) {
                    await onExit();
                }
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

    public ensureChannelsDir(dirname: string) {
        if (!fs.existsSync(dirname)) {
            fs.mkdirpSync(dirname);
        }

        if (fs.statSync(dirname).isFile()) {
            fs.removeSync(dirname);
            fs.mkdirpSync(dirname);
        }

        if (!fs.existsSync(path.resolve(dirname, 'package.json'))) {
            try {
                child_process.execSync('npm init -y', { cwd: dirname });
            } catch (e) {}
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

    public parseChannelList(content = ''): ChannelRequestHandlerConfigItem[] {
        if (!content || !_.isString(content) || !content.trim()) {
            return [];
        }

        return content.trim().split('\n').map((line) => {
            const [name, scopeId, type, value] = line.split(',');
            return {
                name,
                scopeId,
                type,
                path: value,
            };
        });
    }

    public stringifyChannelList(list: ChannelRequestHandlerConfigItem[]) {
        if (!_.isArray(list)) {
            return '';
        }

        return list.map((listItem) => {
            const {
                name,
                path: value,
                type,
                scopeId = '',
            } = listItem;

            return `${name},${scopeId},${type},${value}`;
        }).join('\n');
    }

    public installChannelHandler({
        list,
        name,
        scopeId = '',
        packageName = '',
        filepath = '',
    }: {
        list: ChannelRequestHandlerConfigItem[],
        name: string,
        scopeId?: string,
        packageName?: string,
        filepath?: string,
    }) {
        const newList = Array.from(list);
        const existedListItemIndex = list.findIndex((listItem) => listItem.name === name);

        let type;
        let value;

        if (_.isString(packageName) && packageName) {
            type = 'package';
            value = packageName;
        }

        if (_.isString(filepath) && filepath) {
            type = 'file';
            value = filepath;
        }

        if (!type) {
            return newList;
        }

        const newData = {
            name,
            type,
            scopeId,
            path: value,
        };

        if (existedListItemIndex === -1) {
            newList.push(newData);
        } else {
            newList.splice(existedListItemIndex, 1, newData);
        }

        return newList;
    }

    public uninstallChannelHandler(list: ChannelRequestHandlerConfigItem[], name: string) {
        return list.filter((listItem) => listItem.name !== name);
    }

    public writeLoadingLog({
        text = '',
        spinner = spinners.dots,
        successIcon = '✔',
        warnIcon = '⚠',
        errorIcon = '✖',
    }: LoadingLogOptions): LoadingLogHandler {
        const updateLog = (text: string) => {
            if (!text || !_.isString(text)) {
                return;
            }

            readline.clearLine(process.stdout, 0);
            readline.cursorTo(process.stdout, 0);
            process.stdout.write(text);
        };

        if (!text || !_.isString(text)) {
            return;
        }

        let i = 0;

        const { frames, interval } = spinner;

        const intervalId = setInterval(() => {
            updateLog(frames[i = ++i % frames.length] + ' ' + text);
        }, interval);

        const handleLogEnd = (icon, endText: string) => {
            clearInterval(intervalId);
            updateLog(icon + ' ' + endText);
            process.stdout.write('\n');
        };

        return {
            success: (successText?: string) => {
                handleLogEnd(successIcon, successText || text);
            },
            warn: (warnText?: string) => {
                handleLogEnd(warnIcon, warnText || text);
            },
            error: (errorText?: string) => {
                handleLogEnd(errorIcon, errorText || text);
            },
        };
    }

    public async exec(command: string, options: ExecOptions = {}): Promise<string> {
        return new Promise((resolve, reject) => {
            child_process.exec(command, options, (error, stdout) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(stdout);
                }
            });
        });
    }
}
