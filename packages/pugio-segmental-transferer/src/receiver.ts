import {
    FinishReceiveHandler,
    ReceiverOptions,
} from '@pugio/types';
import * as _ from 'lodash';
import { Base64 } from 'js-base64';
import { ArrayBuffer as SparkArrayBuffer } from 'spark-md5';

export class Receiver {
    protected options: ReceiverOptions;
    private chunks: string[] = [];
    private handleFinish: FinishReceiveHandler;

    public constructor(options: ReceiverOptions) {
        const defaultOptions: ReceiverOptions = {
            id: undefined,
            chunkCount: undefined,
            pathname: '',
            onFinish: undefined,
            onStatusChange: _.noop,
        };

        this.options = _.merge(defaultOptions, options);

        const {
            pathname,
            chunkCount,
            onFinish,
        } = this.options;

        if (!_.isString(pathname) || !chunkCount) {
            throw new Error('Invalid receiver options');
        }

        if (!_.isFunction(onFinish)) {
            this.handleFinish = _.noop;
        } else {
            this.handleFinish = onFinish;
        }

        this.chunks = new Array(chunkCount).fill(null);
    }

    public receiveChunk(index: number, chunkContent = '', md5 = '') {
        if (!this.chunks[index]) {
            this.chunks.splice(index, 1, chunkContent || '');
        } else {
            return true;
        }

        let errored = false;

        const receivedChunks = this.chunks.filter((chunk) => {
            return _.isString(chunk);
        });

        if (receivedChunks.length === this.options.chunkCount) {
            const content = this.getFileUint8Array();
            const sparkBuffer = new SparkArrayBuffer();
            sparkBuffer.append(content);
            const receivedFileMd5 = sparkBuffer.end();

            if (receivedFileMd5 === md5) {
                this.handleFinish({
                    content,
                    pathname: this.options.pathname,
                });
            } else {
                errored = true;
            }
        }

        this.options.onStatusChange({
            total: this.options.chunkCount,
            failed: errored ? 1 : 0,
            succeeded: errored
                ? this.chunks.filter((chunk) => _.isString(chunk)).length - 1
                : this.chunks.filter((chunk) => _.isString(chunk)).length,
            waiting: this.chunks.filter((chunk) => !_.isString(chunk)).length,
        });

        return !errored;
    }

    private getFileUint8Array(): Uint8Array {
        return this.chunks.reduce<Uint8Array>((previous, current) => {
            const currentBinaryString = Base64.decode(current);
            const currentUint8Array = new Uint8Array(currentBinaryString.length);

            for (let i = 0; i < currentBinaryString.length; i += 1) {
                currentUint8Array[i] = currentBinaryString.charCodeAt(i);
            }

            const newPreviousBuffer = new Uint8Array(previous.byteLength + currentUint8Array.byteLength);
            newPreviousBuffer.set(previous, 0);
            newPreviousBuffer.set(currentUint8Array, previous.byteLength);

            return newPreviousBuffer;
        }, new Uint8Array(0));
    }
}
