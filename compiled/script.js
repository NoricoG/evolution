// action to prioritise for debugging
// const debugAction = FeedChildAction;
const debugAction = null;
let playInterval = null;
function play(fast) {
    const wait = fast ? 500 : 1000;
    playInterval = setInterval(() => nextIteration(1), wait);
}
function pause() {
    clearInterval(playInterval);
    playInterval = null;
}
function nextIteration(iterations) {
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
    }
    else {
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
function leftShelterSymbol(leftShelter) {
    return leftShelter ? "🏃🏻‍♂️‍➡️" : "";
}
class Action {
    individual;
    constructor(individual) {
        this.individual = individual;
    }
}
class GatherAction extends Action {
    leftShelter = false;
    isPossible() {
        const hungry = this.individual.hasHunger();
        const foodAvailable = state.environment.food > 0;
        const canGather = this.individual.diet == Diet.HERBIVORE || this.individual.diet == Diet.OMNIVORE;
        return hungry && foodAvailable && canGather;
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
class HuntAction extends Action {
    possibleVictims = [];
    victim = null;
    leftShelter = false;
    isPossible() {
        const eatsMeat = this.individual.diet === Diet.CARNIVORE || this.individual.diet === Diet.OMNIVORE;
        const hungry = this.individual.hasHunger();
        if (!eatsMeat || !hungry) {
            return false;
        }
        this.possibleVictims = state.individualsArray.filter(v => v.id !== this.individual.id && // don't hunt yourself
            v.id !== this.individual.parent?.id && // don't hunt your parent
            v.parent?.id !== this.individual.id && // don't hunt your children
            !similarStrategy(v.strategy, this.individual.strategy) && // don't hunt similar strategy (family)
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
        this.victim.eaten = true;
        this.victim.die();
        state.environment.freshBodies.push(this.victim.id);
    }
    toString() {
        let victimId = this.victim ? this.victim.id : "❌";
        return `${leftShelterSymbol(this.leftShelter)}🍗 ${victimId}`;
    }
}
class ScavengeAction extends Action {
    bodyId = "";
    leftShelter = false;
    isPossible() {
        const isScavenger = this.individual.diet === Diet.SCAVENGER;
        const hungry = this.individual.hasHunger();
        const bodiesAvailable = state.environment.allBodies.length > 0;
        return isScavenger && hungry && bodiesAvailable;
    }
    execute() {
        this.leftShelter = this.individual.leaveShelter();
        this.bodyId = state.environment.allBodies[Math.floor(Math.random() * state.environment.allBodies.length)];
        const nutritionalValue = state.individuals[this.bodyId].nutritionalValue();
        this.individual.eat(nutritionalValue);
        state.environment.removeBody(this.bodyId);
    }
    toString() {
        return `${leftShelterSymbol(this.leftShelter)}🦴 ${this.bodyId}`;
    }
}
class HideAction extends Action {
    isPossible() {
        const notSheltered = !this.individual.shelter;
        const shelterAvailable = state.environment.shelter > 0;
        return notSheltered && shelterAvailable;
    }
    execute() {
        this.individual.shelter = true;
        state.environment.shelter--;
    }
    toString() {
        return `🛡️`;
    }
}
class ReproduceAction extends Action {
    cloneId = "";
    isPossible() {
        const isAdult = this.individual.getAge() >= adultAge;
        const hasEnergy = this.individual.energy > 1;
        const hasShelter = this.individual.shelter;
        return isAdult && hasEnergy && hasShelter;
    }
    execute() {
        const baby = this.individual.procreate();
        this.cloneId = baby.id;
    }
    toString() {
        return `👶 ${this.cloneId}`;
    }
}
class FeedChildAction extends Action {
    child = null;
    isPossible() {
        const hasEnergy = this.individual.energy > 1;
        const hasChildren = this.individual.children.length > 0;
        this.child = this.individual.children[Math.floor(Math.random() * this.individual.children.length)];
        return hasEnergy && hasChildren;
    }
    execute() {
        this.child?.eat(1);
    }
    toString() {
        return `🍼👶 ${this.child?.id}`;
    }
}
class GainTraitAction extends Action {
    gainedTrait = null;
    isPossible() {
        const underdeveloped = this.individual.traits.length < 3;
        const hasEnergy = this.individual.energy >= maxEnergy - 1;
        const notOld = this.individual.getAge() < adultAge * 3;
        return underdeveloped && hasEnergy && notOld;
    }
    execute() {
        const newTraits = Object.values(Trait).filter(trait => !this.individual.traits.includes(trait));
        this.gainedTrait = newTraits[Math.floor(Math.random() * newTraits.length)];
        this.individual.addTrait(this.gainedTrait);
    }
    toString() {
        return `🆕 ${this.gainedTrait || ""}`;
    }
}
const allActions = [
    GatherAction, HuntAction, ScavengeAction,
    HideAction, ReproduceAction,
    FeedChildAction, GainTraitAction,
];
const actionGroups = [
    ["GatherAction", "HuntAction", "ScavengeAction"],
    ["HideAction", "ReproduceAction"],
    ["FeedChildAction", "GainTraitAction"]
];
const maxEnergy = 4;
const loseTraitChance = 0.1;
const gainTraitChance = 0.2;
const weightMutationRange = 0.3;
const adultAge = 2;
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
var IndividualCategory;
(function (IndividualCategory) {
    IndividualCategory[IndividualCategory["Adult"] = 1] = "Adult";
    IndividualCategory[IndividualCategory["Eaten"] = 2] = "Eaten";
    IndividualCategory[IndividualCategory["Starved"] = 3] = "Starved";
    IndividualCategory[IndividualCategory["Young"] = 4] = "Young";
})(IndividualCategory || (IndividualCategory = {}));
class Individual {
    id;
    born;
    parent;
    dead = false;
    deathDay = null;
    eaten = false;
    starved = false;
    strategy;
    lastEvent = "";
    traits = [];
    diet;
    energy = 2;
    shelter = false;
    children = [];
    constructor(parent, traits, diet, strategy) {
        this.id = ""; // assigned by state
        this.born = state.day;
        this.parent = parent;
        this.strategy = strategy;
        this.traits = traits;
        if (Math.random() < loseTraitChance && this.traits.length > 0) {
            // remove random trait
            this.traits.splice(Math.floor(Math.random() * this.traits.length), 1);
        }
        if (Math.random() < gainTraitChance) {
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
    getCategory() {
        if (this.starved)
            return IndividualCategory.Starved;
        if (this.eaten)
            return IndividualCategory.Eaten;
        if (this.getAge() < adultAge)
            return IndividualCategory.Young;
        return IndividualCategory.Adult;
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
        const evolvedStrategy = this.getEvolvedStrategy(this.strategy);
        const baby = new Individual(this, this.traits, this.diet, evolvedStrategy);
        state.addIndividual(baby);
        this.children.push(baby);
        return baby;
    }
    getEvolvedStrategy(strategy) {
        const newWeights = Object.fromEntries(Object.entries(strategy.weights).map(([key, weight]) => {
            if (weight === null) {
                return [key, null];
            }
            const mutation = Math.random() * weightMutationRange - weightMutationRange / 2;
            let newWeight = weight + mutation;
            if (newWeight < minWeight) {
                newWeight = minWeight;
            }
            if (newWeight > maxWeight) {
                newWeight = maxWeight;
            }
            return [key, newWeight];
        }));
        const newStrategy = new Strategy(newWeights, this.diet);
        return newStrategy;
    }
    getOffspring() {
        let offspring = [];
        let generation = 1;
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
        const offSpringCounts = offspring.map(generation => generation.filter(individual => !individual.dead).length);
        if (offSpringCounts[offSpringCounts.length - 1] == 0) {
            offSpringCounts.pop();
        }
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
    hasHunger() {
        return this.energy <= maxEnergy - 1;
    }
    die() {
        this.dead = true;
        this.deathDay = state.day;
        this.leaveShelter();
    }
}
const targetIndividuals = 30;
class State {
    day = 0;
    individuals = {};
    individualIdCounter = -1;
    environment = new Environment(this, []);
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
    livingIndividualCount() {
        return Object.values(this.individuals).filter(individual => !individual.dead).length;
    }
}
class Environment {
    initialFood;
    food;
    initialShelter;
    shelter;
    freshBodies;
    oldBodies;
    allBodies;
    minFoodFactor = 0.3;
    maxFoodFactor = 0.7;
    minShelterFactor = 0.1;
    maxShelterFactor = 0.2;
    constructor(state, oldBodies) {
        const foodFactor = this.minFoodFactor + Math.random() * (this.maxFoodFactor - this.minFoodFactor);
        const shelterFactor = this.minShelterFactor + Math.random() * (this.maxShelterFactor - this.minShelterFactor);
        this.initialFood = Math.round(foodFactor * targetIndividuals);
        this.initialShelter = Math.round(shelterFactor * targetIndividuals);
        const shelteredIndividuals = state.individualsArray.filter(individual => individual.shelter && !individual.traits.includes(Trait.BURROW)).length;
        this.initialShelter -= shelteredIndividuals;
        if (this.initialShelter < 0) {
            this.initialShelter = 0;
        }
        this.food = this.initialFood;
        this.shelter = this.initialShelter;
        this.oldBodies = oldBodies;
        this.freshBodies = [];
        this.allBodies = [...this.oldBodies, ...this.freshBodies];
    }
    removeBody(bodyId) {
        this.freshBodies = this.freshBodies.filter(id => id !== bodyId);
        this.oldBodies = this.oldBodies.filter(id => id !== bodyId);
        this.allBodies = this.allBodies.filter(id => id !== bodyId);
    }
}
let state = new State();
const minWeight = 0.1;
const maxWeight = 2;
function randomWeight() {
    return minWeight + Math.random() * (maxWeight - minWeight);
}
function hslToRgb(h, s, l) {
    const a = s * Math.min(l, 1 - l);
    const f = (n) => {
        const k = (n + h * 12) % 12;
        return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    };
    return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}
const actionHues = {
    FeedChildAction: 0, GainTraitAction: 51, GatherAction: 103,
    HideAction: 154, HuntAction: 206, ReproduceAction: 257, ScavengeAction: 309,
};
const weightToString = (weight) => {
    if (weight === null)
        return "x";
    return weight.toFixed(1);
};
function similarStrategy(a, b) {
    const hashA = a.toString();
    const hashB = b.toString();
    // check if every character in the has is at most one away
    for (let i = 0; i < hashA.length; i++) {
        // both x (inactive) is equal
        if (hashA[i] == "x" && hashB[i] == "x")
            continue;
        // one x and one not x is different
        if (hashA[i] == "x" || hashB[i] == "x")
            return false;
        const numA = parseInt(hashA[i]);
        const numB = parseInt(hashB[i]);
        if (Math.abs(numA - numB) > 1) {
            return false;
        }
    }
    return true;
}
class Strategy {
    weights;
    diet;
    static randomStrategy(diet) {
        const weights = {
            GatherAction: diet == Diet.CARNIVORE || diet == Diet.SCAVENGER ? null : randomWeight(),
            HuntAction: diet == Diet.HERBIVORE || diet == Diet.SCAVENGER ? null : randomWeight(),
            ScavengeAction: diet != Diet.SCAVENGER ? null : randomWeight(),
            HideAction: randomWeight(),
            ReproduceAction: randomWeight(),
            FeedChildAction: randomWeight(),
            GainTraitAction: randomWeight(),
        };
        return new Strategy(weights, diet);
    }
    constructor(weights, diet) {
        this.diet = diet;
        this.weights = weights;
    }
    toString() {
        // map weight from min-max range to 0-9
        function toNum(weight) {
            if (weight === null)
                return "x";
            const normalized = (weight - minWeight) / (maxWeight - minWeight); // 0.0 to 1.0
            const bucket = Math.floor(normalized * 10);
            const clamped = Math.min(9, bucket); // in case weight == maxWeight
            return clamped.toString();
        }
        // put dash between groups of actions
        let groupedHash = "";
        for (const group of actionGroups) {
            if (groupedHash) {
                groupedHash += "-";
            }
            groupedHash += group.map(action => toNum(this.weights[action])).join("");
        }
        return groupedHash;
    }
    toColorOld() {
        let r = 0, g = 0, b = 0, total = 0;
        for (const [action, weight] of Object.entries(this.weights)) {
            const h = actionHues[action] / 360;
            const [rc, gc, bc] = hslToRgb(h, 0.8, 0.5);
            r += rc * weight;
            g += gc * weight;
            b += bc * weight;
            total += weight;
        }
        return `rgb(${Math.round(r / total)},${Math.round(g / total)},${Math.round(b / total)})`;
    }
    toColor() {
        const dietHueCenters = {
            [Diet.CARNIVORE]: 10, //red
            [Diet.HERBIVORE]: 120, // green
            [Diet.OMNIVORE]: 210, //blue
            [Diet.SCAVENGER]: 300, //purple
        };
        // each diet gets a ±90° range around its center hue
        const hueRange = 90 * 2;
        // weighted-average of action hues, using only active (non-null) weights
        let weightedHueSum = 0, totalWeight = 0, weightSum = 0, weightCount = 0;
        let wMin = maxWeight, wMax = minWeight;
        for (const [action, weight] of Object.entries(this.weights)) {
            if (weight === null)
                continue;
            weightedHueSum += actionHues[action] * weight;
            totalWeight += weight;
            weightSum += weight;
            weightCount++;
            if (weight < wMin)
                wMin = weight;
            if (weight > wMax)
                wMax = weight;
        }
        // map the weighted hue (0–360°) to an offset of hueRange around the diet's center hue
        const avgActionHue = totalWeight > 0 ? weightedHueSum / totalWeight : 180;
        const hueOffset = (avgActionHue / 360 - 0.5) * hueRange;
        const finalHue = ((dietHueCenters[this.diet] + hueOffset) % 360 + 360) % 360;
        // vary lightness based on average weight magnitude (heavier weights → brighter)
        const avgWeight = weightCount > 0 ? weightSum / weightCount : 1;
        const lightness = 0.35 + 0.3 * ((avgWeight - minWeight) / (maxWeight - minWeight));
        // vary saturation based on weight spread (more extreme/varied strategy → more vivid)
        const weightSpread = weightCount > 1 ? (wMax - wMin) / (maxWeight - minWeight) : 0;
        const saturation = 0.55 + 0.4 * weightSpread;
        const [r, g, b] = hslToRgb(finalHue / 360, saturation, lightness);
        return `rgb(${r},${g},${b})`;
    }
    decide(actions, individual) {
        if (actions.length == 0) {
            return null;
        }
        const weightedActions = actions.map(action => {
            const weight = this.weights[action.constructor.name] ?? 1;
            return { action, weight };
        });
        const totalWeight = weightedActions.reduce((sum, aw) => sum + aw.weight, 0);
        const randomWeight = Math.random() * totalWeight;
        let remainingWeight = randomWeight;
        for (const aw of weightedActions) {
            if (remainingWeight < aw.weight) {
                return aw.action;
            }
            remainingWeight -= aw.weight;
        }
        console.error("No action chosen, this should not happen");
        return null;
    }
}
window.addEventListener('DOMContentLoaded', () => nextIteration(1));
let playFast = false;
function togglePlay() {
    const btn = document.getElementById("play-pause-btn");
    if (playInterval !== null) {
        pause();
        btn.textContent = "▶ Play";
    }
    else {
        play(playFast);
        btn.textContent = "⏸ Pause";
    }
}
function toggleSpeed() {
    const btn = document.getElementById("speed-btn");
    if (playInterval !== null) {
        pause();
    }
    playFast = !playFast;
    play(playFast);
    document.getElementById("play-pause-btn").textContent = "⏸ Pause";
    btn.textContent = playFast ? "Slower" : "Faster";
}
function energyLabel(energy) {
    const energyLabels = ["🔴", "🟠", "🟡", "🟢"];
    if (energy > energyLabels.length - 1) {
        return energyLabels[energyLabels.length - 1];
    }
    if (energy < 0) {
        return energyLabels[0];
    }
    return energyLabels[Math.round(energy)];
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
function ancestorLabel(individual) {
    if (!individual.parent) {
        return "";
    }
    if (individual.parent.dead) {
        return `${individual.parent.id} †`;
    }
    return individual.getParentIds().join(", ");
}
function traitLabel(traits) {
    let label = "";
    if (traits.includes(Trait.BURROW)) {
        label += "🕳️";
    }
    if (traits.includes(Trait.LARGE)) {
        label += "🦣";
    }
    if (traits.includes(Trait.SWIM)) {
        label += "🏊🏻‍♂️";
    }
    return label;
}
function updateUI() {
    updateTitles();
    showEnvironment();
    showIndividuals();
}
function updateTitles() {
    document.getElementById("iteration-title").innerText = `Iteration ${state.day}`;
    document.getElementById("individuals-title").innerText = `Individuals (${state.individualsArray.length})`;
}
function sortIndividualsWithinCategory(individuals) {
    return individuals.sort((a, b) => {
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
        "Traits": traitLabel(individual.traits),
        "Diet": individual.diet.toString(),
        "Strategy: \ngather hunt scavenge\nhide reproduce\nfeed trait": individual.strategy.toString(),
        "Action": individual.lastEvent,
        "Health ▼": healthLabel(individual),
        "Energy": energyLabel(individual.energy),
        "Shelter": individual.shelter ? "🛡️" : "👁️",
        "Ancestors": ancestorLabel(individual),
        "Offspring": individual.getOffspring().toString(),
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
    const individualsByCategory = new Map();
    for (let category of Object.values(IndividualCategory).filter(v => typeof v === 'number')) {
        individualsByCategory.set(category, []);
    }
    for (let individual of state.individualsArray) {
        const category = individual.getCategory();
        individualsByCategory.get(category).push(individual);
    }
    for (let [category, individuals] of individualsByCategory) {
        const categoryTitle = document.createElement("h4");
        categoryTitle.innerText = `${IndividualCategory[category]} (${individuals.length})`;
        individualsDiv.appendChild(categoryTitle);
        if (individuals.length === 0) {
            continue;
        }
        sortIndividualsWithinCategory(individuals);
        const table = createTable(individuals);
        individualsDiv.appendChild(table);
    }
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
    row.style.backgroundColor = individual.strategy.toColor();
    table.appendChild(row);
}
function createTable(individuals) {
    const table = document.createElement("table");
    addHeader(table);
    for (let individual of individuals) {
        addIndividualRow(table, individual);
    }
    return table;
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
    const bodies = document.createElement("p");
    bodies.innerText = `${state.environment.allBodies.length} bodies unscavenged`;
    environmentDiv.appendChild(bodies);
}
