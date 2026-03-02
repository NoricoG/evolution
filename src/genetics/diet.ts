import { Chromosome } from "./chromosome.js";
import { Gene } from "./gene.js";



export enum DietGenes {
    Herbivore = "Herbivore",
    Carnivore = "Carnivore",
}

export class Diet extends Chromosome {
    static readonly geneKeys = Object.values(DietGenes);
    static readonly geneLabels = "🥕🥩"

    readonly makeRelative = true;

    constructor(genes: { [key: string]: Gene }) {
        super(genes);
    }

    static neutral(): Diet {
        const neutralGenes: Record<string, Gene> = {};
        for (const key of Diet.geneKeys) {
            neutralGenes[key] = new Gene(0.5);
        }
        return new Diet(neutralGenes);
    }
}
