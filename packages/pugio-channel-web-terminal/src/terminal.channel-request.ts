import { AbstractChannelRequest } from '@pugio/sdk';
import {
    TerminalChannelCloseRequestData,
    TerminalChannelCloseResponseData,
    TerminalChannelConfig,
    TerminalChannelConnectRequestData,
    TerminalChannelConnectResponseData,
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
import { WebSocket } from 'ws';

export class TerminalChannelRequest extends AbstractChannelRequest implements AbstractChannelRequest {
    protected ptyProcessMap = new Map<string, IPty>();
    protected ptyStatusMap = new Map<string, TerminalStatus>();
    protected ptyKillerMap = new Map<string, ReturnType<typeof setTimeout>>();
    protected ptyConfigMap = new Map<string, TerminalChannelConfig>();
    protected ptyContentMap = new Map<string, string[]>();
    protected ptyListenersMap = new Map<string, IDisposable[]>();
    protected socketSendListenersMap = new Map<string, (data: any) => void>();
    protected socketMap = new Map<string, WebSocket>();

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

                    let ptyProcess = this.ptyProcessMap.get(id);
                    let ptyContent = this.ptyContentMap.get(id);

                    if (!this.socketSendListenersMap.get(id)) {
                        this.socketSendListenersMap.set(id, (data: any) => {
                            try {
                                if (!_.isString(id)) {
                                    throw new Error('Parameter \'id\' must be specified');
                                }

                                const ptyProcess = this.ptyProcessMap.get(id);

                                if (!ptyProcess) {
                                    throw new Error(`PTY process ${id} not found`);
                                }

                                this.renewPtyKiller(id);

                                let accepted = true;

                                if (data) {
                                    this.ptyContentMap.get(id).push(data);
                                    ptyProcess.write(decodeURI(data));
                                } else {
                                    accepted = false;
                                }

                                this.log({
                                    level: 'info',
                                    data: `Data sent to terminal '${id}' read, accepted: ${accepted}`,
                                });
                            } catch (e) {
                                this.log({
                                    level: 'warn',
                                    data: 'Error consuming data: ' + e.message || e.toString(),
                                });
                            }
                        });
                    }

                    if (!this.socketMap.get(id)) {
                        const socket = new WebSocket(`wss://pugio.lenconda.top/websocket?auth_type=ck&auth_token=${this.clientKey}&event=terminal:${id}:send_data&broadcast[]=terminal:${id}:recv_data&room=${this.client.clientId}`);
                        socket.on('message', this.socketSendListenersMap.get(id));
                        this.socketMap.set(id, socket);
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
                        const content = encodeURI(data);
                        this.renewPtyKiller(id);
                        ptyContent.push(content);

                        this.socketMap.get(id).send(content);
                    });

                    const closeListener = ptyProcess.onExit(async (data) => {
                        await this.killPty(id);
                        await this.clientManagerService.pushChannelGateway({
                            eventId: `terminal:${id}:close`,
                            data: JSON.stringify(data),
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

        const sendSocketListener = this.socketSendListenersMap.get(id);
        const socket = this.socketMap.get(id);

        if (socket) {
            if (sendSocketListener) {
                socket.off('message', sendSocketListener);
            }
            socket.close();
            this.socketMap.delete(id);
        }

        this.socketSendListenersMap.delete(id);

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
