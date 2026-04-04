import { RelativeChromosome } from "@simulation/genetics/chromosome.js";
import { Gene } from "@simulation/genetics/gene.js";

export enum DietGenes {
    Plant = "Plant",
    Meat = "Meat",
}

export class Diet extends RelativeChromosome {

    static readonly chromosomeName = "Diet";
    static readonly geneKeys = Object.values(DietGenes);

    static neutral(): Diet {
        const neutralGenes: Record<string, Gene> = {};
        neutralGenes[DietGenes.Plant] = new Gene(1);
        neutralGenes[DietGenes.Meat] = new Gene(0);
        return new Diet(neutralGenes);
    }

    get plant(): Gene {
        return this.genes[DietGenes.Plant];
    }

    get meat(): Gene {
        return this.genes[DietGenes.Meat];
    }
}
