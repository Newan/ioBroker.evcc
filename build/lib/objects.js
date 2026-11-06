"use strict";
/**
 * Object definitions (object tree, roles, units) of the writable states.
 *
 * Roles follow https://github.com/ioBroker/ioBroker.docs/blob/master/docs/en/dev/stateroles.md:
 * writable numbers use `level.*`, writable booleans `switch`, write-only booleans `button.*`, strings `text`.
 * Read-only status values get their role from units.ts.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VEHICLE_STATES = exports.LOADPOINT_PLAN_STATES = void 0;
exports.priceUnit = priceUnit;
exports.siteControlStates = siteControlStates;
exports.loadpointControlStates = loadpointControlStates;
exports.loadpointParents = loadpointParents;
exports.vehicleParents = vehicleParents;
/**
 * Price unit for limits and tariffs.
 *
 * @param currency currency symbol from evcc (e.g. €)
 * @returns unit like €/kWh
 */
function priceUnit(currency) {
    return `${currency}/kWh`;
}
const percentLevel = (name, role = 'level') => ({
    name,
    type: 'number',
    role,
    read: true,
    write: true,
    unit: '%',
    min: 0,
    max: 100,
});
const button = (name, role = 'button') => ({
    name,
    type: 'boolean',
    role,
    read: false,
    write: true,
});
/**
 * Writable site states below `control`.
 *
 * @param currency currency symbol from evcc
 * @returns state definitions
 */
function siteControlStates(currency) {
    const priceLimit = (name) => ({
        name,
        type: 'number',
        role: 'level',
        read: true,
        write: true,
        def: 0,
        unit: priceUnit(currency),
    });
    return [
        { id: 'bufferSoc', common: percentLevel('bufferSoc') },
        { id: 'bufferStartSoc', common: percentLevel('bufferStartSoc') },
        { id: 'prioritySoc', common: percentLevel('prioritySoc') },
        { id: 'smartCostLimit', common: priceLimit('smartCostLimit 0 = delete') },
        { id: 'batteryGridChargeLimit', common: priceLimit('batteryGridChargeLimit 0 = delete') },
    ];
}
/**
 * Writable states below `loadpoint.<index>.control`.
 *
 * @param currency currency symbol from evcc
 * @param pvControlStates labels of the pvControl values
 * @returns state definitions
 */
function loadpointControlStates(currency, pvControlStates) {
    const level = (name, unit, role = 'level') => ({
        name,
        type: 'number',
        role,
        read: true,
        write: true,
        unit,
    });
    return [
        { id: 'off', common: button('Stop charging', 'button.stop') },
        { id: 'now', common: button('Start now charging', 'button.start') },
        { id: 'smart', common: button('Start smart charging (evcc < 0.316: pv)') },
        { id: 'min', common: button('Deprecated: smart + alwaysCharge on (min+pv)') },
        { id: 'pv', common: button('Deprecated: smart + alwaysCharge off (pv)') },
        {
            id: 'pvControl',
            common: {
                name: 'control charging',
                type: 'number',
                role: 'level',
                read: true,
                write: true,
                def: 0,
                states: pvControlStates,
            },
        },
        {
            id: 'alwaysCharge',
            common: {
                name: 'Always charge at min current (evcc >= 0.316)',
                type: 'string',
                role: 'text',
                read: true,
                write: true,
                states: { off: 'off', on: 'on', once: 'once' },
            },
        },
        { id: 'minCurrent', common: level('minCurrent', 'A', 'level.current.min') },
        { id: 'maxCurrent', common: level('maxCurrent', 'A', 'level.current.max') },
        {
            id: 'phasesConfigured',
            common: {
                name: 'phasesConfigured (0 = auto, 1 = 1p, 3 = 3p)',
                type: 'number',
                role: 'level',
                read: true,
                write: true,
                states: { 0: 'auto', 1: '1p', 3: '3p' },
            },
        },
        { id: 'enableThreshold', common: level('enableThreshold', 'W') },
        { id: 'disableThreshold', common: level('disableThreshold', 'W') },
        { id: 'smartCostLimit', common: { ...level('smartCostLimit 0 = delete', priceUnit(currency)), def: 0 } },
        { id: 'limitSoc', common: percentLevel('limitSoc', 'level.battery') },
        {
            id: 'vehicleName',
            common: { name: 'vehicleName', type: 'string', role: 'text', read: true, write: true },
        },
    ];
}
/** States below `loadpoint.<index>.control.plan` (issue #73) */
exports.LOADPOINT_PLAN_STATES = [
    {
        id: 'active',
        common: {
            name: 'plan set (true = create/update, false = delete)',
            type: 'boolean',
            role: 'switch',
            read: true,
            write: true,
        },
    },
    { id: 'time', common: { name: 'plan target time', type: 'number', role: 'date', read: true, write: true } },
    {
        id: 'soc',
        common: {
            name: 'plan target soc (vehicle assigned)',
            type: 'number',
            role: 'level',
            read: true,
            write: true,
            unit: '%',
            min: 1,
            max: 100,
        },
    },
    {
        id: 'energy',
        common: {
            name: 'plan target energy (no vehicle with soc)',
            type: 'number',
            role: 'level',
            read: true,
            write: true,
            unit: 'kWh',
            min: 0,
        },
    },
];
/** States below `vehicle.<name>` */
exports.VEHICLE_STATES = [
    { id: 'title', common: { name: 'title', type: 'string', role: 'text', read: true, write: false } },
    { id: 'minSoc', common: percentLevel('minSoc', 'level.battery.min') },
    { id: 'limitSoc', common: percentLevel('limitSoc', 'level.battery') },
    { id: 'plan.active', common: { name: 'active', type: 'boolean', role: 'switch', read: true, write: true } },
    { id: 'plan.planSoc', common: { ...percentLevel('planSoc'), min: 1 } },
    // role date with type number (epoch ms) is valid according to the state roles
    { id: 'plan.time', common: { name: 'time', type: 'number', role: 'date', read: true, write: true } },
];
/**
 * Parent objects of a loadpoint.
 *
 * @param index loadpoint index (1-based)
 * @param title loadpoint title from evcc
 * @returns parents, outermost first
 */
function loadpointParents(index, title) {
    const base = `loadpoint.${index}`;
    return [
        { id: 'loadpoint', type: 'folder', name: 'Loadpoints' },
        { id: base, type: 'device', name: title || `Loadpoint ${index}` },
        { id: `${base}.status`, type: 'channel', name: 'Status' },
        { id: `${base}.control`, type: 'channel', name: 'Control' },
        { id: `${base}.control.plan`, type: 'channel', name: 'charging plan' },
    ];
}
/**
 * Parent objects of a vehicle.
 *
 * @param name vehicle name in evcc (e.g. db:6)
 * @param title vehicle title from evcc
 * @returns parents, outermost first
 */
function vehicleParents(name, title) {
    const base = `vehicle.${name}`;
    return [
        { id: 'vehicle', type: 'folder', name: 'Vehicles' },
        { id: base, type: 'device', name: title || name },
        { id: `${base}.plan`, type: 'channel', name: 'charging plan' },
    ];
}
//# sourceMappingURL=objects.js.map