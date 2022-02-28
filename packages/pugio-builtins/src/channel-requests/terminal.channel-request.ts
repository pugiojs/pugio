import { AbstractChannelRequest } from './channel-request.abstract';
import {
    TerminalChannelRequestData,
    TerminalChannelResponseData,
} from '@pugio/types';
import * as _ from 'lodash';
import * as fs from 'fs-extra';
import * as path from 'path';
import {
    v1 as uuidv1,
    v5 as uuidv5,
} from 'uuid';
import * as mimeTypes from 'mime-types';

export class TerminalChannelRequest extends AbstractChannelRequest implements AbstractChannelRequest {
    public constructor() {
        super('terminal');
    }

    public async handleRequest(data: TerminalChannelRequestData): Promise<TerminalChannelResponseData> {
        const { type } = data;

        switch (type) {
            case 'connect': {
                return;
            }
            default:
                return null;
        }
    }
}
