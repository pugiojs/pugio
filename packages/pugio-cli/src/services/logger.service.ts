import * as _ from 'lodash';
import 'reflect-metadata';
import { Service } from 'typedi';

@Service()
export class LoggerService {
    protected logger: typeof console = console;

    public info(message: string) {
        this.baseLog(message, 'info');
    }

    public error(message: string) {
        this.baseLog(message, 'error');
    }

    public log(message: string, level: string) {
        this.baseLog(message, level);
    }

    public singleLog(message: string) {
        this.logger.log(message);
    }

    protected baseLog(message: string, level = 'info') {
        if (!_.isString(message)) {
            return;
        }

        const segments = [
            new Date().toLocaleString(),
            level.toString().toUpperCase(),
            message,
        ];

        this.logger.log(segments.join(' - '));
    }
}
