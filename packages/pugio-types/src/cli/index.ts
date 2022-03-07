export interface CLIConfig {
    client?: {
        id?: string;
        apiKey?: string;
        publicKey?: string;
        privateKey?: string;
    };
    sdk?: {
        hostname?: string;
        apiVersion?: number;
    };
    connection?: {
        hostname?: string;
        port?: number;
        pollTimerGap?: number;
    };
}

export interface CommandOptions<P> {
    name: string;
    program: P;
}

export interface ChannelTaskItem {
    message: string;
    handler: (context: any) => any | Promise<any>;
}
