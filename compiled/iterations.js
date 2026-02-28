"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Iterations = void 0;
const action_js_1 = require("./action.js");
const individual_js_1 = require("./individual.js");
const state_js_1 = require("./state.js");
// action to prioritise for debugging
// const debugAction = FeedChildAction;
const debugAction = null;
class Iterations {
    state;
    constructor(state) {
        this.state = state;
    }
    playInterval = null;
    play(fast) {
        const wait = fast ? 500 : 1000;
        this.playInterval = setInterval(() => this.nextIteration(1), wait);
    }
    pause() {
        clearInterval(this.playInterval);
        this.playInterval = null;
    }
    nextIteration(iterations) {
        for (let i = 0; i < iterations; i++) {
            // cleanup
            for (let individualId of Object.keys(this.state.individuals)) {
                if (this.state.individuals[individualId].dead && this.state.individuals[individualId].deathDay < this.state.day - 1) {
                    delete this.state.individuals[individualId];
                }
            }
            this.state.day++;
            this.addIndividuals();
            this.state.updateEnvironment();
            this.actAllIndividuals();
            this.starveIndividuals();
            if (this.state.individualsArray.filter(individual => !individual.dead).length == 0) {
                alert("All individuals have died.");
            }
        }
    }
    addIndividuals() {
        const maxMigratingIndividuals = Math.max(0, state_js_1.State.targetIndividuals - this.state.individualsArray.length);
        const migratingIndividuals = Math.random() * maxMigratingIndividuals;
        for (let i = 0; i < migratingIndividuals; i++) {
            this.state.saveIndividual(individual_js_1.Individual.random(this.state.day));
        }
    }
    actAllIndividuals() {
        // shuffle individuals
        const individualsArray = this.state.individualsArray;
        for (let i = individualsArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [individualsArray[i], individualsArray[j]] = [individualsArray[j], individualsArray[i]];
        }
        for (const individual of individualsArray) {
            this.actIndividual(individual);
        }
    }
    actIndividual(individual) {
        if (individual.dead) {
            return;
        }
        if (individual.getAge(this.state.day) == 0) {
            return;
        }
        const possibleActions = [];
        for (const ActionClass of action_js_1.allActions) {
            const action = new ActionClass(individual);
            if (action.isPossible(this.state)) {
                possibleActions.push(action);
            }
        }
        if (possibleActions.length > 0) {
            let action = individual.strategy.decide(possibleActions, individual);
            // debug specific action
            if (debugAction && possibleActions.some(a => a instanceof debugAction) && !(action instanceof debugAction)) {
                const oldAction = action.toString();
                action = possibleActions.find(a => a instanceof debugAction);
                const newAction = action.toString();
                console.log(`Debug: ${individual.id} will do ${newAction} instead of ${oldAction}`);
            }
            action.execute(this.state);
            individual.lastEvent = action.toString();
        }
        else {
            individual.lastEvent = "x";
        }
        individual.energy -= individual.traits.energyNeed;
    }
    starveIndividuals() {
        let starvedIndividuals = 0;
        for (let individual of this.state.individualsArray) {
            if (individual.energy <= 0 && !individual.dead && individual.getAge(this.state.day) > 0) {
                individual.starved = true;
                individual.die(this.state.day);
                if (individual.shelter) {
                    this.state.environment.shelter++;
                }
                // this.state.environment.freshBodies.push(individual.id);
                starvedIndividuals++;
            }
        }
    }
}
exports.Iterations = Iterations;
