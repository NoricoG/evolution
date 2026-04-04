import { EnvironmentConstants } from "@simulation/constants.js";
import { Space } from "@simulation/space.js";

export class Environment {
    // foodRegeneration: number;
    // foodRegenerationIncreasing: boolean;

    space: Space;

    constructor(space: Space) {
        this.space = space;

        // this.foodRegeneration = Math.random() * (EnvironmentConstants.maxFoodRegeneration - EnvironmentConstants.minFoodRegeneration) + EnvironmentConstants.minFoodRegeneration;
        // this.foodRegenerationIncreasing = Math.random() < 0.5;

        this.nextDay();
    }

    // updateSeason() {
    //     this.foodRegeneration += this.foodRegenerationIncreasing ? EnvironmentConstants.stepFoodRegeneration : -EnvironmentConstants.stepFoodRegeneration;
    //     if (this.foodRegeneration > EnvironmentConstants.maxFoodRegeneration) {
    //         this.foodRegeneration = EnvironmentConstants.maxFoodRegeneration;
    //         this.foodRegenerationIncreasing = false;
    //     } else if (this.foodRegeneration < EnvironmentConstants.minFoodRegeneration) {
    //         this.foodRegeneration = EnvironmentConstants.minFoodRegeneration;
    //         this.foodRegenerationIncreasing = true;
    //     }
    // }

    nextDay() {
        // increase plant value in every tile
        for (let x = 0; x < this.space.width; x++) {
            for (let y = 0; y < this.space.height; y++) {
                this.space.plants[x][y] = Math.min(1, this.space.plants[x][y] + EnvironmentConstants.plantGrowthPerTile);
            }
        }

        // this.updateSeason();
    }
}
