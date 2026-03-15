export const MARGIN = {
    top: 32,
    right: 32,
    bottom: 48,
    left: 8,
} as const;

export const VISIBLE_DAYS = 500;

export const MATRIX_CANVAS_HEIGHT = 200;
export const STACKED_BAR_CANVAS_HEIGHT = 300;

export const CANVAS_WIDTH = MARGIN.left + VISIBLE_DAYS + MARGIN.right;

export type PlotArea = {
    x: number;
    y: number;
    w: number;
    h: number;
};

export type ResizeCanvasResult = {
    ctx: CanvasRenderingContext2D;
    dpr: number;
    resized: boolean;
};

const TITLE_FONT = "bold 16px sans-serif";
const AXIS_FONT = "12px sans-serif";
export const LEGEND_FONT = "12px sans-serif";


function getContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        throw new Error("failed to get canvas rendering context");
    }
    return ctx;
}

function applyTextStyle(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "#111";
    ctx.strokeStyle = "#111";
    ctx.textBaseline = "middle";
    ctx.font = AXIS_FONT;
}

export function resizeCanvas(canvas: HTMLCanvasElement, width: number, height: number): CanvasRenderingContext2D {
    const ctx = getContext(canvas);

    const dpr = Math.round(window.devicePixelRatio) || 1;

    const pixelWidth = Math.max(1, Math.round(width * dpr));
    const pixelHeight = Math.max(1, Math.round(height * dpr));
    const resized = canvas.width !== pixelWidth || canvas.height !== pixelHeight;

    if (resized) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
    }

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;

    return ctx;
}

export function plotArea(canvasWidth: number, canvasHeight: number): PlotArea {
    return {
        x: MARGIN.left,
        y: MARGIN.top,
        w: Math.max(1, canvasWidth - MARGIN.left - MARGIN.right),
        h: Math.max(1, canvasHeight - MARGIN.top - MARGIN.bottom),
    };
}

export function xMapper(min: number, max: number, plotW: number): (day: number) => number {
    const range = Math.max(1, max - min);
    return (day: number) => (day - min) / range * (plotW - 1);
}

export function yMapper(minValue: number, maxValue: number, plotH: number): (value: number) => number {
    const range = Math.max(1e-9, maxValue - minValue);
    return (value: number) => (1 - (value - minValue) / range) * plotH;
}

export function drawXAxis(ctx: CanvasRenderingContext2D, area: PlotArea, startDay: number) {
    applyTextStyle(ctx);

    const axisY = area.y + area.h + 0.5;
    ctx.beginPath();
    ctx.moveTo(area.x, axisY);
    ctx.lineTo(area.x + area.w, axisY);
    ctx.stroke();

    const endDay = startDay + area.w - 1;
    const firstTick = Math.ceil(startDay / 100) * 100;

    ctx.textAlign = "center";
    for (let tickDay = firstTick; tickDay <= endDay; tickDay += 100) {
        const x = area.x + (tickDay - startDay) + 0.5;
        ctx.beginPath();
        ctx.moveTo(x, axisY);
        ctx.lineTo(x, axisY + 4);
        ctx.stroke();
        ctx.fillText(String(tickDay), x, axisY + 10);
    }
}

export function drawYAxisFixed(ctx: CanvasRenderingContext2D, area: PlotArea, ticks: number[], label: string) {
    applyTextStyle(ctx);

    const axisX = area.x + area.w;
    ctx.beginPath();
    ctx.moveTo(axisX, area.y);
    ctx.lineTo(axisX, area.y + area.h);
    ctx.stroke();

    ctx.textAlign = "left";
    for (const tick of ticks) {
        const normalized = (tick - 1) / 8;
        const y = area.y + area.h - normalized * area.h + 0.5;
        ctx.beginPath();
        ctx.moveTo(axisX, y);
        ctx.lineTo(axisX + 4, y);
        ctx.stroke();
    }

    ctx.save();
    ctx.translate(area.x + area.w + 15, area.y + area.h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.fillText(label, 0, 0);
    ctx.restore();
}

export function drawYAxisLinear(ctx: CanvasRenderingContext2D, area: PlotArea, minValue: number, maxValue: number) {
    applyTextStyle(ctx);

    const axisX = area.x + area.w;
    ctx.beginPath();
    ctx.moveTo(axisX, area.y);
    ctx.lineTo(axisX, area.y + area.h);
    ctx.stroke();

    const tickCount = 5;
    ctx.textAlign = "left";

    for (let i = 0; i <= tickCount; i++) {
        const value = minValue + (maxValue - minValue) * (i / tickCount);
        const y = area.y + area.h - (i / tickCount) * area.h + 0.5;

        ctx.beginPath();
        ctx.moveTo(axisX, y);
        ctx.lineTo(axisX + 4, y);
        ctx.stroke();

        ctx.fillText(formatYAxisTick(value), axisX + 6, y);
    }
}

export function drawTitle(ctx: CanvasRenderingContext2D, canvasWidth: number, text: string) {
    applyTextStyle(ctx);
    ctx.font = TITLE_FONT;
    ctx.textAlign = "center";
    ctx.fillText(text, canvasWidth / 2, 14);
}

export function clearPlotArea(ctx: CanvasRenderingContext2D, area: PlotArea) {
    ctx.clearRect(area.x, area.y, area.w, area.h);
}

export function clearAll(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
}

function formatYAxisTick(value: number): string {
    return value.toFixed(0);
}
