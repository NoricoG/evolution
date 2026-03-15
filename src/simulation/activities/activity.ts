import { Individual } from "@simulation/individual.js";
import { State } from "@simulation/state.js";

export class Activity {
    static isPossible(_individual: Individual, _state: State): boolean {
        throw new Error("Not implemented");
    }

    static execute(_individual: Individual, _state: State): number {
        throw new Error("Not implemented");
    }
}
