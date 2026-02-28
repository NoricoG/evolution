import { IndividualCategory } from "./enums.js";
import { Individual } from "./individual.js";
import { Iterations } from "./iterations.js";
import { State } from "./state.js";

import { Strategy } from "./genetics/strategy.js";
import { Traits } from "./genetics/traits.js";

class UI {
    private readonly state: State;
    private readonly iterations: Iterations;

    private playFast = false;

    constructor() {
        this.state = new State();
        this.iterations = new Iterations(this.state);

        this.updateUI();
        this.addButtonListeners();
    }

    private addButtonListeners() {
        document.getElementById("next-1-btn")!.addEventListener("click", () => this.nextIteration(1));
        document.getElementById("next-10-btn")!.addEventListener("click", () => this.nextIteration(10));
        document.getElementById("next-100-btn")!.addEventListener("click", () => this.nextIteration(100));
        document.getElementById("play-pause-btn")!.addEventListener("click", () => this.togglePlay());
        document.getElementById("speed-btn")!.addEventListener("click", () => this.toggleSpeed());
    }

    private togglePlay() {
        const btn = document.getElementById("play-pause-btn") as HTMLButtonElement;
        if (this.iterations.playInterval !== null) {
            this.iterations.pause();
            btn.textContent = "▶ Play";
        } else {
            this.iterations.play(this.playFast);
            btn.textContent = "⏸ Pause";
        }
    }

    private toggleSpeed() {
        const btn = document.getElementById("speed-btn") as HTMLButtonElement;
        if (this.iterations.playInterval !== null) {
            this.iterations.pause();
        }
        this.playFast = !this.playFast;
        this.iterations.play(this.playFast);
        document.getElementById("play-pause-btn")!.textContent = "⏸ Pause";

        btn.textContent = this.playFast ? "Slower" : "Faster";
    }

    private energyLabel(energy: number): string {
        const energyLabels = ["🔴", "🟠", "🟡", "🟢"];
        if (energy > energyLabels.length - 1) {
            return energyLabels[energyLabels.length - 1];
        }
        if (energy < 0) {
            return energyLabels[0];
        }
        return energyLabels[Math.round(energy)];
    }

    private healthLabel(individual: Individual): string {
        if (individual.deathDay) {
            return individual.starved ? "💀🍽️" : "💀🍗";
        }
        if (individual.getAge(this.state.day) == 0) {
            return "👶";
        }
        return "🫀";
    }

    private ancestorLabel(individual: Individual): string {
        if (!individual.parent) {
            return "x";
        }
        if (individual.parent.deathDay) {
            return `${individual.parent.id} †`;
        }
        return individual.getParentIds().join(", ");
    }

    private nextIteration(amount: number) {
        this.iterations.execute(amount);
        this.updateUI();
    }

    private updateUI() {
        this.updateTitles();
        this.showEnvironment();
        this.showIndividuals();
    }

    private updateTitles() {
        document.getElementById("iteration-title")!.innerText = `Iteration ${this.state.day}`;
        document.getElementById("individuals-title")!.innerText = `Individuals (${this.state.getIndividualsArray().length})`;
    }

    private sortIndividualsWithinCategory(individuals: Individual[]): Individual[] {
        return individuals.sort((a: Individual, b: Individual) => {
            if (a.deathDay && b.deathDay && a.deathDay != b.deathDay) {
                return b.deathDay! - a.deathDay!;
            }

            return b.getAge(this.state.day) - a.getAge(this.state.day) ||
                b.getOffspringSum() - a.getOffspringSum() ||
                a.id.localeCompare(b.id);
        });
    }

