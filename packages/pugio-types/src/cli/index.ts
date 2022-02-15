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
        pollTimerGap?: number;
    };
}
