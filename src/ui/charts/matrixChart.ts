import { Chart } from "chart.js";
import { MatrixController, MatrixElement } from "chartjs-chart-matrix";
import { DayMetrics, GeneMetrics } from "@simulation/metrics.js";
import { BaseChart, baseChartOptions, getTickStepSize } from "@ui/charts/baseChart.js";
import { Color } from "@ui/color.js";

Chart.register(MatrixController, MatrixElement);

type MatrixDataPoint = { x: number; y: number; v: number };

export class MatrixChart extends BaseChart {
    constructor(
        canvasId: string,
        private readonly geneLabel: string,
        private readonly lowLabel: string,
        private readonly highLabel: string,
        private readonly hue: number,
        private readonly getGeneMetrics: (m: DayMetrics) => GeneMetrics,
        private readonly relative: boolean,
    ) {
        super(canvasId);
    }

    private maxValue: number = 1;
    private cachedData: MatrixDataPoint[] = [];

    update(newMetrics: DayMetrics[]) {
        const timelineMismatched = newMetrics.length > 0 && this.cachedData.length > 0 && newMetrics[0].day <= this.cachedData[this.cachedData.length - 1].x;

        if (timelineMismatched) {
            this.cachedData = [];
        }

        for (const m of newMetrics) {
            const geneMetrics = this.getGeneMetrics(m);
            const total = m.population.alive || 1;
            for (let bucket = 1; bucket <= 9; bucket++) {
                let value = geneMetrics.counts[bucket - 1] ?? 0;
                if (this.relative) {
                    value /= total;
                }
                this.cachedData.push({ x: m.day, y: bucket, v: value });
            }
        }

        const excessDays = this.getPruneExcess(this.cachedData.length / 9);
        if (excessDays > 0) {
            this.cachedData.splice(0, excessDays * 9);
        }

        const data = this.cachedData;
        const currentNumDays = this.cachedData.length / 9 || 1;
        const stepSize = getTickStepSize(currentNumDays);
        const { min, max } = this.getXRange(this.cachedData[0]?.x, this.cachedData[this.cachedData.length - 1]?.x);
        this.maxValue = this.relative ? 1 : Math.max(...data.map(d => d.v), 1);
        const { geneLabel, lowLabel, highLabel, hue, relative } = this;

        if (!this.chart) {
            if (!this.initializeChart({
                type: "matrix" as any,
                data: {
                    datasets: [{
                        label: `${geneLabel} ${relative ? "(relative)" : "(absolute)"}`,
                        data,
                        backgroundColor: (ctx: any) => {
                            const point = ctx.raw as MatrixDataPoint;
                            if (!point) return 'transparent';
                            const lightness = 1 - (point.v / this.maxValue) * 0.5;
                            const [r, g, b] = Color.hslToRgb(hue, Color.defaultSaturation, lightness);
                            return `rgb(${r}, ${g}, ${b})`;
                        },
                        borderWidth: 0,
                        parsing: false,
                        normalized: true,
                        width: ({ chart: c }: any) => {
                            const area = c.chartArea;
                            return area ? Math.max(2, area.width / currentNumDays) : 10;
                        },
                        height: ({ chart: c }: any) => {
                            const area = c.chartArea;
                            return area ? Math.max(2, area.height / 10) : 10;
                        },
                    } as any],
                },
                options: {
                    ...baseChartOptions,
                    scales: {
                        x: {
                            type: "linear",
                            offset: false,
                            title: { display: false },
                            ticks: { stepSize },
                            grid: { display: false },
                            min,
                            max,
                        },
                        y: {
                            type: "linear",
                            offset: true,
                            min: 1,
                            max: 9,
                            reverse: false,
                            ticks: { stepSize: 1 },
                            title: { display: true, text: `${lowLabel} <-> ${highLabel}` },
                            grid: { display: false },
                        },
                    },
                    plugins: {
                        title: { display: true, text: geneLabel },
                        legend: { display: false },
                        tooltip: { enabled: false },
                    },
                },
            })) return;
        } else {
            this.chart.data.datasets[0].data = data;
            (this.chart.data.datasets[0] as any).width = ({ chart: c }: any) => {
                const area = c.chartArea;
                return area ? Math.max(2, area.width / currentNumDays) : 10;
            };
            (this.chart.options.scales as any).x.ticks.stepSize = stepSize;
            (this.chart.options.scales as any).x.min = min;
            (this.chart.options.scales as any).x.max = max;
            this.chart.update();
        }
    }
}
