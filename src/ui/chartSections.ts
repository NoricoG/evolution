import { DayMetrics } from "@simulation/metrics.js";
import { Color } from "@ui/color.js";
import { BaseChart } from "@ui/charts/baseChart.js";
import { MatrixChart } from "@ui/charts/matrixChart.js";
import { StackedBarChart } from "@ui/charts/stackedBarChart.js";

type ChartSection = { name: string; charts: BaseChart[] };

export class ChartSections {
    private readonly sections: ChartSection[];

    constructor() {
        this.sections = [
            {
                name: "Diet & actions",
                charts: [
                    StackedBarChart.fromDistribution(
                        "diet-chart", "Individuals per diet", 9,
                        d => d.dietDistribution.bucketCounts,
                        Color.greenToRedRange,
                        ["1 (herbivore)", "2", "3", "4", "5 (omnivore)", "6", "7", "8", "9 (carnivore)"]),
                    new StackedBarChart("action-breakdown-chart", "Actions", [
                        { label: "Grow up", getValue: d => d.actions.growUp, color: Color.redPink },
                        { label: "Learn", getValue: d => d.actions.learn, color: Color.purple },
                        { label: "Reproduce", getValue: d => d.actions.reproduce, color: Color.blueSky },
                        { label: "Eat plant", getValue: d => d.actions.plantSearch, color: Color.green },
                        { label: "Eat meat", getValue: d => d.actions.hunt, color: Color.red },
                    ]),
                    new StackedBarChart("eat-plant-breakdown-chart", "Plant search outcome", [
                        { label: "Uneaten plants", getValue: (d: DayMetrics) => d.food.remaining, color: Color.greenTeal },
                        { label: "Plant found", getValue: d => d.actions.plantSearchSuccess, color: Color.green },
                        { label: "Nothing found", getValue: d => d.actions.plantSearchFail, color: Color.redPink },
                    ]),
                    new StackedBarChart("eat-meat-breakdown-chart", "Hunting outcome", [
                        { label: "Prey escaped", getValue: d => d.actions.huntFail, color: Color.redPink },
                        { label: "Prey caught", getValue: d => d.actions.huntSuccess, color: Color.red },
                    ]),
                    StackedBarChart.fromDistribution(
                        "starved-chart", "Starved per diet", 9,
                        d => d.starvedDietDistribution.bucketCounts,
                        Color.greenToRedRange,
                        ["1 (herbivore)", "2", "3", "4", "5 (omnivore)", "6", "7", "8", "9 (carnivore)"]),
                    StackedBarChart.fromDistribution(
                        "eaten-chart", "Eaten per diet", 9,
                        d => d.eatenDietDistribution.bucketCounts,
                        Color.greenToRedRange,
                        ["1 (herbivore)", "2", "3", "4", "5 (omnivore)", "6", "7", "8", "9 (carnivore)"]),
                ]
            },
            {
                name: "Gene pool",
                charts: [
                    new MatrixChart("gene-survive-or-learn-chart-relative", "Behaviour: Survive or Learn", "Survive", "Learn", Color.purpleHue, m => m.genetics.surviveOrLearn, true),
                    new MatrixChart("gene-eat-or-reproduce-chart-relative", "Behaviour: Eat or Reproduce", "Eat", "Reproduce", Color.orangeHue, m => m.genetics.eatOrReproduce, true),
                    new MatrixChart("gene-plant-or-meat-chart-relative", "Diet: Plant or Meat", "Plant", "Meat", Color.blueHue, m => m.genetics.plantOrMeat, true),
                    new MatrixChart("gene-plant-search-skill-chart-relative", "Skill: Plant search", "Bad", "Good", Color.greenHue, m => m.genetics.plantSearchSkill, true),
                    new MatrixChart("gene-hunt-skill-chart-relative", "Skill: Hunt", "Bad", "Good", Color.redHue, m => m.genetics.huntSkill, true),
                    new MatrixChart("gene-alertness-trait-chart-relative", "Trait: Alertness", "Low", "High", Color.blueHue, m => m.genetics.alertnessTrait, true),
                    new MatrixChart("gene-size-trait-chart-relative", "Trait: Size", "Small", "Large", Color.yellowHue, m => m.genetics.sizeTrait, true),
                ]
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
