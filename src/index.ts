import { EventEmitter } from "events";
import { ConnectionManager } from "./connection";
import { SubscriptionManager } from "./subscription";
import { CosmosSubscriberOptions} from "./types";
import { parsingFromWs } from "cosmos-tx-parser";

export class CosmosSubscriber extends EventEmitter {
    private conn: ConnectionManager;
    private subs: SubscriptionManager;
    private parser?: (msg: any) => any;

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

    public subscribeTx() {
        this.subs.add("tm.event='Tx'", (msg) => {
            this.prepareResponse('tx', msg)
        });

        return this;
    }

    public subscribeMsgSend() {
        this.subs.add("tm.event='Tx' AND message.action='/cosmos.bank.v1beta1.MsgSend'", (msg) => {
            this.prepareResponse('msg_send', msg)
        });

        return this;
    }

    public subscribeMsgMultiSend() {
        this.subs.add("tm.event='Tx' AND message.action='/cosmos.bank.v1beta1.MsgMultiSend'", (msg) => {
            this.prepareResponse('msg_multi_send', msg)
        });

        return this;
    }

    public withParserTx(parserFn?: (msg: any) => any) {
        this.parser = parserFn ?? parsingFromWs;

        return this;
    }

    private prepareResponse(name: string, msg: any) {
        if (this.parser) {
            const {result} = msg;
            if (!result) return;

            this.emit("message", this.parser(result));
        } else {
            this.emit("message", msg);
        }

       this.emit(name, msg);
    }
}
