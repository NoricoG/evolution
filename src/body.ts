// currently not used
export class Body {
    readonly id: string
    readonly nutrionalValue: number;
    readonly deathDay: number;

    constructor(id: string, nutrionalValue: number, deathDay: number) {
        this.id = id;
        this.nutrionalValue = nutrionalValue;
        this.deathDay = deathDay;
    }
}
