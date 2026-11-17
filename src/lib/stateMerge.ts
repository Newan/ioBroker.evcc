/**
 * Builds the evcc state from WebSocket messages.
 *
 * evcc sends the complete state when the connection opens and afterwards only the changed fields
 * (https://docs.evcc.io/en/reference/state). Loadpoint fields use keys like `loadpoints.0.chargePower`,
 * large values (e.g. the forecast) are split into keys like `forecast.solar`.
 */

/** evcc state in the same shape as GET /api/state */
export type EvccState = Record<string, any>;

/**
 * Sets a value at a dotted path, creating objects on the way.
 *
 * @param target object to change
 * @param parts path segments
 * @param value value to set
 */
function setPath(target: Record<string, any>, parts: string[], value: unknown): void {
    let node = target;
    for (const part of parts.slice(0, -1)) {
        if (node[part] === null || typeof node[part] !== 'object') {
            node[part] = {};
        }
        node = node[part];
    }
    node[parts[parts.length - 1]] = value;
}

/**
 * Applies a WebSocket message (complete state or changed fields) to the local copy of the state.
 *
 * @param state local copy of the evcc state, changed in place
 * @param message parsed WebSocket message
 */
export function applyDelta(state: EvccState, message: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(message)) {
        const loadpoint = /^loadpoints\.(\d+)\.(.+)$/.exec(key);
        if (loadpoint) {
            const index = Number(loadpoint[1]);
            if (!Array.isArray(state.loadpoints)) {
                state.loadpoints = [];
            }
            // no gaps: the adapter walks the array in order
            for (let i = 0; i <= index; i++) {
                state.loadpoints[i] ??= {};
            }
            setPath(state.loadpoints[index], loadpoint[2].split('.'), value);
            continue;
        }
        setPath(state, key.split('.'), value);
    }
}
