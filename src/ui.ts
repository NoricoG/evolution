import { Individual } from "./individual.js";
import { Iterations } from "./iterations.js";
import { State } from "./state.js";

import { Brain } from "./genetics/brain.js";
import { Diet } from "./genetics/diet.js";

window.onload = () => new UI();

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
        document.getElementById("next-1000-btn")!.addEventListener("click", () => this.nextIteration(1000));
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



    private nextIteration(amount: number) {
        this.iterations.execute(amount);
        this.updateUI();
    }

    private updateUI() {
        this.updateTitles();
        this.showEnvironment();
        new IndividualsDetails(this.state.individuals, this.state.day).showIndividuals();
    }

    private updateTitles() {
        document.getElementById("iteration-title")!.innerText = `Iteration ${this.state.day}`;
        document.getElementById("individuals-title")!.innerText = `Individuals (${this.state.individuals.length})`;
    }

    private showEnvironment() {
        const environmentDiv = document.getElementById("environment")!;
        environmentDiv.innerHTML = "";

        const food = document.createElement("p");
        food.innerText = this.state.environment.toFoodString();
        environmentDiv.appendChild(food);
    }
}

class IndividualsDetails {
    individuals: Individual[];
    day: number;

    constructor(individuals: Individual[], day: number) {
        this.individuals = individuals;
        this.day = day;
    }

    showIndividuals() {
        if (this.individuals.length === 0) return;

        const individualsDiv = document.getElementById("individuals")!;
        individualsDiv!.innerHTML = "";

        const alive = this.individuals.filter(individual => !individual.deathDay);
        const eaten = this.individuals.filter(individual => individual.eaten);
        const starved = this.individuals.filter(individual => individual.starved);

        const columnsWrapper = document.createElement("div");
        columnsWrapper.className = "individuals-columns";

        const leftColumn = document.createElement("div");
        leftColumn.className = "column";
        this.appendCategory(leftColumn, "Alive", alive);

        const rightColumn = document.createElement("div");
        rightColumn.className = "column";
        this.appendCategory(rightColumn, "Eaten", eaten);
        this.appendCategory(rightColumn, "Starved", starved);

        columnsWrapper.appendChild(leftColumn);
        columnsWrapper.appendChild(rightColumn);
        individualsDiv.appendChild(columnsWrapper);
    }

    private appendCategory(container: HTMLElement, category: string, individuals: Individual[]) {
        const categoryTitle = document.createElement("h4");
        categoryTitle.innerText = `${category} (${individuals.length})`;
        container.appendChild(categoryTitle);

        if (individuals.length === 0) return;

        this.sortIndividualsWithinCategory(individuals);
        const table = this.createTable(individuals);
        container.appendChild(table);
    }

    private valuesForIndividual(individual: Individual, includeDeath: boolean): Record<string, string> {
        if (!individual) {
            console.error("Individual is undefined");
            return {};
        }

        const values = {
            "ID": individual.id,
            "Age ▼": individual.getAge(this.day).toString(),
            [`Diet\n${Diet.geneLabels}`]: individual.diet.toString(),
            [`Brain\n${Brain.geneLabels}`]: individual.brain.toString(),
            "Action": individual.events[individual.events.length - 1] || "",
            "Energy": this.energyLabel(individual.energy),
            "Ancestors": this.ancestorLabel(individual),
            "Offspring": individual.getOffspringCounts().toString(),
        };

        Object.entries(values).forEach(([key, value]) => {
            if (value === undefined) {
                console.error(`Value for ${key} is undefined for individual ${individual.id}`);
                console.error(individual);
            }
        });

        return values;
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

    private ancestorLabel(individual: Individual): string {
        if (!individual.parent) {
            return "x";
        }
        if (individual.parent.deathDay) {
            return `${individual.parent.id} †`;
        }
        return individual.getParentIds().join(", ");
    }

    private sortIndividualsWithinCategory(individuals: Individual[]): Individual[] {
        return individuals.sort((a: Individual, b: Individual) => {
            if (a.deathDay && b.deathDay && a.deathDay != b.deathDay) {
                return b.deathDay! - a.deathDay!;
            }

            return b.getAge(this.day) - a.getAge(this.day) ||
                b.getOffspringSum() - a.getOffspringSum() ||
                a.id.localeCompare(b.id);
        });
    }

    private createTable(individuals: Individual[]): HTMLTableElement {
        const table = document.createElement("table");
        this.addHeader(table);

        for (let individual of individuals) {
            this.addIndividualRow(table, individual);
        }

        return table;
    }

    private addHeader(table: HTMLTableElement) {
        const headerRow = document.createElement("tr");
        const headers = Object.keys(this.valuesForIndividual(this.individuals[0], true));
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
        row.style.backgroundColor = individual.toColor();
        table.appendChild(row);
    }
}
