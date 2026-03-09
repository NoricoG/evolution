import { EatPlantAction, EatMeatAction, ReproduceAction, WaitAction } from "../simulation/actions/act.js";
import { EatAction, MainAction } from "../simulation/actions/decide.js";
import { EnergyConstants } from "../simulation/constants.js";
import { State } from "../simulation/state.js";
import { ActionMetrics } from "./charts/metrics.js";

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

            const actionMetrics = this.actAllIndividuals();
            this.starveIndividuals();

            this.state.metrics.addDayMetrics(this.state, actionMetrics);

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

    private actAllIndividuals(): ActionMetrics {
        const actionMetrics = new ActionMetrics();

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
                this.recordActionStats(mainAction, actionMetrics);

                individual.energy += gainedEnergy;
                if (individual.energy > EnergyConstants.max) {
                    individual.energy = EnergyConstants.max;
                }
            }
        }

        return actionMetrics;
    }

    private recordActionStats(mainAction: MainAction, actionMetrics: ActionMetrics) {
        const chosen = mainAction.chosenAction;
        if (chosen instanceof EatAction) {
            const leafAction = chosen.chosenAction;
            if (leafAction instanceof EatPlantAction) {
                if (leafAction.succesful) actionMetrics.eatPlantSuccess++;
                else actionMetrics.eatPlantFail++;
            } else if (leafAction instanceof EatMeatAction) {
                if (leafAction.victim) actionMetrics.eatMeatSuccess++;
                else actionMetrics.eatMeatFail++;
            }
        } else if (chosen instanceof ReproduceAction) {
            actionMetrics.offspringCounts.push(chosen.cloneIds.length);
        } else if (chosen instanceof WaitAction) {
            actionMetrics.wait++;
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
