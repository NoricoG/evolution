import { MainAction } from "./actions/decide.js";
import { EnergyConstants } from "./constants.js";
import { Individual } from "./individual.js";
import { State } from "./state.js";

export class Iterations {

    readonly state: State;

    constructor(state: State) {
        this.state = state;
    }

    execute(iterations: number): boolean {
        for (let i = 0; i < iterations; i++) {
            this.state.archiveDeadIndividuals();
            this.state.day++;

            this.state.updateEnvironment();

            this.actAllIndividuals();
            this.starveIndividuals();

            this.state.metrics.addDayMetrics(this.state);

            const allDead = this.state.individuals.filter(individual => !individual.deathDay).length == 0;
            if (allDead) {
                const anyDiedToday = this.state.individuals.filter(individual => individual.deathDay == this.state.day).length > 0;
                if (anyDiedToday) {
                    alert("All individuals have died. Reload the page for a new simulation.");
                }
                return false;
            }
        }
        return true;
    }

    private actAllIndividuals() {
        // shuffle individuals
        const individuals = this.state.individuals;
        for (let i = individuals.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [individuals[i], individuals[j]] = [individuals[j], individuals[i]];
        }

        for (const individual of individuals) {
            const mainAction = new MainAction(individual);
            if (mainAction.isPossible(this.state)) {
                const gainedEnergy = mainAction.execute(this.state);

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
            if (individual.energy <= 0 && !individual.deathDay && individual.getAge(this.state.day) > 0) {
                individual.dieStarved(this.state.day);
                starvedIndividuals++;
            }
        }
    }
}
