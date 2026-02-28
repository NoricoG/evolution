"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.allActions = exports.FeedChildAction = exports.ReproduceAction = exports.HideAction = exports.ScavengeAction = exports.HuntAction = exports.GatherAction = exports.Action = void 0;
const enums_js_1 = require("./enums.js");
const individual_js_1 = require("./individual.js");
const strategy_js_1 = require("./genetics/strategy.js");
function leftShelterSymbol(leftShelter) {
    return leftShelter ? "🏃🏻‍♂️‍➡️" : "";
}
class Action {
    static actionGroups = [
        ["GatherAction", "HuntAction", "ScavengeAction"],
        ["HideAction", "ReproduceAction", "FeedChildAction"]
    ];
    individual;
    constructor(individual) {
        this.individual = individual;
    }
}
exports.Action = Action;
class GatherAction extends Action {
    leftShelter = false;
    isPossible(state) {
        const hungry = this.individual.hasHunger();
        const foodAvailable = state.environment.food > 0;
        const canGather = this.individual.diet == enums_js_1.Diet.HERBIVORE || this.individual.diet == enums_js_1.Diet.OMNIVORE;
        return hungry && foodAvailable && canGather;
    }
    execute(state) {
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
exports.GatherAction = GatherAction;
class HuntAction extends Action {
    possibleVictims = [];
    victim = null;
    leftShelter = false;
    isPossible(state) {
        const eatsMeat = this.individual.diet === enums_js_1.Diet.CARNIVORE || this.individual.diet === enums_js_1.Diet.OMNIVORE;
        const hungry = this.individual.hasHunger();
        const baby = this.individual.getAge(state.day) <= 1;
        if (!eatsMeat || !hungry || baby) {
            return false;
        }
        this.possibleVictims = state.individualsArray.filter(v => v.id !== this.individual.id && // don't hunt yourself
            v.id !== this.individual.parent?.id && // don't hunt your parent
            v.parent?.id !== this.individual.id && // don't hunt your children
            !strategy_js_1.Strategy.similar(v.strategy, this.individual.strategy) && // don't hunt similar strategy (family)
            v.canBeHuntedBy(this.individual, state.day));
        return this.possibleVictims.length > 0;
    }
    execute(state) {
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
        if (this.victim.traits.canEscape(this.individual.traits)) {
            // escape successful, victim gets away but hunter still loses energy for failed hunt
            return;
        }
        this.individual.eat(this.victim.traits.nutritionalValue);
        this.victim.eaten = true;
        this.victim.die(state.day);
        if (this.victim.shelter) {
            state.environment.shelter++;
        }
        state.environment.freshBodies.push(this.victim.id);
    }
    toString() {
        let victimId = this.victim ? this.victim.id : "❌";
        return `${leftShelterSymbol(this.leftShelter)}🍗 ${victimId}`;
    }
}
exports.HuntAction = HuntAction;
class ScavengeAction extends Action {
    bodyId = "";
    leftShelter = false;
    isPossible(state) {
        const isScavenger = this.individual.diet === enums_js_1.Diet.SCAVENGER;
        const hungry = this.individual.hasHunger();
        const bodiesAvailable = state.environment.allBodies.length > 0;
        return isScavenger && hungry && bodiesAvailable;
    }
    execute(state) {
        const leftShelter = this.individual.leaveShelter();
        if (leftShelter) {
            state.environment.shelter++;
        }
        this.bodyId = state.environment.allBodies[Math.floor(Math.random() * state.environment.allBodies.length)];
        const nutritionalValue = state.individuals[this.bodyId].traits.nutritionalValue;
        this.individual.eat(nutritionalValue);
        state.environment.removeBody(this.bodyId);
    }
    toString() {
        return `${leftShelterSymbol(this.leftShelter)}🦴 ${this.bodyId}`;
    }
}
exports.ScavengeAction = ScavengeAction;
class HideAction extends Action {
    isPossible(state) {
        const notSheltered = !this.individual.shelter;
        const shelterAvailable = state.environment.shelter > 0;
        return notSheltered && shelterAvailable;
    }
    execute(state) {
        this.individual.shelter = true;
        state.environment.shelter--;
    }
    toString() {
        return `🛡️`;
    }
}
exports.HideAction = HideAction;
class ReproduceAction extends Action {
    cloneId = "";
    isPossible(state) {
        const isAdult = this.individual.getAge(state.day) >= individual_js_1.Individual.adultAge;
        const hasEnergy = this.individual.energy > 0;
        const hasShelter = this.individual.shelter;
        return isAdult && hasEnergy && hasShelter;
    }
    execute(state) {
        const baby = this.individual.createChild(state.day);
        state.saveIndividual(baby);
        this.cloneId = baby.id;
    }
    toString() {
        return `👶 ${this.cloneId}`;
    }
}
exports.ReproduceAction = ReproduceAction;
class FeedChildAction extends Action {
    child = null;
    isPossible(state) {
        const hasEnergy = this.individual.energy > 1;
        const hasChildren = this.individual.children.length > 0;
        this.child = this.individual.children[Math.floor(Math.random() * this.individual.children.length)];
        return hasEnergy && hasChildren;
    }
    execute(state) {
        this.child?.eat(1);
    }
    toString() {
        return `🍼👶 ${this.child?.id}`;
    }
}
exports.FeedChildAction = FeedChildAction;
exports.allActions = [
    GatherAction, HuntAction, ScavengeAction,
    HideAction, ReproduceAction,
    FeedChildAction,
];
