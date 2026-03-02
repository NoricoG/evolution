import { Brain } from "./genetics/brain.js";
import { Diet } from "./genetics/diet.js";

import { genomeToColor } from "./utils/color.js";
import { Energy } from "./energy.js";

export class Individual {
    static readonly reproductiveAge = 2;

    id: string = "";  // assigned by state
    readonly birthday: number;
    parent: Individual | null;
    deathDay: number | null = null;
    eaten: boolean = false;
    starved: boolean = false;

    readonly brain: Brain;
    readonly diet: Diet;

    events: string[] = [];

    energy: number;

    children: Individual[] = [];

    constructor(birthday: number, parent: Individual | null, brain: Brain, diet: Diet) {
        this.birthday = birthday;

        this.parent = parent;

        this.brain = brain;
        this.diet = diet;

        this.energy = Energy.whenBorn;
    }

    toString(): string {
        return `${this.brain.toString()}-${this.diet.toString()}`;
    }

    toColor(): string {
        return genomeToColor(this.diet, this.brain);
    }

    getAge(today: number): number {
        if (this.deathDay) {
            return this.deathDay - this.birthday;
        }
        return today - this.birthday;
    }

    createChild(today: number): Individual {
        const evolvedBrain = this.brain.mutatedCopy();
        const evolvedDiet = this.diet.mutatedCopy();

        const baby = new Individual(today, this, evolvedBrain, evolvedDiet);
        this.children.push(baby);

        return baby;
    }

    getOffspringCounts(includeDead: boolean): number[] {
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

        const offSpringCounts = offspring.map(generation => generation.filter(individual => includeDead || !individual.deathDay).length);
        if (offSpringCounts[offSpringCounts.length - 1] == 0) {
            offSpringCounts.pop();
        }
        return offSpringCounts;
    }

    getOffspringSum(includeDead: boolean = false): number {
        return this.getOffspringCounts(includeDead).reduce((sum, val) => sum + val, 0);
    }

    // returns any living parents and the first died parent, from young to old
    getParents(): Individual[] {
        const parents = [];

        if (this.parent) {
            parents.push(this.parent);

            let alive = true;
            while (alive) {
                const nextParent: Individual = parents[parents.length - 1].parent!;

                // stop when there is no more parent
                if (nextParent == null) {
                    break;
                }
                // stop when the next parent is dead, but include it in the list
                if (nextParent.deathDay) {
                    parents.push(nextParent);
                    break;
                }
                parents.push(nextParent);
            }
        }
        return parents;
    }

    hasHunger(): boolean {
        return this.energy <= Energy.max - 1;
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
