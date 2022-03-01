import { AbstractChannelRequest } from './channel-request.abstract';
import {
    TerminalChannelConfig,
    TerminalChannelConnectRequestData,
    TerminalChannelConnectResponseData,
    TerminalChannelDataRequestData,
    TerminalChannelDataResponseData,
    TerminalChannelHandshakeResponseData,
    TerminalChannelRequestData,
    TerminalChannelResponseData,
    TerminalStatus,
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
    protected ptyStatusMap = new Map<string, TerminalStatus>();
    protected ptyKillerMap = new Map<string, ReturnType<typeof setTimeout>>();
    protected ptyConfigMap = new Map<string, TerminalChannelConfig>();

    private defaultPtyForkOptions: IPtyForkOptions | IWindowsPtyForkOptions = {
        cols: 120,
        rows: 80,
    };

    private defaultTerminalConfig: TerminalChannelConfig = {
        dieTimeout: 1 * 60 * 60 * 1000,
    };

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
                this.ptyStatusMap.set(id, 'waiting');
                return { id } as TerminalChannelHandshakeResponseData;
            }
            case 'connect': {
                try {
                    const {
                        id,
                        dieTimeout,
                        args = [],
                        ...ptyForkOptions
                    } = data as TerminalChannelConnectRequestData;

                    if (!_.isString(id)) {
                        throw new Error('Parameter \'id\' must be specified');
                    }

                    const ptyStatus = this.ptyStatusMap.get(id);

                    if (ptyStatus !== 'waiting' && ptyStatus !== 'running') {
                        throw new Error(`PTY ${id} is not waiting or not running`);
                    }

                    let ptyProcess = this.ptyProcessMap.get(id);

                    if (!ptyProcess) {
                        const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';

                        ptyProcess = pty.spawn(
                            shell,
                            args,
                            _.merge(this.defaultPtyForkOptions, ptyForkOptions),
                        );
                    }

                    const ptyConfig = _.merge(this.defaultTerminalConfig, { dieTimeout });

                    this.ptyProcessMap.set(id, ptyProcess);
                    this.setPtyKiller(id);
                    this.ptyConfigMap.set(id, ptyConfig);
                    this.ptyStatusMap.set(id, 'running');

                    ptyProcess.onData((data) => {
                        this.renewPtyKiller(id);

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

                    this.renewPtyKiller(id);

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

    private setPtyKiller(id: string) {
        const ptyConfig = this.ptyConfigMap.get(id) || this.defaultTerminalConfig;

        this.ptyKillerMap.set(
            id,
            setTimeout(() => {
                this.ptyKillerMap.set(id, null);
                this.ptyKillerMap.delete(id);

                const ptyProcess = this.ptyProcessMap.get(id);
                if (ptyProcess) {
                    try {
                        ptyProcess.kill('SIGHUP');
                    } catch (e) {}
                }
                this.ptyProcessMap.set(id, null);
                this.ptyProcessMap.delete(id);

                this.ptyStatusMap.set(id, 'destroyed');
            }, ptyConfig.dieTimeout),
        );
    }

    private renewPtyKiller(id: string) {
        const timeoutId = this.ptyKillerMap.get(id);
        try {
            clearTimeout(timeoutId);
        } catch (e) {}
        this.setPtyKiller(id);
    }
}
