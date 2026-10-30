/**
 * This is a dummy TypeScript test file using mocha and node:assert
 *
 * It's automatically excluded from npm and its build output is excluded from both git and npm.
 * It is advised to test all your modules with accompanying *.test.ts-files
 */

import assert from 'node:assert/strict';

describe('module to test => function to test', () => {
    const expected = 5;

    it(`should return ${expected}`, () => {
        const result = 5;
        assert.strictEqual(result, expected);
    });
});
