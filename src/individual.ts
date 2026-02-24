const maxEnergy = 4;
const mutationChance = 0.1;

enum Trait {
    LARGE = "large",
    BURROW = "burrow",
    SWIM = "swim"
}

enum Diet {
    HERBIVORE = "herbivore",
    CARNIVORE = "carnivore",
    OMNIVORE = "omnivore",
    SCAVENGER = "scavenger"
}


class Individual {
    id: string;
    born: number;
    parent: Individual | null;
    dead: boolean = false;
    eaten: boolean = false;
    starved: boolean = false;

    traits: Trait[] = [];
    diet: Diet;

    energy = 2;
    shelter = false;

    children: Individual[] = [];

    constructor(parent: Individual | null, traits: Trait[], diet: Diet, extraAge: number) {
        this.id = "";  // assigned by state
        this.born = state.day - extraAge;

        this.parent = parent;

        this.traits = traits;
        if (Math.random() < mutationChance / 2 && this.traits.length > 0) {
            // remove random trait
            this.traits.splice(Math.floor(Math.random() * this.traits.length), 1);
        }
        if (Math.random() < mutationChance) {
            const possibleNewTraits = Object.values(Trait).filter(trait => !this.traits.includes(trait));
            if (possibleNewTraits.length > 0) {
                this.traits.push(possibleNewTraits[Math.floor(Math.random() * possibleNewTraits.length)]);
            }
        }
        this.diet = diet;

        this.energy = 2;
    }

    getAge(): number {
        return state.day - this.born;
    }

    canBeHuntedBy(predator: Individual): boolean {
        if (this.dead) {
            return false;
        }

        if (this.shelter) {
            return false;
        }

        // protected by parent at start of life
        if (this.getAge() == 0) {
            return false;
        }

        if (this.traits.includes(Trait.SWIM) && !predator.traits.includes(Trait.SWIM)) {
            return false;
        }

        if (this.traits.includes(Trait.LARGE) && !predator.traits.includes(Trait.LARGE)) {
            return false;
        }

        return true;
    }

    addTrait(trait: Trait): boolean {
        if (this.traits.includes(trait)) {
            return false;
        }
        this.traits.push(trait);
        return true;
    }

    energyNeed(): number {
        return this.traits.includes(Trait.LARGE) ? 1.5 : 1;
    }

    nutritionalValue(): number {
        return (this.traits.includes(Trait.LARGE) ? 3 : 2);
    }

    eat(nutritionalValue: number) {
        this.energy = Math.min(maxEnergy, this.energy + nutritionalValue);

        if (this.traits.includes(Trait.BURROW) && this.energy >= maxEnergy - 1) {
            this.shelter = true;
        }
    }

    procreate(): Individual {
        const baby = new Individual(this, this.traits, this.diet, 0);
        state.addIndividual(baby);
        this.children.push(baby);

        return baby;
    }

    getOffspring(): number[] {
        var offspring = [];
        var generation = 1;
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

        const offSpringCounts = offspring.map(generation => generation.filter(individual => !individual.dead).length);
        if (offSpringCounts[offSpringCounts.length - 1] == 0) {
            offSpringCounts.pop();
        }
        return offSpringCounts;
    }

    // returns the first parent and any living older parents, from old to new
    getParentIds(): string[] {
        const parents = [];

        if (this.parent) {
            parents.push(this.parent);

            let alive = true;
            while (alive) {
                const nextParent = parents[parents.length - 1].parent;
                alive = nextParent != null && !nextParent.dead;
                if (alive) {
                    parents.push(nextParent);
                }
            }


        }
        return parents.map(parent => parent.id).reverse();
    }

    leaveShelter(): boolean {
        if (this.shelter) {
            this.shelter = false;
            if (!this.traits.includes(Trait.BURROW)) {
                state.environment.shelter++;
            }
            return true;
        }
        return false;
    }

    hasHunger(): boolean {
        return this.energy <= maxEnergy - 1;
    }
}
