import 'reflect-metadata';
import { Service } from 'typedi';
import * as _ from 'lodash';
import * as fs from 'fs-extra';
import findProcess = require('find-process');

@Service()
export class ProcessService {
    private pidFilePathname: string;

    public setPIDFilePathname(pidFilePathname: string) {
        if (_.isString(pidFilePathname)) {
            this.pidFilePathname = pidFilePathname;
        }
    }

    public writePIDFile(pid: number) {
        if (_.isNumber(pid) && _.isString(this.pidFilePathname)) {
            fs.writeFileSync(this.pidFilePathname, pid.toString(), {
                encoding: 'utf-8',
            });
        }
    }

    public deletePIDFile() {
        if (!_.isString(this.pidFilePathname)) {
            return;
        }
        fs.removeSync(this.pidFilePathname);
    }

    public getProcessPID() {
        if (
            !_.isString(this.pidFilePathname) ||
            !fs.existsSync(this.pidFilePathname) ||
            !fs.statSync(this.pidFilePathname).isFile()
        ) {
            return null;
        }

        let pid: number;

        try {
            const pidString = fs.readFileSync(this.pidFilePathname).toString();
            pid = parseInt(pidString, 10);
        } catch (e) {
            return null;
        }

        if (!_.isNumber(pid) || _.isNaN(pid)) {
            return null;
        }

        return pid;
    }

    public async checkProcessAlive() {
        const pid = this.getProcessPID();

        if (!_.isNumber(pid)) {
            return false;
        }

        const processes = await findProcess('pid', pid);

        return Boolean(processes.length);
    }

    public async killProcess() {
        try {
            const pid = this.getProcessPID();

            if (!_.isNumber(pid)) {
                return false;
            }

            const result = process.kill(pid);
            this.deletePIDFile();
            return result;
        } catch (e) {
            return false;
        }
    }
}
