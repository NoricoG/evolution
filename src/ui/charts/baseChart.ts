import { Chart, Legend, LinearScale, Title, Tooltip } from "chart.js";

import { DayMetrics } from "@simulation/metrics.js";

Chart.register(LinearScale, Tooltip, Legend, Title);

export function getTickStepSize(numDays: number): number {
    if (numDays <= 50) return 5;
    if (numDays <= 100) return 10;
    if (numDays <= 300) return 25;
    if (numDays <= 600) return 50;
    return 100;
}

export const baseChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    events: ['click'] as any,
    transitions: {
        default: { animation: { duration: 0 } },  // data updates (e.g. x-axis extension)
    },
} as const;

export abstract class BaseChart {
    protected chart: Chart | undefined;
    protected static readonly MAX_DAYS = 550;
    protected static readonly TARGET_DAYS = 500;

    constructor(readonly canvasId: string) { }

    protected getPruneExcess(currentDays: number): number {
        if (currentDays >= BaseChart.MAX_DAYS) {
            // prune one less so we start at 0
            return currentDays - BaseChart.TARGET_DAYS - 1;
        }
        return 0;
    }

    protected getXRange(firstDay: number | undefined, lastDay: number | undefined): { min: number, max: number } {
        const start = firstDay ?? 0;
        const end = lastDay ?? 0;

        // align min and max to multiples of 50
        const min = Math.floor(start / 50) * 50;
        const max = Math.ceil(end / 50) * 50;

        return { min, max: Math.max(min + 50, max) };
    }

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
