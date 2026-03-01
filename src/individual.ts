import { Brain } from "./genetics/brain.js";
import { Diet } from "./genetics/diet.js";

export class Individual {
    static maxEnergy = 4;
    static reproductiveAge = 2;

    id: string = "";  // assigned by state
    birthday: number;
    parent: Individual | null;
    deathDay: number | null = null;
    eaten: boolean = false;
    starved: boolean = false;

    brain: Brain;
    diet: Diet;

    events: string[] = [];

    energy: number;

    // TODO: calculate based on traits
    // don't forget to recalculate when traits change
    nutritionalValue = 2;
    energyNeed = 1;

    children: Individual[] = [];

    constructor(birthday: number, parent: Individual | null, brain: Brain, diet: Diet) {
        this.birthday = birthday;

        this.parent = parent;

        this.brain = brain;
        this.diet = diet;

        this.energy = 2;
    }

    toString(): string {
        return `${this.brain.toString()}-${this.diet.toString()}`;
    }

    toColor(): string {
        return this.diet.toColor();
    }

    static random(birthday: number): Individual {
        const herbivore = Math.random() < 0.5;
        const randomDiet = herbivore ? Diet.randomHerbivore() : Diet.randomCarnivore();
        const newIndividual = new Individual(birthday, null, Brain.random(), randomDiet);
        return newIndividual;
    }

    getAge(today: number): number {
        if (this.deathDay) {
            return this.deathDay - this.birthday;
        }
        return today - this.birthday;
    }

    eat(nutritionalValue: number) {
        this.energy = Math.min(Individual.maxEnergy, this.energy + nutritionalValue);
    }

    createChild(today: number): Individual {
        // const evolvedBrain = this.brain.mutatedCopy();
        // const evolvedDiet = this.diet.mutatedCopy();

        // no mutation for testing
        const evolvedBrain = this.brain;
        const evolvedDiet = this.diet;

        const baby = new Individual(today, this, evolvedBrain, evolvedDiet);
        this.children.push(baby);

        return baby;
    }

    getOffspringCounts(): number[] {
        let offspring = [];
        let generation = 1;
        offspring.push(this.children);

        while (offspring[generation - 1].length > 0) {
            offspring.push([]);
            for (let child of offspring[generation - 1]) {
                offspring[generation].push(...child.children);
            }
            generation++;
        }

        // remove last generation which is empty
        offspring.pop();

        const offSpringCounts = offspring.map(generation => generation.filter(individual => !individual.deathDay).length);
        if (offSpringCounts[offSpringCounts.length - 1] == 0) {
            offSpringCounts.pop();
        }
        return offSpringCounts;
    }

    getOffspringSum(): number {
        return this.getOffspringCounts().reduce((sum, val) => sum + val, 0);
    }

    // returns the first parent (dead or alive) and any living older parents, from old to new
    getParentIds(): string[] {
        const parents = [];

        if (this.parent) {
            parents.push(this.parent);

            let alive = true;
            while (alive) {
                const nextParent: Individual = parents[parents.length - 1].parent!;
                alive = nextParent != null && !nextParent.deathDay;
                if (alive) {
                    parents.push(nextParent);
                }
            }


        }
        return parents.map(parent => parent.id);
    }

    hasHunger(): boolean {
        return this.energy <= Individual.maxEnergy - 1;
    }

    dieEaten(today: number, eaterId: string) {
        this.eaten = true;
        this.events.push(`${eaterId} 🥩`);
        this.die(today);
    }

    dieStarved(today: number) {
        this.starved = true;
        this.die(today);
    }

    private die(today: number) {
        this.deathDay = today;
        // logEulogy(today);
    }

    private logEulogy(today: number) {
        let eulogy = `${this.id} died at age ${this.getAge(today)}`;
        if (this.eaten) {
            eulogy += " (eaten)";
        }
        if (this.starved) {
            eulogy += " (starved)";
        }
        const showLastEvents = 5;
        for (let i = Math.max(5, this.events.length) - showLastEvents; i < this.events.length; i++) {
            eulogy += `\n${i + 1} ${this.events[i]}`;
        }
        console.log(eulogy);
    }
}
