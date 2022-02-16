import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { Service } from 'typedi';
import { UtilsService } from '@pugio/utils';
import { LoggerService } from '../services/logger.service';
import { AbstractCommand } from '../command.abstract';
import * as commander from 'commander';
import * as _ from 'lodash';
import NodeRSA from 'node-rsa';
import * as os from 'os';

@Service()
export class KeygenCommand extends AbstractCommand implements AbstractCommand {
    public constructor(
        private readonly loggerService: LoggerService,
        private readonly utilsService: UtilsService,
    ) {
        super();
        this.setCommandName('keygen');
    }

    protected createCommand(command: commander.Command): commander.Command {
        command
            .description('Generate RSA key pairs for Pugio')
            .option('--public-key-format <format>', 'Public key format')
            .option('--private-key-format <format>', 'Private key format')
            .requiredOption('-o, --output <dirname>', 'Specify a directory to generate key pair')
            .action(async () => {
                const {
                    output: relativeOutputDir,
                    publicKeyFormat = 'pkcs8-public-pem' as NodeRSA.FormatPem,
                    privateKeyFormat = 'pkcs8-private-pem' as NodeRSA.FormatPem,
                } = command.opts();

                if (_.isString(relativeOutputDir)) {
                    const outputDir = path.resolve(
                        process.cwd(),
                        relativeOutputDir.replace(/^~/g, os.homedir()),
                    );

                    this.utilsService.ensureDataDir(outputDir);

                    const key = new NodeRSA({ b: 1024 });

                    const publicKey = key.exportKey(publicKeyFormat);
                    const privateKey = key.exportKey(privateKeyFormat);

                    const publicKeyPathname = path.resolve(outputDir, './public.pem');
                    const privateKeyPathname = path.resolve(outputDir, './private.pem');

                    fs.writeFileSync(publicKeyPathname, publicKey, 'utf-8');
                    this.loggerService.singleLog(`Export public key to ${publicKeyPathname}`);
                    fs.writeFileSync(privateKeyPathname, privateKey, 'utf-8');
                    this.loggerService.singleLog(`Export private key to ${privateKeyPathname}`);
                }
            });

        return command;
    }
}
