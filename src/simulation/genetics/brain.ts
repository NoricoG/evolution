import { RelativeChromosome } from "@simulation/genetics/chromosome.js";
import { Gene } from "@simulation/genetics/gene.js";

export enum BrainGenes {
    Move = "Move",
    Eat = "Eat",
    Reproduce = "Reproduce",
}

export class Brain extends RelativeChromosome {

    static readonly chromosomeName = "Brain";
    static readonly geneKeys = Object.values(BrainGenes);

    static neutral(): Brain {
        const neutralGenes: Record<string, Gene> = {};
        neutralGenes[BrainGenes.Move] = new Gene(2 / 9);
        neutralGenes[BrainGenes.Eat] = new Gene(5 / 9);
        neutralGenes[BrainGenes.Reproduce] = new Gene(2 / 9);
        return new Brain(neutralGenes);
    }

    get move(): Gene {
        return this.genes[BrainGenes.Move];
    }

    get eat(): Gene {
        return this.genes[BrainGenes.Eat];
    }

    get reproduce(): Gene {
        return this.genes[BrainGenes.Reproduce];
    }
}
