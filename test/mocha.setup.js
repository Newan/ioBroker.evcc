'use strict';

// Makes ts-node ignore warnings, so mocha --watch does work
process.env.TS_NODE_IGNORE_WARNINGS = 'TRUE';
// Sets the correct tsconfig for testing
process.env.TS_NODE_PROJECT = 'tsconfig.json';
// Make ts-node respect the "include" key in tsconfig.json
process.env.TS_NODE_FILES = 'TRUE';

// Don't silently swallow unhandled rejections
process.on('unhandledRejection', (e) => {
    throw e;
});

// enable the should interface with sinon
// and load chai-as-promised and sinon-chai by default
const { should, use } = require('chai');

exports.mochaHooks = {
    async beforeAll() {
        const sinonChaiModule = await import('sinon-chai');
        const chaiAsPromisedModule = await import('chai-as-promised');

        const sinonChai = sinonChaiModule.default || sinonChaiModule;
        const chaiAsPromised = chaiAsPromisedModule.default || chaiAsPromisedModule;

        should();
        use(sinonChai);
        use(chaiAsPromised);
    },
};
