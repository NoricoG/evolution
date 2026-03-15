import { DayMetrics } from "@simulation/metrics.js";

export abstract class BaseChart {
    protected static readonly MAX_DAYS = 550;
    protected static readonly TARGET_DAYS = 500;

    yAxisLimit = -1;

    constructor(readonly canvasId: string) { }

    protected getExcessDays(currentDays: number): number {
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

    protected updateYAxisLimit(dataLimit: number) {
        const roundedLimit = this.roundUpYLimit(dataLimit);

        const dataExceedsGraph = roundedLimit > this.yAxisLimit;
        const graphExceedsData = dataLimit < this.yAxisLimit * 0.4;

        if (dataExceedsGraph || graphExceedsData) {
            this.yAxisLimit = roundedLimit;
        }
    }

    protected roundUpYLimit(value: number): number {
        if (value <= 25) {
            return 25;
        }

        const roundTo = value > 1000 ? 250 : (value > 500 ? 100 : 50);
        return Math.ceil(value / roundTo) * roundTo;
    }

    protected getCanvas(): HTMLCanvasElement | null {
        return document.getElementById(this.canvasId) as HTMLCanvasElement;
    }

    abstract update(dayMetrics: DayMetrics[]): void;
}
