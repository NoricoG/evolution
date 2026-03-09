import { Environment } from "./environment.js";
import { Individual } from "./individual.js";

import { Brain } from "./genetics/brain.js";

import { intToName } from "../utils/name.js"
import { ActionMetrics, SimulationMetrics } from "../app/charts/metrics.js";


export class State {

    day: number;

    individualsById = new Map<string, Individual>();
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
            new Individual(this.day, null, Brain.neutral()),
            new Individual(this.day, null, Brain.neutral()),
        ];

        for (const individual of firstIndividuals) {
            this.saveIndividual(individual);
        }

        this.metrics.addDayMetrics(this, new ActionMetrics());
    }

    private nextIndividualId(): string {
        this.individualIdCounter++;
        return intToName(this.individualIdCounter);
    }

    saveIndividual(individual: Individual) {
        individual.id = this.nextIndividualId();
        this.individualsById.set(individual.id, individual);
        this.individuals.push(individual);
    }

    updateEnvironment() {
        this.environment.nextDay();
    }

    livingIndividualCount(): number {
        return this.individuals.filter(individual => !individual.deathDay).length;
    }

    archiveDeadIndividuals() {
        for (let [individualId, individual] of this.individualsById.entries()) {
            if (individual.deathDay) {
                this.individualsById.delete(individualId);
            }
        }
        this.individuals = Array.from(this.individualsById.values());

        // clean up ancestors when consecutive generations are dead
        for (let individual of this.individuals) {
            let parent = individual.parent;
            let deadInARow = 0;
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
            let nextParent = parent;
            while (nextParent) {
                const nextNextParent = nextParent.parent;
                nextParent.parent = null;
                nextParent = nextNextParent;
            }
        }
    }
}
