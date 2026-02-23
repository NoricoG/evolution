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
        }
        else if (action < 3 / 4 && anyUnderdeveloped && noLonelyIndividuals) {
            addTraitOrDiet(underdevelopedSpeciesIndices);
        }
        else {
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
function addTraitOrDiet(underdevelopedSpeciesIndices) {
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
    }
    else {
        newSpecies();
    }
}
class Action {
    individual;
    constructor(individual) {
        this.individual = individual;
    }
}
class HideAction extends Action {
    execute() {
        this.individual.shelter = true;
        state.climate.shelter--;
        log(`${this.individual.id} 🛡️ -> ${this.individual.statusString()}`);
        if (state.climate.shelter == 0) {
            log("0 shelter remaining");
        }
    }
}
class GatherAction extends Action {
    execute() {
        this.individual.hunger--;
        if (this.individual.species.traits.includes(Trait.BURROWING) && this.individual.hunger == 0) {
            this.individual.shelter = true;
        }
        state.climate.food--;
        log(`${this.individual.id} 🥕 -> ${this.individual.statusString()}`);
        if (state.climate.food == 0) {
            log("0 food remaining");
        }
    }
}
class HuntAction extends Action {
    victim;
    constructor(individual, victim) {
        super(individual);
        this.victim = victim;
    }
    execute() {
        this.individual.hunger -= this.victim.species.defaultHunger;
        if (this.individual.hunger < 0) {
            this.individual.hunger = 0;
        }
        if (this.individual.species.traits.includes(Trait.BURROWING) && this.individual.hunger == 0) {
            this.individual.shelter = true;
        }
        this.victim.eaten = true;
        log(`${this.individual.id} 🍗 ${this.victim.id} -> ${this.individual.statusString()}`);
        this.triggerScavanger();
    }
    triggerScavanger() {
        for (let species of state.species) {
            if (species.diet == Diet.SCAVENGER) {
                for (let individual of species.individuals) {
                    if (!individual.eaten && individual.hunger > 0) {
                        individual.hunger--;
                        if (individual.species.traits.includes(Trait.BURROWING) && individual.hunger == 0) {
                            individual.shelter = true;
                        }
                        log(` ${individual.id} 🦴 ${this.victim.id} -> ${individual.statusString()}`);
                        return;
                    }
                }
            }
        }
    }
}
function doFeeding() {
    actions();
    return doExtinction();
}
function actions() {
    const dietCounts = {};
    var herbivores = 0;
    for (let species of state.species) {
        if (species.diet) {
            dietCounts[species.diet] = (dietCounts[species.diet] || 0) + 1;
        }
        else {
            herbivores++;
        }
    }
    var diets = [];
    if (herbivores > 0) {
        diets.push(`${herbivores} herbivore${herbivores > 1 ? "s" : ""}`);
    }
    if (dietCounts[Diet.CARNIVORE]) {
        diets.push(`${dietCounts[Diet.CARNIVORE]} carnivore${dietCounts[Diet.CARNIVORE] > 1 ? "s" : ""}`);
    }
    if (dietCounts[Diet.OMNIVORE]) {
        diets.push(`${dietCounts[Diet.OMNIVORE]} omnivore${dietCounts[Diet.OMNIVORE] > 1 ? "s" : ""}`);
    }
    if (dietCounts[Diet.SCAVENGER]) {
        diets.push(`${dietCounts[Diet.SCAVENGER]} scavenger${dietCounts[Diet.SCAVENGER] > 1 ? "s" : ""}`);
    }
    log(diets.join(", "));
    state.climate = new Climate();
    log(`${state.climate.food} food, ${state.climate.shelter} shelter`);
    // reset hunger and shelter
    for (let species of state.species) {
        for (let individual of species.individuals) {
            individual.hunger = species.defaultHunger;
            individual.shelter = false;
        }
    }
    var allIndividuals = state.species.flatMap(species => species.individuals.map(individual => [species, individual]));
    var active = true;
    while (active) {
        active = false;
        // shuffle allIndividuals
        for (let i = allIndividuals.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allIndividuals[i], allIndividuals[j]] = [allIndividuals[j], allIndividuals[i]];
        }
        for (const [species, individual] of allIndividuals) {
            if (act(species, individual)) {
                active = true;
            }
        }
    }
    if (state.climate.food > 0) {
        log(`${state.climate.food} food remaining`);
    }
    if (state.climate.shelter > 0) {
        log(`${state.climate.shelter} shelter remaining`);
    }
}
function act(species, individual) {
    if (individual.eaten) {
        return false;
    }
    const possibleActions = [];
    if (!individual.shelter && state.climate.shelter > 0) {
        possibleActions.push(new HideAction(individual));
    }
    if (individual.hunger > 0) {
        const canHunt = species.diet === Diet.CARNIVORE || species.diet === Diet.OMNIVORE;
        const canGather = species.diet != Diet.CARNIVORE;
        if (canHunt) {
            const victims = [];
            const sameSpeciesVictims = [];
            for (let victimSpecies of state.species) {
                for (let victimIndividual of victimSpecies.individuals) {
                    // can't eat itself
                    if (individual.id === victimIndividual.id) {
                        continue;
                    }
                    if (victimIndividual.canBeEatenBy(species)) {
                        if (victimSpecies == species) {
                            sameSpeciesVictims.push(victimIndividual);
                        }
                        else {
                            victims.push(victimIndividual);
                        }
                    }
                }
            }
            if (victims.length > 0) {
                const victim = victims[Math.floor(Math.random() * victims.length)];
                possibleActions.push(new HuntAction(individual, victim));
            }
            else if (sameSpeciesVictims.length > 0) {
                const victim = sameSpeciesVictims[Math.floor(Math.random() * sameSpeciesVictims.length)];
                possibleActions.push(new HuntAction(individual, victim));
            }
        }
        if (canGather && state.climate.food > 0) {
            possibleActions.push(new GatherAction(individual));
        }
    }
    if (possibleActions.length > 0) {
        const action = possibleActions[Math.floor(Math.random() * possibleActions.length)];
        action.execute();
        return true;
    }
    return false;
}
function doExtinction() {
    const eatenIndividuals = [];
    const starvedIndividuals = [];
    // separate dead individuals and update species
    for (let species of state.species) {
        const alive = [];
        for (let individual of species.individuals) {
            if (individual.eaten) {
                eatenIndividuals.push(individual);
            }
            else if (individual.hunger > 0) {
                starvedIndividuals.push(individual);
            }
            else {
                alive.push(individual);
            }
        }
        species.individuals = alive;
    }
    // remove extinct species
    state.species = state.species.filter(species => species.aliveIndividuals() > 0);
    if (starvedIndividuals.length > 0) {
        log(`${starvedIndividuals.length} individuals starved`);
    }
    return [eatenIndividuals, starvedIndividuals];
}
const hungerLabels = ["🟢", "🟡", "🔴"];
class Individual {
    id;
    hunger;
    shelter = false;
    eaten = false;
    species;
    constructor(species) {
        this.species = species;
        this.id = this.species.id + this.species.maxIndividualId;
        this.species.maxIndividualId++;
        this.hunger = species.defaultHunger;
    }
    toString() {
        return `${this.id} (${this.species.getTraitsString()})`;
    }
    statusString() {
        return `${hungerLabels[this.hunger]}${this.shelter ? "🛡️" : "👁️"}`;
    }
    canBeEatenBy(predator) {
        if (this.eaten) {
            return false;
        }
        if (this.shelter) {
            return false;
        }
        return this.species.canBeEatenBy(predator);
    }
}
class Species {
    id;
    maxIndividualId = 1;
    traits = [];
    diet = undefined;
    defaultHunger = 1;
    individuals;
    constructor(state) {
        this.id = state.nextSpeciesId();
        this.individuals = [new Individual(this)];
    }
    aliveIndividuals() {
        return this.individuals.filter(x => !x.eaten).length;
    }
    getTraitsString() {
        this.traits = sortTraits(this.traits);
        var label = "";
        for (let trait of this.traits) {
            label += `${trait} `;
        }
        if (this.diet == undefined) {
            label += "herbivore";
        }
        else {
            label += `${this.diet}`;
        }
        return label;
    }
    getIndividualsAndTraitsString() {
        const plural = this.aliveIndividuals() != 1 ? 's' : '';
        return `${this.aliveIndividuals().toString()} ${this.getTraitsString()}${plural}`;
    }
    toString() {
        return `${this.id} (${this.getIndividualsAndTraitsString()})`;
    }
    getTraitOrDietCount() {
        return this.traits.length + (this.diet ? 1 : 0);
    }
    addIndividual() {
        this.individuals.push(new Individual(this));
    }
    addTraitOrDiet(traitOrDiet) {
        if (Object.values(Trait).includes(traitOrDiet)) {
            return this.addTrait(traitOrDiet);
        }
        else if (Object.values(Diet).includes(traitOrDiet)) {
            return this.addDiet(traitOrDiet);
        }
        else {
            throw new Error(`Invalid traitOrDiet: ${traitOrDiet}`);
        }
    }
    addTrait(trait) {
        if (this.traits.includes(trait)) {
            return false;
        }
        this.traits.push(trait);
        if (trait == Trait.LARGE) {
            this.defaultHunger++;
        }
        return true;
    }
    addDiet(diet) {
        if (this.diet != undefined) {
            return false;
        }
        this.diet = diet;
        return true;
    }
    canBeEatenBy(predator) {
        if (this.traits.includes(Trait.SWIMMING) && !predator.traits.includes(Trait.SWIMMING)) {
            return false;
        }
        if (this.traits.includes(Trait.LARGE) && !predator.traits.includes(Trait.LARGE)) {
            return false;
        }
        return true;
    }
}
var Phase;
(function (Phase) {
    Phase[Phase["Development"] = 0] = "Development";
    Phase[Phase["Feeding"] = 1] = "Feeding";
    Phase[Phase["Extinction"] = 2] = "Extinction";
})(Phase || (Phase = {}));
class Climate {
    food;
    shelter;
    constructor() {
        this.food = 2 + Math.ceil(Math.random() * 6) + Math.ceil(Math.random() * 6);
        this.shelter = Math.ceil(Math.random() * 6);
    }
}
class State {
    initial = true;
    phase = Phase.Development;
    species = [];
    speciesId = " @"; // will be incremented to " A"
    climate = new Climate();
    nextSpeciesId() {
        // increment last character
        this.speciesId = this.speciesId[0] + String.fromCharCode(this.speciesId.charCodeAt(1) + 1);
        // prevent collisions
        if (this.species.some(species => species.id == this.speciesId)) {
            return this.nextSpeciesId();
        }
        // handle overflow of last character
        if (this.speciesId[1] > "Z") {
            if (this.speciesId[0] == " ") {
                this.speciesId = "AA";
            }
            else {
                if (this.speciesId[0] < "Z") {
                    // increment first character and reset last character to A
                    this.speciesId = String.fromCharCode(this.speciesId.charCodeAt(0) + 1) + "A";
                }
                else {
                    console.log("Ran out of two character ids, cycling back to A");
                    this.speciesId = " A";
                }
            }
        }
        return this.speciesId;
    }
}
var state = new State();
function nextPhase() {
    setPhaseTitle();
    setBackground();
    clearLog();
    var speciesBefore;
    switch (state.phase) {
        case Phase.Development:
            speciesBefore = getSpeciesBefore();
            doDevelopment();
            logAfterDevelopment(speciesBefore);
            state.phase = Phase.Feeding;
            break;
        case Phase.Feeding:
            speciesBefore = getSpeciesBefore();
            const deaths = doFeeding();
            logAfterFeeding(speciesBefore, deaths);
            state.phase = Phase.Development;
            break;
    }
}
function getSpeciesBefore() {
    const speciesBefore = {};
    for (let species of state.species) {
        speciesBefore[species.id] = { individuals: species.individuals.length, traits: species.getTraitsString() };
    }
    return speciesBefore;
}
function logAfterDevelopment(speciesBefore) {
    const speciesAfter = {};
    for (let species of state.species) {
        speciesAfter[species.id] = { individuals: species.individuals.length, traits: species.getTraitsString() };
    }
    const allSpeciesIds = new Set([...Object.keys(speciesBefore), ...Object.keys(speciesAfter)]);
    resetSpecies();
    for (let speciesId of allSpeciesIds) {
        const before = speciesBefore[speciesId] || { individuals: 0, traits: "" };
        const after = speciesAfter[speciesId] || { individuals: 0, traits: "" };
        let message = `${speciesId}: `;
        const sameCount = before.individuals === after.individuals;
        const sameTraits = before.traits === after.traits;
        if (sameCount && sameTraits) {
            message += `${before.individuals} ${before.traits}`;
            if (before.individuals != 1) {
                message += "s";
            }
            addToSpecies(message);
            continue;
        }
        message += before.individuals;
        if (!sameTraits && before.traits !== "") {
            message += ` ${before.traits}`;
            if (before.individuals != 1) {
                message += "s";
            }
        }
        message += " -> ";
        if (!sameCount) {
            message += after.individuals;
        }
        message += ` ${after.traits}`;
        if (after.individuals != 1) {
            message += "s";
        }
        addToSpecies(message);
    }
}
function logAfterFeeding(before, deaths) {
    const individualsAfter = {};
    for (let species of state.species) {
        individualsAfter[species.id] = species.individuals.length;
    }
    const allSpeciesIds = new Set([...Object.keys(before), ...Object.keys(individualsAfter)]);
    const speciesEaten = {};
    const speciesStarved = {};
    for (const eaten of deaths[0]) {
        const speciesId = eaten.species.id;
        speciesEaten[speciesId] = (speciesEaten[speciesId] || 0) + 1;
    }
    for (const starved of deaths[1]) {
        const speciesId = starved.species.id;
        speciesStarved[speciesId] = (speciesStarved[speciesId] || 0) + 1;
    }
    resetSpecies();
    for (let speciesId of allSpeciesIds) {
        const traits = before[speciesId]?.traits || "";
        const beforeCount = before[speciesId]?.individuals || 0;
        const afterCount = individualsAfter[speciesId] || 0;
        let message = `${speciesId}: `;
        message += beforeCount == afterCount
            ? `${beforeCount} `
            : `${beforeCount} -> ${afterCount} `;
        message += `${traits}`;
        if (beforeCount != 1 || afterCount != 1) {
            message += "s";
        }
        const eatenCount = speciesEaten[speciesId] || 0;
        const starvedCount = speciesStarved[speciesId] || 0;
        if (eatenCount || starvedCount) {
            const parts = [];
            if (eatenCount) {
                parts.push(`${eatenCount} eaten`);
            }
            if (starvedCount) {
                parts.push(`${starvedCount} starved`);
            }
            message += ` (${parts.join(", ")})`;
        }
        addToSpecies(message);
    }
}
var Trait;
(function (Trait) {
    Trait["LARGE"] = "large";
    Trait["BURROWING"] = "burrowing";
    Trait["SWIMMING"] = "swimming";
})(Trait || (Trait = {}));
const traitOrder = [Trait.LARGE, Trait.BURROWING, Trait.SWIMMING];
function sortTraits(traits) {
    return traits.sort((a, b) => traitOrder.indexOf(a) - traitOrder.indexOf(b));
}
var Diet;
(function (Diet) {
    // herbivore is lack of Diet
    Diet["CARNIVORE"] = "carnivore";
    Diet["OMNIVORE"] = "omnivore";
    Diet["SCAVENGER"] = "scavenger";
})(Diet || (Diet = {}));
const allTraitsAndDiets = [...Object.values(Trait), ...Object.values(Diet)];
function getRandomTraitOrDiet() {
    return allTraitsAndDiets[Math.floor(Math.random() * allTraitsAndDiets.length)];
}
window.onload = function () {
    nextPhase();
};
function clearLog() {
    document.getElementById("log").innerHTML = "";
}
function log(message = "") {
    const p = document.createElement("p");
    p.innerText = message;
    document.getElementById("log").appendChild(p);
}
function setPhaseTitle() {
    const title = document.getElementById("phase-title");
    switch (state.phase) {
        case Phase.Development:
            title.innerText = "Development Phase";
            break;
        case Phase.Feeding:
            title.innerText = "Feeding Phase";
            break;
    }
}
function setBackground() {
    switch (state.phase) {
        case Phase.Development:
            document.body.style.backgroundColor = "#f0f7f6";
            break;
        case Phase.Feeding:
            document.body.style.backgroundColor = "#fffef2";
            break;
    }
}
function resetSpecies() {
    document.getElementById("species").innerHTML = "";
}
function addToSpecies(line) {
    const speciesDiv = document.getElementById("species");
    const p = document.createElement("p");
    p.innerText = line;
    speciesDiv.appendChild(p);
}
function showHideLog() {
    const logDiv = document.getElementById("log");
    const logTitle = document.getElementById("log-title");
    if (logDiv.classList.contains("hide")) {
        logDiv.classList.remove("hide");
        logTitle.innerText = "Log -";
    }
    else {
        logDiv.classList.add("hide");
        logTitle.innerText = "Log +";
    }
}
