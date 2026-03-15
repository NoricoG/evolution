import { DayMetrics } from "@simulation/metrics.js";
import { BaseChart } from "@ui/charts/baseChart.js";
import {
    CANVAS_WIDTH,
    LEGEND_FONT,
    STACKED_BAR_CANVAS_HEIGHT,
    VISIBLE_DAYS,
    clearAll,
    drawTitle,
    drawXAxis,
    drawYAxisLinear,
    plotArea,
    resizeCanvas,
    yMapper,
} from "@ui/charts/chartLayout.js";

export type StackedBarSeries = {
    label: string;
    getValue: (m: DayMetrics) => number;
    color: string;
};

type ColumnSegment = { y: number; height: number; color: string };
type ColumnDescriptor = { x: number; segments: ColumnSegment[] };

export class StackedBarChart extends BaseChart {
    private cachedDays: number[] = [];
    private cachedDatasets: number[][] = [];
    private lastRenderedDay = -1;
    private lastStartDay = 0;

    constructor(
        canvasId: string,
        private readonly title: string,
        private readonly series: StackedBarSeries[],
    ) {
        super(canvasId);
        this.cachedDatasets = series.map(() => []);
    }

    static fromDistribution(
        canvasId: string,
        title: string,
        bucketCount: number,
        getBuckets: (m: DayMetrics) => number[],
        colors: string[],
        labels: string[],
    ): StackedBarChart {
        if (colors.length != bucketCount) {
            console.warn(`Expected ${bucketCount} colors but received ${colors.length} colors.`)
        }
        return new StackedBarChart(
            canvasId,
            title,
            Array.from({ length: bucketCount }, (_, i) => ({
                label: labels[i],
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
            this.lastRenderedDay = -1;
            this.lastStartDay = 0;
        }

        for (const m of newMetrics) {
            this.cachedDays.push(m.day);
            for (let s = 0; s < this.series.length; s++) {
                this.cachedDatasets[s].push(this.series[s].getValue(m));
            }
        }

        const excess = this.getExcessDays(this.cachedDays.length);
        if (excess > 0) {
            this.cachedDays.splice(0, excess);
            for (let s = 0; s < this.series.length; s++) {
                this.cachedDatasets[s].splice(0, excess);
            }
        }

        const canvas = this.getCanvas();
        if (!canvas) {
            return;
        }

        const ctx = resizeCanvas(canvas, CANVAS_WIDTH, STACKED_BAR_CANVAS_HEIGHT);
        const area = plotArea(CANVAS_WIDTH, STACKED_BAR_CANVAS_HEIGHT);

        const lastDay = this.cachedDays[this.cachedDays.length - 1] ?? 0;
        const startDay = Math.max(0, lastDay - (VISIBLE_DAYS - 1));
        this.updateYAxisLimit(this.getDataMaxY());
        const maxY = this.yAxisLimit;

        clearAll(ctx, CANVAS_WIDTH, STACKED_BAR_CANVAS_HEIGHT);
        drawTitle(ctx, CANVAS_WIDTH, this.title);
        drawYAxisLinear(ctx, area, 0, maxY);
        drawXAxis(ctx, area, startDay);
        this.drawLegend(ctx, area);
        this.drawColumns(ctx, area, this.collectAllColumns(startDay, maxY));
    }

    private collectAllColumns(startDay: number, maxY: number): ColumnDescriptor[] {
        const columns: ColumnDescriptor[] = [];

        for (let i = 0; i < this.cachedDays.length; i++) {
            columns.push(this.buildColumn(this.cachedDays[i], i, startDay, maxY));
        }

        return columns;
    }

    private collectNewColumns(startDay: number, maxY: number): ColumnDescriptor[] {
        const columns: ColumnDescriptor[] = [];

        for (let i = 0; i < this.cachedDays.length; i++) {
            const day = this.cachedDays[i];
            if (day <= this.lastRenderedDay) {
                continue;
            }
            columns.push(this.buildColumn(day, i, startDay, maxY));
        }

        return columns;
    }

    private buildColumn(day: number, dayIndex: number, startDay: number, maxY: number): ColumnDescriptor {
        const area = plotArea(CANVAS_WIDTH, STACKED_BAR_CANVAS_HEIGHT);
        const mapY = yMapper(0, maxY, area.h);
        let cumulative = 0;
        const segments: ColumnSegment[] = [];

        for (let s = 0; s < this.series.length; s++) {
            const value = this.cachedDatasets[s][dayIndex] ?? 0;
            const next = cumulative + value;
            const top = area.y + mapY(next);
            const bottom = area.y + mapY(cumulative);

            segments.push({
                y: top,
                height: Math.max(0, bottom - top),
                color: this.series[s].color,
            });

            cumulative = next;
        }

        return {
            x: area.x + (day - startDay),
            segments,
        };
    }

    private drawColumns(ctx: CanvasRenderingContext2D, area: { x: number, y: number, w: number, h: number }, columns: ColumnDescriptor[]) {
        for (const column of columns) {
            if (column.x < area.x || column.x >= area.x + area.w) {
                continue;
            }

            for (const segment of column.segments) {
                if (segment.height <= 0) {
                    continue;
                }
                ctx.fillStyle = segment.color;
                ctx.fillRect(column.x, segment.y, 1, Math.ceil(segment.height));
            }
        }
    }

    private drawLegend(ctx: CanvasRenderingContext2D, area: { x: number, y: number, w: number, h: number }) {
        const startY = area.y + area.h + 30;
        const lineHeight = 12;
        const boxSize = 8;
        const maxX = area.x + area.w;

        ctx.font = LEGEND_FONT;
        ctx.textBaseline = "middle";
        ctx.textAlign = "left";

        let x = area.x;
        let y = startY;

        for (const series of this.series) {
            const labelWidth = ctx.measureText(series.label).width;
            const itemWidth = boxSize + 4 + labelWidth + 10;

            if (x + itemWidth > maxX) {
                x = area.x;
                y += lineHeight;
            }

            ctx.fillStyle = series.color;
            ctx.fillRect(x, y - boxSize / 2, boxSize, boxSize);

            ctx.fillStyle = "#111";
            ctx.fillText(series.label, x + boxSize + 4, y);

            x += itemWidth;
        }
    }

    private getDataMaxY(): number {
        let max = 1;

        for (let i = 0; i < this.cachedDays.length; i++) {
            let total = 0;
            for (let s = 0; s < this.series.length; s++) {
                total += this.cachedDatasets[s][i] ?? 0;
            }
            max = Math.max(max, total);
        }

        return max;
    }
}
