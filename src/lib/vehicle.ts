export interface Vehicle {
    [key: string]: {
        id: string;
        title: string;
        minSoc: number;
        limitSoc: number;
        //plans: Plan[];
    };
}

export interface Plan {
    soc: number;
    time: string;
}