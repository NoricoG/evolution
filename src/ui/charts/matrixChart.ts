import { DayMetrics, GeneMetrics } from "@simulation/metrics.js";
import { BaseChart } from "@ui/charts/baseChart.js";
import {
    CANVAS_WIDTH,
    MATRIX_CANVAS_HEIGHT,
    VISIBLE_DAYS,
    clearAll,
    drawTitle,
    drawXAxis,
    drawYAxisFixed,
    plotArea,
    resizeCanvas,
} from "@ui/charts/chartLayout.js";
import { Color } from "@ui/color.js";

type MatrixDataPoint = { x: number; y: number; color: string };
type MatrixColumn = { x: number; cells: { y: number; color: string }[] };

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

    private cachedData: MatrixDataPoint[] = [];

    update(newMetrics: DayMetrics[]) {
        const canvas = this.getCanvas();
        if (!canvas) return;

        // save the data
        for (const m of newMetrics) {
            const geneMetrics = this.getGeneMetrics(m);
            const total = m.population.alive || 1;

            for (let bucket = 1; bucket <= 9; bucket++) {
                let value = geneMetrics.counts[bucket - 1] ?? 0;
                if (this.relative) {
                    value /= total;
                }
                this.cachedData.push({ x: m.day, y: bucket, color: this.cellColor(value) });
            }
        }

        // shift data if thresholds is reached
        const excessDays = this.getExcessDays(this.cachedData.length / 9);
        if (excessDays > 0) {
            this.cachedData.splice(0, excessDays * 9);
        }

        const ctx = resizeCanvas(canvas, CANVAS_WIDTH, MATRIX_CANVAS_HEIGHT);
        const area = plotArea(CANVAS_WIDTH, MATRIX_CANVAS_HEIGHT);

        // TODO: pre-transform data before saving to cachedData, so we don't have to do it on every render
        // transform the data?
        const dayMap = this.buildDayMap();

        const lastDay = this.cachedData[this.cachedData.length - 1]?.x ?? 0;
        const startDay = Math.max(0, lastDay - (VISIBLE_DAYS - 1));

        clearAll(ctx, CANVAS_WIDTH, MATRIX_CANVAS_HEIGHT);
        drawTitle(ctx, CANVAS_WIDTH, this.geneLabel);
        drawYAxisFixed(ctx, area, [1, 2, 3, 4, 5, 6, 7, 8, 9], `${this.lowLabel} <-> ${this.highLabel}`);
        drawXAxis(ctx, area, startDay);

        this.drawAllData(ctx, area, dayMap, startDay);
    }

    private buildDayMap(): Map<number, MatrixDataPoint[]> {
        const map = new Map<number, MatrixDataPoint[]>();
        for (const point of this.cachedData) {
            const existing = map.get(point.x);
            if (existing) {
                existing.push(point);
            } else {
                map.set(point.x, [point]);
            }
        }
        return map;
    }

    private drawAllData(
        ctx: CanvasRenderingContext2D,
        area: { x: number, y: number, w: number, h: number },
        dayMap: Map<number, MatrixDataPoint[]>,
        startDay: number,
    ) {
        const sortedDays = [...dayMap.keys()].sort((a, b) => a - b);
        const columns: MatrixColumn[] = sortedDays.map((day) => ({
            x: area.x + (day - startDay),
            cells: (dayMap.get(day) ?? []).map((point) => ({
                y: point.y,
                color: point.color,
            })),
        }));

        this.drawColumns(ctx, area, columns);
    }

    private drawColumns(ctx: CanvasRenderingContext2D, area: { x: number, y: number, w: number, h: number }, columns: MatrixColumn[]) {
        const cellHeight = area.h / 9;

        for (const column of columns) {
            if (column.x < area.x || column.x >= area.x + area.w) {
                continue;
            }

            for (const cell of column.cells) {
                if (cell.color == "") {
                    continue;
                }

                const y = area.y + area.h - (cell.y * cellHeight);
                ctx.fillStyle = cell.color;
                ctx.fillRect(column.x, y, 1, Math.ceil(cellHeight));
            }
        }
    }

    private cellColor(value: number): string {
        if (value === 0) {
            return "";
        }
        const lightness = 1 - value * 0.5;
        const [r, g, b] = Color.hslToRgb(this.hue, Color.defaultSaturation, lightness);
        return `rgb(${r}, ${g}, ${b})`;
    }
}
