import { BarController, BarElement, CategoryScale, Chart } from "chart.js";
import { DayMetrics } from "@simulation/metrics.js";
import { BaseChart, baseChartOptions, getTickStepSize } from "@ui/charts/baseChart.js";

Chart.register(BarController, BarElement, CategoryScale);

export type StackedBarSeries = {
    label: string;
    getValue: (m: DayMetrics) => number;
    color: string;
};

type DataPoint = { x: number, y: number };

export class StackedBarChart extends BaseChart {
    private cachedDays: number[] = [];
    private cachedDatasets: DataPoint[][] = [];

    constructor(
        canvasId: string,
        private readonly title: string,
        private readonly yLabel: string,
        private readonly series: StackedBarSeries[],
    ) {
        super(canvasId);
        this.cachedDatasets = series.map(() => []);
    }

    static fromDistribution(
        canvasId: string,
        title: string,
        yLabel: string,
        bucketCount: number,
        getBuckets: (m: DayMetrics) => number[],
        colors: string[],
    ): StackedBarChart {
        if (colors.length != bucketCount) {
            console.warn(`Expected ${bucketCount} colors but received ${colors.length} colors.`)
        }
        return new StackedBarChart(
            canvasId,
            title,
            yLabel,
            Array.from({ length: bucketCount }, (_, i) => ({
                label: String(i + 1),
                getValue: (m: DayMetrics) => getBuckets(m)[i] ?? 0,
                color: colors[i],
            }))
        );
    }

    update(newMetrics: DayMetrics[]) {
        const timelineMismatched = newMetrics.length > 0 && this.cachedDays.length > 0 && newMetrics[0].day <= this.cachedDays[this.cachedDays.length - 1];

        if (timelineMismatched) {
            this.cachedDays = [];
            this.cachedDatasets = this.series.map(() => []);
        }

        for (const m of newMetrics) {
            this.cachedDays.push(m.day);
            for (let s = 0; s < this.series.length; s++) {
                this.cachedDatasets[s].push({ x: m.day, y: this.series[s].getValue(m) });
            }
        }

        const excess = this.getPruneExcess(this.cachedDays.length);
        if (excess > 0) {
            this.cachedDays.splice(0, excess);
            for (let s = 0; s < this.series.length; s++) {
                this.cachedDatasets[s].splice(0, excess);
            }
        }

        const numDays = this.cachedDays.length || 1;
        const stepSize = getTickStepSize(numDays);
        const { min, max } = this.getXRange(this.cachedDays[0], this.cachedDays[this.cachedDays.length - 1]);

        if (!this.chart) {
            if (!this.initializeChart({
                type: "bar",
                data: {
                    datasets: this.series.map((s, i) => ({
                        label: s.label,
                        data: this.cachedDatasets[i],
                        backgroundColor: s.color,
                        borderWidth: 0,
                    })),
                },
                options: {
                    ...baseChartOptions,
                    barPercentage: 1.0,
                    categoryPercentage: 1.0,
                    plugins: {
                        title: { display: !!this.title, text: this.title },
                        tooltip: { enabled: false },
                    },
                    scales: {
                        x: {
                            type: "linear",
                            stacked: true,
                            offset: false,
                            title: { display: false },
                            ticks: { stepSize },
                            min,
                            max,
                        },
                        y: { stacked: true, title: { display: true, text: this.yLabel } },
                    },
                },
            })) return;
        } else {
            if (this.chart.data.datasets.length !== this.series.length) {
                this.chart.data.datasets = this.series.map((s, i) => ({
                    label: s.label,
                    data: this.cachedDatasets[i],
                    backgroundColor: s.color,
                    borderWidth: 0,
                }));
            } else {
                for (let i = 0; i < this.series.length; i++) {
                    this.chart.data.datasets[i].data = this.cachedDatasets[i];
                }
            }
            (this.chart.options.scales as any).x.ticks.stepSize = stepSize;
            (this.chart.options.scales as any).x.min = min;
            (this.chart.options.scales as any).x.max = max;
            this.chart.update();
        }
    }
}
