import assert from 'node:assert/strict';
import { applyDelta, type EvccState } from './stateMerge';

describe('stateMerge => applyDelta', () => {
    it('builds the state from the welcome message', () => {
        const state: EvccState = {};
        applyDelta(state, {
            homePower: 500,
            'loadpoints.0.chargePower': 0,
            'loadpoints.0.title': 'Garage',
            'loadpoints.1.title': 'Auffahrt',
            vehicles: { 'db:6': { title: 'ModelY' } },
        });
        assert.deepStrictEqual(state, {
            homePower: 500,
            loadpoints: [{ chargePower: 0, title: 'Garage' }, { title: 'Auffahrt' }],
            vehicles: { 'db:6': { title: 'ModelY' } },
        });
    });
    it('applies changed fields', () => {
        const state: EvccState = { homePower: 500, loadpoints: [{ chargePower: 0, title: 'Garage' }] };
        applyDelta(state, { homePower: 650, 'loadpoints.0.chargePower': 11000 });
        assert.strictEqual(state.homePower, 650);
        assert.deepStrictEqual(state.loadpoints[0], { chargePower: 11000, title: 'Garage' });
    });
    it('keeps the loadpoint array without gaps', () => {
        const state: EvccState = {};
        applyDelta(state, { 'loadpoints.2.title': 'Wärmepumpe' });
        assert.deepStrictEqual(state.loadpoints, [{}, {}, { title: 'Wärmepumpe' }]);
    });
    it('puts sharded values below their key', () => {
        const state: EvccState = { forecast: { grid: [1] } };
        applyDelta(state, { 'forecast.solar': { today: 5 } });
        assert.deepStrictEqual(state.forecast, { grid: [1], solar: { today: 5 } });
    });
    it('keeps null for values evcc does not report anymore', () => {
        const state: EvccState = { fatal: [{ error: 'x' }] };
        applyDelta(state, { fatal: null });
        assert.strictEqual(state.fatal, null);
    });
});
