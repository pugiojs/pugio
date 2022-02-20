import 'reflect-metadata';
import { CLIConfig } from '@pugio/types';
import * as _ from 'lodash';
import * as path from 'path';
import * as fs from 'fs-extra';
import { Service } from 'typedi';
import { UtilsService } from '@pugio/utils';
import * as os from 'os';
import { constants } from '@pugio/builtins';

const {
    dataDir,
    configFile: defaultConfigFile,
    pidFile,
    pathResolveKeyList,
} = constants;

abstract class AbstractConfig {
    protected config: CLIConfig = {};

    public abstract setConfig(userConfig: any, pathname: string): void;
    public abstract getConfig(pathname?: string): any;
}

@Service()
export class ConfigService extends AbstractConfig implements AbstractConfig {
    private defaultConfigFilePathname: string;
    private defaultConfig: CLIConfig = {};

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
        this.defaultConfig = _.cloneDeep(this.config);
    }

    public mergeUserConfig(configFilePathname: string) {
        if (_.isString(configFilePathname)) {
            this.config = _.merge(this.config, this.readConfig(configFilePathname));
        }
    }

    public setConfig(pathname: string, value: any) {
        let configValue = value;

        if (
            _.isString(value) &&
            pathResolveKeyList.indexOf(pathname) !== -1
        ) {
            configValue = path.resolve(
                process.cwd(),
                value.replace(/^~/g, os.homedir()),
            );
        }

        this.defaultConfig = _.set(this.defaultConfig, pathname, configValue);
        this.config = _.merge(this.defaultConfig, this.config);

        fs.writeFileSync(
            this.defaultConfigFilePathname,
            JSON.stringify(this.defaultConfig, null, 4),
            {
                encoding: 'utf-8',
            },
        );
    }

    public getConfig<T>(pathname?: string): T {
        if (!_.isString(pathname)) {
            return _.cloneDeep(this.config) as T;
        }

        return _.cloneDeep(_.get(this.config, pathname)) as T;
    }

    public getPidFilePathname() {
        return path.resolve(dataDir, pidFile);
    }

    public ensureConfigFile() {
        if (
            !fs.existsSync(this.defaultConfigFilePathname) ||
            !fs.statSync(this.defaultConfigFilePathname).isFile()
        ) {
            const defaultConfig = fs.readFileSync(path.resolve(__dirname, '../../static/default.json')).toString();
            fs.writeFileSync(this.defaultConfigFilePathname, defaultConfig, {
                encoding: 'utf-8',
            });
        }
    }

    public getMappedConfig(mapper: Record<string, string>) {
        if (!_.isObject(mapper)) {
            return {};
        }

        const result = Object.keys(mapper).reduce((result, pathname) => {
            const originalPathname = mapper[pathname];

            if (!_.isString(originalPathname)) {
                return result;
            }

            const value = this.getConfig(originalPathname);

            return _.set(result, pathname, value);
        }, {});

        return result;
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
