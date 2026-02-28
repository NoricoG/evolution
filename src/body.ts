export class Body {
    id: string
    nutrionalValue: number;
    deathDay: number;

    constructor(id: string, nutrionalValue: number, deathDay: number) {
        this.id = id;
        this.nutrionalValue = nutrionalValue;
        this.deathDay = deathDay;
    }
}
