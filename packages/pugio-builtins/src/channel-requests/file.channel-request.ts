import { AbstractChannelRequest } from './channel-request.abstract';
import {
    FileChannelDownloadRequestData,
    FileChannelDownloadResponse,
    FileChannelMoveRequestData,
    FileChannelReaddirRequestData,
    FileChannelRequestData,
    FileChannelResponse,
    FileChannelUploadRequestData,
    FileChannelUploadResponse,
} from '@pugio/types';
import * as _ from 'lodash';
import * as fs from 'fs-extra';
import * as path from 'path';
import {
    Sender,
    Receiver,
} from '@pugio/segmental-transferer';
import {
    v1 as uuidv1,
    v5 as uuidv5,
} from 'uuid';

export class FileChannelRequest extends AbstractChannelRequest implements AbstractChannelRequest {
    private senderList: Record<string, Sender> = {};
    private receiverList: Record<string, Receiver> = {};

    public constructor() {
        super('file');
    }

    public handleRequest(data: FileChannelRequestData): FileChannelResponse {
        const { action } = data;

        switch (action) {
            case 'readdir': {
                const {
                    pathname,
                } = data as FileChannelReaddirRequestData;

                if (
                    !_.isString(pathname) ||
                    !fs.existsSync(pathname) ||
                    !fs.statSync(pathname).isDirectory()
                ) {
                    return null;
                }

                try {
                    const dirItems = fs.readdirSync(pathname, {
                        withFileTypes: true,
                        encoding: 'utf-8',
                    });

                    const items = dirItems.map((dirItem) => {
                        const stat = fs.statSync(path.resolve());
                        return {
                            ...stat,
                            name: dirItem.name,
                            isFIFO: stat.isFIFO(),
                            isFile: stat.isFile(),
                            isDirectory: stat.isDirectory(),
                            isSocket: stat.isSocket(),
                            isSymbolicLink: stat.isSymbolicLink(),
                        };
                    });

                    return items;
                } catch (e) {
                    return [];
                }
            }
            case 'move': {
                const {
                    source,
                    destination,
                } = data as FileChannelMoveRequestData;

                let done = false;

                if (!_.isString(source) || !_.isString(destination)) {
                    return { done };
                }

                try {
                    fs.moveSync(source, destination);
                    done = true;
                } catch (e) {}

                return { done };
            }
            case 'upload': {
                const {
                    id,
                    pathname,
                    chunkCount,
                    chunkContent,
                    index,
                } = data as FileChannelUploadRequestData;

                if (!this.receiverList[id]) {
                    this.receiverList[id] = new Receiver({
                        id,
                        chunkCount,
                        pathname,
                        onFinish: (data) => {
                            try {
                                const { pathname, content } = data;
                                fs.writeFileSync(pathname, Buffer.from(content.buffer));
                                this.receiverList[id] = null;
                            } catch (e) {}
                        },
                    });
                }

                const receiver = this.receiverList[id];
                const done = receiver.receiveChunk(index, chunkContent);

                return { done } as FileChannelUploadResponse;
            }
            case 'download': {
                const {
                    pathname,
                    chunkSize = 1024 * 10,
                } = data as FileChannelDownloadRequestData;

                const id = uuidv5(`${pathname}@${new Date().toISOString()}`, uuidv1());
                const file = fs.readFileSync(pathname);

                const sender = new Sender({
                    id,
                    file,
                    chunkSize,
                    sender: async (index, chunkCount, chunkContent) => {
                        try {
                            await this.sdkService.pushChannelGateway({
                                eventId: 'file:download:processing',
                                data: {
                                    index,
                                    chunkContent,
                                    chunkCount,
                                    fileId: id,
                                },
                            });
                            return true;
                        } catch (e) {
                            return false;
                        }
                    },
                    onError: async () => {
                        try {
                            await this.sdkService.pushChannelGateway({
                                eventId: 'file:download:errored',
                                data: {
                                    fileId: id,
                                },
                            });
                        } catch (e) {}
                    },
                    onStatusChange: async (status) => {
                        const {
                            total,
                            succeeded,
                        } = status;

                        if (total === succeeded) {
                            try {
                                await this.sdkService.pushChannelGateway({
                                    eventId: 'file:download:finished',
                                    data: {
                                        fileId: id,
                                    },
                                });
                                this.senderList[id] = null;
                            } catch (e) {}
                        }
                    },
                });

                sender.send();

                return { id } as FileChannelDownloadResponse;
            }
            default:
                return null;
        }
    }
}
