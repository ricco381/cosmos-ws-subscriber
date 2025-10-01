"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionManager = void 0;
const ws_1 = __importDefault(require("ws"));
const events_1 = require("events");
class ConnectionManager extends events_1.EventEmitter {
    constructor(opts) {
        super();
        this.ws = null;
        this.isReconnecting = false;
        this.manualClose = false;
        this.pingInterval = null;
        this.messageTimeout = null;
        this.lastMessageTime = 0;
        this.opts = opts;
    }
    connect() {
        this.cleanup();
        this.ws = new ws_1.default(this.opts.rpcUrl);
        this.ws.on("open", () => this.onOpen());
        this.ws.on("message", (msg) => this.onMessage(msg.toString()));
        this.ws.on("pong", () => this.onPong());
        this.ws.on("error", (err) => this.onError(err));
    }
    disconnect() {
        this.manualClose = true;
        this.cleanup();
    }
    send(msg) {
        if (this.ws?.readyState === ws_1.default.OPEN) {
            this.ws.send(JSON.stringify(msg));
        }
    }
    onOpen() {
        this.lastMessageTime = Date.now();
        this.startPingInterval();
        this.resetMessageTimeout();
        this.emit("open");
    }
    onMessage(raw) {
        this.lastMessageTime = Date.now();
        this.resetMessageTimeout();
        this.emit("message", raw);
    }
    onPong() {
        this.lastMessageTime = Date.now();
        this.emit("pong");
    }
    onClose() {
        this.emit("close");
        this.scheduleReconnect();
    }
    onError(err) {
        this.emit("error", err);
        this.scheduleReconnect();
    }
    startPingInterval() {
        this.clearTimers();
        const pingInterval = this.opts.pingInterval ?? 30000;
        const pongTimeout = this.opts.pongTimeout ?? 10000;
        this.pingInterval = setInterval(() => {
            if (this.ws?.readyState === ws_1.default.OPEN) {
                this.ws.ping();
                setTimeout(() => {
                    const sinceLast = Date.now() - this.lastMessageTime;
                    if (sinceLast > pongTimeout) {
                        this.emit("error", new Error("pong timeout"));
                        this.scheduleReconnect();
                    }
                }, pongTimeout);
            }
        }, pingInterval);
    }
    resetMessageTimeout() {
        if (this.messageTimeout)
            clearTimeout(this.messageTimeout);
        const timeout = this.opts.messageTimeout ?? 120000;
        this.messageTimeout = setTimeout(() => {
            const sinceLast = Date.now() - this.lastMessageTime;
            this.emit("error", new Error(`no messages for ${sinceLast}ms`));
            this.scheduleReconnect();
        }, timeout);
    }
    scheduleReconnect() {
        if (!this.manualClose)
            return;
        if (!this.opts.autoReconnect)
            return;
        if (this.isReconnecting)
            return;
        this.isReconnecting = true;
        const interval = this.opts.reconnectInterval ?? 5000;
        setTimeout(() => {
            this.cleanup();
            this.connect();
            this.isReconnecting = false;
        }, interval);
    }
    clearTimers() {
        if (this.pingInterval)
            clearInterval(this.pingInterval);
        if (this.messageTimeout)
            clearTimeout(this.messageTimeout);
        this.manualClose = false;
        this.pingInterval = null;
        this.messageTimeout = null;
    }
    cleanup() {
        this.clearTimers();
        if (this.ws) {
            try {
                this.ws.on("close", () => {
                    this.ws?.removeAllListeners();
                    this.ws = null;
                    this.onClose();
                });
                this.ws.close();
            }
            catch (e) {
                this.emit("error", e);
            }
        }
    }
}
exports.ConnectionManager = ConnectionManager;
//# sourceMappingURL=connection.js.map