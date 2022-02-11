import { ClientOptions } from '@pugio/types';
import { Container } from 'typedi';
import { ClientService } from './client.service';

export class Client {
    public constructor(protected readonly options: ClientOptions) {}

    public getInstance() {
        const instance = Container.get(ClientService);
        instance.initialize(this.options);
        return instance;
    }
}
