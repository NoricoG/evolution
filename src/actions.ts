function leftShelterSymbol(leftShelter: boolean): string {
    return leftShelter ? "🏃🏻‍♂️‍➡️" : "";
}

abstract class Action {
    individual: Individual;

    constructor(individual: Individual) {
        this.individual = individual;
    }

    abstract isPossible(): boolean;

    abstract execute(): void;

    abstract toString(): string;
}

class HideAction extends Action {
    isPossible(): boolean {
        return !this.individual.shelter && state.environment.shelter > 0;
    }

    execute() {
        this.individual.shelter = true;
        state.environment.shelter--;
    }

    toString() {
        return `🛡️`;
    }
}

class GatherAction extends Action {
    leftShelter = false;


    isPossible(): boolean {
        return this.individual.energy < maxEnergy && state.environment.food > 0 && this.individual.diet != Diet.CARNIVORE;
    }

    execute() {
        this.leftShelter = this.individual.leaveShelter();

        this.individual.eat(1);

        state.environment.food--;
    }

    toString() {
        return `${leftShelterSymbol(this.leftShelter)}🥕`;
    }
}

class ReproduceAction extends Action {
    cloneId = "";

    isPossible(): boolean {
        return this.individual.getAge() > 0 && this.individual.energy > 1;
    }


    execute() {
        const baby = this.individual.procreate();
        this.cloneId = baby.id;
    }

    toString(): string {
        return `👶 ${this.cloneId}`;
    }
}

class AddTraitAction extends Action {
    gainedTrait: Trait | null = null;

    isPossible(): boolean {
        return this.individual.traits.length < 3 && this.individual.energy >= maxEnergy && this.individual.getAge() < 3;
    }

    execute() {
        const newTraits = Object.values(Trait).filter(trait => !this.individual.traits.includes(trait));
        this.gainedTrait = newTraits[Math.floor(Math.random() * newTraits.length)];
        this.individual.addTrait(this.gainedTrait);
    }

    toString(): string {
        return `🆕 ${this.gainedTrait}`;
    }
}

class HuntAction extends Action {
    possibleVictims: Individual[] = [];
    victim: Individual | null = null;
    leftShelter = false;

    isPossible(): boolean {
        if (this.individual.diet !== Diet.CARNIVORE && this.individual.diet !== Diet.OMNIVORE) {
            return false;
        }

        if (this.individual.energy >= maxEnergy) {
            return false;
        }

        this.possibleVictims = state.individualsArray.filter(v =>
            v.id !== this.individual.id && // don't hunt yourself
            v.id !== this.individual.parent?.id && // don't hunt your parent
            v.parent?.id !== this.individual.id && // don't hunt your children
            v.canBeHuntedBy(this.individual)
        );
        return this.possibleVictims.length > 0;
    }

    execute() {
        this.individual.leaveShelter();

        this.victim = this.possibleVictims[Math.floor(Math.random() * this.possibleVictims.length)];

        if (!this.victim.canBeHuntedBy(this.individual)) {
            console.error(`Victim ${this.victim.id} is no longer a valid victim for hunter ${this.individual.id}`);
            console.log(this.victim);
            console.log(this.individual);
            return;
        }

        this.individual.eat(this.victim.nutritionalValue());

        state.dieIndividual(this.victim.id);
        this.victim.eaten = true;

        state.environment.bodies.push(this.victim.id);
    }

    toString(): string {
        var victimId = this.victim ? this.victim.id : "❌";
        return `${leftShelterSymbol(this.leftShelter)}🍗 ${victimId}`;
    }
}

class ScavengeAction extends Action {
    bodyId = "";
    leftShelter = false;

    isPossible(): boolean {
        return this.individual.diet === Diet.SCAVENGER && this.individual.energy < maxEnergy && state.environment.bodies.length > 0;
    }

    execute() {
        this.leftShelter = this.individual.leaveShelter();
        this.bodyId = state.environment.bodies[Math.floor(Math.random() * state.environment.bodies.length)];

        const nutritionalValue = state.individuals[this.bodyId].nutritionalValue();
        this.individual.eat(nutritionalValue);

        state.environment.bodies = state.environment.bodies.filter(id => id !== this.bodyId);
    }

    toString(): string {
        return `${leftShelterSymbol(this.leftShelter)}🦴 ${this.bodyId}`;
    }
}

class FeedChildAction extends Action {
    offspringId = "";

    isPossible(): boolean {
        return this.individual.energy > 1 && this.individual.children.length > 0;
    }

    execute() {
        const child = this.individual.children[Math.floor(Math.random() * this.individual.children.length)];
        this.offspringId = child.id;

        child.eat(1);
    }

    toString(): string {
        return `🍼👶 ${this.offspringId}`;
    }
}

const allActions = [ReproduceAction, AddTraitAction, HideAction, HuntAction, GatherAction, ScavengeAction, FeedChildAction];
