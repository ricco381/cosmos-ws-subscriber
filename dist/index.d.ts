import { EventEmitter } from "events";
import { CosmosSubscriberOptions } from "./types";
export declare class CosmosSubscriber extends EventEmitter {
    private opts;
    private conn;
    private subs;
    private parser?;
    constructor(opts: CosmosSubscriberOptions);
    start(): void;
    stop(): void;
    subscribeTx(): this;
    subscribeMsgSend(): this;
    subscribeMsgMultiSend(): this;
    withParserTx(parserFn?: (msg: any) => any): this;
    private prepareResponse;
}
