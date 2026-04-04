import { Environment } from "@simulation/environment.js";
import { Individual } from "@simulation/individual.js";
import { SimulationMetrics } from "@simulation/metrics.js";
import { Space } from "@simulation/space";
import { Brain } from "@simulation/genetics/brain.js";
import { Diet } from "@simulation/genetics/diet.js";
import { Skills } from "@simulation/genetics/skills.js";
import { Traits } from "@simulation/genetics/traits.js";

export class State {

    day: number;

    individualsById = new Map<number, Individual>();
    individuals: Individual[] = [];

    individualIdCounter = -1;

    readonly environment: Environment;
    readonly space: Space;

    readonly metrics: SimulationMetrics = new SimulationMetrics();

    constructor() {

        this.day = 0;

        this.space = new Space(160, 100);
        this.environment = new Environment(this.space);

        this.createInitialIndividuals();
    }

    private createInitialIndividuals() {
        const amount = 20;
        for (let i = 0; i < amount; i++) {
            const location = this.space.randomEmptyLocation();
            const brain = Brain.neutral().mutatedCopy(false);
            const diet = Diet.neutral().mutatedCopy(false);
            const traits = Traits.neutral().mutatedCopy(false);
            const skills = Skills.neutral().mutatedCopy(false);
            const individual = new Individual(location, this.day, null, brain, diet, traits, skills);
            this.saveIndividual(individual);
        }
    }


    private nextIndividualId(): number {
        this.individualIdCounter++;
        return this.individualIdCounter;
    }

    saveIndividual(individual: Individual) {
        individual.id = this.nextIndividualId();
        this.individualsById.set(individual.id, individual);
        this.individuals.push(individual);

        this.space.addAnimal(individual);
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
                this.space.removeAnimal(individual);

                this.individualsById.delete(individualId);
            }
        }

        this.individuals = Array.from(this.individualsById.values());
    }
}
