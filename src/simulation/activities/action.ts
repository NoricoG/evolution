import { Activity } from "@simulation/activities/activity";
import { Constants, EnergyConstants } from "@simulation/constants.js";
import { Individual } from "@simulation/individual.js";
import { State } from "@simulation/state.js";

export class Action extends Activity {

}

export class IdleAction extends Action {
    static isPossible(_individual: Individual, _state: State): boolean {
        return true;
    }

    static execute(_individual: Individual, state: State): number {
        console.warn("Individual idled, this should not happen");
        return EnergyConstants.anyAction;
    }
}

export class GrowUpAction extends Action {
    static isPossible(_individual: Individual, _state: State): boolean {
        return true;
    }

    static execute(_individual: Individual, state: State): number {
        state.logGrowUp();
        return EnergyConstants.anyAction;
    }
}

export class PlantSearchAction extends Action {
    static isPossible(_individual: Individual, _state: State): boolean {
        return true;
    }

    static execute(individual: Individual, state: State): number {
        if (state.environment.remainingFood > 0) {
            const plantSearchSkill = individual.skills.plantSearch.value;

            let attempts = Math.round(Constants.plantSearchAttempts * (1 - individual.traits.alertness.value));
            if (attempts > state.environment.remainingFood) {
                attempts = state.environment.remainingFood;
            }
            while (attempts > 0) {
                attempts--;
                const gatherSucces = Math.random() < plantSearchSkill;

                if (gatherSucces) {
                    state.environment.remainingFood--;
                    state.logPlantSearch(true);
                    return EnergyConstants.anyAction + EnergyConstants.plantSearchAction;
                }
            }
        }

        state.logPlantSearch(false);
        return EnergyConstants.anyAction;
    }
}

export class HuntAction extends Action {
    static isPossible(_individual: Individual, _state: State): boolean {
        return true;
    }

    private static isPossibleVictim(individual: Individual, victim: Individual): boolean {
        // can't hunt dead individual
        if (victim.deathDay) {
            return false;
        }
        // can't hunt yourself
        if (victim.id === individual.id) {
            return false;
        }
        // don't hunt your parent
        if (victim.id === individual.parent?.id) {
            return false;
        }
        // don't hunt your children
        if (victim.parent?.id === individual.id) {
            return false;
        }
        return true;
    }

    static execute(individual: Individual, state: State): number {
        const hunterAdvantage = individual.skills.hunt.value + individual.traits.size.value;

        let attempts = Math.round(Constants.huntAttempts * (1 - individual.traits.alertness.value));
        if (attempts > state.individuals.length) {
            attempts = state.individuals.length;
        }
        while (attempts > 0) {
            attempts--;

            const victim = state.individuals[Math.floor(Math.random() * state.individuals.length)];
            if (!HuntAction.isPossibleVictim(individual, victim)) {
                continue;
            }

            const victimAdvantage = victim.traits.size.value + victim.traits.alertness.value + victim.extraAlertness;
            const outcome = Math.random() * (hunterAdvantage + victimAdvantage);
            const succes = outcome < hunterAdvantage;

            if (succes) {
                victim.dieEaten(state.day);
                // TODO: return energy cost based on number of victims hunted and on traits
                state.logHunt(true);
                return EnergyConstants.anyAction + EnergyConstants.huntAction;
            } else {
                victim.extraAlertness++;
            }
        }

        // no success for all attempts
        state.logHunt(false);
        return EnergyConstants.anyAction;
    }
}

export class LearnSkillAction extends Action {
    static isPossible(individual: Individual, _state: State): boolean {
        return individual.energy > EnergyConstants.bufferForReproduction;
    }

    static execute(individual: Individual, state: State): number {
        individual.skills.learnRandom();
        state.logLearn();
        return EnergyConstants.anyAction + EnergyConstants.learnAction;
    }
}

export class ReproduceAction extends Action {
    static isPossible(individual: Individual, state: State): boolean {
        const isAdult = individual.getAge(state.day) >= Constants.reproductiveAge;
        const hasEnergy = individual.energy > EnergyConstants.bufferForReproduction;
        return isAdult && hasEnergy;
    }

    static execute(individual: Individual, state: State): number {
        const spendableEnergy = Math.floor(individual.energy - EnergyConstants.bufferForReproduction);
        const numberOfChildren = Math.min(Constants.maxChildrenPerReproduction, spendableEnergy);

        for (let i = 0; i < numberOfChildren; i++) {
            const baby = individual.createChild(state.day);
            state.saveIndividual(baby);
        }

        state.logReproduce(numberOfChildren);
        return EnergyConstants.anyAction + EnergyConstants.reproductionPerChild * numberOfChildren;
    }
}
