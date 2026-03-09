import {
    Chart,
    LineController,
    LineElement,
    PointElement,
    CategoryScale,
    LinearScale,
    Tooltip,
    Legend,
} from "chart.js";
import { MatrixController, MatrixElement } from "chartjs-chart-matrix";
import { DayMetrics, GeneMetrics } from "./metrics.js";
import { Color } from "../../utils/color.js";

Chart.register(LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend, MatrixController, MatrixElement);

type MatrixDataPoint = { x: number; y: number; v: number };

export type LineDataset = {
    label: string;
    data: (number | null)[];
    borderColor: string;
    spanGaps?: boolean;
};

function getTickStepSize(numDays: number): number {
    if (numDays <= 50) return 5;
    if (numDays <= 150) return 10;
    if (numDays <= 300) return 25;
    if (numDays <= 600) return 50;
    return 100;
}

const baseChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    transitions: {
        default: { animation: { duration: 0 } },  // data updates (e.g. x-axis extension)
        active: { animation: { duration: 0 } },   // hover
    },
} as const;

export abstract class BaseChart {
    protected chart: Chart | undefined;

    constructor(readonly canvasId: string) { }

    protected getCanvas(): HTMLCanvasElement | null {
        return document.getElementById(this.canvasId) as HTMLCanvasElement;
    }

    protected initializeChart(config: any): boolean {
        const canvas = this.getCanvas();
        if (!canvas) return false;
        this.chart = new Chart(canvas, config);
        return true;
    }

    abstract update(dayMetrics: DayMetrics[]): void;
}

export class LineChart extends BaseChart {
    constructor(
        canvasId: string,
        private readonly yLabel: string,
        private readonly yMin: number | undefined,
        private readonly getDatasets: (dayMetrics: DayMetrics[]) => LineDataset[],
    ) {
        super(canvasId);
    }

    update(dayMetrics: DayMetrics[]) {
        const labels = dayMetrics.map(m => m.day.toString());
        const datasets = this.getDatasets(dayMetrics);
        const stepSize = getTickStepSize(dayMetrics.length);
        const xTicks = { callback: (_: any, index: number) => index % stepSize === 0 ? labels[index] : null };

        if (!this.chart) {
            if (!this.initializeChart({
                type: "line",
                data: {
                    labels,
                    datasets: datasets.map(ds => ({
                        label: ds.label,
                        data: ds.data,
                        borderColor: ds.borderColor,
                        borderWidth: 1.5,
                        fill: false,
                        spanGaps: ds.spanGaps ?? false,
                        pointRadius: 0.5,
                    })),
                },
                options: {
                    ...baseChartOptions,
                    scales: {
                        x: { title: { display: false }, ticks: xTicks },
                        y: {
                            title: { display: true, text: this.yLabel },
                            ...(this.yMin !== undefined ? { min: this.yMin } : {}),
                        },
                    },
                },
            })) return;
        } else {
            this.chart.data.labels = labels;
            for (let i = 0; i < datasets.length; i++) {
                this.chart.data.datasets[i].data = datasets[i].data;
            }
            (this.chart.options.scales as any).x.ticks = xTicks;
            this.chart.update();
        }
    }
}

export class MatrixChart extends BaseChart {
    constructor(
        canvasId: string,
        private readonly labelA: string,
        private readonly labelB: string,
        private readonly rgbColor: string,

        private readonly getGeneMetrics: (m: DayMetrics) => GeneMetrics,
        private readonly relative: boolean,
    ) {
        super(canvasId);
    }

    update(dayMetrics: DayMetrics[]) {
        const data: MatrixDataPoint[] = [];
        for (const m of dayMetrics) {
            const geneMetrics = this.getGeneMetrics(m);
            const total = m.population.alive || 1;
            for (let bucket = 1; bucket <= 9; bucket++) {
                let value = geneMetrics.counts[bucket - 1] ?? 0;
                if (this.relative) {
                    value /= total;
                }
                data.push({ x: m.day, y: bucket, v: value });
            }
        }
        const numDays = dayMetrics.length || 1;
        const stepSize = getTickStepSize(numDays);
        const maxValue = this.relative ? 1 : Math.max(...data.map(d => d.v), 1);
        const { labelA, labelB, rgbColor, relative } = this;

        if (!this.chart) {
            if (!this.initializeChart({
                type: "matrix" as any,
                data: {
                    datasets: [{
                        label: `${labelA} or ${labelB} ${relative ? "(relative)" : "(absolute)"}`,
                        data,
                        backgroundColor(context: any) {
                            const v = (context.dataset.data[context.dataIndex] as MatrixDataPoint).v;
                            return Color.rgbToRgba(rgbColor, v / maxValue);
                        },
                        borderColor: Color.rgbToRgba(rgbColor, 0.15),
                        borderWidth: 1,
                        width: ({ chart: c }: any) => {
                            const area = c.chartArea;
                            return area ? Math.max(2, area.width / numDays - 1) : 10;
                        },
                        height: ({ chart: c }: any) => {
                            const area = c.chartArea;
                            return area ? Math.max(2, area.height / 10 - 1) : 10;
                        },
                    } as any],
                },
                options: {
                    ...baseChartOptions,
                    scales: {
                        x: {
                            type: "linear",
                            offset: true,
                            title: { display: false },
                            ticks: { stepSize },
                        },
                        y: {
                            type: "linear",
                            offset: true,
                            min: 1,
                            max: 9,
                            reverse: false,
                            ticks: { stepSize: 1 },
                            title: { display: true, text: `${labelA} <---> ${labelB}` },
                        },
                    },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                title: () => `${labelA} or ${labelB} ${relative ? "(relative)" : "(absolute)"}$`,
                                label(context: any) {
                                    const d = context.dataset.data[context.dataIndex] as MatrixDataPoint;
                                    if (relative) {
                                        return `Day ${d.x}, Bucket ${d.y}: ${(d.v * 100).toFixed(1)}%`;
                                    } else {
                                        return `Day ${d.x}, Bucket ${d.y}: ${d.v}`;
                                    }
                                },
                            },
                        },
                    },
                },
            })) return;
        } else {
            this.chart.data.datasets[0].data = data;
            (this.chart.data.datasets[0] as any).backgroundColor = (context: any) => {
                const v = (context.dataset.data[context.dataIndex] as MatrixDataPoint).v;
                return Color.rgbToRgba(rgbColor, v / maxValue);
            };
            (this.chart.data.datasets[0] as any).width = ({ chart: c }: any) => {
                const area = c.chartArea;
                return area ? Math.max(2, area.width / numDays - 1) : 10;
            };
            (this.chart.options.scales as any).x.ticks = { stepSize };
            this.chart.update();
        }
    }
}
