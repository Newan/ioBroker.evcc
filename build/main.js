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
class Evcc extends utils.Adapter {
    ip = '';
    polltime = 0;
    timeout = 1000;
    maxLoadpointIndex = -1;
    adapterIntervals; //halten von allen Intervallen
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
        //legen - pürfen controls
        this.createEvccControl();
        //holen für den Start einmal alle Daten
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
        if (state) {
            // The state was changed, if true it is from this adapter
            if (!state.ack) {
                this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
                const idProperty = id.split('.');
                switch (idProperty[5]) {
                    case 'off':
                        this.log.info(`Stop evcc charging on loadpointindex: ${idProperty[3]}`);
                        this.setEvccStop(idProperty[3]);
                        break;
                    case 'now':
                        this.log.info(`Start evcc charging on loadpointindex: ${idProperty[3]}`);
                        this.setEvccStartNow(idProperty[3]);
                        break;
                    case 'min':
                        this.log.info(`Start evcc minimal charging on loadpointindex: ${idProperty[3]}`);
                        this.setEvccStartMin(idProperty[3]);
                        break;
                    case 'pv':
                        this.log.info(`Start evcc pv only charging on loadpointindex: ${idProperty[3]}`);
                        this.setEvccStartPV(idProperty[3]);
                        break;
                    case 'pvControl':
                        switch (Number(state.val)) {
                            case 0:
                                this.log.info(`Stop evcc charging on loadpointindex: ${idProperty[3]}`);
                                this.setEvccStop(idProperty[3]);
                                break;
                            case 1:
                                this.log.info(`Start evcc pv only charging on loadpointindex: ${idProperty[3]}`);
                                this.setEvccStartPV(idProperty[3]);
                                break;
                            case 2:
                                this.log.info(`Start evcc minimal charging on loadpointindex: ${idProperty[3]}`);
                                this.setEvccStartMin(idProperty[3]);
                                break;
                            case 3:
                                this.log.info(`Start evcc charging on loadpointindex: ${idProperty[3]}`);
                                this.setEvccStartNow(idProperty[3]);
                                break;
                        }
                        break;
                    case 'minCurrent':
                        this.log.info(`Set minCurrent on loadpointindex: ${idProperty[3]}`);
                        this.setEvccMinCurrent(idProperty[3], state.val);
                        break;
                    case 'maxCurrent':
                        this.log.info(`Set maxCurrent on loadpointindex: ${idProperty[3]}`);
                        this.setEvccMaxCurrent(idProperty[3], state.val);
                        break;
                    case 'phasesConfigured':
                        this.log.info(`Set phasesConfigured on loadpointindex: ${idProperty[3]}`);
                        this.setEvccPhases(idProperty[3], state.val);
                        break;
                    case 'disable_threshold':
                        this.log.info(`Set disbale threshold on loadpointindex: ${idProperty[3]}`);
                        this.setEvccDisableThreshold(idProperty[3], state.val);
                        break;
                    case 'enable_threshold':
                        this.log.info(`Set enable threshold on loadpointindex: ${idProperty[3]}`);
                        this.setEvccEnableThreshold(idProperty[3], state.val);
                        break;
                    case 'limitSoc':
                        this.log.info(`Set limitSoc on loadpointindex: ${idProperty[3]}`);
                        this.setEvccLimitSoc(idProperty[3], Number(state.val));
                        break;
                    case 'vehicleName':
                        this.log.info(`Set vehicleName on loadpointindex: ${idProperty[3]}`);
                        this.setEvccVehicle(idProperty[3], state.val);
                        break;
                    default:
                        switch (idProperty[4]) {
                            case 'minSoc':
                                this.log.info(`Set minSoc on vehicle: ${idProperty[3]}`);
                                this.setVehicleMinSoc(idProperty[3], Number(state.val));
                                break;
                            case 'limitSoc':
                                this.log.info(`Set limitSoc on vehicle: ${idProperty[3]}`);
                                this.setVehicleLimitSoc(idProperty[3], Number(state.val));
                                break;
                            case 'plan':
                                this.log.debug(`Set plan on vehicle: ${idProperty[3]}`);
                                switch (idProperty[5]) {
                                    case 'active':
                                        this.log.info(`Set plan.active on vehicle: ${idProperty[3]} to ${state.val}`);
                                        this.setVehiclePlan(idProperty[3], Boolean(state.val), 0);
                                        break;
                                }
                                this.setVehicleLimitSoc(idProperty[3], Number(state.val));
                                break;
                            default:
                                switch (idProperty[3]) {
                                    case 'bufferSoc':
                                        this.log.info('Set bufferSoc on evcc');
                                        this.setEvccBufferSoc(Number(state.val));
                                        break;
                                    case 'bufferStartSoc':
                                        this.log.info('Set bufferStartSoc on evcc');
                                        this.setEvccBufferStartSoc(Number(state.val));
                                        break;
                                    case 'prioritySoc':
                                        this.log.info('Set prioritySoc on evcc');
                                        this.setEvccPrioritySoc(Number(state.val));
                                        break;
                                    default:
                                        this.log.debug(JSON.stringify(idProperty));
                                        this.log.warn(`Event with state ${id} changed: ${state.val} (ack = ${state.ack}) not found`);
                                }
                        }
                }
            }
        }
        else {
            // The state was deleted
            this.log.info(`state ${id} deleted`);
        }
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
                this.setStatusEvcc(response.data.result, '');
                //Laden jeden Ladepunkt einzeln
                const tmpListLoadpoints = response.data.result.loadpoints;
                tmpListLoadpoints.forEach(async (loadpoint, index) => {
                    await this.setLoadPointdata(loadpoint, index);
                });
                /*let tmpListVehicles: Vehicle[] = [];
            if (typeof(response.data.result.vehicles) == 'object') {
                // haben nur ein Fahrzeug daher etwas umbauen
                tmpListVehicles.push(response.data.result.vehicles);

            } else {
                tmpListVehicles = response.data.result.vehicles;
            }*/
                for (const vehicleKey in response.data.result.vehicles) {
                    const vehicle = response.data.result.vehicles[vehicleKey];
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
        for (const [lpEntry, lpData] of Object.entries(daten)) {
            if (['result', 'vehicles', 'loadpoints'].includes(lpEntry)) {
                continue;
            }
            if (lpData == null || JSON.stringify(lpData) === '{}' || JSON.stringify(lpData) === '[]') {
                continue;
            }
            const lpType = typeof lpData;
            const outData = lpData;
            // Bestimmte Control-Werte direkt setzen
            const controlMapping = {
                bufferStartSoc: 'control.bufferStartSoc',
                prioritySoc: 'control.prioritySoc',
                bufferSoc: 'control.bufferSoc',
            };
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
                    if (lpType1 === 'object' && lpData1 !== null) {
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
                if (lpType === 'object' && lpData !== null) {
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
        await this.setStateAsync(`loadpoint.${index}.control.limitSoc`, { val: loadpoint.limitSoc, ack: true });
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
    //Funktionen zum sterun von evcc
    setEvccStartPV(index) {
        this.log.debug(`call: ` + `http://${this.ip}/api/loadpoints/${index}/mode/pv`);
        axios_1.default
            .post(`http://${this.ip}/api/loadpoints/${index}/mode/pv`, { timeout: this.timeout })
            .then(() => {
            this.log.info('Evcc update successful');
        })
            .catch(error => {
            this.log.error(`1 ${error.message}`);
        });
    }
    setEvccStartMin(index) {
        this.log.debug(`call: ` + `http://${this.ip}/api/loadpoints/${index}/mode/minpv`);
        axios_1.default
            .post(`http://${this.ip}/api/loadpoints/${index}/mode/minpv`, { timeout: this.timeout })
            .then(() => {
            this.log.info('Evcc update successful');
        })
            .catch(error => {
            this.log.error(`2 ${error.message}`);
        });
    }
    setEvccStartNow(index) {
        this.log.debug(`call: ` + `http://${this.ip}/api/loadpoints/${index}/mode/now`);
        axios_1.default
            .post(`http://${this.ip}/api/loadpoints/${index}/mode/now`, { timeout: this.timeout })
            .then(() => {
            this.log.info('Evcc update successful');
        })
            .catch(error => {
            this.log.error(`3  ${error.message}`);
        });
    }
    setEvccStop(index) {
        this.log.debug(`call: ` + `http://${this.ip}/api/loadpoints/${index}/mode/off`);
        axios_1.default
            .post(`http://${this.ip}/api/loadpoints/${index}/mode/off`, { timeout: this.timeout })
            .then(() => {
            this.log.info('Evcc update successful');
        })
            .catch(error => {
            this.log.error(`4 ${error.message}`);
        });
    }
    setEvccTargetSoc(index, value) {
        this.log.debug(`call: ` + `http://${this.ip}/api/loadpoints/${index}/target/soc/${value}`);
        axios_1.default
            .post(`http://${this.ip}/api/loadpoints/${index}/target/soc/${value}`, { timeout: this.timeout })
            .then(() => {
            this.log.info('Evcc update successful');
        })
            .catch(error => {
            this.log.error(`5 ${error.message}`);
        });
    }
    setEvccMinSoc(index, value) {
        this.log.debug(`call: ` + `http://${this.ip}/api/loadpoints/${index}/minsoc/${value}`);
        axios_1.default
            .post(`http://${this.ip}/api/loadpoints/${index}/minsoc/${value}`, { timeout: this.timeout })
            .then(() => {
            this.log.info('Evcc update successful');
        })
            .catch(error => {
            this.log.error(`6 ${error.message}`);
        });
    }
    setEvccMinCurrent(index, value) {
        this.log.debug(`call: ` + `http://${this.ip}/api/loadpoints/${index}/mincurrent/${value}`);
        axios_1.default
            .post(`http://${this.ip}/api/loadpoints/${index}/mincurrent/${value}`, { timeout: this.timeout })
            .then(() => {
            this.log.info('Evcc update successful');
        })
            .catch(error => {
            this.log.error(`7 ${error.message}`);
        });
    }
    setEvccMaxCurrent(index, value) {
        this.log.debug(`call: ` + `http://${this.ip}/api/loadpoints/${index}/maxcurrent/${value}`);
        axios_1.default
            .post(`http://${this.ip}/api/loadpoints/${index}/maxcurrent/${value}`, { timeout: this.timeout })
            .then(() => {
            this.log.info('Evcc update successful');
        })
            .catch(error => {
            this.log.error(`8 ${error.message}`);
        });
    }
    setEvccPhases(index, value) {
        this.log.debug(`call: ` + `http://${this.ip}/api/loadpoints/${index}/phases/${value}`);
        axios_1.default
            .post(`http://${this.ip}/api/loadpoints/${index}/phases/${value}`, { timeout: this.timeout })
            .then(() => {
            this.log.info('Evcc update successful');
        })
            .catch(error => {
            this.log.error(`9 ${error.message}`);
        });
    }
    setEvccDisableThreshold(index, value) {
        this.log.debug(`call: ` + `http://${this.ip}/api/loadpoints/${index}/disable/threshold/${value}`);
        axios_1.default
            .post(`http://${this.ip}/api/loadpoints/${index}/disable/threshold/${value}`, {
            timeout: this.timeout,
        })
            .then(() => {
            this.log.info('Evcc update successful');
        })
            .catch(error => {
            this.log.error(`10 ${error.message}`);
        });
    }
    setEvccEnableThreshold(index, value) {
        this.log.debug(`call: ` + `http://${this.ip}/api/loadpoints/${index}/enable/threshold/${value}`);
        axios_1.default
            .post(`http://${this.ip}/api/loadpoints/${index}/enable/threshold/${value}`, {
            timeout: this.timeout,
        })
            .then(() => {
            this.log.info('Evcc update successful');
        })
            .catch(error => {
            this.log.error(`11 ${error.message}`);
        });
    }
    setEvccSetTargetTime(index, value) {
        this.log.debug(`call: ` + `http://${this.ip}/api/loadpoints/${index}/target/time/${value}`);
        axios_1.default
            .post(`http://${this.ip}/api/loadpoints/${index}/target/time/${value}`, { timeout: this.timeout })
            .then(() => {
            this.log.info('Evcc update successful');
        })
            .catch(error => {
            this.log.error(`12 ${error.message}`);
        });
    }
    setEvccLimitSoc(index, value) {
        this.log.debug(`call: ` + `http://${this.ip}/api/loadpoints/${index}/limitsoc/${value}`);
        axios_1.default
            .post(`http://${this.ip}/api/loadpoints/${index}/limitsoc/${value}`, { timeout: this.timeout })
            .then(() => {
            this.log.info('Evcc update successful');
        })
            .catch(error => {
            this.log.error(`12 ${error.message}`);
        });
    }
    setEvccVehicle(index, value) {
        //Wenn der String leer ist, wird es das GAstauto und wir müssen löschen
        if (value == '') {
            this.log.debug(`call: ` + `http://${this.ip}/api/loadpoints/${index}/vehicle`);
            axios_1.default
                .delete(`http://${this.ip}/api/loadpoints/${index}/vehicle`, { timeout: this.timeout })
                .then(() => {
                this.log.info('Evcc update successful');
            })
                .catch(error => {
                this.log.error(`setEvccVehicle: ${error.message}`);
            });
        }
        else {
            this.log.debug(`call: ` + `http://${this.ip}/api/loadpoints/${index}/vehicle/${value}`);
            axios_1.default
                .post(`http://${this.ip}/api/loadpoints/${index}/vehicle/${value}`, { timeout: this.timeout })
                .then(() => {
                this.log.info('Evcc update successful');
            })
                .catch(error => {
                this.log.error(`setEvccVehicle: ${error.message}`);
            });
        }
    }
    setEvccDeleteTargetTime(index) {
        this.log.debug(`call: ` + `http://${this.ip}/api/loadpoints/${index}/target/time`);
        axios_1.default
            .delete(`http://${this.ip}/api/loadpoints/${index}/target/time`, { timeout: this.timeout })
            .then(() => {
            this.log.info('Evcc update successful');
        })
            .catch(error => {
            this.log.error(`13 ${error.message}`);
        });
    }
    setEvccBufferSoc(bufferSoc) {
        this.log.debug(`call: ` + `http://${this.ip}/api/buffersoc/${bufferSoc}`);
        axios_1.default
            .post(`http://${this.ip}/api/buffersoc/${bufferSoc}`, { timeout: this.timeout })
            .then(() => {
            this.log.info('Evcc update successful');
        })
            .catch(error => {
            this.log.error(`setEvccBufferSoc ${error.message}`);
        });
    }
    setEvccBufferStartSoc(bufferStartSoc) {
        this.log.debug(`call: ` + `http://${this.ip}/api/bufferstartsoc/${bufferStartSoc}`);
        axios_1.default
            .post(`http://${this.ip}/api/bufferstartsoc/${bufferStartSoc}`, { timeout: this.timeout })
            .then(() => {
            this.log.info('Evcc update successful');
        })
            .catch(error => {
            this.log.error(`setEvccBufferStartSoc ${error.message}`);
        });
    }
    setEvccPrioritySoc(prioritySoc) {
        this.log.debug(`call: ` + `http://${this.ip}/api/prioritysoc/${prioritySoc}`);
        axios_1.default
            .post(`http://${this.ip}/api/prioritysoc/${prioritySoc}`, { timeout: this.timeout })
            .then(() => {
            this.log.info('Evcc update successful');
        })
            .catch(error => {
            this.log.error(`setEvccBufferStartSoc ${error.message}`);
        });
    }
    setVehicleMinSoc(vehicleID, minSoc) {
        this.log.debug(`call: ` + `http://${this.ip}/api/vehicles/${vehicleID}/minsoc/${minSoc}`);
        axios_1.default
            .post(`http://${this.ip}/api/vehicles/${vehicleID}/minsoc/${minSoc}`, { timeout: this.timeout })
            .then(() => {
            this.log.info('Evcc update successful');
        })
            .catch(error => {
            this.log.error(`14 ${error.message}`);
        });
    }
    setVehicleLimitSoc(vehicleID, minSoc) {
        this.log.debug(`call: ` + `http://${this.ip}/api/vehicles/${vehicleID}/limitsoc/${minSoc}`);
        axios_1.default
            .post(`http://${this.ip}/api/vehicles/${vehicleID}/limitsoc/${minSoc}`, { timeout: this.timeout })
            .then(() => {
            this.log.info('Evcc update successful');
        })
            .catch(error => {
            this.log.error(`15 ${error.message}`);
        });
    }
    setVehiclePlan(vehicleID, active, soc) {
        if (active) {
            const currentDate = new Date();
            // Add one day to the current date
            currentDate.setDate(currentDate.getDate() + 1);
            // Convert to ISO 8601 / RFC 3339 format
            const rfc3339Date = currentDate.toISOString();
            //Aktvierungsregel:
            // wenn aktive false => soc = 0% + time = 0
            // wenn aktive true => soc = 100% + time = nextday, same time
            // wenn soc > 0 => active = true + time = nextday, same time
            // wenn soc < 0 => active = false
            this.log.debug(`call: ` + `http://${this.ip}/api/vehicles/${vehicleID}/plan/soc/100/${rfc3339Date}`);
            axios_1.default
                .post(`http://${this.ip}/api/vehicles/${vehicleID}/plan/soc/100/${rfc3339Date}`, {
                timeout: this.timeout,
            })
                .then(() => {
                this.log.info(`Activate plan for verhicle: ${vehicleID}`);
            })
                .catch(error => {
                this.log.error(`Error active plan: ${error.message}`);
            });
        }
        else {
            this.log.debug(`call: ` + `http://${this.ip}/api/vehicles/${vehicleID}/plan/soc`);
            axios_1.default
                .delete(`http://${this.ip}/api/vehicles/${vehicleID}/plan/soc`, { timeout: this.timeout })
                .then(() => {
                this.log.info(`Deactivate plan for verhicle: ${vehicleID}`);
            })
                .catch(error => {
                this.log.error(`Error deactive plan: ${error.message}`);
            });
        }
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