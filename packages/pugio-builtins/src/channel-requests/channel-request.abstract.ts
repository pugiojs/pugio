import { SDKService } from '@pugio/sdk';

export abstract class AbstractChannelRequest {
    protected sdkService: SDKService;

    public constructor(public readonly scope: string) {}

    public setSDKService(sdkService: SDKService) {
        this.sdkService = sdkService;
    }

    public abstract handleRequest(data: any): any;
}
