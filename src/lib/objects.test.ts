import assert from 'node:assert/strict';
import {
    LOADPOINT_PLAN_STATES,
    loadpointControlStates,
    loadpointParents,
    siteControlStates,
    VEHICLE_STATES,
    vehicleParents,
    type StateDefinition,
} from './objects';

const all: StateDefinition[] = [
    ...siteControlStates('€'),
    ...loadpointControlStates('€', { 0: 'off' }),
    ...LOADPOINT_PLAN_STATES,
    ...VEHICLE_STATES,
];

describe('objects => roles', () => {
    it('uses no read-only value role for writable states', () => {
        for (const state of all.filter(s => s.common.write)) {
            assert.ok(!state.common.role.startsWith('value'), `${state.id}: ${state.common.role}`);
        }
    });
    it('defines buttons as write-only booleans', () => {
        for (const state of all.filter(s => s.common.role.startsWith('button'))) {
            assert.strictEqual(state.common.type, 'boolean', state.id);
            assert.strictEqual(state.common.read, false, state.id);
            assert.strictEqual(state.common.write, true, state.id);
        }
    });
    it('limits percent levels to 0..100', () => {
        for (const state of all.filter(s => s.common.unit === '%')) {
            assert.ok(typeof state.common.min === 'number' && state.common.max === 100, state.id);
        }
    });
    it('uses the currency for price limits', () => {
        const limit = siteControlStates('CHF').find(s => s.id === 'smartCostLimit');
        assert.strictEqual(limit?.common.unit, 'CHF/kWh');
    });
});

describe('objects => parents', () => {
    it('builds the loadpoint tree with the evcc title', () => {
        assert.deepStrictEqual(
            loadpointParents(2, 'Garage').map(p => [p.id, p.type]),
            [
                ['loadpoint', 'folder'],
                ['loadpoint.2', 'device'],
                ['loadpoint.2.status', 'channel'],
                ['loadpoint.2.control', 'channel'],
                ['loadpoint.2.control.plan', 'channel'],
            ],
        );
        assert.strictEqual(loadpointParents(2, 'Garage')[1].name, 'Garage');
        assert.strictEqual(loadpointParents(2, '')[1].name, 'Loadpoint 2');
    });
    it('builds the vehicle tree and falls back to the evcc name', () => {
        assert.deepStrictEqual(
            vehicleParents('db:6', '').map(p => [p.id, p.type, p.name]),
            [
                ['vehicle', 'folder', 'Vehicles'],
                ['vehicle.db:6', 'device', 'db:6'],
                ['vehicle.db:6.plan', 'channel', 'charging plan'],
            ],
        );
    });
});
