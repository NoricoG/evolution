import { Chromosome } from "./chromosome.js";
import { Gene } from "./gene.js";

export class Traits {
    static groups = [
        [
            "strength",
            "speed",
            "agility"
        ]
    ]

    static headerString = "💪🏃‍♂️🤸🏼‍♂️";

    chromosome: Chromosome;

    energyNeed: number;
    nutritionalValue: number;

    constructor(genes: { [key: string]: Gene }) {
        this.chromosome = new Chromosome(Traits.groups, genes);

        this.energyNeed = 1 + this.get("strength") / 2;
        this.nutritionalValue = this.energyNeed * 2;
    }

    toString(): string {
        return this.chromosome.toString();
    }

    mutate(): Traits {
        const mutatedChromosome = this.chromosome.mutate();
        return new Traits(mutatedChromosome.genes);
    }

    static random(): Traits {
        const chromosome = Chromosome.random(Traits.groups);
        return new Traits(chromosome.genes);
    }

    get(trait: string): number {
        return this.chromosome.genes[trait].value!;
    }

    canEscape(predator: Traits): boolean {
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
