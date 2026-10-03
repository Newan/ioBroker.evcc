//Funktionen zum sterun von evcc
import axios from 'axios';
import type { EvccAlwaysCharge, EvccMode } from './mode';

export class SendEvcc {
    private readonly ip: string;
    private readonly timeout: number;
    private readonly log: {
        log: (text: string) => void;
        silly: (text: string) => void;
        debug: (text: string) => void;
        info: (text: string) => void;
        warn: (text: string) => void;
        error: (text: string) => void;
    };

    constructor(ip: string, timeout : number, log?: ioBroker.Logger) {
        this.ip = ip;
        this.timeout = timeout;

        this.log = {
            silly: text => {
                if (log) {
                    log.silly(text);
                    return;
                }
                console.log(text);
            },
            debug: text => {
                if (log) {
                    log.debug(text);
                    return;
                }
                console.log(text);
            },
            info: text => {
                if (log) {
                    log.info(text);
                    return;
                }
                console.log(text);
            },
            log: text => {
                if (log) {
                    log.info(text);
                    return;
                }
                console.log(text);
            },
            warn: text => {
                if (log) {
                    log.warn(text);
                    return;
                }
                console.warn(text);
            },
            error: text => {
                if (log) {
                    log.error(text);
                    return;
                }
                console.error(text);
            },
        };

    }

    /**
     * Sets the charge mode of a loadpoint.
     * Accepts old (pv, minpv) and new (smart) values; evcc >= 0.316.0 translates old values itself.
     *
     * @param index loadpoint index (starts with 1)
     * @param mode charge mode
     * @returns resolves true on success, false on error (error is logged)
     */
    async setEvccMode(index: string, mode: EvccMode): Promise<boolean> {
        const url = `http://${this.ip}/api/loadpoints/${index}/mode/${mode}`;
        this.log.debug(`call: ${url}`);
        try {
            await axios.post(url, null, { timeout: this.timeout });
            this.log.info('Evcc update successful');
            return true;
        } catch (error: any) {
            this.log.error(`setEvccMode (${mode}) failed: ${error.message}`);
            return false;
        }
    }

    /**
     * Sets `alwaysCharge` of a loadpoint (evcc >= 0.316.0).
     *
     * @param index loadpoint index (starts with 1)
     * @param value off | on | once
     * @returns resolves true on success, false on error (error is logged)
     */
    async setEvccAlwaysCharge(index: string, value: EvccAlwaysCharge): Promise<boolean> {
        const url = `http://${this.ip}/api/loadpoints/${index}/alwayscharge/${value}`;
        this.log.debug(`call: ${url}`);
        try {
            await axios.post(url, null, { timeout: this.timeout });
            this.log.info('Evcc update successful');
            return true;
        } catch (error: any) {
            this.log.error(`setEvccAlwaysCharge (${value}) failed: ${error.message}`);
            return false;
        }
    }

    setEvccMinCurrent(index: string, value: ioBroker.StateValue): void {
        this.log.debug(`call: ` + `http://${this.ip}/api/loadpoints/${index}/mincurrent/${value}`);
        axios
            .post(`http://${this.ip}/api/loadpoints/${index}/mincurrent/${value}`, null, { timeout: this.timeout })
            .then(() => {
                this.log.info('Evcc update successful');
            })
            .catch(error => {
                this.log.error(`7 ${error.message}`);
            });
    }

    setEvccMaxCurrent(index: string, value: ioBroker.StateValue): void {
        this.log.debug(`call: ` + `http://${this.ip}/api/loadpoints/${index}/maxcurrent/${value}`);
        axios
            .post(`http://${this.ip}/api/loadpoints/${index}/maxcurrent/${value}`, null, { timeout: this.timeout })
            .then(() => {
                this.log.info('Evcc update successful');
            })
            .catch(error => {
                this.log.error(`8 ${error.message}`);
            });
    }

    setEvccPhases(index: string, value: ioBroker.StateValue): void {
        this.log.debug(`call: ` + `http://${this.ip}/api/loadpoints/${index}/phases/${value}`);
        axios
            .post(`http://${this.ip}/api/loadpoints/${index}/phases/${value}`, null, { timeout: this.timeout })
            .then(() => {
                this.log.info('Evcc update successful');
            })
            .catch(error => {
                this.log.error(`9 ${error.message}`);
            });
    }

