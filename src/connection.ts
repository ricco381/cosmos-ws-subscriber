import WebSocket from "ws";
import { EventEmitter } from "events";
import { CosmosSubscriberOptions } from "./types";

export class ConnectionManager extends EventEmitter {
    private ws: WebSocket | null = null;
    private opts: CosmosSubscriberOptions;
    private isReconnecting = false;
    private manualClose = false;

    private pingInterval: NodeJS.Timeout | null = null;
    private messageTimeout: NodeJS.Timeout | null = null;
    private reconnectTimer: NodeJS.Timeout | null = null;
    private lastMessageTime: number = 0;

    constructor(opts: CosmosSubscriberOptions) {
        super();
        this.opts = opts;
    }

    connect() {
        this.ws = new WebSocket(this.opts.rpcUrl);

        this.ws.on("open", () => this.onOpen());
        this.ws.on("message", (msg) => this.onMessage(msg.toString()));
        this.ws.on("pong", () => this.onPong());
        this.ws.on("error", (err) => this.onError(err));
    }

    disconnect() {
        this.manualClose = true;
        this.cleanup();
    }

    send(msg: object) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(msg));
        }
    }

    private onOpen() {
        this.lastMessageTime = Date.now();
        this.startPingInterval();
        this.resetMessageTimeout();
        this.emit("open");
    }

    private onMessage(raw: string) {
        this.lastMessageTime = Date.now();
        this.resetMessageTimeout();
        this.emit("message", raw);
    }

    private onPong() {
        this.lastMessageTime = Date.now();
        this.emit("pong");
    }

    private onClose() {
        this.emit("close");
    }

    private onError(err: Error) {
        this.emit("error", err);
        this.scheduleReconnect();
    }

    private startPingInterval() {
        this.clearTimers();

        const pingInterval = this.opts.pingInterval ?? 30000;
        const pongTimeout = this.opts.pongTimeout ?? 10000;

        this.pingInterval = setInterval(() => {
            if (this.ws?.readyState === WebSocket.OPEN) {
                this.ws.ping();

                setTimeout(() => {
                    const sinceLast = Date.now() - this.lastMessageTime;
                    if (sinceLast > pongTimeout) {
                        this.emit("error", "pong timeout");
                        this.scheduleReconnect();
                    }
                }, pongTimeout);
            }
        }, pingInterval);
    }

    private resetMessageTimeout() {
        if (this.messageTimeout) clearTimeout(this.messageTimeout);

        const timeout = this.opts.messageTimeout ?? 120000;
        this.messageTimeout = setTimeout(() => {
            this.emit("error", `no messages for ${timeout / 1000} sec`);
            this.scheduleReconnect();
        }, timeout);
    }

    private scheduleReconnect() {
        if (this.manualClose) return;
        if (!this.opts.autoReconnect) return;
        if (this.isReconnecting) return;

        this.isReconnecting = true;
        const interval = this.opts.reconnectInterval ?? 5000;

        this.reconnectTimer = setTimeout(() => {
            this.cleanup();
            this.connect();
            this.isReconnecting = false;
        }, interval);
    }

    private clearTimers() {
        if (this.pingInterval) clearInterval(this.pingInterval);
        if (this.messageTimeout) clearTimeout(this.messageTimeout);
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

        this.manualClose = false;
        this.pingInterval = null;
        this.messageTimeout = null;
        this.reconnectTimer = null;
    }

    private cleanup() {
        this.clearTimers();

        if (this.ws) {
            try {
                this.ws.removeAllListeners();
                this.ws.once("close", () => {
                    this.onClose();
                });

                this.ws.close();

            } catch (e) {
                this.emit("error", e);
            } finally {
                this.ws = null;
            }
        }
    }
}
