import { Action } from "../actions/action.js";
import { Individual } from "../individual.js";

import { Chromosome } from "./chromosome.js";
import { Gene } from "./gene.js";

export enum BrainGenes {
    Eat = "Eat",
    Reproduce = "Reproduce",
}

export class Brain extends Chromosome {

    static readonly geneKeys = Object.values(BrainGenes);
    static readonly geneLabels = "😋👶";

    readonly makeRelative = true;

    static neutral(): Brain {
        const neutralGenes: Record<string, Gene> = {};
        for (const key of Brain.geneKeys) {
            neutralGenes[key] = new Gene(0.5);
        }
        return new Brain(neutralGenes);
    }
}
