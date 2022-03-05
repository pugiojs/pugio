import { SDKService } from './sdk.service';
import {
    ChannelClientConfig,
    ClientMessage,
    ClientMessageHandler,
} from '@pugio/types';
import * as _ from 'lodash';

export abstract class AbstractChannelRequest {
    protected sdkService: SDKService;
    protected client: ChannelClientConfig;
    protected log: ClientMessageHandler = _.noop;

    public constructor(
        public readonly scope: string,
        public readonly name: string,
    ) {}

    public setSDKService(sdkService: SDKService) {
        this.sdkService = sdkService;
    }

    public setClientConfig(config: ChannelClientConfig) {
        this.client = config;
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
