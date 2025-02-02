export interface Vehicle {
    title: string;
    minSoc: number;
    limitSoc: number;
    plans: Plan[];
}

export interface Plan {
    soc: number;
    time: string;
}
