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

// enable the should interface of chai
// mocha, sinon and sinon-chai are provided by @iobroker/testing (repochecker W0063) and are not loaded here;
// chai is a direct devDependency because @iobroker/testing installs it only nested.
const { should } = require('chai');

exports.mochaHooks = {
    beforeAll() {
        should();
    },
};
