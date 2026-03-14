import { Chromosome } from "@simulation/genetics/chromosome.js";
import { Gene } from "@simulation/genetics/gene.js";
import { GeneConstants } from "@simulation/constants.js";

export enum SkillsGenes {
    FindPlant = "FindPlant",
    Hunt = "Hunt",
}

export class Skills extends Chromosome {
    static readonly geneKeys = Object.values(SkillsGenes);

    static neutral(): Skills {
        const genes: { [key: string]: Gene } = {};
        genes[SkillsGenes.FindPlant] = new Gene(2 / 9);
        genes[SkillsGenes.Hunt] = new Gene(1 / 9);
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

    get findPlant(): Gene {
        return this.genes[SkillsGenes.FindPlant];
    }

    get hunt(): Gene {
        return this.genes[SkillsGenes.Hunt];
    }
}
