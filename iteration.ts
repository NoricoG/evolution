// action to prioritise for debugging
// const debugAction = FeedChildAction;
const debugAction = null;


let playInterval: ReturnType<typeof setInterval> | null = null;

function play(fast: boolean) {
    const wait = fast ? 500 : 1000;
    playInterval = setInterval(() => nextIteration(1), wait);
}

function pause() {
    clearInterval(playInterval);
    playInterval = null;
}

function nextIteration(iterations: number) {
    for (let i = 0; i < iterations; i++) {
        // cleanup
        for (let individualId of Object.keys(state.individuals)) {
            if (state.individuals[individualId].dead && state.individuals[individualId].deathDay < state.day - 1) {
                delete state.individuals[individualId];
            }
        }

        state.day++;
        addIndividuals();

        state.environment = new Environment(state, state.environment.freshBodies);

        actAllIndividuals();
        starveIndividuals();

        if (state.individualsArray.filter(individual => !individual.dead).length == 0) {
            alert("All individuals have died.");
        }
    }

    updateUI();
}

function addIndividuals() {
    const startingIndividuals = 20;
    const migratingIndividuals = Math.max(0, startingIndividuals - state.individualsArray.length);

    const starting = state.individualsArray.length == 0;
    const extraIndividuals = starting ? startingIndividuals : migratingIndividuals;

    for (let i = 0; i < extraIndividuals; i++) {
        const randomDiet = Object.values(Diet)[Math.floor(Math.random() * Object.values(Diet).length)];
        const newIndividual = new Individual(null, [], randomDiet, Strategy.randomStrategy(randomDiet));
        state.addIndividual(newIndividual);
    }
}

function actAllIndividuals() {
    // shuffle individuals
    const individualsArray = state.individualsArray;
    for (let i = individualsArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [individualsArray[i], individualsArray[j]] = [individualsArray[j], individualsArray[i]];
    }

    for (const individual of individualsArray) {
        actIndividual(individual);
    }
}

function actIndividual(individual: Individual) {
    if (individual.dead) {
        return;
    }

    if (individual.getAge() == 0) {
        return;
    }

    const possibleActions: Action[] = [];

    for (const ActionClass of allActions) {
        const action = new ActionClass(individual);
        if (action.isPossible()) {
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

        action.execute();
        individual.lastEvent = action.toString();
    } else {
        individual.lastEvent = "x";
    }
    individual.energy -= individual.energyNeed();
}

function starveIndividuals() {
    let starvedIndividuals = 0;

    for (let individual of state.individualsArray) {
        if (individual.energy <= 0 && !individual.dead && individual.getAge() > 0) {
            individual.starved = true;
            individual.die();
            state.environment.freshBodies.push(individual.id);
            starvedIndividuals++;
        }
    }
}
