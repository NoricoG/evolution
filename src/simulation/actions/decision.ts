import { EatMeatAction, EatPlantAction, LearnSkillAction, ReproduceAction, WaitAction } from "@simulation/actions/action.js";
import { Action, Activity, Decision } from "@simulation/actions/activity.js";
import { State } from "@simulation/state.js";

export class MainDecision extends Decision {
    readonly name = "SurviveOrLearn";

    isPossible(state: State): boolean {
        return !this.individual.deathDay && this.individual.getAge(state.day) > 1;
    }

    execute(state: State): number {
        const eatOrReproduceDecision = new EatOrReproduceDecision(this.individual);
        const learnAction = new LearnSkillAction(this.individual);
        const surviveOrLearn = this.individual.brain.surviveOrLearn.value;

        const chosenActivity = this.decide(surviveOrLearn, eatOrReproduceDecision, learnAction, state) || new WaitAction(this.individual);
        const gainedEnergy = chosenActivity.execute(state);
        this.individual.events.push(chosenActivity.toString());
        return gainedEnergy;
    }

    toString(): string {
        return "";
    }
}

export class EatOrReproduceDecision extends Decision {
    readonly name = "EatOrReproduce";

    chosenActivity: Activity | null = null;

    isPossible(state: State): boolean {
        const canEat = this.individual.hasHunger();
        const canReproduce = new ReproduceAction(this.individual).isPossible(state);
        return canEat || canReproduce;
    }

    execute(state: State): number {
        const eatOrReproduce = this.individual.brain.eatOrReproduce.value;

        this.chosenActivity = this.decide(
            eatOrReproduce,
            new PlantOrMeatDecision(this.individual),
            new ReproduceAction(this.individual),
            state
        ) || new WaitAction(this.individual);

        return this.chosenActivity.execute(state);
    }

    toString(): string {
        return this.chosenActivity ? this.chosenActivity.toString() : "";
    }
}

export class PlantOrMeatDecision extends Decision {
    readonly name = "PlantOrMeat";

    chosenAction: Action | null = null;

    isPossible(state: State): boolean {
        const hungry = this.individual.hasHunger();
        const canEatPlant = new EatPlantAction(this.individual).isPossible(state);
        const canEatMeat = new EatMeatAction(this.individual).isPossible(state);
        return hungry && (canEatPlant || canEatMeat);
    }

    execute(state: State): number {
        const plantOrMeat = this.individual.brain.plantOrMeat.value;

        this.chosenAction = this.decide(
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
