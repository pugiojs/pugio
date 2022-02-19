import { AbstractChannelRequest } from './channel-request.abstract';
import {
    FileChannelRequestData,
    FileChannelResult,
} from '@pugio/types';
import * as _ from 'lodash';
import * as fs from 'fs-extra';
import * as path from 'path';

export class FileChannelRequest extends AbstractChannelRequest implements AbstractChannelRequest {
    public constructor() {
        super('file');
    }

    public handleRequest(data: FileChannelRequestData): FileChannelResult {
        const { pathname } = data;

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
}
