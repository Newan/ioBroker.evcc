import { expect } from 'chai';
import { planTimeOrDefault, resolveLoadpointPlan } from './plan';

describe('plan => resolveLoadpointPlan', () => {
    const vehicles = {
        'db:6': { plan: { soc: 55, time: '2026-12-31T10:00:00Z' } },
        'db:7': { plan: null },
    };

    it('uses the soc plan of the assigned vehicle', () => {
        expect(resolveLoadpointPlan({ vehicleName: 'db:6' }, vehicles)).to.deep.equal({
            target: 'vehicle',
            vehicleName: 'db:6',
            active: true,
            soc: 55,
            time: Date.parse('2026-12-31T10:00:00Z'),
        });
    });

    it('reports inactive when the vehicle has no plan', () => {
        const res = resolveLoadpointPlan({ vehicleName: 'db:7' }, vehicles);
        expect(res.target).to.equal('vehicle');
        expect(res.active).to.equal(false);
    });

    it('uses the energy plan without assigned vehicle', () => {
        expect(
            resolveLoadpointPlan({ vehicleName: '', planEnergy: 12.5, planTime: '2026-12-31T10:00:00Z' }, vehicles),
        ).to.deep.equal({ target: 'energy', active: true, energy: 12.5, time: Date.parse('2026-12-31T10:00:00Z') });
    });

    it('reports inactive energy plan when nothing is set', () => {
        expect(resolveLoadpointPlan({ vehicleName: '', planEnergy: 0, planTime: null }, vehicles)).to.deep.equal({
            target: 'energy',
            active: false,
            energy: undefined,
            time: undefined,
        });
    });

    it('falls back to energy when the assigned vehicle is unknown', () => {
        expect(resolveLoadpointPlan({ vehicleName: 'unknown' }, vehicles).target).to.equal('energy');
    });
});

describe('plan => planTimeOrDefault', () => {
    const now = Date.parse('2026-10-10T12:00:00Z');
    it('keeps a future time', () => {
        expect(planTimeOrDefault(now + 3600000, now).getTime()).to.equal(now + 3600000);
    });
    it('uses now + 24 h for past or missing times', () => {
        expect(planTimeOrDefault(0, now).getTime()).to.equal(now + 86400000);
        expect(planTimeOrDefault(NaN, now).getTime()).to.equal(now + 86400000);
    });
});
