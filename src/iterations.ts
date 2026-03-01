import { Action, voluntaryActions, ReproduceAction, WaitAction } from "./action.js";
import { Individual } from "./individual.js";
import { State } from "./state.js";

export class Iterations {

    state: State;

    constructor(state: State) {
        this.state = state;
    }

    playInterval: ReturnType<typeof setInterval> | undefined = undefined;

    play(fast: boolean) {
        const wait = fast ? 500 : 1000;
        this.playInterval = setInterval(() => this.execute(1), wait);
    }

    pause() {
        clearInterval(this.playInterval);
        this.playInterval = undefined;
    }

    execute(iterations: number) {
        for (let i = 0; i < iterations; i++) {
            this.state.archiveDeadIndividuals();
            this.state.day++;

            // this.addIndividuals();

            this.state.updateEnvironment();

            this.actAllIndividuals();
            this.starveIndividuals();

            if (this.state.individuals.filter(individual => !individual.deathDay).length == 0) {
                alert("All individuals have died.");
            }
        }
    }

    addIndividuals() {
        const minimalIndividuals = 5;
        const maxMigratingIndividuals = Math.max(0, minimalIndividuals - this.state.individuals.length);
        const migratingIndividuals = Math.random() * maxMigratingIndividuals;

        for (let i = 0; i < migratingIndividuals; i++) {
            this.state.saveIndividual(Individual.random(this.state.day));
        }
    }

    actAllIndividuals() {
        // shuffle individuals
        const individuals = this.state.individuals;
        for (let i = individuals.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [individuals[i], individuals[j]] = [individuals[j], individuals[i]];
        }

        for (const individual of individuals) {
            this.actIndividual(individual);
        }
    }

    actIndividual(individual: Individual) {
        if (individual.deathDay) {
            return;
        }

        if (individual.getAge(this.state.day) == 0) {
            individual.events.push("📈");
            return;
        }

        const possibleActions: Action[] = [];

        for (const ActionClass of voluntaryActions) {
            const action = new ActionClass(individual);
            if (action.isPossible(this.state)) {
                possibleActions.push(action);
            }
        }

        let action = individual.brain.decide(possibleActions) || new WaitAction(individual);
        individual.energy += action.execute(this.state);
        individual.events.push(action.toString());
    }

    starveIndividuals() {
        let starvedIndividuals = 0;

        for (let individual of this.state.individuals) {
            if (individual.energy <= 0 && !individual.deathDay && individual.getAge(this.state.day) > 0) {
                individual.dieStarved(this.state.day);
                starvedIndividuals++;
            }
        }
    }
}
