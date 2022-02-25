import { SenderOptions } from '@pugio/types';
import * as _ from 'lodash';
import { Base64 } from 'js-base64';

export class Sender {
    public static async readBrowserFileAsUint8Array(file: File): Promise<Uint8Array> {
        return new Promise((resolve, reject) => {
            const fileReader = new FileReader();

            fileReader.onload = function() {
                resolve(new Uint8Array(this.result as ArrayBuffer));
            };

            fileReader.onerror = function() {
                reject(this.error);
            };

            fileReader.readAsArrayBuffer(file);
        });
    }

    public static readNodeJSFileAsUint8Array(buffer: Buffer): Uint8Array {
        return new Uint8Array(buffer);
    }

    public chunkCount: number;
    protected options: SenderOptions;
    protected status: boolean[];
    private chunkProcessCount = 0;

    public constructor(options: SenderOptions) {
        const defaultOptions: SenderOptions = {
            id: undefined,
            file: undefined,
            chunkSize: 1024 * 10,
            maximumRetryTimes: 10,
            sender: undefined,
            concurrency: 64,
            onStatusChange: _.noop,
            onError: _.noop,
        };

        this.options = _.merge(defaultOptions, options);

        const {
            id,
            file,
            chunkSize,
            sender,
        } = this.options;

        if (!file) {
            this.options.onError(new Error('File not found'));
        }

        if (!id || !_.isFunction(sender)) {
            this.options.onError(new Error('Invalid sender options'));
        }

        this.chunkCount = Math.ceil(file.byteLength * 1.334 / chunkSize);
        this.status = new Array(this.chunkCount).fill(null);
    }

    public async send() {
        for (let i = 0; i < this.chunkCount; i += 1) {
            const chunkedFile = this.options.file.slice(
                this.options.chunkSize * i,
                this.options.chunkSize * (i + 1),
            );

            const chunkBinaryContent = chunkedFile.reduce((result, byte) => {
                return result + String.fromCharCode(byte);
            }, '');
            const chunkContent = Base64.encode(chunkBinaryContent);

            if (
                this.options.concurrency === false ||
                !_.isNumber(this.options.concurrency) ||
                this.options.concurrency <= 0
            ) {
                await this.sendChunk(i, chunkContent);
            } else {
                this.sendChunk(i, chunkContent).finally(() => {
                    this.chunkProcessCount = this.chunkProcessCount - 1;
                });
            }
        }
    }

    private async sendChunk(index: number, chunkContent: string) {
        if (!_.isNumber(index) || !_.isString(chunkContent)) {
            return;
        }

        while (this.chunkProcessCount >= this.options.concurrency) {
            continue;
        }

        const handleRetry = async (retryTimes: number) => {
            if (retryTimes <= this.options.maximumRetryTimes) {
                await send(retryTimes + 1);
            } else {
                this.status[index] = false;
                await this.options.onError(new Error('Failed to send chunk ' + index.toString()));
            }
        };

        const send = async (retryTimes = 0) => {
            try {
                const result = await this.options.sender(index, this.chunkCount, chunkContent);

                if (_.isBoolean(result) && result) {
                    this.status[index] = true;
                } else {
                    await handleRetry(retryTimes);
                }
            } catch (e) {
                await handleRetry(retryTimes);
            }
        };

        await send(0);

        this.options.onStatusChange({
            total: this.status.length,
            succeeded: this.status.filter((statusItem) => _.isBoolean(statusItem) && statusItem).length,
            failed: this.status.filter((statusItem) => _.isBoolean(statusItem) && !statusItem).length,
            waiting: this.status.filter((statusItem) => _.isBoolean(statusItem)).length,
        });
    }
}
