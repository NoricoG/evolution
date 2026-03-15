import { Environment } from "@simulation/environment.js";
import { Individual } from "@simulation/individual.js";
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

    logGrowUp() { this.latestDayMetrics.logGrowUp(); }
    logLearn() { this.latestDayMetrics.logLearn(); }
    logPlantSearch(succesful: boolean) { this.latestDayMetrics.logPlantSearch(succesful); }
    logHunt(succesful: boolean) { this.latestDayMetrics.logHunt(succesful); }
    logReproduce(count: number) { this.latestDayMetrics.logReproduce(count); }

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

    logGrowUp() { this.actions.logGrowUp(); }
    logLearn() { this.actions.logLearn(); }
    logPlantSearch(succesful: boolean) { this.actions.logPlantSearch(succesful); }
    logHunt(succesful: boolean) { this.actions.logHunt(succesful); }
    logReproduce(count: number) { this.actions.logReproduce(count); }

    calculateRemainingMetrics(state: State) {
        const living = state.individuals.filter(i => i.deathDay == null);
        const dead = state.individuals.filter(i => i.deathDay != null);
        const starved = dead.filter(i => i.starved);
        const eaten = dead.filter(i => i.eaten);

        this.day = state.day;
        this.population.calculate(state.day, state.individuals, living, dead, eaten, starved);
        this.food.calculate(state.environment);
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
    uneaten: number = 0;
    grown: number = 0;
    remaining: number = 0;

    calculate(environment: Environment) {
        this.uneaten = environment.uneatenFood;
        this.grown = environment.grownFood;
        this.remaining = environment.remainingFood;
    }
}

export class GeneticsMetrics {
    surviveOrLearn: GeneMetrics = new GeneMetrics();
    eatOrReproduce: GeneMetrics = new GeneMetrics();
    plantOrMeat: GeneMetrics = new GeneMetrics();

    plantSearchSkill: GeneMetrics = new GeneMetrics();
    huntSkill: GeneMetrics = new GeneMetrics();

    alertnessTrait: GeneMetrics = new GeneMetrics();
    sizeTrait: GeneMetrics = new GeneMetrics();

    calculate(state: State) {
        for (const individual of state.individuals) {
            if (individual.deathDay != null) {
                continue;
            }

            this.surviveOrLearn.counts[individual.brain.surviveOrLearn.bucket - 1]++;
            this.eatOrReproduce.counts[individual.brain.eatOrReproduce.bucket - 1]++;
            this.plantOrMeat.counts[individual.brain.plantOrMeat.bucket - 1]++;

            this.plantSearchSkill.counts[individual.skills.plantSearch.bucket - 1]++;
            this.huntSkill.counts[individual.skills.hunt.bucket - 1]++;

            this.alertnessTrait.counts[individual.traits.alertness.bucket - 1]++;
            this.sizeTrait.counts[individual.traits.size.bucket - 1]++;
        }
    }
}

export class GeneMetrics {
    counts: number[];

    constructor() {
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
            const bucket = individual.brain.plantOrMeat.bucket;
            this.bucketCounts[bucket - 1]++;
        }
    }
}

export class ActionMetrics {
    growUp = 0;

    learn = 0;
    survive = 0;

    reproduce = 0;
    offspringCounts: number[] = [];

    eat = 0;
    plantSearch = 0;
    hunt = 0;

    plantSearchSuccess = 0;
    plantSearchFail = 0;
    huntSuccess = 0;
    huntFail = 0;

    logGrowUp() {
        this.growUp++;
    }

    logLearn() {
        this.learn++;
    }

    logPlantSearch(succesful: boolean) {
        this.survive++;
        this.eat++;
        this.plantSearch++;
        if (succesful) {
            this.plantSearchSuccess++;
        } else {
            this.plantSearchFail++;
        }
    }

    logHunt(succesful: boolean) {
        this.survive++;
        this.eat++;
        this.hunt++;
        if (succesful) {
            this.huntSuccess++;
        } else {
            this.huntFail++;
        }
    }

    logReproduce(count: number) {
        this.survive++;
        this.reproduce++;
        this.offspringCounts.push(count);
    }
}
