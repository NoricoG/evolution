import { Gene } from "./gene.js";

export class Chromosome {

    static geneKeys: string[] = [];
    static geneLabels: string = "";

    genes: { [key: string]: Gene };

    constructor(genes: { [key: string]: Gene }) {
        this.genes = genes;
    }

    toString(): string {
        return Object.keys(this.genes).map(key => this.genes[key].toString()).join("");
    }

    get(gene: string): number {
        return this.genes[gene].value;
    }

    mutatedGenes(): { [key: string]: Gene } {
        const newGenes: { [key: string]: Gene } = {};
        for (const key of Object.keys(this.genes)) {
            newGenes[key] = this.genes[key].mutate();
        }

        return newGenes;
    }

    static randomGenes(keys: string[]): { [key: string]: Gene } {
        const genes: { [key: string]: Gene } = {};
        for (const key of keys) {
            genes[key] = Gene.random();
        }
        return genes;
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
