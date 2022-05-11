import * as net from 'net';
import _ from 'lodash';

export interface TCPBridgeOptions {
    host: string;
    cert?: string;
    key?: string;
    onMessage?: TCPBridgeMessageHandler;
}

type TCPBridgeMessageHandler = (message: string) => void;
export type TCPBridgeIncomingDataHandler = (data: Buffer) => void;
export type TCPBridgeOutgoingDataHandler = (data: Buffer) => void;
type TCPBridgeConnectedCallback = (socket: net.Socket) => void;
type TCPBridgeDisconnectedCallback = (socket: net.Socket, reason: Buffer) => void;

export interface TCPBridgeListenOptions {
    onOutgoingData?: TCPBridgeOutgoingDataHandler;
    onConnected?: TCPBridgeConnectedCallback;
    onDisconnected?: TCPBridgeDisconnectedCallback;
}

export class TCPBridge {
    private host: string;
    private port: number;
    private target: net.Socket;
    private messageHandler: TCPBridgeMessageHandler = _.noop;

    public constructor(private readonly options: TCPBridgeOptions) {
        const {
            host: hostArg,
            onMessage: messageHandler,
        } = this.options;

        if (_.isFunction(messageHandler)) {
            this.messageHandler = messageHandler;
        }

        const hostArgIndex = hostArg.indexOf(':');

        if (hostArgIndex >= 0) {
            this.host = hostArg.slice(0, hostArgIndex);
            this.port = parseInt(hostArg.slice(hostArgIndex + 1), 10);
        } else {
            this.host = '';
            this.port = parseInt(hostArg, 10);
        }
    }

    public sendIncomingData(data: any) {
        if (_.isFunction(this?.target?.write)) {
            this.target.write(data);
        }
    }

    public listen(options: TCPBridgeListenOptions = {}) {
        const {
            onOutgoingData,
            onConnected,
            onDisconnected,
        } = options;

        let handleConnected: TCPBridgeConnectedCallback = _.noop;
        let handleDisconnected: TCPBridgeDisconnectedCallback = _.noop;
        let handleOutgoingData: TCPBridgeOutgoingDataHandler = _.noop;

        if (_.isFunction(onConnected)) {
            handleConnected = onConnected;
        }

        if (_.isFunction(onDisconnected)) {
            handleDisconnected = onDisconnected;
        }

        if (_.isFunction(onOutgoingData)) {
            handleOutgoingData = onOutgoingData;
        }

        this.target = net.createConnection(this.port, this.host, () => {
            this.messageHandler('connected to target');
            try {
                handleConnected(this.target);
            } catch (e) {
                this.messageHandler('onConnectedCallback failed, cleaning up target');
                this.target.end();
            }
        });

        this.target.on('data', (data) => {
            try {
                handleOutgoingData(data);
            } catch (e) {
                this.messageHandler('Client closed, cleaning up target');
                this.target.end();
            }
        });

        this.target.on('end', () => {
            this.messageHandler('target disconnected');
            handleDisconnected(this.target, null);
        });

        this.target.on('error', (error) => {
            this.messageHandler('target connection error: ' + error.message || error.toString());
            this.target.end();
            handleDisconnected(this.target, Buffer.from(error.message || error.toString()));
        });
    }
}
