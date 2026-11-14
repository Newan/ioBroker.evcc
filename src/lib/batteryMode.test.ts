import assert from 'node:assert/strict';
import { externalModeFromResponse, isBatteryModeRequest } from './batteryMode';

describe('batteryMode', () => {
    it('accepts the evcc modes and off', () => {
        for (const v of ['off', 'normal', 'hold', 'charge', 'holdcharge', 'discharge']) {
            assert.strictEqual(isBatteryModeRequest(v), true, v);
        }
        for (const v of ['', 'unknown', 'HOLD', 1, null]) {
            assert.strictEqual(isBatteryModeRequest(v), false, String(v));
        }
    });
    it('reads the numeric enum value evcc answers with', () => {
        assert.strictEqual(externalModeFromResponse(1), 'normal');
        assert.strictEqual(externalModeFromResponse(2), 'hold');
        assert.strictEqual(externalModeFromResponse(5), 'discharge');
        assert.strictEqual(externalModeFromResponse(0), '');
        assert.strictEqual(externalModeFromResponse(9), '');
    });
    it('reads the external mode from plain and wrapped responses', () => {
        assert.strictEqual(externalModeFromResponse('hold'), 'hold');
        assert.strictEqual(externalModeFromResponse({ result: 'charge' }), 'charge');
        assert.strictEqual(externalModeFromResponse('unknown'), '');
        assert.strictEqual(externalModeFromResponse(null), '');
    });
});
