import { Gene } from "./gene.js";

export class Chromosome {

    static readonly geneKeys: string[] = [];

    readonly genes: { [key: string]: Gene };

    constructor(genes: { [key: string]: Gene }) {
        this.genes = genes;
    }

    toString(): string {
        return Object.keys(this.genes).map(key => this.genes[key].toString()).join("");
    }

    mutatedCopy(): this {
        const newGenes: { [key: string]: Gene } = {};
        for (const key of Object.keys(this.genes)) {
            newGenes[key] = this.genes[key].mutated();
        }
        return new (this.constructor as new (genes: { [key: string]: Gene }) => this)(newGenes);
    }

    static similar(chromosomeA: Chromosome, chromosomeB: Chromosome, maxTotalSteps: number): boolean {
        let totalSteps = 0;
        for (const key of Object.keys(chromosomeA.genes)) {
            const geneA = chromosomeA.genes[key];
            const geneB = chromosomeB.genes[key];
            totalSteps += Gene.difference(geneA, geneB);
        }
        return totalSteps <= maxTotalSteps;
    }
};
