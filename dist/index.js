"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CosmosSubscriber = void 0;
const events_1 = require("events");
const connection_1 = require("./connection");
const subscription_1 = require("./subscription");
const cosmos_tx_parser_1 = require("@ricco381/cosmos-tx-parser");
class CosmosSubscriber extends events_1.EventEmitter {
    constructor(opts) {
        super();
        this.opts = opts;
        this.conn = new connection_1.ConnectionManager(opts);
        this.subs = new subscription_1.SubscriptionManager(this.conn);
        this.conn.on("open", () => {
            this.subs.restore()
                .then(() => this.emit("connect", this.opts.rpcUrl))
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
    start() {
        this.conn.connect();
    }
    stop() {
        this.conn.disconnect();
    }
    subscribeTx() {
        this.subs.add("tm.event='Tx'", (msg) => {
            this.prepareResponse('tx', msg);
        });
        return this;
    }
    subscribeMsgSend() {
        this.subs.add("tm.event='Tx' AND message.action='/cosmos.bank.v1beta1.MsgSend'", (msg) => {
            this.prepareResponse('msg_send', msg);
        });
        return this;
    }
    subscribeMsgMultiSend() {
        this.subs.add("tm.event='Tx' AND message.action='/cosmos.bank.v1beta1.MsgMultiSend'", (msg) => {
            this.prepareResponse('msg_multi_send', msg);
        });
        return this;
    }
    withParserTx(parserFn) {
        this.parser = parserFn ?? cosmos_tx_parser_1.parsingFromWs;
        return this;
    }
    prepareResponse(name, msg) {
        if (this.parser) {
            const { result } = msg;
            if (!result)
                return;
            this.emit("message", this.parser(result));
        }
        else {
            this.emit("message", msg);
        }
        this.emit(name, msg);
    }
}
exports.CosmosSubscriber = CosmosSubscriber;
//# sourceMappingURL=index.js.map