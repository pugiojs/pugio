import { ConfigService } from './config';
import Container from 'typedi';

export const initialize = () => {
    const config = Container.get<ConfigService>(ConfigService);

    return config;
};