    setEvccDisableThreshold(index: string, value: ioBroker.StateValue): void {
        this.log.debug(`call: ` + `http://${this.ip}/api/loadpoints/${index}/disable/threshold/${value}`);
        axios
            .post(`http://${this.ip}/api/loadpoints/${index}/disable/threshold/${value}`, null, {
                timeout: this.timeout,
            })
            .then(() => {
                this.log.info('Evcc update successful');
            })
            .catch(error => {
                this.log.error(`10 ${error.message}`);
            });
    }

    setEvccEnableThreshold(index: string, value: ioBroker.StateValue): void {
        this.log.debug(`call: ` + `http://${this.ip}/api/loadpoints/${index}/enable/threshold/${value}`);
        axios
            .post(`http://${this.ip}/api/loadpoints/${index}/enable/threshold/${value}`, null, {
                timeout: this.timeout,
            })
            .then(() => {
                this.log.info('Evcc update successful');
            })
            .catch(error => {
                this.log.error(`11 ${error.message}`);
            });
    }

    setEvccLimitSoc(index: string, value: ioBroker.StateValue): void {
        this.log.debug(`call: ` + `http://${this.ip}/api/loadpoints/${index}/limitsoc/${value}`);
        axios
            .post(`http://${this.ip}/api/loadpoints/${index}/limitsoc/${value}`, null, { timeout: this.timeout })
            .then(() => {
                this.log.info('Evcc update successful');
            })
            .catch(error => {
                this.log.error(`12 ${error.message}`);
            });
    }

    setEvccVehicle(index: string, value: ioBroker.StateValue): void {
        //Wenn der String leer ist, wird es das GAstauto und wir müssen löschen
        if (value == '') {
            this.log.debug(`call: ` + `http://${this.ip}/api/loadpoints/${index}/vehicle`);
            axios
                .delete(`http://${this.ip}/api/loadpoints/${index}/vehicle`, { timeout: this.timeout })
                .then(() => {
                    this.log.info('Evcc update successful');
                })
                .catch(error => {
                    this.log.error(`setEvccVehicle: ${error.message}`);
                });
        } else {
            this.log.debug(`call: ` + `http://${this.ip}/api/loadpoints/${index}/vehicle/${value}`);
            axios
                .post(`http://${this.ip}/api/loadpoints/${index}/vehicle/${value}`, null, { timeout: this.timeout })
                .then(() => {
                    this.log.info('Evcc update successful');
                })
                .catch(error => {
                    this.log.error(`setEvccVehicle: ${error.message}`);
                });
        }
    }

    setEvccBufferSoc(bufferSoc: number): void {
        this.log.debug(`call: ` + `http://${this.ip}/api/buffersoc/${bufferSoc}`);
        axios
            .post(`http://${this.ip}/api/buffersoc/${bufferSoc}`, null, { timeout: this.timeout })
            .then(() => {
                this.log.info('Evcc update successful');
            })
            .catch(error => {
                this.log.error(`setEvccBufferSoc ${error.message}`);
            });
    }

    setEvccBufferStartSoc(bufferStartSoc: number): void {
        this.log.debug(`call: ` + `http://${this.ip}/api/bufferstartsoc/${bufferStartSoc}`);
        axios
            .post(`http://${this.ip}/api/bufferstartsoc/${bufferStartSoc}`, null, { timeout: this.timeout })
            .then(() => {
                this.log.info('Evcc update successful');
            })
            .catch(error => {
                this.log.error(`setEvccBufferStartSoc ${error.message}`);
            });
    }

    setEvccPrioritySoc(prioritySoc: number): void {
        this.log.debug(`call: ` + `http://${this.ip}/api/prioritysoc/${prioritySoc}`);
        axios
            .post(`http://${this.ip}/api/prioritysoc/${prioritySoc}`, null, { timeout: this.timeout })
            .then(() => {
                this.log.info('Evcc update successful');
            })
            .catch(error => {
                this.log.error(`setEvccBufferStartSoc ${error.message}`);
            });
    }
    setVehicleMinSoc(vehicleID: string, minSoc: number): void {
        this.log.debug(`call: ` + `http://${this.ip}/api/vehicles/${vehicleID}/minsoc/${minSoc}`);
        axios
            .post(`http://${this.ip}/api/vehicles/${vehicleID}/minsoc/${minSoc}`, null, { timeout: this.timeout })
            .then(() => {
                this.log.info('Evcc update successful');
            })
            .catch(error => {
                this.log.error(`14 ${error.message}`);
            });
    }

