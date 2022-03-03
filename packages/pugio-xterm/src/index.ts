import {
    IEvent,
    ITerminalOptions,
    Terminal as XTermTerminal,
} from 'xterm';
import {
    XTermTerminalWriteData,
} from '@pugio/types';
import * as _ from 'lodash';

export * from 'xterm';

export class Terminal<T extends Record<string, any>> extends XTermTerminal {
    public onSequenceData: IEvent<string, any>;
    protected data: T;
    private sendSequence = 0;
    private writeSequence = 0;
    private initializingContent = true;

    public constructor(options?: ITerminalOptions) {
        super(options);

        this.onSequenceData = <T, U>(listener: (arg1: T, arg2: U) => any) => {
            return this.onData.call(this, async (arg1, arg2) => {
                return await this.handleSequenceData(arg1, arg2, listener);
            });
        };
    }

    public initialize(
        contentList: string[] | Uint8Array[],
        dataParser?: (rawContent: string | Uint8Array) => string,
        callback?: () => void,
    ) {
        const parseData = _.isFunction(dataParser) ? dataParser : (data) => data;

        if (_.isArray(contentList) && contentList.length > 0) {
            for (const contentListItem of contentList) {
                if (contentListItem) {
                    const content = parseData(contentListItem);
                    XTermTerminal.prototype.write.call(this, content);
                }
            }
        }

        this.initializingContent = false;

        if (_.isFunction(callback)) {
            callback.call(this);
        }
    }

    public sequenceWrite(
        data: XTermTerminalWriteData,
        dataParser?: (rawContent: string | Uint8Array) => string,
        callback?: () => void,
    ): void {
        const { content: rawContent, sequence } = data;
        const parseData = _.isFunction(dataParser) ? dataParser : (data) => data;

        const intervalId = setInterval(() => {
            if (!this.initializingContent && this.writeSequence + 1 === sequence) {
                const content = parseData(rawContent);
                XTermTerminal.prototype.write.call(this, content, callback);
                this.writeSequence = sequence;
                clearInterval(intervalId);
            }
        }, 0);
    }

    private async handleSequenceData<T, U>(arg1: T, arg2: U, callback: (arg1: T, arg2: U) => any) {
        if (!_.isFunction(callback)) {
            return;
        }

        while (this.initializingContent) {
            continue;
        }

        const callbackFunction = callback.bind(this);
        this.sendSequence += 1;

        await callbackFunction(
            {
                sequence: this.sendSequence,
                content: arg1,
            },
            arg2,
        );
    }
}
