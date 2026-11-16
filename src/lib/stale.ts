/**
 * Status values that evcc stops reporting (e.g. `fatal` after an error is gone, `chargeRemainingDuration`
 * after charging) would otherwise keep their last value forever. These helpers find such states.
 */

import { capitalizeFirst } from './tools';

/** Scope and evcc field of a status state id */
export interface StatusKey {
    /** `status` or `loadpoint.<n>.status` */
    scope: string;
    /** evcc field (first path segment below the scope) */
    key: string;
}

/**
 * Splits a status state id (relative to the instance) into scope and evcc field.
 *
 * @param id e.g. status.fatal, status.Grid.power, loadpoint.1.status.chargeRemainingDuration
 * @returns scope and field, or null for ids outside the status trees
 */
export function statusKeyOf(id: string): StatusKey | null {
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
export function findMissing(known: Iterable<string>, scope: string, presentKeys: Iterable<string>): string[] {
    const present = new Set<string>();
    for (const key of presentKeys) {
        // dissolved objects and the forecast use a capitalized path segment (e.g. Grid, Forecast)
        present.add(key);
        present.add(capitalizeFirst(key));
    }
    const missing: string[] = [];
    for (const id of known) {
        const status = statusKeyOf(id);
        if (status?.scope === scope && !present.has(status.key)) {
            missing.push(id);
        }
    }
    return missing;
}
