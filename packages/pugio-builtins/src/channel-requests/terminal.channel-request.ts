import { AbstractChannelRequest } from './channel-request.abstract';
import {
    TerminalChannelConnectRequestData,
    TerminalChannelConnectResponseData,
    TerminalChannelDataRequestData,
    TerminalChannelDataResponseData,
    TerminalChannelHandshakeResponseData,
    TerminalChannelRequestData,
    TerminalChannelResponseData,
} from '@pugio/types';
import * as _ from 'lodash';
import {
    v1 as uuidv1,
    v5 as uuidv5,
} from 'uuid';
import * as pty from 'node-pty';
import {
    IPty,
    IPtyForkOptions,
    IWindowsPtyForkOptions,
} from 'node-pty';
import * as os from 'os';

export class TerminalChannelRequest extends AbstractChannelRequest implements AbstractChannelRequest {
    protected ptyProcessMap = new Map<string, IPty>();
    protected ptyKillerMap = new Map<string, ReturnType<typeof setTimeout>>();

    public constructor() {
        super('terminal');
    }

    public async handleRequest(data: TerminalChannelRequestData): Promise<TerminalChannelResponseData> {
        const { type } = data;

        switch (type) {
            case 'handshake': {
                const id = uuidv5(
                    new Date().toISOString() + Math.random().toString(32),
                    uuidv1(),
                );
                return { id } as TerminalChannelHandshakeResponseData;
            }
            case 'connect': {
                try {
                    const {
                        id,
                        dieTimeout = 1 * 60 * 60 * 1000,
                        args = [],
                        ...ptyForkOptions
                    } = data as TerminalChannelConnectRequestData;

                    if (!_.isString(id)) {
                        throw new Error('Parameter \'id\' must be specified');
                    }

                    const defaultPtyForkOptions: IPtyForkOptions | IWindowsPtyForkOptions = {
                        cols: 120,
                        rows: 80,
                    };

                    const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';

                    const ptyProcess = pty.spawn(
                        shell,
                        args,
                        _.merge(defaultPtyForkOptions, ptyForkOptions),
                    );

                    this.ptyProcessMap.set(id, ptyProcess);
                    this.ptyKillerMap.set(
                        id,
                        setTimeout(() => {
                            this.ptyKillerMap.set(id, null);
                            this.ptyKillerMap.delete(id);
                        }, dieTimeout),
                    );

                    ptyProcess.onData((data) => {
                        this.sdkService.pushChannelGateway({
                            data,
                            eventId: `terminal:data:${id}`,
                        });
                    });

                    return {
                        accepted: true,
                        error: null,
                    } as TerminalChannelConnectResponseData;
                } catch (e) {
                    return {
                        accepted: false,
                        error: e.message || e.toString(),
                    } as TerminalChannelConnectResponseData;
                }
            }
            case 'data': {
                try {
                    const {
                        id,
                        data: ptyData = '',
                    } = data as TerminalChannelDataRequestData;

                    if (!_.isString(id)) {
                        throw new Error('Parameter \'id\' must be specified');
                    }

                    const ptyProcess = this.ptyProcessMap.get(id);

                    if (!ptyProcess) {
                        throw new Error(`PTY process ${id} not found`);
                    }

                    let accepted = true;

                    if (ptyData) {
                        ptyProcess.write(ptyData);
                    } else {
                        accepted = false;
                    }

                    return {
                        accepted,
                        error: null,
                    } as TerminalChannelDataResponseData;
                } catch (e) {
                    return {
                        accepted: false,
                        error: e.message || e.toString(),
                    } as TerminalChannelDataResponseData;
                }
            }
            default:
                return null;
        }
    }
}
