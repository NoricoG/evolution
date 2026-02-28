"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Chromosome = void 0;
const gene_js_1 = require("./gene.js");
class Chromosome {
    groups;
    genes;
    constructor(groups, genes) {
        this.groups = groups;
        this.genes = genes;
    }
    toString() {
        return this.groups.map(group => group.map(key => this.genes[key].toString()).join("")).join("-");
    }
    static random(groups) {
        const genes = {};
        for (const group of groups) {
            for (const key of group) {
                genes[key] = gene_js_1.Gene.random();
            }
        }
        return new Chromosome(groups, genes);
    }
    mutate() {
        const newGenes = Object.entries(this.genes).map(([key, gene]) => {
            return [key, gene.mutate()];
        });
        return new Chromosome(this.groups, Object.fromEntries(newGenes));
    }
    static similar(chromosomeA, chromosomeB, margin) {
        for (const group of chromosomeA.groups) {
            for (const key of group) {
                const geneA = chromosomeA.genes[key];
                const geneB = chromosomeB.genes[key];
                // TODO: finetune this logic
                if (gene_js_1.Gene.difference(geneA, geneB) > margin) {
                    return false;
                }
            }
        }
        return true;
    }
}
exports.Chromosome = Chromosome;
;
