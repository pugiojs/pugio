export abstract class AbstractConnection {
    // eslint-disable-next-line @typescript-eslint/no-useless-constructor
    public constructor() {}
    public abstract connect(): void;
}
