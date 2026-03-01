import { Chromosome } from "./chromosome.js";

export enum TraitGenes {
    Strength = "strength",
    Speed = "speed",
    Agility = "agility"
}

// currently not used
export class Traits extends Chromosome {
    static geneKeys = Object.values(TraitGenes);
    static geneLabels = "💪🏃‍♂️🤸🏼‍♂️";

    canEscape(predator: Traits): boolean {
        for (const trait of Traits.geneKeys) {
            const preyValue = this.get(trait);
            const predatorValue = predator.get(trait);
            if (preyValue > predatorValue) {
                return true;
            }
        }
        return false;
    }
}
