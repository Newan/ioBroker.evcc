import assert from 'node:assert/strict';
import { EvccSocket, type SocketLike, type SocketTimers } from './socket';

class FakeSocket implements SocketLike {
    onopen: (() => void) | null = null;
    onmessage: ((event: { data: unknown }) => void) | null = null;
    onclose: ((event: { code?: number; reason?: string }) => void) | null = null;
    onerror: ((event: unknown) => void) | null = null;
    closed = false;
    close(): void {
        this.closed = true;
    }
}

/** Timers that run only when the test says so */
function fakeTimers(): SocketTimers & { run(): void; pending: number } {
    const timeouts = new Map<number, () => void>();
    let next = 1;
    return {
        setTimeout: cb => {
            timeouts.set(next, cb);
            return next++;
        },
        clearTimeout: handle => void timeouts.delete(handle as number),
        setInterval: () => 0,
        clearInterval: () => undefined,
        run() {
            const callbacks = [...timeouts.values()];
            timeouts.clear();
            callbacks.forEach(cb => cb());
        },
        get pending() {
            return timeouts.size;
        },
    };
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function setup() {
    const sockets: FakeSocket[] = [];
    const states: any[] = [];
    const disconnects: string[] = [];
    let now = 1_000;
    const timers = fakeTimers();
    const socket = new EvccSocket(
        'ws://evcc/ws',
        { onState: s => states.push(structuredClone(s)), onDisconnect: r => disconnects.push(r), log: () => undefined },
        {
            create: () => {
                const s = new FakeSocket();
                sockets.push(s);
                return s;
            },
            timers,
            now: () => now,
            watchdogMs: 60_000,
        },
    );
    return { socket, sockets, states, disconnects, timers, advance: (ms: number) => (now += ms) };
}

describe('socket => EvccSocket', () => {
    it('merges the welcome message and later changes', () => {
        const t = setup();
        t.socket.start();
        t.sockets[0].onopen?.();
        t.sockets[0].onmessage?.({ data: JSON.stringify({ homePower: 1, 'loadpoints.0.title': 'Garage' }) });
        t.sockets[0].onmessage?.({ data: JSON.stringify({ homePower: 2 }) });
        assert.strictEqual(t.socket.isLive(), true);
        assert.deepStrictEqual(t.states[1], { homePower: 2, loadpoints: [{ title: 'Garage' }] });
    });
    it('reconnects after a close and starts with a fresh state', () => {
        const t = setup();
        t.socket.start();
        t.sockets[0].onopen?.();
        t.sockets[0].onmessage?.({ data: JSON.stringify({ old: 1 }) });
        t.sockets[0].onclose?.({ code: 1006 });
        assert.deepStrictEqual(t.disconnects, ['closed (code 1006)']);
        assert.strictEqual(t.socket.isLive(), false);
        t.timers.run();
        assert.strictEqual(t.sockets.length, 2);
        t.sockets[1].onopen?.();
        t.sockets[1].onmessage?.({ data: JSON.stringify({ homePower: 3 }) });
        assert.deepStrictEqual(t.states[1], { homePower: 3 });
    });
    it('is not live without recent data', () => {
        const t = setup();
        t.socket.start();
        t.sockets[0].onopen?.();
        assert.strictEqual(t.socket.isLive(), false);
        t.sockets[0].onmessage?.({ data: '{"a":1}' });
        t.advance(61_000);
        assert.strictEqual(t.socket.isLive(), false);
    });
    it('ignores invalid messages and stops cleanly', () => {
        const t = setup();
        t.socket.start();
        t.sockets[0].onopen?.();
        t.sockets[0].onmessage?.({ data: 'no json' });
        assert.strictEqual(t.states.length, 0);
        t.socket.stop();
        assert.strictEqual(t.sockets[0].closed, true);
        assert.strictEqual(t.timers.pending, 0);
    });
});
