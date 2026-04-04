import { Individual } from "@simulation/individual.js";
import { State } from "@simulation/state.js";
import { ActionMetrics } from "@simulation/metrics.js";
import { Action, IdleAction, PlantSearchAction, HuntAction, MoveAction, ReproduceAction } from "@simulation/action/action.js";

abstract class Decision extends Action {
    static options: (typeof Action)[];
    static onlyPossibleActions: boolean;

    static isPossible(_individual: Individual, _state: State): boolean {
        return true;
    }

    static execute(individual: Individual, state: State, metrics: ActionMetrics): number {
        let weightedActions: { weight: number, actionClass: typeof Action }[] = [];
        for (const actionClass of this.options) {
            const weight = actionClass.weight(individual);
            if (weight <= 0) {
                continue;
            }

            const isPossible = actionClass.isPossible(individual, state);
            if (this.onlyPossibleActions && !isPossible) {
                continue;
            }

            weightedActions.push({ weight, actionClass });
        }

        if (weightedActions.length === 0) {
            return IdleAction.execute(individual, state, metrics);
        }
        if (weightedActions.length === 1) {
            return weightedActions[0].actionClass.execute(individual, state, metrics);
        }

        const totalWeight = weightedActions.reduce((sum, { weight }) => sum + weight, 0);
        const randomWeight = Math.random() * totalWeight;

        let cumulativeWeight = 0;
        for (let i = 0; i < weightedActions.length; i++) {
            cumulativeWeight += weightedActions[i].weight;
            if (randomWeight < cumulativeWeight) {
                const chosenAction = weightedActions[i].actionClass;
                return chosenAction.execute(individual, state, metrics);
            }
        }

        return IdleAction.execute(individual, state, metrics);
    }
}

export class DietDecision extends Decision {
    static options = [PlantSearchAction, HuntAction];
    static onlyPossibleActions = false;

    static weight(individual: Individual): number {
        return individual.brain.eat.value;
    }
}

export class BrainDecision extends Decision {
    static options = [MoveAction, DietDecision, ReproduceAction];
    static onlyPossibleActions = true;

    static weight(_individual: Individual): number {
        return 1;
    }

    static isPossible(individual: Individual, state: State): boolean {
        return individual.getAge(state.day) >= 2;
    }
}
