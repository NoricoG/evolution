import { DayMetrics } from "@simulation/metrics.js";
import { Color, Hue } from "@ui/color.js";
import { BaseChart } from "@ui/charts/baseChart.js";
import { MatrixChart } from "@ui/charts/matrixChart.js";
import { StackedBarChart } from "@ui/charts/stackedBarChart.js";
import { Individual } from "@simulation/individual.js";

type ChartSection = { name: string; charts: BaseChart[] };

export class ChartSections {
    private readonly sections: ChartSection[];

    constructor() {
        let geneCharts: any = [];
        for (let i = 0; i < Individual.allChromosomes.length; i++) {
            const chromosome = Individual.allChromosomes[i];
            const chromosomeName = chromosome.chromosomeName;
            for (let j = 0; j < chromosome.geneKeys.length; j++) {
                const name = chromosome.geneKeys[j];
                // TODO: dynamic hue set somewhere
                geneCharts.push(new MatrixChart(`gene-${name}-chart`, `${chromosomeName}: ${name}`, "Low", "High", Hue.blueHue, m => m.genetics.chromosomes[i].genes[j], true));
            }
        }

        this.sections = [
            {
                name: "Diet & actions",
                charts: [
                    StackedBarChart.fromDistribution(
                        "diet-chart", "Individuals per diet", 9,
                        d => d.dietDistribution.bucketCounts,
                        Hue.greenToRedRange,
                        ["1 (herbivore)", "2", "3", "4", "5 (omnivore)", "6", "7", "8", "9 (carnivore)"]),
                    new StackedBarChart("action-breakdown-chart", "Actions", [
                        { label: "Grow up", getValue: d => d.actions.growUp, color: Color.redPink },
                        { label: "Move", getValue: d => d.actions.move, color: Color.blue },
                        { label: "Eat plant", getValue: d => d.actions.plantSearch, color: Color.green },
                        { label: "Eat meat", getValue: d => d.actions.hunt, color: Color.red },
                        { label: "Reproduce", getValue: d => d.actions.reproduce, color: Color.blueSky },
                    ]),
                    new StackedBarChart("eat-plant-breakdown-chart", "Plant search outcome", [
                        { label: "Plant found", getValue: d => d.actions.plantSearchSuccess, color: Color.green },
                        { label: "Nothing found", getValue: d => d.actions.plantSearchFail, color: Color.redPink },
                    ]),
                    new StackedBarChart("eat-meat-breakdown-chart", "Hunting outcome", [
                        { label: "Prey escaped", getValue: d => d.actions.huntFail, color: Color.redPink },
                        { label: "Prey caught", getValue: d => d.actions.huntSuccess, color: Color.red },
                    ]),
                    new StackedBarChart("eaten-starved-chart", "Eaten vs starved", [
                        { label: "Eaten", getValue: d => d.population.eaten, color: Color.red },
                        { label: "Starved", getValue: d => d.population.starved, color: Color.purple },
                    ]),

                    StackedBarChart.fromDistribution(
                        "starved-chart", "Starved per diet", 9,
                        d => d.starvedDietDistribution.bucketCounts,
                        Hue.greenToRedRange,
                        ["1 (herbivore)", "2", "3", "4", "5 (omnivore)", "6", "7", "8", "9 (carnivore)"]),
                    StackedBarChart.fromDistribution(
                        "eaten-chart", "Eaten per diet", 9,
                        d => d.eatenDietDistribution.bucketCounts,
                        Hue.greenToRedRange,
                        ["1 (herbivore)", "2", "3", "4", "5 (omnivore)", "6", "7", "8", "9 (carnivore)"]),
                ]
            },
            {
                name: "Gene pool",
                charts: geneCharts
            },
        ];

        this.buildDOM();
    }

    private buildDOM() {
        const container = document.getElementById("charts")!;
        for (const section of this.sections) {
            const heading = document.createElement("h3");
            heading.textContent = section.name;
            container.appendChild(heading);

            const sectionElement = document.createElement("div");
            sectionElement.className = "chart-section";

            for (const chart of section.charts) {
                const chartContainer = document.createElement("div");
                chartContainer.className = "chart-container";

                if (chart instanceof MatrixChart) {
                    chartContainer.classList.add("small-chart");
                } else {
                    chartContainer.classList.add("normal-chart");
                }

                const canvas = document.createElement("canvas");
                canvas.id = chart.canvasId;
                chartContainer.appendChild(canvas);
                sectionElement.appendChild(chartContainer);
            }
            container.appendChild(sectionElement);
        }
    }

    update(dayMetrics: DayMetrics[]) {
        for (const section of this.sections) {
            for (const chart of section.charts) {
                chart.update(dayMetrics);
            }
        }
    }
}
