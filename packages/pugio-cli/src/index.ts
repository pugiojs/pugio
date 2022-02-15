import { initialize } from './initialize';
import Container from 'typedi';
import * as commander from 'commander';

/**
 * command classes
 */
import { ClientCommand } from './client/client.command';

const commands = [
    ClientCommand,
];

initialize();

const program = new commander.Command();

for (const Command of commands) {
    const command = Container.get(Command);
    command.initialize(program);
    command.register();
}

program.parse(process.argv);
