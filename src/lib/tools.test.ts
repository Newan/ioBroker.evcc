import assert from 'node:assert/strict';
import { AxiosError } from 'axios';
import { describeRequestError, formatDuration, normalizeHost } from './tools';

describe('tools => formatDuration', () => {
    it('formats seconds as hh:mm:ss', () => {
        assert.strictEqual(formatDuration(0), '00:00:00');
        assert.strictEqual(formatDuration(59), '00:00:59');
        assert.strictEqual(formatDuration(3661), '01:01:01');
    });
    it('adds days when >= 24 h', () => {
        assert.strictEqual(formatDuration(90061), '01:01:01:01');
    });
    it('returns empty string for unset or invalid values', () => {
        assert.strictEqual(formatDuration(9223372036), '');
        assert.strictEqual(formatDuration(9223372036.854), '');
        assert.strictEqual(formatDuration(null), '');
        assert.strictEqual(formatDuration(undefined), '');
        assert.strictEqual(formatDuration(-1), '');
        assert.strictEqual(formatDuration('abc'), '');
    });
});

describe('tools => normalizeHost', () => {
    it('keeps plain hosts and IPs', () => {
        assert.strictEqual(normalizeHost('192.168.1.238'), '192.168.1.238');
        assert.strictEqual(normalizeHost(' evcc.local '), 'evcc.local');
    });
    it('removes protocol and path', () => {
        assert.strictEqual(normalizeHost('http://192.168.1.238'), '192.168.1.238');
        assert.strictEqual(normalizeHost('HTTPS://evcc.local/'), 'evcc.local');
        assert.strictEqual(normalizeHost('http://evcc.local/api/state'), 'evcc.local');
    });
    it('does not break host names containing "http"', () => {
        assert.strictEqual(normalizeHost('myhttpserver.local'), 'myhttpserver.local');
    });
    it('returns empty string for invalid input', () => {
        assert.strictEqual(normalizeHost(undefined), '');
        assert.strictEqual(normalizeHost('   '), '');
        assert.strictEqual(normalizeHost('http://'), '');
    });
});

describe('tools => describeRequestError', () => {
    it('returns the network code or HTTP status of axios errors', () => {
        const refused = new AxiosError('connect ECONNREFUSED 192.168.1.238:7070', 'ECONNREFUSED');
        assert.strictEqual(describeRequestError(refused), 'ECONNREFUSED');
        const notFound = new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
            status: 404,
        } as never);
        assert.strictEqual(describeRequestError(notFound), 'HTTP 404');
    });
    it('returns null for other errors', () => {
        assert.strictEqual(describeRequestError(new TypeError('x is undefined')), null);
    });
});
