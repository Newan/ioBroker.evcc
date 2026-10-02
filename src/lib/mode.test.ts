import { expect } from 'chai';
import { hasSmartModeApi, isAlwaysChargeValue, PvControl, toPvControl } from './mode';

describe('mode => hasSmartModeApi', () => {
    it('detects evcc >= 0.316 by alwaysCharge', () => {
        expect(hasSmartModeApi({ alwaysCharge: 'off' })).to.equal(true);
    });
    it('returns false for older evcc versions', () => {
        expect(hasSmartModeApi({})).to.equal(false);
        expect(hasSmartModeApi({ alwaysCharge: null })).to.equal(false);
        expect(hasSmartModeApi(undefined)).to.equal(false);
    });
});

describe('mode => isAlwaysChargeValue', () => {
    it('accepts off | on | once', () => {
        for (const v of ['off', 'on', 'once']) {
            expect(isAlwaysChargeValue(v)).to.equal(true);
        }
    });
    it('rejects other values', () => {
        for (const v of ['ON', '', 1, true, null, undefined]) {
            expect(isAlwaysChargeValue(v)).to.equal(false);
        }
    });
});

describe('mode => toPvControl', () => {
    it('maps legacy modes (evcc < 0.316)', () => {
        expect(toPvControl('off')).to.equal(PvControl.Off);
        expect(toPvControl('pv')).to.equal(PvControl.Smart);
        expect(toPvControl('minpv')).to.equal(PvControl.SmartAlwaysCharge);
        expect(toPvControl('now')).to.equal(PvControl.Now);
    });
    it('maps smart + alwaysCharge (evcc >= 0.316)', () => {
        expect(toPvControl('smart', 'off')).to.equal(PvControl.Smart);
        expect(toPvControl('smart', 'on')).to.equal(PvControl.SmartAlwaysCharge);
        expect(toPvControl('smart', 'once')).to.equal(PvControl.SmartAlwaysCharge);
        expect(toPvControl('now', 'on')).to.equal(PvControl.Now);
    });
    it('returns null for unknown modes', () => {
        expect(toPvControl(undefined)).to.equal(null);
        expect(toPvControl('boost')).to.equal(null);
    });
});
