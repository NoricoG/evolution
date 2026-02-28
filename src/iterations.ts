import { Action, allActions, ReproduceAction } from "./action.js";
import { Individual } from "./individual.js";
import { State } from "./state.js";


// action to prioritise for debugging
// const debugAction = FeedChildAction;
const debugAction = null;

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
            this.addIndividuals();

            this.state.updateEnvironment();

            this.actAllIndividuals();
            this.starveIndividuals();

            if (this.state.getIndividualsArray().filter(individual => !individual.deathDay).length == 0) {
                alert("All individuals have died.");
            }
        }
    }

    addIndividuals() {
        const minimalIndividuals = 5;
        const maxMigratingIndividuals = Math.max(0, minimalIndividuals - this.state.getIndividualsArray().length);
        const migratingIndividuals = Math.random() * maxMigratingIndividuals;

        for (let i = 0; i < migratingIndividuals; i++) {
            this.state.saveIndividual(Individual.random(this.state.day));
        }
    }

    actAllIndividuals() {
        // shuffle individuals
        const individualsArray = this.state.getIndividualsArray();
        for (let i = individualsArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [individualsArray[i], individualsArray[j]] = [individualsArray[j], individualsArray[i]];
        }

        for (const individual of individualsArray) {
            this.actIndividual(individual);
        }
    }

    actIndividual(individual: Individual) {
        if (individual.deathDay) {
            return;
        }

        if (individual.getAge(this.state.day) == 0) {
            return;
        }

        const possibleActions: Action[] = [];

        for (const ActionClass of allActions) {
            const action = new ActionClass(individual);
            if (action.isPossible(this.state)) {
                possibleActions.push(action);
            }
        }

        if (possibleActions.length > 0) {
            let action = individual.strategy.decide(possibleActions, individual);

            // debug specific action
            if (action && debugAction && possibleActions.some(a => a instanceof debugAction) && !(action instanceof debugAction)) {
                const oldAction = action.toString();
                action = possibleActions.find(a => a instanceof debugAction)!;
                const newAction = action.toString();
                console.log(`Debug: ${individual.id} will do ${newAction} instead of ${oldAction}`);
            }

            action?.execute(this.state);
            individual.lastEvent = action?.toString() ?? "x";
        } else {
            individual.lastEvent = "x";
        }

        // // always have a baby if individual has a lot of energy and didn't reproduce yesterday
        // const reproducedLastRound = individual.children.some(child => child.birthday == this.state.day - 1);
        // if (individual.energy > 3 && !reproducedLastRound) {
        //     new ReproduceAction(individual).execute(this.state);
        // }

        individual.energy -= individual.traits.energyNeed;
    }

    starveIndividuals() {
        let starvedIndividuals = 0;

        for (let individual of this.state.getIndividualsArray()) {
            if (individual.energy <= 0 && !individual.deathDay && individual.getAge(this.state.day) > 0) {
                individual.starved = true;
                individual.deathDay = this.state.day;
                if (individual.shelter) {
                    this.state.environment.shelter++;
                }
                // this.state.environment.freshBodies.push(individual.id);
                starvedIndividuals++;
            }
        }
    }


}
