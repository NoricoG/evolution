import { Chromosome } from "@simulation/genetics/chromosome.js";
import { Gene } from "@simulation/genetics/gene.js";

export enum TraitGenes {
    Alertness = "Alertness",
    Size = "Size",
}

export class Traits extends Chromosome {
    static readonly geneKeys = Object.values(TraitGenes);

    static neutral(): Traits {
        const genes: { [key: string]: Gene } = {};
        genes[TraitGenes.Alertness] = new Gene(1 / 9);
        genes[TraitGenes.Size] = new Gene(1 / 9);
        return new Traits(genes);
    }

    get alertness(): Gene {
        return this.genes[TraitGenes.Alertness];
    }

    get size(): Gene {
        return this.genes[TraitGenes.Size];
    }
}
