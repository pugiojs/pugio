import 'reflect-metadata';
import { CLIConfig } from '@pugio/types';
import * as _ from 'lodash';
import * as path from 'path';
import * as fs from 'fs-extra';
import {
    dataDir,
    configFile as defaultConfigFile,
    pidFile,
} from './defaults';
import { Service } from 'typedi';
import { UtilsService } from '@pugio/utils';

abstract class AbstractConfig {
    protected config: CLIConfig = {};

    public abstract setConfig(userConfig: any, pathname: string): void;
    public abstract getConfig(pathname?: string): any;
}

@Service()
export class ConfigService extends AbstractConfig implements AbstractConfig {
    private defaultConfigFilePathname: string;

    public constructor(
        private readonly utilsService: UtilsService,
    ) {
        super();
        this.defaultConfigFilePathname = path.resolve(
            dataDir,
            defaultConfigFile,
        );

        this.utilsService.ensureDataDir(dataDir);
        this.ensureConfigFile();

        this.config = this.readConfig(this.defaultConfigFilePathname);
    }

    public mergeUserConfig(configFilePathname: string) {
        if (_.isString(configFilePathname)) {
            this.config = _.merge(this.config, this.readConfig(configFilePathname));
        }
    }

    public setConfig(pathname: string, value: any) {
        this.config = _.set(this.config, pathname, value);
    }

    public getConfig(pathname?: string) {
        if (!_.isString(pathname)) {
            return _.cloneDeep(this.config) as CLIConfig;
        }

        return _.cloneDeep(_.get(this.config, pathname));
    }

    public getPidFilePathname() {
        return path.resolve(dataDir, pidFile);
    }

    public ensureConfigFile() {
        if (
            !fs.existsSync(this.defaultConfigFilePathname) &&
            !fs.statSync(this.defaultConfigFilePathname).isFile()
        ) {
            const defaultConfig = fs.readFileSync(path.resolve(__dirname, './default.json')).toString();
            fs.writeFileSync(this.defaultConfigFilePathname, defaultConfig, {
                encoding: 'utf-8',
            });
        }
    }

    private readConfig(pathname?: string) {
        if (!_.isString(pathname)) {
            return {};
        }

        if (fs.existsSync(pathname) && fs.statSync(pathname).isFile()) {
            try {
                return fs.readJsonSync(pathname);
            } catch(e) {
                return {};
            }
        }
    }
}
