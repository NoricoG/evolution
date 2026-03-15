import { Color } from "@ui/color.js";
import { EnergyConstants } from "@simulation/constants.js";
import { Brain } from "@simulation/genetics/brain.js";
import { Skills } from "@simulation/genetics/skills.js";
import { Traits } from "@simulation/genetics/traits.js";

export class Individual {
    id: string = "";  // assigned by state
    readonly birthday: number;
    parent: Individual | null;
    deathDay: number | null = null;
    eaten: boolean = false;
    starved: boolean = false;
    extraAlertness: number = 0;

    readonly brain: Brain;
    readonly traits: Traits;
    readonly skills: Skills;

    energy: number;

    children: Individual[] = [];

    constructor(birthday: number, parent: Individual | null, brain: Brain, traits: Traits, skills: Skills) {
        this.birthday = birthday;

        this.parent = parent;

        this.brain = brain;
        this.traits = traits;
        this.skills = skills;

        this.energy = EnergyConstants.whenBorn;
    }

    toString(): string {
        return this.brain.toString();
    }

    toColor(): string {
        return Color.genomeToColor(this.brain);
    }

    getAge(today: number): number {
        if (this.deathDay != null) {
            return this.deathDay - this.birthday;
        }
        return today - this.birthday;
    }

    static neutral(birthday: number): Individual {
        return new Individual(birthday, null, Brain.neutral(), Traits.neutral(), Skills.neutral());
    }

    createChild(today: number): Individual {
        const evolvedBrain = this.brain.mutatedCopy(true);
        const evolvedTraits = this.traits.mutatedCopy(false);
        const evolvedSkills = this.skills.mutatedCopy(false);

        const baby = new Individual(today, this, evolvedBrain, evolvedTraits, evolvedSkills);
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

        const offSpringCounts = offspring.map(generation => generation.filter(individual => includeDead || individual.deathDay == null).length);
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
    }

    // to clean up references to dead individuals
    pruneDeadParents(deadGenerations: number = 0) {
        let parent = this.parent;

        if (parent == null) {
            return;
        } else if (parent.deathDay == null) {
            parent.pruneDeadParents(0);
        } else if (deadGenerations >= 2) {
            // parent is long dead
            this.parent = null;
            // children are also dead
            this.children = [];
        } else {
            parent.pruneDeadParents(deadGenerations + 1);
        }
    }
}
