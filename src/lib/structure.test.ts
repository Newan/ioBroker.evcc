import assert from 'node:assert/strict';
import { findObsolete } from './structure';

describe('structure => findObsolete', () => {
    const ids = [
        'loadpoint',
        'loadpoint.1',
        'loadpoint.1.status.charging',
        'loadpoint.2.control.off',
        'loadpoint.3',
        'loadpoint.3.status.charging',
        'vehicle',
        'vehicle.db:6.title',
        'vehicle.db:7',
        'vehicle.db:7.plan.time',
        'status.grid',
    ];
    it('finds removed loadpoints and vehicles', () => {
        assert.deepStrictEqual(findObsolete(ids, 2, ['db:6']), { loadpoints: [3], vehicles: ['db:7'] });
    });
    it('reports nothing when everything still exists', () => {
        assert.deepStrictEqual(findObsolete(ids, 3, ['db:6', 'db:7']), { loadpoints: [], vehicles: [] });
    });
    it('never deletes everything on an empty evcc answer', () => {
        assert.deepStrictEqual(findObsolete(ids, 0, []), { loadpoints: [], vehicles: [] });
    });
});
