/**
 * Charging plan at loadpoint level (issue #73).
 *
 * evcc knows two kinds of static plans:
 * - soc plan of a vehicle:   POST /api/vehicles/{name}/plan/soc/{soc}/{timestamp}
 * - energy plan of a loadpoint (vehicle without soc / guest): POST /api/loadpoints/{id}/plan/energy/{kWh}/{timestamp}
 * The loadpoint plan states decide which one to use based on the vehicle assigned to the loadpoint.
 * Note: evcc's own `planActive` means "currently charging according to plan", not "a plan is set".
 */

/** Plan of a vehicle as reported in /api/state (vehicles[name].plan) */
export interface VehiclePlan {
    soc: number;
    time: string;
}

/** Loadpoint fields relevant for the plan */
export interface LoadpointPlanFields {
    vehicleName?: string | null;
    planEnergy?: number | null;
    planTime?: string | null;
}

/** Resolved plan of a loadpoint */
export interface LoadpointPlanState {
    /** vehicle: soc plan of the assigned vehicle, energy: energy plan of the loadpoint */
    target: 'vehicle' | 'energy';
    /** vehicle name when target = vehicle */
    vehicleName?: string;
    /** true when a static plan is set in evcc */
    active: boolean;
    /** target soc in % (target = vehicle) */
    soc?: number;
    /** target energy in kWh (target = energy) */
    energy?: number;
    /** plan time in ms since epoch */
    time?: number;
}

/**
 * Determines which plan applies to a loadpoint and reads its current values.
 *
 * @param loadpoint loadpoint from /api/state
 * @param vehicles vehicles from /api/state (vehicles object keyed by name)
 * @returns resolved plan state
 */
export function resolveLoadpointPlan(
    loadpoint: LoadpointPlanFields,
    vehicles: Record<string, { plan?: VehiclePlan | null } | undefined> | null | undefined,
): LoadpointPlanState {
    const vehicleName = typeof loadpoint.vehicleName === 'string' ? loadpoint.vehicleName : '';
    const vehicle = vehicleName !== '' ? vehicles?.[vehicleName] : undefined;

    if (vehicle) {
        const plan = vehicle.plan ?? undefined;
        const time = plan?.time ? Date.parse(plan.time) : NaN;
        return {
            target: 'vehicle',
            vehicleName,
            active: plan !== undefined,
            soc: plan?.soc,
            time: Number.isNaN(time) ? undefined : time,
        };
    }

    const time = loadpoint.planTime ? Date.parse(loadpoint.planTime) : NaN;
    const energy = typeof loadpoint.planEnergy === 'number' ? loadpoint.planEnergy : 0;
    const active = !Number.isNaN(time) && energy > 0;
    return {
        target: 'energy',
        active,
        energy: active ? energy : undefined,
        time: active ? time : undefined,
    };
}

/**
 * Returns a valid plan time: the given time if it is in the future, otherwise now + 24 h.
 *
 * @param time time in ms since epoch (may be 0/NaN)
 * @param now current time in ms (for tests)
 * @returns plan time
 */
export function planTimeOrDefault(time: number, now = Date.now()): Date {
    return Number.isFinite(time) && time > now ? new Date(time) : new Date(now + 24 * 3600 * 1000);
}
