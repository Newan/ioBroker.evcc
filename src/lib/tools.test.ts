import { expect } from 'chai';
import { formatDuration } from './tools';

describe('tools => formatDuration', () => {
    it('formats seconds as hh:mm:ss', () => {
        expect(formatDuration(0)).to.equal('00:00:00');
        expect(formatDuration(59)).to.equal('00:00:59');
        expect(formatDuration(3661)).to.equal('01:01:01');
    });
    it('adds days when >= 24 h', () => {
        expect(formatDuration(90061)).to.equal('01:01:01:01');
    });
    it('returns empty string for unset or invalid values', () => {
        expect(formatDuration(9223372036)).to.equal('');
        expect(formatDuration(9223372036.854)).to.equal('');
        expect(formatDuration(null)).to.equal('');
        expect(formatDuration(undefined)).to.equal('');
        expect(formatDuration(-1)).to.equal('');
        expect(formatDuration('abc')).to.equal('');
    });
});
