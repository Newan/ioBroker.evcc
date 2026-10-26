import assert from 'node:assert/strict';
import { hasSmartModeApi, isAlwaysChargeValue, PvControl, toPvControl } from './mode';

describe('mode => hasSmartModeApi', () => {
    it('detects evcc >= 0.316 by alwaysCharge', () => {
        assert.strictEqual(hasSmartModeApi({ alwaysCharge: 'off' }), true);
    });
    it('returns false for older evcc versions', () => {
        assert.strictEqual(hasSmartModeApi({}), false);
        assert.strictEqual(hasSmartModeApi({ alwaysCharge: null }), false);
        assert.strictEqual(hasSmartModeApi(undefined), false);
    });
});

describe('mode => isAlwaysChargeValue', () => {
    it('accepts off | on | once', () => {
        for (const v of ['off', 'on', 'once']) {
            assert.strictEqual(isAlwaysChargeValue(v), true);
        }
    });
    it('rejects other values', () => {
        for (const v of ['ON', '', 1, true, null, undefined]) {
            assert.strictEqual(isAlwaysChargeValue(v), false);
        }
    });
});

describe('mode => toPvControl', () => {
    it('maps legacy modes (evcc < 0.316)', () => {
        assert.strictEqual(toPvControl('off'), PvControl.Off);
        assert.strictEqual(toPvControl('pv'), PvControl.Smart);
        assert.strictEqual(toPvControl('minpv'), PvControl.SmartAlwaysCharge);
        assert.strictEqual(toPvControl('now'), PvControl.Now);
    });
    it('maps smart + alwaysCharge (evcc >= 0.316)', () => {
        assert.strictEqual(toPvControl('smart', 'off'), PvControl.Smart);
        assert.strictEqual(toPvControl('smart', 'on'), PvControl.SmartAlwaysCharge);
        assert.strictEqual(toPvControl('smart', 'once'), PvControl.SmartAlwaysCharge);
        assert.strictEqual(toPvControl('now', 'on'), PvControl.Now);
    });
    it('returns null for unknown modes', () => {
        assert.strictEqual(toPvControl(undefined), null);
        assert.strictEqual(toPvControl('boost'), null);
    });
});
