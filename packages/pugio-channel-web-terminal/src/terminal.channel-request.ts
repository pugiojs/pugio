import { AbstractChannelRequest } from '@pugio/sdk';
import {
    TerminalChannelCloseRequestData,
    TerminalChannelCloseResponseData,
    TerminalChannelConfig,
    TerminalChannelConnectRequestData,
    TerminalChannelConnectResponseData,
    TerminalChannelConsumeConfirmRequestData,
    TerminalChannelDataRequestData,
    TerminalChannelHandshakeResponseData,
    TerminalChannelRequestData,
    TerminalChannelResizeRequestData,
    TerminalChannelResizeResponseData,
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
import io, { Socket } from 'socket.io-client';

export class TerminalChannelRequest extends AbstractChannelRequest implements AbstractChannelRequest {
    protected ptyProcessMap = new Map<string, IPty>();
    protected ptyStatusMap = new Map<string, TerminalStatus>();
    protected ptyKillerMap = new Map<string, ReturnType<typeof setTimeout>>();
    protected ptyConfigMap = new Map<string, TerminalChannelConfig>();
    protected ptyContentMap = new Map<string, string[]>();
    protected ptySendSequenceMap = new Map<string, number>();
    protected ptyWriteSequenceMap = new Map<string, number>();
    protected ptyListenersMap = new Map<string, IDisposable[]>();
    protected consumeMap = new Map<string, Set<number>>();
    protected socketSendListenersMap = new Map<string, Function>();
    protected socketConsumeConfirmListenersMap = new Map<string, Function>();
    private socket: Socket;

    private defaultPtyForkOptions: IPtyForkOptions | IWindowsPtyForkOptions = {
        cols: 120,
        rows: 80,
        cwd: os.homedir(),
        encoding: 'utf8',
    };

    private defaultTerminalConfig: TerminalChannelConfig = {
        dieTimeout: 1 * 60 * 60 * 1000,
    };

    public constructor() {
        super('pugio.web-terminal', 'Web Terminal (Built-in)');
    }

    public onInitialize(): void {
        this.socket = io('wss://pugio.lenconda.top/client', {
            transportOptions: {
                polling: {
                    extraHeaders: {
                        Authorization: 'CK ' + this.clientKey, // 'Bearer h93t4293t49jt34j9rferek...'
                    },
                },
            },
        });

        this.socket.on('connect', () => {
            this.log({
                level: 'info',
                data: `Socket connected: ${this.socket.id}`,
            });

            this.socket.emit('join', this.client.clientId);

            this.log({
                level: 'info',
                data: `Socket joined channel: '${this.client.clientId}'`,
            });
        });
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

                    if (!this.socketSendListenersMap.get(id)) {
                        this.socketSendListenersMap.set(id, (data: TerminalChannelDataRequestData) => {
                            try {
                                const {
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
                                            ptyProcess.write(
                                                decodeURI(Buffer.from(ptyData, 'base64').toString()),
                                            );
                                        } else {
                                            accepted = false;
                                        }

                                        this.ptyWriteSequenceMap.set(id, dataSequence);
                                        clearInterval(intervalId);
                                        this.log({
                                            level: 'info',
                                            data: `Data sent to terminal '${id}' read, accepted: ${accepted}`,
                                        });
                                    }
                                }, 0);
                            } catch (e) {
                                this.log({
                                    level: 'warn',
                                    data: 'Error consuming data: ' + e.message || e.toString(),
                                });
                            }
                        });

                        this.socket.on(`terminal:${id}:send_data`, this.socketSendListenersMap.get(id));
                    }

                    if (!this.socketConsumeConfirmListenersMap.get(id)) {
                        this.socketConsumeConfirmListenersMap.set(id, (data: TerminalChannelConsumeConfirmRequestData) => {
                            try {
                                const {
                                    sequence,
                                } = data as TerminalChannelConsumeConfirmRequestData;

                                if (!this.consumeMap.get(id)) {
                                    this.consumeMap.set(id, new Set<number>());
                                }

                                this.consumeMap.get(id).add(sequence);

                                this.log({
                                    level: 'info',
                                    data: `Handshake consumed for terminal '${id}', sequence ${sequence}`,
                                });
                            } catch (e) {
                                this.log({
                                    level: 'warn',
                                    data: 'Error confirming: ' + e.message || e.toString(),
                                });
                            }
                        });

                        this.socket.on(`terminal:${id}:consume_confirm_data`, this.socketConsumeConfirmListenersMap.get(id));
                    }

                    if (!ptyProcess) {
                        const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';

                        ptyProcess = pty.spawn(
                            shell,
                            args,
                            _.merge(_.cloneDeep(this.defaultPtyForkOptions), ptyForkOptions),
                        );
                    }

                    if (_.isArray(this.ptyListenersMap.get(id))) {
                        const oldPtyListeners = this.ptyListenersMap.get(id);
                        while (oldPtyListeners.length > 0) {
                            oldPtyListeners.pop().dispose();
                        }
                    } else {
                        this.ptyListenersMap.set(id, []);
                    }

                    const listeners = this.ptyListenersMap.get(id);

                    const dataListener = ptyProcess.onData(async (data) => {
                        const content = Buffer.from(
                            encodeURI(Buffer.from(data).toString('utf-8')),
                        ).toString('base64');
                        const sequence = this.ptySendSequenceMap.get(id);
                        const currentSequence = sequence + 1;
                        this.ptySendSequenceMap.set(id, currentSequence);
                        this.renewPtyKiller(id);

                        ptyContent.push(content);

                        const pushChannelInterval = setInterval(() => {
                            this.socket.emit('channel_stream', {
                                eventId: `terminal:${id}:recv_data`,
                                roomId: this.client.clientId,
                                data: {
                                    content,
                                    sequence: currentSequence,
                                },
                            });

                            if (!currentSequence || this.consumeMap.get(id)?.has(currentSequence)) {
                                clearInterval(pushChannelInterval);
                            }
                        }, 1000);
                    });

                    const closeListener = ptyProcess.onExit(async (data) => {
                        await this.killPty(id);
                        await this.clientManagerService.pushChannelGateway({
                            eventId: `terminal:${id}:close`,
                            data,
                        });
                    });

                    listeners.push(dataListener, closeListener);

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
            case 'resize': {
                try {
                    const {
                        id,
                        cols,
                        rows,
                    } = data as TerminalChannelResizeRequestData;

                    const result = {
                        accepted: false,
                        error: null,
                    } as TerminalChannelResizeResponseData;

                    const ptyProcess = this.ptyProcessMap.get(id);

                    if (!ptyProcess) {
                        result.error = 'Cannot find pty process';
                        return result;
                    }

                    const newCols = _.isNumber(cols) ? cols : ptyProcess.cols;
                    const newRows = _.isNumber(rows) ? rows : ptyProcess.rows;

                    ptyProcess.resize(newCols, newRows);

                    result.accepted = true;

                    return result;
                } catch (e) {
                    return {
                        accepted: false,
                        error: e.message || e.toString(),
                    } as TerminalChannelResizeResponseData;
                }
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

        this.consumeMap.delete(id);

        const sendSocketListener = this.socketSendListenersMap.get(id);
        const consumeConfirmSocketListener = this.socketConsumeConfirmListenersMap.get(id);

        if (sendSocketListener) {
            this.socket.off(`terminal:${id}:send_stream`, sendSocketListener);
        }

        if (consumeConfirmSocketListener) {
            this.socket.off(`terminal:${id}:consume_confirm_stream`, consumeConfirmSocketListener);
        }

        this.socketSendListenersMap.delete(id);
        this.socketConsumeConfirmListenersMap.delete(id);

        const ptyListeners = this.ptyListenersMap.get(id);

        if (_.isArray(ptyListeners)) {
            while (ptyListeners.length > 0) {
                ptyListeners.pop().dispose();
            }
            this.ptyListenersMap.set(id, null);
            this.ptyListenersMap.delete(id);
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
