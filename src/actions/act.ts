import { Constants, EnergyConstants } from "../constants.js";
import { Individual } from "../individual.js";
import { State } from "../state.js";

import { Action } from "./action.js";


export class WaitAction extends Action {
    readonly name = "Wait";

    isPossible(state: State): boolean {
        return true;
    }

    execute(state: State): number {
        return EnergyConstants.anyAction;
    }

    toString(): string {
        return `💤`;
    }
}

export class EatPlantAction extends Action {
    readonly name = "Herbivore";

    succesful = false;

    isPossible(state: State): boolean {
        return true;
    }

    execute(state: State): number {
        if (state.environment.remainingFood > 0) {
            const eatPlantSkill = 1 - this.individual.brain.plantOrMeat.value;

            let attempts = Constants.foodAttempts;
            while (attempts > 0) {
                attempts--;
                const gatherSucces = Math.random() < eatPlantSkill;

                if (gatherSucces) {
                    this.succesful = true;
                    state.environment.remainingFood--;
                    return EnergyConstants.anyAction + EnergyConstants.eatPlantAction;
                }

            }
        }

        this.succesful = false;
        return EnergyConstants.anyAction;
    }

    toString() {
        return `🥕 ${this.succesful ? "✔️" : "❌"}`;
    }
}

export class EatMeatAction extends Action {
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

    execute(state: State): number {
        const eatMeatSkill = this.individual.brain.plantOrMeat.value;

        let attempts = Constants.foodAttempts;
        while (attempts > 0) {
            attempts--;

            let victim = state.individuals[Math.floor(Math.random() * state.individuals.length)];
            if (!this.isPossibleVictim(victim)) {
                continue;
            }

            // 0.4 and 0.6 result in 0.2, 0.1 and 0.9 result in 0.8
            var victimSkill = (Math.abs(0.5 - victim.brain.plantOrMeat.value)) * 2;

            const skillDifference = eatMeatSkill - victimSkill;
            const succes = Math.random() < skillDifference;
            if (succes) {
                this.victim = victim;
                victim.dieEaten(state.day, this.individual.id);
                // TODO: return energy cost based on number of victims hunted and on traits
                return EnergyConstants.anyAction + EnergyConstants.eatMeatAction;
            }
        }

        // unsuccesful
        return EnergyConstants.anyAction;
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
        const isAdult = this.individual.getAge(state.day) >= Constants.reproductiveAge;
        const hasEnergyConstants = this.individual.energy > EnergyConstants.bufferForReproduction;

        return isAdult && hasEnergyConstants;
    }

    execute(state: State): number {
        const spendableEnergyConstants = Math.floor(this.individual.energy - EnergyConstants.bufferForReproduction);
        const numberOfChildren = Math.min(Constants.maxChildrenPerReproduction, spendableEnergyConstants);

        for (let i = 0; i < numberOfChildren; i++) {
            const baby = this.individual.createChild(state.day);
            state.saveIndividual(baby);
            this.cloneIds.push(baby.id);
        }

        return EnergyConstants.anyAction + EnergyConstants.reproductionPerChild * numberOfChildren;
    }

    toString(): string {
        return `👶 ${this.cloneIds.join(" ")}`;
    }
}
