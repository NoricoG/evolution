"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Environment = exports.State = void 0;
const individual_js_1 = require("./individual.js");
class State {
    static targetIndividuals = 30;
    day;
    individuals = {};
    individualIdCounter = -1;
    environment = new Environment(this, []);
    constructor() {
        const initialDays = 2;
        this.day = 0;
        const initialIndividuals = State.targetIndividuals / (2 ** initialDays);
        for (let i = 0; i < initialIndividuals; i++) {
            this.saveIndividual(individual_js_1.Individual.random(this.day));
        }
        for (let i = 0; i < initialDays; i++) {
            for (const individual of this.individualsArray) {
                const child = individual.createChild(this.day);
                this.saveIndividual(child);
            }
        }
    }
    get individualsArray() {
        return Object.values(this.individuals);
    }
    nextIndividualId() {
        this.individualIdCounter++;
        // CVC pattern
        // 0 Bab, 1 Cab, ..., 19 Yab, 20 Zab
        // 21 Beb, ..., 41 Zeb
        // ...
        // 84 Bub, ..., 104 Zub
        // 105 Bac, ..., 125 Zac
        // ...
        // 189 Buc, ..., 209 Zuc
        // ...
        // 2100 Baz, ..., 2120 Zaz
        // ...
        // 2184 Buz, ..., 2204 Zuz
        // 2205 Bab, starting over
        function translate(num) {
            const consonants = 'bcdfghjklmnpqrstvwxyz';
            const vowels = 'aeiou';
            const c = consonants.length; // 21
            const v = vowels.length; // 5
            const firstIdx = num % c;
            const vowelIdx = Math.floor(num / c) % v;
            const lastIdx = Math.floor(num / (c * v)) % c;
            const name = consonants[firstIdx].toUpperCase() + vowels[vowelIdx] + consonants[lastIdx];
            return name;
        }
        return translate(this.individualIdCounter);
    }
    saveIndividual(individual) {
        individual.id = this.nextIndividualId();
        this.individuals[individual.id] = individual;
    }
    updateEnvironment() {
        this.environment = new Environment(this, this.environment.freshBodies);
    }
    livingIndividualCount() {
        return Object.values(this.individuals).filter(individual => !individual.dead).length;
    }
}
exports.State = State;
class Environment {
    initialFood;
    food;
    initialShelter;
    shelter;
    freshBodies;
    oldBodies;
    allBodies;
    minFoodFactor = 0.3;
    maxFoodFactor = 0.7;
    minShelterFactor = 0.1;
    maxShelterFactor = 0.2;
    constructor(state, oldBodies) {
        const foodFactor = this.minFoodFactor + Math.random() * (this.maxFoodFactor - this.minFoodFactor);
        const shelterFactor = this.minShelterFactor + Math.random() * (this.maxShelterFactor - this.minShelterFactor);
        this.initialFood = Math.round(foodFactor * State.targetIndividuals);
        this.initialShelter = Math.round(shelterFactor * State.targetIndividuals);
        const shelteredIndividuals = state.individualsArray.filter(individual => individual.shelter).length;
        this.initialShelter -= shelteredIndividuals;
        if (this.initialShelter < 0) {
            this.initialShelter = 0;
        }
        this.food = this.initialFood;
        this.shelter = this.initialShelter;
        this.oldBodies = oldBodies;
        this.freshBodies = [];
        this.allBodies = [...this.oldBodies, ...this.freshBodies];
    }
    removeBody(bodyId) {
        this.freshBodies = this.freshBodies.filter(id => id !== bodyId);
        this.oldBodies = this.oldBodies.filter(id => id !== bodyId);
        this.allBodies = this.allBodies.filter(id => id !== bodyId);
    }
}
exports.Environment = Environment;
let state = new State();
