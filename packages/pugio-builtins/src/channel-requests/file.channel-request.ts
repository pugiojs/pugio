import { AbstractChannelRequest } from './channel-request.abstract';
import {
    FileChannelMoveRequestData,
    FileChannelReaddirRequestData,
    FileChannelRequestData,
    FileChannelResponse,
} from '@pugio/types';
import * as _ from 'lodash';
import * as fs from 'fs-extra';
import * as path from 'path';

export class FileChannelRequest extends AbstractChannelRequest implements AbstractChannelRequest {
    private fileList;

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
            default:
                return null;
        }
    }
}
