import { Hue } from "@ui/color.js";
import { EnergyConstants } from "@simulation/constants.js";
import { XY } from "@simulation/space.js";
import { Brain } from "@simulation/genetics/brain.js";
import { Diet } from "@simulation/genetics/diet.js";
import { Skills } from "@simulation/genetics/skills.js";
import { Traits } from "@simulation/genetics/traits.js";

export class Individual {
    // TODO: move to separate genome class
    static allChromosomes = [Brain, Diet, Traits, Skills];

    id: number = -1;  // assigned by state
    readonly birthday: number;
    parent: Individual | null;
    deathDay: number | null = null;
    eaten: boolean = false;
    starved: boolean = false;

    readonly brain: Brain;
    readonly diet: Diet;
    readonly traits: Traits;
    readonly skills: Skills;

    energy: number;

    children: Individual[] = [];

    location: XY;

    constructor(location: XY, birthday: number, parent: Individual | null, brain: Brain, diet: Diet, traits: Traits, skills: Skills) {
        this.location = location;
        this.birthday = birthday;
        this.parent = parent;

        this.brain = brain;
        this.diet = diet;
        this.traits = traits;
        this.skills = skills;

        this.energy = EnergyConstants.whenBorn;
    }

    toString(): string {
        return this.brain.toString();
    }

    toColor(): string {
        return Hue.genomeToColor(this.diet);
    }

    getAge(today: number): number {
        if (this.deathDay != null) {
            return this.deathDay - this.birthday;
        }
        return today - this.birthday;
    }

    static neutral(location: XY, birthday: number): Individual {
        return new Individual(location, birthday, null, Brain.neutral(), Diet.neutral(), Traits.neutral(), Skills.neutral());
    }

    createChild(location: XY, today: number): Individual {
        const evolvedBrain = this.brain.mutatedCopy(true);
        const evolvedDiet = this.diet.mutatedCopy(true);
        const evolvedTraits = this.traits.mutatedCopy(false);
        const evolvedSkills = this.skills.mutatedCopy(false);

        const baby = new Individual(location, today, this, evolvedBrain, evolvedDiet, evolvedTraits, evolvedSkills);
        this.children.push(baby);

        return baby;
    }

    getOffspringCounts(includeDead: boolean): number[] {
        let offspring: Individual[][] = [];
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

        const offspringCounts = offspring.map(generation => generation.filter(individual => includeDead || individual.deathDay == null).length);
        if (offspringCounts[offspringCounts.length - 1] == 0) {
            offspringCounts.pop();
        }
        return offspringCounts;
    }

    getOffspringSum(includeDead: boolean = false): number {
        return this.getOffspringCounts(includeDead).reduce((sum, val) => sum + val, 0);
    }

    // returns any living parents and the first died parent, from young to old
    getParents(): Individual[] {
        const parents: Individual[] = [];

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
                if (nextParent.deathDay != null) {
                    parents.push(nextParent);
                    break;
                }
                parents.push(nextParent);
            }
        }
        return parents;
    }

    hasHunger(): boolean {
        return this.energy <= EnergyConstants.max - 1;
    }

    dieEaten(today: number) {
        this.eaten = true;
        this.die(today);
    }

    dieStarved(today: number) {
        this.starved = true;
        this.die(today);
    }

    private die(today: number) {
        this.deathDay = today;

        if (this.parent) {
            this.parent.children = this.parent.children.filter(c => c.id !== this.id);
        }
        for (let child of this.children) {
            child.parent = null;
        }
    }
}
