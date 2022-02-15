import * as commander from 'commander';
import * as _ from 'lodash';

export abstract class AbstractCommand {
    protected commandName: string;
    private program: commander.Command;

    public initialize(program: commander.Command) {
        this.program = program;
    }

    public register() {
        if (!(this.program instanceof commander.Command) || !_.isString(this.commandName)) {
            throw new Error('Invalid options type for register command');
        }

        const command = this.createCommand(new commander.Command(this.commandName));
        if (command instanceof commander.Command) {
            this.program.addCommand(command);
        }
    }

    protected setCommandName(commandName: string) {
        this.commandName = commandName;
    };

    protected abstract createCommand(command: commander.Command): commander.Command;
}
