import { EnvironmentConstants } from "./constants";

export class Environment {
    uneatenFood: number;
    grownFood: number;
    remainingFood: number;

    readonly maxFood: number;

    constructor(maxFood: number) {
        this.maxFood = maxFood;

        this.uneatenFood = -1;
        this.grownFood = -1;
        this.remainingFood = 0;
        this.nextDay();
    }

    toFoodString(): string {
        return `${this.uneatenFood} -> ${this.grownFood} -> ${this.remainingFood}`;
    }

    nextDay() {
        // remaining food from yesterday becomes uneaten food today
        this.uneatenFood = this.remainingFood;

        const possibleGrowth = this.maxFood - this.uneatenFood;
        this.grownFood = Math.round(this.uneatenFood * EnvironmentConstants.preserveRemainingFood + EnvironmentConstants.foodRegeneration);

        this.remainingFood = this.grownFood;
    }
}
