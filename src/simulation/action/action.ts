import { Constants, EnergyConstants } from "@simulation/constants.js";
import { Individual } from "@simulation/individual.js";
import { State } from "@simulation/state.js";
import { ActionMetrics } from "@simulation/metrics.js";

export abstract class Action {
    static weight(_individual: Individual): number {
        throw new Error("Not implemented");
    }

    static isPossible(_individual: Individual, _state: State): boolean {
        throw new Error("Not implemented");
    }

    static execute(_individual: Individual, _state: State, _metrics: ActionMetrics): number {
        throw new Error("Not implemented");
    }
}

export class IdleAction extends Action {
    static weight(_individual: Individual): number {
        return 0;
    }

    static isPossible(_individual: Individual, _state: State): boolean {
        return true;
    }

    static execute(individual: Individual, state: State, metrics: ActionMetrics): number {
        if (individual.getAge(state.day) >= 2) {
            metrics.logIdle();
            console.warn("Adult individual idled, this should not happen");
        } else {
            metrics.logGrowUp();
        }
        return EnergyConstants.anyAction;
    }
}

export class PlantSearchAction extends Action {
    static weight(individual: Individual): number {
        return individual.diet.plant.value;
    }

    static isPossible(individual: Individual, state: State): boolean {
        const x = individual.location.x;
        const y = individual.location.y;
        return state.space.plants[x][y] > 0;
    }

    static execute(individual: Individual, state: State, metrics: ActionMetrics): number {
        const plantAvailable = state.space.plants[individual.location.x][individual.location.y];

        if (plantAvailable <= 0) {
            metrics.logPlantSearch(false);
            return EnergyConstants.anyAction;
        }

        const plantSearchSkill = individual.skills.plantSearch.value;

        const plantEaten = plantAvailable * plantSearchSkill;
        const maxEnergyGained = plantEaten * EnergyConstants.energyPerPlant * individual.diet.plant.value;
        const energyGained = Math.min(maxEnergyGained, EnergyConstants.maxEatPlantEnergy);

        const plantRemaining = Math.max(0, plantAvailable - plantEaten);
        state.space.plants[individual.location.x][individual.location.y] = plantRemaining;
        metrics.logPlantSearch(true);
        return EnergyConstants.anyAction + energyGained;
    }
}

export class HuntAction extends Action {
    static weight(individual: Individual): number {
        return individual.diet.meat.value;
    }

    static isPossible(individual: Individual, state: State): boolean {
        const huntingTiles = state.space.huntingRange[individual.location.x][individual.location.y];
        for (let t = 0; t < huntingTiles.length; t++) {
            const x = huntingTiles[t].x;
            const y = huntingTiles[t].y;
            if (state.space.animals[x][y].length > 0) return true;
        }
        return false;
    }

    private static isPossibleVictim(individual: Individual, victim: Individual): boolean {
        // no point in hunting victim with little energy
        if (victim.energy <= -1 * EnergyConstants.anyAction) {
            return false;
        }
        // only hunt if victim is less specialised in hunting
        if (1.5 * victim.diet.meat.value > individual.diet.meat.value) {
            // TODO: fix by returning false instead of true
            return true;
        }

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

    static execute(individual: Individual, state: State, metrics: ActionMetrics): number {
        const hunterAdvantage = individual.skills.hunt.value;
        const tiles = state.space.huntingRange[individual.location.x][individual.location.y];

        for (let t = 0; t < tiles.length; t++) {
            const animals = state.space.animals[tiles[t].x][tiles[t].y];
            for (let i = 0; i < animals.length; i++) {
                const victim = animals[i];
                if (!this.isPossibleVictim(individual, victim)) continue;

                const victimAdvantage = victim.traits.size.value;
                const outcome = Math.random() * (hunterAdvantage + victimAdvantage);

                // not successful, victim escapes
                // TODO: fix by changing > to <
                if (outcome > victimAdvantage) {
                    continue;
                }

                victim.dieEaten(state.day);
                state.space.removeAnimal(victim);

                metrics.logHunt(true);

                state.space.moveIndividual(individual, victim.location);

                const gainedEnergy = Math.min(EnergyConstants.maxHuntEnergy, victim.energy * individual.skills.hunt.value);
                return EnergyConstants.anyAction + gainedEnergy;
            }
        }

        metrics.logHunt(false);
        return EnergyConstants.anyAction;
    }
}

export class MoveAction extends Action {
    static weight(individual: Individual): number {
        return individual.brain.move.value;
    }

    static isPossible(individual: Individual, _state: State): boolean {
        return individual.energy > -1 * EnergyConstants.moveAction;
    }

    static execute(individual: Individual, state: State, metrics: ActionMetrics): number {
        const nextLocation = state.space.randomNeighbourLocation(individual.location, 1);
        state.space.moveIndividual(individual, nextLocation);

        metrics.logMove();
        return EnergyConstants.anyAction + EnergyConstants.moveAction;
    }
}

export class ReproduceAction extends Action {
    static weight(individual: Individual): number {
        return individual.brain.reproduce.value;
    }

    static isPossible(individual: Individual, state: State): boolean {
        const isAdult = individual.getAge(state.day) >= Constants.reproductiveAge;
        const hasEnergy = individual.energy > EnergyConstants.bufferForReproduction;
        return isAdult && hasEnergy;
    }

    static execute(individual: Individual, state: State, metrics: ActionMetrics): number {
        const spendableEnergy = Math.floor(individual.energy - EnergyConstants.bufferForReproduction);
        const numberOfChildren = Math.min(Constants.maxChildrenPerReproduction, spendableEnergy);

        for (let i = 0; i < numberOfChildren; i++) {
            const babyLocation = state.space.randomNeighbourLocation(individual.location, 3);
            const baby = individual.createChild(babyLocation, state.day);
            state.saveIndividual(baby);
        }

        metrics.logReproduce(numberOfChildren);
        return EnergyConstants.anyAction + EnergyConstants.reproductionPerChild * numberOfChildren;
    }
}
