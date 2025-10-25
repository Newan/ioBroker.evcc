    //Funktionen zum sterun von evcc
import axios from 'axios';

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
            silly: text => console.log(text),
            debug: text => console.log(text),
            info: text => console.log(text),
            log: text => console.log(text),
            warn: text => console.warn(text),
            error: text => console.error(text),
        };

    }
    setEvccStartPV(index: string): void {
        this.log.debug(`call: ` + `http://${this.ip}/api/loadpoints/${index}/mode/pv`);
        axios
            .post(`http://${this.ip}/api/loadpoints/${index}/mode/pv`, { timeout: this.timeout })
            .then(() => {
                this.log.info('Evcc update successful');
            })
            .catch(error => {
                this.log.error(`1 ${error.message}`);
            });
    }

    setEvccStartMin(index: string): void {
        this.log.debug(`call: ` + `http://${this.ip}/api/loadpoints/${index}/mode/minpv`);
        axios
            .post(`http://${this.ip}/api/loadpoints/${index}/mode/minpv`, { timeout: this.timeout })
            .then(() => {
                this.log.info('Evcc update successful');
            })
            .catch(error => {
                this.log.error(`2 ${error.message}`);
            });
    }

    setEvccStartNow(index: string): void {
        this.log.debug(`call: ` + `http://${this.ip}/api/loadpoints/${index}/mode/now`);
        axios
            .post(`http://${this.ip}/api/loadpoints/${index}/mode/now`, { timeout: this.timeout })
            .then(() => {
                this.log.info('Evcc update successful');
            })
            .catch(error => {
                this.log.error(`3  ${error.message}`);
            });
    }

    setEvccStop(index: string): void {
        this.log.debug(`call: ` + `http://${this.ip}/api/loadpoints/${index}/mode/off`);
        axios
            .post(`http://${this.ip}/api/loadpoints/${index}/mode/off`, { timeout: this.timeout })
            .then(() => {
                this.log.info('Evcc update successful');
            })
            .catch(error => {
                this.log.error(`4 ${error.message}`);
            });
    }

    setEvccMinCurrent(index: string, value: ioBroker.StateValue): void {
        this.log.debug(`call: ` + `http://${this.ip}/api/loadpoints/${index}/mincurrent/${value}`);
        axios
            .post(`http://${this.ip}/api/loadpoints/${index}/mincurrent/${value}`, { timeout: this.timeout })
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
            .post(`http://${this.ip}/api/loadpoints/${index}/maxcurrent/${value}`, { timeout: this.timeout })
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
            .post(`http://${this.ip}/api/loadpoints/${index}/phases/${value}`, { timeout: this.timeout })
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
            .post(`http://${this.ip}/api/loadpoints/${index}/disable/threshold/${value}`, {
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
            .post(`http://${this.ip}/api/loadpoints/${index}/enable/threshold/${value}`, {
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
            .post(`http://${this.ip}/api/loadpoints/${index}/limitsoc/${value}`, { timeout: this.timeout })
            .then(() => {
                this.log.info('Evcc update successful');
            })
            .catch(error => {
                this.log.error(`12 ${error.message}`);
            });
    }

    setEvccsmartCostLimitLoadpoint(index: string, value: ioBroker.StateValue): void {
        const numericValue = Number(value);
        let callUrl = `http://${this.ip}/api/loadpoints/${index}/smartcostlimit`;

        // Nur Wert anhängen, wenn > 0
        if (numericValue > 0) {
            callUrl += `/${numericValue}`;
        }

        this.log.debug(`call setEvccsmartCostLimitLoadpoint: ${callUrl}`);

        axios.post(callUrl, null, { timeout: this.timeout })
            .then(() => {
                this.log.info('Evcc update successful');
            })
            .catch(error => {
                this.log.error(`setEvccsmartCostLimitLoadpoint failed: ${error.message}`);
            });
    }

    setEvccsmartCostLimit(value: ioBroker.StateValue): void {
        const numericValue = Number(value);
        let callUrl = `http://${this.ip}/api/smartcostlimit`;

        // Nur Wert anhängen, wenn > 0
        if (numericValue > 0) {
            callUrl += `/${numericValue}`;
        }

        this.log.debug(`call setEvccsmartCostLimit: ${callUrl}`);

        axios.post(callUrl, null, { timeout: this.timeout })
            .then(() => {
                this.log.info('Evcc update successful');
            })
            .catch(error => {
                this.log.error(`setEvccsmartCostLimit failed: ${error.message}`);
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
                .post(`http://${this.ip}/api/loadpoints/${index}/vehicle/${value}`, { timeout: this.timeout })
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
            .post(`http://${this.ip}/api/buffersoc/${bufferSoc}`, { timeout: this.timeout })
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
            .post(`http://${this.ip}/api/bufferstartsoc/${bufferStartSoc}`, { timeout: this.timeout })
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
            .post(`http://${this.ip}/api/prioritysoc/${prioritySoc}`, { timeout: this.timeout })
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
            .post(`http://${this.ip}/api/vehicles/${vehicleID}/minsoc/${minSoc}`, { timeout: this.timeout })
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
            .post(`http://${this.ip}/api/vehicles/${vehicleID}/limitsoc/${minSoc}`, { timeout: this.timeout })
            .then(() => {
                this.log.info('Evcc update successful');
            })
            .catch(error => {
                this.log.error(`15 ${error.message}`);
            });
    }
    setVehiclePlan(vehicleID: string, active: boolean): void {
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
            axios
                .post(`http://${this.ip}/api/vehicles/${vehicleID}/plan/soc/100/${rfc3339Date}`, {
                    timeout: this.timeout,
                })
                .then(() => {
                    this.log.info(`Activate plan for verhicle: ${vehicleID}`);
                })
                .catch(error => {
                    this.log.error(`Error active plan: ${error.message}`);
                });
        } else {
            this.log.debug(`call: ` + `http://${this.ip}/api/vehicles/${vehicleID}/plan/soc`);
            axios
                .delete(`http://${this.ip}/api/vehicles/${vehicleID}/plan/soc`, { timeout: this.timeout })
                .then(() => {
                    this.log.info(`Deactivate plan for verhicle: ${vehicleID}`);
                })
                .catch(error => {
                    this.log.error(`Error deactive plan: ${error.message}`);
                });
        }
    }

    setEvccTargetSoc(index: string, value: ioBroker.StateValue): void {
        this.log.debug(`call: ` + `http://${this.ip}/api/loadpoints/${index}/target/soc/${value}`);
        axios
            .post(`http://${this.ip}/api/loadpoints/${index}/target/soc/${value}`, { timeout: this.timeout })
            .then(() => {
                this.log.info('Evcc update successful');
            })
            .catch(error => {
                this.log.error(`5 ${error.message}`);
            });
    }

    setEvccMinSoc(index: string, value: ioBroker.StateValue): void {
        this.log.debug(`call: ` + `http://${this.ip}/api/loadpoints/${index}/minsoc/${value}`);
        axios
            .post(`http://${this.ip}/api/loadpoints/${index}/minsoc/${value}`, { timeout: this.timeout })
            .then(() => {
                this.log.info('Evcc update successful');
            })
            .catch(error => {
                this.log.error(`6 ${error.message}`);
            });
    }

    setEvccSetTargetTime(index: string, value: ioBroker.StateValue): void {
        this.log.debug(`call: ` + `http://${this.ip}/api/loadpoints/${index}/target/time/${value}`);
        axios
            .post(`http://${this.ip}/api/loadpoints/${index}/target/time/${value}`, { timeout: this.timeout })
            .then(() => {
                this.log.info('Evcc update successful');
            })
            .catch(error => {
                this.log.error(`12 ${error.message}`);
            });
    }
    setEvccDeleteTargetTime(index: string): void {
        this.log.debug(`call: ` + `http://${this.ip}/api/loadpoints/${index}/target/time`);
        axios
            .delete(`http://${this.ip}/api/loadpoints/${index}/target/time`, { timeout: this.timeout })
            .then(() => {
                this.log.info('Evcc update successful');
            })
            .catch(error => {
                this.log.error(`13 ${error.message}`);
            });
    }
    setEvccBatteryGridChargeLimit(value: ioBroker.StateValue): void {
        const numericValue = Number(value);
        let callUrl = `http://${this.ip}/api/batterygridchargelimit`;

        // Nur Wert anhängen, wenn > 0
        if (numericValue > 0) {
            callUrl += `/${numericValue}`;
        }

        this.log.debug(`call setEvccBatteryGridChargeLimit: ${callUrl}`);

        axios.post(callUrl, null, { timeout: this.timeout })
            .then(() => {
                this.log.info('Evcc update successful');
            })
            .catch(error => {
                this.log.error(`setEvccBatteryGridChargeLimit failed: ${error.message}`);
            });
    }

}

