"use strict";
/**
 * Helpers for the evcc charge mode.
 *
 * evcc >= 0.316.0 (https://github.com/evcc-io/evcc/pull/32490) renamed the mode `pv` to `smart`
 * and replaced `minpv` with the separate setting `alwaysCharge` (off | on | once).
 * Older evcc versions still use off | pv | minpv | now and have no `alwaysCharge`.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PvControl = exports.ALWAYS_CHARGE_VALUES = void 0;
exports.hasSmartModeApi = hasSmartModeApi;
exports.isAlwaysChargeValue = isAlwaysChargeValue;
exports.toPvControl = toPvControl;
/** Allowed values for `loadpoint.X.control.alwaysCharge`. */
exports.ALWAYS_CHARGE_VALUES = ['off', 'on', 'once'];
/** Values of `loadpoint.X.control.pvControl`. */
var PvControl;
(function (PvControl) {
    PvControl[PvControl["Off"] = 0] = "Off";
    PvControl[PvControl["Smart"] = 1] = "Smart";
    PvControl[PvControl["SmartAlwaysCharge"] = 2] = "SmartAlwaysCharge";
    PvControl[PvControl["Now"] = 3] = "Now";
})(PvControl || (exports.PvControl = PvControl = {}));
/**
 * Checks whether evcc uses the new mode API (smart + alwaysCharge).
 * Feature detection as recommended in evcc PR #32490: `loadpoints[].alwaysCharge` exists.
 *
 * @param loadpoint loadpoint object from /api/state
 * @returns true for evcc >= 0.316.0
 */
function hasSmartModeApi(loadpoint) {
    return loadpoint?.alwaysCharge !== undefined && loadpoint?.alwaysCharge !== null;
}
/**
 * Checks whether a value is a valid `alwaysCharge` value.
 *
 * @param value value to check
 * @returns true for off | on | once
 */
function isAlwaysChargeValue(value) {
    return typeof value === 'string' && exports.ALWAYS_CHARGE_VALUES.includes(value);
}
/**
 * Maps the evcc mode (+ alwaysCharge) to the numeric `pvControl` value.
 * Works for old (pv/minpv) and new (smart + alwaysCharge) evcc versions.
 *
 * @param mode mode reported by evcc
 * @param alwaysCharge alwaysCharge reported by evcc (undefined on evcc < 0.316.0)
 * @returns pvControl value or null for unknown modes
 */
function toPvControl(mode, alwaysCharge) {
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
//# sourceMappingURL=mode.js.map