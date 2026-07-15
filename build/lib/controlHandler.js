"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ControlHandler = void 0;
class ControlHandler {
    adapter;
    constructor(adapter) {
        this.adapter = adapter;
    }
    async createEvccControl() {
        //Control Objects und Buttons:
        await this.adapter.setObjectNotExistsAsync('control.bufferSoc', {
            type: 'state',
            common: {
                name: 'bufferSoc',
                type: 'number',
                role: 'value',
                read: true,
                write: true,
                unit: '%',
            },
            native: {},
        });
        this.adapter.subscribeStates('control.bufferSoc');
        await this.adapter.setObjectNotExistsAsync('control.smartCostLimit', {
            type: 'state',
            common: {
                name: 'smartCostLimit 0 = delete',
                type: 'number',
                role: 'value',
                read: true,
                write: true,
                def: 0,
                unit: '€',
            },
            native: {},
        });
        this.adapter.subscribeStates('control.smartCostLimit');
        await this.adapter.setObjectNotExistsAsync(`control.batteryGridChargeLimit`, {
            type: 'state',
            common: {
                name: 'batteryGridChargeLimit',
                type: 'number',
                role: 'value',
                read: true,
                write: true,
                def: 0,
                unit: '€',
            },
            native: {},
        });
        this.adapter.subscribeStates(`control.batteryGridChargeLimit`);
        //http://192.168.178.10:7070/api/prioritysoc/50
        await this.adapter.setObjectNotExistsAsync('control.prioritySoc', {
            type: 'state',
            common: {
                name: 'prioritySoc',
                type: 'number',
                role: 'value',
                read: true,
                write: true,
                unit: '%',
            },
            native: {},
        });
        this.adapter.subscribeStates('control.prioritySoc');
        //bufferStartSoc
        await this.adapter.setObjectNotExistsAsync('control.bufferStartSoc', {
            type: 'state',
            common: {
                name: 'bufferStartSoc',
                type: 'number',
                role: 'value',
                read: true,
                write: true,
                unit: '%',
            },
            native: {},
        });
        this.adapter.subscribeStates('control.bufferStartSoc');
    }
}
exports.ControlHandler = ControlHandler;
//# sourceMappingURL=controlHandler.js.map