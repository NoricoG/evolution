// action to prioritise for debugging
// const debugAction = FeedChildAction;
const debugAction = null;
let playInterval = null;
function play() {
    playInterval = setInterval(() => nextIteration(1), 1000);
}
function pause() {
    clearInterval(playInterval);
    playInterval = null;
}
function nextIteration(iterations) {
    for (let i = 0; i < iterations; i++) {
        // cleanup
        for (let individualId of Object.keys(state.individuals)) {
            if (state.individuals[individualId].dead) {
                delete state.individuals[individualId];
            }
        }
        clearActions();
        state.day++;
        addIndividuals();
        state.environment = new Environment(state);
        actAllIndividuals();
        starveIndividuals();
        if (state.individualsArray.filter(individual => !individual.dead).length == 0) {
            alert("All individuals have died.");
        }
    }
    updateUI();
}
function addIndividuals() {
    const startingIndividuals = 10;
    const migratingIndividuals = Math.max(2, 10 - state.individualsArray.length);
    const starting = state.individualsArray.length == 0;
    const extraIndividuals = starting ? startingIndividuals : migratingIndividuals;
    for (let i = 0; i < extraIndividuals; i++) {
        const randomDiet = Object.values(Diet)[Math.floor(Math.random() * Object.values(Diet).length)];
        const newIndividual = new Individual(null, [], randomDiet, 1);
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
function actIndividual(individual) {
    if (individual.dead) {
        return;
    }
    if (individual.getAge() == 0) {
        return;
    }
    const possibleActions = [];
    for (const ActionClass of allActions) {
        const action = new ActionClass(individual);
        if (action.isPossible()) {
            possibleActions.push(action);
        }
    }
    if (possibleActions.length > 0) {
        var action = possibleActions[Math.floor(Math.random() * possibleActions.length)];
        // debug specific action
        if (debugAction && possibleActions.some(a => a instanceof debugAction) && !(action instanceof debugAction)) {
            const oldAction = action.toString();
            action = possibleActions.find(a => a instanceof debugAction);
            const newAction = action.toString();
            console.log(`Debug: ${individual.id} will do ${newAction} instead of ${oldAction}`);
        }
        action.execute();
        saveEvent(action.individual.id, action.toString());
        individual.energy -= individual.energyNeed();
        return true;
    }
    else {
        saveEvent(individual.id, `x`);
    }
}
function starveIndividuals() {
    let starvedIndividuals = 0;
    for (let individual of state.individualsArray) {
        if (individual.energy <= 0 && !individual.dead && individual.getAge() > 0) {
            individual.starved = true;
            state.dieIndividual(individual.id);
            starvedIndividuals++;
        }
    }
}
function leftShelterSymbol(leftShelter) {
    return leftShelter ? "🏃🏻‍♂️‍➡️" : "";
}
class Action {
    individual;
    constructor(individual) {
        this.individual = individual;
    }
}
class HideAction extends Action {
    isPossible() {
        return !this.individual.shelter && state.environment.shelter > 0;
    }
    execute() {
        this.individual.shelter = true;
        state.environment.shelter--;
    }
    toString() {
        return `🛡️`;
    }
}
class GatherAction extends Action {
    leftShelter = false;
    isPossible() {
        return this.individual.energy < maxEnergy && state.environment.food > 0 && this.individual.diet != Diet.CARNIVORE;
    }
    execute() {
        this.leftShelter = this.individual.leaveShelter();
        this.individual.eat(1);
        state.environment.food--;
    }
    toString() {
        return `${leftShelterSymbol(this.leftShelter)}🥕`;
    }
}
class ReproduceAction extends Action {
    cloneId = "";
    isPossible() {
        return this.individual.getAge() > 0 && this.individual.energy > 1;
    }
    execute() {
        const baby = this.individual.procreate();
        this.cloneId = baby.id;
    }
    toString() {
        return `👶 ${this.cloneId}`;
    }
}
class AddTraitAction extends Action {
    gainedTrait = null;
    isPossible() {
        return this.individual.traits.length < 3 && this.individual.energy >= maxEnergy && this.individual.getAge() < 3;
    }
    execute() {
        const newTraits = Object.values(Trait).filter(trait => !this.individual.traits.includes(trait));
        this.gainedTrait = newTraits[Math.floor(Math.random() * newTraits.length)];
        this.individual.addTrait(this.gainedTrait);
    }
    toString() {
        return `🆕 ${this.gainedTrait}`;
    }
}
class HuntAction extends Action {
    possibleVictims = [];
    victim = null;
    leftShelter = false;
    isPossible() {
        if (this.individual.diet !== Diet.CARNIVORE && this.individual.diet !== Diet.OMNIVORE) {
            return false;
        }
        if (this.individual.energy >= maxEnergy) {
            return false;
        }
        this.possibleVictims = state.individualsArray.filter(v => v.id !== this.individual.id && // don't hunt yourself
            v.id !== this.individual.parent?.id && // don't hunt your parent
            v.parent?.id !== this.individual.id && // don't hunt your children
            v.canBeHuntedBy(this.individual));
        return this.possibleVictims.length > 0;
    }
    execute() {
        this.individual.leaveShelter();
        this.victim = this.possibleVictims[Math.floor(Math.random() * this.possibleVictims.length)];
        if (!this.victim.canBeHuntedBy(this.individual)) {
            console.error(`Victim ${this.victim.id} is no longer a valid victim for hunter ${this.individual.id}`);
            console.log(this.victim);
            console.log(this.individual);
            return;
        }
        this.individual.eat(this.victim.nutritionalValue());
        state.dieIndividual(this.victim.id);
        this.victim.eaten = true;
        state.environment.bodies.push(this.victim.id);
    }
    toString() {
        var victimId = this.victim ? this.victim.id : "❌";
        return `${leftShelterSymbol(this.leftShelter)}🍗 ${victimId}`;
    }
}
class ScavengeAction extends Action {
    bodyId = "";
    leftShelter = false;
    isPossible() {
        return this.individual.diet === Diet.SCAVENGER && this.individual.energy < maxEnergy && state.environment.bodies.length > 0;
    }
    execute() {
        this.leftShelter = this.individual.leaveShelter();
        this.bodyId = state.environment.bodies[Math.floor(Math.random() * state.environment.bodies.length)];
        const nutritionalValue = state.individuals[this.bodyId].nutritionalValue();
        this.individual.eat(nutritionalValue);
        state.environment.bodies = state.environment.bodies.filter(id => id !== this.bodyId);
    }
    toString() {
        return `${leftShelterSymbol(this.leftShelter)}🦴 ${this.bodyId}`;
    }
}
class FeedChildAction extends Action {
    offspringId = "";
    isPossible() {
        return this.individual.energy > 1 && this.individual.children.length > 0;
    }
    execute() {
        const child = this.individual.children[Math.floor(Math.random() * this.individual.children.length)];
        this.offspringId = child.id;
        child.eat(1);
    }
    toString() {
        return `🍼👶 ${this.offspringId}`;
    }
}
const allActions = [ReproduceAction, AddTraitAction, HideAction, HuntAction, GatherAction, ScavengeAction, FeedChildAction];
const maxEnergy = 3;
const mutationChance = 0.1;
var Trait;
(function (Trait) {
    Trait["LARGE"] = "large";
    Trait["BURROW"] = "burrow";
    Trait["SWIM"] = "swim";
})(Trait || (Trait = {}));
var Diet;
(function (Diet) {
    Diet["HERBIVORE"] = "herbivore";
    Diet["CARNIVORE"] = "carnivore";
    Diet["OMNIVORE"] = "omnivore";
    Diet["SCAVENGER"] = "scavenger";
})(Diet || (Diet = {}));
class Individual {
    id;
    born;
    parent;
    dead = false;
    eaten = false;
    starved = false;
    traits = [];
    diet;
    energy = 2;
    shelter = false;
    children = [];
    constructor(parent, traits, diet, extraAge) {
        this.id = ""; // assigned by state
        this.born = state.day - extraAge;
        this.parent = parent;
        this.traits = traits;
        if (Math.random() < mutationChance / 2 && this.traits.length > 0) {
            // remove random trait
            this.traits.splice(Math.floor(Math.random() * this.traits.length), 1);
        }
        if (Math.random() < mutationChance) {
            const possibleNewTraits = Object.values(Trait).filter(trait => !this.traits.includes(trait));
            if (possibleNewTraits.length > 0) {
                this.traits.push(possibleNewTraits[Math.floor(Math.random() * possibleNewTraits.length)]);
            }
        }
        this.diet = diet;
        this.energy = 2;
    }
    getAge() {
        return state.day - this.born;
    }
    canBeHuntedBy(predator) {
        if (this.dead) {
            return false;
        }
        if (this.shelter) {
            return false;
        }
        // protected by parent at start of life
        if (this.getAge() == 0) {
            return false;
        }
        if (this.traits.includes(Trait.SWIM) && !predator.traits.includes(Trait.SWIM)) {
            return false;
        }
        if (this.traits.includes(Trait.LARGE) && !predator.traits.includes(Trait.LARGE)) {
            return false;
        }
        return true;
    }
    addTrait(trait) {
        if (this.traits.includes(trait)) {
            return false;
        }
        this.traits.push(trait);
        return true;
    }
    energyNeed() {
        return this.traits.includes(Trait.LARGE) ? 1.5 : 1;
    }
    nutritionalValue() {
        return (this.traits.includes(Trait.LARGE) ? 3 : 2);
    }
    eat(nutritionalValue) {
        this.energy = Math.min(maxEnergy, this.energy + nutritionalValue);
        if (this.traits.includes(Trait.BURROW) && this.energy >= maxEnergy - 1) {
            this.shelter = true;
        }
    }
    procreate() {
        const baby = new Individual(this, this.traits, this.diet, 0);
        state.addIndividual(baby);
        this.children.push(baby);
        return baby;
    }
    getOffspring() {
        var offspring = [];
        var generation = 1;
        offspring.push(this.children);
        while (offspring[generation - 1].length > 0) {
            offspring.push([]);
            for (let child of offspring[generation - 1]) {
                offspring[generation].push(...child.children);
            }
            generation++;
        }
        // remove last generation which is empty
        offspring.pop();
        const offSpringCounts = offspring.map(generation => generation.length);
        return offSpringCounts;
    }
    // returns the first parent and any living older parents, from old to new
    getParentIds() {
        const parents = [];
        if (this.parent) {
            parents.push(this.parent);
            let alive = true;
            while (alive) {
                const nextParent = parents[parents.length - 1].parent;
                alive = nextParent != null && !nextParent.dead;
                if (alive) {
                    parents.push(nextParent);
                }
            }
        }
        return parents.map(parent => parent.id).reverse();
    }
    leaveShelter() {
        if (this.shelter) {
            this.shelter = false;
            if (!this.traits.includes(Trait.BURROW)) {
                state.environment.shelter++;
            }
            return true;
        }
        return false;
    }
}
class State {
    day = 0;
    individuals = {};
    individualIdCounter = -1;
    environment = new Environment(this);
    get individualsArray() {
        return Object.values(this.individuals);
    }
    nextIndividualId() {
        this.individualIdCounter++;
        // CVC pattern
        // 0 Bab, 1 Cab, ..., 19 Yab, 20 Zab
        // 21 Beb, ..., 41 Zeb
        // ...
        // 84 Bub, ..., 104 Zub
        // 105 Bac, ..., 125 Zac
        // ...
        // 189 Buc, ..., 209 Zuc
        // ...
        // 2100 Baz, ..., 2120 Zaz
        // ...
        // 2184 Buz, ..., 2204 Zuz
        // 2205 Bab, starting over
        function translate(num) {
            const consonants = 'bcdfghjklmnpqrstvwxyz';
            const vowels = 'aeiou';
            const c = consonants.length; // 21
            const v = vowels.length; // 5
            const firstIdx = num % c;
            const vowelIdx = Math.floor(num / c) % v;
            const lastIdx = Math.floor(num / (c * v)) % c;
            const name = consonants[firstIdx].toUpperCase() + vowels[vowelIdx] + consonants[lastIdx];
            return name;
        }
        return translate(this.individualIdCounter);
    }
    addIndividual(individual) {
        individual.id = this.nextIndividualId();
        this.individuals[individual.id] = individual;
    }
    dieIndividual(individualId) {
        this.individuals[individualId].dead = true;
        const parent = this.individuals[individualId].parent;
        if (parent) {
            parent.children = parent.children.filter(child => child.id !== individualId);
        }
        this.environment.bodies.push(individualId);
    }
    livingIndividualCount() {
        return Object.values(this.individuals).filter(individual => !individual.dead).length;
    }
}
class Environment {
    initialFood;
    food;
    initialShelter;
    shelter;
    bodies;
    constructor(state) {
        const livingCount = state.livingIndividualCount();
        this.initialFood = Math.round((0.1 + Math.random()) * livingCount);
        this.food = this.initialFood;
        this.initialShelter = Math.ceil(Math.random() * 6);
        this.shelter = this.initialShelter;
        this.bodies = [];
    }
}
var state = new State();
window.addEventListener('DOMContentLoaded', () => nextIteration(1));
function togglePlay() {
    const btn = document.getElementById("play-pause-btn");
    if (playInterval !== null) {
        pause();
        btn.textContent = "▶ Play";
    }
    else {
        play();
        btn.textContent = "⏸ Pause";
    }
}
function energyLabel(energy) {
    const energyLabels = ["🔴", "🟠", "🟡", "🟢"];
    if (energy > energyLabels.length - 1) {
        console.error(`Energy ${energy} is out of bounds for energy labels`);
        return "?";
    }
    if (energy < 0) {
        return energyLabels[0];
    }
    return energyLabels[Math.ceil(energy)];
}
function healthLabel(individual) {
    if (individual.dead) {
        return individual.starved ? "💀🍽️" : "💀🍗";
    }
    if (individual.getAge() == 0) {
        return "👶";
    }
    return "🫀";
}
// dict with individual id as key and event string as value
let actions = {};
function saveEvent(individualId, event) {
    if (actions[individualId]) {
        console.error(`Individual ${individualId} already has a saved action: ${actions[individualId]}`);
    }
    actions[individualId] = event;
}
function clearActions() {
    actions = {};
}
function updateUI() {
    updateTitles();
    showIndividuals();
    showEnvironment();
}
function updateTitles() {
    document.getElementById("iteration-title").innerText = `Iteration ${state.day}`;
    document.getElementById("individuals-title").innerText = `Individuals (${state.individualsArray.length})`;
}
function addSeparatorRow(table, colSpan) {
    const separatorRow = document.createElement("tr");
    separatorRow.classList.add("section-separator");
    const separatorCell = document.createElement("td");
    separatorCell.colSpan = colSpan;
    separatorRow.appendChild(separatorCell);
    table.appendChild(separatorRow);
}
var IndividualCategory;
(function (IndividualCategory) {
    IndividualCategory[IndividualCategory["Newborn"] = 4] = "Newborn";
    IndividualCategory[IndividualCategory["Starved"] = 3] = "Starved";
    IndividualCategory[IndividualCategory["Eaten"] = 2] = "Eaten";
    IndividualCategory[IndividualCategory["Alive"] = 1] = "Alive";
})(IndividualCategory || (IndividualCategory = {}));
function getCategory(individual) {
    if (individual.getAge() == 0)
        return IndividualCategory.Newborn;
    if (individual.starved)
        return IndividualCategory.Starved;
    if (individual.eaten)
        return IndividualCategory.Eaten;
    return IndividualCategory.Alive;
}
function sortIndividuals(individuals) {
    return individuals.sort((a, b) => {
        const categoryA = getCategory(a);
        const categoryB = getCategory(b);
        // sort by category, offspring descending, age descending, id ascending
        if (categoryA !== categoryB) {
            return categoryA - categoryB;
        }
        const offspringA = a.getOffspring().reduce((sum, val) => sum + val, 0);
        const offspringB = b.getOffspring().reduce((sum, val) => sum + val, 0);
        return offspringB - offspringA ||
            b.getAge() - a.getAge() ||
            a.id.localeCompare(b.id);
    });
}
function valuesForIndividual(individual) {
    const values = {
        "ID": individual.id,
        "Age": individual.getAge().toString(),
        "Diet": individual.diet.toString(),
        "Action": actions[individual.id] ?? "x",
        "Health ▼": healthLabel(individual),
        "Energy": energyLabel(individual.energy),
        "Shelter": individual.shelter ? "🛡️" : "👁️",
        "Offspring": individual.getOffspring().toString(),
        "Ancestors": individual.getParentIds().join(", "),
        "Traits": individual.traits.sort().join(", "),
    };
    Object.entries(values).forEach(([key, value]) => {
        if (value === undefined) {
            console.error(`Value for ${key} is undefined for individual ${individual.id}`);
            console.log(individual);
        }
    });
    return values;
}
function showIndividuals() {
    const individualsDiv = document.getElementById("individuals");
    individualsDiv.innerHTML = "";
    if (state.individualsArray.length === 0)
        return;
    const table = document.createElement("table");
    const tableWidth = Object.keys(valuesForIndividual(state.individualsArray[0])).length;
    addHeader(table);
    const sortedIndividuals = sortIndividuals(state.individualsArray);
    addSeparatorRow(table, tableWidth);
    let previousCategory = null;
    for (let individual of sortedIndividuals) {
        const currentCategory = getCategory(individual);
        const shouldAddSeparator = previousCategory && previousCategory !== currentCategory;
        if (shouldAddSeparator) {
            addSeparatorRow(table, tableWidth);
        }
        previousCategory = currentCategory;
        addIndividualRow(table, individual);
    }
    addSeparatorRow(table, tableWidth);
    individualsDiv.appendChild(table);
}
function addHeader(table) {
    const headerRow = document.createElement("tr");
    const headers = Object.keys(valuesForIndividual(state.individualsArray[0]));
    headers.forEach(header => {
        const th = document.createElement("th");
        th.innerText = header;
        headerRow.appendChild(th);
    });
    table.appendChild(headerRow);
}
function addIndividualRow(table, individual) {
    const row = document.createElement("tr");
    const values = valuesForIndividual(individual);
    Object.values(values).forEach(value => {
        const td = document.createElement("td");
        td.innerText = value.toString();
        row.appendChild(td);
    });
    table.appendChild(row);
}
function showEnvironment() {
    const environmentDiv = document.getElementById("environment");
    environmentDiv.innerHTML = "";
    const food = document.createElement("p");
    food.innerText = `${state.environment.initialFood} -> ${state.environment.food} food`;
    environmentDiv.appendChild(food);
    const shelter = document.createElement("p");
    shelter.innerText = `${state.environment.initialShelter} -> ${state.environment.shelter} shelter`;
    environmentDiv.appendChild(shelter);
}
