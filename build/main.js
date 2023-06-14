"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils = __importStar(require("@iobroker/adapter-core"));
const axios_1 = __importDefault(require("axios"));
class Evcc extends utils.Adapter {
    // @ts-ignore
    constructor(options = {}) {
        super({
            ...options,
            name: 'evcc',
        });
        this.ip = '';
        this.polltime = 0;
        this.timeout = 1000;
        this.maxLoadpointIndex = -1;
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
                this.ip = this.config.ip + ':' + this.config.port;
                this.log.debug('Final Ip:' + this.ip);
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
            this.timeout = (this.polltime * 1000) - 500; //'500ms unter interval'
        }
        else {
            this.log.error('Wrong Polltime (polltime < 0), adapter stop');
            return;
        }
        //holen für den Start einmal alle Daten
        this.getEvccData();
        //War alles ok, dann können wir die Daten abholen
        // @ts-ignore
        this.adapterIntervals = this.setInterval(() => this.getEvccData(), this.polltime * 1000);
        this.log.debug('config ip: ' + this.config.ip);
        this.log.debug('config polltime: ' + this.config.polltime);
    }
    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
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
     */
    onStateChange(id, state) {
        if (state) {
            // The state was changed, if true it is from this adapter
            if (!state.ack) {
                this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
                const idProperty = id.split('.');
                switch (idProperty[5]) {
                    case 'off':
                        this.log.info('Stop evcc charging on loadpointindex: ' + idProperty[3]);
                        this.setEvccStop(idProperty[3]);
                        break;
                    case 'now':
                        this.log.info('Start evcc charging on loadpointindex: ' + idProperty[3]);
                        this.setEvccStartNow(idProperty[3]);
                        break;
                    case 'min':
                        this.log.info('Start evcc ninimal charging on loadpointindex: ' + idProperty[3]);
                        this.setEvccStartMin(idProperty[3]);
                        break;
                    case 'pv':
                        this.log.info('Start evcc pv only charging on loadpointindex: ' + idProperty[3]);
                        this.setEvccStartPV(idProperty[3]);
                        break;
                    case 'minSoc':
                        this.log.info('Set minSoc on loadpointindex: ' + idProperty[3]);
                        this.setEvccMinSoc(idProperty[3], state.val);
                        break;
                    case 'targetSoc':
                        this.log.info('Set evcc targetSoc on loadpointindex: ' + idProperty[3]);
                        this.setEvccTargetSoc(idProperty[3], state.val);
                        break;
                    case 'minCurrent':
                        this.log.info('Set minCurrent on loadpointindex: ' + idProperty[3]);
                        this.setEvccMinCurrent(idProperty[3], state.val);
                        break;
                    case 'maxCurrent':
                        this.log.info('Set maxCurrent on loadpointindex: ' + idProperty[3]);
                        this.setEvccMaxCurrent(idProperty[3], state.val);
                        break;
                    case 'phases':
                        this.log.info('Set phases on loadpointindex: ' + idProperty[3]);
                        this.setEvccPhases(idProperty[3], state.val);
                        break;
                    case 'disable_threshold':
                        this.log.info('Set disbale threshold on loadpointindex: ' + idProperty[3]);
                        this.setEvccDisableThreshold(idProperty[3], state.val);
                        break;
                    case 'disable_threshold':
                        this.log.info('Set enable threshold on loadpointindex: ' + idProperty[3]);
                        this.setEvccEnableThreshold(idProperty[3], state.val);
                        break;
                    default:
                        this.log.debug(JSON.stringify(idProperty));
                        this.log.warn(`Event with state ${id} changed: ${state.val} (ack = ${state.ack}) not found`);
                }
            }
        }
        else {
            // The state was deleted
            this.log.info(`state ${id} deleted`);
        }
    }
    getEvccData() {
        try {
            this.log.debug('call: ' + 'http://' + this.ip + '/api/state');
            (0, axios_1.default)('http://' + this.ip + '/api/state', { timeout: this.timeout }).then(async (response) => {
                this.log.debug('Get-Data from evcc:' + JSON.stringify(response.data));
                //Global status Items
                this.cre_status(response.data.result);
                //Laden jeden Ladepunkt einzeln
                const tmpListLoadpoints = response.data.result.loadpoints;
                tmpListLoadpoints.forEach(async (loadpoint, index) => {
                    await this.setLoadPointdata(loadpoint, index);
                });
                this.setState('info.connection', true, true);
            }).catch(error => {
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
    async setLoadPointdata(loadpoint, index) {
        //Ladepunkt kann es X fach geben
        index = index + 1; // +1 why Evcc starts with 1
        this.log.debug('Ladepunkt mit index ' + 'loadpoint.' + index + ' gefunden...');
        if (this.maxLoadpointIndex < index) {
            //Ladepunkt noch nicht angelegt für diesen Instanzstart
            this.log.info('Lege neuen Ladepunkt an mit Index: ' + index);
            await this.createLoadPoint(index);
            this.maxLoadpointIndex = index;
        }
        //Update der Werte
        await this.setStateAsync('loadpoint.' + index + '.control.maxCurrent', { val: loadpoint.maxCurrent, ack: true });
        await this.setStateAsync('loadpoint.' + index + '.control.minCurrent', { val: loadpoint.minCurrent, ack: true });
        await this.setStateAsync('loadpoint.' + index + '.control.minSoc', { val: loadpoint.minSoc, ack: true });
        await this.setStateAsync('loadpoint.' + index + '.control.phases', { val: loadpoint.phases, ack: true });
        await this.setStateAsync('loadpoint.' + index + '.control.targetSoc', { val: loadpoint.targetSoc, ack: true });
        this.cre_status_idx(loadpoint, index);
    }
    async cre_status_idx(loaddata, index) {
        for (const lpEntry in loaddata) {
            let lpType = typeof loaddata[lpEntry]; // get Type of Variable as String, like string/number/boolean
            let res = loaddata[lpEntry];
            if (lpType == 'object') {
                res = JSON.stringify(res);
            }
            if (lpEntry == 'chargeDuration' || lpEntry == 'connectedDuration') {
                res = this.milisekundenumwandeln(res);
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
    async cre_status(daten) {
        for (const lpEntry in daten) {
            const lpType = typeof daten[lpEntry]; // get Type of Variable as String, like string/number/boolean
            let lpData = daten[lpEntry];
            if (lpEntry == 'result') {
                continue;
            }
            if (lpType == 'object') {
                lpData = JSON.stringify(daten[lpEntry]);
            }
            await this.extendObjectAsync(`status.${lpEntry}`, {
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
            await this.setState(`status.${lpEntry}`, lpData, true);
        }
    }
    milisekundenumwandeln(nanoseconds) {
        let secondsG = nanoseconds / 1000000000;
        let days = Math.floor(secondsG / (24 * 3600));
        let hours = Math.floor((secondsG % (24 * 3600)) / 3600);
        let minutes = Math.floor((secondsG % 3600) / 60);
        let seconds = Math.round(secondsG % 60);
        let daysR = days.toString();
        let hoursR = hours.toString();
        let minutesR = minutes.toString();
        let secondsR = seconds.toString();
        if (days < 10) {
            daysR = "0" + days;
        }
        if (hours < 10) {
            hoursR = "0" + hours;
        }
        if (minutes < 10) {
            minutesR = "0" + minutes;
        }
        if (seconds < 10) {
            secondsR = "0" + seconds;
        }
        if (days > 0) {
            return `${daysR}:${hoursR}:${minutesR}:${secondsR}`;
        }
        else {
            return `${hoursR}:${minutesR}:${secondsR}`;
        }
    }
    async createLoadPoint(index) {
        //Control Objects und Buttons:
        await this.setObjectNotExistsAsync('loadpoint.' + index + '.control.off', {
            type: 'state',
            common: {
                name: 'Stop charging',
                type: 'boolean',
                role: 'button',
                read: true,
                write: true,
            },
            native: {},
        });
        this.subscribeStates('loadpoint.' + index + '.control.off');
        await this.setObjectNotExistsAsync('loadpoint.' + index + '.control.now', {
            type: 'state',
            common: {
                name: 'Start now charging',
                type: 'boolean',
                role: 'button',
                read: true,
                write: true,
            },
            native: {},
        });
        this.subscribeStates('loadpoint.' + index + '.control.now');
        await this.setObjectNotExistsAsync('loadpoint.' + index + '.control.min', {
            type: 'state',
            common: {
                name: 'Start min pv charging',
                type: 'boolean',
                role: 'button',
                read: true,
                write: true,
            },
            native: {},
        });
        this.subscribeStates('loadpoint.' + index + '.control.min');
        await this.setObjectNotExistsAsync('loadpoint.' + index + '.control.pv', {
            type: 'state',
            common: {
                name: 'Start pv only charging',
                type: 'boolean',
                role: 'button',
                read: true,
                write: true,
            },
            native: {},
        });
        this.subscribeStates('loadpoint.' + index + '.control.pv');
        await this.setObjectNotExistsAsync('loadpoint.' + index + '.control.minSoc', {
            type: 'state',
            common: {
                name: 'minSoc',
                type: 'number',
                role: 'value.min',
                read: true,
                write: true,
            },
            native: {},
        });
        this.subscribeStates('loadpoint.' + index + '.control.minSoc');
        await this.setObjectNotExistsAsync('loadpoint.' + index + '.control.targetSoc', {
            type: 'state',
            common: {
                name: 'targetSoc',
                type: 'number',
                role: 'value',
                read: true,
                write: true,
            },
            native: {},
        });
        this.subscribeStates('loadpoint.' + index + '.control.targetSoc');
        await this.setObjectNotExistsAsync('loadpoint.' + index + '.control.maxCurrent', {
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
        this.subscribeStates('loadpoint.' + index + '.control.maxCurrent');
        await this.setObjectNotExistsAsync('loadpoint.' + index + '.control.minCurrent', {
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
        this.subscribeStates('loadpoint.' + index + '.control.minCurrent');
        await this.setObjectNotExistsAsync('loadpoint.' + index + '.control.phases', {
            type: 'state',
            common: {
                name: 'phases',
                type: 'number',
                role: 'value',
                read: true,
                write: true,
            },
            native: {},
        });
        this.subscribeStates('loadpoint.' + index + '.control.phases');
        await this.setObjectNotExistsAsync('loadpoint.' + index + '.control.enable_threshold', {
            type: 'state',
            common: {
                name: 'enable_threshold',
                type: 'number',
                role: 'value',
                read: false,
                write: true,
            },
            native: {},
        });
        this.subscribeStates('loadpoint.' + index + '.control.enable_threshold');
        await this.setObjectNotExistsAsync('loadpoint.' + index + '.control.disable_threshold', {
            type: 'state',
            common: {
                name: 'disable_threshold',
                type: 'number',
                role: 'value',
                read: false,
                write: true,
            },
            native: {},
        });
        this.subscribeStates('loadpoint.' + index + '.control.disable_threshold');
        //Rest in status als Objekte
        await this.setObjectNotExistsAsync('loadpoint.' + index + '.status.activePhases', {
            type: 'state',
            common: {
                name: 'activePhases',
                type: 'number',
                role: 'value',
                read: true,
                write: false,
            },
            native: {},
        });
        await this.setObjectNotExistsAsync('loadpoint.' + index + '.status.chargeConfigured', {
            type: 'state',
            common: {
                name: 'chargeConfigured',
                type: 'boolean',
                role: 'value.current',
                read: true,
                write: false,
            },
            native: {},
        });
        await this.setObjectNotExistsAsync('loadpoint.' + index + '.status.chargeCurrent', {
            type: 'state',
            common: {
                name: 'chargeCurrent',
                type: 'number',
                role: 'value.current',
                read: true,
                write: false,
            },
            native: {},
        });
        await this.setObjectNotExistsAsync('loadpoint.' + index + '.status.chargeCurrents', {
            type: 'state',
            common: {
                name: 'chargeCurrents',
                type: 'string',
                role: 'value.current',
                read: true,
                write: false,
            },
            native: {},
        });
        await this.setObjectNotExistsAsync('loadpoint.' + index + '.status.chargeDuration', {
            type: 'state',
            common: {
                name: 'chargeDuration',
                type: 'number',
                role: 'value.current',
                read: true,
                write: false,
            },
            native: {},
        });
        await this.setObjectNotExistsAsync('loadpoint.' + index + '.status.chargePower', {
            type: 'state',
            common: {
                name: 'chargePower',
                type: 'number',
                role: 'value.current',
                read: true,
                write: false,
            },
            native: {},
        });
        await this.setObjectNotExistsAsync('loadpoint.' + index + '.status.chargeRemainingDuration', {
            type: 'state',
            common: {
                name: 'chargeRemainingDuration',
                type: 'number',
                role: 'value.current',
                read: true,
                write: false,
            },
            native: {},
        });
        await this.setObjectNotExistsAsync('loadpoint.' + index + '.status.chargedEnergy', {
            type: 'state',
            common: {
                name: 'chargedEnergy',
                type: 'number',
                role: 'value.current',
                read: true,
                write: false,
            },
            native: {},
        });
        await this.setObjectNotExistsAsync('loadpoint.' + index + '.status.charging', {
            type: 'state',
            common: {
                name: 'charging',
                type: 'boolean',
                role: 'value.current',
                read: true,
                write: false,
            },
            native: {},
        });
        await this.setObjectNotExistsAsync('loadpoint.' + index + '.status.connected', {
            type: 'state',
            common: {
                name: 'connected',
                type: 'boolean',
                role: 'info.status',
                read: true,
                write: false,
            },
            native: {},
        });
        await this.setObjectNotExistsAsync('loadpoint.' + index + '.status.connectedDuration', {
            type: 'state',
            common: {
                name: 'connectedDuration',
                type: 'number',
                role: 'info.status',
                read: true,
                write: false,
            },
            native: {},
        });
        await this.setObjectNotExistsAsync('loadpoint.' + index + '.status.enabled', {
            type: 'state',
            common: {
                name: 'enabled',
                type: 'boolean',
                role: 'info.status',
                read: true,
                write: false,
            },
            native: {},
        });
        await this.setObjectNotExistsAsync('loadpoint.' + index + '.status.hasVehicle', {
            type: 'state',
            common: {
                name: 'hasVehicle',
                type: 'boolean',
                role: 'info.status',
                read: true,
                write: false,
            },
            native: {},
        });
        await this.setObjectNotExistsAsync('loadpoint.' + index + '.status.mode', {
            type: 'state',
            common: {
                name: 'mode',
                type: 'string',
                role: 'info.status',
                read: true,
                write: false,
            },
            native: {},
        });
        await this.setObjectNotExistsAsync('loadpoint.' + index + '.status.timerActive', {
            type: 'state',
            common: {
                name: 'timerActive',
                type: 'boolean',
                role: 'info.status',
                read: true,
                write: false,
            },
            native: {},
        });
        await this.setObjectNotExistsAsync('loadpoint.' + index + '.status.timerProjectedEnd', {
            type: 'state',
            common: {
                name: 'timerProjectedEnd',
                type: 'string',
                role: 'info.status',
                read: true,
                write: false,
            },
            native: {},
        });
        await this.setObjectNotExistsAsync('loadpoint.' + index + '.status.timerSet', {
            type: 'state',
            common: {
                name: 'timerSet',
                type: 'boolean',
                role: 'info.status',
                read: true,
                write: false,
            },
            native: {},
        });
        await this.setObjectNotExistsAsync('loadpoint.' + index + '.status.title', {
            type: 'state',
            common: {
                name: 'title',
                type: 'string',
                role: 'info.name',
                read: true,
                write: false,
            },
            native: {},
        });
        await this.setObjectNotExistsAsync('loadpoint.' + index + '.status.vehicleCapacity', {
            type: 'state',
            common: {
                name: 'vehicleCapacity',
                type: 'number',
                role: 'info.name',
                read: true,
                write: false,
            },
            native: {},
        });
        await this.setObjectNotExistsAsync('loadpoint.' + index + '.status.vehicleIdentity', {
            type: 'state',
            common: {
                name: 'vehicleIdentity',
                type: 'string',
                role: 'info.name',
                read: true,
                write: false,
            },
            native: {},
        });
        await this.setObjectNotExistsAsync('loadpoint.' + index + '.status.vehiclePresent', {
            type: 'state',
            common: {
                name: 'vehiclePresent',
                type: 'boolean',
                role: 'info.status',
                read: true,
                write: false,
            },
            native: {},
        });
        await this.setObjectNotExistsAsync('loadpoint.' + index + '.status.vehicleRange', {
            type: 'state',
            common: {
                name: 'vehicleRange',
                type: 'number',
                role: 'info.status',
                read: true,
                write: false,
            },
            native: {},
        });
        await this.setObjectNotExistsAsync('loadpoint.' + index + '.status.vehicleSoc', {
            type: 'state',
            common: {
                name: 'vehicleSoc',
                type: 'number',
                role: 'info.status',
                read: true,
                write: false,
            },
            native: {},
        });
        await this.setObjectNotExistsAsync('loadpoint.' + index + '.status.vehicleTitle', {
            type: 'state',
            common: {
                name: 'vehicleTitle',
                type: 'string',
                role: 'info.name',
                read: true,
                write: false,
            },
            native: {},
        });
    }
    //Funktionen zum sterun von evcc
    setEvccStartPV(index) {
        this.log.debug('call: ' + 'http://' + this.ip + '/api/loadpoints/' + index + '/mode/pv');
        axios_1.default.post('http://' + this.ip + '/api/loadpoints/' + index + '/mode/pv', { timeout: this.timeout }).then(() => {
            this.log.info('Evcc update successful');
        }).catch(error => {
            this.log.error('1 ' + error.message);
        });
    }
    setEvccStartMin(index) {
        this.log.debug('call: ' + 'http://' + this.ip + '/api/loadpoints/' + index + '/mode/minpv');
        axios_1.default.post('http://' + this.ip + '/api/loadpoints/' + index + '/mode/minpv', { timeout: this.timeout }).then(() => {
            this.log.info('Evcc update successful');
        }).catch(error => {
            this.log.error('2 ' + error.message);
        });
    }
    setEvccStartNow(index) {
        this.log.debug('call: ' + 'http://' + this.ip + '/api/loadpoints/' + index + '/mode/now');
        axios_1.default.post('http://' + this.ip + '/api/loadpoints/' + index + '/mode/now', { timeout: this.timeout }).then(() => {
            this.log.info('Evcc update successful');
        }).catch(error => {
            this.log.error('3  ' + error.message);
        });
    }
    setEvccStop(index) {
        this.log.debug('call: ' + 'http://' + this.ip + '/api/loadpoints/' + index + '/mode/off');
        axios_1.default.post('http://' + this.ip + '/api/loadpoints/' + index + '/mode/off', { timeout: this.timeout }).then(() => {
            this.log.info('Evcc update successful');
        }).catch(error => {
            this.log.error('4 ' + error.message);
        });
    }
    setEvccTargetSoc(index, value) {
        this.log.debug('call: ' + 'http://' + this.ip + '/api/loadpoints/' + index + '/target/soc/' + value);
        axios_1.default.post('http://' + this.ip + '/api/loadpoints/' + index + '/target/soc/' + value, { timeout: this.timeout }).then(() => {
            this.log.info('Evcc update successful');
        }).catch(error => {
            this.log.error('5 ' + error.message);
        });
    }
    setEvccMinSoc(index, value) {
        this.log.debug('call: ' + 'http://' + this.ip + '/api/loadpoints/' + index + '/minsoc/' + value);
        axios_1.default.post('http://' + this.ip + '/api/loadpoints/' + index + '/minsoc/' + value, { timeout: this.timeout }).then(() => {
            this.log.info('Evcc update successful');
        }).catch(error => {
            this.log.error('6 ' + error.message);
        });
    }
    setEvccMinCurrent(index, value) {
        this.log.debug('call: ' + 'http://' + this.ip + '/api/loadpoints/' + index + '/mincurrent/' + value);
        axios_1.default.post('http://' + this.ip + '/api/loadpoints/' + index + '/mincurrent/' + value, { timeout: this.timeout }).then(() => {
            this.log.info('Evcc update successful');
        }).catch(error => {
            this.log.error('7 ' + error.message);
        });
    }
    setEvccMaxCurrent(index, value) {
        this.log.debug('call: ' + 'http://' + this.ip + '/api/loadpoints/' + index + '/maxcurrent/' + value);
        axios_1.default.post('http://' + this.ip + '/api/loadpoints/' + index + '/maxcurrent/' + value, { timeout: this.timeout }).then(() => {
            this.log.info('Evcc update successful');
        }).catch(error => {
            this.log.error('8 ' + error.message);
        });
    }
    setEvccPhases(index, value) {
        this.log.debug('call: ' + 'http://' + this.ip + '/api/loadpoints/' + index + '/phases/' + value);
        axios_1.default.post('http://' + this.ip + '/api/loadpoints/' + index + '/phases/' + value, { timeout: this.timeout }).then(() => {
            this.log.info('Evcc update successful');
        }).catch(error => {
            this.log.error('9 ' + error.message);
        });
    }
    setEvccDisableThreshold(index, value) {
        this.log.debug('call: ' + 'http://' + this.ip + '/api/loadpoints/' + index + '/disable/threshold/' + value);
        axios_1.default.post('http://' + this.ip + '/api/loadpoints/' + index + '/disable/threshold/' + value, { timeout: this.timeout }).then(() => {
            this.log.info('Evcc update successful');
        }).catch(error => {
            this.log.error('10 ' + error.message);
        });
    }
    setEvccEnableThreshold(index, value) {
        this.log.debug('call: ' + 'http://' + this.ip + '/api/loadpoints/' + index + '/enable/threshold/' + value);
        axios_1.default.post('http://' + this.ip + '/api/loadpoints/' + index + '/disable/threshold/' + value, { timeout: this.timeout }).then(() => {
            this.log.info('Evcc update successful');
        }).catch(error => {
            this.log.error('11 ' + error.message);
        });
    }
}
if (require.main !== module) {
    // Export the constructor in compact mode
    // @ts-ignore
    module.exports = (options) => new Evcc(options);
}
else {
    // otherwise start the instance directly
    (() => new Evcc())();
}
//# sourceMappingURL=main.js.map