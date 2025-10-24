export interface Loadpoint {
    phasesActive: number; //3,
    chargeConfigured: boolean; //true,
    chargeCurrent: number; //0,
    chargeCurrents: string; //[1,2,3],
    chargeDuration: number; //0,
    chargePower: number; //2800,
    chargeRemainingDuration: number; //-1,
    chargedEnergy: number; //8456.300000000001,
    charging: boolean; //false,
    connected: boolean; //true,
    connectedDuration: 0;
    enabled: boolean; //false,
    hasVehicle: boolean; //true,
    maxCurrent: number; //16,
    minCurrent: number; //6,
    mode: string; //off,
    phasesConfigured: number; //3,
    timerActive: boolean; //true,
    timerProjectedEnd: string; //2021-11-06T20:59:00+01:00,
    timerSet: boolean; //false,
    title: string; //Ladepunkt,
    vehicleCapacity: number; //14,
    vehicleIdentity: string; //Firma,
    vehiclePresent: boolean; //true,
    vehicleRange: number; //50,
    vehicleSoc: number; //100,
    vehicleTitle: string; //A6 Tfsie 55
    enableThreshold: number;
    disableThreshold: number;
    limitSoc: number;
    vehicleName: string;
    smartCostLimit: number; // 0
}
