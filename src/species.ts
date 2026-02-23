const hungerLabels = ["🟢", "🟡", "🔴"];

class Individual {
    id: string;
    hunger: number;
    shelter = false;
    eaten = false;

    species: Species;

    constructor(species: Species) {
        this.species = species;

        this.id = this.species.id + this.species.maxIndividualId;
        this.species.maxIndividualId++;

        this.hunger = species.defaultHunger;
    }

    toString() {
        return `${this.id} (${this.species.getTraitsString()})`;
    }

    statusString(): string {
        return `${hungerLabels[this.hunger]}${this.shelter ? "🛡️" : "👁️"}`;
    }

    canBeEatenBy(predator: Species): boolean {
        if (this.eaten) {
            return false;
        }

        if (this.shelter) {
            return false;
        }

        return this.species.canBeEatenBy(predator);
    }
}

class Species {
    id: string;
    maxIndividualId: number = 1;

    traits: Trait[] = [];
    diet: Diet | undefined = undefined;

    defaultHunger = 1;
    individuals: Individual[];

    constructor(state: State) {
        this.id = state.nextSpeciesId();

        this.individuals = [new Individual(this)];
    }

    aliveIndividuals(): number {
        return this.individuals.filter(x => !x.eaten).length;
    }

    getTraitsString(): string {
        this.traits = sortTraits(this.traits);

        var label = "";
        for (let trait of this.traits) {
            label += `${trait} `;
        }

        if (this.diet == undefined) {
            label += "herbivore";
        } else {
            label += `${this.diet}`;
        }

        return label;
    }

    getIndividualsAndTraitsString(): string {
        const plural = this.aliveIndividuals() != 1 ? 's' : '';
        return `${this.aliveIndividuals().toString()} ${this.getTraitsString()}${plural}`;
    }

    toString() {
        return `${this.id} (${this.getIndividualsAndTraitsString()})`;
    }

    getTraitOrDietCount(): number {
        return this.traits.length + (this.diet ? 1 : 0);
    }

    addIndividual() {
        this.individuals.push(new Individual(this));
    }

    addTraitOrDiet(traitOrDiet: Trait | Diet): boolean {
        if (Object.values(Trait).includes(traitOrDiet as Trait)) {
            return this.addTrait(traitOrDiet as Trait);
        } else if (Object.values(Diet).includes(traitOrDiet as Diet)) {
            return this.addDiet(traitOrDiet as Diet);
        } else {
            throw new Error(`Invalid traitOrDiet: ${traitOrDiet}`);
        }
    }

    addTrait(trait: Trait): boolean {
        if (this.traits.includes(trait)) {
            return false;
        }
        this.traits.push(trait);

        if (trait == Trait.LARGE) {
            this.defaultHunger++;
        }

        return true;
    }

    addDiet(diet: Diet): boolean {
        if (this.diet != undefined) {
            return false;
        }
        this.diet = diet;
        return true;
    }

    canBeEatenBy(predator: Species): boolean {
        if (this.traits.includes(Trait.SWIMMING) && !predator.traits.includes(Trait.SWIMMING)) {
            return false;
        }

        if (this.traits.includes(Trait.LARGE) && !predator.traits.includes(Trait.LARGE)) {
            return false;
        }

        return true;
    }
}
