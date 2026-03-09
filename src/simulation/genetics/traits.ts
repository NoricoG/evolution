import { Chromosome } from "./chromosome.js";

export enum TraitGenes {
    Strength = "strength",
    Speed = "speed",
    Agility = "agility"
}

// currently not used
export class Traits extends Chromosome {
    static readonly geneKeys = Object.values(TraitGenes);

    canEscape(predator: Traits): boolean {
        for (const trait of Traits.geneKeys) {
            const preyValue = this.genes[trait];
            const predatorValue = predator.genes[trait];
            if (preyValue > predatorValue) {
                return true;
            }
        }
        return false;
    }
}
