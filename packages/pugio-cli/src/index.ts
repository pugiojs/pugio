import { initialize } from './initialize';
import Container from 'typedi';
import * as commander from 'commander';

/**
 * command classes
 */
import { ClientCommand } from './client/client.command';
import { KeygenCommand } from './keygen/keygen.command';
import { AbstractCommand } from './command.abstract';

const commands = [
    ClientCommand,
    KeygenCommand,
];

initialize();

const program = new commander.Command();

for (const Command of commands) {
    const command = Container.get<AbstractCommand>(Command);
    command.initialize(program);
    command.register();
}

program.parse(process.argv);
