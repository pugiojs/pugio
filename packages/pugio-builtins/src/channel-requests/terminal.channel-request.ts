import { AbstractChannelRequest } from './channel-request.abstract';
import {
    TerminalChannelRequestData,
    TerminalChannelResponseData,
} from '@pugio/types';
import * as _ from 'lodash';
import {
    v1 as uuidv1,
    v5 as uuidv5,
} from 'uuid';
import * as pty from 'node-pty';

export class TerminalChannelRequest extends AbstractChannelRequest implements AbstractChannelRequest {
    protected connectionMap = new Map<string, pty.IPty>();

    public constructor() {
        super('terminal');
    }

    public async handleRequest(data: TerminalChannelRequestData): Promise<TerminalChannelResponseData> {
        const { type } = data;

        switch (type) {
            case 'connect': {
                const id = uuidv5(
                    new Date().toISOString() + Math.random().toString(32),
                    uuidv1(),
                );
                return;
            }
            default:
                return null;
        }
    }
}
