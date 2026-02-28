import { Body } from "./body.js";
import { Diet } from "./enums.js";
import { Individual } from "./individual.js";
import { State } from "./state.js";

import { Chromosome } from "./genetics/chromosome.js";
import { Gene } from "./genetics/gene.js";
import { Strategy } from "./genetics/strategy.js";

function leftShelterSymbol(leftShelter: boolean): string {
    return leftShelter ? "🏃🏻‍♂️‍➡️" : "";
}

export abstract class Action {

    static actionGroups = [
        ["GatherAction", "HuntAction", "ScavengeAction"],
        ["HideAction", "ReproduceAction", "FeedChildAction"]
    ];


    individual: Individual;

    constructor(individual: Individual) {
        this.individual = individual;
    }

    abstract isPossible(state: State): boolean;

    abstract execute(state: State): void;

    abstract toString(): string;
}

export class GatherAction extends Action {
    leftShelter = false;

    isPossible(state: State): boolean {
        const hungry = this.individual.hasHunger();
        const foodAvailable = state.environment.food > 0;
        const canGather = this.individual.diet == Diet.HERBIVORE || this.individual.diet == Diet.OMNIVORE;

        return hungry && foodAvailable && canGather;
    }

    execute(state: State) {
        this.leftShelter = this.individual.leaveShelter();
        if (this.leftShelter) {
            state.environment.shelter++;
        }

        this.individual.eat(1);

        state.environment.food--;
    }

    toString() {
        return `${leftShelterSymbol(this.leftShelter)}🥕`;
    }
}

export class HuntAction extends Action {
    possibleVictims: Individual[] = [];
    victim: Individual | null = null;
    leftShelter = false;

    isPossible(state: State): boolean {
        const eatsMeat = this.individual.diet === Diet.CARNIVORE || this.individual.diet === Diet.OMNIVORE;
        const hungry = this.individual.hasHunger();
        const baby = this.individual.getAge(state.day) <= 1;

        if (!eatsMeat || !hungry || baby) {
            return false;
        }

        // TODO: make this easier to read by moving the filtering logic to a separate method
        this.possibleVictims = state.getIndividualsArray().filter(v =>
            !v.shelter && // can't hunt sheltered individuals
            // v.diet !== this.individual.diet && // can't hunt individuals with the same diet
            v.id !== this.individual.id && // don't hunt yourself
            v.id !== this.individual.parent?.id && // don't hunt your parent
            v.parent?.id !== this.individual.id && // don't hunt your children
            !Strategy.similar(v.strategy, this.individual.strategy) && // don't hunt similar strategy (family)
            v.canBeHuntedBy(this.individual, state.day)
        );
        return this.possibleVictims.length > 0;
    }

    execute(state: State) {
        if (this.individual.leaveShelter()) {
            state.environment.shelter++;
        }

        this.victim = this.possibleVictims[Math.floor(Math.random() * this.possibleVictims.length)];

        if (!this.victim.canBeHuntedBy(this.individual, state.day)) {
            console.error(`Victim ${this.victim.id} is no longer a valid victim for hunter ${this.individual.id}`);
            console.log(this.victim);
            console.log(this.individual);
            return;
        }

        // // TODO: make this based on some probability
        // if (this.victim.traits.canEscape(this.individual.traits)) {
        //     // escape successful, victim gets away but hunter still loses energy for failed hunt
        //     return;
        // }

        this.individual.eat(this.victim.traits.nutritionalValue);

        this.victim.eaten = true;
        this.victim.deathDay = state.day;
        if (this.victim.shelter) {
            state.environment.shelter++;
        }
        state.environment.bodies.push(new Body(this.victim.id, this.victim.traits.nutritionalValue, state.day));
        console.log("Added body:", this.victim.id, state.environment.bodies);
    }

    toString(): string {
        let victimId = this.victim ? this.victim.id : "❌";
        return `${leftShelterSymbol(this.leftShelter)}🍗 ${victimId}`;
    }
}

export class ScavengeAction extends Action {
    bodyId = "";
    leftShelter = false;

    isPossible(state: State): boolean {
        const isScavenger = this.individual.diet === Diet.SCAVENGER;
        const hungry = this.individual.hasHunger();
        const bodiesAvailable = state.environment.bodies.length > 0;

        return isScavenger && hungry && bodiesAvailable;
    }

    execute(state: State) {
        const leftShelter = this.individual.leaveShelter();
        if (leftShelter) {
            state.environment.shelter++;
        }

        this.bodyId = state.environment.bodies[Math.floor(Math.random() * state.environment.bodies.length)].id;

        const nutritionalValue = state.individuals[this.bodyId].traits.nutritionalValue;
        this.individual.eat(nutritionalValue);

        state.environment.removeBody(this.bodyId);
    }

    toString(): string {
        return `${leftShelterSymbol(this.leftShelter)}🦴 ${this.bodyId}`;
    }
}

export class HideAction extends Action {
    isPossible(state: State): boolean {
        const notSheltered = !this.individual.shelter;
        const shelterAvailable = state.environment.shelter > 0;

        return notSheltered && shelterAvailable;
    }

    execute(state: State) {
        this.individual.shelter = true;
        state.environment.shelter--;
    }

    toString() {
        return `🛡️`;
    }
}

export class ReproduceAction extends Action {
    cloneIds: string[] = [];

    isPossible(state: State): boolean {
        const isAdult = this.individual.getAge(state.day) >= Individual.adultAge;
        const hasEnergy = this.individual.energy >= 1;

        return isAdult && hasEnergy;
    }

    execute(state: State) {
        // const numberOfChildren: number = Math.min(Math.floor(this.individual.energy), 2);
        const numberOfChildren: number = 1;
        for (let i = 0; i < numberOfChildren; i++) {
            const baby = this.individual.createChild(state.day);
            state.saveIndividual(baby);
            this.cloneIds.push(baby.id);
        }
    }

    toString(): string {
        return `👶 ${this.cloneIds.join(" ")}`;
    }
}

export class FeedChildAction extends Action {
    child: Individual | null = null;

    isPossible(state: State): boolean {
        const hasEnergy = this.individual.energy > 1;
        const hasChildren = this.individual.children.length > 0;

        this.child = this.individual.children[Math.floor(Math.random() * this.individual.children.length)];

        return hasEnergy && hasChildren;
    }

    execute(state: State) {
        this.child?.eat(1);
    }

    toString(): string {
        return `🍼👶 ${this.child?.id}`;
    }
}

export const allActions = [
    GatherAction, HuntAction, ScavengeAction,
    HideAction, ReproduceAction,
    FeedChildAction,
];
