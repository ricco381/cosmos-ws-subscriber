export interface CosmosSubscriberOptions {
    rpcUrl: string;
    autoReconnect?: boolean;
    reconnectInterval?: number;
    pingInterval?: number;
    pongTimeout?: number;
    messageTimeout?: number;
}
