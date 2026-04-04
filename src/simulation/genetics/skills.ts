import { RelativeChromosome } from "@simulation/genetics/chromosome.js";
import { Gene } from "@simulation/genetics/gene.js";
import { GeneConstants } from "@simulation/constants.js";

export enum SkillsGenes {
    PlantSearch = "PlantSearch",
    Hunt = "Hunt",
}

export class Skills extends RelativeChromosome {
    static readonly chromosomeName = "Skills";
    static readonly geneKeys = Object.values(SkillsGenes);

    static neutral(): Skills {
        const genes: { [key: string]: Gene } = {};
        genes[SkillsGenes.PlantSearch] = new Gene(1 / 2);
        genes[SkillsGenes.Hunt] = new Gene(1 / 2);
        return new Skills(genes);
    }

    learnRandom() {
        const randomKey = Skills.geneKeys[Math.floor(Math.random() * Skills.geneKeys.length)];
        let newValue = this.genes[randomKey].value + GeneConstants.learnImprovement;
        if (newValue > 1) {
            newValue = 1;
        }

        this.genes[randomKey] = new Gene(newValue);
    }

    get plantSearch(): Gene {
        return this.genes[SkillsGenes.PlantSearch];
    }

    get hunt(): Gene {
        return this.genes[SkillsGenes.Hunt];
    }
}
