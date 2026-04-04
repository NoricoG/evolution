import { Chromosome } from "@simulation/genetics/chromosome.js";
import { Individual } from "@simulation/individual.js";
import { Space } from "@simulation/space.js";
import { State } from "@simulation/state.js";

export class SimulationMetrics {
    latestDayMetrics: DayMetrics = new DayMetrics();
    dayMetrics: DayMetrics[] = [this.latestDayMetrics];

    addnewDay() {
        this.latestDayMetrics = new DayMetrics();
        this.dayMetrics.push(this.latestDayMetrics);
    }

    flush(): DayMetrics[] {
        const flushed = this.dayMetrics;
        this.dayMetrics = [];
        return flushed;
    }

    calculateRemainingMetrics(state: State) {
        this.latestDayMetrics.calculateRemainingMetrics(state);
    }
}

export class DayMetrics {
    day: number = 0;
    population: PopulationMetrics = new PopulationMetrics();
    food: FoodMetrics = new FoodMetrics();
    genetics: GeneticsMetrics = new GeneticsMetrics();
    dietDistribution: DietDistributionMetrics = new DietDistributionMetrics();
    starvedDietDistribution: DietDistributionMetrics = new DietDistributionMetrics();
    eatenDietDistribution: DietDistributionMetrics = new DietDistributionMetrics();
    readonly actions: ActionMetrics = new ActionMetrics();

    calculateRemainingMetrics(state: State) {
        const living = state.individuals.filter(i => i.deathDay == null);
        const dead = state.individuals.filter(i => i.deathDay != null);
        const starved = dead.filter(i => i.starved);
        const eaten = dead.filter(i => i.eaten);

        this.day = state.day;
        this.population.calculate(state.day, state.individuals, living, dead, eaten, starved);
        this.food.calculate(state.space);
        this.genetics.calculate(state);
        this.dietDistribution.calculate(living);
        this.starvedDietDistribution.calculate(starved);
        this.eatenDietDistribution.calculate(eaten);
    }
}

export class PopulationMetrics {
    alive: number = 0;
    born: number = 0;
    dead: number = 0;
    eaten: number = 0;
    starved: number = 0;

    calculate(day: number, all: Individual[], living: Individual[], dead: Individual[], eaten: Individual[] = [], starved: Individual[] = []) {
        this.alive = living.length;
        this.born = all.filter(i => i.birthday === day).length;
        this.dead = dead.length;
        this.eaten = eaten.length;
        this.starved = starved.length;
    }
}

export class FoodMetrics {
    plantDensity: number = 0;

    calculate(space: Space) {
        // calculate average plant value across all tiles
        let totalPlants = 0;
        let count = 0;

        for (let x = 0; x < space.width; x++) {
            for (let y = 0; y < space.height; y++) {
                totalPlants += space.plants[x][y];
                count++;
            }
        }

        this.plantDensity = count > 0 ? totalPlants / count : 0;
    }
}

export class GeneticsMetrics {

    chromosomes: ChromosomeMetrics[] = [];

    constructor() {
        for (const chromosome of Individual.allChromosomes) {
            this.chromosomes.push(new ChromosomeMetrics(chromosome.toString(), chromosome.geneKeys));
        }
    }

    calculate(state: State) {
        for (const individual of state.individuals) {
            if (individual.deathDay != null) {
                continue;
            }

            const chromosomes = [individual.brain, individual.diet, individual.traits, individual.skills];
            for (let i = 0; i < chromosomes.length; i++) {
                this.chromosomes[i].calculate(chromosomes[i]);
            }
        }
    }
}

export class ChromosomeMetrics {
    genes: GeneMetrics[] = [];
    name: string = "";

    constructor(name: string, geneNames: string[]) {
        this.name = name;

        for (const geneName of geneNames) {
            this.genes.push(new GeneMetrics(geneName));
        }
    }

    calculate(chromosome: Chromosome) {
        const geneKeys = Object.keys(chromosome.genes);
        for (let i = 0; i < geneKeys.length; i++) {
            const gene = chromosome.genes[geneKeys[i]];
            this.genes[i].counts[gene.bucket - 1]++;
        }
    }
}

export class GeneMetrics {
    name: string = "";
    counts: number[];

    constructor(name: string) {
        this.name = name;
        this.counts = [];
        for (let i = 1; i <= 9; i++) {
            this.counts.push(0);
        }
    }
}

export class DietDistributionMetrics {
    bucketCounts: number[];

    constructor() {
        this.bucketCounts = [];
        for (let i = 0; i < 9; i++) {
            this.bucketCounts[i] = 0;
        }
    }

    calculate(living: Individual[]) {
        for (const individual of living) {
            const bucket = individual.diet.meat.bucket;
            this.bucketCounts[bucket - 1]++;
        }
    }
}

export class ActionMetrics {
    idle = 0;
    growUp = 0;

    move = 0;

    eat = 0;
    plantSearch = 0;
    hunt = 0;

    plantSearchSuccess = 0;
    plantSearchFail = 0;
    huntSuccess = 0;
    huntFail = 0;

    reproduce = 0;
    offspringCounts: number[] = [];

    logGrowUp() {
        this.growUp++;
    }

    logIdle() {
        this.idle++;
    }

    logMove() {
        this.move++;
    }

    logPlantSearch(succesful: boolean) {
        this.eat++;
        this.plantSearch++;
        if (succesful) {
            this.plantSearchSuccess++;
        } else {
            this.plantSearchFail++;
        }
    }

    logHunt(succesful: boolean) {
        this.eat++;
        this.hunt++;
        if (succesful) {
            this.huntSuccess++;
        } else {
            this.huntFail++;
        }
    }

    logReproduce(count: number) {
        this.reproduce++;
        this.offspringCounts.push(count);
    }
}
