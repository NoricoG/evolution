import { Energy } from "../energy.js";
import { Individual } from "../individual.js";
import { State } from "../state.js";

import { Action } from "./action.js";


export class WaitAction extends Action {
    readonly name = "Wait";

    isPossible(state: State): boolean {
        return true;
    }

    execute(state: State): number {
        return Energy.anyAction;
    }

    toString(): string {
        return `💤`;
    }
}

export class HerbivoreAction extends Action {
    readonly name = "Herbivore";

    succesful = false;

    isPossible(state: State): boolean {
        return true;
    }

    execute(state: State) {
        if (state.environment.remainingFood > 0) {
            this.succesful = true;
            state.environment.remainingFood--;
            return Energy.anyAction + Energy.herbivoreAction;
        } else {
            this.succesful = false;
            return Energy.anyAction;
        }
    }

    toString() {
        return `🥕 ${this.succesful ? "✔️" : "❌"}`;
    }
}

export class CarnivoreAction extends Action {
    readonly name = "Carnivore";

    victim: Individual | null = null;

    isPossible(state: State): boolean {
        return true;
    }

    private isPossibleVictim(victim: Individual): boolean {
        // can't hunt dead individual
        if (victim.deathDay) {
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

    execute(state: State) {
        const possibleVictims = state.individuals.filter(v => this.isPossibleVictim(v));

        if (possibleVictims.length === 0) {
            console.log(`${this.individual.id} hunts but there are no possible victims`);
            return Energy.anyAction;
        }

        // less prey available, less likely to catch one
        const victimConcentration = possibleVictims.length / state.environment.maxFood;
        const victimConcentrationLuck = Math.random();
        if (victimConcentrationLuck < victimConcentration) {
            // console.log(`hit ${victimConcentrationLuck.toFixed(2)} < ${victimConcentration.toFixed(2)}`);
        } else {
            // console.log(`miss ${victimConcentrationLuck.toFixed(2)} >= ${victimConcentration.toFixed(2)}`);
            return Energy.anyAction;
        }

        // the more hunters, the more likely it is someone else will catch the victim first
        const victimRatio = possibleVictims.length / state.individuals.length;
        const victimRatioLuck = Math.random();
        if (victimRatioLuck < victimRatio) {
            // console.log(`hit ${victimRatioLuck.toFixed(2)} < ${victimRatio.toFixed(2)}`);
        } else {
            // console.log(`miss ${victimRatioLuck.toFixed(2)} >= ${victimRatio.toFixed(2)}`);
            return Energy.anyAction;
        }

        this.victim = possibleVictims[Math.floor(Math.random() * possibleVictims.length)];
        this.victim.dieEaten(state.day, this.individual.id);

        // TODO: return energy cost based on number of victims hunted and on traits
        return Energy.anyAction + Energy.carnivoreAction;
    }

    toString(): string {
        let victimId = this.victim ? this.victim.id : "❌";
        return `🥩 ${victimId}`;
    }
}


export class ReproduceAction extends Action {
    readonly name = "Reproduce";

    cloneIds: string[] = [];

    isPossible(state: State): boolean {
        const isAdult = this.individual.getAge(state.day) >= Individual.reproductiveAge;
        const hasEnergy = this.individual.energy > Energy.bufferForReproduction;

        return isAdult && hasEnergy;
    }

    execute(state: State): number {
        const spendableEnergy = Math.floor(this.individual.energy - Energy.bufferForReproduction);
        // max 2
        const numberOfChildren = Math.min(2, spendableEnergy);

        for (let i = 0; i < numberOfChildren; i++) {
            const baby = this.individual.createChild(state.day);
            state.saveIndividual(baby);
            this.cloneIds.push(baby.id);
        }

        return Energy.anyAction + Energy.reproductionPerChild * numberOfChildren;
    }

    toString(): string {
        return `👶 ${this.cloneIds.join(" ")}`;
    }
}
