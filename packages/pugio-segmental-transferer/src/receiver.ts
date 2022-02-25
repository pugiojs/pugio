import {
    FinishReceiveHandler,
    ReceiverOptions,
} from '@pugio/types';
import * as _ from 'lodash';
import { Base64 } from 'js-base64';

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

    public receiveChunk(index: number, chunkContent: string) {
        if (!this.chunks[index]) {
            this.chunks.splice(index, 1, chunkContent);
        } else {
            return true;
        }

        const receivedChunks = this.chunks.filter((chunk) => {
            return _.isString(chunk);
        });

        if (receivedChunks.length === this.options.chunkCount) {
            const content = this.getFileUint8Array();
            this.handleFinish({
                content,
                pathname: this.options.pathname,
            });
        }

        this.options.onStatusChange({
            total: this.chunks.length,
            failed: 0,
            succeeded: this.chunks.filter((chunk) => _.isString(chunk)).length,
            waiting: this.chunks.filter((chunk) => !_.isString(chunk)).length,
        });

        return true;
    }

    private getFileUint8Array(): Uint8Array {
        return this.chunks.reduce<Uint8Array>((previous, current) => {
            const currentBinaryString = Base64.decode(current);
            const currentUint8Array = new Uint8Array(currentBinaryString.length);
            for (let i = 0; i < currentBinaryString.length; i += 1) {
                currentUint8Array[i] = currentBinaryString.charCodeAt(i);
            }
            return new Uint8Array([...previous, ...currentUint8Array]);
        }, new Uint8Array(0));
    }
}
