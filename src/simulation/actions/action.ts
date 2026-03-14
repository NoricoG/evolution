import { Constants, EnergyConstants } from "@simulation/constants.js";
import { Individual } from "@simulation/individual.js";
import { State } from "@simulation/state.js";
import { Action, Activity } from "@simulation/actions/activity.js";

export class WaitAction extends Action {
    readonly name = "Wait";

    isPossible(state: State): boolean {
        return true;
    }

    execute(state: State): number {
        state.logAction(this, true);
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
            const findPlantSkill = this.individual.skills.findPlant.value;

            let attempts = Math.round(Constants.findPlantAttempts * (1 - this.individual.traits.alertness.value));
            if (attempts > state.environment.remainingFood) {
                attempts = state.environment.remainingFood;
            }
            while (attempts > 0) {
                attempts--;
                const gatherSucces = Math.random() < findPlantSkill;

                if (gatherSucces) {
                    this.succesful = true;
                    state.environment.remainingFood--;
                    state.logAction(this, this.succesful);
                    return EnergyConstants.anyAction + EnergyConstants.eatPlantAction;
                }

            }
        }

        this.succesful = false;
        state.logAction(this, this.succesful);
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
        const hunterAdvantage = this.individual.skills.hunt.value + this.individual.traits.size.value;

        let attempts = Math.round(Constants.huntAttempts * (1 - this.individual.traits.alertness.value));
        if (attempts > state.individuals.length) {
            attempts = state.individuals.length;
        }
        while (attempts > 0) {
            attempts--;

            let victim = state.individuals[Math.floor(Math.random() * state.individuals.length)];
            if (!this.isPossibleVictim(victim)) {
                continue;
            }

            const victimAdvantage = victim.traits.size.value + victim.traits.alertness.value + victim.extraAlertness;

            const outcome = Math.random() * (hunterAdvantage + victimAdvantage);
            const succes = outcome < hunterAdvantage;

            if (succes) {
                this.victim = victim;
                victim.dieEaten(state.day, this.individual.id);
                // TODO: return energy cost based on number of victims hunted and on traits
                state.logAction(this, true);
                return EnergyConstants.anyAction + EnergyConstants.eatMeatAction;
            } else {
                victim.extraAlertness++;
            }
        }

        // no success for all attempts
        state.logAction(this, false);
        return EnergyConstants.anyAction;
    }

    toString(): string {
        let victimId = this.victim ? this.victim.id : "❌";
        return `🥩 ${victimId}`;
    }
}


export class LearnSkillAction extends Action {
    readonly name = "Learn";

    isPossible(state: State): boolean {
        const hasEnergy = this.individual.energy > EnergyConstants.bufferForReproduction;
        return hasEnergy;
    }

    execute(state: State): number {
        this.individual.skills.learnRandom();
        state.logAction(this, true);
        return EnergyConstants.anyAction + EnergyConstants.learnAction;
    }

    toString(): string {
        return `📚`;
    }
}

export class ReproduceAction extends Action {
    readonly name = "Reproduce";

    cloneIds: string[] = [];

    isPossible(state: State): boolean {
        const isAdult = this.individual.getAge(state.day) >= Constants.reproductiveAge;
        const hasEnergy = this.individual.energy > EnergyConstants.bufferForReproduction;

        return isAdult && hasEnergy;
    }

    execute(state: State): number {
        const spendableEnergyConstants = Math.floor(this.individual.energy - EnergyConstants.bufferForReproduction);
        const numberOfChildren = Math.min(Constants.maxChildrenPerReproduction, spendableEnergyConstants);

        for (let i = 0; i < numberOfChildren; i++) {
            const baby = this.individual.createChild(state.day);
            state.saveIndividual(baby);
            this.cloneIds.push(baby.id);
        }

        state.logAction(this, numberOfChildren > 0);
        return EnergyConstants.anyAction + EnergyConstants.reproductionPerChild * numberOfChildren;
    }

    toString(): string {
        return `👶 ${this.cloneIds.join(" ")}`;
    }
}
