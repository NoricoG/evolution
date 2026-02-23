function nextPhase() {
    display(state);
    switch (state.phase) {
        case Phase.Extinction:
            state.phase = Phase.Development;
            state = doDevelopment();
            break;
        case Phase.Development:
            state.phase = Phase.Feeding;
            state = doFeeding();
            break;
        case Phase.Feeding:
            state.phase = Phase.Extinction;
            state = doExtinction();
            break;
    }
}
function doDevelopment() {
    for (let player of state.players) {
        doDevelopmentForPlayer(player);
    }
    return state;
}
function doDevelopmentForPlayer(player) {
    var actions = 2;
    for (let species of player.species) {
        actions += species.aliveIndividuals();
    }
    while (actions > 0) {
        actions--;
        const action = Math.random();
        const noSpecies = player.species.length === 0;
        const underdevelopedSpecies = player.species.map((species, index) => species.getTraitOrDietCount() < 3 ? index : -1).filter(index => index >= 0);
        const anyUnderdeveloped = underdevelopedSpecies.length > 0;
        if (action < 1 / 3 || noSpecies) {
            player.species.push(new Species(player));
        }
        else if (action < 2 / 3 && anyUnderdeveloped) {
            var traitOrDiet = getRandomTraitOrDiet();
            var chosenSpecies = underdevelopedSpecies[Math.floor(Math.random() * underdevelopedSpecies.length)];
            var added = false;
            while (!added && chosenSpecies < player.species.length) {
                added = player.species[chosenSpecies].addTraitOrDiet(traitOrDiet);
                chosenSpecies++;
            }
            if (!added) {
                player.species.push(new Species(player));
            }
        }
        else {
            player.species[Math.floor(Math.random() * player.species.length)].addIndividual();
        }
    }
    state.climate = new Climate();
}
class Action {
    individual;
    constructor(individual) {
        this.individual = individual;
    }
}
class HideAction extends Action {
    toString() {
        return `HIDE: ${this.individual}`;
    }
    execute() {
        this.individual.shelter = true;
        state.climate.shelter--;
    }
}
class GatherAction extends Action {
    toString() {
        return `GATHER: ${this.individual}`;
    }
    execute() {
        this.individual.hunger--;
        state.climate.food--;
    }
}
class HuntAction extends Action {
    victim;
    constructor(individual, victim) {
        super(individual);
        this.victim = victim;
    }
    toString() {
        return `HUNT: ${this.individual} (EATING ${this.victim})`;
    }
    execute() {
        this.individual.hunger--;
        this.victim.eaten = true;
    }
}
function doFeeding() {
    // reset hunger and shelter
    for (let player of state.players) {
        for (let species of player.species) {
            for (let individual of species.individuals) {
                individual.hunger = species.defaultHunger;
                individual.shelter = false;
            }
        }
    }
    var activity = true;
    while (activity) {
        activity = false;
        for (var i = 0; i < state.players.length; i++) {
            console.log(`Player ${i + 1} is taking actions`);
            var possibleActions = [];
            for (let species of state.players[i].species) {
                for (let individual of species.individuals) {
                    if (individual.eaten) {
                        continue;
                    }
                    if (!individual.shelter && state.climate.shelter > 0) {
                        possibleActions.push(new HideAction(individual));
                    }
                    if (individual.hunger > 0) {
                        const canHunt = species.diet === Diet.CARNIVORE || species.diet === Diet.OMNIVORE;
                        const canGather = species.diet != Diet.CARNIVORE;
                        if (canHunt) {
                            const victims = [];
                            for (let victimPlayer of state.players) {
                                for (let victimSpecies of victimPlayer.species) {
                                    for (let victimIndividual of victimSpecies.individuals) {
                                        // TODO: does this check really work?
                                        if (individual == victimIndividual) {
                                            // can't eat itself
                                            continue;
                                        }
                                        if (species.canBeEatenBy(victimIndividual, species)) {
                                            victims.push(victimIndividual);
                                        }
                                    }
                                }
                            }
                            if (victims.length > 0) {
                                const victim = victims[Math.floor(Math.random() * victims.length)];
                                possibleActions.push(new HuntAction(individual, victim));
                            }
                        }
                        if (canGather && state.climate.food > 0) {
                            possibleActions.push(new GatherAction(individual));
                        }
                    }
                }
            }
            if (possibleActions.length > 0) {
                const action = possibleActions[Math.floor(Math.random() * possibleActions.length)];
                for (let possibleAction of possibleActions) {
                    if (possibleAction == action) {
                        console.log("DOING -", possibleAction.toString());
                    }
                    else {
                        console.log("NOT -", possibleAction.toString());
                    }
                }
                action.execute();
                activity = true;
            }
        }
    }
    return state;
}
function doExtinction() {
    state.extinctions = new Extinctions();
    for (let player of state.players) {
        var hungryIndividuals = 0;
        var eatenIndividuals = 0;
        var extinctSpecies = 0;
        for (let species of player.species) {
            const oldIndividuals = species.individuals.length;
            species.individuals = species.individuals.filter(individual => !individual.eaten);
            eatenIndividuals += oldIndividuals - species.aliveIndividuals();
            const uneatenIndividuals = species.individuals.length;
            species.individuals = species.individuals.filter(individual => individual.hunger <= 0);
            hungryIndividuals = uneatenIndividuals - species.aliveIndividuals();
        }
        const initialSpeciesCount = player.species.length;
        player.species = player.species.filter(species => species.aliveIndividuals() > 0);
        extinctSpecies = initialSpeciesCount - player.species.length;
        // TODO: store and display per player
        state.extinctions.hungryIndividuals += hungryIndividuals;
        state.extinctions.eatenIndividuals += eatenIndividuals;
        state.extinctions.extinctSpecies += extinctSpecies;
    }
    return state;
}
class Individual {
    id;
    hunger;
    shelter = false;
    eaten = false;
    species;
    constructor(species) {
        this.species = species;
        this.id = this.species.maxIndividualId;
        this.species.maxIndividualId++;
        this.hunger = species.defaultHunger;
    }
    toString() {
        return `${this.species.id}${this.id} ${this.species.getTraitsString()} ${this.hunger} hunger ${this.shelter ? "sheltered" : "exposed"} ${this.eaten ? "eaten" : ""}`;
    }
}
// TODO: calculate strength based on traits, diet and other species
class Species {
    id;
    maxIndividualId = 1;
    traits = [];
    diet = undefined;
    defaultHunger = 1;
    individuals;
    constructor(player) {
        this.id = player.maxSpeciesId;
        player.maxSpeciesId = String.fromCharCode(player.maxSpeciesId.charCodeAt(0) + 1);
        if (player.maxSpeciesId > "Z" && player.maxSpeciesId < "a") {
            player.maxSpeciesId = "a";
        }
        else if (player.maxSpeciesId > "z") {
            throw new Error("Too many species");
        }
        this.individuals = [new Individual(this)];
    }
    aliveIndividuals() {
        return this.individuals.filter(x => !x.eaten).length;
    }
    getTraitsString() {
        this.traits = sortTraits(this.traits);
        var label = "";
        for (let trait of this.traits) {
            label += ` ${trait}`;
        }
        if (this.diet == undefined) {
            label += " herbivore";
        }
        else {
            label += ` ${this.diet}`;
        }
        return label;
    }
    toString() {
        const plural = this.aliveIndividuals() != 1 ? 's' : '';
        return `${this.aliveIndividuals().toString()} ${this.getTraitsString()}${plural} ${this.id}`;
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
    canBeEatenBy(individual, predator) {
        if (individual.shelter) {
            return false;
        }
        if (this.traits.includes(Trait.BURROWING) && individual.hunger == 0) {
            return false;
        }
        if (this.traits.includes(Trait.SWIMMING) && !predator.traits.includes(Trait.SWIMMING)) {
            return false;
        }
        if (this.traits.includes(Trait.LARGE) && !predator.traits.includes(Trait.LARGE)) {
            return false;
        }
        return true;
    }
}
class Player {
    species = [];
    maxSpeciesId;
    constructor(maxSpeciesId) {
        this.maxSpeciesId = maxSpeciesId;
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
class Extinctions {
    eatenIndividuals = 0;
    hungryIndividuals = 0;
    extinctSpecies = 0;
}
class State {
    initial = true;
    phase = Phase.Extinction;
    players = [
        new Player("A"),
        new Player("A"),
    ];
    climate = new Climate();
    extinctions = new Extinctions();
}
var state = new State();
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
    initUi();
    nextPhase();
    nextPhase();
};
function columnContainer(columns) {
    const wrapper = document.createElement("div");
    wrapper.className = "column-wrapper";
    for (let column of columns) {
        const columnDiv = document.createElement("div");
        columnDiv.className = "column";
        for (let element of column) {
            columnDiv.appendChild(element);
        }
        wrapper.appendChild(columnDiv);
    }
    return wrapper;
}
function initUi() {
    const nextPhaseButton = document.createElement("button");
    nextPhaseButton.id = "nextPhase";
    nextPhaseButton.innerText = "Next phase";
    nextPhaseButton.onclick = nextPhase;
    document.getElementById("interaction").appendChild(columnContainer([[], [nextPhaseButton], []]));
}
function display(state) {
    console.log(state);
    if (state.initial) {
        state.initial = false;
        return;
    }
    var playerElements = [];
    for (var i = 0; i < state.players.length; i++) {
        var text = '';
        for (let species of state.players[i].species) {
            text += species.toString() + "\n";
        }
        const playerLabel = document.createElement("p");
        playerLabel.innerText = text;
        playerElements.push([playerLabel]);
    }
    var climateLabel = document.createElement("p");
    var climateIndicator = "";
    if (state.phase == Phase.Development) {
        climateIndicator = "available";
    }
    else if (state.phase == Phase.Feeding) {
        climateIndicator = "remaining";
    }
    if (climateIndicator) {
        climateLabel.innerText = `${state.climate.food} food ${climateIndicator} \n ${state.climate.shelter} shelter ${climateIndicator}\n\n`;
        playerElements.push([climateLabel]);
    }
    if (state.phase == Phase.Extinction) {
        var extinctionLabel = document.createElement("p");
        extinctionLabel.innerText = `${state.extinctions.hungryIndividuals} individuals died of hunger\n${state.extinctions.eatenIndividuals} individuals were eaten\n${state.extinctions.extinctSpecies} species got extinct\n\n`;
        playerElements.push([extinctionLabel]);
    }
    // make sure the number of columns is constant
    if (playerElements.length === state.players.length) {
        playerElements.push([]);
    }
    document.getElementById("phases").prepend(columnContainer(playerElements));
    var infoElements = [];
    const phaseLabel = document.createElement("p");
    phaseLabel.innerText = `Phase: ${Phase[state.phase]}`;
    infoElements.push(phaseLabel);
    document.getElementById("phases").prepend(columnContainer([[], infoElements, []]));
}
