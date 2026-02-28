"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const enums_js_1 = require("./enums.js");
const iterations_js_1 = require("./iterations.js");
const state_js_1 = require("./state.js");
const strategy_js_1 = require("./genetics/strategy.js");
const traits_js_1 = require("./genetics/traits.js");
let playFast = false;
const state = new state_js_1.State();
const iterations = new iterations_js_1.Iterations(state);
function togglePlay() {
    const btn = document.getElementById("play-pause-btn");
    if (iterations.playInterval !== null) {
        iterations.pause();
        btn.textContent = "▶ Play";
    }
    else {
        iterations.play(playFast);
        btn.textContent = "⏸ Pause";
    }
}
function toggleSpeed() {
    const btn = document.getElementById("speed-btn");
    if (iterations.playInterval !== null) {
        iterations.pause();
    }
    playFast = !playFast;
    iterations.play(playFast);
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
    if (individual.getAge(state.day) == 0) {
        return "👶";
    }
    return "🫀";
}
function ancestorLabel(individual) {
    if (!individual.parent) {
        return "x";
    }
    if (individual.parent.dead) {
        return `${individual.parent.id} †`;
    }
    return individual.getParentIds().join(", ");
}
function nextIterationsClicked(amount) {
    iterations.nextIteration(amount);
    updateUI();
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
        if (a.dead && b.dead && a.deathDay != b.deathDay) {
            return b.deathDay - a.deathDay;
        }
        return b.getAge(state.day) - a.getAge(state.day) ||
            b.getOffspringSum() - a.getOffspringSum() ||
            a.id.localeCompare(b.id);
    });
}
function valuesForIndividual(individual, includeDeath) {
    const values = {
        "ID": individual.id,
        "Age ▼": individual.getAge(state.day).toString(),
        [`Traits\n${traits_js_1.Traits.headerString}`]: individual.traits.toString(),
        [`Strategy\n${strategy_js_1.Strategy.headerString}`]: individual.strategy.toString(),
        "Action": individual.lastEvent,
        "Energy": energyLabel(individual.energy),
        "Shelter": individual.shelter ? "🛡️" : "👁️",
        "Ancestors": ancestorLabel(individual),
        "Offspring": individual.getOffspringCounts().toString(),
    };
    if (includeDeath) {
        values["Death"] = individual.deathDay === null ? "" : (individual.deathDay - state.day).toString();
    }
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
    for (let category of Object.values(enums_js_1.IndividualCategory).filter(v => typeof v === 'number')) {
        individualsByCategory.set(category, []);
    }
    for (let individual of state.individualsArray) {
        const category = individual.getCategory(state.day);
        individualsByCategory.get(category).push(individual);
    }
    for (let [category, individuals] of individualsByCategory) {
        const categoryTitle = document.createElement("h4");
        categoryTitle.innerText = `${enums_js_1.IndividualCategory[category]} (${individuals.length})`;
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
    const headers = Object.keys(valuesForIndividual(state.individualsArray[0], true));
    headers.forEach(header => {
        const th = document.createElement("th");
        th.innerText = header;
        headerRow.appendChild(th);
    });
    table.appendChild(headerRow);
}
function addIndividualRow(table, individual) {
    const row = document.createElement("tr");
    const values = valuesForIndividual(individual, true);
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
// Expose functions needed by inline HTML onclick handlers
window.nextIterationsClicked = nextIterationsClicked;
window.togglePlay = togglePlay;
window.toggleSpeed = toggleSpeed;
updateUI();
