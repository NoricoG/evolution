var didNewSpecies = 0;
var didAddTraitOrDiet = 0;
var didExtraIndividual = 0;

function doDevelopment() {
    var actions = 2;
    for (let species of state.species) {
        actions += species.aliveIndividuals();
    }

    clearLog();
    log(actions + " development actions");
    didNewSpecies = 0;
    didAddTraitOrDiet = 0;
    didExtraIndividual = 0;

    while (actions > 0) {
        actions--;
        const action = Math.random();
        const noSpecies = state.species.length === 0;

        const underdevelopedSpeciesIndices = state.species.map((species, index) => species.getTraitOrDietCount() < 3 ? index : -1).filter(index => index >= 0);
        const anyUnderdeveloped = underdevelopedSpeciesIndices.length > 0;

        const noLonelyIndividuals = state.species.every(species => species.aliveIndividuals() > 1);

        if (action < 1 / 4 || noSpecies) {
            newSpecies();
        } else if (action < 3 / 4 && anyUnderdeveloped && noLonelyIndividuals) {
            addTraitOrDiet(underdevelopedSpeciesIndices);
        } else {
            extraIndividual();
        }
    }

    if (didNewSpecies > 0) {
        log(`${didNewSpecies} new species`);
    }
    if (didAddTraitOrDiet > 0) {
        log(`${didAddTraitOrDiet} added traits or diets`);
    }
    if (didExtraIndividual > 0) {
        log(`${didExtraIndividual} extra individuals`);
    }
}

function newSpecies() {
    const newSpecies = new Species(state);
    state.species.push(newSpecies);
    didNewSpecies++;
}

function extraIndividual() {
    const chosenSpecies = state.species[Math.floor(Math.random() * state.species.length)];
    chosenSpecies.addIndividual();
    didExtraIndividual++;
}

function addTraitOrDiet(underdevelopedSpeciesIndices: number[]) {
    var traitOrDiet = getRandomTraitOrDiet();
    var chosenSpeciesIndex = underdevelopedSpeciesIndices[Math.floor(Math.random() * underdevelopedSpeciesIndices.length)];
    var chosenSpecies = state.species[chosenSpeciesIndex];

    var added = false;
    while (!added && chosenSpeciesIndex < state.species.length) {
        added = state.species[chosenSpeciesIndex].addTraitOrDiet(traitOrDiet);
        chosenSpeciesIndex++;
    }
    if (added) {
        didAddTraitOrDiet++;
    } else {
        newSpecies();
    }
}
