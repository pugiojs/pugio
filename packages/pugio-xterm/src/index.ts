import {
    ITerminalOptions,
    Terminal as XTermTerminal,
} from 'xterm';
import { XTermTerminalOptions } from '@pugio/types';
import * as _ from 'lodash';

export * from 'xterm';

export class Terminal<T> extends XTermTerminal {
    public constructor(options?: XTermTerminalOptions) {
        const terminalOptions = _.omit(options, [
            'dataReceiver',
        ]) as ITerminalOptions;

        super(terminalOptions);

        // TODO
        const {
            dataReceiver,
        } = options;
    }
}

export default Terminal;
