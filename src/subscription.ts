import { ConnectionManager } from "./connection";

export class SubscriptionManager {
    private conn: ConnectionManager;
    private subscriptions: Map<string, (msg: any) => void> = new Map();
    private pending: Map<number, { query: string; resolve: (value?: unknown) => void; reject: (err: Error) => void }> = new Map();

    constructor(conn: ConnectionManager) {
        this.conn = conn;
        this.conn.on("message", (raw) => this.handleMessage(raw));
    }

    public add(query: string, cb: (msg: any) => void) {
        if (this.subscriptions.has(query)) {
            throw new Error(`Already subscribed to query: ${query}`);
        }

        this.subscriptions.set(query, cb);
        return this;
    }

    public remove(query: string) {
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

    public async removeAll() {
        for (const query of this.subscriptions.keys()) {
            await this.remove(query);
        }
    }

    public async restore() {
        for (const query of this.subscriptions.keys()) {
            await this.resubscribeOne(query);
        }
    }

    private resubscribeOne(query: string) {
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

    private handleMessage(raw: string) {
        let msg: any;
        try {
            msg = JSON.parse(raw);
        } catch {
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
        if (!query) return;

        const cb = this.subscriptions.get(query);
        if (cb) cb(msg);
    }
}
