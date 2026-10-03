export interface Vehicle {
    title: string;
    minSoc: number;
    limitSoc: number;
    /** current evcc: single soc plan */
    plan?: Plan;
    /** older evcc versions */
    plans?: Plan[];
}

export interface Plan {
    soc: number;
    time: string;
}
