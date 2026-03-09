import { State } from "../state.js";

import { Action } from "./action.js";
import { EatPlantAction, EatMeatAction, ReproduceAction, WaitAction } from "./act.js";


function decide(aOrB: number, actionA: Action, actionB: Action, state: State): Action | null {
    const possibleA = actionA.isPossible(state);
    const possibleB = actionB.isPossible(state);

    if (possibleA && possibleB) {
        // aOrB low means more likely to choose actionA, aOrB high means more likely to choose actionB
        return Math.random() < aOrB ? actionB : actionA;
    } else if (possibleA) {
        return actionA;
    } else if (possibleB) {
        return actionB;
    } else {
        return null;
    }
}

export class MainAction extends Action {
    readonly name = "Main";

    chosenAction: Action | null = null;

    isPossible(state: State): boolean {
        return !this.individual.deathDay && this.individual.getAge(state.day) > 1;
    }

    execute(state: State): number {
        const eatAction = new EatAction(this.individual);
        const reproduceAction = new ReproduceAction(this.individual);
        const eatOrReproduce = this.individual.brain.eatOrReproduce.value;

        this.chosenAction = decide(eatOrReproduce, eatAction, reproduceAction, state) || new WaitAction(this.individual);

        const gainedEnergy = this.chosenAction.execute(state);
        this.individual.events.push(this.chosenAction.toString());
        return gainedEnergy;
    }

    toString(): string {
        return "";
    }
}

export class EatAction extends Action {
    readonly name = "Eat";

    chosenAction: Action | null = null;

    isPossible(state: State): boolean {
        const hungry = this.individual.hasHunger();
        return hungry;
    }

    execute(state: State): number {
        const plantOrMeat = this.individual.brain.plantOrMeat.value;

        this.chosenAction = decide(
            plantOrMeat,
            new EatPlantAction(this.individual),
            new EatMeatAction(this.individual),
            state
        ) || new WaitAction(this.individual);

        return this.chosenAction.execute(state);
    }

    toString(): string {
        return this.chosenAction ? this.chosenAction.toString() : "";
    }
}
