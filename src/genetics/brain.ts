import { Chromosome } from "./chromosome.js";
import { Gene } from "./gene.js";

export enum BrainGenes {
    EatOrReproduce = "EatOrReproduce",
    PlantOrMeat = "PlantOrMeat",
}

export class Brain extends Chromosome {

    static readonly geneKeys = Object.values(BrainGenes);

    static neutral(): Brain {
        const neutralGenes: Record<string, Gene> = {};
        for (const key of Brain.geneKeys) {
            neutralGenes[key] = new Gene(0.5);
        }
        return new Brain(neutralGenes);
    }

    get eatOrReproduce(): Gene {
        return this.genes[BrainGenes.EatOrReproduce];
    }

    get plantOrMeat(): Gene {
        return this.genes[BrainGenes.PlantOrMeat];
    }
}
