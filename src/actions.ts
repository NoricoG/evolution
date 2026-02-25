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

class GatherAction extends Action {
    leftShelter = false;

    isPossible(): boolean {
        const hungry = this.individual.hasHunger();
        const foodAvailable = state.environment.food > 0;
        const canGather = this.individual.diet == Diet.HERBIVORE || this.individual.diet == Diet.OMNIVORE;

        return hungry && foodAvailable && canGather;
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

class HuntAction extends Action {
    possibleVictims: Individual[] = [];
    victim: Individual | null = null;
    leftShelter = false;

    isPossible(): boolean {
        const eatsMeat = this.individual.diet === Diet.CARNIVORE || this.individual.diet === Diet.OMNIVORE;
        const hungry = this.individual.hasHunger();

        if (!eatsMeat || !hungry) {
            return false;
        }

        this.possibleVictims = state.individualsArray.filter(v =>
            v.id !== this.individual.id && // don't hunt yourself
            v.id !== this.individual.parent?.id && // don't hunt your parent
            v.parent?.id !== this.individual.id && // don't hunt your children
            !similarStrategy(v.strategy, this.individual.strategy) && // don't hunt similar strategy (family)
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

        this.victim.eaten = true;
        this.victim.die();
        state.environment.freshBodies.push(this.victim.id);
    }

    toString(): string {
        let victimId = this.victim ? this.victim.id : "❌";
        return `${leftShelterSymbol(this.leftShelter)}🍗 ${victimId}`;
    }
}

class ScavengeAction extends Action {
    bodyId = "";
    leftShelter = false;

    isPossible(): boolean {
        const isScavenger = this.individual.diet === Diet.SCAVENGER;
        const hungry = this.individual.hasHunger();
        const bodiesAvailable = state.environment.allBodies.length > 0;

        return isScavenger && hungry && bodiesAvailable;
    }

    execute() {
        this.leftShelter = this.individual.leaveShelter();
        this.bodyId = state.environment.allBodies[Math.floor(Math.random() * state.environment.allBodies.length)];

        const nutritionalValue = state.individuals[this.bodyId].nutritionalValue();
        this.individual.eat(nutritionalValue);

        state.environment.removeBody(this.bodyId);
    }

    toString(): string {
        return `${leftShelterSymbol(this.leftShelter)}🦴 ${this.bodyId}`;
    }
}

class HideAction extends Action {
    isPossible(): boolean {
        const notSheltered = !this.individual.shelter;
        const shelterAvailable = state.environment.shelter > 0;

        return notSheltered && shelterAvailable;
    }

    execute() {
        this.individual.shelter = true;
        state.environment.shelter--;
    }

    toString() {
        return `🛡️`;
    }
}

class ReproduceAction extends Action {
    cloneId = "";

    isPossible(): boolean {
        const isAdult = this.individual.getAge() >= adultAge;
        const hasEnergy = this.individual.energy > 1;
        const hasShelter = this.individual.shelter;

        return isAdult && hasEnergy && hasShelter;
    }


    execute() {
        const baby = this.individual.procreate();
        this.cloneId = baby.id;
    }

    toString(): string {
        return `👶 ${this.cloneId}`;
    }
}

class FeedChildAction extends Action {
    child: Individual | null = null;

    isPossible(): boolean {
        const hasEnergy = this.individual.energy > 1;
        const hasChildren = this.individual.children.length > 0;

        this.child = this.individual.children[Math.floor(Math.random() * this.individual.children.length)];

        return hasEnergy && hasChildren;
    }

    execute() {
        this.child?.eat(1);
    }

    toString(): string {
        return `🍼👶 ${this.child?.id}`;
    }
}

class GainTraitAction extends Action {
    gainedTrait: Trait | null = null;

    isPossible(): boolean {
        const underdeveloped = this.individual.traits.length < 3;
        const hasEnergy = this.individual.energy >= maxEnergy - 1;
        const notOld = this.individual.getAge() < adultAge * 3;

        return underdeveloped && hasEnergy && notOld;
    }

    execute() {
        const newTraits = Object.values(Trait).filter(trait => !this.individual.traits.includes(trait));
        this.gainedTrait = newTraits[Math.floor(Math.random() * newTraits.length)];
        this.individual.addTrait(this.gainedTrait);
    }

    toString(): string {
        return `🆕 ${this.gainedTrait || ""}`;
    }
}

const allActions = [
    GatherAction, HuntAction, ScavengeAction,
    HideAction, ReproduceAction,
    FeedChildAction, GainTraitAction,
];

const actionGroups = [
    ["GatherAction", "HuntAction", "ScavengeAction"],
    ["HideAction", "ReproduceAction"],
    ["FeedChildAction", "GainTraitAction"]
];
