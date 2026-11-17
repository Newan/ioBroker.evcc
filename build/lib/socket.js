"use strict";
/**
 * Live connection to evcc via its WebSocket (`ws://<host>/ws`).
 *
 * evcc sends the complete state on connect and then only changes. The connection is reopened
 * automatically (increasing delay) and closed by a watchdog when evcc stays silent for too long,
 * e.g. after a network outage that never closed the TCP connection.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvccSocket = exports.SOCKET_WATCHDOG_MS = void 0;
const stateMerge_1 = require("./stateMerge");
/** Default: no message for 5 minutes = connection lost (evcc sends changes every control cycle) */
exports.SOCKET_WATCHDOG_MS = 5 * 60_000;
const RECONNECT_DELAYS_MS = [5_000, 10_000, 30_000, 60_000];
/** Live connection to the evcc WebSocket */
class EvccSocket {
    url;
    handlers;
    options;
    socket = null;
    state = {};
    lastMessage = 0;
    open = false;
    stopped = true;
    attempt = 0;
    reconnectTimer = undefined;
    watchdogTimer = undefined;
    create;
    now;
    watchdogMs;
    delays;
    /**
     * @param url WebSocket URL, e.g. ws://192.168.1.10:7070/ws
     * @param handlers callbacks
     * @param options timers and test hooks
     */
    constructor(url, handlers, options) {
        this.url = url;
        this.handlers = handlers;
        this.options = options;
        this.create = options.create ?? ((u) => new WebSocket(u));
        this.now = options.now ?? Date.now;
        this.watchdogMs = options.watchdogMs ?? exports.SOCKET_WATCHDOG_MS;
        this.delays = options.reconnectDelaysMs ?? RECONNECT_DELAYS_MS;
    }
    /** Opens the connection and keeps it open until stop() */
    start() {
        this.stopped = false;
        this.watchdogTimer = this.options.timers.setInterval(() => this.checkWatchdog(), 30_000);
        this.connect();
    }
    /** Closes the connection for good */
    stop() {
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
    isLive() {
        return this.open && this.lastMessage > 0 && this.now() - this.lastMessage < this.watchdogMs;
    }
    connect() {
        if (this.stopped) {
            return;
        }
        let socket;
        try {
            socket = this.create(this.url);
        }
        catch (error) {
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
    handleMessage(data) {
        let message;
        try {
            message = JSON.parse(typeof data === 'string' ? data : String(data));
        }
        catch {
            this.handlers.log('ignoring invalid message from evcc');
            return;
        }
        if (message === null || typeof message !== 'object' || Array.isArray(message)) {
            return;
        }
        (0, stateMerge_1.applyDelta)(this.state, message);
        this.lastMessage = this.now();
        this.attempt = 0;
        this.handlers.onState(this.state);
    }
    handleClose(reason) {
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
        }
        else {
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
    checkWatchdog() {
        if (this.open && this.lastMessage > 0 && this.now() - this.lastMessage >= this.watchdogMs) {
            this.handleClose('no data from evcc for too long');
        }
    }
    closeSocket() {
        const socket = this.socket;
        this.socket = null;
        if (socket) {
            socket.onopen = null;
            socket.onmessage = null;
            socket.onclose = null;
            socket.onerror = null;
            try {
                socket.close();
            }
            catch {
                // already closed
            }
        }
    }
}
exports.EvccSocket = EvccSocket;
//# sourceMappingURL=socket.js.map