import { Gene } from "./gene.js";

export class Chromosome {

    static readonly geneKeys: string[] = [];
    static readonly geneLabels: string = "";

    readonly genes: { [key: string]: Gene };
    readonly makeRelative = true;

    constructor(genes: { [key: string]: Gene }) {
        if (this.makeRelative) {
            genes = Chromosome.makeRelative(genes);
        }
        this.genes = genes;
    }

    toString(): string {
        return Object.keys(this.genes).map(key => this.genes[key].toString()).join("");
    }

    get(gene: string): number {
        return this.genes[gene].value;
    }

    mutatedCopy(): this {
        const newGenes: { [key: string]: Gene } = {};
        for (const key of Object.keys(this.genes)) {
            newGenes[key] = this.genes[key].mutated();
        }
        return new (this.constructor as new (genes: { [key: string]: Gene }) => this)(newGenes);
    }

    static makeRelative(genes: { [key: string]: Gene }): { [key: string]: Gene } {
        const total = Object.values(genes).reduce((sum, gene) => sum + gene.value, 0);
        if (total === 0) {
            return genes;
        }

        const relativeGenes: { [key: string]: Gene } = {};
        for (const key of Object.keys(genes)) {
            relativeGenes[key] = new Gene(genes[key].value / total);
        }
        return relativeGenes;
    }

    static similar(chromosomeA: Chromosome, chromosomeB: Chromosome, stepsMargin: number): boolean {
        for (const key of Object.keys(chromosomeA.genes)) {
            const geneA = chromosomeA.genes[key];
            const geneB = chromosomeB.genes[key];
            // TODO: finetune this logic
            if (Gene.difference(geneA, geneB) > stepsMargin) {
                return false;
            }
        }
        return true;
    }
};
