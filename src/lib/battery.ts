export interface Battery {
    batteryDischargeControl: boolean; //true,
    batteryGridChargeLimit: number; //0,
    batteryMode: string; //[unknown,normal,hold charge],
    bufferSoc: number; //0,
    bufferStartSoc: number; //0,
    residualPower: number; //2500,
}
