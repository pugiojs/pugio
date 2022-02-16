import * as child_process from 'child_process';
import * as _ from 'lodash';
import * as path from 'path';
import * as fs from 'fs-extra';
import {
    DecryptedExecutionData,
    SpawnDataHandler,
} from '@pugio/types';

export class Execution {
    private sequence = 0;
    private script: string;
    private commands: string[];

    public constructor(
        private readonly cwd: string,
        private readonly tempDir: string,
        private readonly executionData: DecryptedExecutionData = {},
        private readonly handleSpawnData: SpawnDataHandler = _.noop,
        private readonly handleClose: () => void | Promise<void> = _.noop,
    ) {}

    public execute() {
        const {
            script,
            preCommandSegment,
            postCommandSegment,
        } = this.executionData;

        if (!script || !_.isString(script)) {
            this.handleClose();
        }

        if (preCommandSegment && _.isString(preCommandSegment)) {
            const scriptPathname = path.resolve(this.tempDir, 'script');
            fs.writeFileSync(scriptPathname, script, { encoding: 'utf-8' });
            this.script = scriptPathname;
            this.commands.push(preCommandSegment);
        } else {
            this.script = script;
        }

        this.commands.push(this.script);

        if (_.isString(postCommandSegment)) {
            this.commands.push(postCommandSegment);
        }

        const executionProcess = child_process.spawn(this.commands[0], this.commands.slice(1), {
            cwd: this.cwd,
            stdio: 'inherit',
        });

        executionProcess.on('close', () => {
            this.handleClose();
            fs.removeSync(this.tempDir);
        });

        executionProcess.stdout.on('data', (data) => this.invokeSpawnDataHandler(data));
        executionProcess.stderr.on('data', (data) => this.invokeSpawnDataHandler(data, true));
    }

    private invokeSpawnDataHandler(data, error = false) {
        this.handleSpawnData({
            error,
            sequence: this.sequence,
            content: data.toString(),
        });
        this.sequence = this.sequence + 1;
    }
}
