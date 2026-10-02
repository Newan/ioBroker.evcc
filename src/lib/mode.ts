/**
 * Helpers for the evcc charge mode.
 *
 * evcc >= 0.316.0 (https://github.com/evcc-io/evcc/pull/32490) renamed the mode `pv` to `smart`
 * and replaced `minpv` with the separate setting `alwaysCharge` (off | on | once).
 * Older evcc versions still use off | pv | minpv | now and have no `alwaysCharge`.
 */

/** Charge modes reported by evcc (old and new API). */
export type EvccMode = 'off' | 'pv' | 'minpv' | 'now' | 'smart';

/** Values of the loadpoint setting `alwaysCharge` (evcc >= 0.316.0). */
export type EvccAlwaysCharge = 'off' | 'on' | 'once';

/** Allowed values for `loadpoint.X.control.alwaysCharge`. */
export const ALWAYS_CHARGE_VALUES: readonly EvccAlwaysCharge[] = ['off', 'on', 'once'];

/** Values of `loadpoint.X.control.pvControl`. */
export enum PvControl {
    Off = 0,
    Smart = 1,
    SmartAlwaysCharge = 2,
    Now = 3,
}

/**
 * Checks whether evcc uses the new mode API (smart + alwaysCharge).
 * Feature detection as recommended in evcc PR #32490: `loadpoints[].alwaysCharge` exists.
 *
 * @param loadpoint loadpoint object from /api/state
 * @returns true for evcc >= 0.316.0
 */
export function hasSmartModeApi(loadpoint: { alwaysCharge?: unknown } | null | undefined): boolean {
    return loadpoint?.alwaysCharge !== undefined && loadpoint?.alwaysCharge !== null;
}

/**
 * Checks whether a value is a valid `alwaysCharge` value.
 *
 * @param value value to check
 * @returns true for off | on | once
 */
export function isAlwaysChargeValue(value: unknown): value is EvccAlwaysCharge {
    return typeof value === 'string' && (ALWAYS_CHARGE_VALUES as readonly string[]).includes(value);
}

/**
 * Maps the evcc mode (+ alwaysCharge) to the numeric `pvControl` value.
 * Works for old (pv/minpv) and new (smart + alwaysCharge) evcc versions.
 *
 * @param mode mode reported by evcc
 * @param alwaysCharge alwaysCharge reported by evcc (undefined on evcc < 0.316.0)
 * @returns pvControl value or null for unknown modes
 */
export function toPvControl(mode: unknown, alwaysCharge?: unknown): PvControl | null {
    switch (mode) {
        case 'off':
            return PvControl.Off;
        case 'now':
            return PvControl.Now;
        case 'minpv':
            return PvControl.SmartAlwaysCharge;
        case 'pv':
            return PvControl.Smart;
        case 'smart':
            // "once" is still "always charge" for the current session
            return alwaysCharge === 'on' || alwaysCharge === 'once' ? PvControl.SmartAlwaysCharge : PvControl.Smart;
        default:
            return null;
    }
}
