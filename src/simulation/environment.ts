import { EnvironmentConstants } from "@simulation/constants.js";

export class Environment {
    uneatenFood: number;
    grownFood: number;
    remainingFood: number;

    foodRegeneration: number;
    foodRegenerationIncreasing: boolean;

    readonly maxFood: number;

    constructor(maxFood: number) {
        this.maxFood = maxFood;

        this.uneatenFood = -1;
        this.grownFood = -1;
        this.remainingFood = 0;

        this.foodRegeneration = Math.random() * (EnvironmentConstants.maxFoodRegeneration - EnvironmentConstants.minFoodRegeneration) + EnvironmentConstants.minFoodRegeneration;
        this.foodRegenerationIncreasing = Math.random() < 0.5;

        this.nextDay();
    }

    toFoodString(): string {
        return `${this.uneatenFood} -> ${this.grownFood} -> ${this.remainingFood}`;
    }

    updateSeason() {
        this.foodRegeneration += this.foodRegenerationIncreasing ? EnvironmentConstants.stepFoodRegeneration : -EnvironmentConstants.stepFoodRegeneration;
        if (this.foodRegeneration > EnvironmentConstants.maxFoodRegeneration) {
            this.foodRegeneration = EnvironmentConstants.maxFoodRegeneration;
            this.foodRegenerationIncreasing = false;
        } else if (this.foodRegeneration < EnvironmentConstants.minFoodRegeneration) {
            this.foodRegeneration = EnvironmentConstants.minFoodRegeneration;
            this.foodRegenerationIncreasing = true;
        }
    }

    nextDay() {
        // remaining food from yesterday becomes uneaten food today
        this.uneatenFood = this.remainingFood;

        this.grownFood = Math.round(this.uneatenFood * EnvironmentConstants.preserveRemainingFood + this.foodRegeneration);

        this.updateSeason();

        this.remainingFood = this.grownFood;
    }
}
