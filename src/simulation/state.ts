import { Environment } from "@simulation/environment.js";
import { Individual } from "@simulation/individual.js";
import { SimulationMetrics } from "@simulation/metrics.js";
import { intToName } from "@simulation/name.js";

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
            Individual.neutral(this.day),
            Individual.neutral(this.day),
            Individual.neutral(this.day),
        ];

        for (const individual of firstIndividuals) {
            this.saveIndividual(individual);
        }
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
        return this.individuals.filter(individual => individual.deathDay == null).length;
    }

    archiveDeadIndividuals() {
        for (let [individualId, individual] of this.individualsById.entries()) {
            if (individual.deathDay != null) {
                this.individualsById.delete(individualId);
            } else {
                individual.pruneDeadParents();
            }
        }
        this.individuals = Array.from(this.individualsById.values());
    }

    logGrowUp() { this.metrics.logGrowUp(); }
    logLearn() { this.metrics.logLearn(); }
    logPlantSearch(succesful: boolean) { this.metrics.logPlantSearch(succesful); }
    logHunt(succesful: boolean) { this.metrics.logHunt(succesful); }
    logReproduce(count: number) { this.metrics.logReproduce(count); }
}
