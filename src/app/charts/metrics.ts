import { Environment } from "../../simulation/environment";
import { Individual } from "../../simulation/individual";
import { State } from "../../simulation/state";

export class SimulationMetrics {
    dayMetrics: DayMetrics[] = [];

    addDayMetrics(state: State, actionMetrics: ActionMetrics) {
        this.dayMetrics.push(new DayMetrics(state, actionMetrics));
        if (this.dayMetrics.length > 500) {
            this.dayMetrics.shift();
        }
    }
}

export class DayMetrics {
    readonly day: number;
    readonly population: PopulationMetrics;
    readonly eatenStarved: EatenStarvedMetrics;
    readonly food: FoodMetrics;
    readonly age: AgeMetrics;
    readonly offspring: OffspringMetrics;
    readonly genetics: GeneticsMetrics;
    readonly dietDistribution: DietDistributionMetrics;
    readonly actions: ActionMetrics;

    constructor(state: State, actionMetrics: ActionMetrics) {
        const living = state.individuals.filter(i => !i.deathDay);
        const dead = state.individuals.filter(i => i.deathDay);

        this.day = state.day;
        this.population = new PopulationMetrics(state.day, state.individuals, living, dead);
        this.eatenStarved = new EatenStarvedMetrics(dead);
        this.food = new FoodMetrics(state.environment);
        this.age = new AgeMetrics(state.day, living, dead);
        this.offspring = new OffspringMetrics(living);
        this.genetics = new GeneticsMetrics(state);
        this.dietDistribution = new DietDistributionMetrics(living);
        this.actions = actionMetrics;
    }
}

export class PopulationMetrics {
    readonly alive: number;
    readonly born: number;
    readonly dead: number;

    constructor(day: number, all: Individual[], living: Individual[], dead: Individual[]) {
        this.alive = living.length;
        this.born = all.filter(i => i.birthday === day).length;
        this.dead = dead.length;
    }
}

export class EatenStarvedMetrics {
    readonly eaten: number;
    readonly starved: number;

    readonly eatenHerbivore: number;
    readonly eatenOmnivore: number;
    readonly eatenCarnivore: number;

    readonly starvedHerbivore: number;
    readonly starvedOmnivore: number;
    readonly starvedCarnivore: number;

    constructor(dead: Individual[]) {
        this.eaten = dead.filter(i => i.eaten).length;
        this.starved = dead.filter(i => i.starved).length;

        const herbivores = dead.filter(i => i.brain.plantOrMeat.value < 1 / 3);
        const omnivores = dead.filter(i => i.brain.plantOrMeat.value >= 1 / 3 && i.brain.plantOrMeat.value <= 2 / 3);
        const carnivores = dead.filter(i => i.brain.plantOrMeat.value > 2 / 3);

        this.eatenHerbivore = herbivores.filter(i => i.eaten).length;
        this.eatenOmnivore = omnivores.filter(i => i.eaten).length;
        this.eatenCarnivore = carnivores.filter(i => i.eaten).length;

        this.starvedOmnivore = omnivores.filter(i => i.starved).length;
        this.starvedHerbivore = herbivores.filter(i => i.starved).length;
        this.starvedCarnivore = carnivores.filter(i => i.starved).length;
    }
}

export class FoodMetrics {
    readonly uneaten: number;
    readonly grown: number;
    readonly remaining: number;

    constructor(environment: Environment) {
        this.uneaten = environment.uneatenFood;
        this.grown = environment.grownFood;
        this.remaining = environment.remainingFood;
    }
}

export class AgeMetrics {
    readonly averageLiving: number | null;
    readonly oldest: number | null;

    readonly averageDeath: number | null;
    readonly oldestDeath: number | null;

    constructor(day: number, living: Individual[], dead: Individual[]) {
        if (living.length > 0) {
            const ages = living.map(i => i.getAge(day));
            const sortedAges = [...ages].sort((a, b) => b - a);

            this.averageLiving = ages.reduce((a, b) => a + b, 0) / ages.length;
            this.oldest = sortedAges[0];
        } else {
            this.averageLiving = null;
            this.oldest = null;
        }

        if (dead.length > 0) {
            const deathAges = dead.map(i => i.getAge(day));

            this.averageDeath = deathAges.reduce((a, b) => a + b, 0) / deathAges.length;
            this.oldestDeath = Math.max(...deathAges);
        } else {
            this.averageDeath = null;
            this.oldestDeath = null;
        }
    }
}

export class OffspringMetrics {
    readonly averageAlive: number | null;
    readonly averageTotal: number | null;
    readonly maxAlive: number | null;
    readonly maxTotal: number | null;

    constructor(living: Individual[]) {
        if (living.length > 0) {
            const aliveOffspring = living.map(i => i.getOffspringSum(false));
            const totalOffspring = living.map(i => i.getOffspringSum(true));
            this.averageAlive = aliveOffspring.reduce((a, b) => a + b, 0) / aliveOffspring.length;
            this.averageTotal = totalOffspring.reduce((a, b) => a + b, 0) / totalOffspring.length;
            this.maxAlive = Math.max(...aliveOffspring);
            this.maxTotal = Math.max(...totalOffspring);
        } else {
            this.averageAlive = null;
            this.averageTotal = null;
            this.maxAlive = null;
            this.maxTotal = null;
        }
    }
}

export class GeneticsMetrics {
    readonly eatOrReproduce: GeneMetrics;
    readonly plantOrMeat: GeneMetrics;

    constructor(state: State) {
        this.eatOrReproduce = new GeneMetrics(state.individuals.map(i => i.brain.eatOrReproduce.bucket));
        this.plantOrMeat = new GeneMetrics(state.individuals.map(i => i.brain.plantOrMeat.bucket));
    }
}

export class GeneMetrics {
    counts: number[];

    constructor(buckets: number[]) {
        this.counts = [];

        for (let i = 1; i <= 9; i++) {
            this.counts.push(0);
        }

        for (const bucket of buckets) {
            this.counts[bucket - 1]++;
        }
    }
}

export class DietDistributionMetrics {
    readonly herbivore: number;
    readonly omnivore: number;
    readonly carnivore: number;

    constructor(living: Individual[]) {
        this.herbivore = 0;
        this.omnivore = 0;
        this.carnivore = 0;

        if (living.length === 0) {
            return;
        }

        for (const individual of living) {
            const amountCarnivore = individual.brain.plantOrMeat.value;

            if (amountCarnivore < 1 / 3) {
                this.herbivore++;
            } else if (amountCarnivore > 2 / 3) {
                this.carnivore++;
            } else {
                this.omnivore++;
            }
        }
    }
}

export class ActionMetrics {
    eatPlantSuccess = 0;
    eatPlantFail = 0;
    eatMeatSuccess = 0;
    eatMeatFail = 0;
    offspringCounts: number[] = [];
    wait = 0;
}
