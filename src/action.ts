import { Individual } from "./individual.js";
import { State } from "./state.js";

import { Brain } from "./genetics/brain.js";


export abstract class Action {

    individual: Individual;

    constructor(individual: Individual) {
        this.individual = individual;
    }

    abstract isPossible(state: State): boolean;

    abstract execute(state: State): number;

    abstract toString(): string;
}

export class WaitAction extends Action {
    isPossible(state: State): boolean {
        return true;
    }

    execute(state: State): number {
        return - this.individual.energyNeed;
    }

    toString(): string {
        return `💤`;
    }
}

export class GatherAction extends Action {
    isPossible(state: State): boolean {
        const hungry = this.individual.hasHunger();
        const foodAvailable = state.environment.remainingFood > 0;
        const mostlyHerbivore = this.individual.diet.mostlyHerbivore();

        return hungry && foodAvailable && mostlyHerbivore;
    }

    // +0.5 turn
    execute(state: State) {
        this.individual.eat(1.5);

        state.environment.remainingFood--;

        return 1.5 - this.individual.energyNeed;
    }

    toString() {
        return `🥕`;
    }
}

export class HuntAction extends Action {
    victim: Individual | null = null;

    isPossible(state: State): boolean {
        const hungry = this.individual.hasHunger();
        const mostlyCarnivore = this.individual.diet.mostlyCarnivore();

        return hungry && mostlyCarnivore;
    }

    isPossibleVictim(victim: Individual): boolean {
        // can't hunt dead individual
        if (victim.deathDay) {
            return false;
        }
        // don't hunt carnivores (at least for now)
        if (victim.diet.mostlyCarnivore()) {
            return false;
        }
        // can't hunt yourself
        if (victim.id === this.individual.id) {
            return false;
        }
        // don't hunt your parent
        if (victim.id === this.individual.parent?.id) {
            return false;
        }
        // don't hunt your children
        if (victim.parent?.id === this.individual.id) {
            return false;
        }
        return true;
    }

    // +1 turn if successful, -1 turn if not
    execute(state: State) {
        const possibleVictims = state.individuals.filter(v => this.isPossibleVictim(v));

        if (possibleVictims.length === 0) {
            console.log(`${this.individual.id} hunts but there are no possible victims`);
            return - this.individual.energyNeed;
        }

        // less prey available, less likely to catch one
        const victimConcentration = possibleVictims.length / state.environment.maxFood;
        const victimConcentrationLuck = Math.random();
        if (victimConcentrationLuck < victimConcentration) {
            this.victim = possibleVictims[Math.floor(Math.random() * possibleVictims.length)];
            // console.log(`hit ${victimConcentrationLuck.toFixed(2)} < ${victimConcentration.toFixed(2)}`);
        } else {
            // console.log(`miss ${victimConcentrationLuck.toFixed(2)} >= ${victimConcentration.toFixed(2)}`);
            return - this.individual.energyNeed;
        }

        // the more hunters, the more likely it is someone else will catch the victim first
        const victimRatio = possibleVictims.length / state.individuals.length;
        const victimRatioLuck = Math.random();
        if (victimRatioLuck < victimRatio) {
            this.victim = possibleVictims[Math.floor(Math.random() * possibleVictims.length)];
            // console.log(`hit ${victimRatioLuck.toFixed(2)} < ${victimRatio.toFixed(2)}`);
        } else {
            // console.log(`miss ${victimRatioLuck.toFixed(2)} >= ${victimRatio.toFixed(2)}`);
            return - this.individual.energyNeed;
        }

        this.individual.eat(this.victim.nutritionalValue);
        this.victim.dieEaten(state.day, this.individual.id);

        // TODO: return energy cost based on number of victims hunted and on traits
        return this.victim.nutritionalValue - this.individual.energyNeed;
    }

    toString(): string {
        let victimId = this.victim ? this.victim.id : "❌";
        return `🥩 ${victimId}`;
    }
}


export class ReproduceAction extends Action {
    energyBuffer = 3;
    cloneIds: string[] = [];

    isPossible(state: State): boolean {
        const isAdult = this.individual.getAge(state.day) >= Individual.reproductiveAge;
        const hasEnergy = this.individual.energy > this.energyBuffer;

        return isAdult && hasEnergy;
    }

    // -2 for 1 child, -3 for 2 children
    execute(state: State): number {
        const spendableEnergy = Math.floor(this.individual.energy - this.energyBuffer);
        // max 2
        const numberOfChildren = Math.min(2, spendableEnergy);

        for (let i = 0; i < numberOfChildren; i++) {
            const baby = this.individual.createChild(state.day);
            state.saveIndividual(baby);
            this.cloneIds.push(baby.id);
        }

        return - numberOfChildren - this.individual.energyNeed;
    }

    toString(): string {
        return `👶 ${this.cloneIds.join(" ")}`;
    }
}

export const voluntaryActions = [
    GatherAction, HuntAction, ReproduceAction,
];
