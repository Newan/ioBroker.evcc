import assert from 'node:assert/strict';
import { currencySymbol, getFieldMeta } from './units';

describe('units => getFieldMeta', () => {
    it('returns unit and role for known numeric fields', () => {
        assert.deepStrictEqual(getFieldMeta('chargePower', 'number'), { role: 'value.power', unit: 'W' });
        assert.deepStrictEqual(getFieldMeta('chargedEnergy', 'number'), { role: 'value.energy', unit: 'Wh' });
        assert.deepStrictEqual(getFieldMeta('chargeTotalImport', 'number'), { role: 'value.energy', unit: 'kWh' });
        assert.deepStrictEqual(getFieldMeta('vehicleSoc', 'number'), { role: 'value.battery', unit: '%' });
    });
    it('replaces the currency placeholder', () => {
        assert.deepStrictEqual(getFieldMeta('tariffGrid', 'number', '€'), { role: 'value.price', unit: '€/kWh' });
        assert.deepStrictEqual(getFieldMeta('sessionPrice', 'number', 'CHF'), { role: 'value', unit: 'CHF' });
    });
    it('uses indicator for booleans and plain value otherwise', () => {
        assert.deepStrictEqual(getFieldMeta('charging', 'boolean'), { role: 'indicator' });
        assert.deepStrictEqual(getFieldMeta('chargePower', 'object'), { role: 'value' });
        assert.deepStrictEqual(getFieldMeta('unknownField', 'number'), { role: 'value' });
    });
});

describe('units => currencySymbol', () => {
    it('maps known codes and falls back', () => {
        assert.strictEqual(currencySymbol('EUR'), '€');
        assert.strictEqual(currencySymbol('CHF'), 'CHF');
        assert.strictEqual(currencySymbol(undefined), '€');
    });
});
