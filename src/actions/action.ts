import { Individual } from "../individual.js";
import { State } from "../state.js";


export abstract class Action {
    abstract readonly name: string;

    readonly individual: Individual;

    constructor(individual: Individual) {
        this.individual = individual;
    }

    abstract isPossible(state: State): boolean;

    abstract execute(state: State): number;

    abstract toString(): string;
}
