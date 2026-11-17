/**
 * Live connection to evcc via its WebSocket (`ws://<host>/ws`).
 *
 * evcc sends the complete state on connect and then only changes. The connection is reopened
 * automatically (increasing delay) and closed by a watchdog when evcc stays silent for too long,
 * e.g. after a network outage that never closed the TCP connection.
 */

import { applyDelta, type EvccState } from './stateMerge';

/** The part of the WebSocket API the class uses (Node.js >= 22 has it built in) */
export interface SocketLike {
    onopen: (() => void) | null;
    onmessage: ((event: { data: unknown }) => void) | null;
    onclose: ((event: { code?: number; reason?: string }) => void) | null;
    onerror: ((event: unknown) => void) | null;
    close(): void;
}

/** Timer functions, the adapter passes its own so they are cleared on unload */
export interface SocketTimers {
    setTimeout(cb: () => void, ms: number): unknown;
    clearTimeout(handle: unknown): void;
    setInterval(cb: () => void, ms: number): unknown;
    clearInterval(handle: unknown): void;
}

/** Callbacks of the live connection */
export interface SocketHandlers {
    /** new data: the merged complete state */
    onState(state: EvccState): void;
    /** the connection is closed (evcc not reachable, restart, watchdog) */
    onDisconnect(reason: string): void;
    /** debug output */
    log(message: string): void;
}

/** Options for tests */
export interface SocketOptions {
    create?: (url: string) => SocketLike;
    timers: SocketTimers;
    now?: () => number;
    /** close the connection if evcc sends nothing for this long */
    watchdogMs?: number;
    /** delays before reconnecting, the last one is repeated */
    reconnectDelaysMs?: number[];
}

/** Default: no message for 5 minutes = connection lost (evcc sends changes every control cycle) */
export const SOCKET_WATCHDOG_MS = 5 * 60_000;
const RECONNECT_DELAYS_MS = [5_000, 10_000, 30_000, 60_000];

/** Live connection to the evcc WebSocket */
export class EvccSocket {
    private socket: SocketLike | null = null;
    private state: EvccState = {};
    private lastMessage = 0;
    private open = false;
    private stopped = true;
    private attempt = 0;
    private reconnectTimer: unknown = undefined;
    private watchdogTimer: unknown = undefined;
    private readonly create: (url: string) => SocketLike;
    private readonly now: () => number;
    private readonly watchdogMs: number;
    private readonly delays: number[];

    /**
     * @param url WebSocket URL, e.g. ws://192.168.1.10:7070/ws
     * @param handlers callbacks
     * @param options timers and test hooks
     */
    constructor(
        private readonly url: string,
        private readonly handlers: SocketHandlers,
        private readonly options: SocketOptions,
    ) {
        this.create = options.create ?? ((u: string) => new WebSocket(u) as unknown as SocketLike);
        this.now = options.now ?? Date.now;
        this.watchdogMs = options.watchdogMs ?? SOCKET_WATCHDOG_MS;
        this.delays = options.reconnectDelaysMs ?? RECONNECT_DELAYS_MS;
    }

    /** Opens the connection and keeps it open until stop() */
    start(): void {
        this.stopped = false;
        this.watchdogTimer = this.options.timers.setInterval(() => this.checkWatchdog(), 30_000);
        this.connect();
    }

    /** Closes the connection for good */
    stop(): void {
        this.stopped = true;
        this.options.timers.clearTimeout(this.reconnectTimer);
        this.options.timers.clearInterval(this.watchdogTimer);
        this.closeSocket();
    }

    /**
     * True while the connection is open and evcc sent data recently.
     *
     * @returns live state
     */
    isLive(): boolean {
        return this.open && this.lastMessage > 0 && this.now() - this.lastMessage < this.watchdogMs;
    }

    private connect(): void {
        if (this.stopped) {
            return;
        }
        let socket: SocketLike;
        try {
            socket = this.create(this.url);
        } catch (error: any) {
            this.handleClose(`cannot open ${this.url}: ${error?.message ?? String(error)}`);
            return;
        }
        this.socket = socket;
        this.state = {};
        this.lastMessage = 0;
        socket.onopen = () => {
            this.open = true;
            this.handlers.log(`live connection to ${this.url} open`);
        };
        socket.onmessage = event => this.handleMessage(event.data);
        socket.onerror = () => {
            // details follow in onclose
        };
        socket.onclose = event => this.handleClose(event?.reason || `closed (code ${event?.code ?? '?'})`);
    }

    private handleMessage(data: unknown): void {
        let message: unknown;
        try {
            message = JSON.parse(typeof data === 'string' ? data : String(data));
        } catch {
            this.handlers.log('ignoring invalid message from evcc');
            return;
        }
        if (message === null || typeof message !== 'object' || Array.isArray(message)) {
            return;
        }
        applyDelta(this.state, message as Record<string, unknown>);
        this.lastMessage = this.now();
        this.attempt = 0;
        this.handlers.onState(this.state);
    }

    private handleClose(reason: string): void {
        if (this.reconnectTimer !== undefined) {
            return; // reconnect already scheduled
        }
        const wasOpen = this.open;
        this.open = false;
        this.closeSocket();
        if (this.stopped) {
            return;
        }
        if (wasOpen) {
            this.handlers.onDisconnect(reason);
        } else {
            this.handlers.log(`live connection failed: ${reason}`);
        }
        const delay = this.delays[Math.min(this.attempt, this.delays.length - 1)];
        this.attempt++;
        this.options.timers.clearTimeout(this.reconnectTimer);
        this.reconnectTimer = this.options.timers.setTimeout(() => {
            this.reconnectTimer = undefined;
            this.connect();
        }, delay);
    }

    private checkWatchdog(): void {
        if (this.open && this.lastMessage > 0 && this.now() - this.lastMessage >= this.watchdogMs) {
            this.handleClose('no data from evcc for too long');
        }
    }

    private closeSocket(): void {
        const socket = this.socket;
        this.socket = null;
        if (socket) {
            socket.onopen = null;
            socket.onmessage = null;
            socket.onclose = null;
            socket.onerror = null;
            try {
                socket.close();
            } catch {
                // already closed
            }
        }
    }
}
