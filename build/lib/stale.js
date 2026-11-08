"use strict";
/**
 * Status values that evcc stops reporting (e.g. `fatal` after an error is gone, `chargeRemainingDuration`
 * after charging) would otherwise keep their last value forever. These helpers find such states.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.statusKeyOf = statusKeyOf;
exports.findMissing = findMissing;
const tools_1 = require("./tools");
/**
 * Splits a status state id (relative to the instance) into scope and evcc field.
 *
 * @param id e.g. status.fatal, status.Grid.power, loadpoint.1.status.chargeRemainingDuration
 * @returns scope and field, or null for ids outside the status trees
 */
function statusKeyOf(id) {
    const match = /^(status|loadpoint\.\d+\.status)\.([^.]+)/.exec(id);
    return match ? { scope: match[1], key: match[2] } : null;
}
/**
 * Returns the known status states of a scope whose evcc field is not part of the current response.
 *
 * @param known known status state ids
 * @param scope `status` or `loadpoint.<n>.status`
 * @param presentKeys field names of the current evcc response
 * @returns ids of states evcc does not report anymore
 */
function findMissing(known, scope, presentKeys) {
    const present = new Set();
    for (const key of presentKeys) {
        // dissolved objects and the forecast use a capitalized path segment (e.g. Grid, Forecast)
        present.add(key);
        present.add((0, tools_1.capitalizeFirst)(key));
    }
    const missing = [];
    for (const id of known) {
        const status = statusKeyOf(id);
        if (status?.scope === scope && !present.has(status.key)) {
            missing.push(id);
        }
    }
    return missing;
}
//# sourceMappingURL=stale.js.map