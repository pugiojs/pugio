import { ClientManagerService } from './client-manager.service';
import {
    ChannelClientConfig,
    ClientMessage,
    ClientMessageHandler,
} from '@pugio/types';
import * as _ from 'lodash';

export abstract class AbstractChannelRequest {
    protected clientManagerService: ClientManagerService;
    protected client: ChannelClientConfig;
    protected log: ClientMessageHandler = _.noop;
    protected clientKey: string;

    public constructor(
        public readonly scope: string,
        public readonly name: string,
    ) {}

    public setClientManager(clientManagerService: ClientManagerService) {
        this.clientManagerService = clientManagerService;
    }

    public setClientConfig(config: ChannelClientConfig) {
        this.client = config;
    }

    public setClientKey(clientKey: string) {
        this.clientKey = clientKey;
    }

    public setLogger(messageHandler: ClientMessageHandler) {
        if (_.isFunction(messageHandler)) {
            const handleMessage = messageHandler.bind(this) as ClientMessageHandler;
            this.log = async (message: ClientMessage) => {
                return await handleMessage({
                    ...message,
                    data: `[channel:${this.scope}] ${message.data}`,
                });
            };
        }
    }

    public abstract handleRequest(data: any): any;
}
