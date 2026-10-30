import assert from 'node:assert/strict';
import { currencySymbol, getFieldMeta, stateType } from './units';

describe('units => getFieldMeta', () => {
    it('returns unit and role for known numeric fields', () => {
        assert.deepStrictEqual(getFieldMeta('chargePower', 'number'), { role: 'value.power', unit: 'W' });
        assert.deepStrictEqual(getFieldMeta('chargedEnergy', 'number'), { role: 'value.energy', unit: 'Wh' });
        assert.deepStrictEqual(getFieldMeta('chargeTotalImport', 'number'), { role: 'value.energy', unit: 'kWh' });
        assert.deepStrictEqual(getFieldMeta('vehicleSoc', 'number'), { role: 'value.battery', unit: '%' });
    });
    it('replaces the currency placeholder', () => {
        assert.deepStrictEqual(getFieldMeta('tariffGrid', 'number', '€'), { role: 'value', unit: '€/kWh' });
        assert.deepStrictEqual(getFieldMeta('sessionPrice', 'number', 'CHF'), { role: 'value', unit: 'CHF' });
    });
    it('uses timer for remaining durations and interval for delays', () => {
        assert.deepStrictEqual(getFieldMeta('pvRemaining', 'number'), { role: 'value.timer', unit: 's' });
        assert.deepStrictEqual(getFieldMeta('enableDelay', 'number'), { role: 'value.interval', unit: 's' });
    });
    it('uses indicator, json, text and plain value by value type', () => {
        assert.deepStrictEqual(getFieldMeta('charging', 'boolean'), { role: 'indicator' });
        assert.deepStrictEqual(getFieldMeta('chargePower', 'object'), { role: 'json' });
        assert.deepStrictEqual(getFieldMeta('vehicleName', 'string'), { role: 'text' });
        assert.deepStrictEqual(getFieldMeta('unknownField', 'number'), { role: 'value' });
    });
});

describe('units => stateType', () => {
    it('stores objects as string', () => {
        assert.strictEqual(stateType('object'), 'string');
        assert.strictEqual(stateType('number'), 'number');
        assert.strictEqual(stateType('boolean'), 'boolean');
    });
});

describe('units => currencySymbol', () => {
    it('maps known codes and falls back', () => {
        assert.strictEqual(currencySymbol('EUR'), '€');
        assert.strictEqual(currencySymbol('CHF'), 'CHF');
        assert.strictEqual(currencySymbol(undefined), '€');
    });
});
