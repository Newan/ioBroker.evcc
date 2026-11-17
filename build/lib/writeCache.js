"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WriteCache = void 0;
/**
 * Remembers the last value the adapter wrote per state, so unchanged values are not written again.
 * With the live connection evcc data arrives every few seconds; writing all ~400 states each time
 * would put needless load on the ioBroker databases.
 */
class WriteCache {
    values = new Map();
    /**
     * Checks whether a value differs from the last written one and remembers it.
     *
     * @param id state id
     * @param val value to write
     * @returns true if the value has to be written
     */
    update(id, val) {
        const key = JSON.stringify(val ?? null);
        if (this.values.get(id) === key) {
            return false;
        }
        this.values.set(id, key);
        return true;
    }
    /**
     * Checks whether a value equals the last written one, without remembering anything.
     *
     * @param id state id
     * @param val value to compare
     * @returns true if the adapter wrote exactly this value last
     */
    matches(id, val) {
        return this.values.get(id) === JSON.stringify(val ?? null);
    }
    /**
     * Forgets a state (value was changed by someone else or writing failed), so it is written next time.
     *
     * @param id state id
     */
    forget(id) {
        this.values.delete(id);
    }
    /**
     * Forgets all states below a path, e.g. after deleting a loadpoint.
     *
     * @param prefix e.g. loadpoint.3
     */
    forgetBelow(prefix) {
        for (const id of [...this.values.keys()]) {
            if (id === prefix || id.startsWith(`${prefix}.`)) {
                this.values.delete(id);
            }
        }
    }
}
exports.WriteCache = WriteCache;
//# sourceMappingURL=writeCache.js.map