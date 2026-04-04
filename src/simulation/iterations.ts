import { EnergyConstants } from "@simulation/constants.js";
import { BrainDecision } from "@simulation/action/decision.js";
import { ActionMetrics } from "@simulation/metrics.js";
import { State } from "@simulation/state.js";

export class Iterations {

    readonly state: State;

    constructor(state: State) {
        this.state = state;
    }

    execute(iterations: number): boolean {
        for (let i = 0; i < iterations; i++) {
            this.state.archiveDeadIndividuals();

            this.state.metrics.addnewDay();
            this.state.day++;

            this.state.updateEnvironment();

            this.actAllIndividuals(this.state.metrics.latestDayMetrics.actions);
            this.starveIndividuals();

            this.state.metrics.calculateRemainingMetrics(this.state);

            const allDead = this.state.individuals.filter(individual => individual.deathDay == null).length == 0;
            if (allDead) {
                // don't continue loop
                return false;
            }
        }
        // continue loop
        return true;
    }

    private actAllIndividuals(actionMetrics: ActionMetrics) {
        // shuffle individuals
        const individuals = this.state.individuals;
        for (let i = individuals.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [individuals[i], individuals[j]] = [individuals[j], individuals[i]];
        }

        for (const individual of individuals) {
            if (BrainDecision.isPossible(individual, this.state)) {
                const gainedEnergy = BrainDecision.execute(individual, this.state, this.state.metrics.latestDayMetrics.actions);

                individual.energy += gainedEnergy;
                if (individual.energy > EnergyConstants.max) {
                    individual.energy = EnergyConstants.max;
                }
            }
        }
    }

    private starveIndividuals() {
        let starvedIndividuals = 0;

        for (let individual of this.state.individuals) {
            const lowEnergy = individual.energy <= 0;
            const alive = individual.deathDay == null;
            const notBornToday = individual.getAge(this.state.day) > 0;
            if (lowEnergy && alive && notBornToday) {
                individual.dieStarved(this.state.day);
                this.state.space.removeAnimal(individual);
                starvedIndividuals++;
            }
        }
    }
}
