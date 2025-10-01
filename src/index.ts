import { EventEmitter } from "events";
import { ConnectionManager } from "./connection";
import { SubscriptionManager } from "./subscription";
import { CosmosSubscriberOptions} from "./types";
import { parsingFromWs } from "@ricco381/cosmos-tx-parser";

export class CosmosSubscriber extends EventEmitter {
    private conn: ConnectionManager;
    private subs: SubscriptionManager;

    constructor(private opts: CosmosSubscriberOptions) {
        super();
        this.conn = new ConnectionManager(opts);
        this.subs = new SubscriptionManager(this.conn);

        this.conn.on("open", () => {
            this.subs.restore()
                .then(() =>  this.emit("connect", this.opts.rpcUrl))
                .catch(async (err) => {
                    await this.subs.removeAll();
                    this.conn.disconnect();

                    this.emit('error', err);
                });
        });

        this.conn.on("close", () => this.emit("disconnect"));
        this.conn.on("pong", () => this.emit("pong"));
        this.conn.on("error", (err) => this.emit("error", err));
    }

    public start() {
        this.conn.connect();
    }

    public stop() {
        this.conn.disconnect();
    }

    public subscribe(action: string) {
        this.subs.add(action, (msg) => {
            this.emit("message", msg);
        });

        return this;
    }
}
