"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Traits = void 0;
const chromosome_js_1 = require("./chromosome.js");
class Traits {
    static groups = [
        [
            "strength",
            "speed"
        ]
    ];
    static headerString = "💪🏃‍♂️";
    chromosome;
    energyNeed;
    nutritionalValue;
    constructor(genes) {
        this.chromosome = new chromosome_js_1.Chromosome(Traits.groups, genes);
        this.energyNeed = 1 + this.get("strength") / 2;
        this.nutritionalValue = this.energyNeed * 2;
    }
    toString() {
        return this.chromosome.toString();
    }
    mutate() {
        const mutatedChromosome = this.chromosome.mutate();
        return new Traits(mutatedChromosome.genes);
    }
    static random() {
        const chromosome = chromosome_js_1.Chromosome.random(Traits.groups);
        return new Traits(chromosome.genes);
    }
    get(trait) {
        return this.chromosome.genes[trait].value;
    }
    canEscape(predator) {
        for (const group of Traits.groups) {
            for (const trait of group) {
                const preyValue = this.get(trait);
                const predatorValue = predator.get(trait);
                if (preyValue > predatorValue) {
                    return true;
                }
            }
        }
        return false;
    }
}
exports.Traits = Traits;
