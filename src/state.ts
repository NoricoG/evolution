import { Environment } from "./environment.js";
import { Individual } from "./individual.js";

import { Brain } from "./genetics/brain.js";
import { Diet } from "./genetics/diet.js";


export class State {

    day: number;

    individualsById: { [id: string]: Individual } = {};
    individuals: Individual[] = [];

    individualIdCounter = -1;

    environment: Environment;

    constructor() {

        this.day = 0;

        this.createInitialIndividuals();

        this.environment = new Environment(50);
    }

    private createInitialIndividuals() {
        const firstIndividuals = [
            new Individual(this.day, null, Brain.debugHerbivore(), Diet.randomHerbivore()),
            new Individual(this.day, null, Brain.debugHerbivore(), Diet.randomHerbivore()),
            new Individual(this.day, null, Brain.debugCarnivore(), Diet.randomCarnivore())
        ];

        for (const individual of firstIndividuals) {
            this.saveIndividual(individual);
        }

        const growingDays = 3;
        const newChildren = [];
        for (let i = 0; i < growingDays; i++) {
            this.day++;
            for (const individual of this.individuals) {
                const child = individual.createChild(this.day);
                newChildren.push(child);
            }
        }
        for (const child of newChildren) {
            this.saveIndividual(child);
        }
    }

    nextIndividualId(): string {
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
        function translate(num: number): string {
            const consonants = 'bcdfghjklmnpqrstvwxyz';
            const vowels = 'aeiou';

            const c = consonants.length; // 21
            const v = vowels.length;     // 5

            const firstIdx = num % c;
            const vowelIdx = Math.floor(num / c) % v;
            const lastIdx = Math.floor(num / (c * v)) % c;

            const name = consonants[firstIdx].toUpperCase() + vowels[vowelIdx] + consonants[lastIdx];
            return name;
        }

        return translate(this.individualIdCounter);
    }

    saveIndividual(individual: Individual) {
        individual.id = this.nextIndividualId();
        this.individualsById[individual.id] = individual;
        this.individuals.push(individual);
    }

    updateEnvironment() {
        this.environment.nextDay();
    }

    livingIndividualCount(): number {
        return this.individuals.filter(individual => !individual.deathDay).length;
    }

    archiveDeadIndividuals() {
        // cleanup
        for (let individualId of Object.keys(this.individualsById)) {
            if (this.individualsById[individualId].deathDay) {
                delete this.individualsById[individualId];
            }
        }
        this.individuals = Object.values(this.individualsById);
    }
}
