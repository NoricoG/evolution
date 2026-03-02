import { Environment } from "./environment.js";
import { Individual } from "./individual.js";

import { Brain } from "./genetics/brain.js";
import { Diet } from "./genetics/diet.js";

import { intToName } from "./utils/name.js"
import { SimulationMetrics } from "./metrics.js";


export class State {

    day: number;

    individualsById: { [id: string]: Individual } = {};
    individuals: Individual[] = [];

    individualIdCounter = -1;

    readonly environment: Environment;

    readonly metrics: SimulationMetrics = new SimulationMetrics();

    constructor() {

        this.day = 0;

        this.environment = new Environment(50);

        this.createInitialIndividuals();
    }

    private createInitialIndividuals() {
        const firstIndividuals = [
            new Individual(this.day, null, Brain.neutral(), Diet.neutral()),
            new Individual(this.day, null, Brain.neutral(), Diet.neutral()),
        ];

        for (const individual of firstIndividuals) {
            this.saveIndividual(individual);
        }

        this.metrics.addDayMetrics(this);
    }

    private nextIndividualId(): string {
        this.individualIdCounter++;
        return intToName(this.individualIdCounter);
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
        for (let individualId of Object.keys(this.individualsById)) {
            if (this.individualsById[individualId].deathDay) {
                delete this.individualsById[individualId];
            }
        }
        this.individuals = Object.values(this.individualsById);

        // clean up ancestors when consecutive generations are dead
        for (let individual of this.individuals) {
            var parent = individual.parent;
            var deadInARow = 0;
            // find consecutive dead parents
            while (parent && deadInARow < 2) {
                if (parent.deathDay) {
                    deadInARow++;

                } else {
                    deadInARow = 0;
                }
                parent = parent.parent;
            }
            // clean up earlier parents
            var nextParent = parent;
            while (nextParent) {
                const nextNextParent = nextParent.parent;
                nextParent.parent = null;
                nextParent = nextNextParent;
            }
        }
    }
}
