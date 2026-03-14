import { Individual } from "../individual.js";
import { State } from "../state.js";

export abstract class Activity {
    abstract readonly name: string;

    readonly individual: Individual;

    constructor(individual: Individual) {
        this.individual = individual;
    }

    abstract isPossible(state: State): boolean;

    abstract execute(state: State): number;

    abstract toString(): string;
}

export abstract class Action extends Activity {

}

export abstract class Decision extends Activity {

    decide(aOrB: number, activityA: Activity, activityB: Activity, state: State): Activity | null {
        const possibleA = activityA.isPossible(state);
        const possibleB = activityB.isPossible(state);

        if (possibleA && possibleB) {
            // aOrB low means more likely to choose activityA, aOrB high means more likely to choose activityB
            return Math.random() < aOrB ? activityB : activityA;
        } else if (possibleA) {
            return activityA;
        } else if (possibleB) {
            return activityB;
        } else {
            return null;
        }
    }
}
