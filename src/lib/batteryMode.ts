/**
 * External home battery mode (evcc REST API: POST /api/batterymode/{mode}, DELETE /api/batterymode).
 *
 * According to the evcc API documentation the external mode overrules evcc's own battery control and is
 * reset by evcc after 60 s, so the external system has to repeat the request regularly. The adapter does
 * this as long as `control.batteryMode` is not `off`.
 */

/** Value of `control.batteryMode`: off = evcc controls the battery itself */
export type BatteryModeRequest = 'off' | 'normal' | 'hold' | 'charge' | 'holdcharge' | 'discharge';

/** Labels of the allowed values (common.states) */
export const BATTERY_MODE_STATES: Readonly<Record<BatteryModeRequest, string>> = {
    off: 'off (evcc controls the battery)',
    normal: 'normal',
    hold: 'hold (no discharging)',
    charge: 'charge from grid',
    holdcharge: 'hold charge (no charging)',
    discharge: 'discharge to grid',
};

/** Repeat interval, well below evcc's reset after 60 s */
export const BATTERY_MODE_REFRESH_MS = 30_000;

/**
 * Checks a value written to `control.batteryMode`.
 *
 * @param value written value
 * @returns true for one of the allowed modes
 */
export function isBatteryModeRequest(value: unknown): value is BatteryModeRequest {
    return typeof value === 'string' && Object.prototype.hasOwnProperty.call(BATTERY_MODE_STATES, value);
}

/** evcc's BatteryMode enum in order (the API answers with the numeric value) */
const EVCC_BATTERY_MODES = ['unknown', 'normal', 'hold', 'charge', 'holdcharge', 'discharge'] as const;

/**
 * Reads the external battery mode from an evcc response.
 * evcc answers with the numeric enum value (e.g. 1 = normal), older versions possibly wrapped in `{ result }`.
 *
 * @param data response body
 * @returns mode name, or '' if evcc reports no external mode (e.g. no controllable battery)
 */
export function externalModeFromResponse(data: unknown): string {
    const value = data !== null && typeof data === 'object' && 'result' in data ? (data).result : data;
    const mode = typeof value === 'number' ? EVCC_BATTERY_MODES[value] : value;
    return typeof mode === 'string' && mode !== 'unknown' ? mode : '';
}
