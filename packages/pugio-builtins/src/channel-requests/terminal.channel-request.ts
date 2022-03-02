import { AbstractChannelRequest } from './channel-request.abstract';
import {
    TerminalChannelCloseRequestData,
    TerminalChannelCloseResponseData,
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
    IDisposable,
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
    protected ptyContentMap = new Map<string, string[]>();
    protected ptySendSequenceMap = new Map<string, number>();
    protected ptyWriteSequenceMap = new Map<string, number>();
    protected ptyListenerMap = new Map<string, IDisposable>();

    private defaultPtyForkOptions: IPtyForkOptions | IWindowsPtyForkOptions = {
        cols: 120,
        rows: 80,
        cwd: os.homedir(),
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
                this.ptyContentMap.set(id, []);

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

                    this.ptySendSequenceMap.set(id, 0);
                    this.ptyWriteSequenceMap.set(id, 0);
                    let ptyProcess = this.ptyProcessMap.get(id);
                    let ptyContent = this.ptyContentMap.get(id);

                    if (!ptyProcess) {
                        const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';

                        ptyProcess = pty.spawn(
                            shell,
                            args,
                            _.merge(this.defaultPtyForkOptions, ptyForkOptions),
                        );
                    }

                    if (this.ptyListenerMap.get(id)) {
                        this.ptyListenerMap.get(id).dispose();
                    }

                    const dataListener = ptyProcess.onData(async (data) => {
                        const content = Buffer.from(data).toString('base64');
                        const sequence = this.ptySendSequenceMap.get(id);
                        this.ptySendSequenceMap.set(id, sequence + 1);
                        this.renewPtyKiller(id);

                        ptyContent.push(content);

                        await this.sdkService.pushChannelGateway({
                            eventId: `terminal:data:${id}`,
                            data: {
                                content,
                                sequence: sequence + 1,
                            },
                        });
                    });

                    this.ptyListenerMap.set(id, dataListener);

                    const ptyConfig = _.merge(this.defaultTerminalConfig, { dieTimeout });

                    this.ptyProcessMap.set(id, ptyProcess);
                    this.setPtyKiller(id);
                    this.ptyConfigMap.set(id, ptyConfig);
                    this.ptyStatusMap.set(id, 'running');

                    return {
                        accepted: true,
                        content: ptyContent,
                        error: null,
                    } as TerminalChannelConnectResponseData;
                } catch (e) {
                    return {
                        accepted: false,
                        content: null,
                        error: e.message || e.toString(),
                    } as TerminalChannelConnectResponseData;
                }
            }
            case 'data': {
                return new Promise((resolve) => {
                    try {
                        const {
                            id,
                            data: ptyData = '',
                            sequence: dataSequence = 1,
                        } = data as TerminalChannelDataRequestData;

                        if (!_.isString(id)) {
                            throw new Error('Parameter \'id\' must be specified');
                        }

                        const ptyProcess = this.ptyProcessMap.get(id);

                        if (!ptyProcess) {
                            throw new Error(`PTY process ${id} not found`);
                        }

                        const intervalId = setInterval(() => {
                            if (this.ptyWriteSequenceMap.get(id) + 1 === dataSequence) {
                                this.renewPtyKiller(id);

                                let accepted = true;

                                if (ptyData) {
                                    this.ptyContentMap.get(id).push(ptyData);
                                    ptyProcess.write(Buffer.from(ptyData, 'base64').toString());
                                } else {
                                    accepted = false;
                                }

                                this.ptyWriteSequenceMap.set(id, dataSequence);
                                clearInterval(intervalId);

                                resolve({
                                    accepted,
                                    error: null,
                                } as TerminalChannelDataResponseData);
                            }
                        }, 0);
                    } catch (e) {
                        resolve({
                            accepted: false,
                            error: e.message || e.toString(),
                        } as TerminalChannelDataResponseData);
                    }
                });
            }
            case 'close': {
                try {
                    const {
                        id,
                    } = data as TerminalChannelCloseRequestData;

                    if (!_.isString(id)) {
                        throw new Error('Parameter \'id\' must be specified');
                    }

                    let accepted = false;

                    const ptyProcess = this.ptyProcessMap.get(id);

                    if (ptyProcess) {
                        try {
                            this.killPty(id);
                            accepted = true;
                        } catch (e) {}
                    }

                    return {
                        accepted,
                        error: null,
                    } as TerminalChannelCloseResponseData;
                } catch (e) {
                    return {
                        accepted: false,
                        error: e.message || e.toString(),
                    } as TerminalChannelCloseResponseData;
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
                this.killPty(id);
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

    private killPty(id: string) {
        this.ptyKillerMap.set(id, null);
        this.ptyKillerMap.delete(id);

        this.ptyContentMap.set(id, null);
        this.ptyContentMap.delete(id);

        this.ptySendSequenceMap.delete(id);
        this.ptyWriteSequenceMap.delete(id);

        if (this.ptyListenerMap.get(id)) {
            this.ptyListenerMap.get(id).dispose();
            this.ptyListenerMap.set(id, null);
            this.ptyListenerMap.delete(id);
        }

        const ptyProcess = this.ptyProcessMap.get(id);
        if (ptyProcess) {
            try {
                ptyProcess.kill('SIGHUP');
            } catch (e) {}
        }
        this.ptyProcessMap.set(id, null);
        this.ptyProcessMap.delete(id);

        this.ptyStatusMap.set(id, 'destroyed');
    }
}
