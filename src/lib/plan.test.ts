import assert from 'node:assert/strict';
import { planTimeOrDefault, resolveLoadpointPlan } from './plan';

describe('plan => resolveLoadpointPlan', () => {
    const vehicles = {
        'db:6': { plan: { soc: 55, time: '2026-12-31T10:00:00Z' } },
        'db:7': { plan: null },
    };

    it('uses the soc plan of the assigned vehicle', () => {
        assert.deepStrictEqual(resolveLoadpointPlan({ vehicleName: 'db:6' }, vehicles), {
            target: 'vehicle',
            vehicleName: 'db:6',
            active: true,
            soc: 55,
            time: Date.parse('2026-12-31T10:00:00Z'),
        });
    });

    it('reports inactive when the vehicle has no plan', () => {
        const res = resolveLoadpointPlan({ vehicleName: 'db:7' }, vehicles);
        assert.strictEqual(res.target, 'vehicle');
        assert.strictEqual(res.active, false);
    });

    it('uses the energy plan without assigned vehicle', () => {
        assert.deepStrictEqual(
            resolveLoadpointPlan({ vehicleName: '', planEnergy: 12.5, planTime: '2026-12-31T10:00:00Z' }, vehicles),
            { target: 'energy', active: true, energy: 12.5, time: Date.parse('2026-12-31T10:00:00Z') },
        );
    });

    it('reports inactive energy plan when nothing is set', () => {
        assert.deepStrictEqual(resolveLoadpointPlan({ vehicleName: '', planEnergy: 0, planTime: null }, vehicles), {
            target: 'energy',
            active: false,
            energy: undefined,
            time: undefined,
        });
    });

    it('falls back to energy when the assigned vehicle is unknown', () => {
        assert.strictEqual(resolveLoadpointPlan({ vehicleName: 'unknown' }, vehicles).target, 'energy');
    });
});

describe('plan => planTimeOrDefault', () => {
    const now = Date.parse('2026-10-10T12:00:00Z');
    it('keeps a future time', () => {
        assert.strictEqual(planTimeOrDefault(now + 3600000, now).getTime(), now + 3600000);
    });
    it('uses now + 24 h for past or missing times', () => {
        assert.strictEqual(planTimeOrDefault(0, now).getTime(), now + 86400000);
        assert.strictEqual(planTimeOrDefault(NaN, now).getTime(), now + 86400000);
    });
});
