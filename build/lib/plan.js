"use strict";
/**
 * Charging plan at loadpoint level (issue #73).
 *
 * evcc knows two kinds of static plans:
 * - soc plan of a vehicle:   POST /api/vehicles/{name}/plan/soc/{soc}/{timestamp}
 * - energy plan of a loadpoint (vehicle without soc / guest): POST /api/loadpoints/{id}/plan/energy/{kWh}/{timestamp}
 * The loadpoint plan states decide which one to use based on the vehicle assigned to the loadpoint.
 * Note: evcc's own `planActive` means "currently charging according to plan", not "a plan is set".
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveLoadpointPlan = resolveLoadpointPlan;
exports.planTimeOrDefault = planTimeOrDefault;
/**
 * Determines which plan applies to a loadpoint and reads its current values.
 *
 * @param loadpoint loadpoint from /api/state
 * @param vehicles vehicles from /api/state (vehicles object keyed by name)
 * @returns resolved plan state
 */
function resolveLoadpointPlan(loadpoint, vehicles) {
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
function planTimeOrDefault(time, now = Date.now()) {
    return Number.isFinite(time) && time > now ? new Date(time) : new Date(now + 24 * 3600 * 1000);
}
//# sourceMappingURL=plan.js.map