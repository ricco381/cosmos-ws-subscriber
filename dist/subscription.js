"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionManager = void 0;
class SubscriptionManager {
    constructor(conn) {
        this.subscriptions = new Map();
        this.pending = new Map();
        this.conn = conn;
        this.conn.on("message", (raw) => this.handleMessage(raw));
    }
    add(query, cb) {
        if (this.subscriptions.has(query)) {
            throw new Error(`Already subscribed to query: ${query}`);
        }
        this.subscriptions.set(query, cb);
        return this;
    }
    remove(query) {
        const id = Date.now();
        return new Promise((resolve, reject) => {
            this.pending.set(id, { query, resolve, reject });
            this.subscriptions.delete(query);
            this.conn.send({
                jsonrpc: "2.0",
                id,
                method: "unsubscribe",
                params: { query }
            });
        });
    }
    async removeAll() {
        for (const query of this.subscriptions.keys()) {
            await this.remove(query);
        }
    }
    async restore() {
        for (const query of this.subscriptions.keys()) {
            await this.resubscribeOne(query);
        }
    }
    resubscribeOne(query) {
        const id = Date.now();
        return new Promise((resolve, reject) => {
            this.pending.set(id, { query, resolve, reject });
            this.conn.send({
                jsonrpc: "2.0",
                id,
                method: "subscribe",
                params: { query }
            });
        });
    }
    handleMessage(raw) {
        let msg;
        try {
            msg = JSON.parse(raw);
        }
        catch {
            return;
        }
        if (typeof msg.id === "number" && msg.result) {
            const pending = this.pending.get(msg.id);
            if (pending) {
                pending.resolve();
                this.pending.delete(msg.id);
            }
        }
        if (typeof msg.id === "number" && msg.error) {
            console.log(msg);
            const pending = this.pending.get(msg.id);
            if (pending) {
                pending.reject(new Error(msg.error.data || msg.error.message));
                this.pending.delete(msg.id);
            }
            return;
        }
        const query = msg?.result?.query;
        if (!query)
            return;
        const cb = this.subscriptions.get(query);
        if (cb)
            cb(msg);
    }
}
exports.SubscriptionManager = SubscriptionManager;
//# sourceMappingURL=subscription.js.map