import 'reflect-metadata';
import { Service } from 'typedi';
import { RequestService } from '@pugio/request';
import {
    ChannelManagerOptions,
    ChannelManagerResponse,
    MakeChannelRequestRequest,
    MakeChannelRequestResponse,
} from '@pugio/types';
import _ from 'lodash';
import { UtilsService } from '@pugio/utils';
import * as Crypto from 'crypto-js';
import { AbstractManagerService } from './manager.abstract';

@Service()
export class ChannelManagerService extends AbstractManagerService implements AbstractManagerService {
    protected options: ChannelManagerOptions;

    public constructor(requestService: RequestService, utilsService: UtilsService) {
        super(requestService, utilsService);
    }

    public initialize(options: ChannelManagerOptions = {}) {
        this.options = options;

        const {
            channelId = '',
            channelKey = '',
            ...otherOptions
        } = this.options;

        const encryptedChannelKey = Crypto.AES.encrypt(channelKey, channelKey);

        super.initialize.call(this, {
            ...otherOptions,
            headers: {
                'CHANNEL-KEY': Buffer.from(`${channelId}:${encryptedChannelKey}`).toString('base64'),
            },
        });
    }

    public async makeChannelRequest<Request, Response>(
        options: MakeChannelRequestRequest<Request>,
    ): ChannelManagerResponse<MakeChannelRequestResponse<Response>> {
        const {
            clientId,
            channelId: scope,
            data = {},
        } = options;

        return await this.requestService
            .getInstance()
            .request({
                method: 'post',
                url: `/channel/${clientId}/channel_request`,
                data: {
                    scope,
                    data,
                },
            });
    }
}
