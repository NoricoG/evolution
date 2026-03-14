import { Chromosome } from "@simulation/genetics/chromosome.js";
import { Gene } from "@simulation/genetics/gene.js";

export enum BrainGenes {
    SurviveOrLearn = "SurviveOrLearn",
    EatOrReproduce = "EatOrReproduce",
    PlantOrMeat = "PlantOrMeat",
}

export class Brain extends Chromosome {

    static readonly geneKeys = Object.values(BrainGenes);

    static neutral(): Brain {
        const neutralGenes: Record<string, Gene> = {};
        neutralGenes[BrainGenes.SurviveOrLearn] = new Gene(1 / 9);
        neutralGenes[BrainGenes.PlantOrMeat] = new Gene(3 / 9);
        neutralGenes[BrainGenes.EatOrReproduce] = new Gene(3 / 9);
        return new Brain(neutralGenes);
    }

    get surviveOrLearn(): Gene {
        return this.genes[BrainGenes.SurviveOrLearn];
    }

    get plantOrMeat(): Gene {
        return this.genes[BrainGenes.PlantOrMeat];
    }

    get eatOrReproduce(): Gene {
        return this.genes[BrainGenes.EatOrReproduce];
    }
}
