import { Gene } from "@simulation/genetics/gene.js";

export class Chromosome {

    static readonly chromosomeName: string = "";
    static readonly geneKeys: string[] = [];

    readonly genes: { [key: string]: Gene };

    constructor(genes: { [key: string]: Gene }) {
        this.genes = genes;
    }

    toString(): string {
        return Object.keys(this.genes).map(key => this.genes[key].toString()).join("");
    }

    mutatedCopy(invert: boolean): this {
        const newGenes: { [key: string]: Gene } = {};
        for (const key of Object.keys(this.genes)) {
            newGenes[key] = this.genes[key].mutated(invert);
        }
        return new (this.constructor as new (genes: { [key: string]: Gene }) => this)(newGenes);
    }

    static similar(chromosomeA: Chromosome, chromosomeB: Chromosome, maxTotalSteps: number): boolean {
        let totalSteps = 0;
        for (const key of Object.keys(chromosomeA.genes)) {
            const geneA = chromosomeA.genes[key];
            const geneB = chromosomeB.genes[key];
            totalSteps += Gene.bucketDifference(geneA, geneB);
        }
        return totalSteps <= maxTotalSteps;
    }
};


export class RelativeChromosome extends Chromosome {
    constructor(genes: { [key: string]: Gene }) {
        super(genes);
        this.scaleGenes();
    }

    private scaleGenes() {
        const totalValue = Object.values(this.genes).reduce((sum, gene) => sum + gene.value, 0);
        if (totalValue === 0) {
            const equalValue = 1 / Object.keys(this.genes).length;
            for (const key of Object.keys(this.genes)) {
                this.genes[key] = new Gene(equalValue);
            }
        } else {
            for (const key of Object.keys(this.genes)) {
                const gene = this.genes[key];
                this.genes[key] = new Gene(gene.value / totalValue);
            }
        }
    }
}
