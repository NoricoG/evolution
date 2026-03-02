import { State } from "../state.js";

import { Action } from "./action.js";
import { HerbivoreAction, CarnivoreAction, ReproduceAction, WaitAction } from "./act.js";
import { Energy } from "../energy.js";

import { Chromosome } from "../genetics/chromosome.js";
import { Gene } from "../genetics/gene.js";


function decide(chromosome: Chromosome, actions: Action[]): Action | null {
    if (actions.length === 0) {
        return null;
    }

    const weightedActions = actions.map(action => {
        const weight = chromosome.genes[action.name];
        if (!weight) {
            console.warn(`No gene found for action ${action.name}, defaulting to 0 weight`);
            return { action, weight: new Gene(0) };
        }
        return { action, weight };
    });

    // pick a random weight of the total weight range
    const totalWeight = weightedActions.reduce((sum, aw) => sum + aw.weight.value, 0);
    const randomWeight = Math.random() * totalWeight;

    if (totalWeight === 0) {
        const actionsString = actions.map(a => a.name).join(" ");
        // console.info(`This individual can do ${actionsString} but brain is ${this.toString()} so it does nothing`);
        return null;
    }

    // find the action corresponding to the random weight
    let cumulativeWeight = 0;
    for (const aw of weightedActions) {
        cumulativeWeight += aw.weight.value;
        if (cumulativeWeight > randomWeight) {
            return aw.action;
        }
    }

    console.warn("No action chosen, this should not happen");
    return null;
}

export class MainAction extends Action {
    readonly name = "Main";

    isPossible(state: State): boolean {
        return !this.individual.deathDay && this.individual.getAge(state.day) > 1;
    }

    execute(state: State): number {
        const voluntaryActions = [EatAction, ReproduceAction];
        const possibleActions: Action[] = [];
        for (const ActionClass of voluntaryActions) {
            const action = new ActionClass(this.individual);
            if (action.isPossible(state)) {
                possibleActions.push(action);
            }
        }

        const chosenAction = decide(this.individual.brain, possibleActions) || new WaitAction(this.individual);
        const gainedEnergy = chosenAction.execute(state);

        this.individual.events.push(chosenAction.toString());

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
        const voluntaryActions = [HerbivoreAction, CarnivoreAction];
        const possibleActions: Action[] = [];
        for (const ActionClass of voluntaryActions) {
            const action = new ActionClass(this.individual);
            if (action.isPossible(state)) {
                possibleActions.push(action);
            }
        }

        this.chosenAction = decide(this.individual.diet, possibleActions) || new WaitAction(this.individual);
        const gainedEnergy = this.chosenAction.execute(state);

        return gainedEnergy;
    }

    toString(): string {
        return this.chosenAction ? this.chosenAction.toString() : "";
    }
}
