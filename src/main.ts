import * as utils from '@iobroker/adapter-core';
import axios from 'axios';
import {
    EVCC_CONTROL_MAPPING,
    formatDuration,
    formatEvccPathEntry,
    isEmptyEvccValue,
    isIgnoredEvccEntry,
} from './lib/tools';
import type { Loadpoint } from './lib/loadpoint';
import type { Vehicle } from './lib/vehicle';
import { SendEvcc } from './lib/sendEvcc';
import {
    ALWAYS_CHARGE_VALUES,
    hasSmartModeApi,
    isAlwaysChargeValue,
    PvControl,
    toPvControl,
    type EvccAlwaysCharge,
    type EvccMode,
} from './lib/mode';

class Evcc extends utils.Adapter {
    private ip = '';
    private polltime = 0;
    private timeout = 1000;
    private maxLoadpointIndex = -1;
    private adapterIntervals: any; //halten von allen Intervallen
    private evcc: any;
    private adapterStart = false;
    /** true when evcc >= 0.316.0 (smart + alwaysCharge), detected on every poll */
    private smartModeApi = false;
    /** Objekte, die in dieser Laufzeit schon angelegt/angepasst wurden: id -> Signatur (Objekt-Typ + State-Typ) */
    private readonly knownObjects = new Map<string, string>();
    /** Fahrzeuge, deren Objekte und Subscriptions schon angelegt wurden */
    private readonly knownVehicles = new Set<string>();
    /** verhindert überlappende Abfragen, falls evcc langsamer antwortet als das Intervall */
    private pollRunning = false;
    public constructor(options: Partial<utils.AdapterOptions> = {}) {
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
    private async onReady(): Promise<void> {

        if (this.config.ip) {
            if (this.config.ip !== '0.0.0.0' && this.config.ip !== '') {
                this.config.ip = this.config.ip.replace('http', '');
                this.config.ip = this.config.ip.replace('://', '');

                // add port to ip
                this.ip = `${this.config.ip}:${this.config.port}`;
                this.log.debug(`Final Ip:${this.ip}`);
            } else {
                this.log.error('No ip is set, adapter stop');
                return;
            }
        } else {
            this.log.error('No ip is set, adapter stop');
            return;
        }

        if (this.config.polltime > 0) {
            this.polltime = this.config.polltime;
            this.timeout = this.polltime * 1000 - 500; //'500ms unter interval'
        } else {
            this.log.error('Wrong Polltime (polltime < 0), adapter stop');
            return;
        }

        this.evcc = new SendEvcc(this.ip, this.timeout, this.log);

        await this.createEvccControl();
        this.adapterStart = false;

        void this.getEvccData();

        //War alles ok, dann können wir die Daten abholen
        this.adapterIntervals = this.setInterval(() => void this.getEvccData(), this.polltime * 1000);

        this.log.debug(`config ip: ${this.config.ip}`);
        this.log.debug(`config polltime: ${this.config.polltime}`);
    }

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     *
     * @param callback
     */
    private onUnload(callback: () => void): void {
        try {
            clearInterval(this.adapterIntervals);
            callback();
        } catch {
            callback();
        }
    }

    /**
     * Is called if a subscribed state changes
     *
     * @param id
     * @param state
     */
    private onStateChange(id: string, state: ioBroker.State | null | undefined): void {
        if (!state) {
            this.log.info(`state ${id} deleted`);
            return;
        }

        if (state.ack) {
            return;
        } // nur auf manuelle Änderungen reagieren

        const idParts = id.split('.');

        // Erwartete Formate (absolut):
        // 4 Teile: <adapter>.<instance>.<channel>.<action>
        // 5 Teile: <adapter>.<instance>.<channel>.<index>.<action>
        // 6 Teile: <adapter>.<instance>.<channel>.<index>.<group>.<action>
        let index: string | undefined;
        let group: string | undefined;
        let action: string | undefined;

        switch (idParts.length) {
            case 4: {
                action = idParts[3];
                break;
            }
            case 5: {
                index = idParts[3];
                group = idParts[2];
                action = idParts[4];
                break;
            }
            case 6: {
                index = idParts[3];
                group = idParts[4];
                action = idParts[5];
                break;
            }
            default:
                this.log.warn(`Unexpected state ID format: ${id}`);
                return;
        }

        if (!action) {
            this.log.warn(`Unexpected state ID format (missing action): ${id}`);
            return;
        }

        const val = state.val;

        this.log.info(`state ${id} changed: ${val} (ack = ${state.ack})`);

        // --- Helper: Logging + Funktionsaufruf ---
        const doAction = (msg: string, fn: (...args: any[]) => void, ...args: any[]): void => {
            this.log.info(`${msg}${index !== undefined ? ` on loadpointindex: ${index}` : ''}`);
            // an die SendEvcc-Instanz binden (vorher: Adapter-Instanz, funktionierte nur zufällig über gleichnamige Felder)
            fn.apply(this.evcc, args);
        };

        // --- Fahrzeug-bezogene Gruppen ---
        // vehicle.<name>.<action> (5 Teile) bzw. vehicle.<name>.plan.<action> (6 Teile)
        if (group === 'vehicle') {
            const vehicleMap: Record<string, () => void> = {
                minSoc: () => this.evcc.setVehicleMinSoc(index, Number(val)),
                limitSoc: () => this.evcc.setVehicleLimitSoc(index, Number(val)),
            };
            return vehicleMap[action]?.();
        }
        if (group === 'plan' && idParts[2] === 'vehicle') {
            void this.handleVehiclePlan(index, action, val);
            return;
        }

        // --- EVCC-Root-Werte (control.<action>, kein Index) ---
        if (index === undefined) {
            const evccRootMap: Record<string, () => void> = {
                bufferSoc: () => this.evcc.setEvccBufferSoc(Number(val)),
                bufferStartSoc: () => this.evcc.setEvccBufferStartSoc(Number(val)),
                prioritySoc: () => this.evcc.setEvccPrioritySoc(Number(val)),
                smartCostLimit: () => void this.evcc.setEvccsmartCostLimit(Number(val)),
                batteryGridChargeLimit: () => void this.evcc.setEvccBatteryGridChargeLimit(Number(val)),
            };
            if (evccRootMap[action]) {
                return evccRootMap[action]();
            }
        }

        // --- pvControl separat behandeln ---
        if (action === 'pvControl') {
            const pvMap: Record<number, () => void> = {
                [PvControl.Off]: () => void this.setChargeMode(index, 'off'),
                [PvControl.Smart]: () => void this.setChargeMode(index, 'smart', 'off'),
                [PvControl.SmartAlwaysCharge]: () => void this.setChargeMode(index, 'smart', 'on'),
                [PvControl.Now]: () => void this.setChargeMode(index, 'now'),
            };
            return pvMap[Number(val)]?.();
        }

        // --- Direktes Mapping für einfache Fälle ---
        const actionMap: Record<string, () => void> = {
            off: () => void this.setChargeMode(index, 'off'),
            now: () => void this.setChargeMode(index, 'now'),
            smart: () => void this.setChargeMode(index, 'smart'),
            // deprecated since evcc 0.316.0: pv = smart without alwaysCharge, min = smart with alwaysCharge
            pv: () => void this.setChargeMode(index, 'smart', 'off'),
            min: () => void this.setChargeMode(index, 'smart', 'on'),
            alwaysCharge: () => void this.setAlwaysCharge(index, val),
            minCurrent: () => doAction('Set minCurrent', this.evcc.setEvccMinCurrent, index, val),
            maxCurrent: () => doAction('Set maxCurrent', this.evcc.setEvccMaxCurrent, index, val),
            phasesConfigured: () => doAction('Set phasesConfigured', this.evcc.setEvccPhases, index, val),
            disableThreshold: () => doAction('Set disable threshold', this.evcc.setEvccDisableThreshold, index, val),
            enableThreshold: () => doAction('Set enable threshold', this.evcc.setEvccEnableThreshold, index, val),
            limitSoc: () => doAction('Set limitSoc', this.evcc.setEvccLimitSoc, index, Number(val)),
            vehicleName: () => doAction('Set vehicleName', this.evcc.setEvccVehicle, index, val),
            smartCostLimit: () =>
                doAction('Set smartCostLimit', this.evcc.setEvccsmartCostLimitLoadpoint, index, val),
        };

        // --- Wenn direkte Aktion existiert ---
        if (index !== undefined && actionMap[action]) {
            return actionMap[action]();
        }

        // --- Fallback ---
        this.log.debug(JSON.stringify(idParts));
        this.log.warn(`Unhandled state change: ${id} -> ${val}`);
    }

    /**
     * Handles writes to vehicle.<name>.plan.(active|planSoc|time).
     * active=true creates a plan from planSoc (default 100 %) and time (default now + 24 h),
     * active=false deletes it. planSoc/time update an active plan, otherwise they are only stored.
     *
     * @param vehicle vehicle name as used by evcc (e.g. db:6)
     * @param action active | planSoc | time
     * @param val written value
     */
    private async handleVehiclePlan(
        vehicle: string | undefined,
        action: string,
        val: ioBroker.StateValue,
    ): Promise<void> {
        if (vehicle === undefined) {
            this.log.warn('Cannot set plan: missing vehicle name');
            return;
        }
        const base = `vehicle.${vehicle}.plan`;

        if (action === 'active' && !val) {
            this.log.info(`Delete plan on vehicle: ${vehicle}`);
            await this.evcc.deleteVehiclePlan(vehicle);
            return;
        }
        if (action !== 'active' && action !== 'planSoc' && action !== 'time') {
            this.log.warn(`Unhandled plan state: ${base}.${action}`);
            return;
        }

        const activeState = await this.getStateAsync(`${base}.active`);
        const socState = await this.getStateAsync(`${base}.planSoc`);
        const timeState = await this.getStateAsync(`${base}.time`);

        const soc = Number(action === 'planSoc' ? val : socState?.val);
        const time = Number(action === 'time' ? val : timeState?.val);
        const active = action === 'active' ? true : activeState?.val === true;

        if (!active) {
            // Plan nicht aktiv: Wert nur übernehmen, wird beim Aktivieren verwendet
            await this.setStateAsync(`${base}.${action}`, { val, ack: true });
            return;
        }

        const planSoc = soc > 0 && soc <= 100 ? soc : 100;
        const planTime = time > Date.now() ? new Date(time) : new Date(Date.now() + 24 * 3600 * 1000);
        this.log.info(`Set plan on vehicle: ${vehicle} to ${planSoc} % at ${planTime.toISOString()}`);
        await this.evcc.setVehiclePlan(vehicle, planSoc, planTime);
    }

    /**
     * Sets the charge mode of a loadpoint, using the API of the detected evcc version.
     * evcc < 0.316.0: smart is sent as pv, smart + alwaysCharge on as minpv.
     * evcc >= 0.316.0: mode and alwaysCharge are sent separately.
     *
     * @param index loadpoint index (starts with 1)
     * @param mode target mode (off | smart | now)
     * @param alwaysCharge optional alwaysCharge value, only used together with smart
     */
    private async setChargeMode(
        index: string | undefined,
        mode: 'off' | 'smart' | 'now',
        alwaysCharge?: EvccAlwaysCharge,
    ): Promise<void> {
        if (index === undefined) {
            this.log.warn(`Cannot set mode ${mode}: missing loadpoint index`);
            return;
        }
        this.log.info(`Set mode ${mode}${alwaysCharge ? ` (alwaysCharge ${alwaysCharge})` : ''} on loadpointindex: ${index}`);

        if (!this.smartModeApi) {
            let legacyMode: EvccMode = mode;
            if (mode === 'smart') {
                legacyMode = alwaysCharge === 'on' || alwaysCharge === 'once' ? 'minpv' : 'pv';
            }
            await this.evcc.setEvccMode(index, legacyMode);
            return;
        }

        const ok: boolean = await this.evcc.setEvccMode(index, mode);
        if (ok && mode === 'smart' && alwaysCharge !== undefined) {
            await this.evcc.setEvccAlwaysCharge(index, alwaysCharge);
        }
    }

    /**
     * Sets alwaysCharge of a loadpoint (evcc >= 0.316.0 only).
     *
     * @param index loadpoint index (starts with 1)
     * @param value off | on | once
     */
    private async setAlwaysCharge(index: string | undefined, value: ioBroker.StateValue): Promise<void> {
        if (index === undefined) {
            this.log.warn('Cannot set alwaysCharge: missing loadpoint index');
            return;
        }
        if (!isAlwaysChargeValue(value)) {
            this.log.warn(`Invalid alwaysCharge value "${String(value)}", allowed: ${ALWAYS_CHARGE_VALUES.join(', ')}`);
            return;
        }
        if (!this.smartModeApi) {
            this.log.warn('alwaysCharge requires evcc >= 0.316.0, use control.min / pvControl = 2 instead');
            return;
        }
        this.log.info(`Set alwaysCharge ${value} on loadpointindex: ${index}`);
        await this.evcc.setEvccAlwaysCharge(index, value);
    }

    /**
     * Hole Daten vom EVCC
     */
    /**
     * Holt /api/state von evcc und schreibt alle Werte. Läuft nie parallel zu sich selbst.
     */
    private async getEvccData(): Promise<void> {
        if (this.pollRunning) {
            this.log.debug('Previous poll still running, skipping this interval');
            return;
        }
        this.pollRunning = true;
        try {
            this.log.debug(`call: http://${this.ip}/api/state`);
            const response = await axios(`http://${this.ip}/api/state`, { timeout: this.timeout });
            this.log.debug(`Get-Data from evcc:${JSON.stringify(response.data)}`);

            //Global status Items - ohne loadpoints - ohne vehicle
            let respData = response.data;

            if (Object.prototype.hasOwnProperty.call(response.data, 'result')) {
                // https://github.com/evcc-io/evcc/pull/22299
                respData = response.data.result;
            }

            if (this.adapterStart) {
                respData.eebus = [];
                respData.hems = [];
                respData.influx = [];
                respData.messagingEvents = [];
                respData.mqtt = [];
                respData.network = [];
                respData.sponsor = [];
                respData.shm = [];
            }

            await this.setStatusEvcc(respData);

            this.adapterStart = true;

            //Laden jeden Ladepunkt einzeln
            const loadpoints: Loadpoint[] = Array.isArray(respData.loadpoints) ? respData.loadpoints : [];
            for (const [index, loadpoint] of loadpoints.entries()) {
                await this.setLoadPointdata(loadpoint, index);
            }

            for (const [vehicleKey, vehicle] of Object.entries(respData.vehicles ?? {})) {
                await this.setVehicleData(vehicleKey, vehicle as Vehicle);
            }

            await this.setStateAsync('info.connection', true, true);
        } catch (error: any) {
            this.log.error(error?.message ?? String(error));
            await this.setStateAsync('info.connection', false, true);
        } finally {
            this.pollRunning = false;
        }
    }

    async createEvccControl(): Promise<void> {
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

    /**
     * Legt ein Objekt nur einmal pro Laufzeit an bzw. passt es an, wenn sich der State-Typ ändert.
     * Ohne Cache wurde jedes Objekt bei jeder Abfrage gelesen bzw. neu geschrieben.
     *
     * @param id Objekt-ID (relativ zur Instanz)
     * @param obj Objekt-Definition
     * @param mode notExists: nur anlegen, extend: anlegen oder bei geändertem Typ anpassen
     */
    private async ensureObjectOnce(
        id: string,
        obj: ioBroker.SettableObject,
        mode: 'notExists' | 'extend' = 'notExists',
    ): Promise<void> {
        const signature = `${obj.type}:${(obj.common as { type?: string })?.type ?? ''}`;
        if (this.knownObjects.get(id) === signature) {
            return;
        }
        if (mode === 'extend') {
            await this.extendObjectAsync(id, obj);
        } else {
            await this.setObjectNotExistsAsync(id, obj);
        }
        this.knownObjects.set(id, signature);
    }

    private async ensureEvccChannel(path: string, name: string): Promise<void> {
        await this.ensureObjectOnce(path, {
            type: 'channel',
            common: { role: 'value', name },
            native: {},
        });
    }

    private async ensureEvccState(path: string, name: string, type: string): Promise<void> {
        // @ts-ignore
        await this.ensureObjectOnce(path, {
            type: 'state',
            common: {
                role: 'value',
                name,
                type,
                read: true,
                write: false,
            },
            native: {},
        });
    }

    private async writeEvccState(path: string, name: string, value: any): Promise<void> {
        const valueType = typeof value;
        await this.ensureEvccState(path, name, valueType);
        // @ts-ignore
        this.setState(path, valueType === 'object' ? JSON.stringify(value) : value, true);
    }

    private async writeEvccNestedObject(basePath: string, data: Record<string, any>): Promise<void> {
        for (const [entry, value] of Object.entries(data)) {
            if (value === undefined || isIgnoredEvccEntry(entry)) {
                continue;
            }

            const formattedEntry = formatEvccPathEntry(entry);
            const entryPath = `${basePath}.${formattedEntry}`;

            if (typeof value === 'object' && value !== null) {
                await this.ensureEvccChannel(entryPath, formattedEntry);

                for (const [dataPoint, keyData] of Object.entries(value)) {
                    await this.writeEvccState(`${entryPath}.${dataPoint}`, dataPoint, keyData);
                }
                continue;
            }

            await this.writeEvccState(entryPath, entry, value);
        }
    }

    async setStatusEvcc(daten: any): Promise<void> {
        // Handle forecast conditionally when weatherForecast is enabled
        if (this.config.weatherForecast && daten.forecast && !isEmptyEvccValue(daten.forecast)) {
            const forecastData = daten.forecast;
            if (typeof forecastData === 'object') {
                const basePath = 'status.Forecast';
                await this.ensureEvccChannel(basePath, 'Forecast');
                await this.writeEvccNestedObject(basePath, forecastData as Record<string, any>);
            } else {
                await this.writeEvccState('status.forecast', 'forecast', forecastData);
            }
        }

        // evcc lässt nicht gesetzte globale Limits ganz weg -> ohne das bliebe nach dem Löschen der alte Wert stehen
        if (!('batteryGridChargeLimit' in daten)) {
            await this.setStateAsync(EVCC_CONTROL_MAPPING.batteryGridChargeLimit, { val: 0, ack: true });
        }
        // Ein globales smartCostLimit gibt es in /api/state nicht (evcc setzt es je Ladepunkt).
        // Haben alle Ladepunkte denselben Wert, wird dieser angezeigt, sonst bleibt der State unverändert.
        if (!('smartCostLimit' in daten) && Array.isArray(daten.loadpoints) && daten.loadpoints.length > 0) {
            const limits = (daten.loadpoints as Loadpoint[]).map(lp => lp.smartCostLimit ?? 0);
            if (limits.every(limit => limit === limits[0])) {
                await this.setStateAsync(EVCC_CONTROL_MAPPING.smartCostLimit, { val: limits[0], ack: true });
            }
        }

        for (const [lpEntry, lpData] of Object.entries(daten)) {
            if (EVCC_CONTROL_MAPPING[lpEntry]) {
                // null = kein Limit gesetzt -> 0 (entspricht "0 = delete"), daher vor der Leer-Prüfung
                // @ts-ignore
                this.setState(EVCC_CONTROL_MAPPING[lpEntry], { val: lpData ?? 0, ack: true });
                continue;
            }

            if (isIgnoredEvccEntry(lpEntry) || isEmptyEvccValue(lpData)) {
                continue;
            }

            const lpType = typeof lpData;

            if (lpType === 'object' && this.config.dissolveObjects) {
                const formattedEntry = formatEvccPathEntry(lpEntry);
                const basePath = `status.${formattedEntry}`;
                await this.ensureEvccChannel(basePath, formattedEntry);
                await this.writeEvccNestedObject(basePath, lpData as Record<string, any>);
                continue;
            }

            await this.writeEvccState(`status.${lpEntry}`, lpEntry, lpData);
        }
    }

    /**
     * Hole Daten von und für Vehicle
     *
     * @param vehicleIndex
     * @param vehicleData
     */
    /**
     * Legt die Objekte eines Fahrzeugs an und abonniert die beschreibbaren States (einmal pro Laufzeit).
     *
     * @param vehicleIndex Fahrzeugname in evcc (z. B. db:6)
     */
    private async createVehicleObjects(vehicleIndex: string): Promise<void> {
        const base = `vehicle.${vehicleIndex}`;
        const states: { id: string; common: Partial<ioBroker.StateCommon> }[] = [
            { id: 'title', common: { name: 'title', type: 'string', write: false, role: 'value' } },
            { id: 'minSoc', common: { name: 'minSoc', type: 'number', write: true, role: 'value', unit: '%' } },
            { id: 'limitSoc', common: { name: 'limitSoc', type: 'number', write: true, role: 'value', unit: '%' } },
            { id: 'plan.active', common: { name: 'active', type: 'boolean', write: true, role: 'value' } },
            { id: 'plan.planSoc', common: { name: 'planSoc', type: 'number', write: true, role: 'value', unit: '%' } },
            { id: 'plan.time', common: { name: 'time', type: 'number', write: true, role: 'date' } },
        ];
        for (const state of states) {
            // extendObject: bestehende Objekte aus älteren Versionen werden angeglichen
            await this.extendObjectAsync(`${base}.${state.id}`, {
                type: 'state',
                common: { read: true, ...state.common },
                native: {},
            });
            if (state.common.write) {
                this.subscribeStates(`${base}.${state.id}`);
            }
        }
    }

    /**
     * Schreibt die Werte eines Fahrzeugs. Objekte werden nur beim ersten Aufruf angelegt.
     *
     * @param vehicleIndex Fahrzeugname in evcc (z. B. db:6)
     * @param vehicleData Fahrzeugdaten aus /api/state
     */
    async setVehicleData(vehicleIndex: string, vehicleData: Vehicle): Promise<void> {
        this.log.debug(`Vehicle mit index ${vehicleIndex} gefunden...`);
        if (!this.knownVehicles.has(vehicleIndex)) {
            await this.createVehicleObjects(vehicleIndex);
            this.knownVehicles.add(vehicleIndex);
        }

        const base = `vehicle.${vehicleIndex}`;
        // evcc liefert den Plan als vehicles[x].plan, ältere Versionen als plans[]
        const firstPlan = vehicleData.plan ?? vehicleData.plans?.[0];
        const planTime = firstPlan?.time ? Date.parse(firstPlan.time) : NaN;

        await this.setStateAsync(`${base}.title`, { val: vehicleData.title ?? '', ack: true });
        await this.setStateAsync(`${base}.minSoc`, { val: vehicleData.minSoc ?? 0, ack: true });
        await this.setStateAsync(`${base}.limitSoc`, { val: vehicleData.limitSoc ?? 100, ack: true });
        await this.setStateAsync(`${base}.plan.active`, { val: firstPlan !== undefined, ack: true });

        // Ohne Plan in evcc vorbereitete Werte (planSoc/time) nicht überschreiben
        if (firstPlan) {
            await this.setStateAsync(`${base}.plan.planSoc`, { val: firstPlan.soc, ack: true });
            if (!Number.isNaN(planTime)) {
                await this.setStateAsync(`${base}.plan.time`, { val: planTime, ack: true });
            }
        }
    }

    /**
     * Hole Daten für Ladepunkte
     *
     * @param loadpoint
     * @param index
     */
    async setLoadPointdata(loadpoint: Loadpoint, index: number): Promise<void> {
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
            val: loadpoint.smartCostLimit ?? 0,
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

        // Mode: evcc >= 0.316.0 reports smart + alwaysCharge, older versions pv/minpv
        this.smartModeApi = hasSmartModeApi(loadpoint);

        const pvControl = toPvControl(loadpoint.mode, loadpoint.alwaysCharge);
        if (pvControl !== null) {
            await this.setStateAsync(`loadpoint.${index}.control.pvControl`, { val: pvControl, ack: true });
        }

        if (isAlwaysChargeValue(loadpoint.alwaysCharge)) {
            await this.setStateAsync(`loadpoint.${index}.control.alwaysCharge`, {
                val: loadpoint.alwaysCharge,
                ack: true,
            });
        }

        //Alle Werte unter Status veröffentlichen
        await this.setStatusLoadPoint(loadpoint, index);
    }

    async setStatusLoadPoint(loaddata: any, index: number): Promise<void> {
        for (const lpEntry in loaddata) {
            let lpType: any = typeof loaddata[lpEntry]; // get Type of Variable as String, like string/number/boolean

            let res = loaddata[lpEntry];

            if (lpType === 'object') {
                res = JSON.stringify(res);
            }

            if (lpEntry === 'chargeDuration' || lpEntry === 'connectedDuration') {
                res = formatDuration(res);
                lpType = 'string';
            }

            await this.ensureObjectOnce(
                `loadpoint.${index}.status.${lpEntry}`,
                {
                    type: 'state',
                    common: {
                        name: lpEntry,
                        type: lpType,
                        read: true,
                        write: false,
                        role: 'value',
                    },
                    native: {},
                },
                'extend',
            );

            await this.setStateAsync(`loadpoint.${index}.status.${lpEntry}`, res, true);
        }
    }

    async createLoadPoint(index: number): Promise<void> {
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

        await this.setObjectNotExistsAsync(`loadpoint.${index}.control.smart`, {
            type: 'state',
            common: {
                name: 'Start smart charging (evcc < 0.316: pv)',
                type: 'boolean',
                role: 'button',
                read: false,
                write: true,
            },
            native: {},
        });
        this.subscribeStates(`loadpoint.${index}.control.smart`);

        await this.setObjectNotExistsAsync(`loadpoint.${index}.control.alwaysCharge`, {
            type: 'state',
            common: {
                name: 'Always charge at min current (evcc >= 0.316)',
                type: 'string',
                role: 'level',
                read: true,
                write: true,
                states: {
                    off: 'off',
                    on: 'on',
                    once: 'once',
                },
            },
            native: {},
        });
        this.subscribeStates(`loadpoint.${index}.control.alwaysCharge`);

        // extendObject: also update name for existing installations
        await this.extendObjectAsync(`loadpoint.${index}.control.min`, {
            type: 'state',
            common: {
                name: 'Deprecated: smart + alwaysCharge on (min+pv)',
                type: 'boolean',
                role: 'button',
                read: false,
                write: true,
            },
            native: {},
        });
        this.subscribeStates(`loadpoint.${index}.control.min`);

        await this.extendObjectAsync(`loadpoint.${index}.control.pv`, {
            type: 'state',
            common: {
                name: 'Deprecated: smart + alwaysCharge off (pv)',
                type: 'boolean',
                role: 'button',
                read: false,
                write: true,
            },
            native: {},
        });
        this.subscribeStates(`loadpoint.${index}.control.pv`);

        // extendObject: also update state labels for existing installations
        await this.extendObjectAsync(`loadpoint.${index}.control.pvControl`, {
            type: 'state',
            common: {
                name: 'control charging',
                type: 'number',
                role: 'level',
                read: true,
                write: true,
                def: 0,
                states: {
                    [PvControl.Off]: 'off',
                    [PvControl.Smart]: 'smart (pv)',
                    [PvControl.SmartAlwaysCharge]: 'smart + always charge (min+pv)',
                    [PvControl.Now]: 'now',
                },
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

}

if (require.main !== module) {
    // Export the constructor in compact mode
    module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new Evcc(options);
} else {
    // otherwise start the instance directly
    (() => new Evcc())();
}