    private valuesForIndividual(individual: Individual, includeDeath: boolean): Record<string, string> {
        if (!individual) {
            console.error("Individual is undefined");
            return {};
        }

        const values = {
            "ID": individual.id,
            "Age ▼": individual.getAge(this.state.day).toString(),
            [`Traits\n${Traits.headerString}`]: individual.traits.toString(),
            [`Strategy\n${Strategy.headerString}`]: individual.strategy.toString(),
            "Action": individual.lastEvent,
            "Energy": this.energyLabel(individual.energy),
            "Shelter": individual.shelter ? "🛡️" : "👁️",
            "Ancestors": this.ancestorLabel(individual),
            "Offspring": individual.getOffspringCounts().toString(),
        };

        if (includeDeath) {
            values["Death"] = individual.deathDay === null ? "" : (individual.deathDay - this.state.day).toString();
        }

        Object.entries(values).forEach(([key, value]) => {
            if (value === undefined) {
                console.error(`Value for ${key} is undefined for individual ${individual.id}`);
                console.log(individual);
            }
        });

        return values;
    }

    private showIndividuals() {
        const individualsDiv = document.getElementById("individuals")!;
        individualsDiv!.innerHTML = "";

        // individuals who died in previous iterations are hidden
        const individualsArray = this.state.getIndividualsArray().filter(individual => !individual.deathDay || individual.deathDay == this.state.day);

        if (individualsArray.length === 0) return;

        const individualsByCategory = this.divideIndividualsByCategory(individualsArray);

        for (let [category, individuals] of individualsByCategory) {
            const categoryTitle = document.createElement("h4");
            categoryTitle.innerText = `${IndividualCategory[category]} (${individuals.length})`;
            individualsDiv.appendChild(categoryTitle);

            if (individuals.length === 0) {
                continue;
            }

            this.sortIndividualsWithinCategory(individuals);
            const table = this.createTable(individuals);
            individualsDiv.appendChild(table);
        }
    }

    private divideIndividualsByCategory(individuals: Individual[]): Map<IndividualCategory, Individual[]> {
        const individualsByCategory: Map<IndividualCategory, Individual[]> = new Map();
        for (let category of Object.values(IndividualCategory).filter(v => typeof v === 'number')) {
            individualsByCategory.set(category as IndividualCategory, []);
        }
        for (let individual of individuals) {
            const category = individual.getCategory(this.state.day);
            individualsByCategory.get(category)!.push(individual);
        }
        return individualsByCategory;
    }

    private addHeader(table: HTMLTableElement) {
        const headerRow = document.createElement("tr");
        const headers = Object.keys(this.valuesForIndividual(this.state.getIndividualsArray()[0], true));
        headers.forEach(header => {
            const th = document.createElement("th");
            th.innerText = header;
            headerRow.appendChild(th);
        });
        table.appendChild(headerRow);
    }

    private addIndividualRow(table: HTMLTableElement, individual: Individual) {
        const row = document.createElement("tr");
        const values = this.valuesForIndividual(individual, true);

        Object.values(values).forEach(value => {
            const td = document.createElement("td");
            td.innerText = value.toString();
            row.appendChild(td);
        });
        row.style.backgroundColor = individual.strategy.toColor();
        table.appendChild(row);
    }

    private createTable(individuals: Individual[]): HTMLTableElement {
        const table = document.createElement("table");
        this.addHeader(table);

        for (let individual of individuals) {
            this.addIndividualRow(table, individual);
        }

        return table;
    }

    private showEnvironment() {
        const environmentDiv = document.getElementById("environment")!;
        environmentDiv.innerHTML = "";

        const food = document.createElement("p");
        food.innerText = `${this.state.environment.initialFood} -> ${this.state.environment.food} food`;
        environmentDiv.appendChild(food);

        const shelter = document.createElement("p");
        shelter.innerText = `${this.state.environment.initialShelter} -> ${this.state.environment.shelter} shelter`;
        environmentDiv.appendChild(shelter);

        const bodies = document.createElement("p");
        bodies.innerText = `${this.state.environment.bodies.length} bodies unscavenged`;
        environmentDiv.appendChild(bodies);
    }
}

window.onload = () => new UI();
