"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Individual = void 0;
const enums_js_1 = require("./enums.js");
const strategy_js_1 = require("./genetics/strategy.js");
const traits_js_1 = require("./genetics/traits.js");
class Individual {
    static maxEnergy = 4;
    static adultAge = 2;
    id;
    born;
    parent;
    dead = false;
    deathDay = null;
    eaten = false;
    starved = false;
    strategy;
    traits;
    lastEvent = "";
    diet;
    energy = 2;
    shelter = false;
    children = [];
    constructor(birthday, parent, traits, diet, strategy) {
        this.id = ""; // assigned by state
        this.born = birthday;
        this.parent = parent;
        this.strategy = strategy;
        this.traits = traits;
        this.diet = diet;
        this.energy = 2;
    }
    static random(birthday) {
        const randomDiet = Object.values(enums_js_1.Diet)[Math.floor(Math.random() * Object.values(enums_js_1.Diet).length)];
        const newIndividual = new Individual(birthday, null, traits_js_1.Traits.random(), randomDiet, strategy_js_1.Strategy.random(randomDiet));
        return newIndividual;
    }
    getAge(today) {
        return today - this.born;
    }
    getCategory(today) {
        if (this.starved)
            return enums_js_1.IndividualCategory.Starved;
        if (this.eaten)
            return enums_js_1.IndividualCategory.Eaten;
        if (this.getAge(today) < Individual.adultAge)
            return enums_js_1.IndividualCategory.Young;
        return enums_js_1.IndividualCategory.Adult;
    }
    canBeHuntedBy(predator, today) {
        if (this.dead) {
            return false;
        }
        if (this.shelter) {
            return false;
        }
        // protected by parent at start of life
        if (this.getAge(today) == 0) {
            return false;
        }
        // only hunt if it will be succesful
        return this.traits.canEscape(predator.traits);
        // always hunt, but it will not always succeed
        return true;
    }
    eat(nutritionalValue) {
        this.energy = Math.min(Individual.maxEnergy, this.energy + nutritionalValue);
    }
    createChild(today) {
        const evolvedStrategy = this.strategy.mutate();
        const evolvedTraits = this.traits.mutate();
        const baby = new Individual(today, this, evolvedTraits, this.diet, evolvedStrategy);
        this.children.push(baby);
        return baby;
    }
    getOffspringCounts() {
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
        const offSpringCounts = offspring.map(generation => generation.filter(individual => !individual.dead).length);
        if (offSpringCounts[offSpringCounts.length - 1] == 0) {
            offSpringCounts.pop();
        }
        return offSpringCounts;
    }
    getOffspringSum() {
        return this.getOffspringCounts().reduce((sum, val) => sum + val, 0);
    }
    // returns the first parent and any living older parents, from old to new
    getParentIds() {
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
        return parents.map(parent => parent.id);
    }
    leaveShelter() {
        if (this.shelter) {
            this.shelter = false;
            return true;
        }
        return false;
    }
    hasHunger() {
        return this.energy <= Individual.maxEnergy - 1;
    }
    die(today) {
        this.dead = true;
        this.deathDay = today;
    }
}
exports.Individual = Individual;
