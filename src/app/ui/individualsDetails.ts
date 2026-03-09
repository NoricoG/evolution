import { Individual } from "../../simulation/individual.js";

export class IndividualsDetails {
    readonly individuals: Individual[];
    readonly day: number;

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

        const wrapper = document.createElement("div");

        this.appendCategory(wrapper, `Alive`, alive, 4);
        this.appendCategory(wrapper, `Eaten`, eaten, 2);
        this.appendCategory(wrapper, `Starved`, starved, 2);

        individualsDiv.appendChild(wrapper);
    }

    private appendCategory(container: HTMLElement, category: string, individuals: Individual[], limit: number) {
        const categoryTitle = document.createElement("h4");
        categoryTitle.innerText = `${category} (top ${limit} of ${individuals.length})`;
        container.appendChild(categoryTitle);

        if (individuals.length === 0) return;

        this.sortIndividualsWithinCategory(individuals);
        const individualsToShow = individuals.length > limit ? individuals.slice(0, limit) : individuals;

        const table = this.createTable(individualsToShow);
        container.appendChild(table);
    }

    private valuesForIndividual(individual: Individual, includeDeath: boolean): Record<string, string> {
        if (!individual) {
            console.error("Individual is undefined");
            return {};
        }

        const values = {
            "ID": individual.id,
            "Age": individual.getAge(this.day).toString(),
            [`Brain\n🍽️👶`]: individual.brain.eatOrReproduce.toString(),
            [`Diet\n🥕🥩`]: individual.brain.plantOrMeat.toString(),
            "Action": individual.events[individual.events.length - 1] || "",
            "Energy": this.energyLabel(individual.energy),
            "Ancestors": this.ancestorLabel(individual),
            "Offspring\nAlive": `${individual.getOffspringSum(false)}\n(${individual.getOffspringCounts(false).toString()})`,
            "Offspring  ▼\nTotal": `${individual.getOffspringSum(true)}\n(${individual.getOffspringCounts(true).toString()})`,
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
        const energyLabels = ["🪫", "🔴", "🟠", "🟡", "🟢"];
        if (energy > energyLabels.length - 1) {
            return energyLabels[energyLabels.length - 1];
        }
        if (energy < 0) {
            return energyLabels[0];
        }
        return energyLabels[Math.round(energy)];
    }

    private ancestorLabel(individual: Individual): string {
        const parents = individual.getParents();
        // put oldest at 0
        parents.reverse()

        if (parents.length === 0) {
            return "x";
        }

        let parentString = parents.map(parent => parent.id).join(" > ");
        const oldestParent = parents[0];
        if (oldestParent.deathDay) {
            parentString = parentString.replace(oldestParent.id, `${oldestParent.id} † ${oldestParent.deathDay}`);
        }

        return parentString;
    }

    private sortIndividualsWithinCategory(individuals: Individual[]): Individual[] {
        return individuals.sort((a: Individual, b: Individual) => {
            // show (longest) dead individuals at bottom
            if (a.deathDay && b.deathDay && a.deathDay != b.deathDay) {
                return b.deathDay! - a.deathDay!;
            }

            // living offspring descending
            return b.getOffspringSum(true) - a.getOffspringSum(true) ||
                // age descending
                b.getAge(this.day) - a.getAge(this.day) ||
                // id ascending
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