    setVehicleLimitSoc(vehicleID: string, minSoc: number): void {
        this.log.debug(`call: ` + `http://${this.ip}/api/vehicles/${vehicleID}/limitsoc/${minSoc}`);
        axios
            .post(`http://${this.ip}/api/vehicles/${vehicleID}/limitsoc/${minSoc}`, null, { timeout: this.timeout })
            .then(() => {
                this.log.info('Evcc update successful');
            })
            .catch(error => {
                this.log.error(`15 ${error.message}`);
            });
    }

    /**
     * Sends a request to evcc and logs the result.
     *
     * @param method POST or DELETE
     * @param path API path below /api/
     * @param label name for log messages
     * @returns resolves true on success, false on error (error is logged)
     */
    private async request(method: 'post' | 'delete', path: string, label: string): Promise<boolean> {
        const url = `http://${this.ip}/api/${path}`;
        this.log.debug(`call ${method.toUpperCase()}: ${url}`);
        try {
            await axios.request({ method, url, timeout: this.timeout });
            this.log.info('Evcc update successful');
            return true;
        } catch (error: any) {
            this.log.error(`${label} failed: ${error.message}`);
            return false;
        }
    }

    /**
     * Sets or removes a limit: 0 removes it (DELETE), any other number (also negative) sets it (POST).
     *
     * @param path API path below /api/ without value
     * @param value limit value
     * @param label name for log messages
     * @returns resolves true on success
     */
    private async setOrDeleteLimit(path: string, value: ioBroker.StateValue, label: string): Promise<boolean> {
        const numericValue = Number(value);
        if (value === null || value === '' || !Number.isFinite(numericValue)) {
            this.log.warn(`${label}: invalid value "${String(value)}"`);
            return false;
        }
        if (numericValue === 0) {
            return this.request('delete', path, label);
        }
        return this.request('post', `${path}/${numericValue}`, label);
    }

    /**
     * Sets the smart cost limit of a loadpoint, 0 removes it.
     *
     * @param index loadpoint index (starts with 1)
     * @param value limit in currency/kWh, 0 = remove
     * @returns resolves true on success
     */
    setEvccsmartCostLimitLoadpoint(index: string, value: ioBroker.StateValue): Promise<boolean> {
        return this.setOrDeleteLimit(`loadpoints/${index}/smartcostlimit`, value, 'setEvccsmartCostLimitLoadpoint');
    }

    /**
     * Sets the smart cost limit for all loadpoints, 0 removes it.
     *
     * @param value limit in currency/kWh, 0 = remove
     * @returns resolves true on success
     */
    setEvccsmartCostLimit(value: ioBroker.StateValue): Promise<boolean> {
        return this.setOrDeleteLimit('smartcostlimit', value, 'setEvccsmartCostLimit');
    }

    /**
     * Sets the battery grid charge limit, 0 removes it.
     *
     * @param value limit in currency/kWh, 0 = remove
     * @returns resolves true on success
     */
    setEvccBatteryGridChargeLimit(value: ioBroker.StateValue): Promise<boolean> {
        return this.setOrDeleteLimit('batterygridchargelimit', value, 'setEvccBatteryGridChargeLimit');
    }

    /**
     * Creates or replaces the soc charging plan of a vehicle.
     *
     * @param vehicleID vehicle name as used by evcc (e.g. db:6)
     * @param soc target soc in %
     * @param time target time
     * @returns resolves true on success
     */
    setVehiclePlan(vehicleID: string, soc: number, time: Date): Promise<boolean> {
        return this.request('post', `vehicles/${vehicleID}/plan/soc/${soc}/${time.toISOString()}`, 'setVehiclePlan');
    }

    /**
     * Deletes the soc charging plan of a vehicle.
     *
     * @param vehicleID vehicle name as used by evcc (e.g. db:6)
     * @returns resolves true on success
     */
    deleteVehiclePlan(vehicleID: string): Promise<boolean> {
        return this.request('delete', `vehicles/${vehicleID}/plan/soc`, 'deleteVehiclePlan');
    }
}
