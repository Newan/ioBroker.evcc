import assert from 'node:assert/strict';
import { findMissing, statusKeyOf } from './stale';

describe('stale => statusKeyOf', () => {
    it('splits site and loadpoint status ids', () => {
        assert.deepStrictEqual(statusKeyOf('status.fatal'), { scope: 'status', key: 'fatal' });
        assert.deepStrictEqual(statusKeyOf('status.Grid.power'), { scope: 'status', key: 'Grid' });
        assert.deepStrictEqual(statusKeyOf('loadpoint.2.status.chargeRemainingDuration'), {
            scope: 'loadpoint.2.status',
            key: 'chargeRemainingDuration',
        });
    });
    it('ignores other ids', () => {
        assert.strictEqual(statusKeyOf('control.bufferSoc'), null);
        assert.strictEqual(statusKeyOf('loadpoint.1.control.off'), null);
        assert.strictEqual(statusKeyOf('info.connection'), null);
    });
});

describe('stale => findMissing', () => {
    const known = [
        'status.fatal',
        'status.version',
        'status.Grid.power',
        'status.Forecast.solar',
        'loadpoint.1.status.chargeRemainingDuration',
        'loadpoint.1.status.charging',
        'loadpoint.2.status.chargeRemainingDuration',
    ];
    it('finds site fields evcc does not report anymore', () => {
        assert.deepStrictEqual(findMissing(known, 'status', ['version', 'grid', 'forecast']), ['status.fatal']);
    });
    it('only checks the given loadpoint', () => {
        assert.deepStrictEqual(findMissing(known, 'loadpoint.1.status', ['charging']), [
            'loadpoint.1.status.chargeRemainingDuration',
        ]);
    });
});
