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
import { DayMetrics, GeneMetrics } from "../metrics.js";
import { Color } from "../utils/color.js";

Chart.register(LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend, MatrixController, MatrixElement);

type MatrixDataPoint = { x: number; y: number; v: number };

export type LineDataset = {
    label: string;
    data: (number | null)[];
    borderColor: string;
    spanGaps?: boolean;
};

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
        if (!this.chart) {
            if (!this.initializeChart({
                type: "line",
                data: {
                    labels,
                    datasets: datasets.map(ds => ({
                        label: ds.label,
                        data: ds.data,
                        borderColor: ds.borderColor,
                        fill: false,
                        spanGaps: ds.spanGaps ?? false,
                        pointRadius: 0,
                    })),
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: false,
                    scales: {
                        x: { title: { display: true, text: "Day" } },
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
    ) {
        super(canvasId);
    }

    update(dayMetrics: DayMetrics[]) {
        const data: MatrixDataPoint[] = [];
        for (const m of dayMetrics) {
            const geneMetrics = this.getGeneMetrics(m);
            const total = m.population.alive || 1;
            for (let bucket = 1; bucket <= 9; bucket++) {
                data.push({ x: m.day, y: bucket, v: (geneMetrics.counts[bucket - 1] ?? 0) / total });
            }
        }
        const numDays = dayMetrics.length || 1;
        const { labelA, labelB, rgbColor } = this;

        if (!this.chart) {
            if (!this.initializeChart({
                type: "matrix" as any,
                data: {
                    datasets: [{
                        label: `${labelA} or ${labelB}`,
                        data,
                        backgroundColor(context: any) {
                            const v = (context.dataset.data[context.dataIndex] as MatrixDataPoint).v;
                            return Color.rgbToRgba(rgbColor, v);
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
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: false,
                    scales: {
                        x: {
                            type: "linear",
                            offset: true,
                            title: { display: true, text: "Day" },
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
                                title: () => `${labelA} or ${labelB}`,
                                label(context: any) {
                                    const d = context.dataset.data[context.dataIndex] as MatrixDataPoint;
                                    return `Day ${d.x}, Bucket ${d.y}: ${(d.v * 100).toFixed(1)}%`;
                                },
                            },
                        },
                    },
                },
            })) return;
        } else {
            this.chart.data.datasets[0].data = data;
            (this.chart.data.datasets[0] as any).width = ({ chart: c }: any) => {
                const area = c.chartArea;
                return area ? Math.max(2, area.width / numDays - 1) : 10;
            };
            this.chart.update();
        }
    }
}
