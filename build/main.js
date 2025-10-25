"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils = __importStar(require("@iobroker/adapter-core"));
const axios_1 = __importDefault(require("axios"));
const sendEvcc_1 = require("./lib/sendEvcc");
class Evcc extends utils.Adapter {
    ip = '';
    polltime = 0;
    timeout = 1000;
    maxLoadpointIndex = -1;
    adapterIntervals; //halten von allen Intervallen
    evcc;
    constructor(options = {}) {
        super({
            ...options,
            name: 'evcc',
        });
        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }
    /**
     * Is called when databases are connected and adapter received configuration.
     */
    async onReady() {
        // Initialize your adapter here
        //Püfen die übergabe der IP
        if (this.config.ip) {
            if (this.config.ip != '0.0.0.0' && this.config.ip != '') {
                this.config.ip = this.config.ip.replace('http', '');
                this.config.ip = this.config.ip.replace('://', '');
                // add port to ip
                this.ip = `${this.config.ip}:${this.config.port}`;
                this.log.debug(`Final Ip:${this.ip}`);
            }
            else {
                this.log.error('No ip is set, adapter stop');
                return;
            }
        }
        else {
            this.log.error('No ip is set, adapter stop');
            return;
        }
        //Prüfen Polltime
        if (this.config.polltime > 0) {
            this.polltime = this.config.polltime;
            this.timeout = this.polltime * 1000 - 500; //'500ms unter interval'
        }
        else {
            this.log.error('Wrong Polltime (polltime < 0), adapter stop');
            return;
        }
        this.evcc = new sendEvcc_1.SendEvcc(this.ip, this.timeout, this.log);
        await this.createEvccControl();
        this.getEvccData();
        //War alles ok, dann können wir die Daten abholen
        this.adapterIntervals = this.setInterval(() => this.getEvccData(), this.polltime * 1000);
        this.log.debug(`config ip: ${this.config.ip}`);
        this.log.debug(`config polltime: ${this.config.polltime}`);
    }
    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     *
     * @param callback
     */
    onUnload(callback) {
        try {
            clearInterval(this.adapterIntervals);
            callback();
        }
        catch (e) {
            callback();
        }
    }
    /**
     * Is called if a subscribed state changes
     *
     * @param id
     * @param state
     */
    onStateChange(id, state) {
        if (!state) {
            this.log.info(`state ${id} deleted`);
            return;
        }
        if (state.ack) {
            return;
        } // nur auf manuelle Änderungen reagieren
        const idParts = id.split('.');
        const [i0, i1, i2, index, group, action] = idParts;
        const val = state.val;
        this.log.info(`state ${id} changed: ${val} (ack = ${state.ack})`);
        // --- Helper: Logging + Funktionsaufruf ---
        const doAction = (msg, fn, ...args) => {
            this.log.info(`${msg} on loadpointindex: ${index}`);
            fn.apply(this, args);
        };
        // --- Direktes Mapping für einfache Fälle ---
        const actionMap = {
            off: () => doAction('Stop evcc charging', this.evcc.setEvccStop, index),
            now: () => doAction('Start evcc charging', this.evcc.setEvccStartNow, index),
            min: () => doAction('Start evcc minimal charging', this.evcc.setEvccStartMin, index),
            pv: () => doAction('Start evcc pv only charging', this.evcc.setEvccStartPV, index),
            minCurrent: () => doAction('Set minCurrent', this.evcc.setEvccMinCurrent, index, val),
            maxCurrent: () => doAction('Set maxCurrent', this.evcc.setEvccMaxCurrent, index, val),
            phasesConfigured: () => doAction('Set phasesConfigured', this.evcc.setEvccPhases, index, val),
            disable_threshold: () => doAction('Set disable threshold', this.evcc.setEvccDisableThreshold, index, val),
            enable_threshold: () => doAction('Set enable threshold', this.evcc.setEvccEnableThreshold, index, val),
            limitSoc: () => doAction('Set limitSoc', this.evcc.setEvccLimitSoc, index, Number(val)),
            vehicleName: () => doAction('Set vehicleName', this.evcc.setEvccVehicle, index, val),
            smartCostLimit: () => doAction('Set smartCostLimit', this.evcc.setEvccsmartCostLimitLoadpoint, index, val),
        };
        // --- pvControl separat behandeln ---
        if (action === 'pvControl') {
            const pvMap = {
                0: () => doAction('Stop evcc charging', this.evcc.setEvccStop, index),
                1: () => doAction('Start evcc pv only charging', this.evcc.setEvccStartPV, index),
                2: () => doAction('Start evcc minimal charging', this.evcc.setEvccStartMin, index),
                3: () => doAction('Start evcc charging', this.evcc.setEvccStartNow, index),
            };
            return pvMap[Number(val)]?.();
        }
        // --- Wenn direkte Aktion existiert ---
        if (actionMap[action]) {
            return actionMap[action]();
        }
        // --- Fahrzeug-bezogene Gruppen ---
        if (group === 'vehicle') {
            const vehicleMap = {
                minSoc: () => this.evcc.setVehicleMinSoc(index, Number(val)),
                limitSoc: () => this.evcc.setVehicleLimitSoc(index, Number(val)),
                plan: () => {
                    if (action === 'active') {
                        this.log.info(`Set plan.active on vehicle: ${index} to ${val}`);
                        this.evcc.setVehiclePlan(index, Boolean(val));
                    }
                },
            };
            return vehicleMap[action]?.();
        }
        // --- EVCC-Root-Werte ---
        const evccRootMap = {
            bufferSoc: () => this.evcc.setEvccBufferSoc(Number(val)),
            bufferStartSoc: () => this.evcc.setEvccBufferStartSoc(Number(val)),
            prioritySoc: () => this.evcc.setEvccPrioritySoc(Number(val)),
            smartCostLimit: () => this.evcc.setEvccsmartCostLimit(Number(val)),
            batteryGridChargeLimit: () => this.evcc.setEvccBatteryGridChargeLimit(Number(val)),
        };
        if (evccRootMap[index]) {
            return evccRootMap[index]();
        }
        // --- Fallback ---
        this.log.debug(JSON.stringify(idParts));
        this.log.warn(`Unhandled state change: ${id} -> ${val}`);
    }
    /**
     * Hole Daten vom EVCC
     */
    getEvccData() {
        try {
            this.log.debug(`call: ` + `http://${this.ip}/api/state`);
            (0, axios_1.default)(`http://${this.ip}/api/state`, { timeout: this.timeout })
                .then(async (response) => {
                this.log.debug(`Get-Data from evcc:${JSON.stringify(response.data)}`);
                //Global status Items - ohne loadpoints - ohne vehicle
                let respData = response.data;
                if (response.data.hasOwnProperty('result')) { // https://github.com/evcc-io/evcc/pull/22299
                    respData = response.data.result;
                }
                this.setStatusEvcc(respData, '');
                //Laden jeden Ladepunkt einzeln
                const tmpListLoadpoints = respData.loadpoints;
                tmpListLoadpoints.forEach(async (loadpoint, index) => {
                    await this.setLoadPointdata(loadpoint, index);
                });
                for (const vehicleKey in respData.vehicles) {
                    const vehicle = respData.vehicles[vehicleKey];
                    await this.setVehicleData(vehicleKey, vehicle);
                }
                //statistik einzeln ausführen
                /*const tmpListVehicle: Vehicle[] = response.data.result.vehicles;
            tmpListVehicle.forEach(async (vehicle, index) => {
                await this.setVehicleData(vehicle, index);
            });*/
                this.setState('info.connection', true, true);
            })
                .catch(error => {
                this.log.error(error.message);
                this.setState('info.connection', false, true);
            });
        }
        catch (error) {
            this.setState('info.connection', false, true);
            if (typeof error === 'string') {
                this.log.error(error);
            }
            else if (error instanceof Error) {
                this.log.error(error.message);
            }
        }
    }
    async createEvccControl() {
        //Control Objects und Buttons:
        await this.setObjectNotExistsAsync('control.bufferSoc', {
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
        this.subscribeStates('control.bufferSoc');
        await this.setObjectNotExistsAsync('control.smartCostLimit', {
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
        this.subscribeStates('control.smartCostLimit');
        await this.setObjectNotExistsAsync(`control.batteryGridChargeLimit`, {
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
        this.subscribeStates(`control.batteryGridChargeLimit`);
        //http://192.168.178.10:7070/api/prioritysoc/50
        await this.setObjectNotExistsAsync('control.prioritySoc', {
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
        this.subscribeStates('control.prioritySoc');
        //bufferStartSoc
        await this.setObjectNotExistsAsync('control.bufferStartSoc', {
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
        this.subscribeStates('control.bufferStartSoc');
    }
    async setStatusEvcc(daten, knoten) {
        // Bestimmte Control-Werte direkt setzen
        const controlMapping = {
            bufferStartSoc: 'control.bufferStartSoc',
            prioritySoc: 'control.prioritySoc',
            bufferSoc: 'control.bufferSoc',
            smartCostLimit: 'control.smartCostLimit',
            batteryGridChargeLimit: 'control.batteryGridChargeLimit',
        };
        for (const [lpEntry, lpData] of Object.entries(daten)) {
            if (['result', 'vehicles', 'loadpoints'].includes(lpEntry)) {
                continue;
            }
            if (lpData == null || JSON.stringify(lpData) === '{}' || JSON.stringify(lpData) === '[]') {
                continue;
            }
            const lpType = typeof lpData;
            if (controlMapping[lpEntry]) {
                // @ts-ignore
                this.setState(controlMapping[lpEntry], { val: lpData, ack: true });
                continue;
            }
            if (lpType === 'object' && this.config.dissolveObjects) {
                const lpEntryFormatted = this.capitalizeFirst(lpEntry);
                await this.setObjectNotExists(`status.${lpEntryFormatted}`, {
                    type: 'channel',
                    common: { role: 'value', name: lpEntryFormatted },
                    native: {},
                });
                for (const [lpEntry1, lpData1] of Object.entries(lpData)) {
                    if (lpData1 == undefined) {
                        continue;
                    }
                    const pfad = `status.${lpEntryFormatted}`;
                    const lpEntryFormatted1 = isNaN(Number(lpEntry1)) ? this.capitalizeFirst(lpEntry1) : lpEntry1;
                    const lpType1 = typeof lpData1;
                    if (lpType1 == 'object' && lpData1 !== null) {
                        await this.setObjectNotExists(`${pfad}.${lpEntryFormatted1}`, {
                            type: 'channel',
                            common: { role: 'value', name: lpEntryFormatted1 },
                            native: {},
                        });
                        for (const [dataPoint, keyData] of Object.entries(lpData1)) {
                            const keyType = typeof keyData;
                            // @ts-ignore
                            await this.setObjectNotExists(`${pfad}.${lpEntryFormatted1}.${dataPoint}`, {
                                type: 'state',
                                common: {
                                    role: 'value',
                                    name: dataPoint,
                                    type: keyType,
                                    read: true,
                                    write: false,
                                },
                                native: {},
                            });
                            // @ts-ignore
                            this.setState(`${pfad}.${lpEntryFormatted1}.${dataPoint}`, keyType === 'object' ? JSON.stringify(keyData) : keyData, true);
                        }
                    }
                    else {
                        // @ts-ignore
                        await this.setObjectNotExists(`${pfad}.${lpEntry1}`, {
                            type: 'state',
                            common: {
                                role: 'value',
                                name: lpEntry1,
                                type: lpType1,
                                read: true,
                                write: false,
                            },
                            native: {},
                        });
                        this.setState(`${pfad}.${lpEntry1}`, lpData1, true);
                    }
                }
                continue;
            }
            if (knoten && this.config.dissolveObjects) {
                // @ts-ignore
                await this.setObjectNotExists(`status.${lpEntry}`, {
                    type: 'state',
                    common: {
                        role: 'value',
                        name: lpEntry,
                        type: lpType,
                        read: true,
                        write: false,
                    },
                    native: {},
                });
                if (lpType == 'object' && lpData !== null) {
                    await this.setStatusEvcc(lpData, lpEntry);
                }
            }
            else {
                // @ts-ignore
                await this.setObjectNotExists(`status.${lpEntry}`, {
                    type: 'state',
                    common: {
                        role: 'value',
                        name: lpEntry,
                        type: lpType,
                        read: true,
                        write: false,
                    },
                    native: {},
                });
                // @ts-ignore
                this.setState(`status.${lpEntry}`, lpType === 'object' ? JSON.stringify(lpData) : lpData, true);
            }
        }
    }
    capitalizeFirst(text) {
        return text.charAt(0).toUpperCase() + text.slice(1);
    }
    /**
     * Hole Daten von und für Vehicle
     *
     * @param vehicleIndex
     * @param vehicleData
     */
    async setVehicleData(vehicleIndex, vehicleData) {
        this.log.debug(`Vehicle mit index ${vehicleIndex} gefunden...`);
        await this.extendObjectAsync(`vehicle.${vehicleIndex}.title`, {
            type: 'state',
            common: {
                name: 'title',
                type: 'string',
                read: true,
                write: false,
                role: 'value',
            },
            native: {},
        });
        await this.setState(`vehicle.${vehicleIndex}.title`, vehicleData.title, true);
        await this.extendObjectAsync(`vehicle.${vehicleIndex}.minSoc`, {
            type: 'state',
            common: {
                name: 'minSoc',
                type: 'number',
                read: true,
                write: true,
                role: 'value',
                unit: '%',
            },
            native: {},
        });
        this.subscribeStates(`vehicle.${vehicleIndex}.minSoc`);
        await this.setStateAsync(`vehicle.${vehicleIndex}.minSoc`, {
            val: vehicleData.minSoc !== undefined ? vehicleData.minSoc : 0,
            ack: true,
        });
        await this.extendObjectAsync(`vehicle.${vehicleIndex}.limitSoc`, {
            type: 'state',
            common: {
                name: 'limitSoc',
                type: 'number',
                read: true,
                write: true,
                role: 'value',
                unit: '%',
            },
            native: {},
        });
        this.subscribeStates(`vehicle.${vehicleIndex}.limitSoc`);
        await this.setStateAsync(`vehicle.${vehicleIndex}.limitSoc`, {
            val: vehicleData.limitSoc !== undefined ? vehicleData.limitSoc : 100,
            ack: true,
        });
        //Ladeplanung hinzufürgen
        await this.extendObjectAsync(`vehicle.${vehicleIndex}.plan.active`, {
            type: 'state',
            common: {
                name: 'active',
                type: 'boolean',
                read: true,
                write: true,
                role: 'value',
            },
            native: {},
        });
        this.subscribeStates(`vehicle.${vehicleIndex}.plan.active`);
        await this.setStateAsync(`vehicle.${vehicleIndex}.plan.active`, {
            val: vehicleData.plans !== undefined ? true : false,
            ack: true,
        });
        await this.extendObjectAsync(`vehicle.${vehicleIndex}.plan.planSoc`, {
            type: 'state',
            common: {
                name: 'planSoc',
                type: 'number',
                read: true,
                write: true,
                role: 'value',
                unit: '%',
            },
            native: {},
        });
        this.subscribeStates(`vehicle.${vehicleIndex}.plan.planSoc`);
        await this.setStateAsync(`vehicle.${vehicleIndex}.plan.planSoc`, {
            val: vehicleData.plans !== undefined ? vehicleData.plans[0].soc : 0,
            ack: true,
        });
        await this.extendObjectAsync(`vehicle.${vehicleIndex}.plan.time`, {
            type: 'state',
            common: {
                name: 'time',
                type: 'number',
                read: true,
                write: true,
                role: 'date',
            },
            native: {},
        });
        this.subscribeStates(`vehicle.${vehicleIndex}.plan.time`);
        await this.setStateAsync(`vehicle.${vehicleIndex}.plan.time`, {
            val: vehicleData.plans !== undefined ? vehicleData.plans[0].time : 0,
            ack: true,
        });
    }
    /**
     * Hole Daten für Ladepunkte
     *
     * @param loadpoint
     * @param index
     */
    async setLoadPointdata(loadpoint, index) {
        //Ladepunkt kann es X fach geben
        index = index + 1; // +1 why Evcc starts with 1
        this.log.debug(`Ladepunkt mit index ` + `loadpoint.${index} gefunden...`);
        if (this.maxLoadpointIndex < index) {
            //Ladepunkt noch nicht angelegt für diesen Instanzstart
            this.log.info(`Lege neuen Ladepunkt an mit Index: ${index}`);
            await this.createLoadPoint(index);
            this.maxLoadpointIndex = index;
        }
        //Update der Werte
        await this.setStateAsync(`loadpoint.${index}.control.maxCurrent`, {
            val: loadpoint.maxCurrent,
            ack: true,
        });
        await this.setStateAsync(`loadpoint.${index}.control.minCurrent`, {
            val: loadpoint.minCurrent,
            ack: true,
        });
        await this.setStateAsync(`loadpoint.${index}.control.disableThreshold`, {
            val: loadpoint.disableThreshold,
            ack: true,
        });
        await this.setStateAsync(`loadpoint.${index}.control.enableThreshold`, {
            val: loadpoint.enableThreshold,
            ack: true,
        });
        await this.setStateAsync(`loadpoint.${index}.control.phasesConfigured`, {
            val: loadpoint.phasesConfigured,
            ack: true,
        });
        await this.setStateAsync(`loadpoint.${index}.control.smartCostLimit`, {
            val: loadpoint.smartCostLimit,
            ack: true,
        });
        await this.setStateAsync(`loadpoint.${index}.control.limitSoc`, {
            val: loadpoint.limitSoc,
            ack: true
        });
        await this.setStateAsync(`loadpoint.${index}.control.vehicleName`, {
            val: loadpoint.vehicleName,
            ack: true,
        });
        //Alle Werte unter Status veröffentlichen
        this.setStatusLoadPoint(loadpoint, index);
    }
    async setStatusLoadPoint(loaddata, index) {
        for (const lpEntry in loaddata) {
            let lpType = typeof loaddata[lpEntry]; // get Type of Variable as String, like string/number/boolean
            let res = loaddata[lpEntry];
            if (lpType == 'object') {
                res = JSON.stringify(res);
            }
            if (lpEntry == 'chargeDuration' || lpEntry == 'connectedDuration') {
                res = this.changeMiliSeconds(res);
                lpType = 'string';
            }
            await this.extendObjectAsync(`loadpoint.${index}.status.${lpEntry}`, {
                type: 'state',
                common: {
                    name: lpEntry,
                    type: lpType,
                    read: true,
                    write: false,
                    role: 'value',
                },
                native: {},
            });
            await this.setState(`loadpoint.${index}.status.${lpEntry}`, res, true);
        }
    }
    async createLoadPoint(index) {
        //Control Objects und Buttons:
        await this.setObjectNotExistsAsync(`loadpoint.${index}.control.off`, {
            type: 'state',
            common: {
                name: 'Stop charging',
                type: 'boolean',
                role: 'button',
                read: false,
                write: true,
            },
            native: {},
        });
        this.subscribeStates(`loadpoint.${index}.control.off`);
        await this.setObjectNotExistsAsync(`loadpoint.${index}.control.now`, {
            type: 'state',
            common: {
                name: 'Start now charging',
                type: 'boolean',
                role: 'button',
                read: false,
                write: true,
            },
            native: {},
        });
        this.subscribeStates(`loadpoint.${index}.control.now`);
        await this.setObjectNotExistsAsync(`loadpoint.${index}.control.min`, {
            type: 'state',
            common: {
                name: 'Start min pv charging',
                type: 'boolean',
                role: 'button',
                read: false,
                write: true,
            },
            native: {},
        });
        this.subscribeStates(`loadpoint.${index}.control.min`);
        await this.setObjectNotExistsAsync(`loadpoint.${index}.control.pv`, {
            type: 'state',
            common: {
                name: 'Start pv only charging',
                type: 'boolean',
                role: 'button',
                read: false,
                write: true,
            },
            native: {},
        });
        this.subscribeStates(`loadpoint.${index}.control.pv`);
        await this.setObjectNotExistsAsync(`loadpoint.${index}.control.pvControl`, {
            type: 'state',
            common: {
                name: 'control charging',
                type: 'number',
                role: 'level',
                read: true,
                write: true,
                def: 0,
                states: {
                    0: 'off',
                    1: 'pv',
                    2: 'min',
                    3: 'now'
                }
            },
            native: {},
        });
        this.subscribeStates(`loadpoint.${index}.control.pvControl`);
        await this.setObjectNotExistsAsync(`loadpoint.${index}.control.maxCurrent`, {
            type: 'state',
            common: {
                name: 'maxCurrent',
                type: 'number',
                role: 'value.max',
                read: true,
                write: true,
            },
            native: {},
        });
        this.subscribeStates(`loadpoint.${index}.control.maxCurrent`);
        await this.setObjectNotExistsAsync(`loadpoint.${index}.control.minCurrent`, {
            type: 'state',
            common: {
                name: 'minCurrent',
                type: 'number',
                role: 'value',
                read: true,
                write: true,
            },
            native: {},
        });
        this.subscribeStates(`loadpoint.${index}.control.minCurrent`);
        await this.setObjectNotExistsAsync(`loadpoint.${index}.control.phasesConfigured`, {
            type: 'state',
            common: {
                name: '(0=auto/1=1p/3=3p)',
                type: 'number',
                role: 'value',
                read: true,
                write: true,
            },
            native: {},
        });
        this.subscribeStates(`loadpoint.${index}.control.phasesConfigured`);
        await this.setObjectNotExistsAsync(`loadpoint.${index}.control.smartCostLimit`, {
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
        this.subscribeStates(`loadpoint.${index}.control.smartCostLimit`);
        await this.setObjectNotExistsAsync(`loadpoint.${index}.control.enableThreshold`, {
            type: 'state',
            common: {
                name: 'enableThreshold',
                type: 'number',
                role: 'value',
                read: true,
                write: true,
            },
            native: {},
        });
        this.subscribeStates(`loadpoint.${index}.control.enableThreshold`);
        await this.setObjectNotExistsAsync(`loadpoint.${index}.control.disableThreshold`, {
            type: 'state',
            common: {
                name: 'disableThreshold',
                type: 'number',
                role: 'value',
                read: true,
                write: true,
            },
            native: {},
        });
        this.subscribeStates(`loadpoint.${index}.control.disableThreshold`);
        await this.setObjectNotExistsAsync(`loadpoint.${index}.control.limitSoc`, {
            type: 'state',
            common: {
                name: 'limitSoc',
                type: 'number',
                role: 'value',
                read: true,
                write: true,
                unit: '%',
            },
            native: {},
        });
        this.subscribeStates(`loadpoint.${index}.control.limitSoc`);
        await this.setObjectNotExistsAsync(`loadpoint.${index}.control.vehicleName`, {
            type: 'state',
            common: {
                name: 'vehicleName',
                type: 'string',
                role: 'value',
                read: true,
                write: true,
            },
            native: {},
        });
        this.subscribeStates(`loadpoint.${index}.control.vehicleName`);
    }
    changeMiliSeconds(nanoseconds) {
        const secondsG = nanoseconds / 1000000000;
        const days = Math.floor(secondsG / (24 * 3600));
        const hours = Math.floor((secondsG % (24 * 3600)) / 3600);
        const minutes = Math.floor((secondsG % 3600) / 60);
        const seconds = Math.round(secondsG % 60);
        let daysR = days.toString();
        let hoursR = hours.toString();
        let minutesR = minutes.toString();
        let secondsR = seconds.toString();
        if (days < 10) {
            daysR = `0${days}`;
        }
        if (hours < 10) {
            hoursR = `0${hours}`;
        }
        if (minutes < 10) {
            minutesR = `0${minutes}`;
        }
        if (seconds < 10) {
            secondsR = `0${seconds}`;
        }
        if (days > 0) {
            return `${daysR}:${hoursR}:${minutesR}:${secondsR}`;
        }
        return `${hoursR}:${minutesR}:${secondsR}`;
    }
}
if (require.main !== module) {
    // Export the constructor in compact mode
    module.exports = (options) => new Evcc(options);
}
else {
    // otherwise start the instance directly
    (() => new Evcc())();
}
//# sourceMappingURL=main.js.map