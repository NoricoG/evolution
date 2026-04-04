import { Space } from "@simulation/space.js";

export type colorMapping = (space: Space, x: number, y: number) => { r: number; g: number; b: number };

const PIXEL_SIZE = 3;

export class MapFrame {
    private readonly canvas: HTMLCanvasElement;
    private readonly ctx: CanvasRenderingContext2D;
    private imageData: ImageData | null = null;
    private data: Uint8ClampedArray | null = null;
    private canvasWidth: number = 0;
    private canvasHeight: number = 0;

    constructor(container: HTMLElement) {
        this.canvas = document.createElement("canvas");
        container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext("2d")!;
    }

    beginFrame(width: number, height: number): void {
        const dimensionsChanged = this.canvas.width !== width || this.canvas.height !== height;

        if (dimensionsChanged) {
            this.canvas.width = width;
            this.canvas.height = height;
            this.canvasWidth = width;
            this.canvasHeight = height;
            this.imageData = this.ctx.createImageData(width, height);
            this.data = this.imageData.data;
        }
        // data is not cleared because every pixel will be overwritten
    }

    setPixel(x: number, y: number, r: number, g: number, b: number): void {
        if (!this.data) return;

        for (let px = 0; px < PIXEL_SIZE; px++) {
            for (let py = 0; py < PIXEL_SIZE; py++) {
                const index = ((y * PIXEL_SIZE + py) * this.canvasWidth + (x * PIXEL_SIZE + px)) * 4;
                this.data[index] = r;
                this.data[index + 1] = g;
                this.data[index + 2] = b;
                this.data[index + 3] = 255;
            }
        }
    }

    endFrame(): void {
        if (this.imageData) {
            this.ctx.putImageData(this.imageData, 0, 0);
        }
    }
}

export class SimulationMap {
    private mapFrame: MapFrame;
    private colorMapping: colorMapping;

    constructor(container: HTMLElement, colorMapping: colorMapping) {
        this.mapFrame = new MapFrame(container);
        this.colorMapping = colorMapping;
    }

    update(space: Space) {
        const canvasWidth = space.width * PIXEL_SIZE;
        const canvasHeight = space.height * PIXEL_SIZE;

        this.mapFrame.beginFrame(canvasWidth, canvasHeight);

        for (let x = 0; x < space.width; x++) {
            for (let y = 0; y < space.height; y++) {
                const { r, g, b } = this.colorMapping(space, x, y);
                this.mapFrame.setPixel(x, y, r, g, b);
            }
        }

        this.mapFrame.endFrame();
    }
}
