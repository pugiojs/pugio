import { AbstractChannelRequest } from '@pugio/sdk';
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
import * as mimeTypes from 'mime-types';

export class FileChannelRequest extends AbstractChannelRequest implements AbstractChannelRequest {
    private senderList = new Map<string, Sender>();
    private receiverList = new Map<string, Receiver>();

    public constructor() {
        super('pugio.file-manager', 'File Manager (Built-in)');
    }

    public async handleRequest(data: FileChannelRequestData): Promise<FileChannelResponse> {
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
                    throw new Error();
                }

                const dirItems = fs.readdirSync(pathname, {
                    withFileTypes: true,
                    encoding: 'utf-8',
                });

                const items = dirItems.map((dirItem) => {
                    const stat = fs.statSync(path.resolve(pathname, dirItem.name));
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
                    chunkContent = '',
                    index,
                    md5,
                } = data as FileChannelUploadRequestData;

                if (!this.receiverList.get(id)) {
                    this.receiverList.set(id, new Receiver({
                        id,
                        chunkCount,
                        pathname,
                        onFinish: (data) => {
                            try {
                                const { pathname, content } = data;
                                fs.writeFileSync(pathname, Buffer.from(content.buffer));
                                this.receiverList.set(id, null);
                                this.receiverList.delete(id);
                            } catch (e) {}
                        },
                    }));
                }

                const receiver = this.receiverList.get(id);
                const done = receiver.receiveChunk(index, chunkContent, md5);

                return { done } as FileChannelUploadResponse;
            }
            case 'download': {
                const {
                    pathname,
                    chunkSize = 1024 * 10,
                } = data as FileChannelDownloadRequestData;

                const id = uuidv5(`${pathname}@${new Date().toISOString()}`, uuidv1());
                const file = fs.readFileSync(pathname);
                const filename = path.basename(pathname);
                const mimeType = mimeTypes.lookup(path.extname(filename));

                this.senderList.set(id, new Sender({
                    id,
                    file,
                    chunkSize,
                    sender: async ({ index, chunkCount, chunkContent, md5 }) => {
                        try {
                            await this.clientManagerService.pushChannelGateway({
                                eventId: 'file:download:processing',
                                data: JSON.stringify({
                                    index,
                                    chunkContent,
                                    chunkCount,
                                    fileId: id,
                                    pathname,
                                    filename,
                                    mimeType,
                                    md5,
                                }),
                            });
                            return true;
                        } catch (e) {
                            return false;
                        }
                    },
                    onError: async (error) => {
                        try {
                            await this.clientManagerService.pushChannelGateway({
                                eventId: 'file:download:errored',
                                data: JSON.stringify({
                                    fileId: id,
                                    error: error.message || error.toString(),
                                }),
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
                                await this.clientManagerService.pushChannelGateway({
                                    eventId: 'file:download:finished',
                                    data: JSON.stringify({
                                        fileId: id,
                                    }),
                                });

                                this.senderList.set(id, null);
                                this.senderList.delete(id);
                            } catch (e) {}
                        }
                    },
                }));

                const sender = this.senderList.get(id);
                sender.send();

                return { id } as FileChannelDownloadResponse;
            }
            default:
                return null;
        }
    }
}
