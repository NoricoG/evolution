import { Gene } from "./gene.js";

export class Chromosome {
    groups: string[][];
    genes: { [key: string]: Gene };

    constructor(groups: string[][], genes: { [key: string]: Gene }) {
        this.groups = groups;
        this.genes = genes;
    }

    toString(): string {
        return this.groups.map(group => group.map(key => this.genes[key].toString()).join("")).join("-");
    }

    static random(groups: string[][]): Chromosome {
        const genes: { [key: string]: Gene } = {};
        for (const group of groups) {
            for (const key of group) {
                genes[key] = Gene.random();
            }
        }
        return new Chromosome(groups, genes);
    }

    mutate(): Chromosome {
        const newGenes = Object.entries(this.genes).map(([key, gene]) => {
            return [key, gene.mutate()];
        });
        return new Chromosome(this.groups, Object.fromEntries(newGenes));
    }

    static similar(chromosomeA: Chromosome, chromosomeB: Chromosome, margin: number): boolean {
        for (const group of chromosomeA.groups) {
            for (const key of group) {
                const geneA = chromosomeA.genes[key];
                const geneB = chromosomeB.genes[key];
                // TODO: finetune this logic
                if (Gene.difference(geneA, geneB) > margin) {
                    return false;
                }
            }
        }
        return true;
    }
};
