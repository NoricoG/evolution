import { DayMetrics } from "../metrics.js";
import { BaseChart, LineChart, MatrixChart } from "./chartHelpers.js";
import { Color } from "../utils/color.js";

export class Charts {
    private readonly charts: Array<Array<BaseChart>>;

    constructor() {
        this.charts = [
            [
                new LineChart("population-chart", "Count", undefined, m => [
                    { label: "Alive", data: m.map(d => d.population.alive), borderColor: Color.neutral },
                ]),
                new LineChart("diet-chart", "Count", 0, m => [
                    { label: "Herbivore", data: m.map(d => d.dietDistribution.herbivore), borderColor: Color.herbivore },
                    { label: "Omnivore", data: m.map(d => d.dietDistribution.omnivore), borderColor: Color.omnivore },
                    { label: "Carnivore", data: m.map(d => d.dietDistribution.carnivore), borderColor: Color.carnivore },
                ]),
            ],
            [
                new LineChart("growth-chart", "Count", undefined, m => [
                    { label: "Population growth", data: m.map(d => d.population.born - d.population.dead), borderColor: Color.good },
                ]),
                new LineChart("born-died-chart", "Count", undefined, m => [
                    { label: "Born", data: m.map(d => d.population.born), borderColor: Color.good },
                    { label: "Died", data: m.map(d => d.population.dead), borderColor: Color.bad },
                ]),
            ],
            [
                new LineChart("deaths-chart", "Count", undefined, m => [
                    { label: "Eaten", data: m.map(d => d.eatenStarved.eaten), borderColor: Color.carnivore },
                    { label: "Starved", data: m.map(d => d.eatenStarved.starved), borderColor: Color.bad },
                ]),
                new LineChart("food-chart", "Food", 0, m => [
                    { label: "Food at start", data: m.map(d => d.food.grown), borderColor: Color.good },
                    { label: "Food unused at end", data: m.map(d => d.food.remaining), borderColor: Color.neutral },
                ]),
            ],
            [
                new LineChart("eaten-details-chart", "Count", undefined, m => [
                    { label: "Eaten herbivores", data: m.map(d => d.eatenStarved.eatenHerbivore), borderColor: Color.herbivore },
                    { label: "Eaten omnivores", data: m.map(d => d.eatenStarved.eatenOmnivore), borderColor: Color.omnivore },
                    { label: "Eaten carnivores", data: m.map(d => d.eatenStarved.eatenCarnivore), borderColor: Color.carnivore },
                ]),
                new LineChart("starved-details-chart", "Count", undefined, m => [
                    { label: "Starved herbivores", data: m.map(d => d.eatenStarved.starvedHerbivore), borderColor: Color.herbivore },
                    { label: "Starved omnivores", data: m.map(d => d.eatenStarved.starvedOmnivore), borderColor: Color.omnivore },
                    { label: "Starved carnivores", data: m.map(d => d.eatenStarved.starvedCarnivore), borderColor: Color.carnivore },
                ]),
            ],
            [
                new LineChart("age-living-chart", "Age (days)", 0, m => [
                    { label: "Avg age (living)", data: m.map(d => d.age.averageLiving), borderColor: Color.neutral, spanGaps: true },
                    { label: "Oldest (living)", data: m.map(d => d.age.oldest), borderColor: Color.good, spanGaps: true },
                ]),
                new LineChart("age-death-chart", "Age (days)", 0, m => [
                    { label: "Avg age of death", data: m.map(d => d.age.averageDeath), borderColor: Color.neutral, spanGaps: true },
                    { label: "Oldest age of death", data: m.map(d => d.age.oldestDeath), borderColor: Color.bad, spanGaps: true },
                ]),
            ],
            [
                new LineChart("avg-offspring-chart", "Offspring", 0, m => [
                    { label: "Avg alive offspring", data: m.map(d => d.offspring.averageAlive), borderColor: Color.good, spanGaps: true },
                    { label: "Avg total offspring", data: m.map(d => d.offspring.averageTotal), borderColor: Color.bad, spanGaps: true },
                ]),
                new LineChart("max-offspring-chart", "Offspring", 0, m => [
                    { label: "Max alive offspring", data: m.map(d => d.offspring.maxAlive), borderColor: Color.good, spanGaps: true },
                    { label: "Max total offspring", data: m.map(d => d.offspring.maxTotal), borderColor: Color.bad, spanGaps: true },
                ]),
            ],
            [
                new MatrixChart("gene-plant-or-meat-chart", "Plant", "Meat", Color.plantOrMeat, m => m.genetics.plantOrMeat),
                new MatrixChart("gene-eat-or-reproduce-chart", "Eat", "Reproduce", Color.eatOrReproduce, m => m.genetics.eatOrReproduce),
            ],
        ];

        this.buildDOM();
    }

    private buildDOM() {
        const container = document.getElementById("charts")!;
        for (const group of this.charts) {
            const pair = document.createElement("div");
            pair.className = "chart-pair";
            for (const chart of group) {
                const chartContainer = document.createElement("div");
                chartContainer.className = "chart-container";
                const canvas = document.createElement("canvas");
                canvas.id = chart.canvasId;
                chartContainer.appendChild(canvas);
                pair.appendChild(chartContainer);
            }
            container.appendChild(pair);
        }
    }

    update(dayMetrics: DayMetrics[]) {
        for (const group of this.charts) {
            for (const chart of group) {
                chart.update(dayMetrics);
            }
        }
    }
}
