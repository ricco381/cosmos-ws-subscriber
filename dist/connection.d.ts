import { EventEmitter } from "events";
import { CosmosSubscriberOptions } from "./types";
export declare class ConnectionManager extends EventEmitter {
    private ws;
    private opts;
    private isReconnecting;
    private manualClose;
    private pingInterval;
    private messageTimeout;
    private lastMessageTime;
    constructor(opts: CosmosSubscriberOptions);
    connect(): void;
    disconnect(): void;
    send(msg: object): void;
    private onOpen;
    private onMessage;
    private onPong;
    private onClose;
    private onError;
    private startPingInterval;
    private resetMessageTimeout;
    private scheduleReconnect;
    private clearTimers;
    private cleanup;
}
