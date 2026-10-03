import { expect } from 'chai';
import { currencySymbol, getFieldMeta } from './units';

describe('units => getFieldMeta', () => {
    it('returns unit and role for known numeric fields', () => {
        expect(getFieldMeta('chargePower', 'number')).to.deep.equal({ role: 'value.power', unit: 'W' });
        expect(getFieldMeta('chargedEnergy', 'number')).to.deep.equal({ role: 'value.energy', unit: 'Wh' });
        expect(getFieldMeta('chargeTotalImport', 'number')).to.deep.equal({ role: 'value.energy', unit: 'kWh' });
        expect(getFieldMeta('vehicleSoc', 'number')).to.deep.equal({ role: 'value.battery', unit: '%' });
    });
    it('replaces the currency placeholder', () => {
        expect(getFieldMeta('tariffGrid', 'number', '€')).to.deep.equal({ role: 'value.price', unit: '€/kWh' });
        expect(getFieldMeta('sessionPrice', 'number', 'CHF')).to.deep.equal({ role: 'value', unit: 'CHF' });
    });
    it('uses indicator for booleans and plain value otherwise', () => {
        expect(getFieldMeta('charging', 'boolean')).to.deep.equal({ role: 'indicator' });
        expect(getFieldMeta('chargePower', 'object')).to.deep.equal({ role: 'value' });
        expect(getFieldMeta('unknownField', 'number')).to.deep.equal({ role: 'value' });
    });
});

describe('units => currencySymbol', () => {
    it('maps known codes and falls back', () => {
        expect(currencySymbol('EUR')).to.equal('€');
        expect(currencySymbol('CHF')).to.equal('CHF');
        expect(currencySymbol(undefined)).to.equal('€');
    });
});
