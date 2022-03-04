import { SDKService } from './sdk.service';
import { ChannelClientConfig } from '@pugio/types';

export abstract class AbstractChannelRequest {
    protected sdkService: SDKService;
    protected client: ChannelClientConfig;

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

    public abstract handleRequest(data: any): any;
}
