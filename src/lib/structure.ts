/**
 * Keeps the object tree in line with the evcc configuration: loadpoints and vehicles that were removed
 * in evcc are found here so their objects can be deleted.
 */

/** Loadpoints and vehicles that exist in ioBroker but not in evcc anymore */
export interface ObsoleteObjects {
    /** loadpoint indexes (1-based) */
    loadpoints: number[];
    /** vehicle names as used in the object ids (e.g. db:6) */
    vehicles: string[];
}

/**
 * Finds loadpoints and vehicles of the instance that evcc does not report anymore.
 * Nothing is reported for a list evcc sends empty, so a short-lived empty answer never deletes everything.
 *
 * @param ids object ids relative to the instance
 * @param loadpointCount number of loadpoints evcc reports
 * @param vehicleNames vehicle names evcc reports
 * @returns obsolete loadpoints and vehicles
 */
export function findObsolete(ids: Iterable<string>, loadpointCount: number, vehicleNames: string[]): ObsoleteObjects {
    const loadpoints = new Set<number>();
    const vehicles = new Set<string>();
    const known = new Set(vehicleNames);
    for (const id of ids) {
        const lp = /^loadpoint\.(\d+)(\.|$)/.exec(id);
        if (lp && loadpointCount > 0 && Number(lp[1]) > loadpointCount) {
            loadpoints.add(Number(lp[1]));
            continue;
        }
        const vehicle = /^vehicle\.([^.]+)(\.|$)/.exec(id);
        if (vehicle && known.size > 0 && !known.has(vehicle[1])) {
            vehicles.add(vehicle[1]);
        }
    }
    return { loadpoints: [...loadpoints].sort((a, b) => a - b), vehicles: [...vehicles].sort() };
}
