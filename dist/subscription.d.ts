import { ConnectionManager } from "./connection";
export declare class SubscriptionManager {
    private conn;
    private subscriptions;
    private pending;
    constructor(conn: ConnectionManager);
    add(query: string, cb: (msg: any) => void): this;
    remove(query: string): Promise<unknown>;
    removeAll(): Promise<void>;
    restore(): Promise<void>;
    private resubscribeOne;
    private handleMessage;
}
