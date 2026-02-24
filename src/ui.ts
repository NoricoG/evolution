window.addEventListener('DOMContentLoaded', () =>
    nextIteration(1)
);


function togglePlay() {
    const btn = document.getElementById("play-pause-btn") as HTMLButtonElement;
    if (playInterval !== null) {
        pause();
        btn.textContent = "▶ Play";
    } else {
        play();
        btn.textContent = "⏸ Pause";
    }
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

// dict with individual id as key and event string as value
let actions: Record<string, string> = {};

function saveEvent(individualId: string, event: string) {
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

function addSeparatorRow(table: HTMLTableElement, colSpan: number) {
    const separatorRow = document.createElement("tr");
    separatorRow.classList.add("section-separator");
    const separatorCell = document.createElement("td");
    separatorCell.colSpan = colSpan;
    separatorRow.appendChild(separatorCell);
    table.appendChild(separatorRow);
}

enum IndividualCategory {
    Newborn = 4,
    Starved = 3,
    Eaten = 2,
    Alive = 1
}

function getCategory(individual: Individual): IndividualCategory {
    if (individual.getAge() == 0) return IndividualCategory.Newborn;
    if (individual.starved) return IndividualCategory.Starved;
    if (individual.eaten) return IndividualCategory.Eaten;
    return IndividualCategory.Alive;
}

function sortIndividuals(individuals: Individual[]): Individual[] {
    return individuals.sort((a: Individual, b: Individual) => {
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

function valuesForIndividual(individual: Individual): Record<string, string> {
    const values = {
        "ID": individual.id,
        "Age": individual.getAge().toString(),
        "Diet": individual.diet.toString(),
        "Action": actions[individual.id] ?? "x",
        "Health ▼": healthLabel(individual),
        "Energy": energyLabel(individual.energy),
        "Shelter": individual.shelter ? "🛡️" : "👁️",
        "Offspring": individual.getOffspring().toString(),
        "Ancestors": ancestorLabel(individual),
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

    if (state.individualsArray.length === 0) return;

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
