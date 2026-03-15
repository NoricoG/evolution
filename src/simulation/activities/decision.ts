import { Activity } from "@simulation/activities/activity";
import { HuntAction, PlantSearchAction, LearnSkillAction, ReproduceAction, IdleAction, GrowUpAction } from "@simulation/activities/action.js";
import { Individual } from "@simulation/individual.js";
import { State } from "@simulation/state.js";

export class Decision extends Activity {
    // aOrB meaning: low -> A more likely, high -> B more likely
    static decide(aOrB: number, possibleA: boolean, possibleB: boolean): "a" | "b" | null {
        if (possibleA && possibleB) {
            return Math.random() < aOrB ? "b" : "a";
        } else if (possibleA) {
            return "a";
        } else if (possibleB) {
            return "b";
        } else {
            return null;
        }
    }
}

export class MainDecision extends Decision {
    static isPossible(individual: Individual, _state: State): boolean {
        return individual.deathDay == null;
    }

    static execute(individual: Individual, state: State): number {
        if (individual.getAge(state.day) < 2) {
            return GrowUpAction.execute(individual, state);
        }

        const surviveOrLearn = individual.brain.surviveOrLearn.value;
        const possibleSurvive = EatOrReproduceDecision.isPossible(individual, state);
        const possibleLearn = LearnSkillAction.isPossible(individual, state);
        const choice = Decision.decide(surviveOrLearn, possibleSurvive, possibleLearn);

        if (choice === "a") return EatOrReproduceDecision.execute(individual, state);
        if (choice === "b") return LearnSkillAction.execute(individual, state);
        return IdleAction.execute(individual, state);
    }
}

export class EatOrReproduceDecision extends Decision {
    static isPossible(individual: Individual, state: State): boolean {
        return individual.hasHunger() || ReproduceAction.isPossible(individual, state);
    }

    static execute(individual: Individual, state: State): number {
        const eatOrReproduce = individual.brain.eatOrReproduce.value;
        const possibleEat = PlantOrMeatDecision.isPossible(individual, state);
        const possibleReproduce = ReproduceAction.isPossible(individual, state);
        const choice = Decision.decide(eatOrReproduce, possibleEat, possibleReproduce);

        if (choice === "a") return PlantOrMeatDecision.execute(individual, state);
        if (choice === "b") return ReproduceAction.execute(individual, state);
        return IdleAction.execute(individual, state);
    }
}

export class PlantOrMeatDecision extends Decision {
    static isPossible(individual: Individual, state: State): boolean {
        return individual.hasHunger() && (PlantSearchAction.isPossible(individual, state) || HuntAction.isPossible(individual, state));
    }

    static execute(individual: Individual, state: State): number {
        const plantOrMeat = individual.brain.plantOrMeat.value;
        const possiblePlant = PlantSearchAction.isPossible(individual, state);
        const possibleMeat = HuntAction.isPossible(individual, state);
        const choice = Decision.decide(plantOrMeat, possiblePlant, possibleMeat);

        if (choice === "a") return PlantSearchAction.execute(individual, state);
        if (choice === "b") return HuntAction.execute(individual, state);
        return IdleAction.execute(individual, state);
    }
}
