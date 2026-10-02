"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SendEvcc = void 0;
//Funktionen zum sterun von evcc
const axios_1 = __importDefault(require("axios"));
class SendEvcc {
    ip;
    timeout;
    log;
    constructor(ip, timeout, log) {
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
    async setEvccMode(index, mode) {
        const url = `http://${this.ip}/api/loadpoints/${index}/mode/${mode}`;
        this.log.debug(`call: ${url}`);
        try {
            await axios_1.default.post(url, null, { timeout: this.timeout });
            this.log.info('Evcc update successful');
            return true;
        }
        catch (error) {
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
    async setEvccAlwaysCharge(index, value) {
        const url = `http://${this.ip}/api/loadpoints/${index}/alwayscharge/${value}`;
        this.log.debug(`call: ${url}`);
        try {
            await axios_1.default.post(url, null, { timeout: this.timeout });
            this.log.info('Evcc update successful');
            return true;
        }
        catch (error) {
            this.log.error(`setEvccAlwaysCharge (${value}) failed: ${error.message}`);
            return false;
        }
    }
    setEvccMinCurrent(index, value) {
        this.log.debug(`call: ` + `http://${this.ip}/api/loadpoints/${index}/mincurrent/${value}`);
        axios_1.default
            .post(`http://${this.ip}/api/loadpoints/${index}/mincurrent/${value}`, null, { timeout: this.timeout })
            .then(() => {
            this.log.info('Evcc update successful');
        })
            .catch(error => {
            this.log.error(`7 ${error.message}`);
        });
    }
    setEvccMaxCurrent(index, value) {
        this.log.debug(`call: ` + `http://${this.ip}/api/loadpoints/${index}/maxcurrent/${value}`);
        axios_1.default
            .post(`http://${this.ip}/api/loadpoints/${index}/maxcurrent/${value}`, null, { timeout: this.timeout })
            .then(() => {
            this.log.info('Evcc update successful');
        })
            .catch(error => {
            this.log.error(`8 ${error.message}`);
        });
    }
    setEvccPhases(index, value) {
        this.log.debug(`call: ` + `http://${this.ip}/api/loadpoints/${index}/phases/${value}`);
        axios_1.default
            .post(`http://${this.ip}/api/loadpoints/${index}/phases/${value}`, null, { timeout: this.timeout })
            .then(() => {
            this.log.info('Evcc update successful');
        })
            .catch(error => {
            this.log.error(`9 ${error.message}`);
        });
    }
    setEvccDisableThreshold(index, value) {
        this.log.debug(`call: ` + `http://${this.ip}/api/loadpoints/${index}/disable/threshold/${value}`);
        axios_1.default
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
    setEvccEnableThreshold(index, value) {
        this.log.debug(`call: ` + `http://${this.ip}/api/loadpoints/${index}/enable/threshold/${value}`);
        axios_1.default
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
    setEvccLimitSoc(index, value) {
        this.log.debug(`call: ` + `http://${this.ip}/api/loadpoints/${index}/limitsoc/${value}`);
        axios_1.default
            .post(`http://${this.ip}/api/loadpoints/${index}/limitsoc/${value}`, null, { timeout: this.timeout })
            .then(() => {
            this.log.info('Evcc update successful');
        })
            .catch(error => {
            this.log.error(`12 ${error.message}`);
        });
    }
    setEvccsmartCostLimitLoadpoint(index, value) {
        const numericValue = Number(value);
        let callUrl = `http://${this.ip}/api/loadpoints/${index}/smartcostlimit`;
        // Nur Wert anhängen, wenn > 0
        if (numericValue > 0) {
            callUrl += `/${numericValue}`;
        }
        this.log.debug(`call setEvccsmartCostLimitLoadpoint: ${callUrl}`);
        axios_1.default.post(callUrl, null, { timeout: this.timeout })
            .then(() => {
            this.log.info('Evcc update successful');
        })
            .catch(error => {
            this.log.error(`setEvccsmartCostLimitLoadpoint failed: ${error.message}`);
        });
    }
    setEvccsmartCostLimit(value) {
        const numericValue = Number(value);
        let callUrl = `http://${this.ip}/api/smartcostlimit`;
        // Nur Wert anhängen, wenn > 0
        if (numericValue > 0) {
            callUrl += `/${numericValue}`;
        }
        this.log.debug(`call setEvccsmartCostLimit: ${callUrl}`);
        axios_1.default.post(callUrl, null, { timeout: this.timeout })
            .then(() => {
            this.log.info('Evcc update successful');
        })
            .catch(error => {
            this.log.error(`setEvccsmartCostLimit failed: ${error.message}`);
        });
    }
    setEvccVehicle(index, value) {
        //Wenn der String leer ist, wird es das GAstauto und wir müssen löschen
        if (value == '') {
            this.log.debug(`call: ` + `http://${this.ip}/api/loadpoints/${index}/vehicle`);
            axios_1.default
                .delete(`http://${this.ip}/api/loadpoints/${index}/vehicle`, { timeout: this.timeout })
                .then(() => {
                this.log.info('Evcc update successful');
            })
                .catch(error => {
                this.log.error(`setEvccVehicle: ${error.message}`);
            });
        }
        else {
            this.log.debug(`call: ` + `http://${this.ip}/api/loadpoints/${index}/vehicle/${value}`);
            axios_1.default
                .post(`http://${this.ip}/api/loadpoints/${index}/vehicle/${value}`, null, { timeout: this.timeout })
                .then(() => {
                this.log.info('Evcc update successful');
            })
                .catch(error => {
                this.log.error(`setEvccVehicle: ${error.message}`);
            });
        }
    }
    setEvccBufferSoc(bufferSoc) {
        this.log.debug(`call: ` + `http://${this.ip}/api/buffersoc/${bufferSoc}`);
        axios_1.default
            .post(`http://${this.ip}/api/buffersoc/${bufferSoc}`, null, { timeout: this.timeout })
            .then(() => {
            this.log.info('Evcc update successful');
        })
            .catch(error => {
            this.log.error(`setEvccBufferSoc ${error.message}`);
        });
    }
    setEvccBufferStartSoc(bufferStartSoc) {
        this.log.debug(`call: ` + `http://${this.ip}/api/bufferstartsoc/${bufferStartSoc}`);
        axios_1.default
            .post(`http://${this.ip}/api/bufferstartsoc/${bufferStartSoc}`, null, { timeout: this.timeout })
            .then(() => {
            this.log.info('Evcc update successful');
        })
            .catch(error => {
            this.log.error(`setEvccBufferStartSoc ${error.message}`);
        });
    }
    setEvccPrioritySoc(prioritySoc) {
        this.log.debug(`call: ` + `http://${this.ip}/api/prioritysoc/${prioritySoc}`);
        axios_1.default
            .post(`http://${this.ip}/api/prioritysoc/${prioritySoc}`, null, { timeout: this.timeout })
            .then(() => {
            this.log.info('Evcc update successful');
        })
            .catch(error => {
            this.log.error(`setEvccBufferStartSoc ${error.message}`);
        });
    }
    setVehicleMinSoc(vehicleID, minSoc) {
        this.log.debug(`call: ` + `http://${this.ip}/api/vehicles/${vehicleID}/minsoc/${minSoc}`);
        axios_1.default
            .post(`http://${this.ip}/api/vehicles/${vehicleID}/minsoc/${minSoc}`, null, { timeout: this.timeout })
            .then(() => {
            this.log.info('Evcc update successful');
        })
            .catch(error => {
            this.log.error(`14 ${error.message}`);
        });
    }
    setVehicleLimitSoc(vehicleID, minSoc) {
        this.log.debug(`call: ` + `http://${this.ip}/api/vehicles/${vehicleID}/limitsoc/${minSoc}`);
        axios_1.default
            .post(`http://${this.ip}/api/vehicles/${vehicleID}/limitsoc/${minSoc}`, null, { timeout: this.timeout })
            .then(() => {
            this.log.info('Evcc update successful');
        })
            .catch(error => {
            this.log.error(`15 ${error.message}`);
        });
    }
    setVehiclePlan(vehicleID, active) {
        if (active) {
            const currentDate = new Date();
            // Add one day to the current date
            currentDate.setDate(currentDate.getDate() + 1);
            // Convert to ISO 8601 / RFC 3339 format
            const rfc3339Date = currentDate.toISOString();
            //Aktvierungsregel:
            // wenn aktive false => soc = 0% + time = 0
            // wenn aktive true => soc = 100% + time = nextday, same time
            // wenn soc > 0 => active = true + time = nextday, same time
            // wenn soc < 0 => active = false
            this.log.debug(`call: ` + `http://${this.ip}/api/vehicles/${vehicleID}/plan/soc/100/${rfc3339Date}`);
            axios_1.default
                .post(`http://${this.ip}/api/vehicles/${vehicleID}/plan/soc/100/${rfc3339Date}`, null, {
                timeout: this.timeout,
            })
                .then(() => {
                this.log.info(`Activate plan for verhicle: ${vehicleID}`);
            })
                .catch(error => {
                this.log.error(`Error active plan: ${error.message}`);
            });
        }
        else {
            this.log.debug(`call: ` + `http://${this.ip}/api/vehicles/${vehicleID}/plan/soc`);
            axios_1.default
                .delete(`http://${this.ip}/api/vehicles/${vehicleID}/plan/soc`, { timeout: this.timeout })
                .then(() => {
                this.log.info(`Deactivate plan for verhicle: ${vehicleID}`);
            })
                .catch(error => {
                this.log.error(`Error deactive plan: ${error.message}`);
            });
        }
    }
    setEvccTargetSoc(index, value) {
        this.log.debug(`call: ` + `http://${this.ip}/api/loadpoints/${index}/target/soc/${value}`);
        axios_1.default
            .post(`http://${this.ip}/api/loadpoints/${index}/target/soc/${value}`, null, { timeout: this.timeout })
            .then(() => {
            this.log.info('Evcc update successful');
        })
            .catch(error => {
            this.log.error(`5 ${error.message}`);
        });
    }
    setEvccMinSoc(index, value) {
        this.log.debug(`call: ` + `http://${this.ip}/api/loadpoints/${index}/minsoc/${value}`);
        axios_1.default
            .post(`http://${this.ip}/api/loadpoints/${index}/minsoc/${value}`, null, { timeout: this.timeout })
            .then(() => {
            this.log.info('Evcc update successful');
        })
            .catch(error => {
            this.log.error(`6 ${error.message}`);
        });
    }
    setEvccSetTargetTime(index, value) {
        this.log.debug(`call: ` + `http://${this.ip}/api/loadpoints/${index}/target/time/${value}`);
        axios_1.default
            .post(`http://${this.ip}/api/loadpoints/${index}/target/time/${value}`, null, { timeout: this.timeout })
            .then(() => {
            this.log.info('Evcc update successful');
        })
            .catch(error => {
            this.log.error(`12 ${error.message}`);
        });
    }
    setEvccDeleteTargetTime(index) {
        this.log.debug(`call: ` + `http://${this.ip}/api/loadpoints/${index}/target/time`);
        axios_1.default
            .delete(`http://${this.ip}/api/loadpoints/${index}/target/time`, { timeout: this.timeout })
            .then(() => {
            this.log.info('Evcc update successful');
        })
            .catch(error => {
            this.log.error(`13 ${error.message}`);
        });
    }
    setEvccBatteryGridChargeLimit(value) {
        const numericValue = Number(value);
        let callUrl = `http://${this.ip}/api/batterygridchargelimit`;
        // Nur Wert anhängen, wenn > 0
        if (numericValue > 0) {
            callUrl += `/${numericValue}`;
        }
        this.log.debug(`call setEvccBatteryGridChargeLimit: ${callUrl}`);
        axios_1.default.post(callUrl, null, { timeout: this.timeout })
            .then(() => {
            this.log.info('Evcc update successful');
        })
            .catch(error => {
            this.log.error(`setEvccBatteryGridChargeLimit failed: ${error.message}`);
        });
    }
}
exports.SendEvcc = SendEvcc;
//# sourceMappingURL=sendEvcc.js.map