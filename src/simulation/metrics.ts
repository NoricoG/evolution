import { EatMeatAction, EatPlantAction, LearnSkillAction, ReproduceAction, WaitAction } from "@simulation/actions/action.js";
import { Action } from "@simulation/actions/activity.js";
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

    logAction(action: Action, succesful: boolean) {
        this.latestDayMetrics.actions.logAction(action, succesful);
    }

    calculateRemainingMetrics(state: State) {
        this.latestDayMetrics.calculateRemainingMetrics(state);
    }
}

export class DayMetrics {
    day: number = 0;
    population: PopulationMetrics = new PopulationMetrics();
    eatenStarved: EatenStarvedMetrics = new EatenStarvedMetrics();
    food: FoodMetrics = new FoodMetrics();
    age: AgeMetrics = new AgeMetrics();
    offspring: OffspringMetrics = new OffspringMetrics();
    genetics: GeneticsMetrics = new GeneticsMetrics();
    dietDistribution: DietDistributionMetrics = new DietDistributionMetrics();
    readonly actions: ActionMetrics = new ActionMetrics();

    logAction(action: Action, succesful: boolean) {
        this.actions.logAction(action, succesful);
    }

    calculateRemainingMetrics(state: State) {
        const living = state.individuals.filter(i => i.deathDay == null);
        const dead = state.individuals.filter(i => i.deathDay != null);

        this.day = state.day;
        this.population.calculate(state.day, state.individuals, living, dead);
        this.eatenStarved.calculate(dead);
        this.food.calculate(state.environment);
        this.age.calculate(state.day, living, dead);
        this.offspring.calculate(living);
        this.genetics.calculate(state);
        this.dietDistribution.calculate(living);
    }
}

export class PopulationMetrics {
    alive: number = 0;
    born: number = 0;
    dead: number = 0;

    calculate(day: number, all: Individual[], living: Individual[], dead: Individual[]) {
        this.alive = living.length;
        this.born = all.filter(i => i.birthday === day).length;
        this.dead = dead.length;
    }
}

export class EatenStarvedMetrics {
    eaten: number = 0;
    starved: number = 0;

    eatenHerbivore: number = 0;
    eatenOmnivore: number = 0;
    eatenCarnivore: number = 0;

    starvedHerbivore: number = 0;
    starvedOmnivore: number = 0;
    starvedCarnivore: number = 0;

    calculate(dead: Individual[]) {
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
    uneaten: number = 0;
    grown: number = 0;
    remaining: number = 0;

    calculate(environment: Environment) {
        this.uneaten = environment.uneatenFood;
        this.grown = environment.grownFood;
        this.remaining = environment.remainingFood;
    }
}

export class AgeMetrics {
    averageLiving: number | null = null;
    oldest: number | null = null;

    averageDeath: number | null = null;
    oldestDeath: number | null = null;

    calculate(day: number, living: Individual[], dead: Individual[]) {
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
    averageAlive: number | null = null;
    averageTotal: number | null = null;
    maxAlive: number | null = null;
    maxTotal: number | null = null;

    calculate(living: Individual[]) {
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
    surviveOrLearn: GeneMetrics = new GeneMetrics();
    eatOrReproduce: GeneMetrics = new GeneMetrics();
    plantOrMeat: GeneMetrics = new GeneMetrics();

    findPlantSkill: GeneMetrics = new GeneMetrics();
    huntSkill: GeneMetrics = new GeneMetrics();

    alertnessTrait: GeneMetrics = new GeneMetrics();
    sizeTrait: GeneMetrics = new GeneMetrics();

    calculate(state: State) {
        this.surviveOrLearn.calculate(state.individuals.map(i => i.brain.surviveOrLearn.bucket));
        this.eatOrReproduce.calculate(state.individuals.map(i => i.brain.eatOrReproduce.bucket));
        this.plantOrMeat.calculate(state.individuals.map(i => i.brain.plantOrMeat.bucket));

        this.findPlantSkill.calculate(state.individuals.map(i => i.skills.findPlant.bucket));
        this.huntSkill.calculate(state.individuals.map(i => i.skills.hunt.bucket));

        this.alertnessTrait.calculate(state.individuals.map(i => i.traits.alertness.bucket));
        this.sizeTrait.calculate(state.individuals.map(i => i.traits.size.bucket));
    }
}

export class GeneMetrics {
    counts: number[] = [];

    calculate(buckets: number[]) {
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
    bucketCounts: number[] = [];

    calculate(living: Individual[]) {
        this.bucketCounts = [];
        for (let i = 0; i < 9; i++) {
            this.bucketCounts[i] = 0;
        }

        for (const individual of living) {
            const bucket = individual.brain.plantOrMeat.bucket;
            this.bucketCounts[bucket - 1]++;
        }
    }
}

export class ActionMetrics {
    wait = 0;

    learn = 0;
    survive = 0;

    reproduce = 0;
    offspringCounts: number[] = [];

    eat = 0;
    eatPlant = 0;
    eatMeat = 0;

    eatPlantSuccess = 0;
    eatPlantFail = 0;
    eatMeatSuccess = 0;
    eatMeatFail = 0;

    logAction(action: Action, succesful: boolean) {
        if (action instanceof WaitAction) {
            this.wait++;
        }
        else if (action instanceof LearnSkillAction) {
            this.learn++;
        } else {
            this.survive++;
            if (action instanceof ReproduceAction) {
                this.reproduce++;
                this.offspringCounts.push(action.cloneIds.length);
            } else if (action instanceof EatPlantAction) {
                this.eat++;
                this.eatPlant++;
                if (succesful) {
                    this.eatPlantSuccess++;
                } else {
                    this.eatPlantFail++;
                }
            } else if (action instanceof EatMeatAction) {
                this.eat++;
                this.eatMeat++;
                if (succesful) {
                    this.eatMeatSuccess++;
                } else {
                    this.eatMeatFail++;
                }
            }
        }
    }
}
