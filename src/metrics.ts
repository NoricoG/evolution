import { Individual } from "./individual";
import { State } from "./state";

import { Chromosome } from "./genetics/chromosome";

export class SimulationMetrics {
    dayMetrics: DayMetrics[] = [];

    addDayMetrics(state: State) {
        this.dayMetrics.push(new DayMetrics(state));
    }
}

export class DayMetrics {
    readonly day: number;

    readonly bornIndividuals: number;
    readonly aliveIndividuals: number;
    readonly deadIndividuals: number;
    readonly eatenIndividuals: number;
    readonly starvedIndividuals: number;

    readonly brainMetrics: ChromosomeMetrics;
    readonly dietMetrics: ChromosomeMetrics;

    readonly uneatenFood: number;
    readonly grownFood: number;
    readonly remainingFood: number;

    constructor(state: State) {
        this.day = state.day;

        this.bornIndividuals = state.individuals.filter(individual => individual.birthday === state.day).length;
        this.aliveIndividuals = state.individuals.filter(individual => !individual.deathDay).length;
        this.deadIndividuals = state.individuals.filter(individual => individual.deathDay).length;
        this.eatenIndividuals = state.individuals.filter(individual => individual.eaten).length;
        this.starvedIndividuals = state.individuals.filter(individual => individual.starved).length;

        this.brainMetrics = new ChromosomeMetrics(state.individuals.map(individual => individual.brain));
        this.dietMetrics = new ChromosomeMetrics(state.individuals.map(individual => individual.diet));

        this.uneatenFood = state.environment.uneatenFood;
        this.grownFood = state.environment.grownFood;
        this.remainingFood = state.environment.remainingFood;
    }
}

export class ChromosomeMetrics {
    readonly geneKeys: string;
    readonly geneCounts: { [geneKey: string]: { [bucket: number]: number } } = {};

    constructor(chromosomes: Chromosome[]) {
        this.geneKeys = Chromosome.geneLabels;

        if (chromosomes.length === 0) {
            return;
        }

        for (const key of Object.keys(chromosomes[0].genes)) {
            this.geneCounts[key] = {};
            for (let i = 0; i <= 9; i++) {
                this.geneCounts[key][i] = 0;
            }
        }

        for (const chromosome of chromosomes) {
            for (const geneKey of Object.keys(chromosome.genes)) {
                const bucket = chromosome.genes[geneKey].getBucket();
                this.geneCounts[geneKey][bucket]++;
            }
        }
    }
}
