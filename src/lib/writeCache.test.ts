import assert from 'node:assert/strict';
import { WriteCache } from './writeCache';

describe('writeCache', () => {
    it('reports only changed values', () => {
        const cache = new WriteCache();
        assert.strictEqual(cache.update('a', 1), true);
        assert.strictEqual(cache.update('a', 1), false);
        assert.strictEqual(cache.update('a', 2), true);
        assert.strictEqual(cache.update('b', null), true);
        assert.strictEqual(cache.update('b', null), false);
    });
    it('writes again after forget', () => {
        const cache = new WriteCache();
        cache.update('loadpoint.3.status.charging', true);
        cache.update('loadpoint.30.status.charging', true);
        cache.forgetBelow('loadpoint.3');
        assert.strictEqual(cache.update('loadpoint.3.status.charging', true), true);
        assert.strictEqual(cache.update('loadpoint.30.status.charging', true), false);
        assert.strictEqual(cache.matches('loadpoint.30.status.charging', true), true);
        cache.forget('loadpoint.30.status.charging');
        assert.strictEqual(cache.matches('loadpoint.30.status.charging', true), false);
    });
});
