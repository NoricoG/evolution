window.addEventListener('DOMContentLoaded', () =>
    nextIteration(1)
);

let playFast = false;

function togglePlay() {
    const btn = document.getElementById("play-pause-btn") as HTMLButtonElement;
    if (playInterval !== null) {
        pause();
        btn.textContent = "▶ Play";
    } else {
        play(playFast);
        btn.textContent = "⏸ Pause";
    }
}

function toggleSpeed() {
    const btn = document.getElementById("speed-btn") as HTMLButtonElement;
    if (playInterval !== null) {
        pause();
    }
    playFast = !playFast;
    play(playFast);
    document.getElementById("play-pause-btn").textContent = "⏸ Pause";

    btn.textContent = playFast ? "Slower" : "Faster";
}

function energyLabel(energy: number): string {
    const energyLabels = ["🔴", "🟠", "🟡", "🟢"];
    if (energy > energyLabels.length - 1) {
        return energyLabels[energyLabels.length - 1];
    }
    if (energy < 0) {
        return energyLabels[0];
    }
    return energyLabels[Math.round(energy)];
}

function healthLabel(individual: Individual): string {
    if (individual.dead) {
        return individual.starved ? "💀🍽️" : "💀🍗";
    }
    if (individual.getAge() == 0) {
        return "👶";
    }
    return "🫀";
}

function ancestorLabel(individual: Individual): string {
    if (!individual.parent) {
        return "";
    }
    if (individual.parent.dead) {
        return `${individual.parent.id} †`;
    }
    return individual.getParentIds().join(", ");
}

function traitLabel(traits: Trait[]): string {
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

function sortIndividualsWithinCategory(individuals: Individual[]): Individual[] {
    return individuals.sort((a: Individual, b: Individual) => {
        const offspringA = a.getOffspring().reduce((sum, val) => sum + val, 0);
        const offspringB = b.getOffspring().reduce((sum, val) => sum + val, 0);

        return offspringB - offspringA ||
            b.getAge() - a.getAge() ||
            a.id.localeCompare(b.id);
    });
}

function valuesForIndividual(individual: Individual): Record<string, string> {
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

    if (state.individualsArray.length === 0) return;

    const individualsByCategory: Map<IndividualCategory, Individual[]> = new Map();
    for (let category of Object.values(IndividualCategory).filter(v => typeof v === 'number')) {
        individualsByCategory.set(category as IndividualCategory, []);
    }
    for (let individual of state.individualsArray) {
        const category = individual.getCategory();
        individualsByCategory.get(category)!.push(individual);
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

function addHeader(table: HTMLTableElement) {
    const headerRow = document.createElement("tr");
    const headers = Object.keys(valuesForIndividual(state.individualsArray[0]));
    headers.forEach(header => {
        const th = document.createElement("th");
        th.innerText = header;
        headerRow.appendChild(th);
    });
    table.appendChild(headerRow);
}

function addIndividualRow(table: HTMLTableElement, individual: Individual) {
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

function createTable(individuals: Individual[]): HTMLTableElement {
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
